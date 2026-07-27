// Push notifications, two transports behind one sendToUsers() call:
//  - FCM (native Android app) — optional: no-op until FIREBASE_SERVICE_ACCOUNT_JSON is set.
//  - Web Push / VAPID (browsers) — always on. Keys come from VAPID_PUBLIC_KEY /
//    VAPID_PRIVATE_KEY env, or are generated once and persisted to vapid.json
//    next to the DB so local dev and the VPS work with zero manual key setup.
const fs = require("fs");
const path = require("path");
const store = require("./store");

// ── FCM (native app) ──
let messaging = null;
try {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    const admin = require("firebase-admin");
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    messaging = admin.messaging();
  }
} catch (e) {
  console.warn("FCM push disabled:", e.message);
}

const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

// ── Web Push (browsers) ──
let webpush = null;
let vapidPublicKey = "";
try {
  webpush = require("web-push");
  let keys;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    const keyFile = path.join(__dirname, "vapid.json");
    if (fs.existsSync(keyFile)) {
      keys = JSON.parse(fs.readFileSync(keyFile, "utf8"));
    } else {
      keys = webpush.generateVAPIDKeys();
      fs.writeFileSync(keyFile, JSON.stringify(keys, null, 2), { mode: 0o600 });
      console.log("Generated new VAPID keys → vapid.json");
    }
  }
  webpush.setVapidDetails("mailto:vijay83061@gmail.com", keys.publicKey, keys.privateKey);
  vapidPublicKey = keys.publicKey;
} catch (e) {
  webpush = null;
  console.warn("Web push disabled:", e.message);
}

async function sendFcm(userIds, { title, body, data }) {
  if (!messaging) return;
  const rows = store.pushTokensForUsers(userIds);
  if (!rows.length) return;

  try {
    const res = await messaging.sendEachForMulticast({
      tokens: rows.map((r) => r.token),
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, String(v)])),
    });
    res.responses.forEach((r, i) => {
      if (!r.success && INVALID_TOKEN_CODES.has(r.error && r.error.code)) {
        store.unregisterPushToken(rows[i].user_id, rows[i].token);
      }
    });
  } catch (e) {
    console.warn("FCM send failed:", e.message);
  }
}

async function sendWebPush(userIds, { title, body, data }) {
  if (!webpush) return;
  const rows = store.webPushSubsForUsers(userIds);
  if (!rows.length) return;

  const payload = JSON.stringify({ title, body, data: data || {} });
  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(JSON.parse(row.sub_json), payload, { TTL: 60 * 60 * 24 });
      } catch (e) {
        // 404/410 = subscription expired or user revoked permission — prune it.
        if (e.statusCode === 404 || e.statusCode === 410) {
          store.deleteWebPushSub(row.user_id, row.endpoint);
        } else {
          console.warn("Web push send failed:", e.statusCode || e.message);
        }
      }
    })
  );
}

// userIds may include the sender; callers are expected to have already
// excluded them. Silently gives up on any error — push is best-effort and
// must never block or fail the request that triggered it.
async function sendToUsers(userIds, notification) {
  if (!userIds.length) return;
  await Promise.all([sendFcm(userIds, notification), sendWebPush(userIds, notification)]);
}

module.exports = { sendToUsers, vapidPublicKey };

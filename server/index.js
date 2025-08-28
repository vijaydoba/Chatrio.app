const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = Number(process.env.PORT || 5050);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'https://chatrio-app-2.onrender.com';

const app = express();

// CORS: locked down in production, open in dev
app.use(
  cors({
    origin: NODE_ENV === 'production' ? [CLIENT_ORIGIN] : true,
    methods: ['GET', 'POST'],
  })
);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: NODE_ENV === 'production' ? [CLIENT_ORIGIN] : '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 10 * 1024 * 1024, // 10 MB for images
});

/* =================== Stores =================== */
const partners = new Map(); // socket.id -> partnerId
const usernames = new Map(); // socket.id -> username
const userTopics = new Map(); // socket.id -> Set<string>
let waitingQueue = []; // [{ id }]
const msgWindows = new Map(); // socket.id -> timestamps[] (text+image)

/* ============ Rate limits & filters ============ */
const WINDOW_MS = 10_000;
const MAX_MSGS = 8;

const IMG_WINDOW_MS = 30_000;
const MAX_IMAGES = 3;
const imageWindows = new Map(); // socket.id -> timestamps[] (image only)

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const BAD_WORDS = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'pussy',
  'cunt',
  'nigger',
  'faggot',
];
const badWordsRegex = new RegExp(`\\b(${BAD_WORDS.join('|')})\\b`, 'gi');
function cleanText(s = '') {
  return String(s).replace(badWordsRegex, (m) => '*'.repeat(m.length));
}

/* =================== Helpers =================== */
function getSocket(id) {
  return io.sockets.sockets.get(id);
}
function removeFromQueue(id) {
  waitingQueue = waitingQueue.filter((e) => e.id !== id);
}
function broadcastOnline() {
  io.emit('online', io.engine.clientsCount);
}
function broadcastWaitingCount() {
  io.emit('waiting_count', waitingQueue.length);
}

function overlapScore(a, b) {
  if (!a || !b || a.size === 0 || b.size === 0) return 0;
  let c = 0;
  for (const t of a) if (b.has(t)) c++;
  return c;
}

/* =================== Pairing =================== */
function tryPair() {
  waitingQueue = waitingQueue.filter((e) => getSocket(e.id)?.connected);
  while (waitingQueue.length >= 2) {
    const entrant = waitingQueue.pop();
    const a = getSocket(entrant.id);
    if (!a) continue;
    const aTopics = userTopics.get(a.id) || new Set();
    let bestIdx = -1,
      bestScore = -1;
    for (let i = 0; i < waitingQueue.length; i++) {
      const candSock = getSocket(waitingQueue[i].id);
      if (!candSock) continue;
      const score = overlapScore(aTopics, userTopics.get(candSock.id) || new Set());
      if (score > bestScore) {
        bestIdx = i;
        bestScore = score;
      }
    }
    const partnerEntry =
      bestIdx >= 0 && bestScore > 0 ? waitingQueue.splice(bestIdx, 1)[0] : waitingQueue.shift();
    const b = getSocket(partnerEntry.id);
    if (a?.connected && b?.connected) pair(a, b);
    else {
      if (a?.connected) waitingQueue.unshift({ id: a.id });
      if (b?.connected) waitingQueue.unshift({ id: b.id });
    }
  }
  broadcastWaitingCount();
}

function pair(a, b) {
  partners.set(a.id, b.id);
  partners.set(b.id, a.id);
  a.partner = b.id;
  b.partner = a.id;
  a.emit('partner_found', { partner: usernames.get(b.id) || 'Stranger' });
  b.emit('partner_found', { partner: usernames.get(a.id) || 'Stranger' });
  console.log(`[pair] ${a.id} <-> ${b.id}`);
}

function unpair(leaver) {
  const pid = partners.get(leaver.id);
  if (!pid) {
    partners.delete(leaver.id);
    leaver.partner = null;
    return;
  }
  const partner = getSocket(pid);
  partners.delete(leaver.id);
  leaver.partner = null;
  if (partner) {
    partners.delete(partner.id);
    partner.partner = null;
    partner.emit('friend_left');
  }
}

/* ================== Rate limit helpers ================== */
function allowTextOrImage(socket) {
  const now = Date.now();
  const arr = msgWindows.get(socket.id) || [];
  const fresh = arr.filter((t) => now - t <= WINDOW_MS);
  if (fresh.length >= MAX_MSGS) {
    const oldest = Math.min(...fresh);
    socket.emit('rate_limited', { retryAfterMs: Math.max(0, WINDOW_MS - (now - oldest)) });
    return false;
  }
  fresh.push(now);
  msgWindows.set(socket.id, fresh);
  return true;
}

function allowImage(socket) {
  const now = Date.now();
  const arr = imageWindows.get(socket.id) || [];
  const fresh = arr.filter((t) => now - t <= IMG_WINDOW_MS);
  if (fresh.length >= MAX_IMAGES) {
    socket.emit('image_rejected', { reason: 'Too many images. Please wait a moment.' });
    return false;
  }
  fresh.push(now);
  imageWindows.set(socket.id, fresh);
  return true;
}

/* ================== Socket handlers ================== */
io.on('connection', (socket) => {
  console.log('[connect]', socket.id);
  broadcastOnline();
  broadcastWaitingCount();

  usernames.set(socket.id, 'Stranger');
  userTopics.set(socket.id, new Set());

  socket.on('set_username', (name) => {
    const safe = cleanText((name || '').trim() || 'Stranger');
    usernames.set(socket.id, safe);
  });

  socket.on('set_topics', ({ topics }) => {
    const set = new Set(
      Array.isArray(topics)
        ? topics.map((t) => String(t || '').toLowerCase().trim()).filter(Boolean)
        : []
    );
    userTopics.set(socket.id, set);
  });

  socket.on('ready_to_chat', () => {
    console.log(`[ready_to_chat] Socket ${socket.id}, paired: ${partners.has(socket.id)}`);
    if (partners.has(socket.id)) {
      console.log(`[ready_to_chat] Clearing stale partner for ${socket.id}`);
      unpair(socket);
    }
    if (!waitingQueue.find((e) => e.id === socket.id)) {
      console.log(`[ready_to_chat] Adding ${socket.id} to waitingQueue`);
      waitingQueue.push({ id: socket.id });
    }
    console.log(`[ready_to_chat] Emitting waiting to ${socket.id}`);
    socket.emit('waiting');
    broadcastWaitingCount();
    tryPair();
  });

  socket.on('disconnect_request', () => {
    removeFromQueue(socket.id);
    unpair(socket);
    socket.emit('idle');
    broadcastWaitingCount();
  });

  socket.on('next', () => {
    removeFromQueue(socket.id);
    if (partners.has(socket.id)) unpair(socket);
    if (!waitingQueue.find((e) => e.id === socket.id)) waitingQueue.push({ id: socket.id });
    socket.emit('waiting');
    broadcastWaitingCount();
    tryPair();
  });

  socket.on('report_partner', () => {
    const pid = partners.get(socket.id);
    if (pid) {
      const partner = getSocket(pid);
      partners.delete(socket.id);
      socket.partner = null;
      if (partner) {
        partners.delete(partner.id);
        partner.partner = null;
        partner.emit('friend_left');
      }
    }
    if (!waitingQueue.find((e) => e.id === socket.id)) waitingQueue.push({ id: socket.id });
    socket.emit('waiting');
    broadcastWaitingCount();
    tryPair();
  });

  socket.on('typing', ({ typing }) => {
    const pid = partners.get(socket.id);
    if (!pid) return;
    const p = getSocket(pid);
    if (!p) return;
    p.emit('partner_typing', { typing: !!typing });
  });

  socket.on('message', (payload) => {
    if (!allowTextOrImage(socket)) return;
    const pid = partners.get(socket.id);
    if (!pid) return;
    const p = getSocket(pid);
    if (!p) return;

    const msgId = payload?.msgId || `${socket.id}-${Date.now()}`;
    const text = cleanText(String(payload?.text ?? ''));
    socket.emit('msg_sent', { msgId });
    p.emit('message', {
      msgId,
      author: usernames.get(socket.id) || 'Stranger',
      text,
      fromId: socket.id,
      ts: Date.now(),
    });
  });

  socket.on('image', (payload) => {
    if (!allowTextOrImage(socket)) return;
    if (!allowImage(socket)) return;

    const pid = partners.get(socket.id);
    if (!pid) return;
    const p = getSocket(pid);
    if (!p) return;

    const msgId = payload?.msgId || `${socket.id}-img-${Date.now()}`;
    const data = String(payload?.image || '');
    const approxBytes = Math.ceil((data.length * 3) / 4);
    if (approxBytes > MAX_IMAGE_BYTES) {
      socket.emit('image_rejected', { reason: 'Image too large (>2MB)' });
      return;
    }
    socket.emit('msg_sent', { msgId });
    p.emit('image', {
      msgId,
      author: usernames.get(socket.id) || 'Stranger',
      image: data,
      fromId: socket.id,
      ts: Date.now(),
    });
  });

  socket.on('delivered', ({ msgId }) => {
    const pid = partners.get(socket.id);
    if (!pid) return;
    const s = getSocket(pid);
    if (!s) return;
    s.emit('msg_delivered', { msgId });
  });

  socket.on('disconnect', () => {
    console.log('[disconnect]', socket.id);
    removeFromQueue(socket.id);
    unpair(socket);
    usernames.delete(socket.id);
    userTopics.delete(socket.id);
    msgWindows.delete(socket.id);
    imageWindows.delete(socket.id);
    broadcastOnline();
    broadcastWaitingCount();
  });

  socket.emit('idle');
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (${NODE_ENV})`);
  console.log(`Allowed client origin: ${NODE_ENV === 'production' ? CLIENT_ORIGIN : 'ANY (dev)'}`);
});
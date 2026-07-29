# Chatrio Circles — Android App

A Capacitor-wrapped Android build of the Circles (local/proximity chat) feature,
built to test one specific hypothesis: **retention on `/circles` is ~4-6%
weekly, and the biggest single cause a browser tab can't fix is that users have
no way to know a reply arrived.** Native push notifications close that gap.
This is *not* a full mobile rewrite — it ships Circles only, reusing the
existing React app.

> Why this exists / the data behind it: see project memory `circles-local-build`
> and the retention numbers pulled from prod on 2026-07-22 (237 signups, 63%
> never share location, 4% return after day 3, messaging dead since Jul 5).

---

## 1. What's in this repo

**Client (`client/`)**
- `capacitor.config.ts` — appId `app.chatrio.circles`, appName "Chatrio Circles", `webDir: build`
- `android/` — generated native project (Capacitor + Gradle). Don't hand-edit generated `res/mipmap-*` or `capacitor.config.json`; regenerate instead (§4).
- `src/App.tsx` — `Capacitor.isNativePlatform()` gate: when running in the app, skips the marketing header/footer/blog nav and routes `/` straight to `/circles`.
- `src/push.ts` — requests notification permission, registers for FCM, POSTs the device token to the backend, and forwards notification taps.
- `src/circlesApi.ts` — added `registerPushToken` / `unregisterPushToken`.
- `assets/logo.png` — 1024×1024 source (upscaled from `public/branding/chatrio-logo.png`) used to generate all icon/splash sizes.

**Backend (`server/circles-local/`)** — see that service's own README for the
full API; push-specific additions are documented there too.
- `push_tokens` table, `/push/register` + `/push/unregister` endpoints
- `push.js` — FCM sender via `firebase-admin`, **no-op until Firebase is configured** (safe to deploy before Firebase setup exists)
- Push fires on: new DM message (only if the recipient isn't actively viewing that thread), new DM intro request, new group message (only to members not currently in the room)

---

## 2. Local development

```bash
cd client
npm start                 # normal web dev, unaffected by any of this
```

To test the native shell specifically, you need the build step + Android Studio
(§3) — `npm start`'s dev server isn't what the Android WebView loads; it loads
the static `build/` output.

## 3. Building the Android app

Requires **Android Studio** (not installed on this machine — install it
yourself, then come back here):

```bash
cd client
npm run build              # regenerate build/ from current source
npx cap sync android        # copy build/ + plugin config into android/
npx cap open android        # opens Android Studio
```

From Android Studio: let Gradle sync, then Run ▶ on an emulator or a USB-connected device.

## 4. Regenerating icons/splash screens

If the brand mark changes, update `client/assets/logo.png` (1024×1024, transparent background) and rerun:

```bash
cd client
npx capacitor-assets generate --android \
  --iconBackgroundColor '#6d28d9' --iconBackgroundColorDark '#2a1150' \
  --splashBackgroundColor '#f3f6fb' --splashBackgroundColorDark '#0b0f14'
```

Colors match `--bg` in `App.css` (light `#f3f6fb` / dark `#0b0f14`) and the brand gradient (`#6d28d9` → `#06b6d4`).

## 5. Turning on push notifications (manual, one-time)

1. **Firebase project** — console.firebase.google.com → new project → add an
   Android app with package name **`app.chatrio.circles`** → download
   `google-services.json` → place it at `client/android/app/google-services.json`.
2. **Service account key** — Firebase Console → Project Settings → Service
   Accounts → "Generate new private key". This downloads a JSON file.
3. **Set it on the prod server** (never commit this file):
   ```bash
   ssh root@185.190.142.158
   # paste the JSON as a single-line env var in /var/www/chatrio-circles-server/.env
   echo 'FIREBASE_SERVICE_ACCOUNT_JSON='"'"'<paste-json-here>'"'"'' >> /var/www/chatrio-circles-server/.env
   pm2 restart chatrio-circles-api --update-env
   ```
   Until this is set, `/push/register` still works and stores tokens, but no
   pushes are actually sent (`push.js` logs a warning and no-ops).
4. Deploy the updated backend code (this repo's `server/circles-local/` →
   `/var/www/chatrio-circles-server/`) per that service's README §6.

## 6. Publishing to Google Play

1. Google Play Console account ($25 one-time): play.google.com/console
2. Build a signed release AAB in Android Studio (Build → Generate Signed Bundle)
3. Data Safety form: must disclose **precise location** collection (Circles requires it)
4. Report/block must be reachable in-app for review — already built (Phase 1/3 of Circles)
5. Start on the **internal testing track** (instant, no review) before any public release
6. Success metric before investing further: does 7-day retention among app
   installs beat the ~6% web baseline

---

## 7. Status

- ✅ Capacitor + Android platform scaffolded, native-shell routing, icons/splash generated
- ✅ Push notification plumbing (client registration + server send hooks)
- ✅ Firebase project (`chatrio-circles`, under chatrioapp@gmail.com) created, Android app registered (`app.chatrio.circles`), `google-services.json` in place, service account key set as `FIREBASE_SERVICE_ACCOUNT_JSON` on the prod server, `chatrio-circles-api` restarted and confirmed initializing FCM successfully (2026-07-29)
- ⏸ Android Studio build + on-device test — needs manual setup (§3)
- ⏸ Play Console submission — not started

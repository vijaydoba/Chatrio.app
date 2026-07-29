/* Service worker for Circles browser push notifications.
   Registered from circlesApi.ts (enableWebPush/resyncWebPush); payloads are sent
   by server/circles-local/push.js as JSON: { title, body, data:{type,...} }. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: "Chatrio Circles", body: event.data ? event.data.text() : "" };
  }
  const data = payload.data || {};
  // One tag per DM thread / group so a burst of messages collapses into a
  // single (updated) notification instead of stacking.
  const tag =
    data.type === "dm_message" ? "dm-" + data.otherId :
    data.type === "group_message" ? "group-" + data.groupId :
    data.type === "dm_request" ? "intro" : "circles";

  event.waitUntil(
    self.registration.showNotification(payload.title || "Chatrio Circles", {
      body: payload.body || "",
      icon: "/branding/chatrio-icon-192-2026.png",
      badge: "/branding/chatrio-icon-48-2026.png",
      tag: tag,
      data: data,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes("/circles")) return w.focus();
      }
      return self.clients.openWindow("/circles");
    })
  );
});

// Native push notification registration (Android app only — no-op on web).
// Wires the device's FCM token to the Circles backend so it can be used to
// notify the user of new DMs/messages when the app isn't open.
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { circles } from "./circlesApi";

let started = false;

export async function initPush(onNotificationOpen?: (data: Record<string, any>) => void) {
  if (started || !Capacitor.isNativePlatform()) return;
  started = true;

  const perm = await PushNotifications.checkPermissions();
  if (perm.receive !== "granted") {
    const req = await PushNotifications.requestPermissions();
    if (req.receive !== "granted") return;
  }

  PushNotifications.addListener("registration", (token) => {
    circles.registerPushToken(token.value, Capacitor.getPlatform()).catch(() => {});
  });

  PushNotifications.addListener("registrationError", () => {
    // Nothing to do — the user just won't get push notifications this session.
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    onNotificationOpen?.(action.notification.data || {});
  });

  await PushNotifications.register();
}

export type NotifyStatus = "granted" | "denied" | "default" | "unsupported" | "open-in-new-tab";

const supported = () => typeof window !== "undefined" && "Notification" in window;
const inIframe = () => { try { return window.top !== window.self; } catch { return true; } };

let reg: Promise<ServiceWorkerRegistration | null> | null = null;
function getRegistration() {
  if (!("serviceWorker" in navigator) || inIframe()) return Promise.resolve(null);
  reg ??= navigator.serviceWorker.register("/notify-sw.js").then(() => navigator.serviceWorker.ready).catch(() => null);
  return reg;
}

export function notificationStatus(): NotifyStatus {
  if (!supported()) return "unsupported";
  if (Notification.permission === "default" && inIframe()) return "open-in-new-tab";
  return Notification.permission;
}

/** Must be called from a button tap. */
export async function enableNotifications(): Promise<NotifyStatus> {
  if (!supported()) return "unsupported";
  if (inIframe()) return "open-in-new-tab";
  const p = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (p === "granted") {
    await getRegistration();
    await showSystemNotification("CUVOTO notifications on", "You'll be alerted at low, 80% and full levels.");
  }
  return p;
}

export async function showSystemNotification(title: string, body: string) {
  if (!supported() || Notification.permission !== "granted") return;
  const options: NotificationOptions = { body, icon: "/icon-192.png", badge: "/icon-192.png", tag: title };
  const r = await getRegistration();
  if (r) { await r.showNotification(title, options).catch(() => {}); return; }
  try { new Notification(title, options); } catch { /* mobile requires the worker */ }
}

if (supported() && Notification.permission === "granted") getRegistration();

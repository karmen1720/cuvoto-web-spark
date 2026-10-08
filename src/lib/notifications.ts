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

const VAPID_PUBLIC_KEY = "BE35FnoZ2r7-gtQp0T7WyIx4f1YTEys425Y9jECbASxLMlEizFGVtqbMeytY3PFZfF8pze7E3oU-j2fwo3u7_vM";

function b64ToBytes(b64: string) {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

/** Registers this browser for background push and saves it to the user's account. */
export async function subscribePush(): Promise<boolean> {
  const r = await getRegistration();
  if (!r || !("pushManager" in r)) return false;
  try {
    const sub = (await r.pushManager.getSubscription()) ??
      (await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC_KEY) }));
    const j = sub.toJSON();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !j.endpoint || !j.keys) return false;
    const { error } = await supabase.from("push_subscriptions").upsert(
      { user_id: user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth },
      { onConflict: "endpoint" }
    );
    if (error) console.error("Saving push subscription failed:", error);
    return !error;
  } catch (e) {
    console.error("Push subscribe failed:", e);
    return false;
  }
}

/** Must be called from a button tap. */
export async function enableNotifications(): Promise<NotifyStatus> {
  if (!supported()) return "unsupported";
  if (inIframe()) return "open-in-new-tab";
  const p = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (p === "granted") {
    await getRegistration();
    const bg = await subscribePush();
    await showSystemNotification(
      "CUVOTO notifications on",
      bg ? "You'll be alerted even when the app is closed." : "Alerts work while the app is open."
    );
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

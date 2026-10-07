import { Bell, BellOff, BellRing } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { enableNotifications, notificationStatus, type NotifyStatus } from "@/lib/notifications";

export const notifyMessages: Record<NotifyStatus, string> = {
  granted: "Notifications are on",
  denied: "Notifications are blocked. Allow them in your browser's site settings.",
  default: "Notifications not enabled",
  unsupported: "This browser doesn't support notifications. On iPhone, add CUVOTO to your Home Screen first.",
  "open-in-new-tab": "Open the app in its own tab (or the published site) to turn on notifications.",
};

export async function requestNotifications(setStatus?: (s: NotifyStatus) => void) {
  const s = await enableNotifications();
  setStatus?.(s);
  (s === "granted" ? toast.success : toast.error)(notifyMessages[s]);
}

const NotificationButton = () => {
  const [status, setStatus] = useState<NotifyStatus>(notificationStatus());
  const on = status === "granted";
  const Icon = on ? BellRing : status === "denied" ? BellOff : Bell;
  return (
    <button
      aria-label={on ? "Notifications on" : "Enable notifications"}
      onClick={() => (on ? toast.success(notifyMessages.granted) : requestNotifications(setStatus))}
      className={`relative w-9 h-9 rounded-full bg-cuvoto-dark-card border border-cuvoto-border-dark flex items-center justify-center transition-colors ${on ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
    >
      <Icon className="w-5 h-5" />
      {!on && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cuvoto-orange" />}
    </button>
  );
};

export default NotificationButton;

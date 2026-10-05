import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { DeviceTelemetry } from "./useMQTT";

type Zone = "low" | "normal" | "high" | "full";
const LOW = 20;

const zoneOf = (l: number): Zone => (l >= 100 ? "full" : l >= 80 ? "high" : l <= LOW ? "low" : "normal");

const notify = (title: string, body: string, kind: "warning" | "success" | "info") => {
  toast[kind](title, { description: body, duration: 8000 });
  if ("Notification" in window && Notification.permission === "granted") {
    try { new Notification(title, { body, icon: "/favicon.ico" }); } catch { /* ignore */ }
  }
  try { navigator.vibrate?.(200); } catch { /* ignore */ }
};

/** Alerts when a tank crosses into low (≤20%), 80%, or 100% — only on change, never on page load. */
export function useLevelAlerts(telemetryMap: Record<string, DeviceTelemetry>, names: Record<string, string>) {
  const zones = useRef<Record<string, Zone>>({});

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    Object.values(telemetryMap).forEach((t) => {
      const z = zoneOf(t.waterLevel);
      const prev = zones.current[t.mac];
      zones.current[t.mac] = z;
      if (prev === undefined || prev === z) return;
      const name = names[t.mac] || "Tank";
      const lvl = Math.round(t.waterLevel);
      if (z === "low") notify(`${name}: Low water`, `Level dropped to ${lvl}%`, "warning");
      else if (z === "high" && prev !== "full") notify(`${name}: 80% reached`, `Tank is almost full (${lvl}%)`, "info");
      else if (z === "full") notify(`${name}: Tank full`, `Level reached 100% — stop the motor`, "success");
    });
  }, [telemetryMap, names]);
}

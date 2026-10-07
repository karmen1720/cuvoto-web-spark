import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { DeviceTelemetry } from "./useMQTT";
import { showSystemNotification } from "@/lib/notifications";

type Zone = "low" | "normal" | "high" | "full";
const LOW = 20;

const zoneOf = (l: number): Zone => (l >= 100 ? "full" : l >= 80 ? "high" : l <= LOW ? "low" : "normal");

const notify = (title: string, body: string, kind: "warning" | "success" | "info") => {
  toast[kind](title, { description: body, duration: 8000 });
  showSystemNotification(title, body);
  try { navigator.vibrate?.(200); } catch { /* ignore */ }
};

/** Alerts when a tank crosses into low (≤20%), 80%, or 100% — only on change, never on page load. */
export function useLevelAlerts(telemetryMap: Record<string, DeviceTelemetry>, names: Record<string, string>) {
  const zones = useRef<Record<string, Zone>>({});
  const online = useRef<Record<string, boolean>>({});

  // Device online/offline alerts
  useEffect(() => {
    Object.values(telemetryMap).forEach((t) => {
      const prev = online.current[t.mac];
      online.current[t.mac] = t.deviceOnline;
      if (prev === undefined || prev === t.deviceOnline) return;
      const name = names[t.mac] || "Device";
      if (t.deviceOnline) notify(`${name} is back online`, "Live data is flowing again", "success");
      else notify(`${name} went offline`, "No data received for over a minute", "warning");
    });
  }, [telemetryMap, names]);

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

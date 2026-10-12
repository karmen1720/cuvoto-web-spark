import { useEffect, useState, useCallback } from "react";
import { levelToFloats, parseFloats, floatsToLevel, type DeviceTelemetry, type MotorCommandStatus } from "@/hooks/useMQTT";

/** Polls the device directly on the LAN (GET http://<ip>/status) and sends motor commands (GET /motor?cmd=). */
export function useLocalDevice(ip: string | null, enabled: boolean) {
  const [telemetry, setTelemetry] = useState<DeviceTelemetry | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [cmdStatus, setCmdStatus] = useState<MotorCommandStatus>("idle");

  useEffect(() => {
    if (!enabled || !ip) { setTelemetry(undefined); return; }
    let alive = true;
    const poll = async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(`http://${ip}/status`, { signal: ctrl.signal });
        clearTimeout(t);
        const j = await res.json();
        if (!alive) return;
        const parsed = parseFloats(j);
        const fromFloats = parsed ? floatsToLevel(parsed) : null;
        const level = fromFloats?.level ?? Number(j.level ?? j.water_level ?? 0);
        setTelemetry({
          mac: String(j.mac ?? ""),
          waterLevel: level,
          floats: parsed ?? levelToFloats(level),
          floatFault: fromFloats?.fault ?? false,
          temperature: Number(j.temperature ?? j.temp ?? 0),
          salinity: Number(j.tds ?? 0),
          motorRunning: j.motor === "on" || j.motor === true || j.motor_status === "on",
          continueRun: j.continueRun === true || j.continueRun === "true",
          deviceOnline: true,
          timestamp: new Date(),
        });
        setError(null);
      } catch {
        if (!alive) return;
        setError("Can't reach device on local network");
        setTelemetry((p) => (p ? { ...p, deviceOnline: false } : p));
      }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => { alive = false; clearInterval(id); };
  }, [ip, enabled]);

  const sendCommand = useCallback(async (cmd: "start" | "stop" | "continue") => {
    if (!ip) return;
    setCmdStatus("pending");
    try {
      const res = await fetch(`http://${ip}/motor?cmd=${cmd}`);
      if (!res.ok) throw new Error();
      setCmdStatus("success");
      setTelemetry((p) => (p ? { ...p, motorRunning: cmd !== "stop", continueRun: cmd === "continue" } : p));
    } catch {
      setCmdStatus("error");
    }
    setTimeout(() => setCmdStatus("idle"), 3000);
  }, [ip]);

  return { telemetry, error, cmdStatus, sendCommand };
}

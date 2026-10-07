import { useEffect, useRef, useState, useCallback } from "react";
import mqtt, { MqttClient } from "mqtt";

export interface DeviceTelemetry {
  mac: string;
  waterLevel: number;
  floats: boolean[]; // index 0 = bottom (20%) ... index 4 = top (100%)
  floatFault: boolean; // a higher float is wet while a lower one is dry
  salinity: number;
  temperature: number;
  motorRunning: boolean;
  deviceOnline: boolean;
  timestamp: Date;
}

export const FLOAT_COUNT = 5;

/**
 * Reads 5 float/conductivity probes from a payload. Accepts:
 *  - "floats": [1,1,0,0,0]           (bottom → top)
 *  - "f1".."f5": 1/0
 *  - "float_mask": 0b00011            (bit0 = bottom)
 */
export function parseFloats(payload: any): boolean[] | null {
  if (Array.isArray(payload.floats)) {
    return Array.from({ length: FLOAT_COUNT }, (_, i) => Number(payload.floats[i]) === 1 || payload.floats[i] === true);
  }
  if (payload.f1 !== undefined) {
    return Array.from({ length: FLOAT_COUNT }, (_, i) => Number(payload[`f${i + 1}`]) === 1);
  }
  if (payload.float_mask !== undefined) {
    const m = Number(payload.float_mask);
    return Array.from({ length: FLOAT_COUNT }, (_, i) => ((m >> i) & 1) === 1);
  }
  return null;
}

export function floatsToLevel(floats: boolean[]): { level: number; fault: boolean } {
  let topWet = -1;
  floats.forEach((w, i) => { if (w) topWet = i; });
  const fault = floats.some((w, i) => !w && i < topWet);
  return { level: ((topWet + 1) / FLOAT_COUNT) * 100, fault };
}

export function levelToFloats(level: number): boolean[] {
  const wet = Math.round((level / 100) * FLOAT_COUNT);
  return Array.from({ length: FLOAT_COUNT }, (_, i) => i < wet);
}

export type MotorCommandStatus = "idle" | "pending" | "success" | "error";

const MQTT_URL = "wss://c54cee0865234335a45b7af73963eef8.s1.eu.hivemq.cloud:8884/mqtt";
const MQTT_OPTIONS = {
  username: "cuvototeam",
  password: "Cuvoto@2025",
  clean: true,
  reconnectPeriod: 5000,
};

const GLOBAL_TOPIC = "cuvoto/iot/telemetry";
const COMMAND_TOPIC = "cuvoto/iot/command";
const STATUS_TOPIC = "water/tank/device/status";
const COMMAND_TIMEOUT_MS = 8000;
/** Device is considered offline if no message arrives for this long. */
export const OFFLINE_AFTER_MS = 60000;

/**
 * Subscribes to the single global telemetry topic.
 * Parses JSON payloads and filters by registered MAC IDs.
 * Returns a map of MAC → telemetry data.
 */
export function useMQTT(registeredMacs: string[]) {
  const [telemetryMap, setTelemetryMap] = useState<Record<string, DeviceTelemetry>>({});
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [motorCommandStatus, setMotorCommandStatus] = useState<MotorCommandStatus>("idle");
  const clientRef = useRef<MqttClient | null>(null);
  const commandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const registeredMacsRef = useRef<Set<string>>(new Set());
  const expectedMotorRef = useRef<boolean | null>(null);

  // Keep macs ref in sync
  useEffect(() => {
    registeredMacsRef.current = new Set(registeredMacs.map((m) => m.toUpperCase()));
  }, [registeredMacs]);

  const clearCommandTimeout = useCallback(() => {
    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
      commandTimeoutRef.current = null;
    }
  }, []);

  const finishCommand = useCallback((ok: boolean) => {
    clearCommandTimeout();
    expectedMotorRef.current = null;
    setMotorCommandStatus(ok ? "success" : "error");
    setTimeout(() => setMotorCommandStatus("idle"), 3000);
  }, [clearCommandTimeout]);

  const setOnline = useCallback((mac: string, online: boolean) => {
    setTelemetryMap((prev) => prev[mac]
      ? { ...prev, [mac]: { ...prev[mac], deviceOnline: online, timestamp: online ? new Date() : prev[mac].timestamp } }
      : prev);
  }, []);

  const parseMessage = useCallback((topic: string, message: any) => {
    try {
      const raw = (typeof message === "string" ? message : new TextDecoder().decode(message)).trim();
      if (topic === STATUS_TOPIC) {
        // Accept "online"/"offline", 1/0, or JSON { mac, status }
        let mac = "", st = raw;
        try { const j = JSON.parse(raw); if (j && typeof j === "object") { mac = String(j.mac || j.MAC || "").toUpperCase(); st = String(j.status ?? j.state ?? j.online ?? ""); } } catch { /* plain text */ }
        if (!mac && registeredMacsRef.current.size === 1) mac = [...registeredMacsRef.current][0];
        if (!mac || !registeredMacsRef.current.has(mac)) return;
        setOnline(mac, /^(online|1|true|connected)$/i.test(st));
        return;
      }
      const payload = JSON.parse(raw);
      let mac = String(payload.mac || payload.MAC || "").toUpperCase();
      // Single-device setup: if the device omits its MAC, attach data to the only registered device
      if (!mac && registeredMacsRef.current.size === 1) {
        mac = [...registeredMacsRef.current][0];
      }

      if (!mac || !registeredMacsRef.current.has(mac)) return;

      console.log(`[MQTT] Telemetry from ${mac}:`, payload);

      // Handle command ack
      if (payload.type === "ack") {
        finishCommand(payload.status === "ok");
        return;
      }

      const motorRunning = payload.motor === "on" || payload.motor === 1 || payload.motor === true || payload.motor_status === "on";
      // Treat telemetry showing the requested motor state as confirmation
      if (expectedMotorRef.current !== null && motorRunning === expectedMotorRef.current) finishCommand(true);

      const floats = parseFloats(payload);
      setTelemetryMap((prev) => {
        let level = Number(payload.water_level ?? payload.level ?? prev[mac]?.waterLevel ?? 0);
        let fault = false;
        let fl = floats;
        if (fl) {
          const r = floatsToLevel(fl);
          level = r.level;
          fault = r.fault;
        } else {
          fl = prev[mac]?.floats ?? levelToFloats(level);
        }
        return {
          ...prev,
          [mac]: {
            mac,
            waterLevel: Math.min(100, Math.max(0, level)),
            floats: fl,
            floatFault: fault,
            salinity: Number(payload.tds ?? payload.salinity ?? prev[mac]?.salinity ?? 0),
            temperature: Number(payload.temperature ?? payload.temp ?? prev[mac]?.temperature ?? 0),
            motorRunning,
            deviceOnline: true,
            timestamp: new Date(),
          },
        };
      });
    } catch (e) {
      console.error("[MQTT] Parse error:", e);
    }
  }, [finishCommand, setOnline]);

  // Mark devices offline when they stop sending data
  useEffect(() => {
    const id = setInterval(() => {
      setTelemetryMap((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [mac, t] of Object.entries(prev)) {
          if (t.deviceOnline && Date.now() - t.timestamp.getTime() > OFFLINE_AFTER_MS) {
            next[mac] = { ...t, deviceOnline: false };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const client = mqtt.connect(MQTT_URL, {
      ...MQTT_OPTIONS,
      clientId: `cuvoto-web-${Math.random().toString(16).slice(2, 10)}`,
    });
    clientRef.current = client;

    client.on("connect", () => {
      console.log("[MQTT] Connected — subscribing to global telemetry topic");
      setConnected(true);
      setError(null);
      client.subscribe(STATUS_TOPIC);
      client.subscribe(GLOBAL_TOPIC, (err) => {
        if (err) console.error("[MQTT] Subscribe error:", err);
        else console.log("[MQTT] Subscribed to", GLOBAL_TOPIC);
      });
    });

    client.on("message", parseMessage);
    client.on("error", (err) => {
      console.error("[MQTT] Error:", err);
      setError(err.message);
    });
    client.on("offline", () => setConnected(false));
    client.on("close", () => setConnected(false));
    client.on("reconnect", () => console.log("[MQTT] Reconnecting..."));

    return () => {
      clearCommandTimeout();
      client.end();
      clientRef.current = null;
    };
  }, [parseMessage, clearCommandTimeout]);

  const publishMotorCommand = useCallback((mac: string, command: "start" | "stop") => {
    if (clientRef.current?.connected) {
      setMotorCommandStatus("pending");
      expectedMotorRef.current = command === "start";
      const payload = JSON.stringify({ mac: mac.toUpperCase(), command });
      clientRef.current.publish(COMMAND_TOPIC, payload);
      console.log(`[MQTT] Published motor command for ${mac}: ${command}`);

      clearCommandTimeout();
      commandTimeoutRef.current = setTimeout(() => finishCommand(false), COMMAND_TIMEOUT_MS);
    }
  }, [clearCommandTimeout, finishCommand]);

  return { telemetryMap, connected, error, motorCommandStatus, publishMotorCommand };
}

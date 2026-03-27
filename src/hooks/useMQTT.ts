import { useEffect, useRef, useState, useCallback } from "react";
import mqtt, { MqttClient } from "mqtt";

export interface DeviceTelemetry {
  mac: string;
  waterLevel: number;
  salinity: number;
  temperature: number;
  motorRunning: boolean;
  deviceOnline: boolean;
  timestamp: Date;
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
const COMMAND_TIMEOUT_MS = 8000;

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

  const parseMessage = useCallback((_topic: string, message: any) => {
    try {
      const raw = typeof message === "string" ? message : new TextDecoder().decode(message);
      const payload = JSON.parse(raw.trim());
      const mac = (payload.mac || payload.MAC || "").toUpperCase();

      if (!mac || !registeredMacsRef.current.has(mac)) return;

      console.log(`[MQTT] Telemetry from ${mac}:`, payload);

      // Handle command ack
      if (payload.type === "ack") {
        clearCommandTimeout();
        setMotorCommandStatus(payload.status === "ok" ? "success" : "error");
        setTimeout(() => setMotorCommandStatus("idle"), 3000);
        return;
      }

      setTelemetryMap((prev) => ({
        ...prev,
        [mac]: {
          mac,
          waterLevel: Math.min(100, Math.max(0, Number(payload.water_level ?? payload.level ?? prev[mac]?.waterLevel ?? 0))),
          salinity: Number(payload.tds ?? payload.salinity ?? prev[mac]?.salinity ?? 0),
          temperature: Number(payload.temperature ?? payload.temp ?? prev[mac]?.temperature ?? 0),
          motorRunning: payload.motor === "on" || payload.motor === 1 || payload.motor === true || payload.motor_status === "on",
          deviceOnline: true,
          timestamp: new Date(),
        },
      }));
    } catch (e) {
      console.error("[MQTT] Parse error:", e);
    }
  }, [clearCommandTimeout]);

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
      const payload = JSON.stringify({ mac: mac.toUpperCase(), command });
      clientRef.current.publish(COMMAND_TOPIC, payload);
      console.log(`[MQTT] Published motor command for ${mac}: ${command}`);

      clearCommandTimeout();
      commandTimeoutRef.current = setTimeout(() => {
        setMotorCommandStatus("error");
        setTimeout(() => setMotorCommandStatus("idle"), 3000);
      }, COMMAND_TIMEOUT_MS);
    }
  }, [clearCommandTimeout]);

  return { telemetryMap, connected, error, motorCommandStatus, publishMotorCommand };
}

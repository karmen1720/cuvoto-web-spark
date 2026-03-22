import { useEffect, useRef, useState, useCallback } from "react";
import mqtt, { MqttClient } from "mqtt";

export interface SensorData {
  waterLevel: number;
  salinity: number;
  temperature: number;
  motorRunning: boolean;
  deviceOnline: boolean;
  motorMode: "auto" | "manual";
  timestamp: Date;
}

export type MotorCommandStatus = "idle" | "pending" | "success" | "error";

const MQTT_URL = "wss://c54cee0865234335a45b7af73963eef8.s1.eu.hivemq.cloud:8884/mqtt";
const MQTT_OPTIONS = {
  clientId: `cuvoto-web-${Math.random().toString(16).slice(2, 10)}`,
  username: "cuvototeam",
  password: "Cuvoto@2025",
  clean: true,
  reconnectPeriod: 5000,
};

// Subscribe topics
const TOPICS = [
  "water/tank/level",
  "water/tank/temperature",
  "water/tank/tds",
  "water/tank/motor/status",    // Device reports motor on/off
  "water/tank/device/status",   // Device reports online/offline (heartbeat)
  "water/tank/motor/ack",       // Device acknowledges motor command
];

// Publish topics
// "water/tank/motor/command"  → payload: "start" | "stop"
// "water/tank/motor/mode"     → payload: "auto" | "manual"

const COMMAND_TIMEOUT_MS = 8000;

const defaultData: SensorData = {
  waterLevel: 0,
  salinity: 0,
  temperature: 0,
  motorRunning: false,
  deviceOnline: false,
  motorMode: "auto",
  timestamp: new Date(),
};

export function useMQTT() {
  const [sensorData, setSensorData] = useState<SensorData>(defaultData);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [motorCommandStatus, setMotorCommandStatus] = useState<MotorCommandStatus>("idle");
  const clientRef = useRef<MqttClient | null>(null);
  const commandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCommandTimeout = useCallback(() => {
    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
      commandTimeoutRef.current = null;
    }
  }, []);

  const parseMessage = useCallback((topic: string, message: any) => {
    try {
      const raw = typeof message === "string" ? message.trim() : new TextDecoder().decode(message).trim();
      const num = parseFloat(raw);
      console.log(`[MQTT] ${topic}:`, raw);

      // Handle motor acknowledgment
      if (topic === "water/tank/motor/ack") {
        clearCommandTimeout();
        if (raw === "ok" || raw === "ack" || raw === "success") {
          setMotorCommandStatus("success");
        } else {
          setMotorCommandStatus("error");
        }
        setTimeout(() => setMotorCommandStatus("idle"), 3000);
        return;
      }

      setSensorData((prev) => {
        const updated = { ...prev, timestamp: new Date() };

        switch (topic) {
          case "water/tank/level":
            updated.waterLevel = !isNaN(num) ? Math.min(100, Math.max(0, num)) : prev.waterLevel;
            break;
          case "water/tank/temperature":
            updated.temperature = !isNaN(num) ? num : prev.temperature;
            break;
          case "water/tank/tds":
            updated.salinity = !isNaN(num) ? num : prev.salinity;
            break;
          case "water/tank/motor/status":
            updated.motorRunning = raw === "on" || raw === "1" || raw === "running" || raw === "start";
            break;
          case "water/tank/device/status":
            updated.deviceOnline = raw === "online" || raw === "1" || raw === "alive";
            break;
          default:
            break;
        }

        return updated;
      });
    } catch (e) {
      console.error("[MQTT] Parse error:", e);
    }
  }, [clearCommandTimeout]);

  useEffect(() => {
    const client = mqtt.connect(MQTT_URL, MQTT_OPTIONS);
    clientRef.current = client;

    client.on("connect", () => {
      console.log("[MQTT] Connected to HiveMQ");
      setConnected(true);
      setError(null);
      TOPICS.forEach((t) =>
        client.subscribe(t, (err) => {
          if (err) console.error("[MQTT] Subscribe error:", t, err);
          else console.log("[MQTT] Subscribed to", t);
        })
      );
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

  const publishMotorCommand = useCallback((command: "start" | "stop") => {
    if (clientRef.current?.connected) {
      setMotorCommandStatus("pending");
      clientRef.current.publish("water/tank/motor/command", command);
      console.log(`[MQTT] Published motor command: ${command}`);

      // Timeout if no ack received
      clearCommandTimeout();
      commandTimeoutRef.current = setTimeout(() => {
        setMotorCommandStatus("error");
        setTimeout(() => setMotorCommandStatus("idle"), 3000);
      }, COMMAND_TIMEOUT_MS);
    }
  }, [clearCommandTimeout]);

  const publishMotorMode = useCallback((mode: "auto" | "manual") => {
    if (clientRef.current?.connected) {
      clientRef.current.publish("water/tank/motor/mode", mode);
      console.log(`[MQTT] Published motor mode: ${mode}`);
      setSensorData((prev) => ({ ...prev, motorMode: mode }));
    }
  }, []);

  return { sensorData, connected, error, motorCommandStatus, publishMotorCommand, publishMotorMode };
}

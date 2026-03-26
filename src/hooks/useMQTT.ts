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

/**
 * @param topicPrefix - per-tank MQTT topic prefix, e.g. "water/tank" or "water/tank/device-abc"
 */
export function useMQTT(topicPrefix: string = "water/tank") {
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

  // Build topics from prefix
  const topics = useRef<string[]>([]);
  const commandTopic = `${topicPrefix}/motor/command`;
  const modeTopic = `${topicPrefix}/motor/mode`;

  useEffect(() => {
    topics.current = [
      `${topicPrefix}/level`,
      `${topicPrefix}/temperature`,
      `${topicPrefix}/tds`,
      `${topicPrefix}/motor/status`,
      `${topicPrefix}/device/status`,
      `${topicPrefix}/motor/ack`,
    ];
  }, [topicPrefix]);

  const parseMessage = useCallback((topic: string, message: any) => {
    try {
      const raw = typeof message === "string" ? message.trim() : new TextDecoder().decode(message).trim();
      const num = parseFloat(raw);
      console.log(`[MQTT] ${topic}:`, raw);

      if (topic.endsWith("/motor/ack")) {
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

        if (topic.endsWith("/level")) {
          updated.waterLevel = !isNaN(num) ? Math.min(100, Math.max(0, num)) : prev.waterLevel;
        } else if (topic.endsWith("/temperature")) {
          updated.temperature = !isNaN(num) ? num : prev.temperature;
        } else if (topic.endsWith("/tds")) {
          updated.salinity = !isNaN(num) ? num : prev.salinity;
        } else if (topic.endsWith("/motor/status")) {
          updated.motorRunning = raw === "on" || raw === "1" || raw === "running" || raw === "start";
        } else if (topic.endsWith("/device/status")) {
          updated.deviceOnline = raw === "online" || raw === "1" || raw === "alive";
        }

        return updated;
      });
    } catch (e) {
      console.error("[MQTT] Parse error:", e);
    }
  }, [clearCommandTimeout]);

  useEffect(() => {
    // Reset sensor data when prefix changes
    setSensorData(defaultData);
    setMotorCommandStatus("idle");

    const client = mqtt.connect(MQTT_URL, {
      ...MQTT_OPTIONS,
      clientId: `cuvoto-web-${Math.random().toString(16).slice(2, 10)}`,
    });
    clientRef.current = client;

    const currentTopics = [
      `${topicPrefix}/level`,
      `${topicPrefix}/temperature`,
      `${topicPrefix}/tds`,
      `${topicPrefix}/motor/status`,
      `${topicPrefix}/device/status`,
      `${topicPrefix}/motor/ack`,
    ];

    client.on("connect", () => {
      console.log(`[MQTT] Connected — subscribing to prefix: ${topicPrefix}`);
      setConnected(true);
      setError(null);
      currentTopics.forEach((t) =>
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
  }, [topicPrefix, parseMessage, clearCommandTimeout]);

  const publishMotorCommand = useCallback((command: "start" | "stop") => {
    if (clientRef.current?.connected) {
      setMotorCommandStatus("pending");
      clientRef.current.publish(commandTopic, command);
      console.log(`[MQTT] Published motor command: ${command} to ${commandTopic}`);

      clearCommandTimeout();
      commandTimeoutRef.current = setTimeout(() => {
        setMotorCommandStatus("error");
        setTimeout(() => setMotorCommandStatus("idle"), 3000);
      }, COMMAND_TIMEOUT_MS);
    }
  }, [clearCommandTimeout, commandTopic]);

  const publishMotorMode = useCallback((mode: "auto" | "manual") => {
    if (clientRef.current?.connected) {
      clientRef.current.publish(modeTopic, mode);
      console.log(`[MQTT] Published motor mode: ${mode} to ${modeTopic}`);
      setSensorData((prev) => ({ ...prev, motorMode: mode }));
    }
  }, [modeTopic]);

  return { sensorData, connected, error, motorCommandStatus, publishMotorCommand, publishMotorMode };
}

import { useEffect, useRef, useState, useCallback } from "react";
import mqtt, { MqttClient } from "mqtt";

export interface SensorData {
  waterLevel: number;
  salinity: number;
  temperature: number;
  motorRunning: boolean;
  timestamp: Date;
}

const MQTT_URL = "wss://c54cee0865234335a45b7af73963eef8.s1.eu.hivemq.cloud:8884/mqtt";
const MQTT_OPTIONS = {
  clientId: `cuvoto-web-${Math.random().toString(16).slice(2, 10)}`,
  username: "cuvototeam",
  password: "Cuvoto@2025",
  clean: true,
  reconnectPeriod: 5000,
};

const TOPICS = [
  "water/tank/level",
  "water/tank/temperature",
  "water/tank/tds",
];

const defaultData: SensorData = {
  waterLevel: 0,
  salinity: 0,
  temperature: 0,
  motorRunning: false,
  timestamp: new Date(),
};

export function useMQTT() {
  const [sensorData, setSensorData] = useState<SensorData>(defaultData);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<MqttClient | null>(null);

  const parseMessage = useCallback((topic: string, message: Buffer) => {
    try {
      const raw = message.toString().trim();
      const num = parseFloat(raw);
      console.log(`[MQTT] ${topic}:`, raw);

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
          default:
            break;
        }

        return updated;
      });
    } catch (e) {
      console.error("[MQTT] Parse error:", e);
    }
  }, []);

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
      client.end();
      clientRef.current = null;
    };
  }, [parseMessage]);

  const publishMotorCommand = useCallback((command: "start" | "stop") => {
    if (clientRef.current?.connected) {
      clientRef.current.publish("water/tank/motor", command);
    }
  }, []);

  return { sensorData, connected, error, publishMotorCommand };
}

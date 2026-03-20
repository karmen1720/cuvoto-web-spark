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
  clientId: "clientId-L71tyhChIS",
  username: "cuvototeam",
  password: "Cuvoto@2025",
  clean: true,
  reconnectPeriod: 5000,
};

const TOPIC = "water/tank/level";

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
      const raw = message.toString();
      console.log(`[MQTT] ${topic}:`, raw);

      // Try JSON parse first
      try {
        const json = JSON.parse(raw);
        setSensorData((prev) => ({
          waterLevel: json.waterLevel ?? json.water_level ?? json.level ?? prev.waterLevel,
          salinity: json.salinity ?? json.tds ?? prev.salinity,
          temperature: json.temperature ?? json.temp ?? prev.temperature,
          motorRunning: json.motorRunning ?? json.motor ?? prev.motorRunning,
          timestamp: new Date(),
        }));
      } catch {
        // Plain number = water level
        const num = parseFloat(raw);
        if (!isNaN(num)) {
          setSensorData((prev) => ({
            ...prev,
            waterLevel: Math.min(100, Math.max(0, num)),
            timestamp: new Date(),
          }));
        }
      }
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
      client.subscribe(TOPIC, (err) => {
        if (err) console.error("[MQTT] Subscribe error:", err);
        else console.log("[MQTT] Subscribed to", TOPIC);
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

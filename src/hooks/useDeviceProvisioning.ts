import { useState, useCallback } from "react";

// Standard ESP32/ESP8266 AP mode IP
const DEVICE_BASE_URL = "http://192.168.4.1";

export interface WifiNetwork {
  ssid: string;
  rssi: number;
  secure: boolean;
}

export interface DeviceInfo {
  device_id: string;
  device_name: string;
  firmware_version: string;
  mac_address: string;
}

export type ProvisioningStep = 
  | "connect_hotspot"
  | "detect_device"
  | "configure_device"
  | "scan_wifi"
  | "send_wifi"
  | "finalizing"
  | "complete"
  | "error";

export function useDeviceProvisioning() {
  const [step, setStep] = useState<ProvisioningStep>("connect_hotspot");
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetError = () => setError(null);

  // Ping device to check if connected via hotspot
  const detectDevice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${DEVICE_BASE_URL}/info`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error("Device responded with an error");

      const info: DeviceInfo = await res.json();
      setDeviceInfo(info);
      setStep("configure_device");
      return info;
    } catch (e: any) {
      setError(
        "Could not reach device. Make sure you're connected to the device's WiFi hotspot (CUVOTO-XXXX)."
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Send device config (name, MQTT topics, etc.)
  const configureDevice = useCallback(
    async (config: {
      device_name: string;
      mqtt_broker: string;
      mqtt_port: number;
      mqtt_username: string;
      mqtt_password: string;
      mqtt_topic_prefix: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${DEVICE_BASE_URL}/configure`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });

        if (!res.ok) throw new Error("Failed to configure device");

        setStep("scan_wifi");
        return true;
      } catch (e: any) {
        setError("Failed to send configuration to device. Please try again.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Scan WiFi networks visible to the device
  const scanWifi = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${DEVICE_BASE_URL}/scan-wifi`);
      if (!res.ok) throw new Error("WiFi scan failed");

      const data: { networks: WifiNetwork[] } = await res.json();
      // Sort by signal strength
      const sorted = (data.networks || []).sort((a, b) => b.rssi - a.rssi);
      setNetworks(sorted);
      return sorted;
    } catch (e: any) {
      setError("Failed to scan WiFi networks. Make sure you're still connected to the device hotspot.");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Send WiFi credentials to the device
  const sendWifiCredentials = useCallback(
    async (ssid: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${DEVICE_BASE_URL}/set-wifi`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ssid, password }),
        });

        if (!res.ok) throw new Error("Failed to set WiFi credentials");

        setStep("finalizing");
        return true;
      } catch (e: any) {
        setError("Failed to send WiFi credentials to device.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const goToStep = (s: ProvisioningStep) => {
    setError(null);
    setStep(s);
  };

  return {
    step,
    deviceInfo,
    networks,
    loading,
    error,
    resetError,
    goToStep,
    detectDevice,
    configureDevice,
    scanWifi,
    sendWifiCredentials,
  };
}

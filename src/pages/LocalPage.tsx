import { Link } from "react-router-dom";
import { Wifi, WifiOff } from "lucide-react";
import DeviceCard from "@/components/dashboard/DeviceCard";
import { useLocalDevice } from "@/hooks/useLocalDevice";

const LOCAL_IP = "192.168.4.1";

const LocalPage = () => {
  const { telemetry, error, cmdStatus, sendCommand } = useLocalDevice(LOCAL_IP, true);

  const device = {
    id: "local-device",
    user_id: "local-user",
    mac_id: telemetry?.mac || "ESP32 HOTSPOT",
    device_name: "CUVOTO Pump (Local)",
    last_water_level: telemetry?.waterLevel ?? 0,
    last_temperature: telemetry?.temperature ?? 0,
    last_tds: telemetry?.salinity ?? 0,
    last_motor_status: telemetry?.motorRunning ? "on" : "off",
    last_seen_at: telemetry?.timestamp?.toISOString() ?? null,
    created_at: new Date(0).toISOString(),
    local_ip: LOCAL_IP,
    connection_mode: "hotspot",
  };

  return (
    <main className="min-h-screen bg-cuvoto-gradient px-4 py-6 text-foreground dark">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Offline control</p>
            <h1 className="mt-1 text-2xl font-extrabold">Local device</h1>
            <p className="mt-1 text-xs text-muted-foreground">Connected directly to {LOCAL_IP}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
            {telemetry?.deviceOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {telemetry?.deviceOnline ? "Connected" : "Searching"}
          </div>
        </header>

        {error && <p className="rounded-xl border border-cuvoto-orange/30 bg-cuvoto-orange/10 p-3 text-sm text-cuvoto-orange">{error}. Join the CUVOTO hotspot and keep this page open.</p>}

        <DeviceCard
          device={device}
          liveTelemetry={telemetry}
          motorCommandStatus={cmdStatus}
          onMotorCommand={sendCommand}
          index={0}
        />

        <Link to="/dashboard" className="block text-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Return to cloud dashboard when internet is available
        </Link>
      </div>
    </main>
  );
};

export default LocalPage;

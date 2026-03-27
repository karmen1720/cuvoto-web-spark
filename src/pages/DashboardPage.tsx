import { Droplets, Settings, WifiOff, Loader2, Power } from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { useMQTT } from "@/hooks/useMQTT";
import { useDevices } from "@/hooks/useDevices";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef, useMemo } from "react";
import cuvotoLogo from "@/assets/cuvoto-logo.jpeg";
import DeviceCard from "@/components/dashboard/DeviceCard";

const DashboardPage = () => {
  const { devices, loading: devicesLoading, updateDeviceState } = useDevices();
  const { user } = useAuth();

  const registeredMacs = useMemo(() => devices.map((d) => d.mac_id), [devices]);
  const { telemetryMap, connected, motorCommandStatus, publishMotorCommand } = useMQTT(registeredMacs);

  // Persist last known state to DB (debounced, only on actual MQTT data)
  const lastPersistedRef = useRef<Record<string, number>>({});
  useEffect(() => {
    Object.entries(telemetryMap).forEach(([mac, data]) => {
      const now = Date.now();
      const lastTime = lastPersistedRef.current[mac] || 0;
      // Persist at most every 30 seconds per device
      if (now - lastTime > 30000) {
        lastPersistedRef.current[mac] = now;
        updateDeviceState(mac, {
          last_water_level: data.waterLevel,
          last_temperature: data.temperature,
          last_tds: data.salinity,
          last_motor_status: data.motorRunning ? "on" : "off",
          last_seen_at: new Date().toISOString(),
        });
      }
    });
  }, [telemetryMap]);

  return (
    <div className="min-h-screen bg-cuvoto-gradient text-foreground dark">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-cuvoto-navy/80 border-b border-cuvoto-border-dark px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={cuvotoLogo} alt="CUVOTO" className="w-8 h-8 rounded-lg object-contain" />
          <div>
            <span className="text-lg font-bold tracking-tight text-primary">CUVOTO</span>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground -mt-0.5">PVT LTD</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${connected ? "text-cuvoto-green" : "text-destructive"}`}>
            {connected ? (
              <>
                <div className="w-2 h-2 rounded-full bg-cuvoto-green animate-pulse-live" />
                LIVE
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                OFFLINE
              </>
            )}
          </div>
          <button className="w-9 h-9 rounded-full bg-cuvoto-dark-card border border-cuvoto-border-dark flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pb-24 overflow-y-auto">
        <div className="mb-2 mt-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">My Devices</h2>
          {devicesLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>

        {devicesLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Droplets className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-semibold">No devices registered</p>
            <p className="text-xs">Add a device to start monitoring</p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {devices.map((device, i) => {
              const live = telemetryMap[device.mac_id.toUpperCase()];
              return (
                <DeviceCard
                  key={device.id}
                  device={device}
                  liveTelemetry={live}
                  motorCommandStatus={motorCommandStatus}
                  onMotorCommand={(cmd) => publishMotorCommand(device.mac_id, cmd)}
                  index={i}
                />
              );
            })}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground mt-8">
          © 2026 CUVOTO PVT LTD. All rights reserved.
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default DashboardPage;

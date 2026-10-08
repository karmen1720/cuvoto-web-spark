import { Droplets, Settings, Wifi, WifiOff, Plus, Loader2, Trash2, X, Copy } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useDevices } from "@/hooks/useDevices";
import cuvotoLogo from "@/assets/cuvoto-logo.jpeg";

const TanksPage = () => {
  const { devices, loading, deleteDevice } = useDevices();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cuvoto-gradient text-foreground dark">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-cuvoto-navy/80 border-b border-cuvoto-border-dark px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={cuvotoLogo} alt="CUVOTO" className="w-7 h-7 rounded-lg object-contain" />
          <span className="text-lg font-bold tracking-tight text-primary">CUVOTO</span>
        </div>
        <h2 className="text-base font-semibold">Devices</h2>
        <button aria-label="Settings" onClick={() => navigate("/profile")} className="w-9 h-9 rounded-full bg-cuvoto-dark-card border border-cuvoto-border-dark flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 px-4 pb-24 overflow-y-auto">
        <div className="mt-4 mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">My Devices</h2>
          <button
            onClick={() => navigate("/register-device")}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Device
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Droplets className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-semibold">No devices added yet</p>
            <p className="text-xs">Tap "Add Device" to register your first device</p>
          </div>
        ) : (
          <>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-primary">{devices.length}</p>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total</p>
              </div>
            </div>

            <div className="space-y-3">
              {devices.map((device, i) => (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold">{device.device_name}</h3>
                      <p className="text-[10px] font-mono text-muted-foreground">{device.mac_id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const on = !!device.last_seen_at && Date.now() - new Date(device.last_seen_at).getTime() < 2 * 60 * 1000;
                        return (
                          <div title={device.last_seen_at ? `Last seen ${new Date(device.last_seen_at).toLocaleString()}` : "Never seen"} className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            on ? "bg-cuvoto-green/15 text-cuvoto-green" : "bg-destructive/15 text-destructive"
                          }`}>
                            {on ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                            {!device.last_seen_at ? "Never seen" : on ? "Online" : `Seen ${(() => { const m = Math.round((Date.now() - new Date(device.last_seen_at).getTime()) / 60000); return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`; })()} ago`}
                          </div>
                        );
                      })()}
                      <button aria-label="Remove device" onClick={() => { if (window.confirm(`Remove ${device.device_name}? You will need to pair it again.`)) deleteDevice(device.id); }} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Last Level: </span>
                      <span className="font-semibold">{device.last_water_level}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Motor: </span>
                      <span className="font-semibold">{device.last_motor_status}</span>
                    </div>
                  </div>
                  {(device as any).ingest_token && (
                    <button
                      onClick={() => { navigator.clipboard?.writeText((device as any).ingest_token); toast.success("Device token copied — paste it into the firmware"); }}
                      className="mt-3 w-full flex items-center justify-between gap-2 p-2.5 rounded-xl bg-card border border-border text-left"
                    >
                      <span className="min-w-0">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Device token (for alerts)</span>
                        <span className="block text-[11px] font-mono truncate">{(device as any).ingest_token}</span>
                      </span>
                      <Copy className="w-4 h-4 shrink-0 text-muted-foreground" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </>
        )}

        <p className="text-center text-[10px] text-muted-foreground mt-8">
          © 2026 CUVOTO PVT LTD. All rights reserved.
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default TanksPage;

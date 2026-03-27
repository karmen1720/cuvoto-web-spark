import { Droplets, Thermometer, Power, Wifi, WifiOff, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { DeviceTelemetry, MotorCommandStatus } from "@/hooks/useMQTT";
import type { Device } from "@/hooks/useDevices";

interface DeviceCardProps {
  device: Device;
  liveTelemetry?: DeviceTelemetry;
  motorCommandStatus: MotorCommandStatus;
  onMotorCommand: (cmd: "start" | "stop") => void;
  index: number;
}

const DeviceCard = ({ device, liveTelemetry, motorCommandStatus, onMotorCommand, index }: DeviceCardProps) => {
  // Use live data if available, otherwise fall back to last persisted state
  const waterLevel = liveTelemetry?.waterLevel ?? device.last_water_level ?? 0;
  const temperature = liveTelemetry?.temperature ?? device.last_temperature ?? 0;
  const salinity = liveTelemetry?.salinity ?? device.last_tds ?? 0;
  const motorRunning = liveTelemetry?.motorRunning ?? device.last_motor_status === "on";
  const isOnline = liveTelemetry?.deviceOnline ?? false;
  const isPending = motorCommandStatus === "pending";

  const getLevelColor = (level: number) => {
    if (level <= 20) return "text-destructive";
    if (level <= 50) return "text-cuvoto-orange";
    return "text-cuvoto-green";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-2xl p-4 space-y-4"
    >
      {/* Device Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">{device.device_name}</h3>
          <p className="text-[10px] font-mono text-muted-foreground">{device.mac_id}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          isOnline ? "bg-cuvoto-green/15 text-cuvoto-green" : "bg-destructive/15 text-destructive"
        }`}>
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isOnline ? "Online" : "Offline"}
        </div>
      </div>

      {/* Water Level Gauge (compact) */}
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 rounded-full border-2 border-cuvoto-border-dark flex items-center justify-center overflow-hidden bg-card">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${waterLevel}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute bottom-0 w-full bg-water-gradient"
          >
            <div className="liquid-wave" />
          </motion.div>
          <span className={`relative z-10 text-lg font-extrabold ${getLevelColor(waterLevel)}`}>
            {Math.round(waterLevel)}%
          </span>
        </div>

        {/* Sensor readings */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div className="bg-card border border-border rounded-xl p-2.5 text-center">
            <Droplets className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-[9px] font-bold text-muted-foreground uppercase">TDS</p>
            <p className="text-sm font-bold text-foreground">{Math.round(salinity)} <span className="text-[9px] text-muted-foreground">ppm</span></p>
          </div>
          <div className="bg-card border border-border rounded-xl p-2.5 text-center">
            <Thermometer className="w-4 h-4 text-cuvoto-orange mx-auto mb-1" />
            <p className="text-[9px] font-bold text-muted-foreground uppercase">Temp</p>
            <p className="text-sm font-bold text-foreground">{Math.round(temperature)}<span className="text-[9px] text-muted-foreground">°C</span></p>
          </div>
        </div>
      </div>

      {/* Motor Control */}
      <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl p-3">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Motor</p>
          <p className="text-sm font-bold text-primary">{motorRunning ? "Running" : "Standby"}</p>

          <AnimatePresence mode="wait">
            {motorCommandStatus !== "idle" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 mt-0.5">
                {isPending && <><Loader2 className="w-3 h-3 animate-spin text-muted-foreground" /><span className="text-[9px] text-muted-foreground">Sending…</span></>}
                {motorCommandStatus === "success" && <><CheckCircle2 className="w-3 h-3 text-cuvoto-green" /><span className="text-[9px] text-cuvoto-green">Done</span></>}
                {motorCommandStatus === "error" && <><XCircle className="w-3 h-3 text-destructive" /><span className="text-[9px] text-destructive">No response</span></>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => onMotorCommand(motorRunning ? "stop" : "start")}
          disabled={isPending || !isOnline}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            !isOnline
              ? "bg-cuvoto-dark-card text-muted-foreground border border-cuvoto-border-dark cursor-not-allowed opacity-50"
              : isPending
              ? "bg-cuvoto-dark-card text-muted-foreground border border-cuvoto-border-dark cursor-wait"
              : motorRunning
              ? "bg-destructive text-destructive-foreground shadow-lg"
              : "bg-cuvoto-green text-accent-foreground shadow-lg shadow-cuvoto-green/30"
          }`}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
          {isPending ? "…" : motorRunning ? "Stop" : "Start"}
        </button>
      </div>
    </motion.div>
  );
};

export default DeviceCard;

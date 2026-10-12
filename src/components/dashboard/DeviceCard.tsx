import { Droplets, Thermometer, Power, Wifi, WifiOff, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { levelToFloats, type DeviceTelemetry, type MotorCommandStatus } from "@/hooks/useMQTT";
import type { Device } from "@/hooks/useDevices";

interface DeviceCardProps {
  device: Device;
  liveTelemetry?: DeviceTelemetry;
  motorCommandStatus: MotorCommandStatus;
  onMotorCommand: (cmd: "start" | "stop" | "continue") => void;
  index: number;
}

const DeviceCard = ({ device, liveTelemetry, motorCommandStatus, onMotorCommand, index }: DeviceCardProps) => {
  // Use live data if available, otherwise fall back to last persisted state
  const waterLevel = liveTelemetry?.waterLevel ?? device.last_water_level ?? 0;
  const floats = liveTelemetry?.floats ?? levelToFloats(Number(waterLevel));
  const floatFault = liveTelemetry?.floatFault ?? false;
  const temperature = liveTelemetry?.temperature ?? device.last_temperature ?? 0;
  const salinity = liveTelemetry?.salinity ?? device.last_tds ?? 0;
  const motorRunning = liveTelemetry?.motorRunning ?? device.last_motor_status === "on";
  const continueRun = liveTelemetry?.continueRun ?? false;
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
      className="relative overflow-hidden bg-cuvoto-dark-card/80 backdrop-blur border border-cuvoto-border-dark rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl shadow-cuvoto-navy/40"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full bg-cuvoto-cyan/10 blur-3xl" />
      {/* Device Header */}
      <div className="relative flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-foreground truncate">{device.device_name}</h3>
          <p className="text-[10px] font-mono text-muted-foreground truncate">{device.mac_id}</p>
        </div>
        <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          isOnline ? "bg-cuvoto-green/15 text-cuvoto-green" : "bg-destructive/15 text-destructive"
        }`}>
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isOnline ? "Online" : "Offline"}
        </div>
      </div>

      {/* Tank with 5 float sensors */}
      <div className="relative flex flex-col xs:flex-row sm:flex-row items-center gap-4">
        <div className="flex items-end gap-2">
          <div className="relative w-20 h-32 rounded-2xl border-2 border-cuvoto-border-dark overflow-hidden bg-card">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${waterLevel}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute bottom-0 w-full bg-water-gradient"
            >
              <div className="liquid-wave" />
            </motion.div>
            <span className={`absolute inset-0 z-10 flex items-center justify-center text-lg font-extrabold ${getLevelColor(Number(waterLevel))}`}>
              {Math.round(Number(waterLevel))}%
            </span>
          </div>
          {/* Float indicators, top → bottom */}
          <div className="h-32 flex flex-col justify-between py-0.5">
            {[...floats].map((wet, i) => ({ wet, i })).reverse().map(({ wet, i }) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${wet ? "bg-primary shadow-[0_0_6px_hsl(var(--primary))]" : "bg-cuvoto-border-dark"}`} />
                <span className="text-[9px] font-mono text-muted-foreground">F{i + 1} · {(i + 1) * 20}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sensor readings */}
        <div className="w-full sm:flex-1 grid grid-cols-2 gap-2">
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

      {floatFault && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-cuvoto-orange/10 border border-cuvoto-orange/30 text-cuvoto-orange text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Float sensor fault: an upper float is wet while a lower one is dry. Check wiring.
        </div>
      )}

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

        <div className="flex items-center gap-2">
        {(
          <button
            onClick={() => onMotorCommand("continue")}
            disabled={isPending || !isOnline || continueRun}
            title="Allow the motor to keep running above 100%"
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
              continueRun
                ? "bg-cuvoto-orange/20 text-cuvoto-orange border border-cuvoto-orange/30"
                : "bg-cuvoto-orange text-cuvoto-navy shadow-lg"
            }`}
          >
            {continueRun ? "Override On" : "Continue"}
          </button>
        )}
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
      </div>
    </motion.div>
  );
};

export default DeviceCard;

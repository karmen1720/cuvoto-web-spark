import { Power, Loader2, CheckCircle2, XCircle, Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { SensorData, MotorCommandStatus } from "@/hooks/useMQTT";

interface MotorControlProps {
  sensorData: SensorData;
  motorCommandStatus: MotorCommandStatus;
  onModeChange: (mode: "auto" | "manual") => void;
  onMotorCommand: (cmd: "start" | "stop") => void;
}

const MotorControl = ({ sensorData, motorCommandStatus, onModeChange, onMotorCommand }: MotorControlProps) => {
  const { motorRunning, deviceOnline, motorMode } = sensorData;
  const isPending = motorCommandStatus === "pending";

  return (
    <section className="mt-6 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Motor Controls</h3>
        <div className="flex bg-cuvoto-dark-card rounded-xl p-1 w-28">
          <button
            onClick={() => onModeChange("auto")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              motorMode === "auto"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            AUTO
          </button>
          <button
            onClick={() => onModeChange("manual")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              motorMode === "manual"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            MANUAL
          </button>
        </div>
      </div>

      {/* Device status badge */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
          deviceOnline
            ? "bg-cuvoto-green/15 text-cuvoto-green"
            : "bg-destructive/15 text-destructive"
        }`}>
          {deviceOnline ? (
            <>
              <Wifi className="w-3 h-3" />
              <span>Device Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Device Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Motor status + button */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Motor Status</span>
          <p className="text-xl font-bold text-primary mt-0.5">
            {motorRunning ? "Running" : "Standby"}
          </p>

          {/* Command feedback */}
          <AnimatePresence mode="wait">
            {motorCommandStatus !== "idle" && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 mt-1"
              >
                {isPending && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Waiting for device…</span>
                  </>
                )}
                {motorCommandStatus === "success" && (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-cuvoto-green" />
                    <span className="text-[10px] text-cuvoto-green">Command acknowledged</span>
                  </>
                )}
                {motorCommandStatus === "error" && (
                  <>
                    <XCircle className="w-3 h-3 text-destructive" />
                    <span className="text-[10px] text-destructive">No response from device</span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => onMotorCommand(motorRunning ? "stop" : "start")}
          disabled={motorMode === "auto" || isPending || !deviceOnline}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
            motorMode === "auto" || !deviceOnline
              ? "bg-cuvoto-dark-card text-muted-foreground border border-cuvoto-border-dark cursor-not-allowed opacity-50"
              : isPending
              ? "bg-cuvoto-dark-card text-muted-foreground border border-cuvoto-border-dark cursor-wait"
              : motorRunning
              ? "bg-destructive text-destructive-foreground shadow-lg"
              : "bg-cuvoto-green text-accent-foreground shadow-lg shadow-cuvoto-green/30"
          }`}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Power className="w-4 h-4" />
          )}
          {isPending ? "Sending…" : motorRunning ? "Stop" : "Start"} {!isPending && "Motor"}
        </button>
      </div>

      {/* Info text */}
      {motorMode === "auto" && (
        <p className="text-xs text-muted-foreground text-center">
          Motor is controlled automatically by the device. Switch to <strong>MANUAL</strong> to control it.
        </p>
      )}
      {!deviceOnline && motorMode === "manual" && (
        <p className="text-xs text-destructive text-center">
          Device is offline. Motor commands cannot be sent.
        </p>
      )}
    </section>
  );
};

export default MotorControl;

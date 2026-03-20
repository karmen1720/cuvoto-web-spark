import { useState } from "react";
import { Droplets, Settings, Wifi, WifiOff, Power, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { useMQTT } from "@/hooks/useMQTT";

const DashboardPage = () => {
  const [motorMode, setMotorMode] = useState<"auto" | "manual">("auto");
  const { sensorData, connected, publishMotorCommand } = useMQTT();

  const waterLevel = sensorData.waterLevel;

  const logs = [
    { icon: <CheckCircle2 className="w-4 h-4" />, title: "Level Restored", desc: "Automatic stop at 95%", time: "10:45 AM", color: "bg-cuvoto-green/15 text-cuvoto-green" },
    { icon: <AlertTriangle className="w-4 h-4" />, title: "Motor Triggered", desc: "Water level dropped below 20%", time: "10:12 AM", color: "bg-cuvoto-orange/15 text-cuvoto-orange" },
  ];

  return (
    <div className="min-h-screen bg-cuvoto-gradient text-foreground dark">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-cuvoto-navy/80 border-b border-cuvoto-border-dark px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-8 h-8 text-primary" />
          <div>
            <span className="text-lg font-bold tracking-tight text-primary">CUVOTO</span>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground -mt-0.5">Private Limited</p>
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
        <div className="mb-2 mt-4">
          <h2 className="text-lg font-bold text-foreground">Water Tank Dashboard</h2>
        </div>

        {/* Water Level Gauge */}
        <section className="flex flex-col items-center justify-center py-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative w-56 h-56 rounded-full border-4 border-cuvoto-border-dark flex items-center justify-center"
          >
            {/* Ring glow */}
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            
            {/* Water fill */}
            <div className="relative w-full h-full rounded-full overflow-hidden bg-cuvoto-dark-card flex flex-col justify-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${waterLevel}%` }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                className="w-full bg-water-gradient relative"
              >
                <div className="liquid-wave" />
                <div className="liquid-wave-2" />
              </motion.div>
            </div>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-5xl font-extrabold text-foreground drop-shadow-lg"
              >
                {waterLevel}%
              </motion.span>
              <span className="text-xs font-semibold text-primary/80 uppercase tracking-widest mt-1">
                Water Level
              </span>
            </div>
          </motion.div>
        </section>

        {/* Salinity & Temperature Cards */}
        <div className="flex gap-4 w-full mt-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex-1 flex flex-col items-center bg-cuvoto-dark-card border border-cuvoto-border-dark p-4 rounded-2xl"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Droplets className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Salinity</span>
            <span className="text-xl font-bold text-foreground mt-1">
              450 <span className="text-xs font-normal text-muted-foreground">ppm</span>
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex-1 flex flex-col items-center bg-cuvoto-dark-card border border-cuvoto-border-dark p-4 rounded-2xl"
          >
            <div className="w-10 h-10 rounded-lg bg-cuvoto-orange/10 flex items-center justify-center mb-2">
              <Wifi className="w-5 h-5 text-cuvoto-orange" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Temperature</span>
            <span className="text-xl font-bold text-foreground mt-1">
              22.5<span className="text-xs font-normal text-muted-foreground">°C</span>
            </span>
          </motion.div>
        </div>

        {/* Motor Controls */}
        <section className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Motor Controls</h3>
            <div className="flex bg-cuvoto-dark-card rounded-xl p-1 w-28">
              <button
                onClick={() => setMotorMode("auto")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  motorMode === "auto"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                AUTO
              </button>
              <button
                onClick={() => setMotorMode("manual")}
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

          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Motor Status</span>
              <p className="text-xl font-bold text-primary mt-0.5">
                {motorRunning ? "Running" : "Standby"}
              </p>
            </div>
            <button
              onClick={() => setMotorRunning(!motorRunning)}
              disabled={motorMode === "auto"}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                motorMode === "auto"
                  ? "bg-cuvoto-dark-card text-muted-foreground border border-cuvoto-border-dark cursor-not-allowed opacity-50"
                  : motorRunning
                  ? "bg-destructive text-destructive-foreground shadow-lg"
                  : "bg-cuvoto-green text-accent-foreground shadow-lg shadow-cuvoto-green/30"
              }`}
            >
              <Power className="w-4 h-4" />
              {motorRunning ? "Stop" : "Start"} Motor
            </button>
          </div>
        </section>

        {/* Recent Logs */}
        <section className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Recent Logs</h3>
            <button className="text-sm font-bold text-primary">View all</button>
          </div>

          <div className="space-y-3">
            {logs.map((log, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="flex items-center justify-between p-4 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${log.color}`}>
                    {log.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{log.title}</p>
                    <p className="text-xs text-muted-foreground">{log.desc}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-muted-foreground">{log.time}</span>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default DashboardPage;

import { Droplets, Settings, WifiOff, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import MotorControl from "@/components/dashboard/MotorControl";
import AutoModeSettings from "@/components/dashboard/AutoModeSettings";
import TankSelector from "@/components/dashboard/TankSelector";
import { useMQTT } from "@/hooks/useMQTT";
import { useTanks } from "@/hooks/useTanks";
import { useTankLogs } from "@/hooks/useTankLogs";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";

const DashboardPage = () => {
  const { tanks, loading: tanksLoading, updateTank } = useTanks();
  const { user } = useAuth();
  const [selectedTankId, setSelectedTankId] = useState<string | null>(null);

  // Auto-select first tank when tanks load
  useEffect(() => {
    if (tanks.length > 0 && !selectedTankId) {
      setSelectedTankId(tanks[0].id);
    }
    // If selected tank was deleted, reset
    if (selectedTankId && !tanks.find(t => t.id === selectedTankId)) {
      setSelectedTankId(tanks[0]?.id || null);
    }
  }, [tanks, selectedTankId]);

  const activeTank = tanks.find(t => t.id === selectedTankId) || tanks[0] || null;
  const topicPrefix = activeTank?.mqtt_topic_prefix || "water/tank";

  const { sensorData, connected, motorCommandStatus, publishMotorCommand, publishMotorMode } = useMQTT(topicPrefix);
  const { logs, loading: logsLoading, addLog } = useTankLogs(activeTank?.id);

  const waterLevel = sensorData.waterLevel;
  const prevMotorRef = useRef(sensorData.motorRunning);

  // Log motor state changes from device
  useEffect(() => {
    if (!activeTank || !user) return;
    if (prevMotorRef.current !== sensorData.motorRunning) {
      prevMotorRef.current = sensorData.motorRunning;
      addLog({
        tank_id: activeTank.id,
        organization_id: activeTank.organization_id,
        event_type: sensorData.motorRunning ? "motor_on" : "motor_off",
        title: sensorData.motorRunning ? "Motor Started" : "Motor Stopped",
        description: `Motor ${sensorData.motorRunning ? "started" : "stopped"} in ${sensorData.motorMode} mode at ${waterLevel}% level`,
        severity: "info",
        metadata: { water_level: waterLevel, mode: sensorData.motorMode },
      });
    }
  }, [sensorData.motorRunning]);

  const handleMotorCommand = (cmd: "start" | "stop") => {
    if (!activeTank || !user) return;
    addLog({
      tank_id: activeTank.id,
      organization_id: activeTank.organization_id,
      event_type: cmd === "start" ? "motor_on" : "motor_off",
      title: cmd === "start" ? "Motor Start Command" : "Motor Stop Command",
      description: `User sent ${cmd} command in ${sensorData.motorMode} mode at ${waterLevel}% level`,
      severity: "info",
      metadata: { water_level: waterLevel, mode: sensorData.motorMode, source: "user_action" },
    });
    publishMotorCommand(cmd);
  };

  const handleModeChange = (mode: "auto" | "manual") => {
    if (!activeTank || !user) return;
    addLog({
      tank_id: activeTank.id,
      organization_id: activeTank.organization_id,
      event_type: "mode_change",
      title: `Switched to ${mode.toUpperCase()} Mode`,
      description: `User changed motor mode to ${mode} at ${waterLevel}% level`,
      severity: "info",
      metadata: { water_level: waterLevel, mode, source: "user_action" },
    });
    publishMotorMode(mode);
  };

  const handleSaveThresholds = async (min: number, max: number) => {
    if (!activeTank) return false;
    return updateTank(activeTank.id, { auto_min_level: min, auto_max_level: max });
  };

  const recentLogs = logs.slice(0, 5);

  const getLogIcon = (eventType: string) => {
    if (eventType.includes("motor_on") || eventType.includes("alert")) return <AlertTriangle className="w-4 h-4" />;
    return <CheckCircle2 className="w-4 h-4" />;
  };

  const getLogColor = (severity: string) => {
    if (severity === "critical") return "bg-destructive/15 text-destructive";
    if (severity === "warning") return "bg-cuvoto-orange/15 text-cuvoto-orange";
    return "bg-cuvoto-green/15 text-cuvoto-green";
  };

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
        <div className="mb-2 mt-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {activeTank ? activeTank.name : "Water Tank Dashboard"}
          </h2>
          {tanksLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>

        {/* Tank Selector (shown when multiple devices) */}
        <TankSelector
          tanks={tanks}
          selectedTankId={selectedTankId}
          onSelect={setSelectedTankId}
        />

        {/* Device Info Badge */}
        {activeTank?.device_id && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Device:</span>
            <span className="text-xs font-mono font-semibold text-primary">{activeTank.device_id}</span>
            <span className="text-[10px] text-muted-foreground">• Topic: {topicPrefix}</span>
          </div>
        )}

        {/* Water Level Gauge */}
        <section className="flex flex-col items-center justify-center py-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative w-56 h-56 rounded-full border-4 border-cuvoto-border-dark flex items-center justify-center"
          >
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="relative w-full h-full rounded-full overflow-hidden bg-cuvoto-dark-card flex flex-col justify-end">
              <motion.div
                key={selectedTankId}
                initial={{ height: 0 }}
                animate={{ height: `${waterLevel}%` }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                className="w-full bg-water-gradient relative"
              >
                <div className="liquid-wave" />
                <div className="liquid-wave-2" />
              </motion.div>
            </div>
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
              {sensorData.salinity} <span className="text-xs font-normal text-muted-foreground">ppm</span>
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex-1 flex flex-col items-center bg-cuvoto-dark-card border border-cuvoto-border-dark p-4 rounded-2xl"
          >
            <div className="w-10 h-10 rounded-lg bg-cuvoto-orange/10 flex items-center justify-center mb-2">
              <Droplets className="w-5 h-5 text-cuvoto-orange" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Temperature</span>
            <span className="text-xl font-bold text-foreground mt-1">
              {sensorData.temperature}<span className="text-xs font-normal text-muted-foreground">°C</span>
            </span>
          </motion.div>
        </div>

        {/* Motor Controls */}
        <MotorControl
          sensorData={sensorData}
          motorCommandStatus={motorCommandStatus}
          onModeChange={handleModeChange}
          onMotorCommand={handleMotorCommand}
        />

        {/* Auto Mode Threshold Settings */}
        <AutoModeSettings
          currentLevel={waterLevel}
          minLevel={activeTank?.auto_min_level ?? 20}
          maxLevel={activeTank?.auto_max_level ?? 90}
          motorMode={sensorData.motorMode}
          onSave={handleSaveThresholds}
        />

        {/* Recent Logs */}
        <section className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Recent Logs</h3>
            <button
              onClick={() => window.location.href = "/alerts"}
              className="text-sm font-bold text-primary"
            >
              View all
            </button>
          </div>

          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No logs yet</p>
              <p className="text-xs">Events will appear here as they happen</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="flex items-center justify-between p-4 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getLogColor(log.severity)}`}>
                      {getLogIcon(log.event_type)}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{log.title}</p>
                      <p className="text-xs text-muted-foreground">{log.description}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap ml-2">
                    {format(new Date(log.created_at), "h:mm a")}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default DashboardPage;

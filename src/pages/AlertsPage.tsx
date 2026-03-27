import { Droplets, CheckCircle2, AlertTriangle, AlertOctagon, Info, Filter, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { format, isToday, isYesterday } from "date-fns";
import BottomNav from "@/components/BottomNav";
import { useTankLogs, type TankLog } from "@/hooks/useTankLogs";
import cuvotoLogo from "@/assets/cuvoto-logo.jpeg";

type FilterType = "all" | "motor_on" | "motor_off" | "mode_change" | "alert" | "info";

const filterOptions: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "Motor ON", value: "motor_on" },
  { label: "Motor OFF", value: "motor_off" },
  { label: "Mode", value: "mode_change" },
  { label: "Alerts", value: "alert" },
  { label: "Info", value: "info" },
];

const getSeverityConfig = (severity: string, eventType: string) => {
  if (severity === "critical" || eventType.includes("alert")) {
    return { icon: <AlertOctagon className="w-4 h-4" />, color: "text-destructive", bg: "bg-destructive/15" };
  }
  if (severity === "warning" || eventType.includes("motor_on")) {
    return { icon: <AlertTriangle className="w-4 h-4" />, color: "text-cuvoto-orange", bg: "bg-cuvoto-orange/15" };
  }
  if (eventType.includes("motor_off")) {
    return { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-cuvoto-green", bg: "bg-cuvoto-green/15" };
  }
  return { icon: <Info className="w-4 h-4" />, color: "text-primary", bg: "bg-primary/15" };
};

const getDateLabel = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d, yyyy");
};

const AlertsPage = () => {
  const { logs, loading } = useTankLogs();
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return logs;
    return logs.filter((l) => l.event_type.includes(filter));
  }, [logs, filter]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, TankLog[]>>((acc, log) => {
      const key = getDateLabel(log.created_at);
      (acc[key] = acc[key] || []).push(log);
      return acc;
    }, {});
  }, [filtered]);

  const counts = useMemo(() => ({
    motor_on: logs.filter((l) => l.event_type === "motor_on").length,
    motor_off: logs.filter((l) => l.event_type === "motor_off").length,
    alerts: logs.filter((l) => l.severity === "critical" || l.severity === "warning").length,
  }), [logs]);

  return (
    <div className="min-h-screen bg-cuvoto-gradient text-foreground dark">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-cuvoto-navy/80 border-b border-cuvoto-border-dark px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={cuvotoLogo} alt="CUVOTO" className="w-7 h-7 rounded-lg object-contain" />
          <span className="text-lg font-bold tracking-tight text-primary">CUVOTO</span>
        </div>
        <h2 className="text-base font-semibold">Logs & Alerts</h2>
        <button className="w-9 h-9 rounded-full bg-cuvoto-dark-card border border-cuvoto-border-dark flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Filter className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 px-4 pb-24 overflow-y-auto">
        <div className="flex gap-2 mt-4 mb-4 overflow-x-auto pb-1 scrollbar-none">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                filter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-cuvoto-dark-card border border-cuvoto-border-dark text-muted-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-cuvoto-orange">{counts.motor_on}</p>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Motor ON</p>
          </div>
          <div className="flex-1 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-cuvoto-green">{counts.motor_off}</p>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Motor OFF</p>
          </div>
          <div className="flex-1 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-destructive">{counts.alerts}</p>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Alerts</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-semibold">No events found</p>
            <p className="text-xs">Logs will appear as your system operates</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, dateLogs]) => (
            <div key={date} className="mb-5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-1">{date}</h3>
              <div className="space-y-2">
                {dateLogs.map((log, i) => {
                  const config = getSeverityConfig(log.severity, log.event_type);
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between p-4 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bg} ${config.color}`}>
                          {config.icon}
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
                  );
                })}
              </div>
            </div>
          ))
        )}

        <p className="text-center text-[10px] text-muted-foreground mt-4">
          © 2026 CUVOTO PVT LTD. All rights reserved.
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default AlertsPage;

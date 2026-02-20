import { Droplets, Settings, CheckCircle2, AlertTriangle, AlertOctagon, Info, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";

type AlertType = "critical" | "warning" | "info" | "resolved";

interface Alert {
  id: number;
  type: AlertType;
  title: string;
  desc: string;
  tank: string;
  time: string;
  date: string;
}

const alerts: Alert[] = [
  { id: 1, type: "critical", title: "Water Level Critical", desc: "Emergency Tank dropped below 15%", tank: "Emergency Tank", time: "2:30 PM", date: "Today" },
  { id: 2, type: "resolved", title: "Level Restored", desc: "Automatic stop at 95%", tank: "Main Overhead Tank", time: "10:45 AM", date: "Today" },
  { id: 3, type: "warning", title: "Motor Triggered", desc: "Water level dropped below 20%", tank: "Main Overhead Tank", time: "10:12 AM", date: "Today" },
  { id: 4, type: "info", title: "Salinity Spike Detected", desc: "Salinity increased to 520 ppm", tank: "Garden Reserve", time: "9:00 AM", date: "Today" },
  { id: 5, type: "resolved", title: "Tank Refilled", desc: "Ground Sump refilled to 85%", tank: "Ground Sump", time: "8:15 PM", date: "Yesterday" },
  { id: 6, type: "warning", title: "High Temperature", desc: "Water temperature reached 28°C", tank: "Ground Sump", time: "3:45 PM", date: "Yesterday" },
  { id: 7, type: "critical", title: "Device Offline", desc: "Emergency Tank sensor disconnected", tank: "Emergency Tank", time: "1:20 PM", date: "Yesterday" },
];

const typeConfig: Record<AlertType, { icon: React.ReactNode; color: string; bg: string }> = {
  critical: { icon: <AlertOctagon className="w-4 h-4" />, color: "text-destructive", bg: "bg-destructive/15" },
  warning: { icon: <AlertTriangle className="w-4 h-4" />, color: "text-cuvoto-orange", bg: "bg-cuvoto-orange/15" },
  info: { icon: <Info className="w-4 h-4" />, color: "text-primary", bg: "bg-primary/15" },
  resolved: { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-cuvoto-green", bg: "bg-cuvoto-green/15" },
};

const filterOptions: { label: string; value: AlertType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "Warning", value: "warning" },
  { label: "Info", value: "info" },
  { label: "Resolved", value: "resolved" },
];

const AlertsPage = () => {
  const [filter, setFilter] = useState<AlertType | "all">("all");

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.type === filter);
  const grouped = filtered.reduce<Record<string, Alert[]>>((acc, alert) => {
    (acc[alert.date] = acc[alert.date] || []).push(alert);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-cuvoto-gradient text-foreground dark">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-cuvoto-navy/80 border-b border-cuvoto-border-dark px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-7 h-7 text-primary" />
          <span className="text-lg font-bold tracking-tight text-primary">CUVOTO</span>
        </div>
        <h2 className="text-base font-semibold">Alerts</h2>
        <button className="w-9 h-9 rounded-full bg-cuvoto-dark-card border border-cuvoto-border-dark flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Filter className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 px-4 pb-24 overflow-y-auto">
        {/* Filter Chips */}
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

        {/* Alert counts */}
        <div className="flex gap-3 mb-4">
          {[
            { label: "Critical", value: alerts.filter(a => a.type === "critical").length, color: "text-destructive" },
            { label: "Warnings", value: alerts.filter(a => a.type === "warning").length, color: "text-cuvoto-orange" },
            { label: "Resolved", value: alerts.filter(a => a.type === "resolved").length, color: "text-cuvoto-green" },
          ].map((stat) => (
            <div key={stat.label} className="flex-1 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Grouped Alerts */}
        {Object.entries(grouped).map(([date, dateAlerts]) => (
          <div key={date} className="mb-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-1">{date}</h3>
            <div className="space-y-2">
              {dateAlerts.map((alert, i) => {
                const config = typeConfig[alert.type];
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-4 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bg} ${config.color}`}>
                        {config.icon}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{alert.desc}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{alert.tank}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap ml-2">{alert.time}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-semibold">No alerts found</p>
            <p className="text-xs">All clear for this filter</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default AlertsPage;

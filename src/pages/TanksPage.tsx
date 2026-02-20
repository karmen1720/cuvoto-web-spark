import { Droplets, Settings, Wifi, WifiOff, MoreVertical } from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";

const tanks = [
  { id: 1, name: "Main Overhead Tank", location: "Building A - Rooftop", level: 75, capacity: "5000L", status: "online", salinity: 450, temp: 22.5 },
  { id: 2, name: "Ground Sump", location: "Building A - Basement", level: 42, capacity: "10000L", status: "online", salinity: 380, temp: 24.1 },
  { id: 3, name: "Garden Reserve", location: "Outdoor - East Wing", level: 91, capacity: "2000L", status: "online", salinity: 520, temp: 21.8 },
  { id: 4, name: "Emergency Tank", location: "Building B - Rooftop", level: 15, capacity: "3000L", status: "offline", salinity: 0, temp: 0 },
];

const getLevelColor = (level: number) => {
  if (level <= 20) return "bg-destructive";
  if (level <= 50) return "bg-cuvoto-orange";
  return "bg-cuvoto-green";
};

const getLevelTextColor = (level: number) => {
  if (level <= 20) return "text-destructive";
  if (level <= 50) return "text-cuvoto-orange";
  return "text-cuvoto-green";
};

const TanksPage = () => {
  return (
    <div className="min-h-screen bg-cuvoto-gradient text-foreground dark">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-cuvoto-navy/80 border-b border-cuvoto-border-dark px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-7 h-7 text-primary" />
          <span className="text-lg font-bold tracking-tight text-primary">CUVOTO</span>
        </div>
        <h2 className="text-base font-semibold">Tanks</h2>
        <button className="w-9 h-9 rounded-full bg-cuvoto-dark-card border border-cuvoto-border-dark flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 px-4 pb-24 overflow-y-auto">
        <div className="mt-4 mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">All Tanks</h2>
          <span className="text-xs font-semibold text-muted-foreground">{tanks.length} tanks</span>
        </div>

        {/* Summary Bar */}
        <div className="flex gap-3 mb-4">
          {[
            { label: "Online", value: tanks.filter(t => t.status === "online").length, color: "text-cuvoto-green" },
            { label: "Offline", value: tanks.filter(t => t.status === "offline").length, color: "text-destructive" },
            { label: "Low Level", value: tanks.filter(t => t.level <= 20).length, color: "text-cuvoto-orange" },
          ].map((stat) => (
            <div key={stat.label} className="flex-1 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tank Cards */}
        <div className="space-y-3">
          {tanks.map((tank, i) => (
            <motion.div
              key={tank.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-2xl p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold">{tank.name}</h3>
                  <p className="text-xs text-muted-foreground">{tank.location}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    tank.status === "online"
                      ? "bg-cuvoto-green/15 text-cuvoto-green"
                      : "bg-destructive/15 text-destructive"
                  }`}>
                    {tank.status === "online" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {tank.status}
                  </div>
                  <button className="text-muted-foreground">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Level Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Water Level</span>
                  <span className={`text-sm font-bold ${getLevelTextColor(tank.level)}`}>{tank.level}%</span>
                </div>
                <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${tank.level}%` }}
                    transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                    className={`h-full rounded-full ${getLevelColor(tank.level)}`}
                  />
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Capacity: </span>
                  <span className="font-semibold">{tank.capacity}</span>
                </div>
                {tank.status === "online" && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Salinity: </span>
                      <span className="font-semibold">{tank.salinity} ppm</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Temp: </span>
                      <span className="font-semibold">{tank.temp}°C</span>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default TanksPage;

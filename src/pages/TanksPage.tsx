import { Droplets, Settings, Wifi, WifiOff, MoreVertical, Plus, Loader2, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import { useTanks } from "@/hooks/useTanks";

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
  const { tanks, loading, addTank, deleteTank } = useTanks();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", device_id: "", capacity_liters: 5000 });
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setAdding(true);
    await addTank(form);
    setAdding(false);
    setShowAdd(false);
    setForm({ name: "", location: "", device_id: "", capacity_liters: 5000 });
  };

  const inputClass = "w-full px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

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
        <div className="mt-4 mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">My Tanks</h2>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Tank
          </button>
        </div>

        {/* Add Tank Form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <form onSubmit={handleAdd} className="bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold">New Tank</h3>
                  <button type="button" onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  placeholder="Tank Name *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                  required
                />
                <input
                  placeholder="Location (e.g. Building A - Rooftop)"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className={inputClass}
                />
                <input
                  placeholder="Device ID (MQTT identifier)"
                  value={form.device_id}
                  onChange={(e) => setForm({ ...form, device_id: e.target.value })}
                  className={inputClass}
                />
                <input
                  type="number"
                  placeholder="Capacity (Liters)"
                  value={form.capacity_liters}
                  onChange={(e) => setForm({ ...form, capacity_liters: Number(e.target.value) })}
                  className={inputClass}
                />
                <button
                  type="submit"
                  disabled={adding}
                  className="w-full py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Tank
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : tanks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Droplets className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-semibold">No tanks added yet</p>
            <p className="text-xs">Tap "Add Tank" to register your first water tank</p>
          </div>
        ) : (
          <>
            {/* Summary Bar */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-primary">{tanks.length}</p>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total</p>
              </div>
              <div className="flex-1 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-cuvoto-green">{tanks.filter(t => t.device_id).length}</p>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Connected</p>
              </div>
              <div className="flex-1 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-cuvoto-orange">{tanks.filter(t => !t.device_id).length}</p>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">No Device</p>
              </div>
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
                      <p className="text-xs text-muted-foreground">{tank.location || "No location set"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        tank.device_id
                          ? "bg-cuvoto-green/15 text-cuvoto-green"
                          : "bg-destructive/15 text-destructive"
                      }`}>
                        {tank.device_id ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        {tank.device_id ? "linked" : "unlinked"}
                      </div>
                      <button
                        onClick={() => deleteTank(tank.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Capacity: </span>
                      <span className="font-semibold">{tank.capacity_liters}L</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Auto: </span>
                      <span className="font-semibold">{tank.auto_min_level}% – {tank.auto_max_level}%</span>
                    </div>
                    {tank.device_id && (
                      <div>
                        <span className="text-muted-foreground">Device: </span>
                        <span className="font-semibold font-mono text-[10px]">{tank.device_id}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default TanksPage;

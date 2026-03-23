import { useState, useEffect } from "react";
import { Settings2, Save, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AutoModeSettingsProps {
  currentLevel: number;
  minLevel: number;
  maxLevel: number;
  motorMode: "auto" | "manual";
  onSave: (min: number, max: number) => Promise<boolean>;
}

const AutoModeSettings = ({ currentLevel, minLevel, maxLevel, motorMode, onSave }: AutoModeSettingsProps) => {
  const [min, setMin] = useState(minLevel);
  const [max, setMax] = useState(maxLevel);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMin(minLevel);
    setMax(maxLevel);
  }, [minLevel, maxLevel]);

  const validate = (minVal: number, maxVal: number) => {
    if (minVal < 0 || minVal > 100 || maxVal < 0 || maxVal > 100) return "Values must be 0–100%";
    if (minVal >= maxVal) return "Min must be less than Max";
    if (maxVal - minVal < 10) return "Min 10% gap required";
    return "";
  };

  const handleSave = async () => {
    const err = validate(min, max);
    if (err) { setError(err); return; }
    setError("");
    setSaving(true);
    const ok = await onSave(min, max);
    setSaving(false);
    if (ok) setExpanded(false);
  };

  if (motorMode !== "auto") return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
      >
        <Settings2 className="w-3.5 h-3.5" />
        {expanded ? "Hide" : "Configure"} Auto Thresholds
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-4">
              {/* Current level indicator */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-semibold">Current Tank Level</span>
                <span className="font-bold text-foreground">{currentLevel}%</span>
              </div>

              {/* Visual bar */}
              <div className="relative h-8 bg-secondary rounded-lg overflow-hidden">
                {/* Min marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-cuvoto-orange z-10"
                  style={{ left: `${min}%` }}
                />
                <div
                  className="absolute -top-1 text-[9px] font-bold text-cuvoto-orange z-10"
                  style={{ left: `${min}%`, transform: "translateX(-50%)" }}
                >
                  {min}%
                </div>

                {/* Max marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-cuvoto-green z-10"
                  style={{ left: `${max}%` }}
                />
                <div
                  className="absolute -top-1 text-[9px] font-bold text-cuvoto-green z-10"
                  style={{ left: `${max}%`, transform: "translateX(-50%)" }}
                >
                  {max}%
                </div>

                {/* Active range */}
                <div
                  className="absolute top-0 bottom-0 bg-primary/20"
                  style={{ left: `${min}%`, width: `${max - min}%` }}
                />

                {/* Current level */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-primary z-20 rounded"
                  style={{ left: `${currentLevel}%` }}
                />
              </div>

              {/* Inputs */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-cuvoto-orange uppercase tracking-wider block mb-1">
                    Motor START (Min %)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={min}
                    onChange={(e) => { setMin(Number(e.target.value)); setError(""); }}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-[9px] text-muted-foreground mt-0.5">Motor starts when level drops below this</p>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-cuvoto-green uppercase tracking-wider block mb-1">
                    Motor STOP (Max %)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={max}
                    onChange={(e) => { setMax(Number(e.target.value)); setError(""); }}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-[9px] text-muted-foreground mt-0.5">Motor stops when level reaches this</p>
                </div>
              </div>

              {error && <p className="text-xs text-destructive font-semibold">{error}</p>}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-lg hover:brightness-110 transition-all disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving…" : "Save Thresholds"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AutoModeSettings;

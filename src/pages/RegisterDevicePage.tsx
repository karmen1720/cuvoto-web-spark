import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Droplets, Wifi, Loader2, CheckCircle2, AlertTriangle, Plus, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const RegisterDevicePage = () => {
  const [code, setCode] = useState("");
  const [tankName, setTankName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("pair_device", {
        _code: code.trim().toUpperCase(),
        _user_id: user.id,
        _tank_name: tankName.trim() || "My Tank",
        _location: location.trim() || null,
      });

      if (error) throw error;

      setSuccess(true);
      toast.success("Device paired successfully!");
      setTimeout(() => navigate("/dashboard", { replace: true, state: { justPaired: true } }), 1500);
    } catch (err: any) {
      toast.error(err.message || "Failed to pair device");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const inputClass =
    "w-full px-4 py-3 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all";

  return (
    <div className="min-h-screen bg-cuvoto-gradient text-foreground dark flex flex-col">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-8 h-8 text-primary" />
          <div>
            <span className="text-lg font-bold tracking-tight text-primary">CUVOTO</span>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground -mt-0.5">Private Limited</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Icon */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="w-20 h-20 bg-primary/10 border-2 border-primary/30 rounded-2xl flex items-center justify-center mb-4"
            >
              {success ? (
                <CheckCircle2 className="w-10 h-10 text-cuvoto-green" />
              ) : (
                <Wifi className="w-10 h-10 text-primary" />
              )}
            </motion.div>

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <h1 className="text-2xl font-extrabold text-foreground">Device Paired!</h1>
                  <p className="text-sm text-muted-foreground mt-1">Redirecting to dashboard...</p>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <h1 className="text-2xl font-extrabold text-foreground">Register Device</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter your device's unique pairing code to connect it to your account
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Form */}
          {!success && (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onSubmit={handlePair}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Device Code *
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. DEV-001-CUVOTO"
                  className={`${inputClass} font-mono tracking-wider text-center text-base`}
                  required
                  maxLength={30}
                  autoFocus
                />
                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                  Find this code printed on your CUVOTO device
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Tank Name
                </label>
                <input
                  value={tankName}
                  onChange={(e) => setTankName(e.target.value)}
                  placeholder="e.g. Main Water Tank"
                  className={inputClass}
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Location
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Building A - Rooftop"
                  className={inputClass}
                  maxLength={100}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full py-3.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Pairing Device...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Pair Device
                  </>
                )}
              </button>
            </motion.form>
          )}

          {/* Info */}
          {!success && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 p-4 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-cuvoto-orange mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">How to find your device code?</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Each CUVOTO device comes with a unique pairing code printed on the device label. 
                    Enter the code exactly as shown (e.g. DEV-001-CUVOTO).
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default RegisterDevicePage;

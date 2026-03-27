import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wifi, Loader2, CheckCircle2, Plus, LogOut, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useDevices } from "@/hooks/useDevices";
import cuvotoLogo from "@/assets/cuvoto-logo.jpeg";

type Step = 1 | 2 | 3;

const RegisterDevicePage = () => {
  const [step, setStep] = useState<Step>(1);
  const [macId, setMacId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { addDevice } = useDevices();

  const formatMac = (value: string) => {
    const cleaned = value.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
    const parts = cleaned.match(/.{1,2}/g) || [];
    return parts.join(":").slice(0, 17);
  };

  const isValidMac = macId.replace(/:/g, "").length === 12;

  const handleRegister = async () => {
    if (!isValidMac || !deviceName.trim()) return;
    setLoading(true);
    const device = await addDevice(macId, deviceName);
    setLoading(false);
    if (device) {
      setSuccess(true);
      setTimeout(() => navigate("/dashboard", { replace: true, state: { justPaired: true } }), 1500);
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
          <img src={cuvotoLogo} alt="CUVOTO" className="w-8 h-8 rounded-lg object-contain" />
          <div>
            <span className="text-lg font-bold tracking-tight text-primary">CUVOTO</span>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground -mt-0.5">PVT LTD</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          {/* Icon */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="w-20 h-20 bg-primary/10 border-2 border-primary/30 rounded-2xl flex items-center justify-center mb-4"
            >
              {success ? <CheckCircle2 className="w-10 h-10 text-cuvoto-green" /> : <Cpu className="w-10 h-10 text-primary" />}
            </motion.div>

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                  <h1 className="text-2xl font-extrabold text-foreground">Device Registered!</h1>
                  <p className="text-sm text-muted-foreground mt-1">Redirecting to dashboard...</p>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                  <h1 className="text-2xl font-extrabold text-foreground">Set Up Your Device</h1>
                  <p className="text-sm text-muted-foreground mt-1">Connect your CUVOTO hardware in 3 easy steps</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Step Indicator */}
          {!success && (
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step >= s ? "bg-primary text-primary-foreground" : "bg-cuvoto-dark-card border border-cuvoto-border-dark text-muted-foreground"
                  }`}>
                    {step > s ? "✓" : s}
                  </div>
                  {s < 3 && <div className={`w-8 h-0.5 ${step > s ? "bg-primary" : "bg-cuvoto-border-dark"}`} />}
                </div>
              ))}
            </div>
          )}

          {/* Steps */}
          {!success && (
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Wifi className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">Connect to Device Hotspot</h3>
                        <p className="text-xs text-muted-foreground">Step 1 of 3</p>
                      </div>
                    </div>
                    <ol className="space-y-2 text-xs text-muted-foreground ml-1">
                      <li>1. Power on your CUVOTO device</li>
                      <li>2. Go to your phone's WiFi settings</li>
                      <li>3. Connect to <span className="font-mono font-bold text-primary">"CUVOTO_CONFIG"</span></li>
                      <li>4. Return here once connected</li>
                    </ol>
                  </div>
                  <button onClick={() => setStep(2)} className="w-full py-3.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:brightness-110 transition-all">
                    I'm Connected → Next
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Device MAC ID *
                    </label>
                    <input
                      value={macId}
                      onChange={(e) => setMacId(formatMac(e.target.value))}
                      placeholder="AA:BB:CC:11:22:33"
                      className={`${inputClass} font-mono tracking-wider text-center text-base`}
                      maxLength={17}
                      autoFocus
                    />
                    <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                      Find this on your device label or in the hotspot settings page
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="flex-1 py-3 bg-cuvoto-dark-card border border-cuvoto-border-dark text-foreground font-bold text-sm rounded-xl">
                      Back
                    </button>
                    <button onClick={() => isValidMac && setStep(3)} disabled={!isValidMac}
                      className="flex-1 py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:brightness-110 disabled:opacity-50 transition-all">
                      Next →
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Device Name *
                    </label>
                    <input
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      placeholder="e.g. Home Water Tank, Cricket Net 1"
                      className={inputClass}
                      maxLength={50}
                      autoFocus
                    />
                  </div>

                  <div className="bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl p-3 space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Summary</p>
                    <p className="text-xs"><span className="text-muted-foreground">MAC: </span><span className="font-mono font-bold text-primary">{macId}</span></p>
                    <p className="text-xs"><span className="text-muted-foreground">Name: </span><span className="font-bold">{deviceName || "—"}</span></p>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setStep(2)} className="flex-1 py-3 bg-cuvoto-dark-card border border-cuvoto-border-dark text-foreground font-bold text-sm rounded-xl">
                      Back
                    </button>
                    <button onClick={handleRegister} disabled={loading || !deviceName.trim()}
                      className="flex-1 py-3.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</> : <><Plus className="w-4 h-4" /> Register Device</>}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </motion.div>

        {/* Footer */}
        <p className="text-[10px] text-muted-foreground mt-8">© 2026 CUVOTO PVT LTD. All rights reserved.</p>
      </main>
    </div>
  );
};

export default RegisterDevicePage;

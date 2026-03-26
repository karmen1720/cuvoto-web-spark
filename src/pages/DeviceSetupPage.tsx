import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Droplets, Wifi, WifiOff, Loader2, CheckCircle2, AlertTriangle,
  Radio, Settings, ChevronRight, RefreshCw, Lock, Signal, ArrowLeft, Smartphone
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDeviceProvisioning, type ProvisioningStep, type WifiNetwork } from "@/hooks/useDeviceProvisioning";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const MQTT_BROKER = "c54cee0865234335a45b7af73963eef8.s1.eu.hivemq.cloud";
const MQTT_PORT = 8883;
const MQTT_USERNAME = "cuvototeam";
const MQTT_PASSWORD = "Cuvoto@2025";

const stepLabels: Record<ProvisioningStep, string> = {
  connect_hotspot: "Connect to Device",
  detect_device: "Detecting...",
  configure_device: "Configure Device",
  scan_wifi: "WiFi Setup",
  send_wifi: "Sending...",
  finalizing: "Finishing Up",
  complete: "All Done!",
  error: "Error",
};

const DeviceSetupPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    step, deviceInfo, networks, loading, error,
    resetError, goToStep, detectDevice, configureDevice, scanWifi, sendWifiCredentials,
  } = useDeviceProvisioning();

  // Config form
  const [deviceName, setDeviceName] = useState("");
  const [tankName, setTankName] = useState("");
  const [location, setLocation] = useState("");
  const [topicPrefix, setTopicPrefix] = useState("");

  // WiFi form
  const [selectedSsid, setSelectedSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Pairing
  const [pairing, setPairing] = useState(false);

  // Auto-fill defaults when device detected
  useEffect(() => {
    if (deviceInfo) {
      setDeviceName(deviceInfo.device_name || "");
      setTopicPrefix(`water/tank/${deviceInfo.device_id}`);
    }
  }, [deviceInfo]);

  const handleDetect = async () => {
    goToStep("detect_device");
    const info = await detectDevice();
    if (!info) goToStep("connect_hotspot");
  };

  const handleConfigure = async () => {
    if (!deviceName.trim()) {
      toast.error("Please enter a device name");
      return;
    }
    const success = await configureDevice({
      device_name: deviceName.trim(),
      mqtt_broker: MQTT_BROKER,
      mqtt_port: MQTT_PORT,
      mqtt_username: MQTT_USERNAME,
      mqtt_password: MQTT_PASSWORD,
      mqtt_topic_prefix: topicPrefix.trim() || `water/tank/${deviceInfo?.device_id}`,
    });
    if (success) {
      await scanWifi();
    }
  };

  const handleSendWifi = async () => {
    if (!selectedSsid) {
      toast.error("Please select a WiFi network");
      return;
    }
    const success = await sendWifiCredentials(selectedSsid, wifiPassword);
    if (success) {
      await handlePairInDb();
    }
  };

  const handleRescan = async () => {
    await scanWifi();
  };

  const handlePairInDb = async () => {
    if (!user || !deviceInfo) return;
    setPairing(true);
    try {
      // Get user's org
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) {
        toast.error("No organization found. Please use an invite code first.");
        setPairing(false);
        return;
      }

      const finalTopicPrefix = topicPrefix.trim() || `water/tank/${deviceInfo.device_id}`;
      const finalTankName = tankName.trim() || deviceName.trim() || "My Tank";

      // Check if device already exists as a tank
      const { data: existing } = await supabase
        .from("tanks")
        .select("id")
        .eq("device_id", deviceInfo.device_id)
        .maybeSingle();

      if (existing) {
        // Update existing tank
        await supabase
          .from("tanks")
          .update({
            name: finalTankName,
            location: location.trim() || null,
            mqtt_topic_prefix: finalTopicPrefix,
          })
          .eq("id", existing.id);
        toast.success("Device updated successfully!");
      } else {
        // Create new tank
        const { error: insertErr } = await supabase
          .from("tanks")
          .insert({
            name: finalTankName,
            organization_id: profile.organization_id,
            device_id: deviceInfo.device_id,
            created_by: user.id,
            location: location.trim() || null,
            mqtt_topic_prefix: finalTopicPrefix,
          });

        if (insertErr) throw insertErr;

        // Also mark device_codes as paired if exists
        await supabase
          .from("device_codes")
          .update({
            is_paired: true,
            paired_by: user.id,
            paired_at: new Date().toISOString(),
            organization_id: profile.organization_id,
          })
          .eq("device_id", deviceInfo.device_id);

        toast.success("Device paired and saved!");
      }

      goToStep("complete");
    } catch (e: any) {
      toast.error(e.message || "Failed to save device");
      goToStep("error");
    } finally {
      setPairing(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all";

  const getSignalIcon = (rssi: number) => {
    if (rssi > -50) return "text-cuvoto-green";
    if (rssi > -70) return "text-cuvoto-orange";
    return "text-destructive";
  };

  // Step progress
  const stepOrder: ProvisioningStep[] = ["connect_hotspot", "configure_device", "scan_wifi", "finalizing", "complete"];
  const currentIdx = stepOrder.indexOf(step);

  return (
    <div className="min-h-screen bg-cuvoto-gradient text-foreground dark flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-cuvoto-navy/80 border-b border-cuvoto-border-dark px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold">Device Setup</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {stepLabels[step]}
          </p>
        </div>
        <Smartphone className="w-5 h-5 text-primary" />
      </header>

      {/* Progress Bar */}
      <div className="px-4 pt-4">
        <div className="flex gap-1.5">
          {stepOrder.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= currentIdx ? "bg-primary" : "bg-cuvoto-border-dark"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 pb-24 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* STEP 1: Connect to Hotspot */}
          {(step === "connect_hotspot" || step === "detect_device") && (
            <motion.div
              key="hotspot"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="mt-8"
            >
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-20 h-20 bg-primary/10 border-2 border-primary/30 rounded-2xl flex items-center justify-center mb-4">
                  <Radio className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-xl font-extrabold">Connect to Device Hotspot</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                  Your CUVOTO device creates a WiFi hotspot when in setup mode. Connect your phone to it first.
                </p>
              </div>

              {/* Instructions */}
              <div className="space-y-3 mb-6">
                {[
                  { num: "1", text: "Power on your CUVOTO device", sub: "Hold the setup button for 3 seconds until the LED blinks blue" },
                  { num: "2", text: "Open your phone's WiFi settings", sub: "Look for a network named CUVOTO-XXXX" },
                  { num: "3", text: "Connect to the device hotspot", sub: "Default password: cuvoto1234" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-start gap-3 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl p-4"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{item.num}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl mb-4">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              <button
                onClick={handleDetect}
                disabled={loading}
                className="w-full py-3.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Detecting Device...
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4" />
                    I'm Connected — Detect Device
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* STEP 2: Configure Device */}
          {step === "configure_device" && (
            <motion.div
              key="configure"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="mt-6"
            >
              {/* Device detected badge */}
              {deviceInfo && (
                <div className="flex items-center gap-3 p-3 bg-cuvoto-green/10 border border-cuvoto-green/20 rounded-xl mb-6">
                  <CheckCircle2 className="w-5 h-5 text-cuvoto-green shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-cuvoto-green">Device Found!</p>
                    <p className="text-xs text-muted-foreground">
                      ID: {deviceInfo.device_id} • FW: {deviceInfo.firmware_version}
                    </p>
                  </div>
                </div>
              )}

              <h2 className="text-lg font-extrabold mb-1">Configure Your Device</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Set a name and configure how this device connects to the cloud.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Device Name *
                  </label>
                  <input
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="e.g. Rooftop Tank Sensor"
                    className={inputClass}
                    maxLength={50}
                  />
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

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    MQTT Topic Prefix
                  </label>
                  <input
                    value={topicPrefix}
                    onChange={(e) => setTopicPrefix(e.target.value)}
                    placeholder="water/tank/device-id"
                    className={`${inputClass} font-mono text-xs`}
                    maxLength={100}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Auto-generated from device ID. Only change if you know what you're doing.
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl mt-4">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              <button
                onClick={handleConfigure}
                disabled={loading || !deviceName.trim()}
                className="w-full py-3.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Configuring...
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4" />
                    Save & Setup WiFi
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* STEP 3: WiFi Setup */}
          {step === "scan_wifi" && (
            <motion.div
              key="wifi"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="mt-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-extrabold">WiFi Setup</h2>
                  <p className="text-sm text-muted-foreground">
                    Select the WiFi network for your device
                  </p>
                </div>
                <button
                  onClick={handleRescan}
                  disabled={loading}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                  Scan
                </button>
              </div>

              {/* Network List */}
              {loading && networks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">Scanning nearby networks...</p>
                </div>
              ) : networks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <WifiOff className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-semibold">No networks found</p>
                  <p className="text-xs">Tap Scan to try again</p>
                </div>
              ) : (
                <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
                  {networks.map((net, i) => (
                    <motion.button
                      key={`${net.ssid}-${i}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelectedSsid(net.ssid)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                        selectedSsid === net.ssid
                          ? "bg-primary/10 border-primary/40"
                          : "bg-cuvoto-dark-card border-cuvoto-border-dark hover:border-primary/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Signal className={`w-4 h-4 ${getSignalIcon(net.rssi)}`} />
                        <span className="text-sm font-semibold">{net.ssid}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {net.secure && <Lock className="w-3 h-3 text-muted-foreground" />}
                        <span className="text-[10px] text-muted-foreground">{net.rssi}dBm</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Password field */}
              {selectedSsid && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-3 mt-4"
                >
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                    <p className="text-xs font-bold text-primary mb-0.5">Selected Network</p>
                    <p className="text-sm font-semibold">{selectedSsid}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                      WiFi Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={wifiPassword}
                        onChange={(e) => setWifiPassword(e.target.value)}
                        placeholder="Enter WiFi password"
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary"
                      >
                        {showPassword ? "HIDE" : "SHOW"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl mt-4">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              <button
                onClick={handleSendWifi}
                disabled={loading || !selectedSsid || pairing}
                className="w-full py-3.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
              >
                {loading || pairing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {pairing ? "Saving to Cloud..." : "Sending to Device..."}
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4" />
                    Connect Device to WiFi
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* STEP 4: Finalizing */}
          {step === "finalizing" && (
            <motion.div
              key="finalizing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-16 flex flex-col items-center text-center"
            >
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <h2 className="text-xl font-extrabold">Setting Up Your Device</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                The device is connecting to your WiFi network and registering with the cloud. This may take a moment...
              </p>
              <div className="mt-8 space-y-2 w-full max-w-xs">
                {["Sending WiFi credentials", "Device connecting to network", "Registering in cloud"].map(
                  (text, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.8 }}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="w-4 h-4 text-cuvoto-green" />
                      <span>{text}</span>
                    </motion.div>
                  )
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 5: Complete */}
          {step === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-16 flex flex-col items-center text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-cuvoto-green/10 border-2 border-cuvoto-green/30 rounded-2xl flex items-center justify-center mb-4"
              >
                <CheckCircle2 className="w-10 h-10 text-cuvoto-green" />
              </motion.div>
              <h2 className="text-2xl font-extrabold">Device Ready!</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                Your device has been configured and paired. Switch back to your home WiFi to start monitoring.
              </p>

              {deviceInfo && (
                <div className="mt-6 p-4 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl w-full max-w-xs text-left space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Device</span>
                    <span className="font-semibold">{deviceName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">ID</span>
                    <span className="font-mono font-semibold">{deviceInfo.device_id}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">WiFi</span>
                    <span className="font-semibold">{selectedSsid}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Topic</span>
                    <span className="font-mono font-semibold text-[10px]">{topicPrefix}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-8 w-full max-w-xs">
                <button
                  onClick={() => navigate("/dashboard", { replace: true, state: { justPaired: true } })}
                  className="flex-1 py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:brightness-110 transition-all"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => {
                    goToStep("connect_hotspot");
                    setDeviceName("");
                    setTankName("");
                    setLocation("");
                    setTopicPrefix("");
                    setSelectedSsid("");
                    setWifiPassword("");
                  }}
                  className="px-4 py-3 bg-cuvoto-dark-card border border-cuvoto-border-dark text-foreground font-bold text-sm rounded-xl hover:border-primary/30 transition-all"
                >
                  Add Another
                </button>
              </div>
            </motion.div>
          )}

          {/* Error state */}
          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-16 flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 bg-destructive/10 border-2 border-destructive/30 rounded-2xl flex items-center justify-center mb-4">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-xl font-extrabold">Something Went Wrong</h2>
              <p className="text-sm text-muted-foreground mt-2">{error || "An unexpected error occurred."}</p>
              <button
                onClick={() => goToStep("connect_hotspot")}
                className="mt-6 px-6 py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
};

export default DeviceSetupPage;

import { ChevronRight, Mail, Lock, Bell, HelpCircle, FileText, LogOut, Camera, Loader2, Check, Pencil, X } from "lucide-react";
import cuvotoLogo from "@/assets/cuvoto-logo.jpeg";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string | null; email: string | null; organization_id: string | null } | null>(null);
  const [orgName, setOrgName] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("display_name, email, organization_id").eq("id", user.id).single();
      if (data) {
        setProfile(data);
        setEditName(data.display_name || "");
        if (data.organization_id) {
          const { data: org } = await supabase.from("organizations").select("name").eq("id", data.organization_id).single();
          if (org) setOrgName(org.name);
        }
      }
    })();
  }, [user]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
    navigate("/auth", { replace: true });
  };

  const handleSaveName = async () => {
    if (!user || !editName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: editName.trim() })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update name");
    } else {
      setProfile((prev) => prev ? { ...prev, display_name: editName.trim() } : prev);
      toast.success("Name updated!");
      setEditing(false);
    }
    setSaving(false);
  };

  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const email = profile?.email || user?.email || "";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const settingsItems = [
    { icon: <Mail className="w-5 h-5" />, label: email, action: undefined },
    { icon: <Lock className="w-5 h-5" />, label: "Change Password", action: undefined },
    { icon: <Bell className="w-5 h-5" />, label: "Notification Preferences", action: undefined },
  ];

  const supportItems = [
    { icon: <HelpCircle className="w-5 h-5" />, label: "Help Center" },
    { icon: <FileText className="w-5 h-5" />, label: "Privacy Policy" },
  ];

  const inputClass = "w-full px-3 py-2.5 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="min-h-screen bg-cuvoto-gradient text-foreground dark">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-cuvoto-navy/80 border-b border-cuvoto-border-dark px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={cuvotoLogo} alt="CUVOTO" className="w-7 h-7 rounded-lg object-contain" />
          <span className="text-lg font-bold tracking-tight text-primary">CUVOTO</span>
        </div>
        <h2 className="text-base font-semibold">Profile</h2>
        <div className="w-9" />
      </header>

      <main className="flex-1 px-4 pb-24 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-8 bg-gradient-to-b from-primary/5 to-transparent rounded-b-3xl"
        >
          <div className="relative">
            <div className="w-28 h-28 rounded-full border-4 border-primary/20 overflow-hidden bg-cuvoto-dark-card flex items-center justify-center">
              <span className="text-4xl font-bold text-primary">{initials}</span>
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-cuvoto-dark">
              <Camera className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>

          {/* Editable Name */}
          {editing ? (
            <div className="flex items-center gap-2 mt-4 w-full max-w-[250px]">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={inputClass}
                placeholder="Display Name"
                autoFocus
                maxLength={50}
              />
              <button
                onClick={handleSaveName}
                disabled={saving || !editName.trim()}
                className="w-9 h-9 shrink-0 rounded-xl bg-cuvoto-green text-accent-foreground flex items-center justify-center disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { setEditing(false); setEditName(profile?.display_name || ""); }}
                className="w-9 h-9 shrink-0 rounded-xl bg-cuvoto-dark-card border border-cuvoto-border-dark text-muted-foreground flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-4">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <button
                onClick={() => { setEditing(true); setEditName(profile?.display_name || displayName); }}
                className="w-7 h-7 rounded-lg bg-cuvoto-dark-card border border-cuvoto-border-dark flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {orgName && <p className="text-muted-foreground text-sm font-medium mt-1">{orgName}</p>}
          <div className="mt-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-cuvoto-green" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Verified Account</span>
          </div>
        </motion.div>

        {orgName && (
          <section className="mt-6">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 ml-1">Organization</h3>
            <div className="bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-2xl overflow-hidden p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{orgName}</p>
                  <p className="text-xs text-muted-foreground">Organization</p>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mt-6">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 ml-1">Account Settings</h3>
          <div className="bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-2xl overflow-hidden divide-y divide-cuvoto-border-dark">
            {settingsItems.map((item, i) => (
              <button key={i} className="flex items-center justify-between p-4 w-full hover:bg-cuvoto-navy/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 ml-1">Support & Legal</h3>
          <div className="bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-2xl overflow-hidden divide-y divide-cuvoto-border-dark">
            {supportItems.map((item, i) => (
              <button key={i} className="flex items-center justify-between p-4 w-full hover:bg-cuvoto-navy/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-6 flex items-center justify-center gap-2 w-full py-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl font-bold text-sm hover:bg-destructive/20 transition-colors disabled:opacity-60"
        >
          {loggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
          {loggingOut ? "Logging out…" : "Logout"}
        </button>

        <p className="text-center text-[10px] text-muted-foreground mt-4 mb-2">
          © 2026 CUVOTO PVT LTD. All rights reserved.
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;

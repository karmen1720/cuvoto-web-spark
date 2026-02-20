import { Droplets, ChevronRight, Mail, Lock, Bell, HelpCircle, FileText, LogOut, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";

const ProfilePage = () => {
  const navigate = useNavigate();

  const settingsItems = [
    { icon: <Mail className="w-5 h-5" />, label: "john.doe@cuvoto.com", action: true },
    { icon: <Lock className="w-5 h-5" />, label: "Change Password", action: true },
    { icon: <Bell className="w-5 h-5" />, label: "Notification Preferences", action: true },
  ];

  const supportItems = [
    { icon: <HelpCircle className="w-5 h-5" />, label: "Help Center", action: false },
    { icon: <FileText className="w-5 h-5" />, label: "Privacy Policy", action: true },
  ];

  return (
    <div className="min-h-screen bg-cuvoto-gradient text-foreground dark">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-cuvoto-navy/80 border-b border-cuvoto-border-dark px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-7 h-7 text-primary" />
          <span className="text-lg font-bold tracking-tight text-primary">CUVOTO</span>
        </div>
        <h2 className="text-base font-semibold">Profile</h2>
        <button className="text-primary text-sm font-medium">Edit</button>
      </header>

      <main className="flex-1 px-4 pb-24 overflow-y-auto">
        {/* Profile Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-8 bg-gradient-to-b from-primary/5 to-transparent rounded-b-3xl"
        >
          <div className="relative">
            <div className="w-28 h-28 rounded-full border-4 border-primary/20 overflow-hidden bg-cuvoto-dark-card flex items-center justify-center">
              <span className="text-4xl font-bold text-primary">JD</span>
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-cuvoto-dark">
              <Camera className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mt-4">John Doe</h1>
          <p className="text-muted-foreground text-sm font-medium">System Administrator</p>
          <div className="mt-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-cuvoto-green" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Verified Account</span>
          </div>
        </motion.div>

        {/* Company Information */}
        <section className="mt-6">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 ml-1">Company Information</h3>
          <div className="bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-2xl overflow-hidden divide-y divide-cuvoto-border-dark">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Company Name</p>
                  <p className="text-sm font-semibold">CUVOTO Private Limited</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-primary text-sm">📍</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Headquarters</p>
                  <p className="text-sm font-semibold">Bangalore, India</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </section>

        {/* Account Settings */}
        <section className="mt-6">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 ml-1">Account Settings</h3>
          <div className="bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-2xl overflow-hidden divide-y divide-cuvoto-border-dark">
            {settingsItems.map((item, i) => (
              <button key={i} className="flex items-center justify-between p-4 w-full hover:bg-cuvoto-navy/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {item.action && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
              </button>
            ))}
          </div>
        </section>

        {/* Support & Legal */}
        <section className="mt-6">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 ml-1">Support & Legal</h3>
          <div className="bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-2xl overflow-hidden divide-y divide-cuvoto-border-dark">
            {supportItems.map((item, i) => (
              <button key={i} className="flex items-center justify-between p-4 w-full hover:bg-cuvoto-navy/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {item.action && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
              </button>
            ))}
          </div>
        </section>

        {/* Logout */}
        <button
          onClick={() => navigate("/")}
          className="mt-6 flex items-center justify-center gap-2 w-full py-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl font-bold text-sm hover:bg-destructive/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>

        <p className="text-center text-[10px] text-muted-foreground mt-4 mb-2">
          Version 4.2.0 (Build 882)
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;

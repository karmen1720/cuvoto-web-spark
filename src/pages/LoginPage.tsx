import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Droplets, Wifi, Shield, User } from "lucide-react";
import { motion } from "framer-motion";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-login-gradient flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-4 relative">
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Droplets className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-card rounded-full flex items-center justify-center shadow-md border-2 border-card">
              <Wifi className="w-3.5 h-3.5 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary">CUVOTO</h1>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mt-1">
            Private Limited
          </p>
          <div className="mt-6">
            <h2 className="text-lg font-medium text-foreground">IoT Water Management</h2>
            <p className="text-sm text-muted-foreground">Secure access to your automation system</p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
              Work Email
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                placeholder="name@cuvoto.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
              Password
            </label>
            <div className="relative">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setKeepLoggedIn(!keepLoggedIn)}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  keepLoggedIn ? "bg-primary" : "bg-border"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-card shadow transition-transform ${
                    keepLoggedIn ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </div>
              <span className="text-sm text-muted-foreground">Keep me logged in</span>
            </label>
            <button type="button" className="text-sm font-bold text-primary hover:underline">
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:brightness-110 transition-all active:scale-[0.98]"
          >
            Sign In
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <button className="w-full py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors">
            Continue with Google
          </button>
          <p className="text-sm text-muted-foreground">
            Need access?{" "}
            <button className="text-primary font-semibold hover:underline">Contact Administrator</button>
          </p>
          <div className="pt-4 border-t border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Infrastructure Monitoring
            </p>
            <p className="text-[10px] text-muted-foreground">Water • Salinity • Temperature</p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            © 2024 CUVOTO Private Limited. All rights reserved.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;

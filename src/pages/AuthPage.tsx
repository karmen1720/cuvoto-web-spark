import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Droplets, Wifi, Shield, Mail, ArrowLeft, Loader2, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type AuthStep = "login" | "register" | "otp";

const AuthPage = () => {
  const [step, setStep] = useState<AuthStep>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      // ProtectedRoute will handle redirect to register-device or dashboard
      navigate("/dashboard", { replace: true });
    }
  }, [session, navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const validateInviteCode = async (code: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("invite_codes")
      .select("id, organization_id, current_uses, max_uses")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) return false;
    return data.current_uses < data.max_uses;
  };

  const applyInviteCode = async (code: string, userId: string) => {
    const { error } = await supabase.rpc("use_invite_code", {
      _code: code,
      _user_id: userId,
    });
    if (error) {
      console.error("Failed to apply invite code:", error);
      toast.error("Failed to assign organization");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please fill in all fields");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword || !inviteCode) return toast.error("Please fill in all fields");
    if (password !== confirmPassword) return toast.error("Passwords do not match");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");

    setLoading(true);

    // Validate invite code first
    const isValid = await validateInviteCode(inviteCode);
    if (!isValid) {
      setLoading(false);
      return toast.error("Invalid or expired invite code");
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { invite_code: inviteCode },
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setStep("otp");
      setResendCooldown(60);
      toast.success("Verification code sent to your email!");
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue.length !== 6) return toast.error("Please enter the 6-digit code");
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otpValue,
      type: "signup",
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      // Apply invite code after successful verification
      if (data.user && inviteCode) {
        await applyInviteCode(inviteCode, data.user.id);
      }
      toast.success("Account verified! Welcome to CUVOTO");
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setResendCooldown(60);
      toast.success("Verification code resent!");
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error(error.message);
  };

  const inputClass = "w-full pl-12 pr-4 py-3.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";
  const labelClass = "text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1";
  const btnClass = "w-full py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2";

  return (
    <div className="min-h-screen bg-login-gradient flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 w-full max-w-sm">
        {/* Logo */}
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mt-1">Private Limited</p>
        </div>

        <AnimatePresence mode="wait">
          {/* LOGIN */}
          {step === "login" && (
            <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
              <div className="text-center mb-6">
                <h2 className="text-lg font-medium text-foreground">Welcome Back</h2>
                <p className="text-sm text-muted-foreground">Sign in to your automation system</p>
              </div>

              {/* Google Sign In - Primary */}
              <button onClick={handleGoogleLogin} className="w-full py-3.5 border-2 border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-3 mb-4">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or sign in with email</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className={labelClass}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input type="email" placeholder="name@cuvoto.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className={btnClass}>
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  Sign In
                </button>
              </form>
              <p className="text-sm text-muted-foreground text-center mt-4">
                Don't have an account?{" "}
                <button onClick={() => { setStep("register"); setShowPassword(false); }} className="text-primary font-semibold hover:underline">
                  Create Account
                </button>
              </p>
            </motion.div>
          )}

          {/* REGISTER */}
          {step === "register" && (
            <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <button onClick={() => setStep("login")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to login
              </button>
              <div className="text-center mb-6">
                <h2 className="text-lg font-medium text-foreground">Create Account</h2>
                <p className="text-sm text-muted-foreground">Enter your invite code to register</p>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <label className={labelClass}>Invite Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input type="text" placeholder="Enter organization invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className={`${inputClass} font-mono tracking-widest uppercase`} />
                  </div>
                  <p className="text-[11px] text-muted-foreground ml-1">Get this code from your organization admin</p>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input type="email" placeholder="name@cuvoto.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input type={showPassword ? "text" : "password"} placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Confirm Password</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input type="password" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <button type="submit" disabled={loading} className={btnClass}>
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  Create Account
                </button>
              </form>
              <p className="text-sm text-muted-foreground text-center mt-4">
                Already have an account?{" "}
                <button onClick={() => setStep("login")} className="text-primary font-semibold hover:underline">Sign In</button>
              </p>
            </motion.div>
          )}

          {/* OTP VERIFICATION */}
          {step === "otp" && (
            <motion.div key="otp" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
              <button onClick={() => setStep("register")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Verify Your Email</h2>
                <p className="text-sm text-muted-foreground mt-1">Enter the 6-digit code sent to</p>
                <p className="text-sm font-semibold text-foreground">{email}</p>
              </div>
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <div className="mx-2" />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <button type="submit" disabled={loading || otpValue.length !== 6} className={btnClass}>
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  Verify & Continue
                </button>
              </form>
              <div className="text-center mt-6">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the code?{" "}
                  <button onClick={handleResendOTP} disabled={resendCooldown > 0}
                    className="text-primary font-semibold hover:underline disabled:opacity-50 disabled:no-underline">
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                  </button>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="pt-4 border-t border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Smart IoT Monitoring</p>
            <p className="text-[10px] text-muted-foreground">Water • Salinity • Temperature</p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">© 2026 CUVOTO PVT LTD. All rights reserved.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// True when the stored session can no longer be refreshed (expired/revoked).
const isInvalidSessionError = (message?: string) =>
  !!message && /refresh token|invalid grant|session.*(expired|missing|not found)/i.test(message);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const clearDeadSession = async () => {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // ignore — we only need the local copy gone
      }
      setSession(null);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
          setSession(session);
        } else {
          setSession(session);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error && isInvalidSessionError(error.message)) {
        await clearDeadSession();
      } else {
        setSession(session);
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    // When the user returns to the tab, re-validate with the Auth server so an
    // expired session is dropped instead of failing every request.
    const revalidate = async () => {
      if (document.visibilityState !== "visible") return;
      const { data: { session: current } } = await supabase.auth.getSession();
      if (!current) return;
      const { error } = await supabase.auth.getUser();
      if (error && isInvalidSessionError(error.message)) {
        await clearDeadSession();
      }
    };
    document.addEventListener("visibilitychange", revalidate);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", revalidate);
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      await supabase.auth.signOut({ scope: "local" });
    }
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

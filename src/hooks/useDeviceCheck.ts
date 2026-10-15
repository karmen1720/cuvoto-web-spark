import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useDeviceCheck() {
  const [hasDevices, setHasDevices] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [trigger, setTrigger] = useState(0);
  const { user } = useAuth();

  const refetch = useCallback(() => setTrigger((t) => t + 1), []);

  useEffect(() => {
    if (!user) {
      setHasDevices(null);
      setLoading(false);
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setHasDevices(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const check = async (attempt = 0) => {
      setLoading(true);
      const { count, error } = await supabase
        .from("devices")
        .select("*", { count: "exact", head: true });

      if (cancelled) return;

      if (error) {
        console.error("Device check error:", error);
        // Retry transient errors instead of assuming "no devices" (which would
        // redirect a device owner to the registration page on a flaky network).
        if (attempt < 2) {
          setTimeout(() => !cancelled && check(attempt + 1), 1500);
          return;
        }
        // After retries, keep whatever we last knew rather than forcing a redirect.
        setHasDevices((prev) => prev ?? false);
      } else {
        setHasDevices((count ?? 0) > 0);
      }
      setLoading(false);
    };

    check();
    return () => { cancelled = true; };
  }, [user, trigger]);

  return { hasDevices, loading, refetch };
}

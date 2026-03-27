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

    const check = async () => {
      setLoading(true);
      const { count, error } = await supabase
        .from("devices")
        .select("*", { count: "exact", head: true });

      if (error) {
        console.error("Device check error:", error);
        setHasDevices(false);
      } else {
        setHasDevices((count ?? 0) > 0);
      }
      setLoading(false);
    };

    check();
  }, [user, trigger]);

  return { hasDevices, loading, refetch };
}

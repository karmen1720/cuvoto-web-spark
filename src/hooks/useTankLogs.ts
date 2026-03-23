import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TankLog {
  id: string;
  tank_id: string;
  organization_id: string;
  event_type: string;
  title: string;
  description: string | null;
  severity: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useTankLogs(tankId?: string) {
  const [logs, setLogs] = useState<TankLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("tank_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (tankId) {
      query = query.eq("tank_id", tankId);
    }

    const { data, error } = await query;
    if (!error) {
      setLogs((data as TankLog[]) || []);
    }
    setLoading(false);
  }, [user, tankId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Subscribe to realtime logs
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("tank-logs-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tank_logs" },
        (payload) => {
          setLogs((prev) => [payload.new as TankLog, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addLog = async (log: {
    tank_id: string;
    organization_id: string;
    event_type: string;
    title: string;
    description?: string;
    severity?: string;
    metadata?: Record<string, string | number | boolean>;
  }) => {
    const { error } = await supabase.from("tank_logs").insert([{
      ...log,
      metadata: log.metadata as any,
    }]);
    if (error) console.error("Failed to log event:", error);
  };

  return { logs, loading, fetchLogs, addLog };
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Tank {
  id: string;
  organization_id: string;
  name: string;
  location: string | null;
  device_id: string | null;
  capacity_liters: number;
  auto_min_level: number;
  auto_max_level: number;
  mqtt_topic_prefix: string;
  created_at: string;
}

export function useTanks() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTanks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tanks")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching tanks:", error);
      toast.error("Failed to load tanks");
    } else {
      setTanks((data as Tank[]) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTanks();
  }, [fetchTanks]);

  const addTank = async (tank: { name: string; location: string; device_id: string; capacity_liters: number }) => {
    if (!user) return null;

    // Get user's org
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      toast.error("No organization found. Please use an invite code first.");
      return null;
    }

    const { data, error } = await supabase
      .from("tanks")
      .insert({
        ...tank,
        organization_id: profile.organization_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add tank");
      return null;
    }
    setTanks((prev) => [...prev, data as Tank]);
    toast.success("Tank added successfully!");
    return data;
  };

  const updateTank = async (id: string, updates: Partial<Tank>) => {
    const { error } = await supabase
      .from("tanks")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast.error("Failed to update tank");
      return false;
    }
    setTanks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    return true;
  };

  const deleteTank = async (id: string) => {
    const { error } = await supabase.from("tanks").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete tank");
      return false;
    }
    setTanks((prev) => prev.filter((t) => t.id !== id));
    toast.success("Tank removed");
    return true;
  };

  return { tanks, loading, fetchTanks, addTank, updateTank, deleteTank };
}

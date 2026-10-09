import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Device {
  id: string;
  user_id: string;
  mac_id: string;
  device_name: string;
  last_water_level: number;
  last_temperature: number;
  last_tds: number;
  last_motor_status: string;
  last_seen_at: string | null;
  created_at: string;
  local_ip?: string | null;
  connection_mode?: string;
}

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchDevices = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("devices")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching devices:", error);
      toast.error("Failed to load devices");
    } else {
      setDevices((data as unknown as Device[]) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const addDevice = async (macId: string, deviceName: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("devices")
      .insert({
        user_id: user.id,
        mac_id: macId.toUpperCase().trim(),
        device_name: deviceName.trim() || "My Device",
      } as any)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        toast.error("This MAC ID is already registered");
      } else {
        toast.error(error.message || "Failed to add device");
      }
      return null;
    }
    const device = data as unknown as Device;
    setDevices((prev) => [...prev, device]);
    toast.success("Device registered successfully!");
    return device;
  };

  const updateDeviceState = async (macId: string, updates: Partial<Pick<Device, "last_water_level" | "last_temperature" | "last_tds" | "last_motor_status" | "last_seen_at">>) => {
    const { error } = await supabase
      .from("devices")
      .update(updates as any)
      .eq("mac_id", macId.toUpperCase());

    if (!error) {
      setDevices((prev) =>
        prev.map((d) => (d.mac_id.toUpperCase() === macId.toUpperCase() ? { ...d, ...updates } : d))
      );
    }
  };

  const deleteDevice = async (id: string) => {
    const { error } = await supabase.from("devices").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete device");
      return false;
    }
    setDevices((prev) => prev.filter((d) => d.id !== id));
    toast.success("Device removed");
    return true;
  };

  const updateLocalSettings = async (id: string, updates: { local_ip?: string | null; connection_mode?: string }) => {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
    const { error } = await supabase.from("devices").update(updates as any).eq("id", id);
    if (error) toast.error("Failed to save local settings");
  };

  return { devices, loading, fetchDevices, addDevice, updateDeviceState, deleteDevice, updateLocalSettings };
}

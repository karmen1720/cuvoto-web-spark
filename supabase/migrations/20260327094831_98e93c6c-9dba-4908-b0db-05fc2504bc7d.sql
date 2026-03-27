
CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mac_id text NOT NULL,
  device_name text NOT NULL DEFAULT 'My Device',
  last_water_level numeric DEFAULT 0,
  last_temperature numeric DEFAULT 0,
  last_tds numeric DEFAULT 0,
  last_motor_status text DEFAULT 'off',
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mac_id)
);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own devices" ON public.devices FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own devices" ON public.devices FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own devices" ON public.devices FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own devices" ON public.devices FOR DELETE TO authenticated USING (user_id = auth.uid());

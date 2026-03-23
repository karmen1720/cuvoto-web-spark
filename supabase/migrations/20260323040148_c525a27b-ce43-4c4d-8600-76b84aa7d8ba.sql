
-- Tanks table: each tank belongs to an organization
CREATE TABLE public.tanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  device_id TEXT,
  capacity_liters INTEGER DEFAULT 5000,
  auto_min_level INTEGER DEFAULT 20,
  auto_max_level INTEGER DEFAULT 90,
  mqtt_topic_prefix TEXT DEFAULT 'water/tank',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.tanks ENABLE ROW LEVEL SECURITY;

-- Users can only see tanks in their org
CREATE POLICY "Users can read org tanks" ON public.tanks
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.organization_id = tanks.organization_id
  )
);

CREATE POLICY "Users can insert org tanks" ON public.tanks
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.organization_id = tanks.organization_id
  )
);

CREATE POLICY "Users can update org tanks" ON public.tanks
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.organization_id = tanks.organization_id
  )
);

CREATE POLICY "Users can delete org tanks" ON public.tanks
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.organization_id = tanks.organization_id
  )
);

-- Tank logs table for event tracking
CREATE TABLE public.tank_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id UUID REFERENCES public.tanks(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'info',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tank_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read org logs" ON public.tank_logs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.organization_id = tank_logs.organization_id
  )
);

CREATE POLICY "Users can insert org logs" ON public.tank_logs
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.organization_id = tank_logs.organization_id
  )
);

-- Enable realtime for tank_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.tank_logs;

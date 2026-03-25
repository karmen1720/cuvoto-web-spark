
-- Device codes table for pairing devices to organizations
CREATE TABLE public.device_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  device_id TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL DEFAULT 'Water Tank Device',
  is_paired BOOLEAN NOT NULL DEFAULT false,
  paired_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  paired_at TIMESTAMP WITH TIME ZONE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  tank_id UUID REFERENCES public.tanks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.device_codes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read unpaired codes (to validate during pairing)
CREATE POLICY "Users can read device codes for pairing"
  ON public.device_codes FOR SELECT
  TO authenticated
  USING (true);

-- Users can update device codes to pair them
CREATE POLICY "Users can pair devices"
  ON public.device_codes FOR UPDATE
  TO authenticated
  USING (is_paired = false)
  WITH CHECK (paired_by = auth.uid());

-- Function to pair a device using its unique code
CREATE OR REPLACE FUNCTION public.pair_device(_code TEXT, _user_id UUID, _tank_name TEXT DEFAULT 'My Tank', _location TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _device RECORD;
  _org_id UUID;
  _tank_id UUID;
BEGIN
  -- Get user's organization
  SELECT organization_id INTO _org_id FROM public.profiles WHERE id = _user_id;
  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'User has no organization. Please use an invite code first.';
  END IF;

  -- Find and validate the device code
  SELECT * INTO _device FROM public.device_codes WHERE code = _code AND is_paired = false;
  IF _device IS NULL THEN
    RAISE EXCEPTION 'Invalid or already paired device code.';
  END IF;

  -- Create a tank for this device
  INSERT INTO public.tanks (name, organization_id, device_id, created_by, location)
  VALUES (_tank_name, _org_id, _device.device_id, _user_id, _location)
  RETURNING id INTO _tank_id;

  -- Mark device as paired
  UPDATE public.device_codes
  SET is_paired = true, paired_by = _user_id, paired_at = now(), organization_id = _org_id, tank_id = _tank_id
  WHERE id = _device.id;

  RETURN _tank_id;
END;
$$;

-- Seed some test device codes
INSERT INTO public.device_codes (code, device_id, device_name) VALUES
  ('DEV-001-CUVOTO', 'ESP32-001', 'Cuvoto Tank Sensor v1'),
  ('DEV-002-CUVOTO', 'ESP32-002', 'Cuvoto Tank Sensor v2'),
  ('DEV-003-CUVOTO', 'ESP32-003', 'Cuvoto Tank Sensor v3');


-- Fix overly permissive RLS policy
DROP POLICY "Authenticated can update invite codes" ON public.invite_codes;

-- Only allow updating invite codes that the user created or via security definer function
CREATE OR REPLACE FUNCTION public.use_invite_code(_code TEXT, _user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID;
BEGIN
  -- Find and validate the invite code
  SELECT organization_id INTO _org_id
  FROM public.invite_codes
  WHERE code = _code AND is_active = true AND current_uses < max_uses;

  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  -- Increment usage
  UPDATE public.invite_codes SET current_uses = current_uses + 1
  WHERE code = _code;

  -- Deactivate if max reached
  UPDATE public.invite_codes SET is_active = false
  WHERE code = _code AND current_uses >= max_uses;

  -- Assign user to organization
  UPDATE public.profiles SET organization_id = _org_id
  WHERE id = _user_id;

  RETURN _org_id;
END;
$$;

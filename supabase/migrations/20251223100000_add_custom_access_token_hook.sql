-- ============================================
-- Custom Access Token Hook
-- Embeds organization_id in JWT claims for faster edge function auth
-- ============================================

-- Create the hook function that adds org_id to JWT claims
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  user_org_id uuid;
BEGIN
  -- Get the current claims from the event
  claims := event->'claims';

  -- Look up the user's organization_id
  SELECT organization_id INTO user_org_id
  FROM u_users
  WHERE auth_user_id = (event->>'user_id')::uuid;

  -- Add organization_id to claims if found
  IF user_org_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{org_id}', to_jsonb(user_org_id::text));
  END IF;

  -- Return the modified event with updated claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant execute permission to supabase_auth_admin (required for auth hooks)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;

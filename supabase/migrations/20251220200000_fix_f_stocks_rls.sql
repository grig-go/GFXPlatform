-- Migration: Fix f_stocks RLS policies
-- The table has RLS enabled but no policies, blocking all access
-- Add proper policies for authenticated users and service role

-- Drop any existing policies (in case they exist but weren't found)
DROP POLICY IF EXISTS "allow_select_f_stocks" ON f_stocks;
DROP POLICY IF EXISTS "allow_insert_f_stocks" ON f_stocks;
DROP POLICY IF EXISTS "allow_update_f_stocks" ON f_stocks;
DROP POLICY IF EXISTS "allow_delete_f_stocks" ON f_stocks;
DROP POLICY IF EXISTS "org_select_f_stocks" ON f_stocks;
DROP POLICY IF EXISTS "org_insert_f_stocks" ON f_stocks;
DROP POLICY IF EXISTS "org_update_f_stocks" ON f_stocks;
DROP POLICY IF EXISTS "org_delete_f_stocks" ON f_stocks;

-- SELECT: All authenticated users can read stocks (they're public market data)
-- Also allow anon access for edge functions that may not have user context
CREATE POLICY "allow_select_f_stocks" ON f_stocks
FOR SELECT
USING (true);

-- INSERT: Authenticated users can insert stocks
CREATE POLICY "allow_insert_f_stocks" ON f_stocks
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Authenticated users can update stocks
CREATE POLICY "allow_update_f_stocks" ON f_stocks
FOR UPDATE
TO authenticated
USING (true);

-- DELETE: Only superusers can delete stocks
CREATE POLICY "allow_delete_f_stocks" ON f_stocks
FOR DELETE
TO authenticated
USING (
  (SELECT is_superuser FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1) = true
);

-- Also add policies for data_providers since it's used by mapbox and other services
DROP POLICY IF EXISTS "allow_select_data_providers" ON data_providers;
DROP POLICY IF EXISTS "allow_insert_data_providers" ON data_providers;
DROP POLICY IF EXISTS "allow_update_data_providers" ON data_providers;
DROP POLICY IF EXISTS "allow_delete_data_providers" ON data_providers;
DROP POLICY IF EXISTS "org_select_data_providers" ON data_providers;

-- SELECT: All can read data_providers (public config)
CREATE POLICY "allow_select_data_providers" ON data_providers
FOR SELECT
USING (true);

-- INSERT: Only superusers
CREATE POLICY "allow_insert_data_providers" ON data_providers
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT is_superuser FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1) = true
);

-- UPDATE: Only superusers
CREATE POLICY "allow_update_data_providers" ON data_providers
FOR UPDATE
TO authenticated
USING (
  (SELECT is_superuser FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1) = true
);

-- DELETE: Only superusers
CREATE POLICY "allow_delete_data_providers" ON data_providers
FOR DELETE
TO authenticated
USING (
  (SELECT is_superuser FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1) = true
);

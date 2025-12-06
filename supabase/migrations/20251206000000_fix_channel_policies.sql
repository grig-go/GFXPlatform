-- =====================================================
-- FIX CHANNEL ACCESS POLICIES
-- Ensure all users (anon and authenticated) can access channels
-- =====================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow anon to read channel state" ON pulsar_channel_state;
DROP POLICY IF EXISTS "Allow anon to update channel state" ON pulsar_channel_state;
DROP POLICY IF EXISTS "Allow anon to insert channel state" ON pulsar_channel_state;
DROP POLICY IF EXISTS "Allow anon to read channels" ON pulsar_channels;
DROP POLICY IF EXISTS "Allow anon to insert channels" ON pulsar_channels;
DROP POLICY IF EXISTS "Allow anon to update channels" ON pulsar_channels;
DROP POLICY IF EXISTS "Allow anon to delete channels" ON pulsar_channels;
DROP POLICY IF EXISTS "Allow all read channel state" ON pulsar_channel_state;
DROP POLICY IF EXISTS "Allow all update channel state" ON pulsar_channel_state;
DROP POLICY IF EXISTS "Allow all insert channel state" ON pulsar_channel_state;
DROP POLICY IF EXISTS "Allow all read channels" ON pulsar_channels;
DROP POLICY IF EXISTS "Allow all insert channels" ON pulsar_channels;
DROP POLICY IF EXISTS "Allow all update channels" ON pulsar_channels;
DROP POLICY IF EXISTS "Allow all delete channels" ON pulsar_channels;

-- Channel State policies (for all users - no role restriction)
CREATE POLICY "Allow all read channel state"
  ON pulsar_channel_state FOR SELECT
  USING (true);

CREATE POLICY "Allow all update channel state"
  ON pulsar_channel_state FOR UPDATE
  USING (true);

CREATE POLICY "Allow all insert channel state"
  ON pulsar_channel_state FOR INSERT
  WITH CHECK (true);

-- Channels policies (for all users - no role restriction)
CREATE POLICY "Allow all read channels"
  ON pulsar_channels FOR SELECT
  USING (true);

CREATE POLICY "Allow all insert channels"
  ON pulsar_channels FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all update channels"
  ON pulsar_channels FOR UPDATE
  USING (true);

CREATE POLICY "Allow all delete channels"
  ON pulsar_channels FOR DELETE
  USING (true);

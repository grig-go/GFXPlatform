-- =====================================================
-- ACCESS POLICIES FOR PLAYOUT LOG
-- Allows all users (anon and authenticated) full access
-- =====================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow authenticated users to read playout log" ON pulsar_playout_log;
DROP POLICY IF EXISTS "Allow authenticated users to insert playout log" ON pulsar_playout_log;
DROP POLICY IF EXISTS "Allow authenticated users to update playout log" ON pulsar_playout_log;
DROP POLICY IF EXISTS "Allow anon to update playout log" ON pulsar_playout_log;

-- Create permissive policies for all users
CREATE POLICY "Allow all read playout log"
  ON pulsar_playout_log FOR SELECT
  USING (true);

CREATE POLICY "Allow all insert playout log"
  ON pulsar_playout_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all update playout log"
  ON pulsar_playout_log FOR UPDATE
  USING (true);

CREATE POLICY "Allow all delete playout log"
  ON pulsar_playout_log FOR DELETE
  USING (true);

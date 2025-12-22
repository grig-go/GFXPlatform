-- Add UPDATE policy for anonymous users on pulsar_channels
-- This allows Nova Player (which uses anon key) to update player_status and last_heartbeat
-- Without this policy, REST PATCH requests return 204 but don't actually modify any rows

-- Drop the policy if it already exists (in case of re-run)
DROP POLICY IF EXISTS "pulsar_channels_anon_update" ON pulsar_channels;

-- Create UPDATE policy for anon users
-- This is needed because Nova Player runs with anon key and needs to update its connection status
CREATE POLICY "pulsar_channels_anon_update" ON pulsar_channels
FOR UPDATE TO anon
USING (true)
WITH CHECK (true);

-- Also add policy for pulsar_channel_state table since Nova Player updates that too
DROP POLICY IF EXISTS "pulsar_channel_state_anon_update" ON pulsar_channel_state;

CREATE POLICY "pulsar_channel_state_anon_update" ON pulsar_channel_state
FOR UPDATE TO anon
USING (true)
WITH CHECK (true);

-- RLS policies for pulsar_user_preferences table
-- Allows authenticated users to manage their own preferences

-- Enable RLS on the table (if not already enabled)
ALTER TABLE pulsar_user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'pulsar_user_preferences'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON pulsar_user_preferences', pol.policyname);
        RAISE NOTICE 'Dropped existing policy: %', pol.policyname;
    END LOOP;
END $$;

-- Allow users to read their own preferences
CREATE POLICY "pulsar_prefs_select_own"
ON pulsar_user_preferences FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to insert their own preferences
CREATE POLICY "pulsar_prefs_insert_own"
ON pulsar_user_preferences FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own preferences
CREATE POLICY "pulsar_prefs_update_own"
ON pulsar_user_preferences FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their own preferences
CREATE POLICY "pulsar_prefs_delete_own"
ON pulsar_user_preferences FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Verification
DO $$
BEGIN
    RAISE NOTICE 'Pulsar user preferences RLS policies created';
    RAISE NOTICE 'Policies: pulsar_prefs_select_own, pulsar_prefs_insert_own, pulsar_prefs_update_own, pulsar_prefs_delete_own';
END $$;

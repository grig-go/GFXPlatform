-- DEFINITIVE cleanup of gfx_chat_messages RLS policies
-- Drop ALL policies and recreate simple ones

-- ============================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- ============================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'gfx_chat_messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON gfx_chat_messages', pol.policyname);
        RAISE NOTICE 'Dropped chat policy: %', pol.policyname;
    END LOOP;
END $$;

-- ============================================
-- STEP 2: CREATE SIMPLE POLICIES
-- No complex subqueries - just require authentication
-- ============================================

CREATE POLICY "chat_auth_select"
ON gfx_chat_messages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "chat_auth_insert"
ON gfx_chat_messages FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "chat_auth_update"
ON gfx_chat_messages FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "chat_auth_delete"
ON gfx_chat_messages FOR DELETE
TO authenticated
USING (true);

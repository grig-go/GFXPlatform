-- =====================================================
-- FIX PLAYOUT LOG OPERATOR FOREIGN KEY
-- Remove the FK constraint since operator_id may be a dev user ID
-- that doesn't exist in auth.users
-- =====================================================

-- Drop the existing foreign key constraint
ALTER TABLE pulsar_playout_log
DROP CONSTRAINT IF EXISTS pulsar_playout_log_operator_id_fkey;

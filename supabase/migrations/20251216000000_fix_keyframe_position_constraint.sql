-- Migration: Fix keyframe position constraint
-- The position column was constrained to 0-100 (percentage), but we now store
-- absolute milliseconds. Remove the constraint to allow any non-negative value.

-- Drop the existing check constraint on position
-- Note: PostgreSQL generates constraint names, so we need to find and drop it
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the check constraint on gfx_keyframes.position
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'gfx_keyframes'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'  -- check constraint
      AND pg_get_constraintdef(con.oid) LIKE '%position%';

    -- Drop the constraint if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE gfx_keyframes DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No position constraint found on gfx_keyframes';
    END IF;
END $$;

-- Add a new constraint that only requires position >= 0 (milliseconds)
ALTER TABLE gfx_keyframes
ADD CONSTRAINT gfx_keyframes_position_check CHECK (position >= 0);

-- Also add the name column if it doesn't exist (for keyframe naming)
ALTER TABLE gfx_keyframes
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add comment explaining the change
COMMENT ON COLUMN gfx_keyframes.position IS 'Keyframe position in milliseconds relative to animation start (was percentage 0-100)';

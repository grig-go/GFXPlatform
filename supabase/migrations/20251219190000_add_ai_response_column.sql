-- Add ai_response column to e_synthetic_races table
-- This column was referenced in the RPC function but was missing from the table

ALTER TABLE public.e_synthetic_races
ADD COLUMN IF NOT EXISTS ai_response JSONB;

-- Copy existing data from ai_response_raw to ai_response if ai_response_raw exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'e_synthetic_races'
        AND column_name = 'ai_response_raw'
    ) THEN
        UPDATE public.e_synthetic_races
        SET ai_response = ai_response_raw
        WHERE ai_response IS NULL AND ai_response_raw IS NOT NULL;
    END IF;
END $$;

-- Also add created_by column if it doesn't exist
ALTER TABLE public.e_synthetic_races
ADD COLUMN IF NOT EXISTS created_by UUID;

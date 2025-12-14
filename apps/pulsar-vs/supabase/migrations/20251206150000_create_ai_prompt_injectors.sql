-- Migration: Add airport_instructions enum value to ai_prompt_injectors

-- Add the new enum value for airport_instructions
ALTER TYPE ai_injector_feature ADD VALUE IF NOT EXISTS 'airport_instructions';

-- Enable RLS if not already enabled
ALTER TABLE ai_prompt_injectors ENABLE ROW LEVEL SECURITY;

-- RLS Policies - drop if exists then create
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow read for authenticated users" ON ai_prompt_injectors;
    DROP POLICY IF EXISTS "Allow insert for authenticated users" ON ai_prompt_injectors;
    DROP POLICY IF EXISTS "Allow update for authenticated users" ON ai_prompt_injectors;
    DROP POLICY IF EXISTS "Allow read for anon users" ON ai_prompt_injectors;
    DROP POLICY IF EXISTS "Allow insert for anon users" ON ai_prompt_injectors;
    DROP POLICY IF EXISTS "Allow update for anon users" ON ai_prompt_injectors;
END $$;

CREATE POLICY "Allow read for authenticated users"
    ON ai_prompt_injectors FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert for authenticated users"
    ON ai_prompt_injectors FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
    ON ai_prompt_injectors FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow read for anon users"
    ON ai_prompt_injectors FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow insert for anon users"
    ON ai_prompt_injectors FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow update for anon users"
    ON ai_prompt_injectors FOR UPDATE
    TO anon
    USING (true);

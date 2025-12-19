-- =====================================================
-- SYNTHETIC DATA GROUPS TABLE
-- Allows organizing synthetic races into named groups/versions
-- =====================================================

-- Create synthetic groups table
CREATE TABLE IF NOT EXISTS public.e_synthetic_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Add comment for documentation
COMMENT ON TABLE public.e_synthetic_groups IS 'Groups/versions for organizing synthetic election data scenarios';

-- Enable RLS
ALTER TABLE public.e_synthetic_groups ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access" ON public.e_synthetic_groups
    FOR SELECT TO public USING (true);

-- Authenticated users can manage groups
CREATE POLICY "Authenticated users can manage groups" ON public.e_synthetic_groups
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_synthetic_groups_updated_at
    BEFORE UPDATE ON public.e_synthetic_groups
    FOR EACH ROW EXECUTE FUNCTION public.e_update_updated_at_column();

-- Create index on name for faster lookups
CREATE INDEX idx_synthetic_groups_name ON public.e_synthetic_groups(name);
CREATE INDEX idx_synthetic_groups_created_by ON public.e_synthetic_groups(created_by);

-- Insert a default "Synthetic" group for backwards compatibility
INSERT INTO public.e_synthetic_groups (id, name, description)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Default',
    'Default synthetic data group for backwards compatibility'
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ADD GROUP REFERENCE TO SYNTHETIC RACES
-- =====================================================

-- Add synthetic_group_id column to e_synthetic_races table
-- Using DO block to check if column exists first
DO $$
BEGIN
    -- Check if e_synthetic_races table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'e_synthetic_races') THEN
        -- Check if column already exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'e_synthetic_races'
            AND column_name = 'synthetic_group_id'
        ) THEN
            -- Add the column with default pointing to the Default group
            ALTER TABLE public.e_synthetic_races
            ADD COLUMN synthetic_group_id UUID REFERENCES public.e_synthetic_groups(id)
            DEFAULT 'a0000000-0000-0000-0000-000000000001';

            -- Create index for the new column
            CREATE INDEX idx_synthetic_races_group ON public.e_synthetic_races(synthetic_group_id);
        END IF;
    END IF;
END $$;

-- =====================================================
-- RPC FUNCTIONS FOR SYNTHETIC GROUPS
-- =====================================================

-- List all synthetic groups
CREATE OR REPLACE FUNCTION public.e_list_synthetic_groups()
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    race_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        g.id,
        g.name,
        g.description,
        g.created_by,
        g.created_at,
        g.updated_at,
        COALESCE(COUNT(sr.id), 0) as race_count
    FROM public.e_synthetic_groups g
    LEFT JOIN public.e_synthetic_races sr ON sr.synthetic_group_id = g.id
    GROUP BY g.id, g.name, g.description, g.created_by, g.created_at, g.updated_at
    ORDER BY g.name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.e_list_synthetic_groups() TO anon, authenticated;

-- Create a new synthetic group
CREATE OR REPLACE FUNCTION public.e_create_synthetic_group(
    p_name VARCHAR,
    p_description TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_group_id UUID;
BEGIN
    INSERT INTO public.e_synthetic_groups (name, description, created_by)
    VALUES (p_name, p_description, p_user_id)
    RETURNING id INTO v_group_id;

    RETURN v_group_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.e_create_synthetic_group(VARCHAR, TEXT, UUID) TO anon, authenticated;

-- Delete a synthetic group (only if empty or cascade delete races)
CREATE OR REPLACE FUNCTION public.e_delete_synthetic_group(
    p_group_id UUID,
    p_cascade_delete_races BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_race_count INTEGER;
    v_group_name VARCHAR;
BEGIN
    -- Get group info
    SELECT name INTO v_group_name FROM public.e_synthetic_groups WHERE id = p_group_id;

    IF v_group_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Group not found');
    END IF;

    -- Don't allow deleting the default group
    IF p_group_id = 'a0000000-0000-0000-0000-000000000001' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot delete the default group');
    END IF;

    -- Count races in this group
    SELECT COUNT(*) INTO v_race_count
    FROM public.e_synthetic_races
    WHERE synthetic_group_id = p_group_id;

    IF v_race_count > 0 AND NOT p_cascade_delete_races THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Group has ' || v_race_count || ' races. Set cascade_delete_races to true to delete them.',
            'race_count', v_race_count
        );
    END IF;

    -- Delete races if cascade is enabled
    IF p_cascade_delete_races AND v_race_count > 0 THEN
        -- Delete all synthetic races in this group using the existing RPC
        PERFORM public.e_delete_synthetic_race(sr.id)
        FROM public.e_synthetic_races sr
        WHERE sr.synthetic_group_id = p_group_id;
    END IF;

    -- Delete the group
    DELETE FROM public.e_synthetic_groups WHERE id = p_group_id;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_group', v_group_name,
        'deleted_races', v_race_count
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.e_delete_synthetic_group(UUID, BOOLEAN) TO anon, authenticated;

-- Rename a synthetic group
CREATE OR REPLACE FUNCTION public.e_rename_synthetic_group(
    p_group_id UUID,
    p_new_name VARCHAR,
    p_new_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.e_synthetic_groups
    SET
        name = p_new_name,
        description = COALESCE(p_new_description, description),
        updated_at = NOW()
    WHERE id = p_group_id;

    RETURN FOUND;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.e_rename_synthetic_group(UUID, VARCHAR, TEXT) TO anon, authenticated;

-- List synthetic races filtered by group
CREATE OR REPLACE FUNCTION public.e_list_synthetic_races_by_group(
    p_group_id UUID DEFAULT NULL
)
RETURNS TABLE (
    synthetic_race_id UUID,
    name VARCHAR,
    description TEXT,
    office VARCHAR,
    state VARCHAR,
    district VARCHAR,
    group_id UUID,
    group_name VARCHAR,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sr.id as synthetic_race_id,
        sr.name,
        sr.description,
        sr.office,
        sr.state,
        sr.district,
        sr.synthetic_group_id as group_id,
        g.name as group_name,
        sr.created_at
    FROM public.e_synthetic_races sr
    LEFT JOIN public.e_synthetic_groups g ON g.id = sr.synthetic_group_id
    WHERE p_group_id IS NULL OR sr.synthetic_group_id = p_group_id
    ORDER BY sr.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.e_list_synthetic_races_by_group(UUID) TO anon, authenticated;

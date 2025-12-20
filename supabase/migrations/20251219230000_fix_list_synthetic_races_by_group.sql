-- Fix e_list_synthetic_races_by_group RPC return type mismatch
-- The e_synthetic_races.name column is TEXT, but the function was returning VARCHAR
-- Error: "Returned type text does not match expected type character varying in column 2"

DROP FUNCTION IF EXISTS public.e_list_synthetic_races_by_group(UUID);

CREATE OR REPLACE FUNCTION public.e_list_synthetic_races_by_group(
    p_group_id UUID DEFAULT NULL
)
RETURNS TABLE (
    synthetic_race_id UUID,
    name TEXT,           -- Changed from VARCHAR to TEXT
    description TEXT,
    office TEXT,         -- Changed from VARCHAR to TEXT
    state TEXT,          -- Changed from VARCHAR to TEXT
    district TEXT,       -- Changed from VARCHAR to TEXT
    group_id UUID,
    group_name TEXT,     -- Changed from VARCHAR to TEXT
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sr.id as synthetic_race_id,
        sr.name::TEXT,
        sr.description::TEXT,
        sr.office::TEXT,
        sr.state::TEXT,
        sr.district::TEXT,
        sr.synthetic_group_id as group_id,
        g.name::TEXT as group_name,
        sr.created_at
    FROM public.e_synthetic_races sr
    LEFT JOIN public.e_synthetic_groups g ON g.id = sr.synthetic_group_id
    WHERE p_group_id IS NULL OR sr.synthetic_group_id = p_group_id
    ORDER BY sr.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.e_list_synthetic_races_by_group(UUID) TO anon, authenticated;

COMMENT ON FUNCTION public.e_list_synthetic_races_by_group IS 'List synthetic races filtered by group ID. Returns all races if p_group_id is NULL.';

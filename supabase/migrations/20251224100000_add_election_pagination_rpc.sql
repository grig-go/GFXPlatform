-- Migration: Add paginated election data RPC function with server-side filtering
-- This function supports filtering by year, race_type, and pagination at the database level
-- Supports organization impersonation via p_effective_org_id parameter

-- Drop existing function if it exists (to allow re-running migration)
DROP FUNCTION IF EXISTS public.fetch_election_data_paginated(integer, varchar, integer, integer);
DROP FUNCTION IF EXISTS public.fetch_election_data_paginated(integer, varchar, integer, integer, uuid);

-- Create new paginated function with impersonation support
CREATE OR REPLACE FUNCTION public.fetch_election_data_paginated(
    p_year integer DEFAULT NULL,
    p_race_type varchar DEFAULT NULL,
    p_page integer DEFAULT 1,
    p_page_size integer DEFAULT 50,
    p_effective_org_id uuid DEFAULT NULL  -- For superuser impersonation: pass the impersonated org ID
)
RETURNS TABLE(
    last_fetch_at timestamp with time zone,
    election_id character varying,
    election_uuid uuid,
    election_name text,
    year integer,
    race_id uuid,
    race_race_id character varying,
    race_name character varying,
    race_display_name character varying,
    office character varying,
    race_type character varying,
    num_elect integer,
    uncontested boolean,
    division_type character varying,
    state_code character varying,
    fips_code character varying,
    race_results_id uuid,
    called boolean,
    called_status character varying,
    percent_reporting numeric,
    last_updated timestamp with time zone,
    precincts_reporting integer,
    precincts_total integer,
    called_timestamp timestamp with time zone,
    total_votes integer,
    called_override boolean,
    called_status_override character varying,
    percent_reporting_override numeric,
    precincts_reporting_override integer,
    precincts_total_override integer,
    called_override_timestamp timestamp with time zone,
    total_votes_override integer,
    candidate_id character varying,
    full_name character varying,
    first_name character varying,
    last_name character varying,
    candidate_display_name character varying,
    party_code character varying,
    party_name character varying,
    party_color_primary character varying,
    party_color_secondary character varying,
    party_color_light character varying,
    party_color_dark character varying,
    party_color_primary_override character varying,
    party_short_name character varying,
    party_display_name character varying,
    party_founded_year character varying,
    party_description text,
    party_ideology character varying,
    party_headquarters text,
    party_history text,
    party_website character varying,
    party_twitter character varying,
    party_facebook character varying,
    party_instagram character varying,
    party_leadership jsonb,
    party_abbreviations text[],
    party_aliases text[],
    candidate_results_id uuid,
    votes integer,
    vote_percentage numeric,
    incumbent boolean,
    winner boolean,
    photo_url character varying,
    race_candidates_id uuid,
    ballot_order integer,
    withdrew boolean,
    electoral_votes integer,
    state_electoral_votes integer,
    bio text,
    date_of_birth date,
    bio_short text,
    education text[],
    professional_background text[],
    political_experience text[],
    website character varying,
    votes_override integer,
    vote_percentage_override numeric,
    winner_override boolean,
    electoral_votes_override integer,
    incumbent_override boolean,
    withdrew_override boolean,
    race_override_at timestamp with time zone,
    race_override_by uuid,
    race_override_reason text,
    candidate_override_at timestamp with time zone,
    candidate_override_by uuid,
    candidate_override_reason text,
    -- Pagination metadata
    total_races bigint,
    total_rows bigint
)
LANGUAGE plpgsql
SECURITY DEFINER  -- Run as owner to bypass RLS, we handle org filtering manually
SET statement_timeout TO '30s'
AS $$
DECLARE
    v_offset integer;
    v_total_races bigint;
    v_total_rows bigint;
    v_org_id uuid;
    v_is_super boolean;
BEGIN
    -- Calculate offset
    v_offset := (p_page - 1) * p_page_size;

    -- Determine effective organization ID
    -- If p_effective_org_id is provided (superuser impersonating), use it
    -- Otherwise, get the user's actual organization
    v_is_super := is_superuser();

    IF p_effective_org_id IS NOT NULL AND v_is_super THEN
        -- Superuser impersonating another org
        v_org_id := p_effective_org_id;
    ELSIF v_is_super AND p_effective_org_id IS NULL THEN
        -- Superuser not impersonating - show all data (v_org_id stays NULL)
        v_org_id := NULL;
    ELSE
        -- Regular user - use their organization
        v_org_id := get_user_organization_id();
    END IF;

    -- Get total counts for pagination metadata
    -- Count unique races matching the filters (with org filter)
    SELECT COUNT(DISTINCT r.id)
    INTO v_total_races
    FROM public.e_races r
    INNER JOIN public.e_elections e ON r.election_id = e.id
    INNER JOIN public.e_geographic_divisions d ON r.division_id = d.id
    WHERE r.type IN ('presidential', 'senate', 'house')
      AND (p_year IS NULL OR e.year = p_year)
      AND (p_race_type IS NULL OR r.type = p_race_type)
      AND d.type IN ('national', 'state', 'district')
      AND (v_org_id IS NULL OR e.organization_id = v_org_id);  -- Org filter (NULL = superuser sees all)

    -- Count total rows (candidates across races) for the filtered data
    SELECT COUNT(*)
    INTO v_total_rows
    FROM public.e_race_results rr
    INNER JOIN public.e_candidate_results cr ON cr.race_result_id = rr.id
    INNER JOIN public.e_races r ON r.id = rr.race_id
    INNER JOIN public.e_elections e ON r.election_id = e.id
    INNER JOIN public.e_geographic_divisions d ON r.division_id = d.id
    INNER JOIN public.e_election_data_sources s ON s.election_id = e.id
    WHERE r.type IN ('presidential', 'senate', 'house')
      AND (p_year IS NULL OR e.year = p_year)
      AND (p_race_type IS NULL OR r.type = p_race_type)
      AND d.type IN ('national', 'state', 'district')
      AND s.provider = 'ap'
      AND (v_org_id IS NULL OR e.organization_id = v_org_id);  -- Org filter

    RETURN QUERY
    WITH paginated_races AS (
        -- First, get the distinct races with proper ordering and pagination
        SELECT DISTINCT ON (r.id)
            r.id as the_race_id,
            e.year as the_year,
            r.type as the_type,
            d.type as div_type,
            d.code as the_code,
            d.fips_code as the_fips
        FROM public.e_races r
        INNER JOIN public.e_elections e ON r.election_id = e.id
        INNER JOIN public.e_geographic_divisions d ON r.division_id = d.id
        WHERE r.type IN ('presidential', 'senate', 'house')
          AND (p_year IS NULL OR e.year = p_year)
          AND (p_race_type IS NULL OR r.type = p_race_type)
          AND d.type IN ('national', 'state', 'district')
          AND (v_org_id IS NULL OR e.organization_id = v_org_id)  -- Org filter
        ORDER BY
            r.id,
            e.year DESC,
            r.type,
            CASE WHEN d.type = 'national' THEN '00' ELSE d.code END,
            CASE WHEN d.type = 'district' THEN RIGHT(d.fips_code, 2)::INTEGER ELSE 0 END
    ),
    ordered_races AS (
        SELECT
            pr.the_race_id,
            ROW_NUMBER() OVER (
                ORDER BY
                    pr.the_year DESC,
                    pr.the_type,
                    CASE WHEN pr.div_type = 'national' THEN '00' ELSE pr.the_code END,
                    CASE WHEN pr.div_type = 'district' THEN RIGHT(pr.the_fips, 2)::INTEGER ELSE 0 END
            ) as rn
        FROM paginated_races pr
    ),
    page_races AS (
        SELECT the_race_id
        FROM ordered_races
        WHERE rn > v_offset AND rn <= v_offset + p_page_size
    )
    SELECT
        s.last_fetch_at,
        e.election_id,
        e.id as election_uuid,
        e.name::TEXT as election_name,
        e.year,
        r.id as race_id,
        r.race_id as race_race_id,
        r.name as race_name,
        r.display_name as race_display_name,
        r.office,
        r.type as race_type,
        r.num_elect,
        r.uncontested,
        d.type as division_type,
        d.code as state_code,
        d.fips_code,

        -- Original race result values
        rr.id as race_results_id,
        rr.called,
        rr.called_status,
        rr.percent_reporting,
        rr.last_updated,
        rr.precincts_reporting,
        rr.precincts_total,
        rr.called_timestamp,
        rr.total_votes,

        -- Override values for race results
        rr.called_override,
        rr.called_status_override,
        rr.percent_reporting_override,
        rr.precincts_reporting_override,
        rr.precincts_total_override,
        rr.called_override_timestamp,
        rr.total_votes_override,

        -- Candidate info
        c.candidate_id,
        c.full_name,
        c.first_name,
        c.last_name,
        c.display_name as candidate_display_name,
        p.abbreviation as party_code,
        p.name as party_name,
        p.color_hex as party_color_primary,
        p.color_secondary_hex as party_color_secondary,
        COALESCE((p.color_palette->>'light')::VARCHAR, NULL) as party_color_light,
        COALESCE((p.color_palette->>'dark')::VARCHAR, NULL) as party_color_dark,

        -- Overrides
        COALESCE((p.color_palette->>'primary')::VARCHAR, NULL) as party_color_primary_override,

        -- Additional party fields
        p.short_name as party_short_name,
        p.display_name as party_display_name,
        p.founded_year as party_founded_year,
        p.description as party_description,
        p.ideology as party_ideology,
        p.headquarters_address as party_headquarters,
        p.historical_overview as party_history,
        p.website as party_website,
        p.twitter_handle as party_twitter,
        p.facebook_page as party_facebook,
        p.instagram_handle as party_instagram,
        p.leadership_structure as party_leadership,
        p.policy_priorities as party_abbreviations,
        p.coalition_partners as party_aliases,

        -- Original candidate result values
        cr.id as candidate_results_id,
        cr.votes,
        cr.vote_percentage,
        c.incumbent,
        cr.winner,
        c.photo_url,
        rc.id as race_candidates_id,
        rc.ballot_order,
        rc.withdrew,
        cr.electoral_votes::INTEGER,
        (r.metadata->>'electoral_votes')::INTEGER AS state_electoral_votes,

        -- Additional candidate profile fields
        c.bio,
        c.date_of_birth,
        c.bio_short,
        c.education,
        c.professional_background,
        c.political_experience,
        c.website,

        -- Override values for candidate results
        cr.votes_override,
        cr.vote_percentage_override,
        cr.winner_override,
        cr.electoral_votes_override::INTEGER,

        -- Override values for candidate results
        c.incumbent_override,

        -- Override values for race candidates
        rc.withdrew_override,

        -- Override metadata
        rr.override_at as race_override_at,
        rr.override_by as race_override_by,
        rr.override_reason as race_override_reason,
        cr.override_at as candidate_override_at,
        cr.override_by as candidate_override_by,
        cr.override_reason as candidate_override_reason,

        -- Pagination metadata
        v_total_races,
        v_total_rows

    FROM page_races pr
    INNER JOIN public.e_races r ON r.id = pr.the_race_id
    INNER JOIN public.e_race_results rr ON rr.race_id = r.id
    INNER JOIN public.e_candidate_results cr ON cr.race_result_id = rr.id
    INNER JOIN public.e_candidates c ON c.id = cr.candidate_id
    INNER JOIN public.e_parties p ON p.id = c.party_id
    INNER JOIN public.e_elections e ON r.election_id = e.id
    INNER JOIN public.e_geographic_divisions d ON r.division_id = d.id
    INNER JOIN public.e_election_data_sources s ON s.election_id = e.id
    INNER JOIN public.e_race_candidates rc ON rc.race_id = r.id AND rc.candidate_id = c.id
    WHERE s.provider = 'ap'
    ORDER BY
      e.year DESC,
      r.type,
      CASE
        WHEN d.type = 'national' THEN '00'
        ELSE d.code
      END,
      CASE
        WHEN d.type = 'district' THEN RIGHT(d.fips_code, 2)::INTEGER
        ELSE 0
      END,
      cr.votes DESC;
END;
$$;

-- Set ownership and grant permissions
ALTER FUNCTION public.fetch_election_data_paginated(integer, varchar, integer, integer, uuid) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fetch_election_data_paginated(integer, varchar, integer, integer, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.fetch_election_data_paginated(integer, varchar, integer, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fetch_election_data_paginated(integer, varchar, integer, integer, uuid) TO service_role;

COMMENT ON FUNCTION public.fetch_election_data_paginated(integer, varchar, integer, integer, uuid) IS
'Fetches election data with server-side filtering, pagination, and organization-based access control.
Parameters:
  - p_year: Filter by election year (optional, defaults to all years >= 2012)
  - p_race_type: Filter by race type - "presidential", "senate", or "house" (optional)
  - p_page: Page number (1-indexed, default 1)
  - p_page_size: Number of races per page (default 50)
  - p_effective_org_id: For superuser impersonation - pass the impersonated org ID (optional)
    - If NULL and user is superuser: shows all organizations data
    - If provided and user is superuser: shows only that organizations data
    - If user is not superuser: this parameter is ignored, uses users actual organization
Returns all candidates for races on the requested page, with total_races and total_rows for pagination metadata.';

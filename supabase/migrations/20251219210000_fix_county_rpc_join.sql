-- Fix fetch_county_data_extended RPC to join on race_results.division_id
-- The county-level data is stored in e_race_results.division_id, not e_races.division_id
-- e_races.division_id = state level (for presidential races)
-- e_race_results.division_id = county level (where the county results are stored)

-- First drop the existing function
DROP FUNCTION IF EXISTS public.fetch_county_data_extended(TEXT, INT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION public.fetch_county_data_extended(
  p_race_type TEXT,
  p_year INT,
  p_state TEXT DEFAULT 'all',
  p_offset INT DEFAULT 0,
  p_limit INT DEFAULT 5000
)
RETURNS TABLE (
  votes INT,
  vote_percentage DECIMAL,
  winner BOOLEAN,
  candidate_id TEXT,
  full_name TEXT,
  incumbent BOOLEAN,
  photo_url TEXT,
  party_abbreviation TEXT,
  party_name TEXT,
  color_hex TEXT,
  state_code TEXT,
  fips_code TEXT,
  county_name TEXT,
  election_year INT,
  election_name TEXT,
  percent_reporting DECIMAL,
  division_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
BEGIN
  SET LOCAL statement_timeout = '60s';

  RETURN QUERY
  SELECT
    cr.votes::INT,
    cr.vote_percentage::DECIMAL,
    cr.winner::BOOLEAN,
    c.id::TEXT,
    COALESCE(NULLIF(c.display_name, ''), c.full_name)::TEXT AS full_name,
    COALESCE(c.incumbent_override, c.incumbent)::BOOLEAN AS incumbent,
    c.photo_url::TEXT,
    p.abbreviation::TEXT,
    COALESCE(NULLIF(p.display_name, ''), p.name)::TEXT AS party_name,
    p.color_hex::TEXT,
    -- Get state code from the county's code (first 2 chars) or from parent state
    COALESCE(SUBSTRING(gd_county.code, 1, 2), gd_state.code)::TEXT AS state_code,
    gd_county.fips_code::TEXT,
    gd_county.name::TEXT AS county_name,
    e.year::INT,
    e.name::TEXT,
    rr.percent_reporting::DECIMAL,
    gd_county.id AS division_id
  FROM e_candidate_results_effective cr
  JOIN e_candidates c ON cr.candidate_id = c.id
  JOIN e_parties p ON c.party_id = p.id
  JOIN e_race_results_effective rr ON cr.race_result_id = rr.id
  JOIN e_races r ON rr.race_id = r.id
  -- Join county division from race_results, not races
  JOIN e_geographic_divisions gd_county ON rr.division_id = gd_county.id
  -- Join state division from races for filtering
  JOIN e_geographic_divisions gd_state ON r.division_id = gd_state.id
  JOIN e_elections e ON r.election_id = e.id
  WHERE
    r.type = p_race_type
    AND gd_county.type = 'county'  -- Filter for county-level results
    AND e.year = p_year
    AND (p_state = 'all' OR SUBSTRING(gd_county.code, 1, 2) = p_state OR gd_state.code = p_state)
  ORDER BY cr.id
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.fetch_county_data_extended(TEXT, INT, TEXT, INT, INT) TO anon, authenticated;

-- Add comment
COMMENT ON FUNCTION public.fetch_county_data_extended IS
'Fetches county-level election results. Joins on e_race_results.division_id (county level) instead of e_races.division_id (state level for presidential races).';

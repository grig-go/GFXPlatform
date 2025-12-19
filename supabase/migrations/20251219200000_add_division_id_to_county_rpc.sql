-- Add division_id (UUID) to fetch_county_data_extended RPC
-- This allows the frontend to get the actual UUID for synthetic race creation

-- First drop the existing function (can't change return type with CREATE OR REPLACE)
DROP FUNCTION IF EXISTS public.fetch_county_data_extended(TEXT, INT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS public.fetch_county_data_extended(TEXT, INT, INT, INT);

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
  division_id UUID  -- Added: the actual UUID for the county division
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
    gd.code::TEXT,
    gd.fips_code::TEXT,
    gd.name::TEXT,
    e.year::INT,
    e.name::TEXT,
    rr.percent_reporting::DECIMAL,
    gd.id AS division_id  -- Return the actual UUID
  FROM e_candidate_results_effective cr
  JOIN e_candidates c ON cr.candidate_id = c.id
  JOIN e_parties p ON c.party_id = p.id
  JOIN e_race_results_effective rr ON cr.race_result_id = rr.id
  JOIN e_races r ON rr.race_id = r.id
  JOIN e_geographic_divisions gd ON r.division_id = gd.id
  JOIN e_elections e ON r.election_id = e.id
  WHERE
    r.type = p_race_type
    AND gd.type = 'county'
    AND e.year = p_year
    AND (p_state = 'all' OR SUBSTRING(gd.code, 1, 2) = p_state)
  ORDER BY cr.id
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.fetch_county_data_extended(TEXT, INT, TEXT, INT, INT) TO anon, authenticated;

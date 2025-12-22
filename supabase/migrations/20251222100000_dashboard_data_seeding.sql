-- =============================================
-- Dashboard Data Seeding Functions
-- =============================================
-- These functions allow copying dashboard-specific configuration data
-- from one organization to another (typically from Emergent to new orgs)

-- =============================================
-- 1. WEATHER: Seed weather locations
-- =============================================
-- Copies selected weather locations with their related data
-- weather_location_channels are created automatically via triggers

CREATE OR REPLACE FUNCTION seed_weather_locations(
  p_target_org_id UUID,
  p_location_ids TEXT[]
)
RETURNS JSONB AS $$
DECLARE
  emergent_org_id UUID;
  old_new_map JSONB := '{}';
  old_id TEXT;
  new_id TEXT;
  copied_count INTEGER := 0;
BEGIN
  SELECT id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  IF emergent_org_id IS NULL THEN
    RAISE EXCEPTION 'Emergent organization not found';
  END IF;

  -- For each location, create a copy with new ID
  FOREACH old_id IN ARRAY p_location_ids LOOP
    -- Generate new location ID (text based)
    new_id := 'loc_' || substring(gen_random_uuid()::TEXT, 1, 8);

    INSERT INTO weather_locations (
      id, name, admin1, country, lat, lon, elevation_m,
      station_id, timezone, is_active, custom_name,
      provider_id, provider_name, channel_id, organization_id,
      created_at, updated_at
    )
    SELECT
      new_id, name, admin1, country, lat, lon, elevation_m,
      station_id, timezone, true, custom_name,
      provider_id, provider_name, NULL, p_target_org_id,
      now(), now()
    FROM weather_locations
    WHERE id = old_id AND organization_id = emergent_org_id;

    IF FOUND THEN
      copied_count := copied_count + 1;
      old_new_map := old_new_map || jsonb_build_object(old_id, new_id);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'copied_count', copied_count,
    'id_map', old_new_map
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. FINANCE: Seed stocks/crypto
-- =============================================
-- Copies selected stock symbols to new organization

CREATE OR REPLACE FUNCTION seed_finance_stocks(
  p_target_org_id UUID,
  p_stock_ids UUID[]
)
RETURNS JSONB AS $$
DECLARE
  emergent_org_id UUID;
  copied_count INTEGER;
BEGIN
  SELECT id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  IF emergent_org_id IS NULL THEN
    RAISE EXCEPTION 'Emergent organization not found';
  END IF;

  WITH inserted AS (
    INSERT INTO f_stocks (
      symbol, name, type, exchange, price, change_1d, change_1d_pct,
      change_1w_pct, change_1y_pct, year_high, year_low, chart_1y,
      rating, custom_name, last_update, class, source, source_id,
      volume, logo_url, organization_id, created_at, updated_at
    )
    SELECT
      symbol, name, type, exchange, price, change_1d, change_1d_pct,
      change_1w_pct, change_1y_pct, year_high, year_low, chart_1y,
      rating, custom_name, last_update, class, source, source_id,
      volume, logo_url, p_target_org_id, now(), now()
    FROM f_stocks
    WHERE id = ANY(p_stock_ids) AND organization_id = emergent_org_id
    -- Avoid duplicates by symbol
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO copied_count FROM inserted;

  RETURN jsonb_build_object('copied_count', copied_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. SPORTS: Seed sports leagues with teams
-- =============================================
-- Copies selected leagues and all their associated teams
-- Note: sports_categories, sports_seasons, sports_standings, sports_players
-- are shared/global data and don't have organization_id

CREATE OR REPLACE FUNCTION seed_sports_leagues(
  p_target_org_id UUID,
  p_league_ids UUID[]
)
RETURNS JSONB AS $$
DECLARE
  emergent_org_id UUID;
  old_new_league_map JSONB := '{}';
  old_new_team_map JSONB := '{}';
  league_record RECORD;
  team_record RECORD;
  new_league_id UUID;
  new_team_id UUID;
  league_count INTEGER := 0;
  team_count INTEGER := 0;
BEGIN
  SELECT id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  IF emergent_org_id IS NULL THEN
    RAISE EXCEPTION 'Emergent organization not found';
  END IF;

  -- Copy leagues
  FOR league_record IN
    SELECT * FROM sports_leagues
    WHERE id = ANY(p_league_ids) AND organization_id = emergent_org_id
  LOOP
    new_league_id := gen_random_uuid();

    INSERT INTO sports_leagues (
      id, sportradar_id, sportmonks_id, name, alternative_name,
      short_name, type, gender, sport, category_id, logo_url,
      active, api_source, organization_id, created_at, updated_at
    )
    VALUES (
      new_league_id, league_record.sportradar_id, league_record.sportmonks_id,
      league_record.name, league_record.alternative_name, league_record.short_name,
      league_record.type, league_record.gender, league_record.sport,
      league_record.category_id, league_record.logo_url, true,
      league_record.api_source, p_target_org_id, now(), now()
    );

    league_count := league_count + 1;
    old_new_league_map := old_new_league_map || jsonb_build_object(league_record.id::TEXT, new_league_id::TEXT);

    -- Copy teams that belong to this league (via season_teams or direct association)
    -- First, find teams from sports_season_teams for this league's seasons
    FOR team_record IN
      SELECT DISTINCT t.*
      FROM sports_teams t
      WHERE t.organization_id = emergent_org_id
      AND EXISTS (
        SELECT 1 FROM sports_season_teams st
        JOIN sports_seasons s ON s.id = st.season_id
        WHERE s.league_id = league_record.id AND st.team_id = t.id
      )
    LOOP
      -- Check if we already copied this team
      IF NOT old_new_team_map ? team_record.id::TEXT THEN
        new_team_id := gen_random_uuid();

        INSERT INTO sports_teams (
          id, sportradar_id, sportmonks_id, name, short_name, abbreviation,
          gender, country, country_code, city, venue, founded, logo_url,
          colors, sport, api_source, venue_id, organization_id, created_at, updated_at
        )
        VALUES (
          new_team_id, team_record.sportradar_id, team_record.sportmonks_id,
          team_record.name, team_record.short_name, team_record.abbreviation,
          team_record.gender, team_record.country, team_record.country_code,
          team_record.city, team_record.venue, team_record.founded, team_record.logo_url,
          team_record.colors, team_record.sport, team_record.api_source,
          team_record.venue_id, p_target_org_id, now(), now()
        );

        team_count := team_count + 1;
        old_new_team_map := old_new_team_map || jsonb_build_object(team_record.id::TEXT, new_team_id::TEXT);
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'leagues_copied', league_count,
    'teams_copied', team_count,
    'league_id_map', old_new_league_map,
    'team_id_map', old_new_team_map
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. ELECTIONS: Seed election data sets
-- =============================================
-- Copies an entire election with all its races and candidates
-- This is a complex operation with many related tables

CREATE OR REPLACE FUNCTION seed_elections(
  p_target_org_id UUID,
  p_election_ids UUID[]
)
RETURNS JSONB AS $$
DECLARE
  emergent_org_id UUID;
  election_record RECORD;
  race_record RECORD;
  candidate_record RECORD;
  new_election_id UUID;
  new_race_id UUID;
  new_candidate_id UUID;
  old_new_election_map JSONB := '{}';
  old_new_race_map JSONB := '{}';
  old_new_candidate_map JSONB := '{}';
  election_count INTEGER := 0;
  race_count INTEGER := 0;
  candidate_count INTEGER := 0;
  race_candidate_count INTEGER := 0;
BEGIN
  SELECT id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  IF emergent_org_id IS NULL THEN
    RAISE EXCEPTION 'Emergent organization not found';
  END IF;

  -- Copy elections
  FOR election_record IN
    SELECT * FROM e_elections
    WHERE id = ANY(p_election_ids) AND organization_id = emergent_org_id
  LOOP
    new_election_id := gen_random_uuid();

    INSERT INTO e_elections (
      id, election_id, country_id, name, type, level, election_date,
      registration_deadline, early_voting_start, early_voting_end,
      status, year, cycle, description, metadata, organization_id,
      created_at, updated_at
    )
    VALUES (
      new_election_id, election_record.election_id, election_record.country_id,
      election_record.name, election_record.type, election_record.level,
      election_record.election_date, election_record.registration_deadline,
      election_record.early_voting_start, election_record.early_voting_end,
      election_record.status, election_record.year, election_record.cycle,
      election_record.description, election_record.metadata, p_target_org_id,
      now(), now()
    );

    election_count := election_count + 1;
    old_new_election_map := old_new_election_map || jsonb_build_object(election_record.id::TEXT, new_election_id::TEXT);

    -- Copy races for this election
    FOR race_record IN
      SELECT * FROM e_races
      WHERE election_id = election_record.id AND organization_id = emergent_org_id
    LOOP
      new_race_id := gen_random_uuid();

      INSERT INTO e_races (
        id, race_id, election_id, division_id, name, display_name, short_name,
        type, office, seat_name, term_length_years, num_elect, partisan,
        uncontested, incumbent_party, rating, priority_level, sort_order,
        description, key_issues, historical_context, editorial_notes,
        metadata, ui_config, organization_id, created_at, updated_at
      )
      VALUES (
        new_race_id, race_record.race_id, new_election_id, race_record.division_id,
        race_record.name, race_record.display_name, race_record.short_name,
        race_record.type, race_record.office, race_record.seat_name,
        race_record.term_length_years, race_record.num_elect, race_record.partisan,
        race_record.uncontested, race_record.incumbent_party, race_record.rating,
        race_record.priority_level, race_record.sort_order, race_record.description,
        race_record.key_issues, race_record.historical_context, race_record.editorial_notes,
        race_record.metadata, race_record.ui_config, p_target_org_id, now(), now()
      );

      race_count := race_count + 1;
      old_new_race_map := old_new_race_map || jsonb_build_object(race_record.id::TEXT, new_race_id::TEXT);
    END LOOP;
  END LOOP;

  -- Copy candidates referenced by the copied races
  -- First, collect all candidate IDs from e_race_candidates for our copied races
  FOR candidate_record IN
    SELECT DISTINCT c.*
    FROM e_candidates c
    JOIN e_race_candidates rc ON rc.candidate_id = c.id
    WHERE rc.race_id IN (SELECT (value::TEXT)::UUID FROM jsonb_each_text(old_new_race_map))
    AND c.organization_id = emergent_org_id
  LOOP
    -- Check if we already copied this candidate
    IF NOT old_new_candidate_map ? candidate_record.id::TEXT THEN
      new_candidate_id := gen_random_uuid();

      INSERT INTO e_candidates (
        id, candidate_id, first_name, last_name, full_name, display_name,
        short_name, party_id, incumbent, age, date_of_birth, gender,
        photo_url, photo_thumbnail_url, photo_credit, video_intro_url,
        media_assets, bio, bio_short, website, twitter_handle, facebook_page,
        instagram_handle, youtube_channel, campaign_email, campaign_phone,
        campaign_headquarters_address, education, professional_background,
        political_experience, endorsements, policy_positions, campaign_finance,
        scandals_controversies, metadata, incumbent_override, organization_id,
        created_at, updated_at
      )
      VALUES (
        new_candidate_id, candidate_record.candidate_id, candidate_record.first_name,
        candidate_record.last_name, candidate_record.full_name, candidate_record.display_name,
        candidate_record.short_name, candidate_record.party_id, candidate_record.incumbent,
        candidate_record.age, candidate_record.date_of_birth, candidate_record.gender,
        candidate_record.photo_url, candidate_record.photo_thumbnail_url,
        candidate_record.photo_credit, candidate_record.video_intro_url,
        candidate_record.media_assets, candidate_record.bio, candidate_record.bio_short,
        candidate_record.website, candidate_record.twitter_handle, candidate_record.facebook_page,
        candidate_record.instagram_handle, candidate_record.youtube_channel,
        candidate_record.campaign_email, candidate_record.campaign_phone,
        candidate_record.campaign_headquarters_address, candidate_record.education,
        candidate_record.professional_background, candidate_record.political_experience,
        candidate_record.endorsements, candidate_record.policy_positions,
        candidate_record.campaign_finance, candidate_record.scandals_controversies,
        candidate_record.metadata, candidate_record.incumbent_override, p_target_org_id,
        now(), now()
      );

      candidate_count := candidate_count + 1;
      old_new_candidate_map := old_new_candidate_map || jsonb_build_object(candidate_record.id::TEXT, new_candidate_id::TEXT);
    END IF;
  END LOOP;

  -- Copy race_candidates junction table with new IDs
  INSERT INTO e_race_candidates (race_id, candidate_id, created_at, updated_at)
  SELECT
    (old_new_race_map->>rc.race_id::TEXT)::UUID,
    (old_new_candidate_map->>rc.candidate_id::TEXT)::UUID,
    now(), now()
  FROM e_race_candidates rc
  WHERE rc.race_id IN (SELECT (key::TEXT)::UUID FROM jsonb_each_text(old_new_race_map))
  AND old_new_candidate_map ? rc.candidate_id::TEXT
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS race_candidate_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'elections_copied', election_count,
    'races_copied', race_count,
    'candidates_copied', candidate_count,
    'race_candidates_copied', race_candidate_count,
    'election_id_map', old_new_election_map,
    'race_id_map', old_new_race_map,
    'candidate_id_map', old_new_candidate_map
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. Get available dashboard data for seeding
-- =============================================
-- Returns all seedable dashboard data from Emergent org
-- This is what the UI will display for user selection

CREATE OR REPLACE FUNCTION get_seedable_dashboard_data()
RETURNS JSONB AS $$
DECLARE
  emergent_org_id UUID;
  result JSONB := '{}';
BEGIN
  SELECT id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  IF emergent_org_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Emergent organization not found');
  END IF;

  -- Weather locations
  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'name', COALESCE(custom_name, name),
    'location', CONCAT(name, ', ', admin1, ', ', country),
    'is_active', is_active
  ) ORDER BY name)
  INTO result
  FROM weather_locations
  WHERE organization_id = emergent_org_id;

  result := jsonb_build_object('weather_locations', COALESCE(result, '[]'::jsonb));

  -- Stocks
  SELECT result || jsonb_build_object('stocks', COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'symbol', symbol,
    'name', COALESCE(custom_name, name),
    'type', type,
    'exchange', exchange
  ) ORDER BY symbol), '[]'::jsonb))
  INTO result
  FROM f_stocks
  WHERE organization_id = emergent_org_id;

  -- Sports leagues
  SELECT result || jsonb_build_object('sports_leagues', COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'sport', sport,
    'type', type,
    'active', active
  ) ORDER BY sport, name), '[]'::jsonb))
  INTO result
  FROM sports_leagues
  WHERE organization_id = emergent_org_id;

  -- Elections
  SELECT result || jsonb_build_object('elections', COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'year', year,
    'type', type,
    'level', level,
    'status', status,
    'election_date', election_date
  ) ORDER BY year DESC, name), '[]'::jsonb))
  INTO result
  FROM e_elections
  WHERE organization_id = emergent_org_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. Master seed dashboard data function
-- =============================================
-- Single function that seeds all selected dashboard data

CREATE OR REPLACE FUNCTION seed_dashboard_data(
  p_target_org_id UUID,
  p_dashboard_config JSONB
)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  weather_result JSONB;
  stocks_result JSONB;
  sports_result JSONB;
  elections_result JSONB;
BEGIN
  -- Seed weather locations
  IF p_dashboard_config ? 'weather_locations' AND jsonb_array_length(p_dashboard_config->'weather_locations') > 0 THEN
    SELECT seed_weather_locations(
      p_target_org_id,
      ARRAY(SELECT jsonb_array_elements_text(p_dashboard_config->'weather_locations'))
    ) INTO weather_result;
    result := result || jsonb_build_object('weather', weather_result);
  END IF;

  -- Seed stocks
  IF p_dashboard_config ? 'stocks' AND jsonb_array_length(p_dashboard_config->'stocks') > 0 THEN
    SELECT seed_finance_stocks(
      p_target_org_id,
      ARRAY(SELECT (jsonb_array_elements_text(p_dashboard_config->'stocks'))::UUID)
    ) INTO stocks_result;
    result := result || jsonb_build_object('stocks', stocks_result);
  END IF;

  -- Seed sports leagues
  IF p_dashboard_config ? 'sports_leagues' AND jsonb_array_length(p_dashboard_config->'sports_leagues') > 0 THEN
    SELECT seed_sports_leagues(
      p_target_org_id,
      ARRAY(SELECT (jsonb_array_elements_text(p_dashboard_config->'sports_leagues'))::UUID)
    ) INTO sports_result;
    result := result || jsonb_build_object('sports', sports_result);
  END IF;

  -- Seed elections
  IF p_dashboard_config ? 'elections' AND jsonb_array_length(p_dashboard_config->'elections') > 0 THEN
    SELECT seed_elections(
      p_target_org_id,
      ARRAY(SELECT (jsonb_array_elements_text(p_dashboard_config->'elections'))::UUID)
    ) INTO elections_result;
    result := result || jsonb_build_object('elections', elections_result);
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION seed_weather_locations(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION seed_finance_stocks(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION seed_sports_leagues(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION seed_elections(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_seedable_dashboard_data() TO authenticated;
GRANT EXECUTE ON FUNCTION seed_dashboard_data(UUID, JSONB) TO authenticated;

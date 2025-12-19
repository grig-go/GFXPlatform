-- =====================================================
-- UPDATE e_create_synthetic_race RPC TO ACCEPT GROUP PARAMETER
-- =====================================================

-- Drop and recreate the function with the new parameter
-- Note: This replaces the existing function
CREATE OR REPLACE FUNCTION public.e_create_synthetic_race(
    p_user_id UUID,
    p_base_race_id UUID,
    p_base_election_id UUID,
    p_name VARCHAR,
    p_description TEXT,
    p_scenario_input JSONB,
    p_ai_response JSONB,
    p_office VARCHAR,
    p_state VARCHAR,
    p_district VARCHAR DEFAULT NULL,
    p_summary JSONB DEFAULT NULL,
    p_synthetic_group_id UUID DEFAULT 'a0000000-0000-0000-0000-000000000001'::UUID  -- Default to "Default" group
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_synthetic_race_id UUID;
    v_race_id UUID;
    v_race_result_id UUID;
    v_division_id UUID;
    v_election_id UUID;
    v_candidate_id UUID;
    v_party_id UUID;
    v_candidate_result_id UUID;
    v_race_candidate_id UUID;
    v_base_candidate RECORD;
    v_ai_candidate JSONB;
    v_county_result JSONB;
    v_county_candidate JSONB;
    v_state_code VARCHAR;
    v_county_division_id UUID;
    v_county_race_result_id UUID;
BEGIN
    -- Generate new IDs
    v_synthetic_race_id := gen_random_uuid();
    v_race_id := gen_random_uuid();
    v_race_result_id := gen_random_uuid();
    v_election_id := gen_random_uuid();

    -- Get state code from p_state (might be full name or 2-letter code)
    v_state_code := CASE
        WHEN LENGTH(p_state) = 2 THEN UPPER(p_state)
        ELSE (SELECT code FROM public.e_geographic_divisions WHERE LOWER(name) = LOWER(p_state) AND type = 'state' LIMIT 1)
    END;

    -- If we couldn't find the code, use the state as-is
    IF v_state_code IS NULL THEN
        v_state_code := p_state;
    END IF;

    -- Get division_id for the state
    SELECT id INTO v_division_id
    FROM public.e_geographic_divisions
    WHERE (code = v_state_code OR LOWER(name) = LOWER(p_state))
    AND type = 'state'
    LIMIT 1;

    -- If no state division found and it's national, use national division
    IF v_division_id IS NULL AND LOWER(p_state) IN ('national', 'us', 'usa', 'united states') THEN
        SELECT id INTO v_division_id
        FROM public.e_geographic_divisions
        WHERE type = 'national'
        LIMIT 1;
    END IF;

    -- Create the synthetic race record
    INSERT INTO public.e_synthetic_races (
        id,
        name,
        description,
        base_race_id,
        base_election_id,
        scenario_input,
        ai_response,
        office,
        state,
        district,
        summary,
        created_by,
        synthetic_group_id
    ) VALUES (
        v_synthetic_race_id,
        p_name,
        p_description,
        p_base_race_id,
        p_base_election_id,
        p_scenario_input,
        p_ai_response,
        p_office,
        p_state,
        p_district,
        p_summary,
        p_user_id,
        p_synthetic_group_id
    );

    -- Create a synthetic election record
    INSERT INTO public.e_elections (
        id,
        election_id,
        name,
        type,
        level,
        election_date,
        status,
        metadata
    ) VALUES (
        v_election_id,
        'synthetic_' || v_synthetic_race_id,
        COALESCE(p_name, 'Synthetic Election'),
        'synthetic',
        'state',
        CURRENT_DATE,
        'synthetic',
        jsonb_build_object(
            'synthetic', true,
            'synthetic_race_id', v_synthetic_race_id,
            'base_election_id', p_base_election_id
        )
    );

    -- Create the synthetic race in e_races
    INSERT INTO public.e_races (
        id,
        race_id,
        election_id,
        division_id,
        name,
        display_name,
        type,
        office,
        metadata
    ) VALUES (
        v_race_id,
        'synthetic_' || v_synthetic_race_id,
        v_election_id,
        v_division_id,
        COALESCE(
            p_ai_response->'race'->>'title',
            p_name,
            'Synthetic Race'
        ),
        p_name,
        CASE
            WHEN LOWER(p_office) LIKE '%president%' THEN 'presidential'
            WHEN LOWER(p_office) LIKE '%senate%' OR LOWER(p_office) LIKE '%senator%' THEN 'senate'
            WHEN LOWER(p_office) LIKE '%house%' OR LOWER(p_office) LIKE '%representative%' THEN 'house'
            WHEN LOWER(p_office) LIKE '%governor%' THEN 'governor'
            ELSE 'other'
        END,
        p_office,
        jsonb_build_object(
            'synthetic', true,
            'synthetic_race_id', v_synthetic_race_id,
            'base_race_id', p_base_race_id,
            'electoral_votes', COALESCE((p_ai_response->'race'->>'electoral_votes')::INT, 0),
            'state_code', COALESCE(p_ai_response->'race'->>'state_code', v_state_code)
        )
    );

    -- Create the synthetic race result in e_race_results
    INSERT INTO public.e_race_results (
        id,
        race_id,
        division_id,
        reporting_level,
        precincts_reporting,
        precincts_total,
        percent_reporting,
        total_votes,
        called,
        called_status,
        metadata
    ) VALUES (
        v_race_result_id,
        v_race_id,
        v_division_id,
        'state',
        100,
        100,
        100.00,
        COALESCE((p_ai_response->'race'->>'totalVotes')::INT, 0),
        true,
        'CALLED',
        jsonb_build_object('synthetic', true, 'synthetic_race_id', v_synthetic_race_id)
    );

    -- Process each candidate from AI response
    FOR v_ai_candidate IN SELECT * FROM jsonb_array_elements(p_ai_response->'candidates')
    LOOP
        -- Check if candidate_id is null or starts with 'synthetic_' (indicating a new synthetic candidate)
        IF v_ai_candidate->>'candidate_id' IS NULL OR (v_ai_candidate->>'candidate_id')::TEXT LIKE 'synthetic_%' THEN
            -- Create a new synthetic candidate
            v_candidate_id := gen_random_uuid();

            -- Try to find or create party
            SELECT id INTO v_party_id
            FROM public.e_parties
            WHERE LOWER(abbreviation) = LOWER(COALESCE(v_ai_candidate->>'party', v_ai_candidate->>'candidate_party', 'IND'))
            LIMIT 1;

            -- If no party found, use a default or create one
            IF v_party_id IS NULL THEN
                SELECT id INTO v_party_id FROM public.e_parties WHERE abbreviation = 'IND' LIMIT 1;
            END IF;

            -- Create the candidate
            INSERT INTO public.e_candidates (
                id,
                candidate_id,
                full_name,
                party_id,
                photo_url,
                metadata
            ) VALUES (
                v_candidate_id,
                'synthetic_' || v_candidate_id,
                COALESCE(v_ai_candidate->>'candidate_name', 'Synthetic Candidate'),
                v_party_id,
                v_ai_candidate->>'headshot',
                jsonb_build_object('synthetic', true, 'synthetic_race_id', v_synthetic_race_id)
            );
        ELSE
            -- Use existing candidate ID from e_race_candidates
            v_race_candidate_id := (v_ai_candidate->>'candidate_id')::UUID;

            -- Look up the actual candidate ID from e_race_candidates
            SELECT candidate_id INTO v_candidate_id
            FROM public.e_race_candidates
            WHERE id = v_race_candidate_id;

            -- If not found, the candidate_id might be the actual candidate ID
            IF v_candidate_id IS NULL THEN
                v_candidate_id := v_race_candidate_id;
            END IF;
        END IF;

        -- Generate IDs for junction tables
        v_candidate_result_id := gen_random_uuid();
        v_race_candidate_id := gen_random_uuid();

        -- Create candidate result
        INSERT INTO public.e_candidate_results (
            id,
            race_result_id,
            candidate_id,
            votes,
            vote_percentage,
            electoral_votes,
            winner,
            metadata
        ) VALUES (
            v_candidate_result_id,
            v_race_result_id,
            v_candidate_id,
            COALESCE((v_ai_candidate->'metadata'->>'votes')::INT, 0),
            COALESCE((v_ai_candidate->'metadata'->>'vote_percentage')::DECIMAL, 0),
            COALESCE((v_ai_candidate->'metadata'->>'electoral_votes')::INT, 0),
            COALESCE((v_ai_candidate->'metadata'->>'winner')::BOOLEAN, false),
            jsonb_build_object('synthetic', true, 'synthetic_race_id', v_synthetic_race_id)
        );

        -- Create race candidate junction
        INSERT INTO public.e_race_candidates (
            id,
            race_id,
            candidate_id,
            ballot_order,
            withdrew,
            write_in
        ) VALUES (
            v_race_candidate_id,
            v_race_id,
            v_candidate_id,
            COALESCE((v_ai_candidate->>'ballot_order')::INT, 1),
            COALESCE((v_ai_candidate->>'withdrew')::BOOLEAN, false),
            COALESCE((v_ai_candidate->>'write_in')::BOOLEAN, false)
        );
    END LOOP;

    -- Process county results if present
    FOR v_county_result IN SELECT * FROM jsonb_array_elements(COALESCE(p_ai_response->'county_results', '[]'::jsonb))
    LOOP
        -- Get or create county division
        v_county_division_id := (v_county_result->>'division_id')::UUID;

        IF v_county_division_id IS NOT NULL THEN
            v_county_race_result_id := gen_random_uuid();

            -- Create county-level race result
            INSERT INTO public.e_race_results (
                id,
                race_id,
                division_id,
                reporting_level,
                precincts_reporting,
                precincts_total,
                percent_reporting,
                total_votes,
                called,
                called_status,
                metadata
            ) VALUES (
                v_county_race_result_id,
                v_race_id,
                v_county_division_id,
                'county',
                COALESCE((v_county_result->>'precincts_reporting')::INT, 0),
                COALESCE((v_county_result->>'precincts_total')::INT, 0),
                CASE
                    WHEN (v_county_result->>'precincts_total')::INT > 0
                    THEN ((v_county_result->>'precincts_reporting')::DECIMAL / (v_county_result->>'precincts_total')::DECIMAL) * 100
                    ELSE 100
                END,
                COALESCE((v_county_result->>'total_votes')::INT, 0),
                true,
                'CALLED',
                jsonb_build_object('synthetic', true, 'synthetic_race_id', v_synthetic_race_id)
            ) ON CONFLICT (race_id, division_id, reporting_level) DO UPDATE
            SET total_votes = EXCLUDED.total_votes,
                precincts_reporting = EXCLUDED.precincts_reporting;

            -- Process county candidate results
            FOR v_county_candidate IN SELECT * FROM jsonb_array_elements(v_county_result->'results')
            LOOP
                v_candidate_result_id := gen_random_uuid();

                -- Look up candidate ID
                v_race_candidate_id := (v_county_candidate->>'candidate_id')::UUID;
                SELECT candidate_id INTO v_candidate_id
                FROM public.e_race_candidates
                WHERE id = v_race_candidate_id;

                IF v_candidate_id IS NULL THEN
                    v_candidate_id := v_race_candidate_id;
                END IF;

                -- Create county candidate result
                INSERT INTO public.e_candidate_results (
                    id,
                    race_result_id,
                    candidate_id,
                    votes,
                    vote_percentage,
                    rank,
                    metadata
                ) VALUES (
                    v_candidate_result_id,
                    v_county_race_result_id,
                    v_candidate_id,
                    COALESCE((v_county_candidate->>'votes')::INT, 0),
                    CASE
                        WHEN (v_county_result->>'total_votes')::INT > 0
                        THEN ((v_county_candidate->>'votes')::DECIMAL / (v_county_result->>'total_votes')::DECIMAL) * 100
                        ELSE 0
                    END,
                    COALESCE((v_county_candidate->>'rank')::INT, NULL),
                    jsonb_build_object('synthetic', true, 'synthetic_race_id', v_synthetic_race_id)
                ) ON CONFLICT (race_result_id, candidate_id) DO UPDATE
                SET votes = EXCLUDED.votes,
                    vote_percentage = EXCLUDED.vote_percentage;
            END LOOP;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'synthetic_race_id', v_synthetic_race_id,
        'race_id', v_race_id,
        'election_id', v_election_id,
        'race_result_id', v_race_result_id,
        'group_id', p_synthetic_group_id
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.e_create_synthetic_race(UUID, UUID, UUID, VARCHAR, TEXT, JSONB, JSONB, VARCHAR, VARCHAR, VARCHAR, JSONB, UUID) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.e_create_synthetic_race(UUID, UUID, UUID, VARCHAR, TEXT, JSONB, JSONB, VARCHAR, VARCHAR, VARCHAR, JSONB, UUID) IS
'Creates a synthetic election race with full results data. Accepts a p_synthetic_group_id parameter to organize synthetic races into groups/versions.';

-- Also update e_list_synthetic_races to include group info
CREATE OR REPLACE FUNCTION public.e_list_synthetic_races()
RETURNS TABLE (
    synthetic_race_id UUID,
    name VARCHAR,
    description TEXT,
    office VARCHAR,
    state VARCHAR,
    district VARCHAR,
    group_id UUID,
    group_name VARCHAR,
    created_at TIMESTAMPTZ,
    created_by UUID
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
        sr.created_at,
        sr.created_by
    FROM public.e_synthetic_races sr
    LEFT JOIN public.e_synthetic_groups g ON g.id = sr.synthetic_group_id
    ORDER BY sr.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.e_list_synthetic_races() TO anon, authenticated;

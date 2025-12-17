-- =====================================================
-- ELECTION DATA SCHEMA FOR SUPABASE
-- Supports AP Election Data & International Elections
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geographic data

-- =====================================================
-- CORE ELECTION TABLES
-- =====================================================

-- Countries table for international support
CREATE TABLE IF NOT EXISTS public.e_countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_iso2 VARCHAR(2) UNIQUE NOT NULL,
    code_iso3 VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    official_name VARCHAR(255),
    continent VARCHAR(50),
    region VARCHAR(100),
    subregion VARCHAR(100),
    capital VARCHAR(255),
    population INTEGER,
    area_sq_km NUMERIC,
    timezone_default VARCHAR(50),
    currency_code VARCHAR(3),
    phone_code VARCHAR(10),
    electoral_system JSONB, -- Details about voting system
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Elections master table
CREATE TABLE IF NOT EXISTS public.e_elections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id VARCHAR(255) UNIQUE NOT NULL, -- External ID (e.g., AP Election ID)
    country_id UUID REFERENCES public.e_countries(id),
    name VARCHAR(500) NOT NULL,
    type VARCHAR(100) NOT NULL, -- 'general', 'primary', 'runoff', 'special', 'referendum'
    level VARCHAR(50) NOT NULL, -- 'national', 'state', 'local', 'municipal'
    election_date DATE NOT NULL,
    registration_deadline DATE,
    early_voting_start DATE,
    early_voting_end DATE,
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'active', 'completed', 'certified'
    year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM election_date)) STORED,
    cycle VARCHAR(50), -- '2024', 'midterm', etc.
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Geographic divisions (states, provinces, districts, etc.)
CREATE TABLE IF NOT EXISTS public.e_geographic_divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division_id VARCHAR(255) UNIQUE NOT NULL, -- External ID
    country_id UUID REFERENCES public.e_countries(id),
    parent_division_id UUID REFERENCES public.e_geographic_divisions(id),
    name VARCHAR(500) NOT NULL,
    type VARCHAR(100) NOT NULL, -- 'state', 'province', 'district', 'county', 'municipality', 'precinct'
    code VARCHAR(50),
    fips_code VARCHAR(10), -- US FIPS code if applicable
    population INTEGER,
    registered_voters INTEGER,
    timezone VARCHAR(50),
    geometry GEOMETRY(MultiPolygon, 4326), -- Geographic boundaries
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Races/Contests table with enhanced metadata
CREATE TABLE IF NOT EXISTS public.e_races (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    race_id VARCHAR(255) UNIQUE NOT NULL, -- External ID (e.g., AP Race ID)
    election_id UUID REFERENCES public.e_elections(id) ON DELETE CASCADE,
    division_id UUID REFERENCES public.e_geographic_divisions(id),
    name VARCHAR(500) NOT NULL,
    display_name VARCHAR(500), -- Custom display name for UI
    short_name VARCHAR(255), -- Abbreviated name for space-constrained displays
    type VARCHAR(100) NOT NULL, -- 'presidential', 'senate', 'house', 'governor', 'mayor', 'ballot_measure'
    office VARCHAR(255),
    seat_name VARCHAR(255), -- For numbered seats
    term_length_years INTEGER,
    num_elect INTEGER DEFAULT 1, -- Number of candidates to be elected
    partisan BOOLEAN DEFAULT true,
    uncontested BOOLEAN DEFAULT false,
    incumbent_party VARCHAR(100),
    rating VARCHAR(50), -- 'solid-d', 'lean-d', 'toss-up', 'lean-r', 'solid-r'
    priority_level INTEGER DEFAULT 5, -- 1-10 for UI prominence
    sort_order INTEGER,
    description TEXT, -- Editorial description
    key_issues TEXT[], -- Array of key issues
    historical_context TEXT, -- Historical significance
    editorial_notes TEXT, -- Internal notes
    metadata JSONB DEFAULT '{}'::jsonb,
    ui_config JSONB DEFAULT '{}'::jsonb, -- UI-specific settings (colors, icons, etc.)
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Political parties table with enhanced metadata
CREATE TABLE IF NOT EXISTS public.e_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id VARCHAR(255) UNIQUE NOT NULL,
    country_id UUID REFERENCES public.e_countries(id),
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255), -- Custom display name for UI
    short_name VARCHAR(100), -- Abbreviated name for space-constrained displays
    abbreviation VARCHAR(50), -- Official abbreviation (GOP, DEM, etc.)
    
    -- Visual identity
    color_hex VARCHAR(7), -- Primary color for visualization
    color_secondary_hex VARCHAR(7), -- Secondary color
    color_palette JSONB DEFAULT '[]'::jsonb, -- Array of additional colors
    logo_url VARCHAR(1000),
    logo_thumbnail_url VARCHAR(1000),
    logo_svg TEXT, -- SVG markup for scalable logos
    icon_url VARCHAR(1000), -- Small icon for UI elements
    
    -- Media assets
    header_image_url VARCHAR(1000), -- Banner/header image
    background_image_url VARCHAR(1000),
    media_assets JSONB DEFAULT '[]'::jsonb, -- Array of {type, url, caption, credit}
    
    -- Information
    founded_year VARCHAR(20),
    founded_date DATE,
    headquarters_address TEXT,
    headquarters_city VARCHAR(255),
    headquarters_state VARCHAR(100),
    headquarters_country VARCHAR(100),
    
    -- Political positioning
    ideology VARCHAR(255),
    ideology_detailed TEXT, -- Longer description
    political_position VARCHAR(100), -- 'far-left', 'center-left', 'center', 'center-right', 'far-right'
    political_spectrum_score DECIMAL(3,2), -- -1.00 (far left) to 1.00 (far right)
    policy_priorities TEXT[], -- Key policy areas
    coalition_partners TEXT[], -- Other parties they align with
    
    -- Leadership
    current_leader VARCHAR(500),
    leader_title VARCHAR(255), -- 'Chairman', 'President', etc.
    leadership_structure JSONB DEFAULT '{}'::jsonb, -- Org structure details
    
    -- Contact and social
    website VARCHAR(500),
    email VARCHAR(255),
    phone VARCHAR(50),
    twitter_handle VARCHAR(100),
    facebook_page VARCHAR(255),
    instagram_handle VARCHAR(100),
    youtube_channel VARCHAR(255),
    tiktok_handle VARCHAR(100),
    linkedin_page VARCHAR(255),
    social_media_accounts JSONB DEFAULT '{}'::jsonb, -- Additional platforms
    
    -- Membership and support
    member_count INTEGER,
    registered_voters INTEGER,
    youth_wing_name VARCHAR(255),
    affiliated_organizations JSONB DEFAULT '[]'::jsonb,
    major_donors JSONB DEFAULT '[]'::jsonb, -- Public donor information
    
    -- Electoral history
    last_election_vote_share DECIMAL(5,2),
    seats_held JSONB DEFAULT '{}'::jsonb, -- {senate: 50, house: 210, state_gov: 23}
    electoral_performance JSONB DEFAULT '[]'::jsonb, -- Historical results array
    stronghold_regions TEXT[], -- Geographic areas of strength
    
    -- Status and metadata
    active BOOLEAN DEFAULT true,
    dissolved_date DATE,
    successor_party_id UUID REFERENCES public.e_parties(id),
    predecessor_party_id UUID REFERENCES public.e_parties(id),
    international_affiliation VARCHAR(500), -- E.g., "Socialist International"
    
    -- Editorial content
    description TEXT, -- Public-facing description
    platform_summary TEXT, -- Summary of party platform
    historical_overview TEXT, -- Historical background
    editorial_notes TEXT, -- Internal notes
    controversies TEXT[], -- Notable controversies
    achievements TEXT[], -- Notable achievements
    
    -- UI configuration
    ui_config JSONB DEFAULT '{}'::jsonb, -- UI-specific settings
    display_order INTEGER, -- For sorting in lists
    featured BOOLEAN DEFAULT false, -- For highlighting major parties
    show_in_nav BOOLEAN DEFAULT true, -- Include in navigation menus
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Candidates table with enhanced media and metadata
CREATE TABLE IF NOT EXISTS public.e_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id VARCHAR(255) UNIQUE NOT NULL, -- External ID
    first_name VARCHAR(255),
    last_name VARCHAR(255) NOT NULL,
    full_name VARCHAR(500) NOT NULL,
    display_name VARCHAR(500), -- Custom display name for UI
    short_name VARCHAR(255), -- For space-constrained displays
    party_id UUID REFERENCES public.e_parties(id),
    incumbent BOOLEAN DEFAULT false,
    age INTEGER,
    date_of_birth DATE,
    gender VARCHAR(50),
    
    -- Media fields
    photo_url VARCHAR(1000),
    photo_thumbnail_url VARCHAR(1000),
    photo_credit VARCHAR(500),
    video_intro_url VARCHAR(1000),
    media_assets JSONB DEFAULT '[]'::jsonb, -- Array of {type, url, caption, credit}
    
    -- Contact and social
    bio TEXT,
    bio_short TEXT, -- Short version for previews
    website VARCHAR(500),
    twitter_handle VARCHAR(100),
    facebook_page VARCHAR(255),
    instagram_handle VARCHAR(100),
    youtube_channel VARCHAR(255),
    campaign_email VARCHAR(255),
    campaign_phone VARCHAR(50),
    campaign_headquarters_address TEXT,
    
    -- Additional metadata
    education TEXT[],
    professional_background TEXT[],
    political_experience TEXT[],
    endorsements JSONB DEFAULT '[]'::jsonb, -- Array of {name, organization, date, quote}
    policy_positions JSONB DEFAULT '{}'::jsonb, -- Key policy stances
    campaign_finance JSONB DEFAULT '{}'::jsonb, -- Fundraising data
    scandals_controversies TEXT[],

    -- Override Values
    incumbent_override BOOLEAN,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Race candidates junction table
CREATE TABLE IF NOT EXISTS public.e_race_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    race_id UUID REFERENCES public.e_races(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES public.e_candidates(id) ON DELETE CASCADE,
    ballot_order INTEGER,
    withdrew BOOLEAN DEFAULT false,
    withdrew_date DATE,
    write_in BOOLEAN DEFAULT false,

    -- Override Values
    withdrew_override BOOLEAN,

    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE(race_id, candidate_id)
);

-- =====================================================
-- RESULTS TABLES WITH OVERRIDE SUPPORT
-- =====================================================

-- Race results at various geographic levels
CREATE TABLE IF NOT EXISTS public.e_race_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    race_id UUID REFERENCES public.e_races(id) ON DELETE CASCADE,
    division_id UUID REFERENCES public.e_geographic_divisions(id),
    reporting_level VARCHAR(50) NOT NULL, -- 'national', 'state', 'county', 'precinct'
    
    -- Original values from data source
    precincts_reporting INTEGER DEFAULT 0,
    precincts_total INTEGER,
    percent_reporting DECIMAL(5,2),
    registered_voters INTEGER,
    total_votes INTEGER DEFAULT 0,
    
    -- Override values (NULL means use original)
    precincts_reporting_override INTEGER,
    precincts_total_override INTEGER,
    percent_reporting_override DECIMAL(5,2),
    registered_voters_override INTEGER,
    total_votes_override INTEGER,
    
    -- Call status
    called BOOLEAN DEFAULT false,
    called_status VARCHAR(20), -- 'NOT_CALLED' | 'PROJECTED' | 'CALLED' | 'RECOUNT'
    called_timestamp TIMESTAMPTZ,
    called_by_source VARCHAR(255), -- 'ap', 'reuters', 'manual', etc.    
    called_override BOOLEAN, -- Manual override of the call
    called_status_override VARCHAR(20),
    called_override_timestamp TIMESTAMPTZ,
    called_override_by UUID REFERENCES auth.users(id), -- Who made the override
    
    -- Additional fields
    last_updated TIMESTAMPTZ,
    winner_candidate_id UUID REFERENCES public.e_candidates(id),
    winner_override_candidate_id UUID REFERENCES public.e_candidates(id), -- Manual winner override
    recount_status VARCHAR(50),
    recount_status_override VARCHAR(50),
    
    -- Override metadata
    override_reason TEXT,
    override_by UUID REFERENCES auth.users(id),
    override_at TIMESTAMPTZ,
    override_approved_by UUID REFERENCES auth.users(id),
    override_approved_at TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE(race_id, division_id, reporting_level)
);

-- Candidate results with overrides
CREATE TABLE IF NOT EXISTS public.e_candidate_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    race_result_id UUID REFERENCES public.e_race_results(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES public.e_candidates(id),
    
    -- Original values from data source
    votes INTEGER DEFAULT 0,
    vote_percentage DECIMAL(5,2),
    electoral_votes INTEGER DEFAULT 0,
    
    -- Override values (NULL means use original)
    votes_override INTEGER,
    vote_percentage_override DECIMAL(5,2),
    electoral_votes_override INTEGER,
    
    -- Status fields
    winner BOOLEAN DEFAULT false,
    winner_override BOOLEAN, -- Manual override of winner status
    runoff BOOLEAN DEFAULT false,
    runoff_override BOOLEAN,
    eliminated BOOLEAN DEFAULT false,
    eliminated_override BOOLEAN,
    
    -- Ranked choice voting
    rank INTEGER,
    rank_override INTEGER,
    
    -- Override metadata
    override_reason TEXT,
    override_by UUID REFERENCES auth.users(id),
    override_at TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE(race_result_id, candidate_id)
);

-- Historical results for comparison
CREATE TABLE IF NOT EXISTS public.e_historical_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_year INTEGER NOT NULL,
    country_id UUID REFERENCES public.e_countries(id),
    division_id UUID REFERENCES public.e_geographic_divisions(id),
    race_type VARCHAR(100),
    office VARCHAR(255),
    winning_party VARCHAR(100),
    winning_candidate VARCHAR(500),
    winning_votes INTEGER,
    winning_percentage DECIMAL(5,2),
    turnout_percentage DECIMAL(5,2),
    total_votes INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- =====================================================
-- DATA SOURCE INTEGRATION
-- =====================================================

-- Election data sources configuration (extends your existing data_sources)
CREATE TABLE IF NOT EXISTS public.e_election_data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID REFERENCES public.data_sources(id) ON DELETE CASCADE,
    election_id UUID REFERENCES public.e_elections(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL, -- 'ap', 'reuters', 'national_election_commission', etc.
    feed_type VARCHAR(50) NOT NULL, -- 'results', 'candidates', 'races', 'calls'
    update_frequency_seconds INTEGER DEFAULT 30,
    priority INTEGER DEFAULT 1, -- For handling multiple sources
    active BOOLEAN DEFAULT true,
    last_fetch_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_error TEXT,
    config JSONB DEFAULT '{}'::jsonb, -- Provider-specific configuration
    field_mapping JSONB DEFAULT '{}'::jsonb, -- Maps provider fields to our schema
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE(data_source_id, election_id, provider, feed_type)
);

-- Data ingestion log
CREATE TABLE IF NOT EXISTS public.e_election_data_ingestion_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_data_source_id UUID REFERENCES public.e_election_data_sources(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- 'pending', 'processing', 'success', 'error'
    records_received INTEGER,
    records_processed INTEGER,
    records_updated INTEGER,
    records_failed INTEGER,
    started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    error_message TEXT,
    raw_response JSONB, -- Store raw response for debugging
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- =====================================================
-- OVERRIDE TRACKING AND AUDIT TABLES
-- =====================================================

-- Track all override changes for audit purposes
CREATE TABLE IF NOT EXISTS public.e_election_data_overrides_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(255) NOT NULL,
    record_id UUID NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    original_value TEXT,
    override_value TEXT,
    previous_override_value TEXT,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'approve', 'reject'
    reason TEXT,
    performed_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Media assets management
CREATE TABLE IF NOT EXISTS public.e_media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'candidate', 'race', 'election', 'party'
    entity_id UUID NOT NULL,
    asset_type VARCHAR(50) NOT NULL, -- 'photo', 'video', 'audio', 'document'
    url VARCHAR(1000) NOT NULL,
    thumbnail_url VARCHAR(1000),
    title VARCHAR(500),
    caption TEXT,
    credit VARCHAR(500),
    license VARCHAR(255),
    mime_type VARCHAR(100),
    file_size_bytes BIGINT,
    duration_seconds INTEGER, -- For video/audio
    width INTEGER, -- For images/video
    height INTEGER, -- For images/video
    tags TEXT[],
    is_primary BOOLEAN DEFAULT false,
    display_order INTEGER,
    active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Editorial content and annotations
CREATE TABLE IF NOT EXISTS public.e_election_editorial_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'race', 'candidate', 'election'
    entity_id UUID NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- 'analysis', 'fact_check', 'preview', 'recap'
    title VARCHAR(500),
    content TEXT NOT NULL,
    author VARCHAR(255),
    author_id UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'review', 'published', 'archived'
    published_at TIMESTAMPTZ,
    featured BOOLEAN DEFAULT false,
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Ballot measures/propositions
CREATE TABLE IF NOT EXISTS public.e_ballot_measures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    measure_id VARCHAR(255) UNIQUE NOT NULL,
    election_id UUID REFERENCES public.e_elections(id) ON DELETE CASCADE,
    division_id UUID REFERENCES public.e_geographic_divisions(id),
    number VARCHAR(50), -- Proposition number
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    full_text TEXT,
    type VARCHAR(100), -- 'constitutional_amendment', 'referendum', 'initiative'
    subject VARCHAR(255), -- 'taxes', 'healthcare', 'education', etc.
    fiscal_impact TEXT,
    proponents TEXT,
    opponents TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Ballot measure results
CREATE TABLE IF NOT EXISTS public.e_ballot_measure_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    measure_id UUID REFERENCES public.e_ballot_measures(id) ON DELETE CASCADE,
    division_id UUID REFERENCES public.e_geographic_divisions(id),
    reporting_level VARCHAR(50) NOT NULL,
    yes_votes INTEGER DEFAULT 0,
    no_votes INTEGER DEFAULT 0,
    yes_percentage DECIMAL(5,2),
    no_percentage DECIMAL(5,2),
    passed BOOLEAN,
    precincts_reporting INTEGER DEFAULT 0,
    precincts_total INTEGER,
    percent_reporting DECIMAL(5,2),
    last_updated TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE(measure_id, division_id, reporting_level)
);

-- Exit polls data
CREATE TABLE IF NOT EXISTS public.e_exit_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    race_id UUID REFERENCES public.e_races(id) ON DELETE CASCADE,
    pollster VARCHAR(255) NOT NULL,
    sample_size INTEGER,
    margin_of_error DECIMAL(3,1),
    demographic_group VARCHAR(255),
    demographic_value VARCHAR(255),
    candidate_id UUID REFERENCES public.e_candidates(id),
    support_percentage DECIMAL(5,2),
    collected_date DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.e_ap_call_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    officeid VARCHAR(1),
    subtype VARCHAR(1),
    resultstype VARCHAR(1),
    level VARCHAR(10),
    electiondate VARCHAR(10),
    "nextrequest" TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_elections_date ON public.e_elections(election_date);
CREATE INDEX idx_elections_country ON public.e_elections(country_id);
CREATE INDEX idx_elections_status ON public.e_elections(status);
CREATE INDEX idx_races_election ON public.e_races(election_id);
CREATE INDEX idx_races_division ON public.e_races(division_id);
CREATE INDEX idx_races_priority ON public.e_races(priority_level);
CREATE INDEX idx_race_results_race ON public.e_race_results(race_id);
CREATE INDEX idx_race_results_division ON public.e_race_results(division_id);
CREATE INDEX idx_race_results_updated ON public.e_race_results(last_updated);
CREATE INDEX idx_race_results_override ON public.e_race_results(override_at) WHERE override_at IS NOT NULL;
CREATE INDEX idx_candidate_results_race ON public.e_candidate_results(race_result_id);
CREATE INDEX idx_candidate_results_override ON public.e_candidate_results(override_at) WHERE override_at IS NOT NULL;
CREATE INDEX idx_parties_country ON public.e_parties(country_id);
CREATE INDEX idx_parties_active ON public.e_parties(active) WHERE active = true;
CREATE INDEX idx_parties_featured ON public.e_parties(featured) WHERE featured = true;
CREATE INDEX idx_geographic_divisions_country ON public.e_geographic_divisions(country_id);
CREATE INDEX idx_geographic_divisions_parent ON public.e_geographic_divisions(parent_division_id);
CREATE INDEX idx_election_data_sources_election ON public.e_election_data_sources(election_id);
CREATE INDEX idx_ingestion_log_source ON public.e_election_data_ingestion_log(election_data_source_id);
CREATE INDEX idx_ingestion_log_created ON public.e_election_data_ingestion_log(created_at);
CREATE INDEX idx_media_assets_entity ON public.e_media_assets(entity_type, entity_id);
CREATE INDEX idx_media_assets_primary ON public.e_media_assets(entity_type, entity_id, is_primary) WHERE is_primary = true;
CREATE INDEX idx_editorial_content_entity ON public.e_election_editorial_content(entity_type, entity_id);
CREATE INDEX idx_editorial_content_status ON public.e_election_editorial_content(status);
CREATE INDEX idx_overrides_log_record ON public.e_election_data_overrides_log(table_name, record_id);
CREATE INDEX idx_overrides_log_created ON public.e_election_data_overrides_log(created_at);
CREATE INDEX IF NOT EXISTS idx_race_results_composite 
ON public.e_race_results(race_id, division_id, reporting_level);
CREATE INDEX IF NOT EXISTS idx_candidate_results_composite 
ON public.e_candidate_results(race_result_id, candidate_id);
CREATE INDEX IF NOT EXISTS idx_races_race_id 
ON public.e_races(race_id);
CREATE INDEX IF NOT EXISTS idx_candidates_candidate_id 
ON public.e_candidates(candidate_id);

-- Create an index to optimize the query if not exists
CREATE INDEX IF NOT EXISTS idx_election_data_composite
ON public.e_races(type, election_id);

CREATE INDEX IF NOT EXISTS idx_election_data_sources_provider
ON public.e_election_data_sources(provider, election_id);

-- Geographic index for spatial queries
CREATE INDEX idx_geographic_divisions_geometry ON public.e_geographic_divisions USING GIST(geometry);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.e_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_geographic_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_race_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_race_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_candidate_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_historical_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_election_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_election_data_ingestion_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_ballot_measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_ballot_measure_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_exit_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_election_data_overrides_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_election_editorial_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_ap_call_history ENABLE ROW LEVEL SECURITY;

-- Public read access for election data
CREATE POLICY "Public read access" ON public.e_countries
    FOR SELECT TO public USING (true);

CREATE POLICY "Public read access" ON public.e_parties
    FOR SELECT TO public USING (active = true);

CREATE POLICY "Public update access" ON public.e_parties
    FOR UPDATE TO public USING (true);

CREATE POLICY "Public read access" ON public.e_elections
    FOR SELECT TO public USING (true);

CREATE POLICY "Public read access" ON public.e_races
    FOR SELECT TO public USING (true);

CREATE POLICY "Public update access" ON public.e_races
    FOR UPDATE TO public USING (true);

CREATE POLICY "Public read access" ON public.e_candidates
    FOR SELECT TO public USING (true);

CREATE POLICY "Public update access" ON public.e_candidates
    FOR UPDATE TO public USING (true);

CREATE POLICY "Public read access" ON public.e_race_results
    FOR SELECT TO public USING (true);

CREATE POLICY "Public update access" ON public.e_race_results
    FOR UPDATE TO public USING (true);

CREATE POLICY "Public read access" ON public.e_candidate_results
    FOR SELECT TO public USING (true);

CREATE POLICY "Public update access" ON public.e_candidate_results
    FOR UPDATE TO public USING (true);

CREATE POLICY "Public read access" ON public.e_ballot_measures
    FOR SELECT TO public USING (true);

CREATE POLICY "Public read access" ON public.e_ballot_measure_results
    FOR SELECT TO public USING (true);

CREATE POLICY "Public read access" ON public.e_ap_call_history
    FOR SELECT TO public USING (true);

CREATE POLICY "Public read access" ON public.e_media_assets
    FOR SELECT TO public USING (active = true);

-- Add public read access policy for e_election_data_sources
CREATE POLICY "Public read access" ON public.e_election_data_sources
    FOR SELECT TO public USING (true);

-- Also add public read access for e_geographic_divisions if missing
CREATE POLICY "Public read access" ON public.e_geographic_divisions
    FOR SELECT TO public USING (true);

-- Also add public read access for e_race_candidates if missing
CREATE POLICY "Public read access" ON public.e_race_candidates
    FOR SELECT TO public USING (true);

CREATE POLICY "Public update access" ON public.e_race_candidates
    FOR UPDATE TO public USING (true);

-- Also add public read access for e_exit_polls if missing
CREATE POLICY "Public read access" ON public.e_exit_polls
    FOR SELECT TO public USING (true);

-- Also add public read access for e_historical_results if missing
CREATE POLICY "Public read access" ON public.e_historical_results
    FOR SELECT TO public USING (true);

-- Also add public read access for e_election_data_ingestion_log if needed for monitoring
CREATE POLICY "Public read access" ON public.e_election_data_ingestion_log
    FOR SELECT TO public USING (true);

CREATE POLICY "Public read access" ON public.e_election_editorial_content
    FOR SELECT TO public USING (status = 'published');

-- Authenticated users can manage data sources and overrides
CREATE POLICY "Authenticated users can manage" ON public.e_election_data_sources
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can create overrides" ON public.e_race_results
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can create overrides" ON public.e_candidate_results
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Public users can view override logs" ON public.e_election_data_overrides_log
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Public users can update override logs" ON public.e_election_data_overrides_log
    FOR UPDATE TO public
    USING (true);

CREATE POLICY "Public users can insert override logs" ON public.e_election_data_overrides_log
    FOR INSERT TO public
    with check (true);

CREATE POLICY "Authenticated users can manage media" ON public.e_media_assets
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can manage editorial" ON public.e_election_editorial_content
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- FUNCTIONS AND TRIGGERS WITH OVERRIDE SUPPORT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.e_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_elections_updated_at BEFORE UPDATE ON public.e_elections
    FOR EACH ROW EXECUTE FUNCTION public.e_update_updated_at_column();

CREATE TRIGGER update_races_updated_at BEFORE UPDATE ON public.e_races
    FOR EACH ROW EXECUTE FUNCTION public.e_update_updated_at_column();

CREATE TRIGGER update_parties_updated_at BEFORE UPDATE ON public.e_parties
    FOR EACH ROW EXECUTE FUNCTION public.e_update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON public.e_candidates
    FOR EACH ROW EXECUTE FUNCTION public.e_update_updated_at_column();

CREATE TRIGGER update_race_results_updated_at BEFORE UPDATE ON public.e_race_results
    FOR EACH ROW EXECUTE FUNCTION public.e_update_updated_at_column();

CREATE TRIGGER update_media_assets_updated_at BEFORE UPDATE ON public.e_media_assets
    FOR EACH ROW EXECUTE FUNCTION public.e_update_updated_at_column();

-- Function to get effective value (override or original)
CREATE OR REPLACE FUNCTION public.e_get_effective_value(original_value ANYELEMENT, override_value ANYELEMENT)
RETURNS ANYELEMENT AS $$
BEGIN
    RETURN COALESCE(override_value, original_value);
END;
$$ language 'plpgsql' IMMUTABLE;

-- View to get effective race results with overrides applied
CREATE OR REPLACE VIEW public.e_race_results_effective AS
SELECT 
    id,
    race_id,
    division_id,
    reporting_level,
    public.e_get_effective_value(precincts_reporting, precincts_reporting_override) as precincts_reporting,
    public.e_get_effective_value(precincts_total, precincts_total_override) as precincts_total,
    public.e_get_effective_value(percent_reporting, percent_reporting_override) as percent_reporting,
    public.e_get_effective_value(registered_voters, registered_voters_override) as registered_voters,
    public.e_get_effective_value(total_votes, total_votes_override) as total_votes,
    public.e_get_effective_value(called, called_override) as called,
    public.e_get_effective_value(called_status, called_status_override) as called_status,
    CASE 
        WHEN called_override IS NOT NULL THEN called_override_timestamp
        ELSE called_timestamp
    END as called_timestamp,
    public.e_get_effective_value(winner_candidate_id, winner_override_candidate_id) as winner_candidate_id,
    public.e_get_effective_value(recount_status, recount_status_override) as recount_status,
    last_updated,
    metadata,
    created_at,
    updated_at,
    -- Include override metadata
    CASE WHEN override_at IS NOT NULL THEN
        jsonb_build_object(
            'has_override', true,
            'override_by', override_by,
            'override_at', override_at,
            'override_reason', override_reason,
            'approved_by', override_approved_by,
            'approved_at', override_approved_at
        )
    ELSE
        jsonb_build_object('has_override', false)
    END as override_info
FROM public.e_race_results;

-- View to get effective candidate results with overrides applied
CREATE OR REPLACE VIEW public.e_candidate_results_effective AS
SELECT 
    id,
    race_result_id,
    candidate_id,
    public.e_get_effective_value(votes, votes_override) as votes,
    public.e_get_effective_value(vote_percentage, vote_percentage_override) as vote_percentage,
    public.e_get_effective_value(electoral_votes, electoral_votes_override) as electoral_votes,
    public.e_get_effective_value(winner, winner_override) as winner,
    public.e_get_effective_value(runoff, runoff_override) as runoff,
    public.e_get_effective_value(eliminated, eliminated_override) as eliminated,
    public.e_get_effective_value(rank, rank_override) as rank,
    metadata,
    created_at,
    updated_at,
    -- Include override metadata
    CASE WHEN override_at IS NOT NULL THEN
        jsonb_build_object(
            'has_override', true,
            'override_by', override_by,
            'override_at', override_at,
            'override_reason', override_reason
        )
    ELSE
        jsonb_build_object('has_override', false)
    END as override_info
FROM public.e_candidate_results;

-- Function to log override changes
CREATE OR REPLACE FUNCTION public.e_log_override_change()
RETURNS TRIGGER AS $$
DECLARE
    changed_fields JSONB = '{}';
    field_name TEXT;
    old_val TEXT;
    new_val TEXT;
BEGIN
    -- Check each override field for changes
    IF TG_TABLE_NAME = 'e_race_results' THEN
        -- Check each override field
        IF OLD.precincts_reporting_override IS DISTINCT FROM NEW.precincts_reporting_override THEN
            INSERT INTO e_election_data_overrides_log (
                table_name, record_id, field_name,
                original_value, override_value, previous_override_value,
                action, reason, performed_by, created_at
            ) VALUES (
                TG_TABLE_NAME, NEW.id, 'precincts_reporting',
                OLD.precincts_reporting::TEXT,
                NEW.precincts_reporting_override::TEXT,
                OLD.precincts_reporting_override::TEXT,
                CASE WHEN OLD.precincts_reporting_override IS NULL THEN 'create' ELSE 'update' END,
                NEW.override_reason,
                NEW.override_by,
                NOW()
            );
        END IF;
        
        -- Repeat for other override fields...
        -- (You can add similar checks for all override fields)
        
    ELSIF TG_TABLE_NAME = 'e_candidate_results' THEN
        -- Similar logic for candidate_results overrides
        IF OLD.votes_override IS DISTINCT FROM NEW.votes_override THEN
            INSERT INTO e_election_data_overrides_log (
                table_name, record_id, field_name,
                original_value, override_value, previous_override_value,
                action, reason, performed_by, created_at
            ) VALUES (
                TG_TABLE_NAME, NEW.id, 'votes',
                OLD.votes::TEXT,
                NEW.votes_override::TEXT,
                OLD.votes_override::TEXT,
                CASE WHEN OLD.votes_override IS NULL THEN 'create' ELSE 'update' END,
                NEW.override_reason,
                NEW.override_by,
                NOW()
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for override logging
CREATE TRIGGER log_race_results_overrides
    AFTER UPDATE ON public.e_race_results
    FOR EACH ROW
    WHEN (
        OLD.precincts_reporting_override IS DISTINCT FROM NEW.precincts_reporting_override OR
        OLD.precincts_total_override IS DISTINCT FROM NEW.precincts_total_override OR
        OLD.percent_reporting_override IS DISTINCT FROM NEW.percent_reporting_override OR
        OLD.total_votes_override IS DISTINCT FROM NEW.total_votes_override OR
        OLD.called_override IS DISTINCT FROM NEW.called_override OR
        OLD.called_status_override IS DISTINCT FROM NEW.called_status_override OR
        OLD.winner_override_candidate_id IS DISTINCT FROM NEW.winner_override_candidate_id
    )
    EXECUTE FUNCTION public.e_log_override_change();

CREATE TRIGGER log_candidate_results_overrides
    AFTER UPDATE ON public.e_candidate_results
    FOR EACH ROW
    WHEN (
        OLD.votes_override IS DISTINCT FROM NEW.votes_override OR
        OLD.vote_percentage_override IS DISTINCT FROM NEW.vote_percentage_override OR
        OLD.electoral_votes_override IS DISTINCT FROM NEW.electoral_votes_override OR
        OLD.winner_override IS DISTINCT FROM NEW.winner_override
    )
    EXECUTE FUNCTION public.e_log_override_change();

-- Function to calculate vote percentages with override support
CREATE OR REPLACE FUNCTION public.e_calculate_vote_percentages()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if this isn't already a percentage update
    IF TG_OP = 'UPDATE' AND 
       OLD.votes = NEW.votes AND 
       OLD.vote_percentage != NEW.vote_percentage THEN
        RETURN NEW; -- Skip if only percentage changed
    END IF;
    
    -- Update total votes in race_results using effective values
    UPDATE public.e_race_results
    SET total_votes = (
        SELECT SUM(COALESCE(votes_override, votes))
        FROM e_candidate_results
        WHERE race_result_id = NEW.race_result_id
    )
    WHERE id = NEW.race_result_id 
    AND total_votes_override IS NULL;
    
    -- Update percentages for all candidates EXCEPT the current one
    -- to avoid recursion
    UPDATE public.e_candidate_results
    SET vote_percentage = CASE 
        WHEN (
            SELECT COALESCE(total_votes_override, total_votes) 
            FROM e_race_results 
            WHERE id = race_result_id
        ) > 0
        THEN ROUND(
            (COALESCE(votes_override, votes)::DECIMAL / 
            (SELECT COALESCE(total_votes_override, total_votes) 
             FROM e_race_results 
             WHERE id = race_result_id)) * 100, 2
        )
        ELSE 0
    END
    WHERE race_result_id = NEW.race_result_id 
    AND id != NEW.id  -- Don't update the row that triggered this
    AND vote_percentage_override IS NULL;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

--(take too long to run)
--CREATE TRIGGER update_vote_percentages 
    --AFTER INSERT OR UPDATE ON public.e_candidate_results
    --FOR EACH ROW EXECUTE FUNCTION public.e_calculate_vote_percentages();

-- =====================================================
-- PARTY-RELATED FUNCTIONS
-- =====================================================

-- Function to merge duplicate parties
CREATE OR REPLACE FUNCTION public.e_merge_parties(
    source_party_id UUID,
    target_party_id UUID,
    update_references BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    candidates_updated INTEGER := 0;
    merged_data JSONB;
BEGIN
    -- Merge metadata and arrays from source into target
    UPDATE public.e_parties 
    SET 
        media_assets = target.media_assets || source.media_assets,
        policy_priorities = array_distinct(target.policy_priorities || source.policy_priorities),
        coalition_partners = array_distinct(target.coalition_partners || source.coalition_partners),
        affiliated_organizations = target.affiliated_organizations || source.affiliated_organizations,
        electoral_performance = target.electoral_performance || source.electoral_performance,
        metadata = target.metadata || source.metadata,
        updated_at = NOW()
    FROM parties source, parties target
    WHERE source.id = source_party_id 
    AND target.id = target_party_id
    AND parties.id = target_party_id;
    
    -- Update references if requested
    IF update_references THEN
        UPDATE public.e_candidates 
        SET party_id = target_party_id 
        WHERE party_id = source_party_id;
        
        GET DIAGNOSTICS candidates_updated = ROW_COUNT;
    END IF;
    
    -- Mark source party as inactive
    UPDATE public.e_parties 
    SET 
        active = false,
        successor_party_id = target_party_id,
        updated_at = NOW()
    WHERE id = source_party_id;
    
    -- Return result summary
    result := jsonb_build_object(
        'success', true,
        'source_party_id', source_party_id,
        'target_party_id', target_party_id,
        'candidates_updated', candidates_updated,
        'timestamp', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate party strength by region
CREATE OR REPLACE FUNCTION public.e_calculate_party_strength(
    p_party_id UUID,
    p_election_id UUID DEFAULT NULL
)
RETURNS TABLE(
    division_id UUID,
    division_name VARCHAR,
    total_races INTEGER,
    races_won INTEGER,
    win_percentage DECIMAL,
    avg_vote_share DECIMAL,
    total_votes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH party_results AS (
        SELECT 
            rr.division_id,
            gd.name as division_name,
            COUNT(DISTINCT r.id) as total_races,
            COUNT(DISTINCT CASE 
                WHEN cr.winner OR cr.winner_override THEN r.id 
            END) as races_won,
            AVG(COALESCE(cr.vote_percentage_override, cr.vote_percentage)) as avg_vote_share,
            SUM(COALESCE(cr.votes_override, cr.votes)) as total_votes
        FROM public.e_candidate_results cr
        JOIN public.e_candidates c ON cr.candidate_id = c.id
        JOIN public.e_race_results rr ON cr.race_result_id = rr.id
        JOIN public.e_races r ON rr.race_id = r.id
        JOIN public.e_geographic_divisions gd ON rr.division_id = gd.id
        WHERE c.party_id = p_party_id
        AND (p_election_id IS NULL OR r.election_id = p_election_id)
        GROUP BY rr.division_id, gd.name
    )
    SELECT 
        pr.division_id,
        pr.division_name,
        pr.total_races::INTEGER,
        pr.races_won::INTEGER,
        ROUND((pr.races_won::DECIMAL / NULLIF(pr.total_races, 0)) * 100, 2) as win_percentage,
        ROUND(pr.avg_vote_share, 2) as avg_vote_share,
        pr.total_votes
    FROM public.e_party_results pr
    ORDER BY win_percentage DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fetch_presidential_national_data_extended(
  p_year INT
)
RETURNS TABLE (
  votes INT,
  vote_percentage DECIMAL,
  electoral_votes INT,
  winner BOOLEAN,
  candidate_id TEXT,
  full_name TEXT,
  incumbent BOOLEAN,
  photo_url TEXT,
  party_abbreviation TEXT,
  party_name TEXT,
  color_hex TEXT,
  state_code TEXT,
  state_name TEXT,
  state_type TEXT,
  election_year INT,
  election_name TEXT,
  state_electoral_votes INT,
  race_metadata JSONB,
  percent_reporting DECIMAL
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
    cr.electoral_votes::INT,
    cr.winner::BOOLEAN,
    c.id::TEXT,
    COALESCE(NULLIF(c.display_name, ''), c.full_name)::TEXT AS full_name,
    COALESCE(c.incumbent_override, c.incumbent)::BOOLEAN AS incumbent,
    c.photo_url::TEXT,
    p.abbreviation::TEXT,
    COALESCE(NULLIF(p.display_name, ''), p.name)::TEXT AS party_name,
    p.color_hex::TEXT,
    gd.code::TEXT,
    gd.name::TEXT,
    gd.type::TEXT,
    e.year::INT,
    e.name::TEXT,
    COALESCE((r.metadata->>'electoral_votes')::INT, 0) as state_electoral_votes,
    r.metadata,
    rr.percent_reporting
  FROM e_candidate_results_effective cr
  JOIN e_candidates c ON cr.candidate_id = c.id
  JOIN e_parties p ON c.party_id = p.id
  JOIN e_race_results_effective rr ON cr.race_result_id = rr.id
  JOIN e_races r ON rr.race_id = r.id
  JOIN e_geographic_divisions gd ON r.division_id = gd.id
  JOIN e_elections e ON r.election_id = e.id
  WHERE 
    r.type = 'presidential'
    AND gd.type = 'national'
    AND e.year = p_year
    AND p.abbreviation IN ('GOP', 'Dem')
  ORDER BY 
    gd.code ASC,  -- Sort by state code
    cr.votes DESC; -- Then by votes descending
END;
$$;

CREATE OR REPLACE FUNCTION fetch_presidential_state_data_extended(
  p_year INT
)
RETURNS TABLE (
  votes INT,
  vote_percentage DECIMAL,
  electoral_votes INT,
  winner BOOLEAN,
  candidate_id TEXT,
  full_name TEXT,
  incumbent BOOLEAN,
  photo_url TEXT,
  party_abbreviation TEXT,
  party_name TEXT,
  color_hex TEXT,
  state_code TEXT,
  state_name TEXT,
  state_type TEXT,
  election_year INT,
  election_name TEXT,
  state_electoral_votes INT,
  race_metadata JSONB,
  percent_reporting DECIMAL
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
    cr.electoral_votes::INT,
    cr.winner::BOOLEAN,
    c.id::TEXT,
    COALESCE(NULLIF(c.display_name, ''), c.full_name)::TEXT AS full_name,
    COALESCE(c.incumbent_override, c.incumbent)::BOOLEAN AS incumbent,
    c.photo_url::TEXT,
    p.abbreviation::TEXT,
    COALESCE(NULLIF(p.display_name, ''), p.name)::TEXT AS party_name,
    p.color_hex::TEXT,
    gd.code::TEXT,
    gd.name::TEXT,
    gd.type::TEXT,
    e.year::INT,
    e.name::TEXT,
    COALESCE((r.metadata->>'electoral_votes')::INT, 0) as state_electoral_votes,
    r.metadata,
    rr.percent_reporting
  FROM e_candidate_results_effective cr
  JOIN e_candidates c ON cr.candidate_id = c.id
  JOIN e_parties p ON c.party_id = p.id
  JOIN e_race_results_effective rr ON cr.race_result_id = rr.id
  JOIN e_races r ON rr.race_id = r.id
  JOIN e_geographic_divisions gd ON r.division_id = gd.id
  JOIN e_elections e ON r.election_id = e.id
  WHERE 
    r.type = 'presidential'
    AND gd.type = 'state'
    AND e.year = p_year
    AND p.abbreviation IN ('GOP', 'Dem')
  ORDER BY 
    gd.code ASC,  -- Sort by state code
    cr.votes DESC; -- Then by votes descending
END;
$$;

CREATE OR REPLACE FUNCTION fetch_senate_state_data_extended(
  p_year INT
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
  state_name TEXT,
  state_type TEXT,
  election_year INT,
  election_name TEXT,
  race_metadata JSONB,
  percent_reporting DECIMAL
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
    gd.name::TEXT,
    gd.type::TEXT,
    e.year::INT,
    e.name::TEXT,
    r.metadata,
    rr.percent_reporting
  FROM e_candidate_results_effective cr
  JOIN e_candidates c ON cr.candidate_id = c.id
  JOIN e_parties p ON c.party_id = p.id
  JOIN e_race_results_effective rr ON cr.race_result_id = rr.id
  JOIN e_races r ON rr.race_id = r.id
  JOIN e_geographic_divisions gd ON r.division_id = gd.id
  JOIN e_elections e ON r.election_id = e.id
  WHERE 
    r.type = 'senate'
    AND gd.type = 'state'
    AND e.year = p_year
  ORDER BY 
    gd.code ASC,  -- Sort by state code
    cr.votes DESC; -- Then by votes descending
END;
$$;

CREATE OR REPLACE FUNCTION fetch_county_data_extended(
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
  percent_reporting DECIMAL
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
    rr.percent_reporting::DECIMAL
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

CREATE OR REPLACE FUNCTION fetch_house_district_data_extended(
  p_year INT,
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
  fips_code TEXT,
  state_code TEXT,
  district_name TEXT,
  election_year INT,
  election_name TEXT,
  percent_reporting DECIMAL
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
    gd.fips_code::TEXT,
    gd.code::TEXT,
    gd.name::TEXT,
    e.year::INT,
    e.name::TEXT,
    rr.percent_reporting::DECIMAL
  FROM e_candidate_results_effective cr
  JOIN e_candidates c ON cr.candidate_id = c.id
  JOIN e_parties p ON c.party_id = p.id
  JOIN e_race_results_effective rr ON cr.race_result_id = rr.id
  JOIN e_races r ON rr.race_id = r.id
  JOIN e_geographic_divisions gd ON r.division_id = gd.id
  JOIN e_elections e ON r.election_id = e.id
  WHERE 
    r.type = 'house'
    AND gd.type = 'district'
    AND e.year = p_year
  ORDER BY cr.id
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- UPDATE RPC FUNCTION TO INCLUDE OVERRIDE FIELDS
-- =====================================================

CREATE OR REPLACE FUNCTION public.fetch_election_data_for_ui(p_year INTEGER DEFAULT NULL)
RETURNS TABLE (
    -- Election source info
    last_fetch_at TIMESTAMPTZ,

    -- Election info
    election_id VARCHAR,
    election_name TEXT,
    year INTEGER,

    -- Race info
    race_id UUID,
    race_race_id VARCHAR,
    race_name VARCHAR,
    race_display_name VARCHAR,
    office VARCHAR,
    race_type VARCHAR,
    num_elect INTEGER,
    uncontested BOOLEAN,

    -- Geographic info
    division_type VARCHAR,
    state_code VARCHAR,
    fips_code VARCHAR,

    -- Race results info
    race_results_id UUID,
    called BOOLEAN,
    called_status VARCHAR,
    percent_reporting DECIMAL,
    last_updated TIMESTAMPTZ,
    precincts_reporting INTEGER,
    precincts_total INTEGER,
    called_timestamp TIMESTAMPTZ,
    total_votes INTEGER,

    -- Override fields for race results
    called_override BOOLEAN,
    called_status_override VARCHAR,
    percent_reporting_override DECIMAL,
    precincts_reporting_override INTEGER,
    precincts_total_override INTEGER,
    called_override_timestamp TIMESTAMPTZ,
    total_votes_override INTEGER,

    -- Candidate info
    candidate_id VARCHAR,
    full_name VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    candidate_display_name VARCHAR,
    party_code VARCHAR,
    party_name VARCHAR,
    party_color_primary VARCHAR,
    party_color_secondary VARCHAR,
    party_color_light VARCHAR,
    party_color_dark VARCHAR,

    -- Overrides
    party_color_primary_override VARCHAR,

    -- Additional party fields
    party_short_name VARCHAR,
    party_display_name VARCHAR,
    party_founded_year VARCHAR,
    party_description TEXT,
    party_ideology VARCHAR,
    party_headquarters TEXT,
    party_history TEXT,
    party_website VARCHAR,
    party_twitter VARCHAR,
    party_facebook VARCHAR,
    party_instagram VARCHAR,
    party_leadership JSONB,
    party_abbreviations TEXT[],
    party_aliases TEXT[],
    candidate_results_id UUID,
    votes INTEGER,
    vote_percentage DECIMAL,
    incumbent BOOLEAN,
    winner BOOLEAN,
    photo_url VARCHAR,
    race_candidates_id UUID,
    ballot_order INTEGER,
    withdrew BOOLEAN,
    electoral_votes INTEGER,
    state_electoral_votes INTEGER,

    -- Additional candidate profile fields
    bio TEXT,
    date_of_birth DATE,
    bio_short TEXT,
    education TEXT[],
    professional_background TEXT[],
    political_experience TEXT[],
    website VARCHAR,

    -- Override fields for candidate results
    votes_override INTEGER,
    vote_percentage_override DECIMAL,
    winner_override BOOLEAN,
    electoral_votes_override INTEGER,

    -- Override fields for candidate results
    incumbent_override BOOLEAN,

    -- Override fields for race candidates
    withdrew_override BOOLEAN,

    -- Override metadata
    race_override_at TIMESTAMPTZ,
    race_override_by UUID,
    race_override_reason TEXT,
    candidate_override_at TIMESTAMPTZ,
    candidate_override_by UUID,
    candidate_override_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.last_fetch_at,
        e.election_id,
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
        cr.override_reason as candidate_override_reason

    FROM public.e_race_results rr
    INNER JOIN public.e_candidate_results cr ON cr.race_result_id = rr.id
    INNER JOIN public.e_candidates c ON c.id = cr.candidate_id
    INNER JOIN public.e_parties p ON p.id = c.party_id
    INNER JOIN public.e_races r ON r.id = rr.race_id
    INNER JOIN public.e_elections e ON r.election_id = e.id
    INNER JOIN public.e_geographic_divisions d ON r.division_id = d.id
    INNER JOIN public.e_election_data_sources s ON s.election_id = e.id
    INNER JOIN public.e_race_candidates rc ON rc.race_id = r.id AND rc.candidate_id = c.id
    WHERE r.type IN ('presidential', 'senate', 'house')
      AND (p_year IS NULL AND e.year >= 2012 OR p_year IS NOT NULL AND e.year = p_year)
      AND d.type IN ('national', 'state', 'district')
      AND s.provider = 'ap'
    ORDER BY
      e.year DESC,
      r.type,
      CASE
        WHEN d.type = 'national' THEN '00' -- National always first
        ELSE d.code
      END,
      CASE
        WHEN d.type = 'district' THEN RIGHT(d.fips_code, 2)::INTEGER -- Order districts by number
        ELSE 0
      END,
      cr.votes DESC;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.fetch_election_data_for_ui(INTEGER) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.fetch_election_data_for_ui(INTEGER) IS
'Fetches election data including override fields for UI display. Returns both original and override values for supported fields.';

-- =====================================================
-- RPC FUNCTION FOR API DATA ACCESS
-- =====================================================

CREATE OR REPLACE FUNCTION public.fetch_election_data_for_api(
    p_year INTEGER DEFAULT NULL,
    p_race_type VARCHAR DEFAULT NULL,
    p_level VARCHAR DEFAULT NULL,
    p_state VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    -- Election source info
    last_fetch_at TIMESTAMPTZ,

    -- Election info
    election_id VARCHAR,
    election_name TEXT,
    year INTEGER,

    -- Race info
    race_id UUID,
    race_race_id VARCHAR,
    race_name VARCHAR,
    race_display_name VARCHAR,
    office VARCHAR,
    race_type VARCHAR,
    num_elect INTEGER,
    uncontested BOOLEAN,

    -- Geographic info
    division_type VARCHAR,
    state_code VARCHAR,
    fips_code VARCHAR,

    -- Race results info (with overrides applied)
    race_results_id UUID,
    called BOOLEAN,
    called_status VARCHAR,
    percent_reporting DECIMAL,
    last_updated TIMESTAMPTZ,
    precincts_reporting INTEGER,
    precincts_total INTEGER,
    called_timestamp TIMESTAMPTZ,
    total_votes INTEGER,

    -- Candidate info
    candidate_id VARCHAR,
    full_name VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    candidate_display_name VARCHAR,
    party_code VARCHAR,
    party_name VARCHAR,
    party_color_primary VARCHAR,
    party_color_secondary VARCHAR,
    party_color_light VARCHAR,
    party_color_dark VARCHAR,

    -- Additional party fields
    party_short_name VARCHAR,
    party_display_name VARCHAR,
    party_founded_year VARCHAR,
    party_description TEXT,
    party_ideology VARCHAR,
    party_headquarters TEXT,
    party_history TEXT,
    party_website VARCHAR,
    party_twitter VARCHAR,
    party_facebook VARCHAR,
    party_instagram VARCHAR,
    party_leadership JSONB,
    party_abbreviations TEXT[],
    party_aliases TEXT[],

    -- Candidate results (with overrides applied)
    candidate_results_id UUID,
    votes INTEGER,
    vote_percentage DECIMAL,
    incumbent BOOLEAN,
    winner BOOLEAN,
    photo_url VARCHAR,
    race_candidates_id UUID,
    ballot_order INTEGER,
    withdrew BOOLEAN,
    electoral_votes INTEGER,
    state_electoral_votes INTEGER,

    -- Additional candidate profile fields
    bio TEXT,
    date_of_birth DATE,
    bio_short TEXT,
    education TEXT[],
    professional_background TEXT[],
    political_experience TEXT[],
    website VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.last_fetch_at,
        e.election_id,
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

        -- Race result values (using effective view with overrides applied)
        rr.id as race_results_id,
        rre.called,
        rre.called_status,
        rre.percent_reporting,
        rr.last_updated,
        rre.precincts_reporting,
        rre.precincts_total,
        rre.called_timestamp,
        rre.total_votes,

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

        -- Candidate result values (using effective view with overrides applied)
        cr.id as candidate_results_id,
        cre.votes,
        cre.vote_percentage,
        COALESCE(c.incumbent_override, c.incumbent) as incumbent,
        cre.winner,
        c.photo_url,
        rc.id as race_candidates_id,
        rc.ballot_order,
        COALESCE(rc.withdrew_override, rc.withdrew) as withdrew,
        cre.electoral_votes::INTEGER,
        (r.metadata->>'electoral_votes')::INTEGER AS state_electoral_votes,

        -- Additional candidate profile fields
        c.bio,
        c.date_of_birth,
        c.bio_short,
        c.education,
        c.professional_background,
        c.political_experience,
        c.website

    FROM public.e_race_results rr
    INNER JOIN public.e_race_results_effective rre ON rre.id = rr.id
    INNER JOIN public.e_candidate_results cr ON cr.race_result_id = rr.id
    INNER JOIN public.e_candidate_results_effective cre ON cre.id = cr.id
    INNER JOIN public.e_candidates c ON c.id = cr.candidate_id
    INNER JOIN public.e_parties p ON p.id = c.party_id
    INNER JOIN public.e_races r ON r.id = rr.race_id
    INNER JOIN public.e_elections e ON r.election_id = e.id
    INNER JOIN public.e_geographic_divisions d ON r.division_id = d.id
    INNER JOIN public.e_election_data_sources s ON s.election_id = e.id
    INNER JOIN public.e_race_candidates rc ON rc.race_id = r.id AND rc.candidate_id = c.id
    WHERE s.provider = 'ap'
      AND (p_year IS NULL OR e.year = p_year)
      AND (p_race_type IS NULL OR r.type = p_race_type)
      AND (p_level IS NULL OR d.type = p_level)
      AND (
        p_state IS NULL
        OR p_state = 'all'
        OR (
          -- For state-level divisions, match the state code directly
          (d.type = 'state' AND d.code = p_state)
          -- For district-level divisions (House races), match the first 2 characters of the code
          OR (d.type = 'district' AND LEFT(d.code, 2) = p_state)
          -- For county-level divisions, match the state code portion
          OR (d.type = 'county' AND LEFT(d.code, 2) = p_state)
        )
      )
    ORDER BY
      e.year DESC,
      r.type,
      CASE
        WHEN d.type = 'national' THEN '00'
        ELSE d.code
      END,
      CASE
        WHEN d.type = 'district' THEN LPAD(RIGHT(d.fips_code, 2), 10, '0')
        WHEN d.type = 'county' THEN LPAD(d.fips_code, 10, '0')
        ELSE '0000000000'
      END,
      cre.votes DESC;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.fetch_election_data_for_api(INTEGER, VARCHAR, VARCHAR, VARCHAR) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.fetch_election_data_for_api(INTEGER, VARCHAR, VARCHAR, VARCHAR) IS
'Fetches election data for API consumers with optional filters for year, race_type (presidential, senate, house), level (national, state, district, county), and state (two-letter state code or "all"). Returns data with all overrides already applied.';

-- =====================================================
-- RPC FUNCTION FOR BALANCE OF POWER DATA
-- =====================================================

CREATE OR REPLACE FUNCTION public.fetch_bop_data(
    p_election_year INTEGER DEFAULT NULL,
    p_race_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    election_year INTEGER,
    race_type VARCHAR,
    party_name VARCHAR,
    won INTEGER,
    "leading" INTEGER,
    holdovers INTEGER,
    winning_trend INTEGER,
    current_seats INTEGER,
    insufficient_vote INTEGER,
    total_seats INTEGER -- calculated field
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '10s'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.election_year,
        r.race_type,
        p.party_name,
        p.won,
        p.leading,
        p.holdovers,
        p.winning_trend,
        p.current_seats,
        p.insufficient_vote,
        -- Calculate total seats (for majority calculation)
        CASE
            WHEN r.race_type = 'senate' THEN 100
            WHEN r.race_type = 'house' THEN 435
            ELSE 0
        END as total_seats
    FROM public.bop_party_results p
    INNER JOIN public.bop_election_results r ON r.id = p.election_result_id
    WHERE
        (p_election_year IS NULL OR r.election_year = p_election_year)
        AND (p_race_type IS NULL OR r.race_type = p_race_type)
    ORDER BY r.election_year DESC, r.race_type, p.party_name;
END;
$$;


-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.fetch_bop_data(INTEGER, VARCHAR) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.fetch_bop_data(INTEGER, VARCHAR) IS
'Fetches Balance of Power data for specified election year and race type. Returns party seat counts and trends.';

-- =====================================================
-- SAMPLE DATA FOR AP ELECTION INTEGRATION
-- =====================================================

-- Insert USA as a country
INSERT INTO public.e_countries (code_iso2, code_iso3, name, official_name, electoral_system) 
VALUES (
    'US', 
    'USA', 
    'United States', 
    'United States of America',
    '{"type": "electoral_college", "total_electors": 538, "winner_threshold": 270}'
) ON CONFLICT (code_iso2) DO NOTHING;

-- Sample AP data source configuration
INSERT INTO public.data_sources (
    name, 
    type, 
    active,
    api_config,
    metadata
) VALUES (
    'AP Election API',
    'api',
    true,
    '{
        "base_url": "https://api.ap.org/v2/elections",
        "auth_type": "api_key",
        "auth_header": "X-API-Key",
        "rate_limit": 100,
        "timeout": 30
    }'::jsonb,
    '{"provider": "associated_press", "version": "2.0"}'::jsonb
) ON CONFLICT DO NOTHING;

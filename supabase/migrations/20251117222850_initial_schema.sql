create extension if not exists "citext" with schema "public";

create extension if not exists "http" with schema "public";

create extension if not exists "pg_net" with schema "public";

create extension if not exists "postgis" with schema "public";

create type "public"."ai_injector_feature" as enum ('outliers', 'summary', 'correlation', 'sentiment', 'fullscreen');

create type "public"."map_style_type" as enum ('light', 'dark', 'satellite');

create type "public"."projection_type" as enum ('mercator', 'globe', 'equirectangular');

create sequence "public"."bop_election_results_id_seq";

create sequence "public"."bop_insufficient_vote_details_id_seq";

create sequence "public"."bop_net_changes_id_seq";

create sequence "public"."bop_party_results_id_seq";

create sequence "public"."debug_log_id_seq";

create sequence "public"."file_sync_queue_id_seq";

create sequence "public"."sync_queue_id_seq";

create sequence "public"."weather_air_quality_id_seq";

create sequence "public"."weather_current_id_seq";

create sequence "public"."weather_daily_forecast_id_seq";

create sequence "public"."weather_hourly_forecast_id_seq";

create sequence "public"."weather_ingest_config_id_seq";


  create table "public"."agent_runs" (
    "id" uuid not null default gen_random_uuid(),
    "agent_id" uuid not null,
    "status" text not null,
    "started_at" timestamp with time zone default now(),
    "completed_at" timestamp with time zone,
    "duration_ms" integer,
    "logs" jsonb,
    "error_message" text,
    "results" jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."agent_runs" enable row level security;


  create table "public"."agents" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "agent_type" text not null,
    "status" text not null default 'PAUSED'::text,
    "schedule" text,
    "configuration" jsonb not null,
    "last_run" timestamp with time zone,
    "next_run" timestamp with time zone,
    "run_count" integer default 0,
    "error_count" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."agents" enable row level security;


  create table "public"."ai_insights_elections" (
    "id" uuid not null default gen_random_uuid(),
    "insight" text not null,
    "category" text,
    "topic" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."ai_insights_elections" enable row level security;


  create table "public"."ai_insights_finance" (
    "id" uuid not null default gen_random_uuid(),
    "topic" text not null,
    "insight" text not null,
    "category" text default 'all'::text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."ai_insights_finance" enable row level security;


  create table "public"."ai_insights_news" (
    "id" uuid not null default gen_random_uuid(),
    "topic" text not null,
    "insight" text not null,
    "category" text default 'general'::text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."ai_insights_school_closing" (
    "id" uuid not null default gen_random_uuid(),
    "topic" text not null,
    "insight" text not null,
    "category" text default 'general'::text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."ai_insights_weather" (
    "id" uuid not null default gen_random_uuid(),
    "insight" text not null,
    "category" text not null default 'general'::text,
    "topic" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."ai_insights_weather" enable row level security;


  create table "public"."ai_prompt_injectors" (
    "id" uuid not null default gen_random_uuid(),
    "feature" public.ai_injector_feature not null,
    "is_enabled" boolean not null default true,
    "model" text,
    "provider_id" uuid,
    "prompt_template" text,
    "params" jsonb not null default '{}'::jsonb,
    "version" integer not null default 1,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."ai_prompt_injectors" enable row level security;


  create table "public"."ai_providers" (
    "id" text not null,
    "name" text not null,
    "provider_name" text not null,
    "type" text not null,
    "description" text,
    "api_key" text not null,
    "api_secret" text,
    "endpoint" text,
    "model" text,
    "available_models" jsonb default '[]'::jsonb,
    "enabled" boolean default true,
    "rate_limit_per_minute" integer default 60,
    "max_tokens" integer default 4096,
    "temperature" numeric(3,2) default 0.7,
    "top_p" numeric(3,2) default 1.0,
    "dashboard_assignments" jsonb default '[]'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."ai_providers" enable row level security;


  create table "public"."api_access_logs" (
    "id" uuid not null default gen_random_uuid(),
    "endpoint_id" uuid,
    "request_method" character varying(10),
    "request_path" text,
    "request_params" jsonb,
    "request_headers" jsonb,
    "response_status" integer,
    "response_time_ms" integer,
    "response_size_bytes" integer,
    "client_ip" inet,
    "user_agent" text,
    "error_message" text,
    "created_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."api_access_logs" enable row level security;


  create table "public"."api_documentation" (
    "id" uuid not null default gen_random_uuid(),
    "endpoint_id" uuid,
    "openapi_spec" jsonb,
    "markdown_docs" text,
    "examples" jsonb default '[]'::jsonb,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."api_documentation" enable row level security;


  create table "public"."api_endpoint_sources" (
    "id" uuid not null default gen_random_uuid(),
    "endpoint_id" uuid,
    "data_source_id" uuid,
    "is_primary" boolean default false,
    "join_config" jsonb default '{}'::jsonb,
    "filter_config" jsonb default '{}'::jsonb,
    "sort_order" integer default 0,
    "created_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."api_endpoint_sources" enable row level security;


  create table "public"."api_endpoints" (
    "id" uuid not null default gen_random_uuid(),
    "name" character varying(255) not null,
    "slug" character varying(255) not null,
    "description" text,
    "output_format" character varying(50),
    "schema_config" jsonb default '{}'::jsonb,
    "transform_config" jsonb default '{}'::jsonb,
    "relationship_config" jsonb default '{}'::jsonb,
    "cache_config" jsonb default '{"ttl": 300, "enabled": false}'::jsonb,
    "auth_config" jsonb default '{"type": "none", "required": false}'::jsonb,
    "rate_limit_config" jsonb default '{"enabled": false, "requests_per_minute": 60}'::jsonb,
    "active" boolean default true,
    "user_id" uuid,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now()),
    "is_draft" boolean default false,
    "sample_data" jsonb
      );


alter table "public"."api_endpoints" enable row level security;


  create table "public"."applications" (
    "id" uuid not null default gen_random_uuid(),
    "app_key" text not null,
    "name" text not null,
    "description" text,
    "icon_url" text,
    "app_url" text,
    "is_active" boolean not null default true,
    "sort_order" integer not null default 100,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."bop_election_results" (
    "id" integer not null default nextval('public.bop_election_results_id_seq'::regclass),
    "office" character varying(50) not null,
    "office_type_code" character varying(10),
    "race_type" character varying(20) not null,
    "election_year" integer not null,
    "is_test" boolean default false,
    "timestamp" timestamp with time zone not null,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP
      );


alter table "public"."bop_election_results" enable row level security;


  create table "public"."bop_insufficient_vote_details" (
    "id" integer not null default nextval('public.bop_insufficient_vote_details_id_seq'::regclass),
    "election_result_id" integer not null,
    "dem_open" integer not null default 0,
    "gop_open" integer not null default 0,
    "oth_open" integer not null default 0,
    "dem_incumbent" integer not null default 0,
    "gop_incumbent" integer not null default 0,
    "oth_incumbent" integer not null default 0,
    "total" integer not null default 0
      );


alter table "public"."bop_insufficient_vote_details" enable row level security;


  create table "public"."bop_net_changes" (
    "id" integer not null default nextval('public.bop_net_changes_id_seq'::regclass),
    "party_result_id" integer not null,
    "winners_change" integer not null default 0,
    "leaders_change" integer not null default 0
      );


alter table "public"."bop_net_changes" enable row level security;


  create table "public"."bop_party_results" (
    "id" integer not null default nextval('public.bop_party_results_id_seq'::regclass),
    "election_result_id" integer not null,
    "party_name" character varying(50) not null,
    "won" integer not null default 0,
    "leading" integer not null default 0,
    "holdovers" integer not null default 0,
    "winning_trend" integer not null default 0,
    "current_seats" integer not null default 0,
    "insufficient_vote" integer not null default 0
      );


alter table "public"."bop_party_results" enable row level security;


  create table "public"."channel_playlists" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "type" text not null,
    "active" boolean default true,
    "schedule" json,
    "parent_id" uuid,
    "user_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "order" integer not null default 0,
    "content_id" uuid,
    "display_name" text,
    "carousel_name" text,
    "carousel_type" text,
    "channel_id" uuid
      );


alter table "public"."channel_playlists" enable row level security;


  create table "public"."channels" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "type" text,
    "config" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "active" boolean
      );


alter table "public"."channels" enable row level security;


  create table "public"."content" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "type" text not null,
    "active" boolean default true,
    "schedule" json,
    "parent_id" uuid,
    "user_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "order" integer not null default 0,
    "template_id" uuid,
    "display_name" text,
    "duration" bigint,
    "data_source_id" uuid,
    "source_row_id" text,
    "source_row_hash" text,
    "bucket_config" jsonb,
    "config" jsonb,
    "widget_type" character varying(50),
    "connection_settings" jsonb,
    "rcp_presets" jsonb,
    "rcp_fields" jsonb
      );


alter table "public"."content" enable row level security;


  create table "public"."customer_dashboards" (
    "id" uuid not null default gen_random_uuid(),
    "customer_id" uuid,
    "deployment_id" uuid,
    "dashboard_id" text not null,
    "name" text,
    "visible" boolean default true,
    "order_index" integer default 0,
    "access_level" text default 'read'::text,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."data_providers" (
    "id" text not null,
    "type" text not null,
    "category" text not null,
    "name" text not null,
    "description" text,
    "is_active" boolean not null default false,
    "api_key" text,
    "api_secret" text,
    "base_url" text,
    "api_version" text,
    "config" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "source_url" text,
    "storage_path" text,
    "refresh_interval_minutes" integer default 15,
    "last_run" timestamp with time zone
      );


alter table "public"."data_providers" enable row level security;


  create table "public"."data_source_sync_logs" (
    "id" uuid not null default gen_random_uuid(),
    "data_source_id" uuid,
    "started_at" timestamp with time zone default now(),
    "completed_at" timestamp with time zone,
    "status" text not null,
    "items_processed" integer default 0,
    "error_message" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."data_source_sync_logs" enable row level security;


  create table "public"."data_sources" (
    "id" uuid not null default gen_random_uuid(),
    "name" character varying(255) not null,
    "type" character varying(50) not null,
    "active" boolean default true,
    "user_id" uuid,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now()),
    "file_config" jsonb default '{}'::jsonb,
    "sync_config" jsonb default '{}'::jsonb,
    "template_mapping" jsonb default '{}'::jsonb,
    "last_sync_at" timestamp with time zone,
    "next_sync_at" timestamp with time zone,
    "sync_status" text default 'idle'::text,
    "last_sync_error" text,
    "last_sync_count" integer default 0,
    "last_sync_result" jsonb,
    "database_config" jsonb default '{}'::jsonb,
    "api_config" jsonb,
    "rss_config" jsonb,
    "category" character varying(100),
    "metadata" jsonb default '{}'::jsonb
      );


alter table "public"."data_sources" enable row level security;


  create table "public"."debug_log" (
    "id" integer not null default nextval('public.debug_log_id_seq'::regclass),
    "created_at" timestamp with time zone default now(),
    "function_name" text,
    "message" text,
    "data" jsonb
      );



  create table "public"."e_ap_call_history" (
    "id" uuid not null default gen_random_uuid(),
    "officeid" character varying(1),
    "subtype" character varying(1),
    "resultstype" character varying(1),
    "level" character varying(10),
    "electiondate" character varying(10),
    "nextrequest" text,
    "created_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."e_ap_call_history" enable row level security;


  create table "public"."e_ballot_measure_results" (
    "id" uuid not null default gen_random_uuid(),
    "measure_id" uuid,
    "division_id" uuid,
    "reporting_level" character varying(50) not null,
    "yes_votes" integer default 0,
    "no_votes" integer default 0,
    "yes_percentage" numeric(5,2),
    "no_percentage" numeric(5,2),
    "passed" boolean,
    "precincts_reporting" integer default 0,
    "precincts_total" integer,
    "percent_reporting" numeric(5,2),
    "last_updated" timestamp with time zone,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."e_ballot_measure_results" enable row level security;


  create table "public"."e_ballot_measures" (
    "id" uuid not null default gen_random_uuid(),
    "measure_id" character varying(255) not null,
    "election_id" uuid,
    "division_id" uuid,
    "number" character varying(50),
    "title" character varying(500) not null,
    "summary" text,
    "full_text" text,
    "type" character varying(100),
    "subject" character varying(255),
    "fiscal_impact" text,
    "proponents" text,
    "opponents" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."e_ballot_measures" enable row level security;


  create table "public"."e_candidate_results" (
    "id" uuid not null default gen_random_uuid(),
    "race_result_id" uuid,
    "candidate_id" uuid,
    "votes" integer default 0,
    "vote_percentage" numeric(5,2),
    "electoral_votes" integer default 0,
    "votes_override" integer,
    "vote_percentage_override" numeric(5,2),
    "electoral_votes_override" integer,
    "winner" boolean default false,
    "winner_override" boolean,
    "runoff" boolean default false,
    "runoff_override" boolean,
    "eliminated" boolean default false,
    "eliminated_override" boolean,
    "rank" integer,
    "rank_override" integer,
    "override_reason" text,
    "override_by" uuid,
    "override_at" timestamp with time zone,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."e_candidate_results" enable row level security;


  create table "public"."e_candidates" (
    "id" uuid not null default gen_random_uuid(),
    "candidate_id" character varying(255) not null,
    "first_name" character varying(255),
    "last_name" character varying(255) not null,
    "full_name" character varying(500) not null,
    "display_name" character varying(500),
    "short_name" character varying(255),
    "party_id" uuid,
    "incumbent" boolean default false,
    "age" integer,
    "date_of_birth" date,
    "gender" character varying(50),
    "photo_url" character varying(1000),
    "photo_thumbnail_url" character varying(1000),
    "photo_credit" character varying(500),
    "video_intro_url" character varying(1000),
    "media_assets" jsonb default '[]'::jsonb,
    "bio" text,
    "bio_short" text,
    "website" character varying(500),
    "twitter_handle" character varying(100),
    "facebook_page" character varying(255),
    "instagram_handle" character varying(100),
    "youtube_channel" character varying(255),
    "campaign_email" character varying(255),
    "campaign_phone" character varying(50),
    "campaign_headquarters_address" text,
    "education" text[],
    "professional_background" text[],
    "political_experience" text[],
    "endorsements" jsonb default '[]'::jsonb,
    "policy_positions" jsonb default '{}'::jsonb,
    "campaign_finance" jsonb default '{}'::jsonb,
    "scandals_controversies" text[],
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now()),
    "incumbent_override" boolean
      );


alter table "public"."e_candidates" enable row level security;


  create table "public"."e_countries" (
    "id" uuid not null default gen_random_uuid(),
    "code_iso2" character varying(2) not null,
    "code_iso3" character varying(3) not null,
    "name" character varying(255) not null,
    "official_name" character varying(255),
    "continent" character varying(50),
    "region" character varying(100),
    "subregion" character varying(100),
    "capital" character varying(255),
    "population" integer,
    "area_sq_km" numeric,
    "timezone_default" character varying(50),
    "currency_code" character varying(3),
    "phone_code" character varying(10),
    "electoral_system" jsonb,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."e_countries" enable row level security;


  create table "public"."e_election_data_ingestion_log" (
    "id" uuid not null default gen_random_uuid(),
    "election_data_source_id" uuid,
    "status" character varying(50) not null,
    "records_received" integer,
    "records_processed" integer,
    "records_updated" integer,
    "records_failed" integer,
    "started_at" timestamp with time zone default timezone('utc'::text, now()),
    "completed_at" timestamp with time zone,
    "duration_ms" integer,
    "error_message" text,
    "raw_response" jsonb,
    "created_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."e_election_data_ingestion_log" enable row level security;


  create table "public"."e_election_data_overrides_log" (
    "id" uuid not null default gen_random_uuid(),
    "table_name" character varying(255) not null,
    "record_id" uuid not null,
    "field_name" character varying(255) not null,
    "original_value" text,
    "override_value" text,
    "previous_override_value" text,
    "action" character varying(50) not null,
    "reason" text,
    "performed_by" uuid,
    "approved_by" uuid,
    "approved_at" timestamp with time zone,
    "rejection_reason" text,
    "created_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."e_election_data_overrides_log" enable row level security;


  create table "public"."e_election_data_sources" (
    "id" uuid not null default gen_random_uuid(),
    "data_source_id" uuid,
    "election_id" uuid,
    "provider" character varying(100) not null,
    "feed_type" character varying(50) not null,
    "update_frequency_seconds" integer default 30,
    "priority" integer default 1,
    "active" boolean default true,
    "last_fetch_at" timestamp with time zone,
    "last_success_at" timestamp with time zone,
    "last_error" text,
    "config" jsonb default '{}'::jsonb,
    "field_mapping" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."e_election_data_sources" enable row level security;


  create table "public"."e_election_editorial_content" (
    "id" uuid not null default gen_random_uuid(),
    "entity_type" character varying(50) not null,
    "entity_id" uuid not null,
    "content_type" character varying(50) not null,
    "title" character varying(500),
    "content" text not null,
    "author" character varying(255),
    "author_id" uuid,
    "status" character varying(50) default 'draft'::character varying,
    "published_at" timestamp with time zone,
    "featured" boolean default false,
    "tags" text[],
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."e_election_editorial_content" enable row level security;


  create table "public"."e_elections" (
    "id" uuid not null default gen_random_uuid(),
    "election_id" character varying(255) not null,
    "country_id" uuid,
    "name" character varying(500) not null,
    "type" character varying(100) not null,
    "level" character varying(50) not null,
    "election_date" date not null,
    "registration_deadline" date,
    "early_voting_start" date,
    "early_voting_end" date,
    "status" character varying(50) default 'scheduled'::character varying,
    "year" integer generated always as (EXTRACT(year FROM election_date)) stored,
    "cycle" character varying(50),
    "description" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."e_elections" enable row level security;


  create table "public"."e_exit_polls" (
    "id" uuid not null default gen_random_uuid(),
    "race_id" uuid,
    "pollster" character varying(255) not null,
    "sample_size" integer,
    "margin_of_error" numeric(3,1),
    "demographic_group" character varying(255),
    "demographic_value" character varying(255),
    "candidate_id" uuid,
    "support_percentage" numeric(5,2),
    "collected_date" date,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."e_exit_polls" enable row level security;


  create table "public"."e_geographic_divisions" (
    "id" uuid not null default gen_random_uuid(),
    "division_id" character varying(255) not null,
    "country_id" uuid,
    "parent_division_id" uuid,
    "name" character varying(500) not null,
    "type" character varying(100) not null,
    "code" character varying(50),
    "fips_code" character varying(10),
    "population" integer,
    "registered_voters" integer,
    "timezone" character varying(50),
    "geometry" public.geometry(MultiPolygon,4326),
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."e_geographic_divisions" enable row level security;


  create table "public"."e_historical_results" (
    "id" uuid not null default gen_random_uuid(),
    "election_year" integer not null,
    "country_id" uuid,
    "division_id" uuid,
    "race_type" character varying(100),
    "office" character varying(255),
    "winning_party" character varying(100),
    "winning_candidate" character varying(500),
    "winning_votes" integer,
    "winning_percentage" numeric(5,2),
    "turnout_percentage" numeric(5,2),
    "total_votes" integer,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."e_historical_results" enable row level security;


  create table "public"."e_media_assets" (
    "id" uuid not null default gen_random_uuid(),
    "entity_type" character varying(50) not null,
    "entity_id" uuid not null,
    "asset_type" character varying(50) not null,
    "url" character varying(1000) not null,
    "thumbnail_url" character varying(1000),
    "title" character varying(500),
    "caption" text,
    "credit" character varying(500),
    "license" character varying(255),
    "mime_type" character varying(100),
    "file_size_bytes" bigint,
    "duration_seconds" integer,
    "width" integer,
    "height" integer,
    "tags" text[],
    "is_primary" boolean default false,
    "display_order" integer,
    "active" boolean default true,
    "metadata" jsonb default '{}'::jsonb,
    "uploaded_by" uuid,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."e_media_assets" enable row level security;


  create table "public"."e_parties" (
    "id" uuid not null default gen_random_uuid(),
    "party_id" character varying(255) not null,
    "country_id" uuid,
    "name" character varying(255) not null,
    "display_name" character varying(255),
    "short_name" character varying(100),
    "abbreviation" character varying(50),
    "color_hex" character varying(7),
    "color_secondary_hex" character varying(7),
    "color_palette" jsonb default '[]'::jsonb,
    "logo_url" character varying(1000),
    "logo_thumbnail_url" character varying(1000),
    "logo_svg" text,
    "icon_url" character varying(1000),
    "header_image_url" character varying(1000),
    "background_image_url" character varying(1000),
    "media_assets" jsonb default '[]'::jsonb,
    "founded_year" character varying(20),
    "founded_date" date,
    "headquarters_address" text,
    "headquarters_city" character varying(255),
    "headquarters_state" character varying(100),
    "headquarters_country" character varying(100),
    "ideology" character varying(255),
    "ideology_detailed" text,
    "political_position" character varying(100),
    "political_spectrum_score" numeric(3,2),
    "policy_priorities" text[],
    "coalition_partners" text[],
    "current_leader" character varying(500),
    "leader_title" character varying(255),
    "leadership_structure" jsonb default '{}'::jsonb,
    "website" character varying(500),
    "email" character varying(255),
    "phone" character varying(50),
    "twitter_handle" character varying(100),
    "facebook_page" character varying(255),
    "instagram_handle" character varying(100),
    "youtube_channel" character varying(255),
    "tiktok_handle" character varying(100),
    "linkedin_page" character varying(255),
    "social_media_accounts" jsonb default '{}'::jsonb,
    "member_count" integer,
    "registered_voters" integer,
    "youth_wing_name" character varying(255),
    "affiliated_organizations" jsonb default '[]'::jsonb,
    "major_donors" jsonb default '[]'::jsonb,
    "last_election_vote_share" numeric(5,2),
    "seats_held" jsonb default '{}'::jsonb,
    "electoral_performance" jsonb default '[]'::jsonb,
    "stronghold_regions" text[],
    "active" boolean default true,
    "dissolved_date" date,
    "successor_party_id" uuid,
    "predecessor_party_id" uuid,
    "international_affiliation" character varying(500),
    "description" text,
    "platform_summary" text,
    "historical_overview" text,
    "editorial_notes" text,
    "controversies" text[],
    "achievements" text[],
    "ui_config" jsonb default '{}'::jsonb,
    "display_order" integer,
    "featured" boolean default false,
    "show_in_nav" boolean default true,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now()),
    "color_light_hex" character varying(7),
    "color_dark_hex" character varying(7)
      );


alter table "public"."e_parties" enable row level security;


  create table "public"."e_race_candidates" (
    "id" uuid not null default gen_random_uuid(),
    "race_id" uuid,
    "candidate_id" uuid,
    "ballot_order" integer,
    "withdrew" boolean default false,
    "withdrew_date" date,
    "write_in" boolean default false,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "withdrew_override" boolean
      );


alter table "public"."e_race_candidates" enable row level security;


  create table "public"."e_race_results" (
    "id" uuid not null default gen_random_uuid(),
    "race_id" uuid,
    "division_id" uuid,
    "reporting_level" character varying(50) not null,
    "precincts_reporting" integer default 0,
    "precincts_total" integer,
    "percent_reporting" numeric(5,2),
    "registered_voters" integer,
    "total_votes" integer default 0,
    "precincts_reporting_override" integer,
    "precincts_total_override" integer,
    "percent_reporting_override" numeric(5,2),
    "registered_voters_override" integer,
    "total_votes_override" integer,
    "called" boolean default false,
    "called_timestamp" timestamp with time zone,
    "called_by_source" character varying(255),
    "called_override" boolean,
    "called_override_timestamp" timestamp with time zone,
    "called_override_by" uuid,
    "last_updated" timestamp with time zone,
    "winner_candidate_id" uuid,
    "winner_override_candidate_id" uuid,
    "recount_status" character varying(50),
    "recount_status_override" character varying(50),
    "override_reason" text,
    "override_by" uuid,
    "override_at" timestamp with time zone,
    "override_approved_by" uuid,
    "override_approved_at" timestamp with time zone,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now()),
    "called_status_override" character varying(20),
    "called_status" character varying(20)
      );


alter table "public"."e_race_results" enable row level security;


  create table "public"."e_races" (
    "id" uuid not null default gen_random_uuid(),
    "race_id" character varying(255) not null,
    "election_id" uuid,
    "division_id" uuid,
    "name" character varying(500) not null,
    "display_name" character varying(500),
    "short_name" character varying(255),
    "type" character varying(100) not null,
    "office" character varying(255),
    "seat_name" character varying(255),
    "term_length_years" integer,
    "num_elect" integer default 1,
    "partisan" boolean default true,
    "uncontested" boolean default false,
    "incumbent_party" character varying(100),
    "rating" character varying(50),
    "priority_level" integer default 5,
    "sort_order" integer,
    "description" text,
    "key_issues" text[],
    "historical_context" text,
    "editorial_notes" text,
    "metadata" jsonb default '{}'::jsonb,
    "ui_config" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."e_races" enable row level security;


  create table "public"."f_stocks" (
    "id" uuid not null default gen_random_uuid(),
    "symbol" text not null,
    "name" text not null,
    "type" text not null,
    "exchange" text,
    "price" numeric(12,4),
    "change_1d" numeric(12,4),
    "change_1d_pct" numeric(8,4),
    "change_1w_pct" numeric(8,4),
    "change_1y_pct" numeric(8,4),
    "year_high" numeric(12,4),
    "year_low" numeric(12,4),
    "chart_1y" jsonb,
    "rating" jsonb,
    "custom_name" text,
    "last_update" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "class" text default 'stock'::text,
    "source" text,
    "source_id" text,
    "volume" numeric(20,8),
    "logo_url" text
      );


alter table "public"."f_stocks" enable row level security;


  create table "public"."feeds" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "type" text not null,
    "category" text not null,
    "active" boolean default true,
    "configuration" jsonb not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."feeds" enable row level security;


  create table "public"."file_sync_queue" (
    "id" integer not null default nextval('public.file_sync_queue_id_seq'::regclass),
    "data_source_id" uuid,
    "created_at" timestamp with time zone default now(),
    "processed" boolean default false,
    "processed_at" timestamp with time zone,
    "status" text default 'pending'::text,
    "error_message" text
      );



  create table "public"."item_tabfields" (
    "id" uuid not null default gen_random_uuid(),
    "item_id" uuid,
    "name" text not null,
    "value" text,
    "options" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."item_tabfields" enable row level security;


  create table "public"."map_data" (
    "key" text not null,
    "value" jsonb not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."map_data" enable row level security;


  create table "public"."map_settings" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "map_style" public.map_style_type not null default 'light'::public.map_style_type,
    "show_map_labels" boolean not null default true,
    "projection_type" public.projection_type not null default 'mercator'::public.projection_type,
    "default_latitude" numeric(10,7) not null default 38.0,
    "default_longitude" numeric(10,7) not null default '-97.0'::numeric,
    "default_zoom" numeric(4,2) not null default 3.5,
    "saved_positions" jsonb default '[]'::jsonb,
    "additional_settings" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "globe_mode" boolean default false,
    "map_opacity" real default 1.0,
    "election_map_opacity" real default 1.0,
    "atmosphere_enabled" boolean default true
      );



  create table "public"."media_assets" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "file_name" text not null,
    "description" text,
    "media_type" text not null,
    "tags" text[],
    "created_by" text not null,
    "ai_model_used" text,
    "storage_path" text not null,
    "file_url" text,
    "thumbnail_url" text,
    "created_at" timestamp with time zone default now(),
    "metadata" jsonb,
    "updated_at" timestamp with time zone default now(),
    "latitude" numeric(10,6),
    "longitude" numeric(10,6)
      );



  create table "public"."media_distribution" (
    "id" uuid not null default gen_random_uuid(),
    "media_id" uuid,
    "system_id" uuid,
    "path" text not null,
    "status" text default 'pending'::text,
    "last_sync" timestamp with time zone,
    "logs" text,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."media_push_queue" (
    "id" uuid not null default gen_random_uuid(),
    "media_id" uuid,
    "system_id" uuid,
    "method" text,
    "status" text default 'pending'::text,
    "attempts" integer default 0,
    "log" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."media_tags" (
    "media_id" uuid not null,
    "tag_id" uuid not null
      );



  create table "public"."news_articles" (
    "id" uuid not null default gen_random_uuid(),
    "provider" text not null,
    "provider_article_id" text,
    "title" text not null,
    "description" text,
    "content" text,
    "url" text not null,
    "image_url" text,
    "source_name" text,
    "source_id" text,
    "author" text,
    "published_at" timestamp with time zone,
    "fetched_at" timestamp with time zone not null default now(),
    "language" text,
    "country" text,
    "category" text,
    "keywords" text[],
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."news_articles" enable row level security;


  create table "public"."news_clusters" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "keywords" text[] default '{}'::text[],
    "category" text,
    "sentiment" text,
    "article_ids" uuid[] default '{}'::uuid[],
    "article_count" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."pulsar_commands" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone default now(),
    "channel" text not null,
    "payload" jsonb
      );



  create table "public"."school_closings" (
    "id" uuid not null default gen_random_uuid(),
    "provider_id" text,
    "region_id" text,
    "region_name" text,
    "state" text,
    "city" text,
    "county_name" text,
    "organization_name" text,
    "status_day" text,
    "status_description" text,
    "notes" text,
    "source_format" text,
    "fetched_at" timestamp with time zone default now(),
    "updated_time" timestamp with time zone,
    "source_url" text,
    "raw_data" jsonb,
    "type" text,
    "is_manual" boolean default false,
    "zone_id" text
      );



  create table "public"."sports_events" (
    "id" uuid not null default gen_random_uuid(),
    "event_id" text not null,
    "sport" text not null,
    "league" text,
    "event_type" text not null,
    "status" text not null,
    "start_time" timestamp with time zone,
    "venue" jsonb,
    "teams" jsonb,
    "score" jsonb,
    "prediction" jsonb,
    "configuration" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."sports_events" enable row level security;


  create table "public"."sports_leagues" (
    "id" bigint not null,
    "name" text not null,
    "type" text,
    "sport" text not null,
    "api_source" text not null,
    "logo" text,
    "country_name" text,
    "season_id" bigint,
    "active_season_id" bigint,
    "active_season_name" text,
    "active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."sports_leagues" enable row level security;


  create table "public"."sports_teams" (
    "id" text not null,
    "league_id" bigint not null,
    "name" text not null,
    "short_name" text,
    "abbreviation" text,
    "logo_url" text,
    "venue" text,
    "city" text,
    "country" text,
    "founded" integer,
    "sport" text not null,
    "season_id" text,
    "provider_type" text not null,
    "colors" jsonb default '{}'::jsonb,
    "statistics" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."sports_teams" enable row level security;


  create table "public"."sync_config" (
    "key" text not null,
    "value" text not null
      );



  create table "public"."sync_queue" (
    "id" bigint not null default nextval('public.sync_queue_id_seq'::regclass),
    "data_source_id" uuid not null,
    "priority" integer default 0,
    "status" text default 'pending'::text,
    "attempts" integer default 0,
    "max_attempts" integer default 3,
    "created_at" timestamp with time zone default now(),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "error_message" text
      );



  create table "public"."systems" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "ip_address" inet,
    "port" integer,
    "system_type" text not null default 'Other'::text,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "channel" text
      );



  create table "public"."tabfields" (
    "id" uuid not null default gen_random_uuid(),
    "template_id" uuid,
    "name" text not null,
    "value" text,
    "user_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "options" jsonb default '{}'::jsonb
      );


alter table "public"."tabfields" enable row level security;


  create table "public"."tags" (
    "id" uuid not null default gen_random_uuid(),
    "name" text
      );



  create table "public"."template_forms" (
    "template_id" uuid not null,
    "schema" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."template_forms" enable row level security;


  create table "public"."template_settings" (
    "template_id" uuid not null,
    "settings" jsonb not null default '{}'::jsonb,
    "scripting_enabled" boolean default false,
    "advanced_validation_enabled" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."template_settings" enable row level security;


  create table "public"."templates" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "type" text not null,
    "active" boolean default true,
    "parent_id" uuid,
    "user_id" uuid,
    "order" integer not null default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."templates" enable row level security;


  create table "public"."user_groups" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "permissions" jsonb,
    "member_count" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."user_groups" enable row level security;


  create table "public"."user_layouts" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "layout_name" text default 'default'::text,
    "layout_data" jsonb not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."user_layouts" enable row level security;


  create table "public"."users" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "name" text not null,
    "role" text not null default 'VIEWER'::text,
    "status" text not null default 'ACTIVE'::text,
    "groups" text[] default '{}'::text[],
    "permissions" jsonb,
    "last_login" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."users" enable row level security;


  create table "public"."weather_air_quality" (
    "id" integer not null default nextval('public.weather_air_quality_id_seq'::regclass),
    "location_id" text not null,
    "as_of" timestamp with time zone not null,
    "aqi" integer,
    "aqi_category" text,
    "aqi_standard" text default 'US EPA'::text,
    "pm25" numeric(8,2),
    "pm10" numeric(8,2),
    "o3" numeric(8,2),
    "no2" numeric(8,2),
    "so2" numeric(8,2),
    "co" numeric(8,2),
    "pollen_tree" integer,
    "pollen_grass" integer,
    "pollen_weed" integer,
    "pollen_risk" text,
    "fetched_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "category" text,
    "standard" text,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."weather_air_quality" enable row level security;


  create table "public"."weather_alerts" (
    "id" text not null,
    "location_id" text not null,
    "source" text not null,
    "event" text not null,
    "severity" text,
    "urgency" text,
    "certainty" text,
    "start_time" timestamp with time zone not null,
    "end_time" timestamp with time zone not null,
    "headline" text,
    "description" text,
    "areas" text[],
    "instruction" text,
    "links" text[],
    "provider_id" text,
    "provider_type" text default 'weatherapi'::text,
    "fetched_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "alert_id" text
      );


alter table "public"."weather_alerts" enable row level security;


  create table "public"."weather_current" (
    "id" integer not null default nextval('public.weather_current_id_seq'::regclass),
    "location_id" text not null,
    "as_of" timestamp with time zone,
    "summary" text,
    "icon" text,
    "temperature_value" numeric(5,2),
    "temperature_unit" text default '°C'::text,
    "feels_like_value" numeric(5,2),
    "feels_like_unit" text default '°C'::text,
    "dew_point_value" numeric(5,2),
    "dew_point_unit" text default '°C'::text,
    "humidity" integer,
    "pressure_value" numeric(7,2),
    "pressure_unit" text default 'mb'::text,
    "pressure_tendency" text,
    "cloud_cover" integer,
    "uv_index" numeric,
    "visibility_value" numeric(7,2),
    "visibility_unit" text default 'km'::text,
    "wind_speed_value" numeric(6,2),
    "wind_speed_unit" text default 'km/h'::text,
    "wind_gust_value" numeric(6,2),
    "wind_gust_unit" text default 'km/h'::text,
    "wind_direction_deg" numeric,
    "wind_direction_cardinal" text,
    "precip_last_hr_value" numeric(6,2),
    "precip_last_hr_unit" text default 'mm'::text,
    "precip_type" text,
    "snow_depth_value" numeric(6,2),
    "snow_depth_unit" text default 'cm'::text,
    "sunrise" timestamp with time zone,
    "sunset" timestamp with time zone,
    "moon_phase" text,
    "moon_illumination" numeric,
    "provider_id" text,
    "provider_type" text default 'weatherapi'::text,
    "fetched_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "precip_mm" numeric,
    "admin1" text,
    "country" text,
    "lat" numeric,
    "lon" numeric,
    "name" text,
    "timestamp" timestamp with time zone,
    "updated_at" timestamp with time zone
      );


alter table "public"."weather_current" enable row level security;


  create table "public"."weather_daily_forecast" (
    "id" integer not null default nextval('public.weather_daily_forecast_id_seq'::regclass),
    "location_id" text not null,
    "forecast_date" date not null,
    "summary" text,
    "icon" text,
    "temp_max_value" numeric,
    "temp_max_unit" text default '°C'::text,
    "temp_min_value" numeric,
    "temp_min_unit" text default '°C'::text,
    "sunrise" text,
    "sunset" text,
    "moon_phase" text,
    "uv_index_max" numeric,
    "precip_probability" numeric,
    "precip_type" text,
    "precip_accumulation_value" numeric(6,2),
    "precip_accumulation_unit" text default 'mm'::text,
    "snow_accumulation_value" numeric(6,2),
    "snow_accumulation_unit" text default 'cm'::text,
    "wind_speed_avg_value" numeric(6,2),
    "wind_speed_avg_unit" text default 'km/h'::text,
    "wind_gust_max_value" numeric(6,2),
    "wind_gust_max_unit" text default 'km/h'::text,
    "wind_direction_deg" integer,
    "provider_id" text,
    "provider_type" text default 'weatherapi'::text,
    "fetched_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "humidity" numeric,
    "pressure_unit" text,
    "pressure_value" integer,
    "uv_index" numeric,
    "visibility_unit" text,
    "visibility_value" integer,
    "wind_direction_cardinal" text,
    "wind_speed_unit" text,
    "wind_speed_value" numeric,
    "condition_icon" text,
    "condition_text" text,
    "precip_mm" numeric,
    "temp_max_c" numeric,
    "temp_min_c" numeric,
    "temp_max_f" numeric,
    "temp_min_f" numeric,
    "moon_illumination" numeric,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."weather_daily_forecast" enable row level security;


  create table "public"."weather_hourly_forecast" (
    "id" integer not null default nextval('public.weather_hourly_forecast_id_seq'::regclass),
    "location_id" text not null,
    "forecast_time" timestamp with time zone not null,
    "summary" text,
    "icon" text,
    "temperature_value" numeric(5,2),
    "temperature_unit" text default '°C'::text,
    "feels_like_value" numeric(5,2),
    "feels_like_unit" text default '°C'::text,
    "dew_point_value" numeric(5,2),
    "dew_point_unit" text default '°C'::text,
    "humidity" integer,
    "cloud_cover" integer,
    "uv_index" integer,
    "visibility_value" numeric(7,2),
    "visibility_unit" text default 'km'::text,
    "wind_speed_value" numeric(6,2),
    "wind_speed_unit" text default 'km/h'::text,
    "wind_gust_value" numeric(6,2),
    "wind_gust_unit" text default 'km/h'::text,
    "wind_direction_deg" integer,
    "pressure_value" numeric(7,2),
    "pressure_unit" text default 'mb'::text,
    "precip_probability" integer,
    "precip_intensity_value" numeric(6,2),
    "precip_intensity_unit" text default 'mm/h'::text,
    "provider_id" text,
    "provider_type" text default 'weatherapi'::text,
    "fetched_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "condition_icon" text,
    "condition_text" text,
    "precip_mm" numeric,
    "temp_c" numeric,
    "temp_f" numeric,
    "wind_degree" numeric,
    "wind_kph" numeric,
    "wind_mph" numeric,
    "wind_dir" text,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."weather_hourly_forecast" enable row level security;


  create table "public"."weather_ingest_config" (
    "id" integer not null default nextval('public.weather_ingest_config_id_seq'::regclass),
    "provider_id" text not null,
    "interval_minutes" integer default 15,
    "file_path" text not null,
    "last_run" timestamp with time zone
      );



  create table "public"."weather_locations" (
    "id" text not null,
    "name" text not null,
    "admin1" text,
    "country" text not null,
    "lat" numeric(10,7) not null,
    "lon" numeric(10,7) not null,
    "elevation_m" numeric(8,2),
    "station_id" text,
    "timezone" text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "custom_name" text,
    "provider_id" text,
    "provider_name" text,
    "channel_id" uuid
      );


alter table "public"."weather_locations" enable row level security;

alter sequence "public"."bop_election_results_id_seq" owned by "public"."bop_election_results"."id";

alter sequence "public"."bop_insufficient_vote_details_id_seq" owned by "public"."bop_insufficient_vote_details"."id";

alter sequence "public"."bop_net_changes_id_seq" owned by "public"."bop_net_changes"."id";

alter sequence "public"."bop_party_results_id_seq" owned by "public"."bop_party_results"."id";

alter sequence "public"."debug_log_id_seq" owned by "public"."debug_log"."id";

alter sequence "public"."file_sync_queue_id_seq" owned by "public"."file_sync_queue"."id";

alter sequence "public"."sync_queue_id_seq" owned by "public"."sync_queue"."id";

alter sequence "public"."weather_air_quality_id_seq" owned by "public"."weather_air_quality"."id";

alter sequence "public"."weather_current_id_seq" owned by "public"."weather_current"."id";

alter sequence "public"."weather_daily_forecast_id_seq" owned by "public"."weather_daily_forecast"."id";

alter sequence "public"."weather_hourly_forecast_id_seq" owned by "public"."weather_hourly_forecast"."id";

alter sequence "public"."weather_ingest_config_id_seq" owned by "public"."weather_ingest_config"."id";

CREATE UNIQUE INDEX agent_runs_pkey ON public.agent_runs USING btree (id);

CREATE UNIQUE INDEX agents_pkey ON public.agents USING btree (id);

CREATE UNIQUE INDEX ai_insights_elections_pkey ON public.ai_insights_elections USING btree (id);

CREATE UNIQUE INDEX ai_insights_finance_pkey ON public.ai_insights_finance USING btree (id);

CREATE UNIQUE INDEX ai_insights_news_pkey ON public.ai_insights_news USING btree (id);

CREATE INDEX ai_insights_school_closing_category_idx ON public.ai_insights_school_closing USING btree (category);

CREATE INDEX ai_insights_school_closing_created_at_idx ON public.ai_insights_school_closing USING btree (created_at DESC);

CREATE UNIQUE INDEX ai_insights_school_closing_pkey ON public.ai_insights_school_closing USING btree (id);

CREATE INDEX ai_prompt_injectors_feature_idx ON public.ai_prompt_injectors USING btree (feature);

CREATE UNIQUE INDEX ai_prompt_injectors_feature_key ON public.ai_prompt_injectors USING btree (feature);

CREATE UNIQUE INDEX ai_prompt_injectors_pkey ON public.ai_prompt_injectors USING btree (id);

CREATE UNIQUE INDEX ai_providers_pkey ON public.ai_providers USING btree (id);

CREATE UNIQUE INDEX alpaca_stocks_pkey ON public.f_stocks USING btree (id);

CREATE UNIQUE INDEX alpaca_stocks_symbol_unique ON public.f_stocks USING btree (symbol);

CREATE UNIQUE INDEX api_access_logs_pkey ON public.api_access_logs USING btree (id);

CREATE UNIQUE INDEX api_documentation_endpoint_id_key ON public.api_documentation USING btree (endpoint_id);

CREATE UNIQUE INDEX api_documentation_pkey ON public.api_documentation USING btree (id);

CREATE UNIQUE INDEX api_endpoint_sources_pkey ON public.api_endpoint_sources USING btree (id);

CREATE UNIQUE INDEX api_endpoint_sources_unique ON public.api_endpoint_sources USING btree (endpoint_id, data_source_id);

CREATE UNIQUE INDEX api_endpoints_pkey ON public.api_endpoints USING btree (id);

CREATE UNIQUE INDEX api_endpoints_slug_unique_non_draft ON public.api_endpoints USING btree (slug) WHERE ((is_draft = false) OR (is_draft IS NULL));

CREATE UNIQUE INDEX applications_app_key_key ON public.applications USING btree (app_key);

CREATE UNIQUE INDEX applications_pkey ON public.applications USING btree (id);

CREATE UNIQUE INDEX bop_election_results_pkey ON public.bop_election_results USING btree (id);

CREATE UNIQUE INDEX bop_insufficient_vote_details_pkey ON public.bop_insufficient_vote_details USING btree (id);

CREATE UNIQUE INDEX bop_net_changes_pkey ON public.bop_net_changes USING btree (id);

CREATE UNIQUE INDEX bop_party_results_pkey ON public.bop_party_results USING btree (id);

CREATE INDEX channels_order_idx ON public.channel_playlists USING btree ("order");

CREATE UNIQUE INDEX channels_pkey ON public.channel_playlists USING btree (id);

CREATE UNIQUE INDEX channels_pkey1 ON public.channels USING btree (id);

CREATE INDEX content_order_idx ON public.content USING btree ("order");

CREATE INDEX content_parent_id_idx ON public.content USING btree (parent_id);

CREATE UNIQUE INDEX content_pkey ON public.content USING btree (id);

CREATE INDEX content_template_id_idx ON public.content USING btree (template_id);

CREATE INDEX content_user_id_idx ON public.content USING btree (user_id);

CREATE UNIQUE INDEX customer_dashboards_pkey ON public.customer_dashboards USING btree (id);

CREATE UNIQUE INDEX data_providers_pkey ON public.data_providers USING btree (id);

CREATE UNIQUE INDEX data_source_sync_logs_pkey ON public.data_source_sync_logs USING btree (id);

CREATE UNIQUE INDEX data_sources_pkey ON public.data_sources USING btree (id);

CREATE UNIQUE INDEX debug_log_pkey ON public.debug_log USING btree (id);

CREATE UNIQUE INDEX e_ap_call_history_pkey ON public.e_ap_call_history USING btree (id);

CREATE UNIQUE INDEX e_ballot_measure_results_measure_id_division_id_reporting_l_key ON public.e_ballot_measure_results USING btree (measure_id, division_id, reporting_level);

CREATE UNIQUE INDEX e_ballot_measure_results_pkey ON public.e_ballot_measure_results USING btree (id);

CREATE UNIQUE INDEX e_ballot_measures_measure_id_key ON public.e_ballot_measures USING btree (measure_id);

CREATE UNIQUE INDEX e_ballot_measures_pkey ON public.e_ballot_measures USING btree (id);

CREATE UNIQUE INDEX e_candidate_results_pkey ON public.e_candidate_results USING btree (id);

CREATE UNIQUE INDEX e_candidate_results_race_result_id_candidate_id_key ON public.e_candidate_results USING btree (race_result_id, candidate_id);

CREATE UNIQUE INDEX e_candidates_candidate_id_key ON public.e_candidates USING btree (candidate_id);

CREATE UNIQUE INDEX e_candidates_pkey ON public.e_candidates USING btree (id);

CREATE UNIQUE INDEX e_countries_code_iso2_key ON public.e_countries USING btree (code_iso2);

CREATE UNIQUE INDEX e_countries_code_iso3_key ON public.e_countries USING btree (code_iso3);

CREATE UNIQUE INDEX e_countries_pkey ON public.e_countries USING btree (id);

CREATE UNIQUE INDEX e_election_data_ingestion_log_pkey ON public.e_election_data_ingestion_log USING btree (id);

CREATE UNIQUE INDEX e_election_data_overrides_log_pkey ON public.e_election_data_overrides_log USING btree (id);

CREATE UNIQUE INDEX e_election_data_sources_data_source_id_election_id_provider_key ON public.e_election_data_sources USING btree (data_source_id, election_id, provider, feed_type);

CREATE UNIQUE INDEX e_election_data_sources_pkey ON public.e_election_data_sources USING btree (id);

CREATE UNIQUE INDEX e_election_editorial_content_pkey ON public.e_election_editorial_content USING btree (id);

CREATE UNIQUE INDEX e_elections_election_id_key ON public.e_elections USING btree (election_id);

CREATE UNIQUE INDEX e_elections_pkey ON public.e_elections USING btree (id);

CREATE UNIQUE INDEX e_exit_polls_pkey ON public.e_exit_polls USING btree (id);

CREATE UNIQUE INDEX e_geographic_divisions_division_id_key ON public.e_geographic_divisions USING btree (division_id);

CREATE UNIQUE INDEX e_geographic_divisions_pkey ON public.e_geographic_divisions USING btree (id);

CREATE UNIQUE INDEX e_historical_results_pkey ON public.e_historical_results USING btree (id);

CREATE UNIQUE INDEX e_media_assets_pkey ON public.e_media_assets USING btree (id);

CREATE UNIQUE INDEX e_parties_party_id_key ON public.e_parties USING btree (party_id);

CREATE UNIQUE INDEX e_parties_pkey ON public.e_parties USING btree (id);

CREATE UNIQUE INDEX e_race_candidates_pkey ON public.e_race_candidates USING btree (id);

CREATE UNIQUE INDEX e_race_candidates_race_id_candidate_id_key ON public.e_race_candidates USING btree (race_id, candidate_id);

CREATE UNIQUE INDEX e_race_results_pkey ON public.e_race_results USING btree (id);

CREATE UNIQUE INDEX e_race_results_race_id_division_id_reporting_level_key ON public.e_race_results USING btree (race_id, division_id, reporting_level);

CREATE UNIQUE INDEX e_races_pkey ON public.e_races USING btree (id);

CREATE UNIQUE INDEX e_races_race_id_key ON public.e_races USING btree (race_id);

CREATE UNIQUE INDEX feeds_pkey ON public.feeds USING btree (id);

CREATE UNIQUE INDEX file_sync_queue_pkey ON public.file_sync_queue USING btree (id);

CREATE UNIQUE INDEX groups_name_key ON public.user_groups USING btree (name);

CREATE UNIQUE INDEX groups_pkey ON public.user_groups USING btree (id);

CREATE INDEX idx_agent_runs_agent_id ON public.agent_runs USING btree (agent_id);

CREATE INDEX idx_agent_runs_started_at ON public.agent_runs USING btree (started_at);

CREATE INDEX idx_agent_runs_status ON public.agent_runs USING btree (status);

CREATE INDEX idx_agents_status ON public.agents USING btree (status);

CREATE INDEX idx_agents_type ON public.agents USING btree (agent_type);

CREATE INDEX idx_ai_insights_elections_category ON public.ai_insights_elections USING btree (category);

CREATE INDEX idx_ai_insights_elections_created_at ON public.ai_insights_elections USING btree (created_at DESC);

CREATE INDEX idx_ai_insights_finance_category ON public.ai_insights_finance USING btree (category);

CREATE INDEX idx_ai_insights_finance_created_at ON public.ai_insights_finance USING btree (created_at DESC);

CREATE INDEX idx_ai_insights_news_category ON public.ai_insights_news USING btree (category);

CREATE INDEX idx_ai_insights_news_created_at ON public.ai_insights_news USING btree (created_at DESC);

CREATE INDEX idx_ai_insights_weather_category ON public.ai_insights_weather USING btree (category);

CREATE INDEX idx_ai_insights_weather_created_at ON public.ai_insights_weather USING btree (created_at DESC);

CREATE INDEX idx_ai_providers_dashboard_assignments ON public.ai_providers USING gin (dashboard_assignments);

CREATE INDEX idx_ai_providers_enabled ON public.ai_providers USING btree (enabled);

CREATE INDEX idx_ai_providers_provider_name ON public.ai_providers USING btree (provider_name);

CREATE INDEX idx_ai_providers_type ON public.ai_providers USING btree (type);

CREATE INDEX idx_alpaca_stocks_name ON public.f_stocks USING btree (name);

CREATE INDEX idx_alpaca_stocks_symbol ON public.f_stocks USING btree (lower(symbol));

CREATE INDEX idx_alpaca_stocks_type ON public.f_stocks USING btree (type);

CREATE INDEX idx_alpaca_stocks_updated ON public.f_stocks USING btree (updated_at DESC);

CREATE INDEX idx_api_access_logs_created_at ON public.api_access_logs USING btree (created_at DESC);

CREATE INDEX idx_api_access_logs_endpoint_id ON public.api_access_logs USING btree (endpoint_id);

CREATE INDEX idx_api_endpoint_sources_data_source_id ON public.api_endpoint_sources USING btree (data_source_id);

CREATE INDEX idx_api_endpoint_sources_endpoint_id ON public.api_endpoint_sources USING btree (endpoint_id);

CREATE INDEX idx_api_endpoints_active ON public.api_endpoints USING btree (active);

CREATE INDEX idx_api_endpoints_is_draft ON public.api_endpoints USING btree (is_draft);

CREATE INDEX idx_api_endpoints_slug ON public.api_endpoints USING btree (slug);

CREATE INDEX idx_api_endpoints_user_id ON public.api_endpoints USING btree (user_id);

CREATE INDEX idx_candidate_results_composite ON public.e_candidate_results USING btree (race_result_id, candidate_id);

CREATE INDEX idx_candidate_results_override ON public.e_candidate_results USING btree (override_at) WHERE (override_at IS NOT NULL);

CREATE INDEX idx_candidate_results_race ON public.e_candidate_results USING btree (race_result_id);

CREATE INDEX idx_candidates_candidate_id ON public.e_candidates USING btree (candidate_id);

CREATE INDEX idx_channel_playlists_channel_id ON public.channel_playlists USING btree (channel_id);

CREATE INDEX idx_channels_content_id ON public.channel_playlists USING btree (content_id);

CREATE INDEX idx_content_bucket_config ON public.content USING gin (bucket_config);

CREATE INDEX idx_content_config ON public.content USING gin (config);

CREATE INDEX idx_content_data_source ON public.content USING btree (data_source_id, source_row_id);

CREATE INDEX idx_content_type ON public.content USING btree (type);

CREATE INDEX idx_content_widget_type ON public.content USING btree (widget_type);

CREATE UNIQUE INDEX idx_customer_dashboard_unique ON public.customer_dashboards USING btree (COALESCE((customer_id)::text, 'global'::text), COALESCE((deployment_id)::text, 'default'::text), dashboard_id);

CREATE INDEX idx_data_providers_active ON public.data_providers USING btree (is_active);

CREATE INDEX idx_data_providers_category ON public.data_providers USING btree (category);

CREATE INDEX idx_data_providers_category_active ON public.data_providers USING btree (category, is_active);

CREATE INDEX idx_data_providers_type ON public.data_providers USING btree (type);

CREATE INDEX idx_data_sources_active ON public.data_sources USING btree (active);

CREATE INDEX idx_data_sources_created_at ON public.data_sources USING btree (created_at DESC);

CREATE INDEX idx_data_sources_sync_enabled ON public.data_sources USING btree ((((sync_config ->> 'enabled'::text))::boolean)) WHERE (((sync_config ->> 'enabled'::text))::boolean = true);

CREATE INDEX idx_data_sources_type ON public.data_sources USING btree (type);

CREATE INDEX idx_data_sources_user_id ON public.data_sources USING btree (user_id);

CREATE INDEX idx_editorial_content_entity ON public.e_election_editorial_content USING btree (entity_type, entity_id);

CREATE INDEX idx_editorial_content_status ON public.e_election_editorial_content USING btree (status);

CREATE INDEX idx_election_data_composite ON public.e_races USING btree (type, election_id);

CREATE INDEX idx_election_data_sources_election ON public.e_election_data_sources USING btree (election_id);

CREATE INDEX idx_election_data_sources_provider ON public.e_election_data_sources USING btree (provider, election_id);

CREATE INDEX idx_election_results_race_type ON public.bop_election_results USING btree (race_type);

CREATE INDEX idx_election_results_timestamp ON public.bop_election_results USING btree ("timestamp");

CREATE INDEX idx_election_results_year ON public.bop_election_results USING btree (election_year);

CREATE INDEX idx_election_year_race ON public.bop_election_results USING btree (election_year, race_type);

CREATE INDEX idx_elections_country ON public.e_elections USING btree (country_id);

CREATE INDEX idx_elections_date ON public.e_elections USING btree (election_date);

CREATE INDEX idx_elections_status ON public.e_elections USING btree (status);

CREATE INDEX idx_feeds_active ON public.feeds USING btree (active);

CREATE INDEX idx_feeds_category ON public.feeds USING btree (category);

CREATE INDEX idx_feeds_type ON public.feeds USING btree (type);

CREATE INDEX idx_geographic_divisions_country ON public.e_geographic_divisions USING btree (country_id);

CREATE INDEX idx_geographic_divisions_geometry ON public.e_geographic_divisions USING gist (geometry);

CREATE INDEX idx_geographic_divisions_parent ON public.e_geographic_divisions USING btree (parent_division_id);

CREATE INDEX idx_ingestion_log_created ON public.e_election_data_ingestion_log USING btree (created_at);

CREATE INDEX idx_ingestion_log_source ON public.e_election_data_ingestion_log USING btree (election_data_source_id);

CREATE INDEX idx_map_settings_updated_at ON public.map_settings USING btree (updated_at DESC);

CREATE INDEX idx_map_settings_user_id ON public.map_settings USING btree (user_id);

CREATE INDEX idx_media_assets_entity ON public.e_media_assets USING btree (entity_type, entity_id);

CREATE INDEX idx_media_assets_location ON public.media_assets USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));

CREATE INDEX idx_media_assets_primary ON public.e_media_assets USING btree (entity_type, entity_id, is_primary) WHERE (is_primary = true);

CREATE INDEX idx_media_assets_tags ON public.media_assets USING gin (tags);

CREATE INDEX idx_media_assets_type ON public.media_assets USING btree (media_type);

CREATE INDEX idx_media_distribution_media_id ON public.media_distribution USING btree (media_id);

CREATE INDEX idx_media_distribution_status ON public.media_distribution USING btree (status);

CREATE INDEX idx_media_distribution_system_id ON public.media_distribution USING btree (system_id);

CREATE INDEX idx_news_articles_category ON public.news_articles USING btree (category);

CREATE INDEX idx_news_articles_country ON public.news_articles USING btree (country);

CREATE INDEX idx_news_articles_fetched_at ON public.news_articles USING btree (fetched_at DESC);

CREATE INDEX idx_news_articles_language ON public.news_articles USING btree (language);

CREATE INDEX idx_news_articles_provider ON public.news_articles USING btree (provider);

CREATE UNIQUE INDEX idx_news_articles_provider_url ON public.news_articles USING btree (provider, url);

CREATE INDEX idx_news_articles_published_at ON public.news_articles USING btree (published_at DESC);

CREATE INDEX idx_news_clusters_category ON public.news_clusters USING btree (category);

CREATE INDEX idx_news_clusters_created_at ON public.news_clusters USING btree (created_at DESC);

CREATE INDEX idx_news_clusters_search ON public.news_clusters USING gin (to_tsvector('english'::regconfig, ((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text))));

CREATE INDEX idx_news_clusters_sentiment ON public.news_clusters USING btree (sentiment);

CREATE INDEX idx_overrides_log_created ON public.e_election_data_overrides_log USING btree (created_at);

CREATE INDEX idx_overrides_log_record ON public.e_election_data_overrides_log USING btree (table_name, record_id);

CREATE INDEX idx_parties_active ON public.e_parties USING btree (active) WHERE (active = true);

CREATE INDEX idx_parties_country ON public.e_parties USING btree (country_id);

CREATE INDEX idx_parties_featured ON public.e_parties USING btree (featured) WHERE (featured = true);

CREATE INDEX idx_party_results_election_id ON public.bop_party_results USING btree (election_result_id);

CREATE INDEX idx_party_results_party ON public.bop_party_results USING btree (party_name);

CREATE INDEX idx_race_results_composite ON public.e_race_results USING btree (race_id, division_id, reporting_level);

CREATE INDEX idx_race_results_division ON public.e_race_results USING btree (division_id);

CREATE INDEX idx_race_results_override ON public.e_race_results USING btree (override_at) WHERE (override_at IS NOT NULL);

CREATE INDEX idx_race_results_race ON public.e_race_results USING btree (race_id);

CREATE INDEX idx_race_results_updated ON public.e_race_results USING btree (last_updated);

CREATE INDEX idx_races_division ON public.e_races USING btree (division_id);

CREATE INDEX idx_races_election ON public.e_races USING btree (election_id);

CREATE INDEX idx_races_priority ON public.e_races USING btree (priority_level);

CREATE INDEX idx_races_race_id ON public.e_races USING btree (race_id);

CREATE INDEX idx_sports_events_sport ON public.sports_events USING btree (sport);

CREATE INDEX idx_sports_events_start_time ON public.sports_events USING btree (start_time);

CREATE INDEX idx_sports_events_status ON public.sports_events USING btree (status);

CREATE INDEX idx_sports_leagues_active ON public.sports_leagues USING btree (active);

CREATE INDEX idx_sports_leagues_active_season ON public.sports_leagues USING btree (active_season_id);

CREATE INDEX idx_sports_leagues_api_source ON public.sports_leagues USING btree (api_source);

CREATE INDEX idx_sports_leagues_season ON public.sports_leagues USING btree (season_id);

CREATE INDEX idx_sports_leagues_sport ON public.sports_leagues USING btree (sport);

CREATE INDEX idx_sports_teams_league_id ON public.sports_teams USING btree (league_id);

CREATE INDEX idx_sports_teams_name ON public.sports_teams USING btree (name);

CREATE INDEX idx_sports_teams_provider ON public.sports_teams USING btree (provider_type);

CREATE INDEX idx_sports_teams_sport ON public.sports_teams USING btree (sport);

CREATE INDEX idx_sync_queue_pending ON public.sync_queue USING btree (status, priority DESC, created_at) WHERE (status = 'pending'::text);

CREATE UNIQUE INDEX idx_sync_queue_unique_pending ON public.sync_queue USING btree (data_source_id) WHERE (status = ANY (ARRAY['pending'::text, 'processing'::text]));

CREATE INDEX idx_systems_type ON public.systems USING btree (system_type);

CREATE INDEX idx_template_forms_template_id ON public.template_forms USING btree (template_id);

CREATE INDEX idx_template_forms_template_id_schema ON public.template_forms USING btree (template_id, ((schema ->> 'id'::text)));

CREATE INDEX idx_template_settings_template_id ON public.template_settings USING btree (template_id);

CREATE UNIQUE INDEX idx_unique_pending_sync ON public.sync_queue USING btree (data_source_id) WHERE (status = ANY (ARRAY['pending'::text, 'processing'::text]));

CREATE INDEX idx_users_email ON public.users USING btree (email);

CREATE INDEX idx_users_role ON public.users USING btree (role);

CREATE INDEX idx_users_status ON public.users USING btree (status);

CREATE INDEX idx_weather_air_quality_as_of ON public.weather_air_quality USING btree (as_of DESC);

CREATE INDEX idx_weather_air_quality_location ON public.weather_air_quality USING btree (location_id);

CREATE INDEX idx_weather_alerts_active ON public.weather_alerts USING btree (start_time, end_time);

CREATE INDEX idx_weather_alerts_fetched ON public.weather_alerts USING btree (fetched_at DESC);

CREATE INDEX idx_weather_alerts_location ON public.weather_alerts USING btree (location_id);

CREATE INDEX idx_weather_alerts_location_alert ON public.weather_alerts USING btree (location_id, alert_id);

CREATE INDEX idx_weather_alerts_severity ON public.weather_alerts USING btree (severity);

CREATE INDEX idx_weather_current_as_of ON public.weather_current USING btree (as_of DESC);

CREATE INDEX idx_weather_current_fetched_at ON public.weather_current USING btree (fetched_at DESC);

CREATE INDEX idx_weather_current_location ON public.weather_current USING btree (location_id);

CREATE INDEX idx_weather_daily_date ON public.weather_daily_forecast USING btree (forecast_date);

CREATE INDEX idx_weather_daily_fetched ON public.weather_daily_forecast USING btree (fetched_at DESC);

CREATE INDEX idx_weather_daily_location ON public.weather_daily_forecast USING btree (location_id);

CREATE INDEX idx_weather_hourly_fetched ON public.weather_hourly_forecast USING btree (fetched_at DESC);

CREATE INDEX idx_weather_hourly_location ON public.weather_hourly_forecast USING btree (location_id);

CREATE INDEX idx_weather_hourly_time ON public.weather_hourly_forecast USING btree (forecast_time);

CREATE INDEX idx_weather_locations_active ON public.weather_locations USING btree (is_active);

CREATE INDEX idx_weather_locations_channel_id ON public.weather_locations USING btree (channel_id);

CREATE INDEX idx_weather_locations_country ON public.weather_locations USING btree (country);

CREATE INDEX idx_weather_locations_custom_name ON public.weather_locations USING btree (custom_name) WHERE (custom_name IS NOT NULL);

CREATE INDEX idx_weather_locations_provider_id ON public.weather_locations USING btree (provider_id);

CREATE INDEX item_tabfields_content_id_idx ON public.item_tabfields USING btree (item_id);

CREATE UNIQUE INDEX item_tabfields_content_id_name_key ON public.item_tabfields USING btree (item_id, name);

CREATE UNIQUE INDEX item_tabfields_pkey ON public.item_tabfields USING btree (id);

CREATE UNIQUE INDEX kv_store_629fe562_pkey ON public.map_data USING btree (key);

CREATE UNIQUE INDEX map_settings_pkey ON public.map_settings USING btree (id);

CREATE INDEX map_settings_user_id_idx ON public.map_settings USING btree (user_id);

CREATE UNIQUE INDEX media_assets_pkey ON public.media_assets USING btree (id);

CREATE UNIQUE INDEX media_distribution_pkey ON public.media_distribution USING btree (id);

CREATE UNIQUE INDEX media_push_queue_pkey ON public.media_push_queue USING btree (id);

CREATE UNIQUE INDEX media_tags_pkey ON public.media_tags USING btree (media_id, tag_id);

CREATE UNIQUE INDEX news_articles_pkey ON public.news_articles USING btree (id);

CREATE UNIQUE INDEX news_clusters_pkey ON public.news_clusters USING btree (id);

CREATE UNIQUE INDEX pulsar_commands_pkey ON public.pulsar_commands USING btree (id);

CREATE UNIQUE INDEX school_closings_pkey ON public.school_closings USING btree (id);

CREATE UNIQUE INDEX school_closings_provider_id_organization_name_status_day_key ON public.school_closings USING btree (provider_id, organization_name, status_day);

CREATE UNIQUE INDEX sports_events_event_id_key ON public.sports_events USING btree (event_id);

CREATE UNIQUE INDEX sports_events_pkey ON public.sports_events USING btree (id);

CREATE UNIQUE INDEX sports_leagues_pkey ON public.sports_leagues USING btree (id);

CREATE UNIQUE INDEX sync_config_pkey ON public.sync_config USING btree (key);

CREATE UNIQUE INDEX sync_queue_pkey ON public.sync_queue USING btree (id);

CREATE UNIQUE INDEX systems_pkey ON public.systems USING btree (id);

CREATE UNIQUE INDEX tabfields_pkey ON public.tabfields USING btree (id);

CREATE INDEX tabfields_template_id_idx ON public.tabfields USING btree (template_id);

CREATE UNIQUE INDEX tabfields_template_id_name_key ON public.tabfields USING btree (template_id, name);

CREATE INDEX tabfields_user_id_idx ON public.tabfields USING btree (user_id);

CREATE UNIQUE INDEX tags_name_key ON public.tags USING btree (name);

CREATE UNIQUE INDEX tags_pkey ON public.tags USING btree (id);

CREATE UNIQUE INDEX template_forms_pkey ON public.template_forms USING btree (template_id);

CREATE UNIQUE INDEX template_settings_pkey ON public.template_settings USING btree (template_id);

CREATE INDEX templates_order_idx ON public.templates USING btree ("order");

CREATE INDEX templates_parent_id_idx ON public.templates USING btree (parent_id);

CREATE UNIQUE INDEX templates_pkey ON public.templates USING btree (id);

CREATE INDEX templates_user_id_idx ON public.templates USING btree (user_id);

CREATE UNIQUE INDEX unique_party_per_election ON public.bop_party_results USING btree (election_result_id, party_name);

CREATE UNIQUE INDEX unique_team_id ON public.sports_teams USING btree (id);

CREATE UNIQUE INDEX unique_user_map_settings ON public.map_settings USING btree (user_id);

CREATE UNIQUE INDEX user_layouts_pkey ON public.user_layouts USING btree (id);

CREATE UNIQUE INDEX user_layouts_user_id_layout_name_key ON public.user_layouts USING btree (user_id, layout_name);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE UNIQUE INDEX weather_ai_insights_pkey ON public.ai_insights_weather USING btree (id);

CREATE UNIQUE INDEX weather_air_quality_location_id_as_of_key ON public.weather_air_quality USING btree (location_id, as_of);

CREATE UNIQUE INDEX weather_air_quality_pkey ON public.weather_air_quality USING btree (id);

CREATE UNIQUE INDEX weather_alerts_id_location_id_key ON public.weather_alerts USING btree (id, location_id);

CREATE UNIQUE INDEX weather_alerts_pkey ON public.weather_alerts USING btree (id);

CREATE UNIQUE INDEX weather_alerts_unique ON public.weather_alerts USING btree (id);

CREATE UNIQUE INDEX weather_alerts_unique_location_alert ON public.weather_alerts USING btree (location_id, alert_id);

CREATE UNIQUE INDEX weather_current_location_id_as_of_key ON public.weather_current USING btree (location_id, as_of);

CREATE UNIQUE INDEX weather_current_location_id_key ON public.weather_current USING btree (location_id);

CREATE UNIQUE INDEX weather_current_pkey ON public.weather_current USING btree (id);

CREATE UNIQUE INDEX weather_current_unique ON public.weather_current USING btree (location_id);

CREATE UNIQUE INDEX weather_daily_forecast_pkey ON public.weather_daily_forecast USING btree (id);

CREATE UNIQUE INDEX weather_daily_forecast_unique ON public.weather_daily_forecast USING btree (location_id, forecast_date, provider_id);

CREATE UNIQUE INDEX weather_hourly_forecast_location_id_forecast_time_provider__key ON public.weather_hourly_forecast USING btree (location_id, forecast_time, provider_id);

CREATE UNIQUE INDEX weather_hourly_forecast_pkey ON public.weather_hourly_forecast USING btree (id);

CREATE UNIQUE INDEX weather_hourly_forecast_unique ON public.weather_hourly_forecast USING btree (location_id, forecast_time);

CREATE UNIQUE INDEX weather_ingest_config_pkey ON public.weather_ingest_config USING btree (id);

CREATE UNIQUE INDEX weather_locations_pkey ON public.weather_locations USING btree (id);

alter table "public"."agent_runs" add constraint "agent_runs_pkey" PRIMARY KEY using index "agent_runs_pkey";

alter table "public"."agents" add constraint "agents_pkey" PRIMARY KEY using index "agents_pkey";

alter table "public"."ai_insights_elections" add constraint "ai_insights_elections_pkey" PRIMARY KEY using index "ai_insights_elections_pkey";

alter table "public"."ai_insights_finance" add constraint "ai_insights_finance_pkey" PRIMARY KEY using index "ai_insights_finance_pkey";

alter table "public"."ai_insights_news" add constraint "ai_insights_news_pkey" PRIMARY KEY using index "ai_insights_news_pkey";

alter table "public"."ai_insights_school_closing" add constraint "ai_insights_school_closing_pkey" PRIMARY KEY using index "ai_insights_school_closing_pkey";

alter table "public"."ai_insights_weather" add constraint "weather_ai_insights_pkey" PRIMARY KEY using index "weather_ai_insights_pkey";

alter table "public"."ai_prompt_injectors" add constraint "ai_prompt_injectors_pkey" PRIMARY KEY using index "ai_prompt_injectors_pkey";

alter table "public"."ai_providers" add constraint "ai_providers_pkey" PRIMARY KEY using index "ai_providers_pkey";

alter table "public"."api_access_logs" add constraint "api_access_logs_pkey" PRIMARY KEY using index "api_access_logs_pkey";

alter table "public"."api_documentation" add constraint "api_documentation_pkey" PRIMARY KEY using index "api_documentation_pkey";

alter table "public"."api_endpoint_sources" add constraint "api_endpoint_sources_pkey" PRIMARY KEY using index "api_endpoint_sources_pkey";

alter table "public"."api_endpoints" add constraint "api_endpoints_pkey" PRIMARY KEY using index "api_endpoints_pkey";

alter table "public"."applications" add constraint "applications_pkey" PRIMARY KEY using index "applications_pkey";

alter table "public"."bop_election_results" add constraint "bop_election_results_pkey" PRIMARY KEY using index "bop_election_results_pkey";

alter table "public"."bop_insufficient_vote_details" add constraint "bop_insufficient_vote_details_pkey" PRIMARY KEY using index "bop_insufficient_vote_details_pkey";

alter table "public"."bop_net_changes" add constraint "bop_net_changes_pkey" PRIMARY KEY using index "bop_net_changes_pkey";

alter table "public"."bop_party_results" add constraint "bop_party_results_pkey" PRIMARY KEY using index "bop_party_results_pkey";

alter table "public"."channel_playlists" add constraint "channels_pkey" PRIMARY KEY using index "channels_pkey";

alter table "public"."channels" add constraint "channels_pkey1" PRIMARY KEY using index "channels_pkey1";

alter table "public"."content" add constraint "content_pkey" PRIMARY KEY using index "content_pkey";

alter table "public"."customer_dashboards" add constraint "customer_dashboards_pkey" PRIMARY KEY using index "customer_dashboards_pkey";

alter table "public"."data_providers" add constraint "data_providers_pkey" PRIMARY KEY using index "data_providers_pkey";

alter table "public"."data_source_sync_logs" add constraint "data_source_sync_logs_pkey" PRIMARY KEY using index "data_source_sync_logs_pkey";

alter table "public"."data_sources" add constraint "data_sources_pkey" PRIMARY KEY using index "data_sources_pkey";

alter table "public"."debug_log" add constraint "debug_log_pkey" PRIMARY KEY using index "debug_log_pkey";

alter table "public"."e_ap_call_history" add constraint "e_ap_call_history_pkey" PRIMARY KEY using index "e_ap_call_history_pkey";

alter table "public"."e_ballot_measure_results" add constraint "e_ballot_measure_results_pkey" PRIMARY KEY using index "e_ballot_measure_results_pkey";

alter table "public"."e_ballot_measures" add constraint "e_ballot_measures_pkey" PRIMARY KEY using index "e_ballot_measures_pkey";

alter table "public"."e_candidate_results" add constraint "e_candidate_results_pkey" PRIMARY KEY using index "e_candidate_results_pkey";

alter table "public"."e_candidates" add constraint "e_candidates_pkey" PRIMARY KEY using index "e_candidates_pkey";

alter table "public"."e_countries" add constraint "e_countries_pkey" PRIMARY KEY using index "e_countries_pkey";

alter table "public"."e_election_data_ingestion_log" add constraint "e_election_data_ingestion_log_pkey" PRIMARY KEY using index "e_election_data_ingestion_log_pkey";

alter table "public"."e_election_data_overrides_log" add constraint "e_election_data_overrides_log_pkey" PRIMARY KEY using index "e_election_data_overrides_log_pkey";

alter table "public"."e_election_data_sources" add constraint "e_election_data_sources_pkey" PRIMARY KEY using index "e_election_data_sources_pkey";

alter table "public"."e_election_editorial_content" add constraint "e_election_editorial_content_pkey" PRIMARY KEY using index "e_election_editorial_content_pkey";

alter table "public"."e_elections" add constraint "e_elections_pkey" PRIMARY KEY using index "e_elections_pkey";

alter table "public"."e_exit_polls" add constraint "e_exit_polls_pkey" PRIMARY KEY using index "e_exit_polls_pkey";

alter table "public"."e_geographic_divisions" add constraint "e_geographic_divisions_pkey" PRIMARY KEY using index "e_geographic_divisions_pkey";

alter table "public"."e_historical_results" add constraint "e_historical_results_pkey" PRIMARY KEY using index "e_historical_results_pkey";

alter table "public"."e_media_assets" add constraint "e_media_assets_pkey" PRIMARY KEY using index "e_media_assets_pkey";

alter table "public"."e_parties" add constraint "e_parties_pkey" PRIMARY KEY using index "e_parties_pkey";

alter table "public"."e_race_candidates" add constraint "e_race_candidates_pkey" PRIMARY KEY using index "e_race_candidates_pkey";

alter table "public"."e_race_results" add constraint "e_race_results_pkey" PRIMARY KEY using index "e_race_results_pkey";

alter table "public"."e_races" add constraint "e_races_pkey" PRIMARY KEY using index "e_races_pkey";

alter table "public"."f_stocks" add constraint "alpaca_stocks_pkey" PRIMARY KEY using index "alpaca_stocks_pkey";

alter table "public"."feeds" add constraint "feeds_pkey" PRIMARY KEY using index "feeds_pkey";

alter table "public"."file_sync_queue" add constraint "file_sync_queue_pkey" PRIMARY KEY using index "file_sync_queue_pkey";

alter table "public"."item_tabfields" add constraint "item_tabfields_pkey" PRIMARY KEY using index "item_tabfields_pkey";

alter table "public"."map_data" add constraint "kv_store_629fe562_pkey" PRIMARY KEY using index "kv_store_629fe562_pkey";

alter table "public"."map_settings" add constraint "map_settings_pkey" PRIMARY KEY using index "map_settings_pkey";

alter table "public"."media_assets" add constraint "media_assets_pkey" PRIMARY KEY using index "media_assets_pkey";

alter table "public"."media_distribution" add constraint "media_distribution_pkey" PRIMARY KEY using index "media_distribution_pkey";

alter table "public"."media_push_queue" add constraint "media_push_queue_pkey" PRIMARY KEY using index "media_push_queue_pkey";

alter table "public"."media_tags" add constraint "media_tags_pkey" PRIMARY KEY using index "media_tags_pkey";

alter table "public"."news_articles" add constraint "news_articles_pkey" PRIMARY KEY using index "news_articles_pkey";

alter table "public"."news_clusters" add constraint "news_clusters_pkey" PRIMARY KEY using index "news_clusters_pkey";

alter table "public"."pulsar_commands" add constraint "pulsar_commands_pkey" PRIMARY KEY using index "pulsar_commands_pkey";

alter table "public"."school_closings" add constraint "school_closings_pkey" PRIMARY KEY using index "school_closings_pkey";

alter table "public"."sports_events" add constraint "sports_events_pkey" PRIMARY KEY using index "sports_events_pkey";

alter table "public"."sports_leagues" add constraint "sports_leagues_pkey" PRIMARY KEY using index "sports_leagues_pkey";

alter table "public"."sports_teams" add constraint "unique_team_id" PRIMARY KEY using index "unique_team_id";

alter table "public"."sync_config" add constraint "sync_config_pkey" PRIMARY KEY using index "sync_config_pkey";

alter table "public"."sync_queue" add constraint "sync_queue_pkey" PRIMARY KEY using index "sync_queue_pkey";

alter table "public"."systems" add constraint "systems_pkey" PRIMARY KEY using index "systems_pkey";

alter table "public"."tabfields" add constraint "tabfields_pkey" PRIMARY KEY using index "tabfields_pkey";

alter table "public"."tags" add constraint "tags_pkey" PRIMARY KEY using index "tags_pkey";

alter table "public"."template_forms" add constraint "template_forms_pkey" PRIMARY KEY using index "template_forms_pkey";

alter table "public"."template_settings" add constraint "template_settings_pkey" PRIMARY KEY using index "template_settings_pkey";

alter table "public"."templates" add constraint "templates_pkey" PRIMARY KEY using index "templates_pkey";

alter table "public"."user_groups" add constraint "groups_pkey" PRIMARY KEY using index "groups_pkey";

alter table "public"."user_layouts" add constraint "user_layouts_pkey" PRIMARY KEY using index "user_layouts_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."weather_air_quality" add constraint "weather_air_quality_pkey" PRIMARY KEY using index "weather_air_quality_pkey";

alter table "public"."weather_alerts" add constraint "weather_alerts_pkey" PRIMARY KEY using index "weather_alerts_pkey";

alter table "public"."weather_current" add constraint "weather_current_pkey" PRIMARY KEY using index "weather_current_pkey";

alter table "public"."weather_daily_forecast" add constraint "weather_daily_forecast_pkey" PRIMARY KEY using index "weather_daily_forecast_pkey";

alter table "public"."weather_hourly_forecast" add constraint "weather_hourly_forecast_pkey" PRIMARY KEY using index "weather_hourly_forecast_pkey";

alter table "public"."weather_ingest_config" add constraint "weather_ingest_config_pkey" PRIMARY KEY using index "weather_ingest_config_pkey";

alter table "public"."weather_locations" add constraint "weather_locations_pkey" PRIMARY KEY using index "weather_locations_pkey";

alter table "public"."agent_runs" add constraint "agent_runs_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE not valid;

alter table "public"."agent_runs" validate constraint "agent_runs_agent_id_fkey";

alter table "public"."agent_runs" add constraint "agent_runs_status_check" CHECK ((status = ANY (ARRAY['RUNNING'::text, 'COMPLETED'::text, 'FAILED'::text]))) not valid;

alter table "public"."agent_runs" validate constraint "agent_runs_status_check";

alter table "public"."agents" add constraint "agents_agent_type_check" CHECK ((agent_type = ANY (ARRAY['DATA_COLLECTOR'::text, 'ANALYZER'::text, 'PREDICTOR'::text, 'NOTIFIER'::text, 'CUSTOM'::text]))) not valid;

alter table "public"."agents" validate constraint "agents_agent_type_check";

alter table "public"."agents" add constraint "agents_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'PAUSED'::text, 'STOPPED'::text, 'ERROR'::text]))) not valid;

alter table "public"."agents" validate constraint "agents_status_check";

alter table "public"."ai_prompt_injectors" add constraint "ai_prompt_injectors_feature_key" UNIQUE using index "ai_prompt_injectors_feature_key";

alter table "public"."api_access_logs" add constraint "api_access_logs_endpoint_id_fkey" FOREIGN KEY (endpoint_id) REFERENCES public.api_endpoints(id) ON DELETE CASCADE not valid;

alter table "public"."api_access_logs" validate constraint "api_access_logs_endpoint_id_fkey";

alter table "public"."api_documentation" add constraint "api_documentation_endpoint_id_fkey" FOREIGN KEY (endpoint_id) REFERENCES public.api_endpoints(id) ON DELETE CASCADE not valid;

alter table "public"."api_documentation" validate constraint "api_documentation_endpoint_id_fkey";

alter table "public"."api_documentation" add constraint "api_documentation_endpoint_id_key" UNIQUE using index "api_documentation_endpoint_id_key";

alter table "public"."api_endpoint_sources" add constraint "api_endpoint_sources_data_source_id_fkey" FOREIGN KEY (data_source_id) REFERENCES public.data_sources(id) ON DELETE CASCADE not valid;

alter table "public"."api_endpoint_sources" validate constraint "api_endpoint_sources_data_source_id_fkey";

alter table "public"."api_endpoint_sources" add constraint "api_endpoint_sources_endpoint_id_fkey" FOREIGN KEY (endpoint_id) REFERENCES public.api_endpoints(id) ON DELETE CASCADE not valid;

alter table "public"."api_endpoint_sources" validate constraint "api_endpoint_sources_endpoint_id_fkey";

alter table "public"."api_endpoint_sources" add constraint "api_endpoint_sources_unique" UNIQUE using index "api_endpoint_sources_unique";

alter table "public"."api_endpoints" add constraint "api_endpoints_output_format_check" CHECK (((output_format)::text = ANY ((ARRAY['json'::character varying, 'xml'::character varying, 'rss'::character varying, 'csv'::character varying, 'custom'::character varying])::text[]))) not valid;

alter table "public"."api_endpoints" validate constraint "api_endpoints_output_format_check";

-- alter table "public"."api_endpoints" add constraint "api_endpoints_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

-- alter table "public"."api_endpoints" validate constraint "api_endpoints_user_id_fkey";

alter table "public"."applications" add constraint "applications_app_key_key" UNIQUE using index "applications_app_key_key";

alter table "public"."bop_election_results" add constraint "check_race_type" CHECK (((race_type)::text = ANY ((ARRAY['house'::character varying, 'senate'::character varying])::text[]))) not valid;

alter table "public"."bop_election_results" validate constraint "check_race_type";

alter table "public"."bop_insufficient_vote_details" add constraint "bop_insufficient_vote_details_election_result_id_fkey" FOREIGN KEY (election_result_id) REFERENCES public.bop_election_results(id) ON DELETE CASCADE not valid;

alter table "public"."bop_insufficient_vote_details" validate constraint "bop_insufficient_vote_details_election_result_id_fkey";

alter table "public"."bop_net_changes" add constraint "bop_net_changes_party_result_id_fkey" FOREIGN KEY (party_result_id) REFERENCES public.bop_party_results(id) ON DELETE CASCADE not valid;

alter table "public"."bop_net_changes" validate constraint "bop_net_changes_party_result_id_fkey";

alter table "public"."bop_party_results" add constraint "bop_party_results_election_result_id_fkey" FOREIGN KEY (election_result_id) REFERENCES public.bop_election_results(id) ON DELETE CASCADE not valid;

alter table "public"."bop_party_results" validate constraint "bop_party_results_election_result_id_fkey";

alter table "public"."bop_party_results" add constraint "unique_party_per_election" UNIQUE using index "unique_party_per_election";

alter table "public"."channel_playlists" add constraint "channel_playlists_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE SET NULL not valid;

alter table "public"."channel_playlists" validate constraint "channel_playlists_channel_id_fkey";

alter table "public"."channel_playlists" add constraint "channel_playlists_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.channel_playlists(id) ON DELETE CASCADE not valid;

alter table "public"."channel_playlists" validate constraint "channel_playlists_parent_id_fkey";

alter table "public"."channel_playlists" add constraint "channels_content_id_fkey" FOREIGN KEY (content_id) REFERENCES public.content(id) ON DELETE CASCADE not valid;

alter table "public"."channel_playlists" validate constraint "channels_content_id_fkey";

alter table "public"."channel_playlists" add constraint "channels_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."channel_playlists" validate constraint "channels_user_id_fkey";

alter table "public"."channel_playlists" add constraint "valid_type" CHECK ((type = ANY (ARRAY['channel'::text, 'playlist'::text, 'bucket'::text]))) not valid;

alter table "public"."channel_playlists" validate constraint "valid_type";

alter table "public"."channels" add constraint "channels_type_check" CHECK ((type = ANY (ARRAY['Vizrt'::text, 'Unreal'::text, 'Pixera'::text, 'Web'::text]))) not valid;

alter table "public"."channels" validate constraint "channels_type_check";

alter table "public"."content" add constraint "check_bucket_config_only_on_buckets" CHECK (((bucket_config IS NULL) OR (type = 'bucket'::text))) not valid;

alter table "public"."content" validate constraint "check_bucket_config_only_on_buckets";

alter table "public"."content" add constraint "content_data_source_id_fkey" FOREIGN KEY (data_source_id) REFERENCES public.data_sources(id) ON DELETE SET NULL not valid;

alter table "public"."content" validate constraint "content_data_source_id_fkey";

alter table "public"."content" add constraint "content_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.content(id) ON DELETE CASCADE not valid;

alter table "public"."content" validate constraint "content_parent_id_fkey";

alter table "public"."content" add constraint "content_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE not valid;

alter table "public"."content" validate constraint "content_template_id_fkey";

alter table "public"."content" add constraint "content_type_check" CHECK ((type = ANY (ARRAY['bucketFolder'::text, 'bucket'::text, 'itemFolder'::text, 'item'::text]))) not valid;

alter table "public"."content" validate constraint "content_type_check";

alter table "public"."content" add constraint "content_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."content" validate constraint "content_user_id_fkey";

alter table "public"."data_providers" add constraint "data_providers_category_check" CHECK ((category = ANY (ARRAY['finance'::text, 'weather'::text, 'sports'::text, 'news'::text, 'media'::text, 'school_closings'::text]))) not valid;

alter table "public"."data_providers" validate constraint "data_providers_category_check";

alter table "public"."data_source_sync_logs" add constraint "data_source_sync_logs_data_source_id_fkey" FOREIGN KEY (data_source_id) REFERENCES public.data_sources(id) ON DELETE CASCADE not valid;

alter table "public"."data_source_sync_logs" validate constraint "data_source_sync_logs_data_source_id_fkey";

alter table "public"."data_source_sync_logs" add constraint "data_source_sync_logs_status_check" CHECK ((status = ANY (ARRAY['running'::text, 'success'::text, 'error'::text, 'debug'::text, 'completed_with_errors'::text]))) not valid;

alter table "public"."data_source_sync_logs" validate constraint "data_source_sync_logs_status_check";

alter table "public"."data_sources" add constraint "data_sources_sync_status_check" CHECK ((sync_status = ANY (ARRAY['idle'::text, 'pending'::text, 'running'::text, 'success'::text, 'error'::text, 'scheduled'::text, 'ready'::text]))) not valid;

alter table "public"."data_sources" validate constraint "data_sources_sync_status_check";

alter table "public"."data_sources" add constraint "data_sources_type_check" CHECK (((type)::text = ANY ((ARRAY['api'::character varying, 'rss'::character varying, 'database'::character varying, 'file'::character varying])::text[]))) not valid;

alter table "public"."data_sources" validate constraint "data_sources_type_check";

alter table "public"."data_sources" add constraint "data_sources_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."data_sources" validate constraint "data_sources_user_id_fkey";

alter table "public"."e_ballot_measure_results" add constraint "e_ballot_measure_results_division_id_fkey" FOREIGN KEY (division_id) REFERENCES public.e_geographic_divisions(id) not valid;

alter table "public"."e_ballot_measure_results" validate constraint "e_ballot_measure_results_division_id_fkey";

alter table "public"."e_ballot_measure_results" add constraint "e_ballot_measure_results_measure_id_division_id_reporting_l_key" UNIQUE using index "e_ballot_measure_results_measure_id_division_id_reporting_l_key";

alter table "public"."e_ballot_measure_results" add constraint "e_ballot_measure_results_measure_id_fkey" FOREIGN KEY (measure_id) REFERENCES public.e_ballot_measures(id) ON DELETE CASCADE not valid;

alter table "public"."e_ballot_measure_results" validate constraint "e_ballot_measure_results_measure_id_fkey";

alter table "public"."e_ballot_measures" add constraint "e_ballot_measures_division_id_fkey" FOREIGN KEY (division_id) REFERENCES public.e_geographic_divisions(id) not valid;

alter table "public"."e_ballot_measures" validate constraint "e_ballot_measures_division_id_fkey";

alter table "public"."e_ballot_measures" add constraint "e_ballot_measures_election_id_fkey" FOREIGN KEY (election_id) REFERENCES public.e_elections(id) ON DELETE CASCADE not valid;

alter table "public"."e_ballot_measures" validate constraint "e_ballot_measures_election_id_fkey";

alter table "public"."e_ballot_measures" add constraint "e_ballot_measures_measure_id_key" UNIQUE using index "e_ballot_measures_measure_id_key";

alter table "public"."e_candidate_results" add constraint "e_candidate_results_candidate_id_fkey" FOREIGN KEY (candidate_id) REFERENCES public.e_candidates(id) not valid;

alter table "public"."e_candidate_results" validate constraint "e_candidate_results_candidate_id_fkey";

alter table "public"."e_candidate_results" add constraint "e_candidate_results_override_by_fkey" FOREIGN KEY (override_by) REFERENCES auth.users(id) not valid;

alter table "public"."e_candidate_results" validate constraint "e_candidate_results_override_by_fkey";

alter table "public"."e_candidate_results" add constraint "e_candidate_results_race_result_id_candidate_id_key" UNIQUE using index "e_candidate_results_race_result_id_candidate_id_key";

alter table "public"."e_candidate_results" add constraint "e_candidate_results_race_result_id_fkey" FOREIGN KEY (race_result_id) REFERENCES public.e_race_results(id) ON DELETE CASCADE not valid;

alter table "public"."e_candidate_results" validate constraint "e_candidate_results_race_result_id_fkey";

alter table "public"."e_candidates" add constraint "e_candidates_candidate_id_key" UNIQUE using index "e_candidates_candidate_id_key";

alter table "public"."e_candidates" add constraint "e_candidates_party_id_fkey" FOREIGN KEY (party_id) REFERENCES public.e_parties(id) not valid;

alter table "public"."e_candidates" validate constraint "e_candidates_party_id_fkey";

alter table "public"."e_countries" add constraint "e_countries_code_iso2_key" UNIQUE using index "e_countries_code_iso2_key";

alter table "public"."e_countries" add constraint "e_countries_code_iso3_key" UNIQUE using index "e_countries_code_iso3_key";

alter table "public"."e_election_data_ingestion_log" add constraint "e_election_data_ingestion_log_election_data_source_id_fkey" FOREIGN KEY (election_data_source_id) REFERENCES public.e_election_data_sources(id) ON DELETE CASCADE not valid;

alter table "public"."e_election_data_ingestion_log" validate constraint "e_election_data_ingestion_log_election_data_source_id_fkey";

alter table "public"."e_election_data_overrides_log" add constraint "e_election_data_overrides_log_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id) not valid;

alter table "public"."e_election_data_overrides_log" validate constraint "e_election_data_overrides_log_approved_by_fkey";

alter table "public"."e_election_data_overrides_log" add constraint "e_election_data_overrides_log_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES auth.users(id) not valid;

alter table "public"."e_election_data_overrides_log" validate constraint "e_election_data_overrides_log_performed_by_fkey";

alter table "public"."e_election_data_sources" add constraint "e_election_data_sources_data_source_id_election_id_provider_key" UNIQUE using index "e_election_data_sources_data_source_id_election_id_provider_key";

alter table "public"."e_election_data_sources" add constraint "e_election_data_sources_data_source_id_fkey" FOREIGN KEY (data_source_id) REFERENCES public.data_sources(id) ON DELETE CASCADE not valid;

alter table "public"."e_election_data_sources" validate constraint "e_election_data_sources_data_source_id_fkey";

alter table "public"."e_election_data_sources" add constraint "e_election_data_sources_election_id_fkey" FOREIGN KEY (election_id) REFERENCES public.e_elections(id) ON DELETE CASCADE not valid;

alter table "public"."e_election_data_sources" validate constraint "e_election_data_sources_election_id_fkey";

alter table "public"."e_election_editorial_content" add constraint "e_election_editorial_content_author_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) not valid;

alter table "public"."e_election_editorial_content" validate constraint "e_election_editorial_content_author_id_fkey";

alter table "public"."e_elections" add constraint "e_elections_country_id_fkey" FOREIGN KEY (country_id) REFERENCES public.e_countries(id) not valid;

alter table "public"."e_elections" validate constraint "e_elections_country_id_fkey";

alter table "public"."e_elections" add constraint "e_elections_election_id_key" UNIQUE using index "e_elections_election_id_key";

alter table "public"."e_exit_polls" add constraint "e_exit_polls_candidate_id_fkey" FOREIGN KEY (candidate_id) REFERENCES public.e_candidates(id) not valid;

alter table "public"."e_exit_polls" validate constraint "e_exit_polls_candidate_id_fkey";

alter table "public"."e_exit_polls" add constraint "e_exit_polls_race_id_fkey" FOREIGN KEY (race_id) REFERENCES public.e_races(id) ON DELETE CASCADE not valid;

alter table "public"."e_exit_polls" validate constraint "e_exit_polls_race_id_fkey";

alter table "public"."e_geographic_divisions" add constraint "e_geographic_divisions_country_id_fkey" FOREIGN KEY (country_id) REFERENCES public.e_countries(id) not valid;

alter table "public"."e_geographic_divisions" validate constraint "e_geographic_divisions_country_id_fkey";

alter table "public"."e_geographic_divisions" add constraint "e_geographic_divisions_division_id_key" UNIQUE using index "e_geographic_divisions_division_id_key";

alter table "public"."e_geographic_divisions" add constraint "e_geographic_divisions_parent_division_id_fkey" FOREIGN KEY (parent_division_id) REFERENCES public.e_geographic_divisions(id) not valid;

alter table "public"."e_geographic_divisions" validate constraint "e_geographic_divisions_parent_division_id_fkey";

alter table "public"."e_historical_results" add constraint "e_historical_results_country_id_fkey" FOREIGN KEY (country_id) REFERENCES public.e_countries(id) not valid;

alter table "public"."e_historical_results" validate constraint "e_historical_results_country_id_fkey";

alter table "public"."e_historical_results" add constraint "e_historical_results_division_id_fkey" FOREIGN KEY (division_id) REFERENCES public.e_geographic_divisions(id) not valid;

alter table "public"."e_historical_results" validate constraint "e_historical_results_division_id_fkey";

alter table "public"."e_media_assets" add constraint "e_media_assets_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) not valid;

alter table "public"."e_media_assets" validate constraint "e_media_assets_uploaded_by_fkey";

alter table "public"."e_parties" add constraint "e_parties_country_id_fkey" FOREIGN KEY (country_id) REFERENCES public.e_countries(id) not valid;

alter table "public"."e_parties" validate constraint "e_parties_country_id_fkey";

alter table "public"."e_parties" add constraint "e_parties_party_id_key" UNIQUE using index "e_parties_party_id_key";

alter table "public"."e_parties" add constraint "e_parties_predecessor_party_id_fkey" FOREIGN KEY (predecessor_party_id) REFERENCES public.e_parties(id) not valid;

alter table "public"."e_parties" validate constraint "e_parties_predecessor_party_id_fkey";

alter table "public"."e_parties" add constraint "e_parties_successor_party_id_fkey" FOREIGN KEY (successor_party_id) REFERENCES public.e_parties(id) not valid;

alter table "public"."e_parties" validate constraint "e_parties_successor_party_id_fkey";

alter table "public"."e_race_candidates" add constraint "e_race_candidates_candidate_id_fkey" FOREIGN KEY (candidate_id) REFERENCES public.e_candidates(id) ON DELETE CASCADE not valid;

alter table "public"."e_race_candidates" validate constraint "e_race_candidates_candidate_id_fkey";

alter table "public"."e_race_candidates" add constraint "e_race_candidates_race_id_candidate_id_key" UNIQUE using index "e_race_candidates_race_id_candidate_id_key";

alter table "public"."e_race_candidates" add constraint "e_race_candidates_race_id_fkey" FOREIGN KEY (race_id) REFERENCES public.e_races(id) ON DELETE CASCADE not valid;

alter table "public"."e_race_candidates" validate constraint "e_race_candidates_race_id_fkey";

alter table "public"."e_race_results" add constraint "e_race_results_called_override_by_fkey" FOREIGN KEY (called_override_by) REFERENCES auth.users(id) not valid;

alter table "public"."e_race_results" validate constraint "e_race_results_called_override_by_fkey";

alter table "public"."e_race_results" add constraint "e_race_results_division_id_fkey" FOREIGN KEY (division_id) REFERENCES public.e_geographic_divisions(id) not valid;

alter table "public"."e_race_results" validate constraint "e_race_results_division_id_fkey";

alter table "public"."e_race_results" add constraint "e_race_results_override_approved_by_fkey" FOREIGN KEY (override_approved_by) REFERENCES auth.users(id) not valid;

alter table "public"."e_race_results" validate constraint "e_race_results_override_approved_by_fkey";

alter table "public"."e_race_results" add constraint "e_race_results_override_by_fkey" FOREIGN KEY (override_by) REFERENCES auth.users(id) not valid;

alter table "public"."e_race_results" validate constraint "e_race_results_override_by_fkey";

alter table "public"."e_race_results" add constraint "e_race_results_race_id_division_id_reporting_level_key" UNIQUE using index "e_race_results_race_id_division_id_reporting_level_key";

alter table "public"."e_race_results" add constraint "e_race_results_race_id_fkey" FOREIGN KEY (race_id) REFERENCES public.e_races(id) ON DELETE CASCADE not valid;

alter table "public"."e_race_results" validate constraint "e_race_results_race_id_fkey";

alter table "public"."e_race_results" add constraint "e_race_results_winner_candidate_id_fkey" FOREIGN KEY (winner_candidate_id) REFERENCES public.e_candidates(id) not valid;

alter table "public"."e_race_results" validate constraint "e_race_results_winner_candidate_id_fkey";

alter table "public"."e_race_results" add constraint "e_race_results_winner_override_candidate_id_fkey" FOREIGN KEY (winner_override_candidate_id) REFERENCES public.e_candidates(id) not valid;

alter table "public"."e_race_results" validate constraint "e_race_results_winner_override_candidate_id_fkey";

alter table "public"."e_races" add constraint "e_races_division_id_fkey" FOREIGN KEY (division_id) REFERENCES public.e_geographic_divisions(id) not valid;

alter table "public"."e_races" validate constraint "e_races_division_id_fkey";

alter table "public"."e_races" add constraint "e_races_election_id_fkey" FOREIGN KEY (election_id) REFERENCES public.e_elections(id) ON DELETE CASCADE not valid;

alter table "public"."e_races" validate constraint "e_races_election_id_fkey";

alter table "public"."e_races" add constraint "e_races_race_id_key" UNIQUE using index "e_races_race_id_key";

alter table "public"."f_stocks" add constraint "alpaca_stocks_symbol_unique" UNIQUE using index "alpaca_stocks_symbol_unique";

alter table "public"."f_stocks" add constraint "alpaca_stocks_type_check" CHECK ((type = ANY (ARRAY['EQUITY'::text, 'ETF'::text, 'INDEX'::text, 'CRYPTO'::text, 'us_equity'::text, 'crypto'::text]))) not valid;

alter table "public"."f_stocks" validate constraint "alpaca_stocks_type_check";

alter table "public"."feeds" add constraint "feeds_category_check" CHECK ((category = ANY (ARRAY['Elections'::text, 'Finance'::text, 'Sports'::text, 'Weather'::text, 'News'::text]))) not valid;

alter table "public"."feeds" validate constraint "feeds_category_check";

alter table "public"."feeds" add constraint "feeds_type_check" CHECK ((type = ANY (ARRAY['REST API'::text, 'Database'::text, 'File'::text, 'Webhook'::text]))) not valid;

alter table "public"."feeds" validate constraint "feeds_type_check";

alter table "public"."file_sync_queue" add constraint "file_sync_queue_data_source_id_fkey" FOREIGN KEY (data_source_id) REFERENCES public.data_sources(id) not valid;

alter table "public"."file_sync_queue" validate constraint "file_sync_queue_data_source_id_fkey";

alter table "public"."item_tabfields" add constraint "item_tabfields_content_id_name_key" UNIQUE using index "item_tabfields_content_id_name_key";

alter table "public"."item_tabfields" add constraint "item_tabfields_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.content(id) ON DELETE CASCADE not valid;

alter table "public"."item_tabfields" validate constraint "item_tabfields_item_id_fkey";

alter table "public"."map_settings" add constraint "unique_user_map_settings" UNIQUE using index "unique_user_map_settings";

alter table "public"."map_settings" add constraint "valid_latitude" CHECK (((default_latitude >= ('-90'::integer)::numeric) AND (default_latitude <= (90)::numeric))) not valid;

alter table "public"."map_settings" validate constraint "valid_latitude";

alter table "public"."map_settings" add constraint "valid_longitude" CHECK (((default_longitude >= ('-180'::integer)::numeric) AND (default_longitude <= (180)::numeric))) not valid;

alter table "public"."map_settings" validate constraint "valid_longitude";

alter table "public"."map_settings" add constraint "valid_zoom" CHECK (((default_zoom >= (0)::numeric) AND (default_zoom <= (22)::numeric))) not valid;

alter table "public"."map_settings" validate constraint "valid_zoom";

alter table "public"."media_assets" add constraint "check_latitude_range" CHECK (((latitude IS NULL) OR ((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric)))) not valid;

alter table "public"."media_assets" validate constraint "check_latitude_range";

alter table "public"."media_assets" add constraint "check_longitude_range" CHECK (((longitude IS NULL) OR ((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric)))) not valid;

alter table "public"."media_assets" validate constraint "check_longitude_range";

alter table "public"."media_assets" add constraint "media_assets_media_type_check" CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text, 'audio'::text, 'other'::text]))) not valid;

alter table "public"."media_assets" validate constraint "media_assets_media_type_check";

alter table "public"."media_distribution" add constraint "media_distribution_media_id_fkey" FOREIGN KEY (media_id) REFERENCES public.media_assets(id) ON DELETE CASCADE not valid;

alter table "public"."media_distribution" validate constraint "media_distribution_media_id_fkey";

alter table "public"."media_distribution" add constraint "media_distribution_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'synced'::text, 'error'::text]))) not valid;

alter table "public"."media_distribution" validate constraint "media_distribution_status_check";

alter table "public"."media_distribution" add constraint "media_distribution_system_id_fkey" FOREIGN KEY (system_id) REFERENCES public.systems(id) ON DELETE CASCADE not valid;

alter table "public"."media_distribution" validate constraint "media_distribution_system_id_fkey";

alter table "public"."media_push_queue" add constraint "media_push_queue_media_id_fkey" FOREIGN KEY (media_id) REFERENCES public.media_assets(id) ON DELETE CASCADE not valid;

alter table "public"."media_push_queue" validate constraint "media_push_queue_media_id_fkey";

alter table "public"."media_push_queue" add constraint "media_push_queue_method_check" CHECK ((method = ANY (ARRAY['http'::text, 'smb'::text, 'ftp'::text, 'rsync'::text]))) not valid;

alter table "public"."media_push_queue" validate constraint "media_push_queue_method_check";

alter table "public"."media_push_queue" add constraint "media_push_queue_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'success'::text, 'failed'::text]))) not valid;

alter table "public"."media_push_queue" validate constraint "media_push_queue_status_check";

alter table "public"."media_push_queue" add constraint "media_push_queue_system_id_fkey" FOREIGN KEY (system_id) REFERENCES public.systems(id) ON DELETE CASCADE not valid;

alter table "public"."media_push_queue" validate constraint "media_push_queue_system_id_fkey";

alter table "public"."media_tags" add constraint "media_tags_media_id_fkey" FOREIGN KEY (media_id) REFERENCES public.media_assets(id) ON DELETE CASCADE not valid;

alter table "public"."media_tags" validate constraint "media_tags_media_id_fkey";

alter table "public"."media_tags" add constraint "media_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE not valid;

alter table "public"."media_tags" validate constraint "media_tags_tag_id_fkey";

alter table "public"."school_closings" add constraint "school_closings_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES public.data_providers(id) ON DELETE SET NULL not valid;

alter table "public"."school_closings" validate constraint "school_closings_provider_id_fkey";

alter table "public"."school_closings" add constraint "school_closings_provider_id_organization_name_status_day_key" UNIQUE using index "school_closings_provider_id_organization_name_status_day_key";

alter table "public"."sports_events" add constraint "sports_events_event_id_key" UNIQUE using index "sports_events_event_id_key";

alter table "public"."sports_events" add constraint "sports_events_sport_check" CHECK ((sport = ANY (ARRAY['NFL'::text, 'NBA'::text, 'MLB'::text, 'NHL'::text, 'NCAA'::text, 'SOCCER'::text, 'TENNIS'::text, 'GOLF'::text]))) not valid;

alter table "public"."sports_events" validate constraint "sports_events_sport_check";

alter table "public"."sports_events" add constraint "sports_events_status_check" CHECK ((status = ANY (ARRAY['SCHEDULED'::text, 'LIVE'::text, 'FINAL'::text, 'POSTPONED'::text, 'CANCELLED'::text]))) not valid;

alter table "public"."sports_events" validate constraint "sports_events_status_check";

alter table "public"."sports_teams" add constraint "fk_league" FOREIGN KEY (league_id) REFERENCES public.sports_leagues(id) ON DELETE CASCADE not valid;

alter table "public"."sports_teams" validate constraint "fk_league";

alter table "public"."sync_queue" add constraint "sync_queue_data_source_id_fkey" FOREIGN KEY (data_source_id) REFERENCES public.data_sources(id) ON DELETE CASCADE not valid;

alter table "public"."sync_queue" validate constraint "sync_queue_data_source_id_fkey";

alter table "public"."sync_queue" add constraint "sync_queue_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text]))) not valid;

alter table "public"."sync_queue" validate constraint "sync_queue_status_check";

alter table "public"."systems" add constraint "systems_system_type_check" CHECK ((system_type = ANY (ARRAY['Vizrt'::text, 'Unreal'::text, 'Pixera'::text, 'Web'::text, 'Disguise'::text, 'Archive'::text, 'Other'::text]))) not valid;

alter table "public"."systems" validate constraint "systems_system_type_check";

alter table "public"."tabfields" add constraint "tabfields_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE not valid;

alter table "public"."tabfields" validate constraint "tabfields_template_id_fkey";

alter table "public"."tabfields" add constraint "tabfields_template_id_name_key" UNIQUE using index "tabfields_template_id_name_key";

alter table "public"."tabfields" add constraint "tabfields_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."tabfields" validate constraint "tabfields_user_id_fkey";

alter table "public"."tags" add constraint "tags_name_key" UNIQUE using index "tags_name_key";

alter table "public"."template_forms" add constraint "template_forms_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE not valid;

alter table "public"."template_forms" validate constraint "template_forms_template_id_fkey";

alter table "public"."template_settings" add constraint "template_settings_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE not valid;

alter table "public"."template_settings" validate constraint "template_settings_template_id_fkey";

alter table "public"."templates" add constraint "templates_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.templates(id) ON DELETE CASCADE not valid;

alter table "public"."templates" validate constraint "templates_parent_id_fkey";

alter table "public"."templates" add constraint "templates_type_check" CHECK ((type = ANY (ARRAY['templateFolder'::text, 'template'::text]))) not valid;

alter table "public"."templates" validate constraint "templates_type_check";

alter table "public"."templates" add constraint "templates_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."templates" validate constraint "templates_user_id_fkey";

alter table "public"."user_groups" add constraint "groups_name_key" UNIQUE using index "groups_name_key";

alter table "public"."user_layouts" add constraint "user_layouts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_layouts" validate constraint "user_layouts_user_id_fkey";

alter table "public"."user_layouts" add constraint "user_layouts_user_id_layout_name_key" UNIQUE using index "user_layouts_user_id_layout_name_key";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

alter table "public"."users" add constraint "users_role_check" CHECK ((role = ANY (ARRAY['ADMIN'::text, 'EDITOR'::text, 'VIEWER'::text, 'ANALYST'::text]))) not valid;

alter table "public"."users" validate constraint "users_role_check";

alter table "public"."users" add constraint "users_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text, 'SUSPENDED'::text]))) not valid;

alter table "public"."users" validate constraint "users_status_check";

alter table "public"."weather_air_quality" add constraint "weather_air_quality_location_id_as_of_key" UNIQUE using index "weather_air_quality_location_id_as_of_key";

alter table "public"."weather_air_quality" add constraint "weather_air_quality_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.weather_locations(id) ON DELETE CASCADE not valid;

alter table "public"."weather_air_quality" validate constraint "weather_air_quality_location_id_fkey";

alter table "public"."weather_alerts" add constraint "weather_alerts_id_location_id_key" UNIQUE using index "weather_alerts_id_location_id_key";

alter table "public"."weather_alerts" add constraint "weather_alerts_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.weather_locations(id) ON DELETE CASCADE not valid;

alter table "public"."weather_alerts" validate constraint "weather_alerts_location_id_fkey";

alter table "public"."weather_alerts" add constraint "weather_alerts_unique" UNIQUE using index "weather_alerts_unique";

alter table "public"."weather_alerts" add constraint "weather_alerts_unique_location_alert" UNIQUE using index "weather_alerts_unique_location_alert";

alter table "public"."weather_current" add constraint "weather_current_cloud_cover_check" CHECK (((cloud_cover >= 0) AND (cloud_cover <= 100))) not valid;

alter table "public"."weather_current" validate constraint "weather_current_cloud_cover_check";

alter table "public"."weather_current" add constraint "weather_current_humidity_check" CHECK (((humidity >= 0) AND (humidity <= 100))) not valid;

alter table "public"."weather_current" validate constraint "weather_current_humidity_check";

alter table "public"."weather_current" add constraint "weather_current_location_id_as_of_key" UNIQUE using index "weather_current_location_id_as_of_key";

alter table "public"."weather_current" add constraint "weather_current_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.weather_locations(id) ON DELETE CASCADE not valid;

alter table "public"."weather_current" validate constraint "weather_current_location_id_fkey";

alter table "public"."weather_current" add constraint "weather_current_location_id_key" UNIQUE using index "weather_current_location_id_key";

alter table "public"."weather_current" add constraint "weather_current_unique" UNIQUE using index "weather_current_unique";

alter table "public"."weather_current" add constraint "weather_current_wind_direction_deg_check" CHECK (((wind_direction_deg >= (0)::numeric) AND (wind_direction_deg < (360)::numeric))) not valid;

alter table "public"."weather_current" validate constraint "weather_current_wind_direction_deg_check";

alter table "public"."weather_daily_forecast" add constraint "weather_daily_forecast_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.weather_locations(id) ON DELETE CASCADE not valid;

alter table "public"."weather_daily_forecast" validate constraint "weather_daily_forecast_location_id_fkey";

alter table "public"."weather_daily_forecast" add constraint "weather_daily_forecast_precip_probability_check" CHECK (((precip_probability >= (0)::numeric) AND (precip_probability <= (100)::numeric))) not valid;

alter table "public"."weather_daily_forecast" validate constraint "weather_daily_forecast_precip_probability_check";

alter table "public"."weather_daily_forecast" add constraint "weather_daily_forecast_unique" UNIQUE using index "weather_daily_forecast_unique";

alter table "public"."weather_hourly_forecast" add constraint "weather_hourly_forecast_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.weather_locations(id) ON DELETE CASCADE not valid;

alter table "public"."weather_hourly_forecast" validate constraint "weather_hourly_forecast_location_id_fkey";

alter table "public"."weather_hourly_forecast" add constraint "weather_hourly_forecast_location_id_forecast_time_provider__key" UNIQUE using index "weather_hourly_forecast_location_id_forecast_time_provider__key";

alter table "public"."weather_hourly_forecast" add constraint "weather_hourly_forecast_precip_probability_check" CHECK (((precip_probability >= 0) AND (precip_probability <= 100))) not valid;

alter table "public"."weather_hourly_forecast" validate constraint "weather_hourly_forecast_precip_probability_check";

alter table "public"."weather_hourly_forecast" add constraint "weather_hourly_forecast_unique" UNIQUE using index "weather_hourly_forecast_unique";

alter table "public"."weather_locations" add constraint "weather_locations_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE SET NULL not valid;

alter table "public"."weather_locations" validate constraint "weather_locations_channel_id_fkey";

alter table "public"."weather_locations" add constraint "weather_locations_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES public.data_providers(id) ON DELETE SET NULL not valid;

alter table "public"."weather_locations" validate constraint "weather_locations_provider_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public._normalize_custom_name()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    new.custom_name := nullif(btrim(new.custom_name), '');
    if new.custom_name is not null and length(new.custom_name) > 80 then
      new.custom_name := left(new.custom_name, 80);
    end if;
  end if;
  return new;
end;
$function$
;

create or replace view "public"."ai_providers_public" as  SELECT ai_providers.id,
    ai_providers.name,
    ai_providers.provider_name,
    ai_providers.type,
    ai_providers.description,
    ai_providers.endpoint,
    ai_providers.model,
    ai_providers.available_models,
    ai_providers.enabled,
    ai_providers.rate_limit_per_minute,
    ai_providers.max_tokens,
    ai_providers.temperature,
    ai_providers.top_p,
    ai_providers.dashboard_assignments,
    ai_providers.created_at,
    ai_providers.updated_at
   FROM public.ai_providers;


create or replace view "public"."bop_election_summary" as  SELECT er.id,
    er.office,
    er.race_type,
    er.election_year,
    er."timestamp",
    pr.party_name,
    pr.won,
    pr."leading",
    pr.holdovers,
    pr.winning_trend,
    pr.current_seats,
    nc.winners_change,
    nc.leaders_change
   FROM ((public.bop_election_results er
     JOIN public.bop_party_results pr ON ((er.id = pr.election_result_id)))
     LEFT JOIN public.bop_net_changes nc ON ((pr.id = nc.party_result_id)))
  ORDER BY er."timestamp" DESC, pr.party_name;


CREATE OR REPLACE FUNCTION public.calculate_next_sync_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only calculate if it's a file type with sync enabled
  IF NEW.type = 'file' 
     AND (NEW.sync_config->>'enabled')::boolean = true 
     AND NEW.active = true THEN
    
    -- If sync was just enabled or interval changed
    IF (OLD.sync_config->>'enabled')::boolean IS DISTINCT FROM true
       OR (OLD.sync_config->>'interval')::int IS DISTINCT FROM (NEW.sync_config->>'interval')::int
       OR NEW.next_sync_at IS NULL THEN
      
      -- Set next sync time based on interval
      NEW.next_sync_at = NOW() + ((NEW.sync_config->>'interval')::int || ' minutes')::interval;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_trigger_syncs()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    integration record;
    supabase_url text;
    anon_key text;
    function_name text;
    response record;
    interval_seconds integer;
    time_since_last_sync interval;
    is_due boolean;
BEGIN
    -- Get configuration
    SELECT value INTO supabase_url FROM sync_config WHERE key = 'supabase_url';
    SELECT value INTO anon_key FROM sync_config WHERE key = 'anon_key';
    
    IF anon_key IS NULL OR supabase_url IS NULL THEN
        RAISE WARNING 'Missing configuration. Please set supabase_url and anon_key in sync_config table.';
        RETURN;
    END IF;
    
    -- Process each active integration with sync enabled
    FOR integration IN 
        SELECT 
            id, 
            name, 
            type,
            sync_config,
            last_sync_at,
            next_sync_at,
            sync_status,
            -- Calculate interval in seconds for comparison
            CASE 
                WHEN (sync_config->>'intervalUnit') = 'seconds' THEN
                    (sync_config->>'interval')::integer
                WHEN (sync_config->>'intervalUnit') = 'minutes' THEN
                    (sync_config->>'interval')::integer * 60
                WHEN (sync_config->>'intervalUnit') = 'hours' THEN
                    (sync_config->>'interval')::integer * 3600
                WHEN (sync_config->>'intervalUnit') = 'days' THEN
                    (sync_config->>'interval')::integer * 86400
                ELSE 3600  -- Default to 1 hour
            END as interval_seconds
        FROM data_sources
        WHERE active = true
        AND (sync_config->>'enabled')::boolean = true
        AND sync_status != 'running'  -- Skip already running syncs
    LOOP
        -- Check if sync is due
        IF integration.next_sync_at IS NOT NULL THEN
            -- Use next_sync_at if available
            is_due := NOW() >= integration.next_sync_at;
        ELSIF integration.last_sync_at IS NULL THEN
            -- Never synced before
            is_due := true;
            RAISE NOTICE '[%] % never synced before - triggering initial sync', 
                        NOW()::time, integration.name;
        ELSE
            -- Calculate based on last_sync_at and interval
            time_since_last_sync := NOW() - integration.last_sync_at;
            is_due := EXTRACT(EPOCH FROM time_since_last_sync) >= integration.interval_seconds;
        END IF;
        
        IF is_due THEN
            RAISE NOTICE '[%] Triggering sync for % (type: %)', 
                        NOW()::time, integration.name, integration.type;
        END IF;
        
        -- Trigger sync if due
        IF is_due THEN
            BEGIN
                -- Determine the edge function to call based on type
                function_name := format('sync-%s-integration', integration.type);
                
                -- Update status to running
                UPDATE data_sources 
                SET sync_status = 'running',
                    updated_at = NOW()
                WHERE id = integration.id;
                
                -- Call the edge function via HTTP
                SELECT * INTO response FROM net.http_post(
                    url := format('%s/functions/v1/%s', supabase_url, function_name),
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || anon_key
                    )::jsonb,
                    body := jsonb_build_object(
                        'dataSourceId', integration.id::text,
                        'force', false
                    )::jsonb
                );
                
                -- Handle response
                IF response.status_code BETWEEN 200 AND 299 THEN
                    -- Success - update sync information
                    UPDATE data_sources 
                    SET 
                        last_sync_at = NOW(),
                        sync_status = 'success',
                        next_sync_at = NOW() + 
                            CASE 
                                WHEN (sync_config->>'intervalUnit') = 'seconds' THEN
                                    format('%s seconds', sync_config->>'interval')::interval
                                WHEN (sync_config->>'intervalUnit') = 'minutes' THEN
                                    format('%s minutes', sync_config->>'interval')::interval
                                WHEN (sync_config->>'intervalUnit') = 'hours' THEN
                                    format('%s hours', sync_config->>'interval')::interval
                                WHEN (sync_config->>'intervalUnit') = 'days' THEN
                                    format('%s days', sync_config->>'interval')::interval
                                ELSE INTERVAL '1 hour'
                            END,
                        last_sync_result = response.body::jsonb,
                        last_sync_count = COALESCE((response.body::jsonb->>'itemsProcessed')::integer, 0),
                        last_sync_error = NULL,  -- Clear any previous error
                        updated_at = NOW()
                    WHERE id = integration.id;
                    
                    RAISE NOTICE 'Successfully synced % - Status: %', 
                                integration.name, response.status_code;
                ELSE
                    -- Error - update with error information
                    UPDATE data_sources 
                    SET 
                        sync_status = 'error',
                        last_sync_error = format('HTTP %s: %s', 
                                               response.status_code, 
                                               LEFT(response.body::text, 500)),  -- Limit error message length
                        updated_at = NOW()
                    WHERE id = integration.id;
                    
                    RAISE WARNING 'Sync failed for % - HTTP %', 
                                integration.name, response.status_code;
                END IF;
                
            EXCEPTION WHEN OTHERS THEN
                -- Handle any exceptions during sync
                RAISE WARNING 'Error syncing %: %', integration.name, SQLERRM;
                
                UPDATE data_sources 
                SET sync_status = 'error',
                    last_sync_error = LEFT(SQLERRM, 500),  -- Limit error message length
                    updated_at = NOW()
                WHERE id = integration.id;
            END;
        END IF;
    END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_pg_net_request(request_id bigint)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    response_record RECORD;
    pending_record RECORD;
BEGIN
    -- Check _http_response table
    SELECT * INTO response_record
    FROM net._http_response
    WHERE id = request_id;
    
    -- Check http_request_queue (pending requests)
    SELECT * INTO pending_record
    FROM net.http_request_queue
    WHERE id = request_id;
    
    RETURN json_build_object(
        'request_id', request_id,
        'response_exists', response_record IS NOT NULL,
        'response_status', response_record.status_code,
        'response_created', response_record.created,
        'pending_exists', pending_record IS NOT NULL,
        'pending_status', pending_record.status,
        'pending_created', pending_record.created
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_sync_intervals_detailed()
 RETURNS TABLE(data_source_id uuid, name text, sync_enabled boolean, interval_value integer, interval_unit text, interval_string text, check_time timestamp with time zone, next_sync_calculated timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        ds.id,
        ds.name::TEXT,  -- Cast VARCHAR to TEXT
        COALESCE((ds.sync_config->>'enabled')::boolean, true) as sync_enabled,
        COALESCE((ds.sync_config->>'interval')::INTEGER, 60) as interval_value,
        COALESCE(ds.sync_config->>'intervalUnit', 'minutes')::TEXT as interval_unit,  -- Cast to TEXT
        (COALESCE((ds.sync_config->>'interval')::INTEGER, 60) || ' ' || 
            COALESCE(ds.sync_config->>'intervalUnit', 'minutes'))::TEXT as interval_string,  -- Cast to TEXT
        NOW() as check_time,
        NOW() + (
            COALESCE((ds.sync_config->>'interval')::INTEGER, 60) || ' ' || 
            COALESCE(ds.sync_config->>'intervalUnit', 'minutes')
        )::INTERVAL as next_sync_calculated
    FROM data_sources ds
    WHERE ds.type = 'file'
    AND ds.active = true
    ORDER BY ds.name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_sync_results()
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    recent_response RECORD;
    recent_items INTEGER;
    queue_stats json;
BEGIN
    -- Get most recent Edge Function response
    SELECT * INTO recent_response
    FROM net._http_response
    WHERE content::text LIKE '%processed%'
    ORDER BY id DESC
    LIMIT 1;
    
    -- Count recently created items
    SELECT COUNT(*) INTO recent_items
    FROM content
    WHERE type = 'item'
    AND created_at > NOW() - INTERVAL '10 minutes';
    
    -- Get queue stats
    SELECT json_object_agg(status, count) INTO queue_stats
    FROM (
        SELECT status, COUNT(*) as count
        FROM file_sync_queue
        GROUP BY status
    ) s;
    
    RETURN json_build_object(
        'last_sync_response', recent_response.content::json,
        'recent_items_created', recent_items,
        'queue_status', queue_stats,
        'last_sync_time', recent_response.created
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_log_tables()
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    debug_log_deleted INTEGER := 0;
    sync_logs_deleted INTEGER := 0;
    sync_logs_old_deleted INTEGER := 0;
    queue_deleted INTEGER := 0;
BEGIN
    -- Clean debug_log table
    -- Keep only last 3 days of debug logs
    DELETE FROM debug_log
    WHERE created_at < NOW() - INTERVAL '3 days';
    GET DIAGNOSTICS debug_log_deleted = ROW_COUNT;
    
    -- Clean data_source_sync_logs table
    -- Keep last 7 days of error logs, 1 day of success logs
    DELETE FROM data_source_sync_logs
    WHERE (status = 'success' AND created_at < NOW() - INTERVAL '1 day')
       OR (status = 'error' AND created_at < NOW() - INTERVAL '7 days')
       OR (status = 'debug' AND created_at < NOW() - INTERVAL '1 day');
    GET DIAGNOSTICS sync_logs_deleted = ROW_COUNT;
    
    -- Also clean very old logs regardless of status (30 days)
    DELETE FROM data_source_sync_logs
    WHERE created_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS sync_logs_old_deleted = ROW_COUNT;
    
    -- Clean old completed items from file_sync_queue
    DELETE FROM file_sync_queue
    WHERE status = 'completed'
    AND processed_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS queue_deleted = ROW_COUNT;
    
    -- Log the cleanup action itself (but this will be cleaned up in future runs)
    INSERT INTO data_source_sync_logs (status, error_message)
    VALUES ('success', format('Cleanup: deleted %s debug logs, %s sync logs, %s old sync logs, %s queue items',
                              debug_log_deleted, sync_logs_deleted, sync_logs_old_deleted, queue_deleted));
    
    RETURN json_build_object(
        'debug_log_deleted', debug_log_deleted,
        'sync_logs_deleted', sync_logs_deleted,
        'sync_logs_old_deleted', sync_logs_old_deleted,
        'queue_deleted', queue_deleted,
        'total_deleted', debug_log_deleted + sync_logs_deleted + sync_logs_old_deleted + queue_deleted
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_agent_runs()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_deleted INT;
BEGIN
  WITH runs_to_keep AS (
    SELECT id
    FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY agent_id ORDER BY started_at DESC) as rn
      FROM agent_runs
    ) ranked
    WHERE rn <= 1000
  )
  DELETE FROM agent_runs
  WHERE id NOT IN (SELECT id FROM runs_to_keep);
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_drafts()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Delete drafts older than 24 hours
  DELETE FROM api_endpoints 
  WHERE is_draft = true 
  AND created_at < NOW() - INTERVAL '24 hours';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_weather_data()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Delete hourly forecasts older than 30 days
    DELETE FROM weather_hourly_forecast
    WHERE fetched_at < NOW() - INTERVAL '30 days';
    
    -- Delete daily forecasts older than 60 days
    DELETE FROM weather_daily_forecast
    WHERE fetched_at < NOW() - INTERVAL '60 days';
    
    -- Delete current conditions older than 7 days
    DELETE FROM weather_current
    WHERE fetched_at < NOW() - INTERVAL '7 days';
    
    -- Delete air quality data older than 30 days
    DELETE FROM weather_air_quality
    WHERE fetched_at < NOW() - INTERVAL '30 days';
    
    -- Delete expired alerts
    DELETE FROM weather_alerts
    WHERE end_time < NOW() - INTERVAL '7 days';
    
    RAISE NOTICE 'Old weather data cleaned up successfully';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_stuck_syncs()
 RETURNS TABLE(cleaned_id uuid, cleaned_name text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  UPDATE data_sources 
  SET 
    sync_status = 'error',
    last_sync_error = 'Sync timeout - automatically reset after ' || 
                      EXTRACT(EPOCH FROM (NOW() - last_sync_at))::int || ' seconds'
  WHERE 
    sync_status = 'running'
    AND type = 'file'
    AND last_sync_at < NOW() - INTERVAL '5 minutes'
  RETURNING id, name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_data_provider(_type text, _category text, _name text, _id text DEFAULT NULL::text, _description text DEFAULT NULL::text, _is_active boolean DEFAULT true, _api_key text DEFAULT NULL::text, _api_secret text DEFAULT NULL::text, _base_url text DEFAULT NULL::text, _api_version text DEFAULT NULL::text, _config jsonb DEFAULT '{}'::jsonb, _source_url text DEFAULT NULL::text, _storage_path text DEFAULT NULL::text, _refresh_interval_minutes integer DEFAULT NULL::integer, _last_run timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  _record RECORD;
  _new_id TEXT;
BEGIN
  -- Auto-generate ID if not provided
  _new_id := COALESCE(_id, CONCAT(_category, '_provider:', _type));

  INSERT INTO public.data_providers (
    id,
    type,
    category,
    name,
    description,
    is_active,
    api_key,
    api_secret,
    base_url,
    api_version,
    config,
    source_url,
    storage_path,
    refresh_interval_minutes,
    last_run,
    created_at,
    updated_at
  )
  VALUES (
    _new_id,
    _type,
    _category,
    _name,
    _description,
    _is_active,
    _api_key,
    _api_secret,
    _base_url,
    _api_version,
    _config,
    _source_url,
    _storage_path,
    _refresh_interval_minutes,
    _last_run,
    NOW(),
    NOW()
  )
  RETURNING * INTO _record;

  RETURN to_jsonb(_record);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Data provider with id % already exists', _new_id;
  WHEN others THEN
    RAISE EXCEPTION 'Error creating data provider: %', SQLERRM;
END;
$function$
;

create or replace view "public"."data_providers_public" as  SELECT data_providers.id,
    data_providers.type,
    data_providers.category,
    data_providers.name,
    data_providers.description,
    data_providers.is_active,
    data_providers.base_url,
    data_providers.api_version,
    data_providers.config,
    data_providers.source_url,
    data_providers.storage_path,
        CASE
            WHEN (data_providers.api_key IS NOT NULL) THEN '****'::text
            ELSE NULL::text
        END AS api_key,
        CASE
            WHEN (data_providers.api_secret IS NOT NULL) THEN '****'::text
            ELSE NULL::text
        END AS api_secret,
    data_providers.created_at,
    data_providers.updated_at
   FROM public.data_providers;


CREATE OR REPLACE FUNCTION public.debug_auth_uid()
 RETURNS TABLE(current_uid uuid, current_role_name text, is_authenticated boolean)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    SELECT 
        auth.uid() as current_uid,
        auth.role() as current_role_name,
        (auth.role() = 'authenticated') as is_authenticated;
$function$
;

CREATE OR REPLACE FUNCTION public.debug_get_user_layout(p_layout_name text DEFAULT 'main'::text)
 RETURNS TABLE(found_user_id uuid, auth_user_id uuid, layout_exists boolean, layout_data jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ul.user_id as found_user_id,
    auth.uid() as auth_user_id,
    (ul.layout_data IS NOT NULL) as layout_exists,
    ul.layout_data
  FROM user_layouts ul
  WHERE ul.user_id = auth.uid()
  AND ul.layout_name = p_layout_name;
  
  -- If no rows found, return debug info
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      NULL::uuid as found_user_id,
      auth.uid() as auth_user_id,
      false as layout_exists,
      NULL::jsonb as layout_data;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_data_provider(_id text DEFAULT NULL::text, _type text DEFAULT NULL::text, _category text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  _deleted RECORD;
BEGIN
  -- ========================================================
  -- Determine which provider to delete
  -- ========================================================
  IF _id IS NULL AND (_type IS NULL OR _category IS NULL) THEN
    RAISE EXCEPTION 'You must provide either _id OR both _type and _category';
  END IF;

  -- ========================================================
  -- Perform the deletion
  -- ========================================================
  DELETE FROM public.data_providers
  WHERE id = COALESCE(_id, CONCAT(_category, '_provider:', _type))
  RETURNING * INTO _deleted;

  -- ========================================================
  -- Return result
  -- ========================================================
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No data provider found with ID or type/category provided';
  END IF;

  RETURN to_jsonb(_deleted);
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error deleting data provider: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_map_position(p_user_id uuid, p_position_id uuid)
 RETURNS public.map_settings
 LANGUAGE plpgsql
AS $function$
DECLARE
  updated map_settings;
BEGIN
  UPDATE map_settings
  SET saved_positions = (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(saved_positions) elem
    WHERE (elem->>'id')::uuid <> p_position_id
  ),
  updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO updated;

  RETURN updated;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.e_calculate_party_strength(p_party_id uuid, p_election_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(division_id uuid, division_name character varying, total_races integer, races_won integer, win_percentage numeric, avg_vote_share numeric, total_votes bigint)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.e_calculate_vote_percentages()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.e_get_effective_value(original_value anyelement, override_value anyelement)
 RETURNS anyelement
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
    RETURN COALESCE(override_value, original_value);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.e_log_override_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.e_merge_parties(source_party_id uuid, target_party_id uuid, update_references boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
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
$function$
;

create or replace view "public"."e_race_results_effective" as  SELECT e_race_results.id,
    e_race_results.race_id,
    e_race_results.division_id,
    e_race_results.reporting_level,
    public.e_get_effective_value(e_race_results.precincts_reporting, e_race_results.precincts_reporting_override) AS precincts_reporting,
    public.e_get_effective_value(e_race_results.precincts_total, e_race_results.precincts_total_override) AS precincts_total,
    public.e_get_effective_value(e_race_results.percent_reporting, e_race_results.percent_reporting_override) AS percent_reporting,
    public.e_get_effective_value(e_race_results.registered_voters, e_race_results.registered_voters_override) AS registered_voters,
    public.e_get_effective_value(e_race_results.total_votes, e_race_results.total_votes_override) AS total_votes,
    public.e_get_effective_value(e_race_results.called, e_race_results.called_override) AS called,
    public.e_get_effective_value(e_race_results.called_status, e_race_results.called_status_override) AS called_status,
        CASE
            WHEN (e_race_results.called_override IS NOT NULL) THEN e_race_results.called_override_timestamp
            ELSE e_race_results.called_timestamp
        END AS called_timestamp,
    public.e_get_effective_value(e_race_results.winner_candidate_id, e_race_results.winner_override_candidate_id) AS winner_candidate_id,
    public.e_get_effective_value(e_race_results.recount_status, e_race_results.recount_status_override) AS recount_status,
    e_race_results.last_updated,
    e_race_results.metadata,
    e_race_results.created_at,
    e_race_results.updated_at,
        CASE
            WHEN (e_race_results.override_at IS NOT NULL) THEN jsonb_build_object('has_override', true, 'override_by', e_race_results.override_by, 'override_at', e_race_results.override_at, 'override_reason', e_race_results.override_reason, 'approved_by', e_race_results.override_approved_by, 'approved_at', e_race_results.override_approved_at)
            ELSE jsonb_build_object('has_override', false)
        END AS override_info
   FROM public.e_race_results;


CREATE OR REPLACE FUNCTION public.e_update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_schema_not_null()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.schema IS NULL THEN
    NEW.schema := '{}'::jsonb;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fetch_bop_data(p_election_year integer DEFAULT NULL::integer, p_race_type character varying DEFAULT NULL::character varying)
 RETURNS TABLE(election_year integer, race_type character varying, party_name character varying, won integer, "leading" integer, holdovers integer, winning_trend integer, current_seats integer, insufficient_vote integer, total_seats integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET statement_timeout TO '10s'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.fetch_county_data_extended(p_race_type text, p_year integer, p_offset integer DEFAULT 0, p_limit integer DEFAULT 5000)
 RETURNS TABLE(votes integer, vote_percentage numeric, winner boolean, candidate_id text, full_name text, incumbent boolean, photo_url text, party_abbreviation text, party_name text, color_hex text, state_code text, fips_code text, county_name text, election_year integer, election_name text, percent_reporting numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET statement_timeout TO '60s'
AS $function$
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
  ORDER BY cr.id
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fetch_election_data_for_api(p_year integer DEFAULT NULL::integer, p_race_type character varying DEFAULT NULL::character varying, p_level character varying DEFAULT NULL::character varying)
 RETURNS TABLE(last_fetch_at timestamp with time zone, election_id character varying, election_name text, year integer, race_id uuid, race_race_id character varying, race_name character varying, race_display_name character varying, office character varying, race_type character varying, num_elect integer, uncontested boolean, division_type character varying, state_code character varying, fips_code character varying, race_results_id uuid, called boolean, called_status character varying, percent_reporting numeric, last_updated timestamp with time zone, precincts_reporting integer, precincts_total integer, called_timestamp timestamp with time zone, total_votes integer, candidate_id character varying, full_name character varying, first_name character varying, last_name character varying, candidate_display_name character varying, party_code character varying, party_name character varying, party_color_primary character varying, party_color_secondary character varying, party_color_light character varying, party_color_dark character varying, party_short_name character varying, party_display_name character varying, party_founded_year character varying, party_description text, party_ideology character varying, party_headquarters text, party_history text, party_website character varying, party_twitter character varying, party_facebook character varying, party_instagram character varying, party_leadership jsonb, party_abbreviations text[], party_aliases text[], candidate_results_id uuid, votes integer, vote_percentage numeric, incumbent boolean, winner boolean, photo_url character varying, race_candidates_id uuid, ballot_order integer, withdrew boolean, electoral_votes integer, state_electoral_votes integer, bio text, date_of_birth date, bio_short text, education text[], professional_background text[], political_experience text[], website character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET statement_timeout TO '30s'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.fetch_election_data_for_ui(p_year integer DEFAULT NULL::integer)
 RETURNS TABLE(last_fetch_at timestamp with time zone, election_id character varying, election_name text, year integer, race_id uuid, race_race_id character varying, race_name character varying, race_display_name character varying, office character varying, race_type character varying, num_elect integer, uncontested boolean, division_type character varying, state_code character varying, fips_code character varying, race_results_id uuid, called boolean, called_status character varying, percent_reporting numeric, last_updated timestamp with time zone, precincts_reporting integer, precincts_total integer, called_timestamp timestamp with time zone, total_votes integer, called_override boolean, called_status_override character varying, percent_reporting_override numeric, precincts_reporting_override integer, precincts_total_override integer, called_override_timestamp timestamp with time zone, total_votes_override integer, candidate_id character varying, full_name character varying, first_name character varying, last_name character varying, candidate_display_name character varying, party_code character varying, party_name character varying, party_color_primary character varying, party_color_secondary character varying, party_color_light character varying, party_color_dark character varying, party_color_primary_override character varying, party_short_name character varying, party_display_name character varying, party_founded_year character varying, party_description text, party_ideology character varying, party_headquarters text, party_history text, party_website character varying, party_twitter character varying, party_facebook character varying, party_instagram character varying, party_leadership jsonb, party_abbreviations text[], party_aliases text[], candidate_results_id uuid, votes integer, vote_percentage numeric, incumbent boolean, winner boolean, photo_url character varying, race_candidates_id uuid, ballot_order integer, withdrew boolean, electoral_votes integer, state_electoral_votes integer, bio text, date_of_birth date, bio_short text, education text[], professional_background text[], political_experience text[], website character varying, votes_override integer, vote_percentage_override numeric, winner_override boolean, electoral_votes_override integer, incumbent_override boolean, withdrew_override boolean, race_override_at timestamp with time zone, race_override_by uuid, race_override_reason text, candidate_override_at timestamp with time zone, candidate_override_by uuid, candidate_override_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET statement_timeout TO '30s'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.fetch_house_district_data_extended(p_year integer, p_offset integer DEFAULT 0, p_limit integer DEFAULT 5000)
 RETURNS TABLE(votes integer, vote_percentage numeric, winner boolean, candidate_id text, full_name text, incumbent boolean, photo_url text, party_abbreviation text, party_name text, color_hex text, fips_code text, state_code text, district_name text, election_year integer, election_name text, percent_reporting numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET statement_timeout TO '60s'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.fetch_presidential_national_data_extended(p_year integer)
 RETURNS TABLE(votes integer, vote_percentage numeric, electoral_votes integer, winner boolean, candidate_id text, full_name text, incumbent boolean, photo_url text, party_abbreviation text, party_name text, color_hex text, state_code text, state_name text, state_type text, election_year integer, election_name text, state_electoral_votes integer, race_metadata jsonb, percent_reporting numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET statement_timeout TO '60s'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.fetch_presidential_state_data_extended(p_year integer)
 RETURNS TABLE(votes integer, vote_percentage numeric, electoral_votes integer, winner boolean, candidate_id text, full_name text, incumbent boolean, photo_url text, party_abbreviation text, party_name text, color_hex text, state_code text, state_name text, state_type text, election_year integer, election_name text, state_electoral_votes integer, race_metadata jsonb, percent_reporting numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET statement_timeout TO '60s'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.fetch_senate_state_data_extended(p_year integer)
 RETURNS TABLE(votes integer, vote_percentage numeric, winner boolean, candidate_id text, full_name text, incumbent boolean, photo_url text, party_abbreviation text, party_name text, color_hex text, state_code text, state_name text, state_type text, election_year integer, election_name text, race_metadata jsonb, percent_reporting numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET statement_timeout TO '60s'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.fix_order_gaps(table_name text, parent_id_value uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  fixed_count INTEGER := 0;
  current_order INTEGER := 0;
  item RECORD;
BEGIN
  -- Build and execute dynamic query based on whether parent_id is provided
  IF parent_id_value IS NULL THEN
    -- Fix top-level items
    FOR item IN EXECUTE format('
      SELECT id, "order"
      FROM %I
      WHERE parent_id IS NULL
      ORDER BY "order", id',
      table_name
    ) LOOP
      EXECUTE format('UPDATE %I SET "order" = $1 WHERE id = $2', table_name)
      USING current_order, item.id;
      
      IF item.order != current_order THEN
        fixed_count := fixed_count + 1;
      END IF;
      
      current_order := current_order + 1;
    END LOOP;
  ELSE
    -- Fix child items
    FOR item IN EXECUTE format('
      SELECT id, "order"
      FROM %I
      WHERE parent_id = $1
      ORDER BY "order", id',
      table_name
    ) USING parent_id_value LOOP
      EXECUTE format('UPDATE %I SET "order" = $1 WHERE id = $2', table_name)
      USING current_order, item.id;
      
      IF item.order != current_order THEN
        fixed_count := fixed_count + 1;
      END IF;
      
      current_order := current_order + 1;
    END LOOP;
  END IF;
  
  RETURN fixed_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_active_feeds_by_category(p_category text)
 RETURNS TABLE(id uuid, name text, type text, configuration jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT f.id, f.name, f.type, f.configuration, f.created_at
  FROM feeds f
  WHERE f.category = p_category
    AND f.active = true
  ORDER BY f.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'feeds', jsonb_build_object(
      'total', COUNT(*),
      'active', COUNT(*) FILTER (WHERE active = true)
    ),
    'stocks', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM alpaca_stocks),
      'gainers', (SELECT COUNT(*) FROM alpaca_stocks WHERE change_1d_pct > 0),
      'losers', (SELECT COUNT(*) FROM alpaca_stocks WHERE change_1d_pct < 0)
    ),
    'sports', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM sports_events),
      'live', (SELECT COUNT(*) FROM sports_events WHERE status = 'LIVE')
    ),
    'weather', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM weather_locations)
    ),
    'news', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM news_articles),
      'today', (SELECT COUNT(*) FROM news_articles WHERE published_at > NOW() - INTERVAL '24 hours')
    ),
    'agents', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM agents),
      'active', (SELECT COUNT(*) FROM agents WHERE status = 'ACTIVE')
    ),
    'users', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM users),
      'active', (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE')
    )
  ) INTO v_stats
  FROM feeds;
  
  RETURN v_stats;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_integrations_to_sync()
 RETURNS TABLE(id uuid, name text, file_config jsonb, sync_config jsonb, template_mapping jsonb)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id,
    ds.name,
    ds.file_config,
    ds.sync_config,
    ds.template_mapping
  FROM data_sources ds
  WHERE 
    ds.type = 'file'
    AND ds.active = true
    AND (ds.sync_config->>'enabled')::boolean = true
    AND ds.sync_status != 'running'
    AND (
      ds.next_sync_at IS NULL  -- For first-time syncs
      OR ds.next_sync_at <= NOW()  -- For scheduled syncs
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_map_settings(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  s map_settings;
BEGIN
  SELECT * INTO s
  FROM map_settings
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'isDefault', true,
      'settings', jsonb_build_object(
        'map_style', 'light',
        'show_map_labels', true,
        'projection_type', 'mercator',
        'default_latitude', 38.0,
        'default_longitude', -97.0,
        'default_zoom', 3.5,
        'saved_positions', '[]'::jsonb,
        'additional_settings', '{}'::jsonb
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'isDefault', false,
    'settings', to_jsonb(s)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_provider_details(p_id text)
 RETURNS TABLE(id text, name text, type text, category text, description text, is_active boolean, api_key text, api_secret text, base_url text, source_url text, storage_path text, api_version text, config jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, refresh_interval_minutes integer, last_run timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT 
    id,
    name,
    type,
    category,
    description,
    is_active,
    api_key,
    api_secret,
    base_url,
    source_url,
    storage_path,
    api_version,
    config::jsonb,
    created_at,
    updated_at,
    refresh_interval_minutes,
    last_run
  FROM data_providers
  WHERE id = p_id;
$function$
;

CREATE OR REPLACE FUNCTION public.get_table_stats()
 RETURNS TABLE(table_name text, row_count bigint, total_size text, table_size text, indexes_size text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || tablename AS table_name,
    n_live_tup AS row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_text_providers_for_dashboard(dash text)
 RETURNS TABLE(id uuid, name text, provider_name text, type text, enabled boolean, model text, api_key text, dashboard_assignments jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.provider_name,
    p.type,
    p.enabled,
    p.model,
    p.api_key,
    p.dashboard_assignments,
    p.created_at,
    p.updated_at
  FROM ai_providers p
  WHERE 
    p.enabled = true
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p.dashboard_assignments) AS assignment
      WHERE 
        LOWER(assignment->>'dashboard') = LOWER(dash)
        AND (assignment->>'textProvider')::boolean = true
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_layout(p_layout_name text DEFAULT 'main'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_layout_data jsonb;
BEGIN
  SELECT layout_data INTO v_layout_data
  FROM user_layouts
  WHERE user_id = auth.uid()
  AND layout_name = p_layout_name;
  
  RETURN v_layout_data;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.inspect_pg_net_tables()
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    response_count INTEGER;
    queue_count INTEGER;
    recent_responses jsonb;
    recent_queue jsonb;
BEGIN
    -- Count responses
    SELECT COUNT(*) INTO response_count FROM net._http_response;
    
    -- Count queued requests
    SELECT COUNT(*) INTO queue_count FROM net.http_request_queue;
    
    -- Get recent responses
    SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'status_code', status_code,
        'created', created,
        'url_host', (headers->>'host')
    ) ORDER BY created DESC)
    INTO recent_responses
    FROM net._http_response
    LIMIT 5;
    
    -- Get recent queue items
    SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'method', method,
        'url', url,
        'status', status,
        'created', created
    ) ORDER BY created DESC)
    INTO recent_queue
    FROM net.http_request_queue
    LIMIT 5;
    
    RETURN json_build_object(
        'response_count', response_count,
        'queue_count', queue_count,
        'recent_responses', recent_responses,
        'recent_queue', recent_queue
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.list_active_applications()
 RETURNS SETOF public.applications
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT *
  FROM public.applications
  WHERE is_active = true
  ORDER BY sort_order, name;
$function$
;

CREATE OR REPLACE FUNCTION public.list_providers_with_status()
 RETURNS TABLE(id text, name text, type text, category text, is_active boolean, api_key_configured boolean, api_key_len integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ap.id::TEXT,
    ap.name::TEXT,
    ap.provider_name::TEXT as type,
    'ai'::TEXT as category,
    ap.enabled as is_active,
    (ap.api_key IS NOT NULL AND ap.api_key != '') as api_key_configured,
    CASE 
      WHEN ap.api_key IS NOT NULL THEN LENGTH(ap.api_key)
      ELSE 0
    END as api_key_len
  FROM ai_providers ap
  ORDER BY ap.name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.list_providers_with_status_all()
 RETURNS TABLE(id text, name text, type text, category text, is_active boolean, api_key_configured boolean, api_key_len integer, api_secret_configured boolean, api_secret_len integer, source_url text, storage_path text, refresh_interval_minutes integer)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT 
    id,
    name,
    type,
    category,
    is_active,
    (api_key IS NOT NULL AND api_key != '') AS api_key_configured,
    COALESCE(LENGTH(api_key), 0) AS api_key_len,
    (api_secret IS NOT NULL AND api_secret != '') AS api_secret_configured,
    COALESCE(LENGTH(api_secret), 0) AS api_secret_len,
    source_url,
    storage_path,
    refresh_interval_minutes
  FROM data_providers
  ORDER BY name;
$function$
;

CREATE OR REPLACE FUNCTION public.list_providers_with_status_category(p_category text)
 RETURNS TABLE(id text, name text, type text, category text, is_active boolean, api_key_configured boolean, api_key_len integer, api_secret_configured boolean, api_secret_len integer, source_url text, storage_path text, refresh_interval_minutes integer)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT 
    id,
    name,
    type,
    category,
    is_active,
    (api_key IS NOT NULL AND api_key != '') AS api_key_configured,
    COALESCE(LENGTH(api_key), 0) AS api_key_len,
    (api_secret IS NOT NULL AND api_secret != '') AS api_secret_configured,
    COALESCE(LENGTH(api_secret), 0) AS api_secret_len,
    source_url,
    storage_path,
    refresh_interval_minutes
  FROM data_providers
  WHERE category = p_category
  ORDER BY name;
$function$
;

create or replace view "public"."live_weather_locations" as  SELECT weather_locations.id,
    weather_locations.name,
    weather_locations.admin1,
    weather_locations.country,
    weather_locations.lat,
    weather_locations.lon,
    weather_locations.elevation_m,
    weather_locations.station_id,
    weather_locations.timezone,
    weather_locations.is_active,
    weather_locations.created_at,
    weather_locations.updated_at,
    weather_locations.custom_name,
    weather_locations.provider_id,
    weather_locations.provider_name
   FROM public.weather_locations
  WHERE ((weather_locations.is_active = true) AND (weather_locations.provider_id !~~ 'weather_provider:news12_local'::text));


CREATE OR REPLACE FUNCTION public.log_debug(func_name text, msg text, data jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO debug_log (function_name, message, data)
    VALUES (func_name, msg, data);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.migrate_ai_providers_from_kv()
 RETURNS TABLE(migrated_count integer, skipped_count integer, errors text[])
 LANGUAGE plpgsql
AS $function$
DECLARE
  kv_records RECORD;
  migrated INTEGER := 0;
  skipped INTEGER := 0;
  error_list TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Note: This is a placeholder function structure
  -- Actual KV → Table migration would need to be implemented based on KV store structure
  -- For now, this serves as documentation
  
  RAISE NOTICE 'KV → Table migration function is a placeholder';
  RAISE NOTICE 'Manual migration steps:';
  RAISE NOTICE '1. Export KV data with prefix "ai_provider:"';
  RAISE NOTICE '2. Transform to match ai_providers table schema';
  RAISE NOTICE '3. INSERT into ai_providers table';
  
  RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, ARRAY['Not implemented - see function comments']::TEXT[];
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_edge_function()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- When a queue item becomes 'ready', your app can listen to this
    PERFORM pg_notify(
        'sync_ready',
        json_build_object(
            'queue_id', NEW.id,
            'data_source_id', NEW.data_source_id
        )::text
    );
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.populate_sync_queue()
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    inserted_count INTEGER;
BEGIN
    INSERT INTO sync_queue (data_source_id, priority)
    SELECT 
        id,
        CASE 
            WHEN type = 'database' THEN 1
            ELSE 0 
        END as priority
    FROM data_sources 
    WHERE active = true
      AND (sync_config->>'enabled')::boolean = true
      AND (next_sync_at IS NULL OR next_sync_at <= NOW())
    ON CONFLICT (data_source_id) WHERE status IN ('pending', 'processing')
    DO NOTHING;
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    
    RETURN json_build_object(
        'inserted', inserted_count,
        'message', format('Added %s items to sync queue', inserted_count)
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.preview_log_cleanup()
 RETURNS TABLE(table_name text, status text, age_category text, count bigint, oldest timestamp with time zone, size_estimate text)
 LANGUAGE plpgsql
AS $function$BEGIN
    -- Debug log preview
    RETURN QUERY
    SELECT 
        'debug_log'::TEXT,
        'all'::TEXT,
        'older than 3 days'::TEXT,
        COUNT(*),
        MIN(created_at),
        pg_size_pretty(SUM(pg_column_size(debug_log.*))::BIGINT) as size_estimate
    FROM debug_log
    WHERE created_at < NOW() - INTERVAL '3 days';
    
    -- Sync logs - success
    RETURN QUERY
    SELECT 
        'data_source_sync_logs'::TEXT,
        'success'::TEXT,
        'older than 1 day'::TEXT,
        COUNT(*),
        MIN(created_at),
        pg_size_pretty(SUM(pg_column_size(data_source_sync_logs.*))::BIGINT)
    FROM data_source_sync_logs
    WHERE data_source_sync_logs.status = 'success' 
    AND data_source_sync_logs.created_at < NOW() - INTERVAL '1 day';
    
    -- Sync logs - errors
    RETURN QUERY
    SELECT 
        'data_source_sync_logs'::TEXT,
        'error'::TEXT,
        'older than 7 days'::TEXT,
        COUNT(*),
        MIN(created_at),
        pg_size_pretty(SUM(pg_column_size(data_source_sync_logs.*))::BIGINT)
    FROM data_source_sync_logs
    WHERE data_source_sync_logs.status = 'error' 
    AND created_at < NOW() - INTERVAL '7 days';
    
    -- Very old logs
    RETURN QUERY
    SELECT 
        'data_source_sync_logs'::TEXT,
        'any'::TEXT,
        'older than 30 days'::TEXT,
        COUNT(*),
        MIN(created_at),
        pg_size_pretty(SUM(pg_column_size(data_source_sync_logs.*))::BIGINT)
    FROM data_source_sync_logs
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- File sync queue
    RETURN QUERY
    SELECT 
        'file_sync_queue'::TEXT,
        'completed'::TEXT,
        'older than 7 days'::TEXT,
        COUNT(*),
        MIN(processed_at),
        pg_size_pretty(SUM(pg_column_size(file_sync_queue.*))::BIGINT)
    FROM file_sync_queue
    WHERE file_sync_queue.status = 'completed'
    AND processed_at < NOW() - INTERVAL '7 days';
END;$function$
;

CREATE OR REPLACE FUNCTION public.process_sync_queue()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    service_key TEXT;
    project_ref TEXT;
    request_id BIGINT;
    queue_record RECORD;
    total_requests INTEGER := 0;
    edge_function TEXT;
BEGIN
    -- Get credentials
    SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
    SELECT decrypted_secret INTO project_ref FROM vault.decrypted_secrets WHERE name = 'project_ref';
    
    -- Process pending queue items
    FOR queue_record IN 
        SELECT 
            q.id as queue_id,
            q.data_source_id,
            q.attempts,
            ds.name,
            ds.type
        FROM sync_queue q
        JOIN data_sources ds ON ds.id = q.data_source_id
        WHERE q.status = 'pending'
          AND ds.active = true
        ORDER BY q.priority DESC, q.created_at ASC
        LIMIT 10
    LOOP
        -- Mark as processing
        UPDATE sync_queue 
        SET status = 'processing',
            started_at = NOW(),
            attempts = attempts + 1
        WHERE id = queue_record.queue_id;
        
        -- Update data source status - USE 'running' NOT 'syncing'
        UPDATE data_sources 
        SET sync_status = 'running',  -- Changed from 'syncing' to 'running'
            last_sync_at = NOW()
        WHERE id = queue_record.data_source_id;
        
        -- Determine edge function
        edge_function := CASE queue_record.type
            WHEN 'file' THEN 'sync-file-integration'
            WHEN 'database' THEN 'sync-database-integration'
            ELSE NULL
        END;
        
        IF edge_function IS NOT NULL THEN
            -- Call the edge function
            request_id := net.http_post(
                url := format('https://%s.supabase.co/functions/v1/%s', project_ref, edge_function),
                headers := jsonb_build_object(
                    'Authorization', 'Bearer ' || service_key,
                    'Content-Type', 'application/json'
                )::jsonb,
                body := jsonb_build_object(
                    'dataSourceId', queue_record.data_source_id,
                    'queueId', queue_record.queue_id
                )
            );
            
            total_requests := total_requests + 1;
            
            -- Log the request
            INSERT INTO data_source_sync_logs (
                data_source_id,
                status, 
                error_message
            )
            VALUES (
                queue_record.data_source_id,
                'running', 
                format('Started %s sync for "%s", request ID: %s', queue_record.type, queue_record.name, request_id)
            );
        ELSE
            -- Mark as failed for unknown type
            UPDATE sync_queue 
            SET status = 'failed',
                completed_at = NOW(),
                error_message = 'Unknown data source type'
            WHERE id = queue_record.queue_id;
        END IF;
    END LOOP;
    
    -- Clean up old completed/failed entries (older than 7 days)
    DELETE FROM sync_queue 
    WHERE status IN ('completed', 'failed') 
      AND completed_at < NOW() - INTERVAL '7 days';
    
    RETURN json_build_object(
        'processed', total_requests,
        'message', format('Started %s sync requests', total_requests)
    );
END;
$function$
;

create or replace view "public"."ready_for_sync" as  SELECT q.id AS queue_id,
    q.data_source_id,
    q.processed_at AS marked_ready_at,
    ds.name,
    ds.file_config,
    ds.sync_config,
    ds.template_mapping,
    ds.user_id
   FROM (public.file_sync_queue q
     JOIN public.data_sources ds ON ((ds.id = q.data_source_id)))
  WHERE ((q.status = 'ready'::text) AND ((ds.type)::text = 'file'::text) AND (ds.active = true))
  ORDER BY q.processed_at;


CREATE OR REPLACE FUNCTION public.record_agent_run(p_agent_id uuid, p_status text, p_duration_ms integer DEFAULT NULL::integer, p_logs jsonb DEFAULT NULL::jsonb, p_error_message text DEFAULT NULL::text, p_results jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_run_id UUID;
BEGIN
  INSERT INTO agent_runs (
    agent_id,
    status,
    completed_at,
    duration_ms,
    logs,
    error_message,
    results
  )
  VALUES (
    p_agent_id,
    p_status,
    CASE WHEN p_status IN ('COMPLETED', 'FAILED') THEN NOW() ELSE NULL END,
    p_duration_ms,
    p_logs,
    p_error_message,
    p_results
  )
  RETURNING id INTO v_run_id;
  
  -- Update agent statistics
  UPDATE agents
  SET
    last_run = NOW(),
    run_count = run_count + 1,
    error_count = CASE WHEN p_status = 'FAILED' THEN error_count + 1 ELSE error_count END
  WHERE id = p_agent_id;
  
  RETURN v_run_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.save_map_position(p_user_id uuid, p_name text, p_lat numeric, p_lng numeric, p_zoom numeric)
 RETURNS public.map_settings
 LANGUAGE plpgsql
AS $function$
DECLARE
  new_pos jsonb;
  settings map_settings;
BEGIN
  new_pos := jsonb_build_object(
    'id', gen_random_uuid(),
    'name', p_name,
    'latitude', p_lat,
    'longitude', p_lng,
    'zoom', p_zoom,
    'created_at', NOW()
  );

  UPDATE map_settings
  SET saved_positions = 
    CASE
      WHEN saved_positions IS NULL THEN jsonb_build_array(new_pos)
      ELSE jsonb_build_array(new_pos) || saved_positions
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO settings;

  RETURN settings;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.save_map_settings(p_user_id uuid, p_settings jsonb)
 RETURNS public.map_settings
 LANGUAGE plpgsql
AS $function$
DECLARE
  updated map_settings;
  existing map_settings;
BEGIN
  -- Get existing settings
  SELECT * INTO existing FROM map_settings WHERE user_id = p_user_id;
  
  -- If no existing record, create with defaults merged with provided settings
  IF NOT FOUND THEN
    INSERT INTO map_settings (
      user_id,
      map_style,
      show_map_labels,
      projection_type,
      default_latitude,
      default_longitude,
      default_zoom,
      saved_positions,
      additional_settings,
      globe_mode,
      atmosphere_enabled,
      map_opacity,
      election_map_opacity,
      updated_at
    )
    VALUES (
      p_user_id,
      COALESCE((p_settings->>'map_style')::map_style_type, 'light'::map_style_type),
      COALESCE((p_settings->>'show_map_labels')::boolean, true),
      COALESCE((p_settings->>'projection_type')::projection_type, 'mercator'::projection_type),
      COALESCE((p_settings->>'default_latitude')::numeric, 38.0),
      COALESCE((p_settings->>'default_longitude')::numeric, -97.0),
      COALESCE((p_settings->>'default_zoom')::numeric, 3.5),
      COALESCE((p_settings->'saved_positions'), '[]'::jsonb),
      COALESCE((p_settings->'additional_settings'), '{}'::jsonb),
      COALESCE((p_settings->>'globe_mode')::boolean, false),
      COALESCE((p_settings->>'atmosphere_enabled')::boolean, true),
      COALESCE((p_settings->>'map_opacity')::real, 1.0),
      COALESCE((p_settings->>'election_map_opacity')::real, 1.0),
      NOW()
    )
    RETURNING * INTO updated;
  ELSE
    -- Update existing record, keeping existing values if not provided
    UPDATE map_settings
    SET
      map_style = COALESCE((p_settings->>'map_style')::map_style_type, existing.map_style),
      show_map_labels = COALESCE((p_settings->>'show_map_labels')::boolean, existing.show_map_labels),
      projection_type = COALESCE((p_settings->>'projection_type')::projection_type, existing.projection_type),
      default_latitude = COALESCE((p_settings->>'default_latitude')::numeric, existing.default_latitude),
      default_longitude = COALESCE((p_settings->>'default_longitude')::numeric, existing.default_longitude),
      default_zoom = COALESCE((p_settings->>'default_zoom')::numeric, existing.default_zoom),
      saved_positions = COALESCE((p_settings->'saved_positions'), existing.saved_positions),
      additional_settings = COALESCE((p_settings->'additional_settings'), existing.additional_settings),
      globe_mode = COALESCE((p_settings->>'globe_mode')::boolean, existing.globe_mode),
      atmosphere_enabled = COALESCE((p_settings->>'atmosphere_enabled')::boolean, existing.atmosphere_enabled),
      map_opacity = COALESCE((p_settings->>'map_opacity')::real, existing.map_opacity),
      election_map_opacity = COALESCE((p_settings->>'election_map_opacity')::real, existing.election_map_opacity),
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO updated;
  END IF;

  RETURN updated;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.save_user_layout(p_layout_data jsonb)
 RETURNS public.user_layouts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result user_layouts;
BEGIN
  -- Always use 'main' as the layout name
  INSERT INTO user_layouts (user_id, layout_name, layout_data, updated_at)
  VALUES (auth.uid(), 'main', p_layout_data, now())
  ON CONFLICT (user_id, layout_name) 
  DO UPDATE SET 
    layout_data = EXCLUDED.layout_data,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.shift_items_after_deletion(p_parent_id uuid, p_deleted_order integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$BEGIN
    UPDATE content
    SET "order" = "order" - 1
    WHERE parent_id = p_parent_id AND "order" > p_deleted_order;
END;$function$
;

CREATE OR REPLACE FUNCTION public.shift_items_for_insertion(p_parent_id uuid, p_start_order integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$BEGIN
  UPDATE content
  SET "order" = "order" + 1
  WHERE parent_id = p_parent_id AND "order" >= p_start_order;
END;$function$
;

CREATE OR REPLACE FUNCTION public.shift_order_on_delete()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    shift_count INTEGER;
BEGIN
  -- Only shift if the deleted item had an order value
  IF OLD."order" IS NULL THEN
    RETURN OLD;
  END IF;

  -- Log the deletion (helps with debugging)
  RAISE NOTICE 'Deleting % from % with order % and parent_id %', 
    OLD.id, TG_TABLE_NAME, OLD."order", OLD.parent_id;

  -- Perform the order shift
  IF OLD.parent_id IS NULL THEN
    -- Top-level item (no parent)
    EXECUTE format('
      UPDATE %I
      SET "order" = "order" - 1
      WHERE parent_id IS NULL
        AND "order" > $1',
      TG_TABLE_NAME
    ) USING OLD."order";
    
    GET DIAGNOSTICS shift_count = ROW_COUNT;
  ELSE
    -- Child item (has parent)
    EXECUTE format('
      UPDATE %I
      SET "order" = "order" - 1
      WHERE parent_id = $1
        AND "order" > $2',
      TG_TABLE_NAME
    ) USING OLD.parent_id, OLD."order";
    
    GET DIAGNOSTICS shift_count = ROW_COUNT;
  END IF;
  
  -- Log the result
  RAISE NOTICE 'Shifted % items in % after deleting item with order %', 
    shift_count, TG_TABLE_NAME, OLD."order";
  
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sportsmonks_leagues(p_dashboard text DEFAULT 'nova'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_provider_id TEXT;
  v_provider RECORD;
BEGIN
  -- Get active SportMonks provider
  SELECT id INTO v_provider_id
  FROM data_providers
  WHERE type = 'sportmonks'
    AND category = 'sports'
    AND is_active = true
  LIMIT 1;

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'No active SportMonks provider configured';
  END IF;

  -- Get provider details including API key
  SELECT * INTO v_provider
  FROM data_providers
  WHERE id = v_provider_id;

  IF v_provider.api_key IS NULL OR v_provider.api_key = '' THEN
    RAISE EXCEPTION 'SportMonks API key not configured';
  END IF;

  -- Return provider status (frontend should call backend endpoint for actual leagues)
  RETURN jsonb_build_object(
    'ready', true,
    'provider_id', v_provider.id,
    'provider_name', v_provider.name,
    'message', 'SportMonks provider is configured and active. Use backend endpoint to fetch leagues.'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_ap_bop_data(results_type text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  service_key TEXT;
  project_ref TEXT;
  request_url text;
  request_id_senate BIGINT;
  request_body_senate jsonb;
  request_id_house BIGINT;
  request_body_house jsonb;
begin
  -- Get credentials
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  SELECT decrypted_secret INTO project_ref FROM vault.decrypted_secrets WHERE name = 'project_ref';

  request_body_senate := jsonb_build_object(
    'subType', 'S',
    'resultsType', results_type,
    'raceName', 'Senate Election',
    'raceType', 'senate'
  );

  request_url := 'https://' || project_ref || '.supabase.co/functions/v1/import-ap-bop';

  request_id_senate := net.http_post(
                request_url,
                headers := jsonb_build_object(
                    'Authorization', 'Bearer ' || service_key,
                    'Content-Type', 'application/json'
                )::jsonb,
                body := request_body_senate
            );

  request_body_house := jsonb_build_object(
    'subType', 'H',
    'resultsType', results_type,
    'raceName', 'House Election',
    'raceType', 'house'
  );

  request_url := 'https://' || project_ref || '.supabase.co/functions/v1/import-ap-bop';

  request_id_house := net.http_post(
                request_url,
                headers := jsonb_build_object(
                    'Authorization', 'Bearer ' || service_key,
                    'Content-Type', 'application/json'
                )::jsonb,
                body := request_body_house
            );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_ap_election_data(office_id text, results_type text, race_name text, race_type text, race_level text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$declare
  service_key TEXT;
  project_ref TEXT;
  request_id BIGINT;
  request_body jsonb;
  request_url text;
begin
  -- Get credentials
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  SELECT decrypted_secret INTO project_ref FROM vault.decrypted_secrets WHERE name = 'project_ref';


  request_body := jsonb_build_object(
    'officeID', office_id,
    'resultsType', results_type,
    'raceName', race_name,
    'raceType', race_type
  );

  request_url := 'https://' || project_ref || '.supabase.co/functions/v1/import-ap-' || race_level || '-results';

  request_id := net.http_post(
                request_url,
                headers := jsonb_build_object(
                    'Authorization', 'Bearer ' || service_key,
                    'Content-Type', 'application/json'
                )::jsonb,
                body := request_body
            );
end;$function$
;

create or replace view "public"."sync_intervals_view" as  SELECT ds.id AS data_source_id,
    (ds.name)::text AS name,
    COALESCE(((ds.sync_config ->> 'enabled'::text))::boolean, true) AS sync_enabled,
    COALESCE(((ds.sync_config ->> 'interval'::text))::integer, 60) AS interval_value,
    COALESCE((ds.sync_config ->> 'intervalUnit'::text), 'minutes'::text) AS interval_unit,
    ((COALESCE(((ds.sync_config ->> 'interval'::text))::integer, 60) || ' '::text) || COALESCE((ds.sync_config ->> 'intervalUnit'::text), 'minutes'::text)) AS interval_string,
    now() AS check_time,
    (now() + (((COALESCE(((ds.sync_config ->> 'interval'::text))::integer, 60) || ' '::text) || COALESCE((ds.sync_config ->> 'intervalUnit'::text), 'minutes'::text)))::interval) AS next_sync_calculated
   FROM public.data_sources ds
  WHERE (((ds.type)::text = 'file'::text) AND (ds.active = true));


create or replace view "public"."sync_monitor" as  SELECT data_sources.name,
    data_sources.type,
    data_sources.sync_status,
    data_sources.last_sync_at,
    data_sources.next_sync_at,
    data_sources.last_sync_count,
    data_sources.last_sync_error,
    (data_sources.sync_config ->> 'enabled'::text) AS sync_enabled,
    (data_sources.sync_config ->> 'interval'::text) AS sync_interval,
    (data_sources.sync_config ->> 'intervalUnit'::text) AS sync_interval_unit,
        CASE
            WHEN (data_sources.sync_status = 'running'::text) THEN 'Currently syncing'::text
            WHEN (data_sources.sync_status = 'error'::text) THEN 'Last sync failed'::text
            WHEN (NOT ((data_sources.sync_config ->> 'enabled'::text))::boolean) THEN 'Sync disabled'::text
            WHEN ((data_sources.next_sync_at IS NULL) AND (data_sources.last_sync_at IS NULL)) THEN 'Never synced'::text
            WHEN (data_sources.next_sync_at < now()) THEN 'Overdue for sync'::text
            WHEN (data_sources.next_sync_at >= now()) THEN 'Scheduled'::text
            ELSE 'Unknown'::text
        END AS status_description,
        CASE
            WHEN (data_sources.next_sync_at < now()) THEN ('Overdue by '::text || age(now(), data_sources.next_sync_at))
            WHEN (data_sources.next_sync_at >= now()) THEN ('Due in '::text || age(data_sources.next_sync_at, now()))
            ELSE NULL::text
        END AS time_until_sync
   FROM public.data_sources
  WHERE (data_sources.active = true)
  ORDER BY
        CASE data_sources.sync_status
            WHEN 'error'::text THEN 0
            WHEN 'running'::text THEN 1
            ELSE 2
        END, data_sources.next_sync_at;


create or replace view "public"."sync_pipeline_status" as  SELECT 'Queue Status'::text AS metric,
    ( SELECT count(*) AS count
           FROM public.file_sync_queue
          WHERE (file_sync_queue.status = 'pending'::text)) AS pending,
    ( SELECT count(*) AS count
           FROM public.file_sync_queue
          WHERE (file_sync_queue.status = 'processing'::text)) AS processing,
    ( SELECT count(*) AS count
           FROM public.file_sync_queue
          WHERE ((file_sync_queue.status = 'completed'::text) AND (file_sync_queue.processed_at > (now() - '01:00:00'::interval)))) AS recent_completed,
    ( SELECT count(*) AS count
           FROM public.content
          WHERE ((content.type = 'item'::text) AND (content.created_at > (now() - '01:00:00'::interval)))) AS items_created_last_hour;


CREATE OR REPLACE FUNCTION public.test_auth()
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    service_key TEXT;
    project_ref TEXT;
    request_id BIGINT;
    response_status INTEGER;
    response_body TEXT;
BEGIN
    -- Get credentials
    SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
    SELECT decrypted_secret INTO project_ref FROM vault.decrypted_secrets WHERE name = 'project_ref';
    
    -- Make a test call
    request_id := net.http_post(
        url := format('https://%s.supabase.co/functions/v1/sync-file-integration', project_ref),
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || service_key,
            'Content-Type', 'application/json'
        )::jsonb,
        body := jsonb_build_object('test', true)::jsonb
    );
    
    -- Wait for response
    PERFORM pg_sleep(3);
    
    SELECT status_code, content::text
    INTO response_status, response_body
    FROM net._http_response
    WHERE id = request_id;
    
    RETURN json_build_object(
        'status', response_status,
        'response', response_body,
        'key_preview', LEFT(service_key, 20) || '...',
        'key_length', LENGTH(service_key)
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_cascade_delete_order_shift()
 RETURNS TABLE(test_name text, result text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    test_bucket_id UUID;
    test_playlist_id UUID;
    bucket_count_before INTEGER;
    bucket_count_after INTEGER;
    max_order_before INTEGER;
    max_order_after INTEGER;
BEGIN
    -- Find a test playlist
    SELECT id INTO test_playlist_id 
    FROM channels 
    WHERE type = 'playlist' 
    LIMIT 1;
    
    IF test_playlist_id IS NULL THEN
        RETURN QUERY SELECT 'Setup', 'No playlist found for testing';
        RETURN;
    END IF;
    
    -- Count existing buckets and get max order
    SELECT COUNT(*), COALESCE(MAX("order"), -1) 
    INTO bucket_count_before, max_order_before
    FROM channels 
    WHERE parent_id = test_playlist_id AND type = 'bucket';
    
    -- Create a test content bucket
    INSERT INTO content (id, name, type, active, "order", user_id)
    VALUES (gen_random_uuid(), 'Test Cascade Bucket', 'bucket', true, 999, 
            (SELECT id FROM auth.users LIMIT 1))
    RETURNING id INTO test_bucket_id;
    
    -- Create channel bucket references
    INSERT INTO channels (name, type, active, parent_id, content_id, "order", user_id)
    VALUES 
        ('Test Channel Bucket 1', 'bucket', true, test_playlist_id, test_bucket_id, 
         max_order_before + 1, (SELECT id FROM auth.users LIMIT 1)),
        ('Test Channel Bucket 2', 'bucket', true, test_playlist_id, test_bucket_id, 
         max_order_before + 2, (SELECT id FROM auth.users LIMIT 1)),
        ('Test Channel Bucket 3', 'bucket', true, test_playlist_id, test_bucket_id, 
         max_order_before + 3, (SELECT id FROM auth.users LIMIT 1));
    
    RETURN QUERY SELECT 'Setup', format('Created test bucket %s with 3 channel references', test_bucket_id);
    
    -- Delete the content bucket (should cascade)
    DELETE FROM content WHERE id = test_bucket_id;
    
    -- Check results
    SELECT COUNT(*), COALESCE(MAX("order"), -1)
    INTO bucket_count_after, max_order_after
    FROM channels 
    WHERE parent_id = test_playlist_id AND type = 'bucket';
    
    -- Verify cascade delete worked
    IF EXISTS (SELECT 1 FROM channels WHERE content_id = test_bucket_id) THEN
        RETURN QUERY SELECT 'Cascade Delete', 'FAILED - Channel buckets still exist';
    ELSE
        RETURN QUERY SELECT 'Cascade Delete', 'PASSED - Channel buckets were deleted';
    END IF;
    
    -- Verify order shifting worked
    IF bucket_count_after = bucket_count_before THEN
        RETURN QUERY SELECT 'Order Shift', 'PASSED - Bucket count unchanged, orders maintained';
    ELSE
        RETURN QUERY SELECT 'Order Shift', 'FAILED - Order shifting may have issues';
    END IF;
    
    -- Check for order gaps
    IF EXISTS (
        WITH ordered_buckets AS (
            SELECT "order", ROW_NUMBER() OVER (ORDER BY "order") - 1 as expected_order
            FROM channels
            WHERE parent_id = test_playlist_id AND type = 'bucket'
        )
        SELECT 1 FROM ordered_buckets WHERE "order" != expected_order
    ) THEN
        RETURN QUERY SELECT 'Order Gaps', 'FAILED - Gaps found in order sequence';
    ELSE
        RETURN QUERY SELECT 'Order Gaps', 'PASSED - No gaps in order sequence';
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_edge_function_simple()
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    service_key TEXT;
    project_ref TEXT;
    request_id BIGINT;
    response_record RECORD;
    wait_count INTEGER := 0;
BEGIN
    -- Get credentials
    SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
    SELECT decrypted_secret INTO project_ref FROM vault.decrypted_secrets WHERE name = 'project_ref';
    
    -- Make request
    request_id := net.http_post(
        url := format('https://%s.supabase.co/functions/v1/sync-file-integration', project_ref),
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || service_key,
            'Content-Type', 'application/json'
        )::jsonb,
        body := '{}'::jsonb
    );
    
    -- Wait up to 20 seconds
    WHILE wait_count < 10 LOOP
        wait_count := wait_count + 1;
        PERFORM pg_sleep(2);
        
        -- Try to get response
        BEGIN
            SELECT * INTO response_record
            FROM net._http_response
            WHERE id = request_id;
            
            IF response_record IS NOT NULL THEN
                EXIT;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors and continue waiting
        END;
    END LOOP;
    
    -- Return whatever we have
    IF response_record IS NOT NULL THEN
        RETURN json_build_object(
            'request_id', request_id,
            'status_code', response_record.status_code,
            'response_body', LEFT(response_record.content::text, 500),
            'waited_seconds', wait_count * 2
        );
    ELSE
        RETURN json_build_object(
            'request_id', request_id,
            'status_code', null,
            'error', 'No response after ' || (wait_count * 2) || ' seconds',
            'edge_function_url', format('https://%s.supabase.co/functions/v1/sync-file-integration', project_ref)
        );
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_intervals_basic()
 RETURNS TABLE(id uuid, name text, interval_num integer, interval_unit text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        ds.id,
        ds.name::TEXT,
        COALESCE((ds.sync_config->>'interval')::INTEGER, 60),
        COALESCE(ds.sync_config->>'intervalUnit', 'minutes')::TEXT
    FROM data_sources ds
    WHERE ds.type = 'file'
    AND ds.active = true
    LIMIT 10;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_pg_net_basic()
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    request_id BIGINT;
    attempts INTEGER := 0;
    response_status INTEGER;
    response_body TEXT;
BEGIN
    -- Make a simple request to a known endpoint
    request_id := net.http_get('https://httpbin.org/get');
    
    -- Log the request
    INSERT INTO debug_log (function_name, message, data)
    VALUES ('test_pg_net_basic', 'Request sent', jsonb_build_object('request_id', request_id));
    
    -- Wait for response with multiple checks
    WHILE attempts < 10 LOOP
        attempts := attempts + 1;
        PERFORM pg_sleep(1);
        
        -- Check for response
        SELECT status_code, content::text
        INTO response_status, response_body
        FROM net._http_response
        WHERE id = request_id;
        
        -- Log each attempt
        INSERT INTO debug_log (function_name, message, data)
        VALUES ('test_pg_net_basic', 'Check attempt', jsonb_build_object(
            'attempt', attempts,
            'found', response_status IS NOT NULL
        ));
        
        EXIT WHEN response_status IS NOT NULL;
    END LOOP;
    
    -- Check the request status
    PERFORM check_pg_net_request(request_id);
    
    RETURN json_build_object(
        'request_id', request_id,
        'attempts', attempts,
        'status', response_status,
        'body_preview', LEFT(response_body, 200),
        'success', response_status IS NOT NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_pg_net_with_logging()
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    request_id BIGINT;
    result_status INTEGER;
    result_body TEXT;
    service_key TEXT;
    project_ref TEXT;
BEGIN
    -- Log start
    PERFORM log_debug('test_pg_net', 'Starting test');
    
    -- Get secrets
    SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
    SELECT decrypted_secret INTO project_ref FROM vault.decrypted_secrets WHERE name = 'project_ref';
    
    -- Log what we found
    PERFORM log_debug('test_pg_net', 'Vault check', jsonb_build_object(
        'service_key_exists', service_key IS NOT NULL,
        'service_key_length', LENGTH(service_key),
        'project_ref', project_ref
    ));
    
    -- Make request
    request_id := net.http_get('https://httpstat.us/200');
    
    PERFORM log_debug('test_pg_net', 'Request made', jsonb_build_object('request_id', request_id));
    
    -- Wait
    PERFORM pg_sleep(2);
    
    -- Check response
    SELECT status_code, content::text
    INTO result_status, result_body
    FROM net._http_response
    WHERE id = request_id;
    
    PERFORM log_debug('test_pg_net', 'Response received', jsonb_build_object(
        'status', result_status,
        'body_length', LENGTH(result_body),
        'body_preview', LEFT(result_body, 100)
    ));
    
    RETURN json_build_object(
        'request_id', request_id,
        'status', result_status,
        'check_logs', 'SELECT * FROM debug_log ORDER BY id DESC LIMIT 10'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_simple()
 RETURNS TABLE(id uuid, name text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        ds.id,
        ds.name::TEXT
    FROM data_sources ds
    WHERE ds.type = 'file'
    LIMIT 5;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_single_item_processing()
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    test_item RECORD;
    result json := '{}';
BEGIN
    -- Get one item
    SELECT 
        q.id as queue_id,
        q.data_source_id,
        q.status,
        ds.name,
        ds.sync_config
    INTO test_item
    FROM file_sync_queue q
    JOIN data_sources ds ON ds.id = q.data_source_id
    WHERE q.status = 'pending'
    LIMIT 1;
    
    IF test_item IS NULL THEN
        RETURN json_build_object('error', 'No pending items found');
    END IF;
    
    -- Build the result step by step
    result := json_build_object(
        'found_item', test_item.name,
        'queue_id', test_item.queue_id,
        'current_status', test_item.status,
        'sync_config', test_item.sync_config
    );
    
    -- Try to update it
    BEGIN
        UPDATE file_sync_queue 
        SET status = 'processing', processed_at = NOW()
        WHERE id = test_item.queue_id;
        
        result := result || json_build_object('step1', 'Updated to processing');
        
        UPDATE data_sources
        SET sync_status = 'idle'
        WHERE id = test_item.data_source_id;
        
        result := result || json_build_object('step2', 'Updated data source');
        
        UPDATE file_sync_queue 
        SET status = 'ready'
        WHERE id = test_item.queue_id;
        
        result := result || json_build_object('step3', 'Updated to ready', 'success', true);
        
    EXCEPTION WHEN OTHERS THEN
        result := result || json_build_object('error', SQLERRM);
    END;
    
    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_sync_components()
 RETURNS TABLE(test_name text, result text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    service_key TEXT;
    vault_count INTEGER;
    queue_count INTEGER;
    http_test RECORD;
    url_test TEXT;
BEGIN
    -- Test 1: Queue status
    SELECT COUNT(*) INTO queue_count FROM file_sync_queue WHERE status = 'pending';
    RETURN QUERY SELECT 'Queue Count'::TEXT, format('%s pending items', queue_count);
    
    -- Test 2: Vault secrets
    SELECT COUNT(*) INTO vault_count FROM vault.secrets;
    RETURN QUERY SELECT 'Vault Secrets'::TEXT, format('%s secrets found', vault_count);
    
    -- Test 3: List vault secrets
    FOR vault_count IN SELECT name FROM vault.secrets LOOP
        RETURN QUERY SELECT 'Vault Secret Name'::TEXT, vault_count::TEXT;
    END LOOP;
    
    -- Test 4: Service key retrieval
    BEGIN
        SELECT decrypted_secret INTO service_key 
        FROM vault.decrypted_secrets 
        LIMIT 1;
        
        RETURN QUERY SELECT 'Service Key'::TEXT, 
            CASE WHEN service_key IS NOT NULL 
                 THEN format('Found (length: %s)', LENGTH(service_key))
                 ELSE 'Not found' 
            END;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'Service Key'::TEXT, format('Error: %s', SQLERRM);
    END;
    
    -- Test 5: URL construction
    BEGIN
        url_test := format('https://%s.supabase.co/functions/v1/sync-file-integration', 
                          split_part(current_setting('app.supabase_url', true), '.', 1));
        RETURN QUERY SELECT 'Edge Function URL'::TEXT, url_test;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'Edge Function URL'::TEXT, format('Error: %s', SQLERRM);
    END;
    
    -- Test 6: HTTP connectivity
    BEGIN
        SELECT net.http_get('https://httpstat.us/200') INTO http_test;
        RETURN QUERY SELECT 'HTTP Test'::TEXT, format('Status: %s', http_test.status);
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'HTTP Test'::TEXT, format('Error: %s', SQLERRM);
    END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_vault_secrets()
 RETURNS TABLE(secret_name text, status text, preview text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Check service_role_key
    RETURN QUERY
    SELECT 
        'service_role_key'::TEXT,
        CASE WHEN decrypted_secret IS NOT NULL THEN 'OK' ELSE 'MISSING' END,
        CASE 
            WHEN decrypted_secret IS NOT NULL 
            THEN 'Length: ' || LENGTH(decrypted_secret) || ', starts with: ' || LEFT(decrypted_secret, 20)
            ELSE 'Not found in vault'
        END
    FROM vault.decrypted_secrets 
    WHERE name = 'service_role_key';
    
    -- Check project_ref
    RETURN QUERY
    SELECT 
        'project_ref'::TEXT,
        CASE WHEN decrypted_secret IS NOT NULL THEN 'OK' ELSE 'MISSING' END,
        CASE 
            WHEN decrypted_secret IS NOT NULL 
            THEN 'Value: ' || decrypted_secret
            ELSE 'Not found in vault'
        END
    FROM vault.decrypted_secrets 
    WHERE name = 'project_ref';
    
    -- Check if we can build a valid URL
    RETURN QUERY
    WITH vault_data AS (
        SELECT 
            MAX(CASE WHEN name = 'project_ref' THEN decrypted_secret END) as proj_ref,
            MAX(CASE WHEN name = 'service_role_key' THEN decrypted_secret END) as svc_key
        FROM vault.decrypted_secrets
        WHERE name IN ('project_ref', 'service_role_key')
    )
    SELECT 
        'edge_function_url'::TEXT,
        CASE 
            WHEN proj_ref IS NOT NULL AND svc_key IS NOT NULL THEN 'OK'
            ELSE 'CANNOT_BUILD'
        END,
        CASE 
            WHEN proj_ref IS NOT NULL 
            THEN format('https://%s.supabase.co/functions/v1/sync-file-integration', proj_ref)
            ELSE 'Missing project_ref'
        END
    FROM vault_data;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ui_delete_weather_location(p_location_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result jsonb;
  v_deleted_count integer;
BEGIN
  -- Check if location exists
  IF NOT EXISTS (SELECT 1 FROM weather_locations WHERE id = p_location_id) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Location not found',
      'location_id', p_location_id
    );
  END IF;

  -- Delete the parent row (cascades to all child tables automatically)
  DELETE FROM weather_locations WHERE id = p_location_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Return success
  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Location and all weather data deleted',
    'location_id', p_location_id,
    'deleted', v_deleted_count
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', SQLERRM,
      'location_id', p_location_id
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_ai_providers_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_channels_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_data_provider(p_id text, p_is_active boolean DEFAULT NULL::boolean, p_api_key text DEFAULT NULL::text, p_api_secret text DEFAULT NULL::text, p_base_url text DEFAULT NULL::text, p_storage_path text DEFAULT NULL::text, p_source_url text DEFAULT NULL::text, p_config jsonb DEFAULT NULL::jsonb, p_refresh_interval_minutes integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_old record;
BEGIN
  SELECT * INTO v_old FROM public.data_providers WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Provider not found', 'id', p_id);
  END IF;

  UPDATE public.data_providers
  SET
    is_active = COALESCE(p_is_active, v_old.is_active),
    api_key = COALESCE(p_api_key, v_old.api_key),
    api_secret = COALESCE(p_api_secret, v_old.api_secret),
    base_url = COALESCE(p_base_url, v_old.base_url),
    storage_path = COALESCE(p_storage_path, v_old.storage_path),
    source_url = COALESCE(p_source_url, v_old.source_url),
    config = COALESCE(p_config, v_old.config),
    refresh_interval_minutes = COALESCE(p_refresh_interval_minutes, v_old.refresh_interval_minutes),
    updated_at = NOW()
  WHERE id = p_id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', p_id,
    'message', 'Provider updated successfully'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_data_providers_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_map_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_media_assets_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_modified_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_news_articles_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_order_after_delete()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update order for remaining items in the same parent
  IF OLD.parent_id IS NOT NULL THEN
    -- Update items with same parent
    UPDATE channels 
    SET "order" = "order" - 1 
    WHERE parent_id = OLD.parent_id 
    AND "order" > OLD."order";
    
    UPDATE content 
    SET "order" = "order" - 1 
    WHERE parent_id = OLD.parent_id 
    AND "order" > OLD."order";
    
    UPDATE templates 
    SET "order" = "order" - 1 
    WHERE parent_id = OLD.parent_id 
    AND "order" > OLD."order";
  ELSE
    -- For top-level items (parent_id is NULL)
    UPDATE channels 
    SET "order" = "order" - 1 
    WHERE parent_id IS NULL 
    AND "order" > OLD."order"
    AND id != OLD.id;
    
    UPDATE content 
    SET "order" = "order" - 1 
    WHERE parent_id IS NULL 
    AND "order" > OLD."order"
    AND id != OLD.id;
    
    UPDATE templates 
    SET "order" = "order" - 1 
    WHERE parent_id IS NULL 
    AND "order" > OLD."order"
    AND id != OLD.id;
  END IF;
  
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_provider_settings_by_id(p_id text, p_api_key text DEFAULT NULL::text, p_api_secret text DEFAULT NULL::text, p_api_version text DEFAULT NULL::text, p_base_url text DEFAULT NULL::text, p_config_patch jsonb DEFAULT NULL::jsonb, p_dashboard text DEFAULT NULL::text, p_is_active boolean DEFAULT NULL::boolean, p_allow_api_key boolean DEFAULT NULL::boolean, p_source_url text DEFAULT NULL::text, p_storage_path text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE data_providers
  SET
    api_key = COALESCE(p_api_key, api_key),
    api_secret = COALESCE(p_api_secret, api_secret),
    api_version = COALESCE(p_api_version, api_version),
    base_url = COALESCE(p_base_url, base_url),
    config = CASE
      WHEN p_config_patch IS NOT NULL THEN config || p_config_patch
      ELSE config
    END,
    is_active = COALESCE(p_is_active, is_active),
    source_url = COALESCE(p_source_url, source_url),    -- ✅ added
    storage_path = COALESCE(p_storage_path, storage_path),  -- ✅ added
    updated_at = NOW()
  WHERE id = p_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_stock_prices(p_stocks jsonb)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_count INT := 0;
  v_stock JSONB;
BEGIN
  FOR v_stock IN SELECT * FROM jsonb_array_elements(p_stocks)
  LOOP
    INSERT INTO alpaca_stocks (
      symbol,
      name,
      type,
      price,
      change_1d,
      change_1d_pct,
      change_1y_pct,
      year_high,
      year_low,
      chart_1y,
      rating,
      last_update
    )
    VALUES (
      v_stock->>'symbol',
      v_stock->>'name',
      v_stock->>'type',
      (v_stock->>'price')::DECIMAL,
      (v_stock->>'change_1d')::DECIMAL,
      (v_stock->>'change_1d_pct')::DECIMAL,
      (v_stock->>'change_1y_pct')::DECIMAL,
      (v_stock->>'year_high')::DECIMAL,
      (v_stock->>'year_low')::DECIMAL,
      v_stock->'chart_1y',
      v_stock->'rating',
      NOW()
    )
    ON CONFLICT (symbol)
    DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      price = EXCLUDED.price,
      change_1d = EXCLUDED.change_1d,
      change_1d_pct = EXCLUDED.change_1d_pct,
      change_1y_pct = EXCLUDED.change_1y_pct,
      year_high = EXCLUDED.year_high,
      year_low = EXCLUDED.year_low,
      chart_1y = EXCLUDED.chart_1y,
      rating = EXCLUDED.rating,
      last_update = NOW();
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_user_layout(p_layout_name text, p_layout_data jsonb)
 RETURNS public.user_layouts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result user_layouts;
  v_user_id uuid;
BEGIN
  -- Get the authenticated user's ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Insert or update the layout
  INSERT INTO user_layouts (user_id, layout_name, layout_data, updated_at)
  VALUES (v_user_id, p_layout_name, p_layout_data, now())
  ON CONFLICT (user_id, layout_name) 
  DO UPDATE SET 
    layout_data = EXCLUDED.layout_data,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_user_layout_with_id(p_user_id uuid, p_layout_name text, p_layout_data jsonb)
 RETURNS public.user_layouts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result user_layouts;
BEGIN
  -- Verify the user is updating their own layout
  IF p_user_id != auth.uid() AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot update layout for another user';
  END IF;
  
  -- Insert or update the layout
  INSERT INTO user_layouts (user_id, layout_name, layout_data, updated_at)
  VALUES (p_user_id, p_layout_name, p_layout_data, now())
  ON CONFLICT (user_id, layout_name) 
  DO UPDATE SET 
    layout_data = EXCLUDED.layout_data,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$function$
;

create or replace view "public"."v_active_agents" as  SELECT a.id,
    a.name,
    a.agent_type,
    a.status,
    a.schedule,
    a.last_run,
    a.next_run,
    a.run_count,
    a.error_count,
    COALESCE(recent_runs.success_rate, (0)::double precision) AS recent_success_rate
   FROM (public.agents a
     LEFT JOIN ( SELECT agent_runs.agent_id,
            (((count(*) FILTER (WHERE (agent_runs.status = 'COMPLETED'::text)))::double precision / (count(*))::double precision) * (100)::double precision) AS success_rate
           FROM public.agent_runs
          WHERE (agent_runs.started_at > (now() - '24:00:00'::interval))
          GROUP BY agent_runs.agent_id) recent_runs ON ((a.id = recent_runs.agent_id)))
  WHERE (a.status = 'ACTIVE'::text);


create or replace view "public"."v_active_feeds" as  SELECT feeds.id,
    feeds.name,
    feeds.type,
    feeds.category,
        CASE
            WHEN (feeds.type = 'REST API'::text) THEN (feeds.configuration ->> 'apiUrl'::text)
            WHEN (feeds.type = 'Database'::text) THEN (feeds.configuration ->> 'host'::text)
            WHEN (feeds.type = 'File'::text) THEN (feeds.configuration ->> 'filePath'::text)
            WHEN (feeds.type = 'Webhook'::text) THEN (feeds.configuration ->> 'webhookUrl'::text)
            ELSE NULL::text
        END AS endpoint,
    feeds.created_at,
    feeds.updated_at
   FROM public.feeds
  WHERE (feeds.active = true);


create or replace view "public"."v_sports_today" as  SELECT sports_events.sport,
    sports_events.status,
    count(*) AS event_count
   FROM public.sports_events
  WHERE (date(sports_events.start_time) = CURRENT_DATE)
  GROUP BY sports_events.sport, sports_events.status;


create or replace view "public"."v_user_activity" as  SELECT users.role,
    users.status,
    count(*) AS user_count,
    count(*) FILTER (WHERE (users.last_login > (now() - '7 days'::interval))) AS active_last_7_days,
    count(*) FILTER (WHERE (users.last_login > (now() - '30 days'::interval))) AS active_last_30_days
   FROM public.users
  GROUP BY users.role, users.status;

CREATE OR REPLACE FUNCTION public.validate_channel_hierarchy()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Channels (type='channel') in channel_playlists should reference a channel in channels table
  IF NEW.type = 'channel' AND NEW.channel_id IS NULL THEN
    RAISE EXCEPTION 'Channel playlist records must reference a channel via channel_id';
  END IF;

  -- Playlists must have a channel-type parent OR can be parentless but must have channel_id
  IF NEW.type = 'playlist' THEN
    IF NEW.channel_id IS NULL THEN
      RAISE EXCEPTION 'Playlists must reference a channel via channel_id';
    END IF;
    -- Optional: validate parent if it exists
    IF NEW.parent_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM channel_playlists
      WHERE id = NEW.parent_id AND type = 'channel'
    ) THEN
      RAISE EXCEPTION 'Playlist parent_id must reference a channel-type record or be NULL';
    END IF;
  END IF;

  -- Buckets must have a playlist as parent
  IF NEW.type = 'bucket' AND (
    NEW.parent_id IS NULL OR
    NOT EXISTS (
      SELECT 1 FROM channel_playlists
      WHERE id = NEW.parent_id AND type = 'playlist'
    )
  ) THEN
    RAISE EXCEPTION 'Buckets must have a playlist as parent';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_content_hierarchy()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM content WHERE id = NEW.parent_id) THEN
      RAISE EXCEPTION 'Parent content with ID % does not exist', NEW.parent_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_item_tabfields_content()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM content 
    WHERE content.id = NEW.item_id 
    AND content.type = 'item'
  ) THEN
    RAISE EXCEPTION 'content_id must reference a content record of type "item"';
  END IF;
  RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION public.validate_template_hierarchy()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM templates WHERE id = NEW.parent_id) THEN
      RAISE EXCEPTION 'Parent template with ID % does not exist', NEW.parent_id;
    END IF;
    
    IF NEW.type = 'template' AND EXISTS (
      SELECT 1 FROM templates 
      WHERE id = NEW.parent_id 
      AND type != 'templateFolder'
    ) THEN
      RAISE EXCEPTION 'Templates can only have template folders as parents';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

create or replace view "public"."weather_active_alerts" as  SELECT wa.id,
    wa.location_id,
    wa.source,
    wa.event,
    wa.severity,
    wa.urgency,
    wa.certainty,
    wa.start_time,
    wa.end_time,
    wa.headline,
    wa.description,
    wa.areas,
    wa.instruction,
    wa.links,
    wa.provider_id,
    wa.provider_type,
    wa.fetched_at,
    wa.created_at,
    wl.name AS location_name,
    wl.country
   FROM (public.weather_alerts wa
     JOIN public.weather_locations wl ON ((wa.location_id = wl.id)))
  WHERE ((wa.start_time <= now()) AND (wa.end_time >= now()) AND (wl.is_active = true))
  ORDER BY wa.severity DESC, wa.start_time DESC;


create or replace view "public"."weather_latest" as  SELECT wc.location_id,
    wc.as_of,
    wc.summary,
    wc.icon,
    wc.temperature_value,
    wc.temperature_unit,
    wc.feels_like_value,
    wc.feels_like_unit,
    wc.humidity,
    wc.pressure_value,
    wc.pressure_unit,
    wc.visibility_value,
    wc.visibility_unit,
    wc.wind_speed_value,
    wc.wind_speed_unit,
    wc.wind_direction_cardinal,
    wc.wind_direction_deg,
    wc.uv_index,
    wc.provider_type,
    wc.country,
    wc.admin1,
    wc.name,
    wc.lat,
    wc.lon,
    wc.fetched_at,
    wc.created_at
   FROM public.weather_current wc;


create or replace view "public"."e_candidate_results_effective" as  SELECT e_candidate_results.id,
    e_candidate_results.race_result_id,
    e_candidate_results.candidate_id,
    public.e_get_effective_value(e_candidate_results.votes, e_candidate_results.votes_override) AS votes,
    public.e_get_effective_value(e_candidate_results.vote_percentage, e_candidate_results.vote_percentage_override) AS vote_percentage,
    public.e_get_effective_value(e_candidate_results.electoral_votes, e_candidate_results.electoral_votes_override) AS electoral_votes,
    public.e_get_effective_value(e_candidate_results.winner, e_candidate_results.winner_override) AS winner,
    public.e_get_effective_value(e_candidate_results.runoff, e_candidate_results.runoff_override) AS runoff,
    public.e_get_effective_value(e_candidate_results.eliminated, e_candidate_results.eliminated_override) AS eliminated,
    public.e_get_effective_value(e_candidate_results.rank, e_candidate_results.rank_override) AS rank,
    e_candidate_results.metadata,
    e_candidate_results.created_at,
    e_candidate_results.updated_at,
        CASE
            WHEN (e_candidate_results.override_at IS NOT NULL) THEN jsonb_build_object('has_override', true, 'override_by', e_candidate_results.override_by, 'override_at', e_candidate_results.override_at, 'override_reason', e_candidate_results.override_reason)
            ELSE jsonb_build_object('has_override', false)
        END AS override_info
   FROM public.e_candidate_results;


grant delete on table "public"."agent_runs" to "anon";

grant insert on table "public"."agent_runs" to "anon";

grant references on table "public"."agent_runs" to "anon";

grant select on table "public"."agent_runs" to "anon";

grant trigger on table "public"."agent_runs" to "anon";

grant truncate on table "public"."agent_runs" to "anon";

grant update on table "public"."agent_runs" to "anon";

grant delete on table "public"."agent_runs" to "authenticated";

grant insert on table "public"."agent_runs" to "authenticated";

grant references on table "public"."agent_runs" to "authenticated";

grant select on table "public"."agent_runs" to "authenticated";

grant trigger on table "public"."agent_runs" to "authenticated";

grant truncate on table "public"."agent_runs" to "authenticated";

grant update on table "public"."agent_runs" to "authenticated";

grant delete on table "public"."agent_runs" to "service_role";

grant insert on table "public"."agent_runs" to "service_role";

grant references on table "public"."agent_runs" to "service_role";

grant select on table "public"."agent_runs" to "service_role";

grant trigger on table "public"."agent_runs" to "service_role";

grant truncate on table "public"."agent_runs" to "service_role";

grant update on table "public"."agent_runs" to "service_role";

grant delete on table "public"."agents" to "anon";

grant insert on table "public"."agents" to "anon";

grant references on table "public"."agents" to "anon";

grant select on table "public"."agents" to "anon";

grant trigger on table "public"."agents" to "anon";

grant truncate on table "public"."agents" to "anon";

grant update on table "public"."agents" to "anon";

grant delete on table "public"."agents" to "authenticated";

grant insert on table "public"."agents" to "authenticated";

grant references on table "public"."agents" to "authenticated";

grant select on table "public"."agents" to "authenticated";

grant trigger on table "public"."agents" to "authenticated";

grant truncate on table "public"."agents" to "authenticated";

grant update on table "public"."agents" to "authenticated";

grant delete on table "public"."agents" to "service_role";

grant insert on table "public"."agents" to "service_role";

grant references on table "public"."agents" to "service_role";

grant select on table "public"."agents" to "service_role";

grant trigger on table "public"."agents" to "service_role";

grant truncate on table "public"."agents" to "service_role";

grant update on table "public"."agents" to "service_role";

grant delete on table "public"."ai_insights_elections" to "anon";

grant insert on table "public"."ai_insights_elections" to "anon";

grant references on table "public"."ai_insights_elections" to "anon";

grant select on table "public"."ai_insights_elections" to "anon";

grant trigger on table "public"."ai_insights_elections" to "anon";

grant truncate on table "public"."ai_insights_elections" to "anon";

grant update on table "public"."ai_insights_elections" to "anon";

grant delete on table "public"."ai_insights_elections" to "authenticated";

grant insert on table "public"."ai_insights_elections" to "authenticated";

grant references on table "public"."ai_insights_elections" to "authenticated";

grant select on table "public"."ai_insights_elections" to "authenticated";

grant trigger on table "public"."ai_insights_elections" to "authenticated";

grant truncate on table "public"."ai_insights_elections" to "authenticated";

grant update on table "public"."ai_insights_elections" to "authenticated";

grant delete on table "public"."ai_insights_elections" to "service_role";

grant insert on table "public"."ai_insights_elections" to "service_role";

grant references on table "public"."ai_insights_elections" to "service_role";

grant select on table "public"."ai_insights_elections" to "service_role";

grant trigger on table "public"."ai_insights_elections" to "service_role";

grant truncate on table "public"."ai_insights_elections" to "service_role";

grant update on table "public"."ai_insights_elections" to "service_role";

grant delete on table "public"."ai_insights_finance" to "anon";

grant insert on table "public"."ai_insights_finance" to "anon";

grant references on table "public"."ai_insights_finance" to "anon";

grant select on table "public"."ai_insights_finance" to "anon";

grant trigger on table "public"."ai_insights_finance" to "anon";

grant truncate on table "public"."ai_insights_finance" to "anon";

grant update on table "public"."ai_insights_finance" to "anon";

grant delete on table "public"."ai_insights_finance" to "authenticated";

grant insert on table "public"."ai_insights_finance" to "authenticated";

grant references on table "public"."ai_insights_finance" to "authenticated";

grant select on table "public"."ai_insights_finance" to "authenticated";

grant trigger on table "public"."ai_insights_finance" to "authenticated";

grant truncate on table "public"."ai_insights_finance" to "authenticated";

grant update on table "public"."ai_insights_finance" to "authenticated";

grant delete on table "public"."ai_insights_finance" to "service_role";

grant insert on table "public"."ai_insights_finance" to "service_role";

grant references on table "public"."ai_insights_finance" to "service_role";

grant select on table "public"."ai_insights_finance" to "service_role";

grant trigger on table "public"."ai_insights_finance" to "service_role";

grant truncate on table "public"."ai_insights_finance" to "service_role";

grant update on table "public"."ai_insights_finance" to "service_role";

grant delete on table "public"."ai_insights_news" to "anon";

grant insert on table "public"."ai_insights_news" to "anon";

grant references on table "public"."ai_insights_news" to "anon";

grant select on table "public"."ai_insights_news" to "anon";

grant trigger on table "public"."ai_insights_news" to "anon";

grant truncate on table "public"."ai_insights_news" to "anon";

grant update on table "public"."ai_insights_news" to "anon";

grant delete on table "public"."ai_insights_news" to "authenticated";

grant insert on table "public"."ai_insights_news" to "authenticated";

grant references on table "public"."ai_insights_news" to "authenticated";

grant select on table "public"."ai_insights_news" to "authenticated";

grant trigger on table "public"."ai_insights_news" to "authenticated";

grant truncate on table "public"."ai_insights_news" to "authenticated";

grant update on table "public"."ai_insights_news" to "authenticated";

grant delete on table "public"."ai_insights_news" to "service_role";

grant insert on table "public"."ai_insights_news" to "service_role";

grant references on table "public"."ai_insights_news" to "service_role";

grant select on table "public"."ai_insights_news" to "service_role";

grant trigger on table "public"."ai_insights_news" to "service_role";

grant truncate on table "public"."ai_insights_news" to "service_role";

grant update on table "public"."ai_insights_news" to "service_role";

grant delete on table "public"."ai_insights_school_closing" to "anon";

grant insert on table "public"."ai_insights_school_closing" to "anon";

grant references on table "public"."ai_insights_school_closing" to "anon";

grant select on table "public"."ai_insights_school_closing" to "anon";

grant trigger on table "public"."ai_insights_school_closing" to "anon";

grant truncate on table "public"."ai_insights_school_closing" to "anon";

grant update on table "public"."ai_insights_school_closing" to "anon";

grant delete on table "public"."ai_insights_school_closing" to "authenticated";

grant insert on table "public"."ai_insights_school_closing" to "authenticated";

grant references on table "public"."ai_insights_school_closing" to "authenticated";

grant select on table "public"."ai_insights_school_closing" to "authenticated";

grant trigger on table "public"."ai_insights_school_closing" to "authenticated";

grant truncate on table "public"."ai_insights_school_closing" to "authenticated";

grant update on table "public"."ai_insights_school_closing" to "authenticated";

grant delete on table "public"."ai_insights_school_closing" to "service_role";

grant insert on table "public"."ai_insights_school_closing" to "service_role";

grant references on table "public"."ai_insights_school_closing" to "service_role";

grant select on table "public"."ai_insights_school_closing" to "service_role";

grant trigger on table "public"."ai_insights_school_closing" to "service_role";

grant truncate on table "public"."ai_insights_school_closing" to "service_role";

grant update on table "public"."ai_insights_school_closing" to "service_role";

grant delete on table "public"."ai_insights_weather" to "anon";

grant insert on table "public"."ai_insights_weather" to "anon";

grant references on table "public"."ai_insights_weather" to "anon";

grant select on table "public"."ai_insights_weather" to "anon";

grant trigger on table "public"."ai_insights_weather" to "anon";

grant truncate on table "public"."ai_insights_weather" to "anon";

grant update on table "public"."ai_insights_weather" to "anon";

grant delete on table "public"."ai_insights_weather" to "authenticated";

grant insert on table "public"."ai_insights_weather" to "authenticated";

grant references on table "public"."ai_insights_weather" to "authenticated";

grant select on table "public"."ai_insights_weather" to "authenticated";

grant trigger on table "public"."ai_insights_weather" to "authenticated";

grant truncate on table "public"."ai_insights_weather" to "authenticated";

grant update on table "public"."ai_insights_weather" to "authenticated";

grant delete on table "public"."ai_insights_weather" to "service_role";

grant insert on table "public"."ai_insights_weather" to "service_role";

grant references on table "public"."ai_insights_weather" to "service_role";

grant select on table "public"."ai_insights_weather" to "service_role";

grant trigger on table "public"."ai_insights_weather" to "service_role";

grant truncate on table "public"."ai_insights_weather" to "service_role";

grant update on table "public"."ai_insights_weather" to "service_role";

grant delete on table "public"."ai_prompt_injectors" to "anon";

grant insert on table "public"."ai_prompt_injectors" to "anon";

grant references on table "public"."ai_prompt_injectors" to "anon";

grant select on table "public"."ai_prompt_injectors" to "anon";

grant trigger on table "public"."ai_prompt_injectors" to "anon";

grant truncate on table "public"."ai_prompt_injectors" to "anon";

grant update on table "public"."ai_prompt_injectors" to "anon";

grant delete on table "public"."ai_prompt_injectors" to "authenticated";

grant insert on table "public"."ai_prompt_injectors" to "authenticated";

grant references on table "public"."ai_prompt_injectors" to "authenticated";

grant select on table "public"."ai_prompt_injectors" to "authenticated";

grant trigger on table "public"."ai_prompt_injectors" to "authenticated";

grant truncate on table "public"."ai_prompt_injectors" to "authenticated";

grant update on table "public"."ai_prompt_injectors" to "authenticated";

grant delete on table "public"."ai_prompt_injectors" to "service_role";

grant insert on table "public"."ai_prompt_injectors" to "service_role";

grant references on table "public"."ai_prompt_injectors" to "service_role";

grant select on table "public"."ai_prompt_injectors" to "service_role";

grant trigger on table "public"."ai_prompt_injectors" to "service_role";

grant truncate on table "public"."ai_prompt_injectors" to "service_role";

grant update on table "public"."ai_prompt_injectors" to "service_role";

grant delete on table "public"."ai_providers" to "anon";

grant insert on table "public"."ai_providers" to "anon";

grant references on table "public"."ai_providers" to "anon";

grant select on table "public"."ai_providers" to "anon";

grant trigger on table "public"."ai_providers" to "anon";

grant truncate on table "public"."ai_providers" to "anon";

grant update on table "public"."ai_providers" to "anon";

grant delete on table "public"."ai_providers" to "authenticated";

grant insert on table "public"."ai_providers" to "authenticated";

grant references on table "public"."ai_providers" to "authenticated";

grant select on table "public"."ai_providers" to "authenticated";

grant trigger on table "public"."ai_providers" to "authenticated";

grant truncate on table "public"."ai_providers" to "authenticated";

grant update on table "public"."ai_providers" to "authenticated";

grant delete on table "public"."ai_providers" to "service_role";

grant insert on table "public"."ai_providers" to "service_role";

grant references on table "public"."ai_providers" to "service_role";

grant select on table "public"."ai_providers" to "service_role";

grant trigger on table "public"."ai_providers" to "service_role";

grant truncate on table "public"."ai_providers" to "service_role";

grant update on table "public"."ai_providers" to "service_role";

grant delete on table "public"."api_access_logs" to "anon";

grant insert on table "public"."api_access_logs" to "anon";

grant references on table "public"."api_access_logs" to "anon";

grant select on table "public"."api_access_logs" to "anon";

grant trigger on table "public"."api_access_logs" to "anon";

grant truncate on table "public"."api_access_logs" to "anon";

grant update on table "public"."api_access_logs" to "anon";

grant delete on table "public"."api_access_logs" to "authenticated";

grant insert on table "public"."api_access_logs" to "authenticated";

grant references on table "public"."api_access_logs" to "authenticated";

grant select on table "public"."api_access_logs" to "authenticated";

grant trigger on table "public"."api_access_logs" to "authenticated";

grant truncate on table "public"."api_access_logs" to "authenticated";

grant update on table "public"."api_access_logs" to "authenticated";

grant delete on table "public"."api_access_logs" to "service_role";

grant insert on table "public"."api_access_logs" to "service_role";

grant references on table "public"."api_access_logs" to "service_role";

grant select on table "public"."api_access_logs" to "service_role";

grant trigger on table "public"."api_access_logs" to "service_role";

grant truncate on table "public"."api_access_logs" to "service_role";

grant update on table "public"."api_access_logs" to "service_role";

grant delete on table "public"."api_documentation" to "anon";

grant insert on table "public"."api_documentation" to "anon";

grant references on table "public"."api_documentation" to "anon";

grant select on table "public"."api_documentation" to "anon";

grant trigger on table "public"."api_documentation" to "anon";

grant truncate on table "public"."api_documentation" to "anon";

grant update on table "public"."api_documentation" to "anon";

grant delete on table "public"."api_documentation" to "authenticated";

grant insert on table "public"."api_documentation" to "authenticated";

grant references on table "public"."api_documentation" to "authenticated";

grant select on table "public"."api_documentation" to "authenticated";

grant trigger on table "public"."api_documentation" to "authenticated";

grant truncate on table "public"."api_documentation" to "authenticated";

grant update on table "public"."api_documentation" to "authenticated";

grant delete on table "public"."api_documentation" to "service_role";

grant insert on table "public"."api_documentation" to "service_role";

grant references on table "public"."api_documentation" to "service_role";

grant select on table "public"."api_documentation" to "service_role";

grant trigger on table "public"."api_documentation" to "service_role";

grant truncate on table "public"."api_documentation" to "service_role";

grant update on table "public"."api_documentation" to "service_role";

grant delete on table "public"."api_endpoint_sources" to "anon";

grant insert on table "public"."api_endpoint_sources" to "anon";

grant references on table "public"."api_endpoint_sources" to "anon";

grant select on table "public"."api_endpoint_sources" to "anon";

grant trigger on table "public"."api_endpoint_sources" to "anon";

grant truncate on table "public"."api_endpoint_sources" to "anon";

grant update on table "public"."api_endpoint_sources" to "anon";

grant delete on table "public"."api_endpoint_sources" to "authenticated";

grant insert on table "public"."api_endpoint_sources" to "authenticated";

grant references on table "public"."api_endpoint_sources" to "authenticated";

grant select on table "public"."api_endpoint_sources" to "authenticated";

grant trigger on table "public"."api_endpoint_sources" to "authenticated";

grant truncate on table "public"."api_endpoint_sources" to "authenticated";

grant update on table "public"."api_endpoint_sources" to "authenticated";

grant delete on table "public"."api_endpoint_sources" to "service_role";

grant insert on table "public"."api_endpoint_sources" to "service_role";

grant references on table "public"."api_endpoint_sources" to "service_role";

grant select on table "public"."api_endpoint_sources" to "service_role";

grant trigger on table "public"."api_endpoint_sources" to "service_role";

grant truncate on table "public"."api_endpoint_sources" to "service_role";

grant update on table "public"."api_endpoint_sources" to "service_role";

grant delete on table "public"."api_endpoints" to "anon";

grant insert on table "public"."api_endpoints" to "anon";

grant references on table "public"."api_endpoints" to "anon";

grant select on table "public"."api_endpoints" to "anon";

grant trigger on table "public"."api_endpoints" to "anon";

grant truncate on table "public"."api_endpoints" to "anon";

grant update on table "public"."api_endpoints" to "anon";

grant delete on table "public"."api_endpoints" to "authenticated";

grant insert on table "public"."api_endpoints" to "authenticated";

grant references on table "public"."api_endpoints" to "authenticated";

grant select on table "public"."api_endpoints" to "authenticated";

grant trigger on table "public"."api_endpoints" to "authenticated";

grant truncate on table "public"."api_endpoints" to "authenticated";

grant update on table "public"."api_endpoints" to "authenticated";

grant delete on table "public"."api_endpoints" to "service_role";

grant insert on table "public"."api_endpoints" to "service_role";

grant references on table "public"."api_endpoints" to "service_role";

grant select on table "public"."api_endpoints" to "service_role";

grant trigger on table "public"."api_endpoints" to "service_role";

grant truncate on table "public"."api_endpoints" to "service_role";

grant update on table "public"."api_endpoints" to "service_role";

grant delete on table "public"."applications" to "anon";

grant insert on table "public"."applications" to "anon";

grant references on table "public"."applications" to "anon";

grant select on table "public"."applications" to "anon";

grant trigger on table "public"."applications" to "anon";

grant truncate on table "public"."applications" to "anon";

grant update on table "public"."applications" to "anon";

grant delete on table "public"."applications" to "authenticated";

grant insert on table "public"."applications" to "authenticated";

grant references on table "public"."applications" to "authenticated";

grant select on table "public"."applications" to "authenticated";

grant trigger on table "public"."applications" to "authenticated";

grant truncate on table "public"."applications" to "authenticated";

grant update on table "public"."applications" to "authenticated";

grant delete on table "public"."applications" to "service_role";

grant insert on table "public"."applications" to "service_role";

grant references on table "public"."applications" to "service_role";

grant select on table "public"."applications" to "service_role";

grant trigger on table "public"."applications" to "service_role";

grant truncate on table "public"."applications" to "service_role";

grant update on table "public"."applications" to "service_role";

grant delete on table "public"."bop_election_results" to "anon";

grant insert on table "public"."bop_election_results" to "anon";

grant references on table "public"."bop_election_results" to "anon";

grant select on table "public"."bop_election_results" to "anon";

grant trigger on table "public"."bop_election_results" to "anon";

grant truncate on table "public"."bop_election_results" to "anon";

grant update on table "public"."bop_election_results" to "anon";

grant delete on table "public"."bop_election_results" to "authenticated";

grant insert on table "public"."bop_election_results" to "authenticated";

grant references on table "public"."bop_election_results" to "authenticated";

grant select on table "public"."bop_election_results" to "authenticated";

grant trigger on table "public"."bop_election_results" to "authenticated";

grant truncate on table "public"."bop_election_results" to "authenticated";

grant update on table "public"."bop_election_results" to "authenticated";

grant delete on table "public"."bop_election_results" to "service_role";

grant insert on table "public"."bop_election_results" to "service_role";

grant references on table "public"."bop_election_results" to "service_role";

grant select on table "public"."bop_election_results" to "service_role";

grant trigger on table "public"."bop_election_results" to "service_role";

grant truncate on table "public"."bop_election_results" to "service_role";

grant update on table "public"."bop_election_results" to "service_role";

grant delete on table "public"."bop_insufficient_vote_details" to "anon";

grant insert on table "public"."bop_insufficient_vote_details" to "anon";

grant references on table "public"."bop_insufficient_vote_details" to "anon";

grant select on table "public"."bop_insufficient_vote_details" to "anon";

grant trigger on table "public"."bop_insufficient_vote_details" to "anon";

grant truncate on table "public"."bop_insufficient_vote_details" to "anon";

grant update on table "public"."bop_insufficient_vote_details" to "anon";

grant delete on table "public"."bop_insufficient_vote_details" to "authenticated";

grant insert on table "public"."bop_insufficient_vote_details" to "authenticated";

grant references on table "public"."bop_insufficient_vote_details" to "authenticated";

grant select on table "public"."bop_insufficient_vote_details" to "authenticated";

grant trigger on table "public"."bop_insufficient_vote_details" to "authenticated";

grant truncate on table "public"."bop_insufficient_vote_details" to "authenticated";

grant update on table "public"."bop_insufficient_vote_details" to "authenticated";

grant delete on table "public"."bop_insufficient_vote_details" to "service_role";

grant insert on table "public"."bop_insufficient_vote_details" to "service_role";

grant references on table "public"."bop_insufficient_vote_details" to "service_role";

grant select on table "public"."bop_insufficient_vote_details" to "service_role";

grant trigger on table "public"."bop_insufficient_vote_details" to "service_role";

grant truncate on table "public"."bop_insufficient_vote_details" to "service_role";

grant update on table "public"."bop_insufficient_vote_details" to "service_role";

grant delete on table "public"."bop_net_changes" to "anon";

grant insert on table "public"."bop_net_changes" to "anon";

grant references on table "public"."bop_net_changes" to "anon";

grant select on table "public"."bop_net_changes" to "anon";

grant trigger on table "public"."bop_net_changes" to "anon";

grant truncate on table "public"."bop_net_changes" to "anon";

grant update on table "public"."bop_net_changes" to "anon";

grant delete on table "public"."bop_net_changes" to "authenticated";

grant insert on table "public"."bop_net_changes" to "authenticated";

grant references on table "public"."bop_net_changes" to "authenticated";

grant select on table "public"."bop_net_changes" to "authenticated";

grant trigger on table "public"."bop_net_changes" to "authenticated";

grant truncate on table "public"."bop_net_changes" to "authenticated";

grant update on table "public"."bop_net_changes" to "authenticated";

grant delete on table "public"."bop_net_changes" to "service_role";

grant insert on table "public"."bop_net_changes" to "service_role";

grant references on table "public"."bop_net_changes" to "service_role";

grant select on table "public"."bop_net_changes" to "service_role";

grant trigger on table "public"."bop_net_changes" to "service_role";

grant truncate on table "public"."bop_net_changes" to "service_role";

grant update on table "public"."bop_net_changes" to "service_role";

grant delete on table "public"."bop_party_results" to "anon";

grant insert on table "public"."bop_party_results" to "anon";

grant references on table "public"."bop_party_results" to "anon";

grant select on table "public"."bop_party_results" to "anon";

grant trigger on table "public"."bop_party_results" to "anon";

grant truncate on table "public"."bop_party_results" to "anon";

grant update on table "public"."bop_party_results" to "anon";

grant delete on table "public"."bop_party_results" to "authenticated";

grant insert on table "public"."bop_party_results" to "authenticated";

grant references on table "public"."bop_party_results" to "authenticated";

grant select on table "public"."bop_party_results" to "authenticated";

grant trigger on table "public"."bop_party_results" to "authenticated";

grant truncate on table "public"."bop_party_results" to "authenticated";

grant update on table "public"."bop_party_results" to "authenticated";

grant delete on table "public"."bop_party_results" to "service_role";

grant insert on table "public"."bop_party_results" to "service_role";

grant references on table "public"."bop_party_results" to "service_role";

grant select on table "public"."bop_party_results" to "service_role";

grant trigger on table "public"."bop_party_results" to "service_role";

grant truncate on table "public"."bop_party_results" to "service_role";

grant update on table "public"."bop_party_results" to "service_role";

grant delete on table "public"."channel_playlists" to "anon";

grant insert on table "public"."channel_playlists" to "anon";

grant references on table "public"."channel_playlists" to "anon";

grant select on table "public"."channel_playlists" to "anon";

grant trigger on table "public"."channel_playlists" to "anon";

grant truncate on table "public"."channel_playlists" to "anon";

grant update on table "public"."channel_playlists" to "anon";

grant delete on table "public"."channel_playlists" to "authenticated";

grant insert on table "public"."channel_playlists" to "authenticated";

grant references on table "public"."channel_playlists" to "authenticated";

grant select on table "public"."channel_playlists" to "authenticated";

grant trigger on table "public"."channel_playlists" to "authenticated";

grant truncate on table "public"."channel_playlists" to "authenticated";

grant update on table "public"."channel_playlists" to "authenticated";

grant delete on table "public"."channel_playlists" to "service_role";

grant insert on table "public"."channel_playlists" to "service_role";

grant references on table "public"."channel_playlists" to "service_role";

grant select on table "public"."channel_playlists" to "service_role";

grant trigger on table "public"."channel_playlists" to "service_role";

grant truncate on table "public"."channel_playlists" to "service_role";

grant update on table "public"."channel_playlists" to "service_role";

grant delete on table "public"."channels" to "anon";

grant insert on table "public"."channels" to "anon";

grant references on table "public"."channels" to "anon";

grant select on table "public"."channels" to "anon";

grant trigger on table "public"."channels" to "anon";

grant truncate on table "public"."channels" to "anon";

grant update on table "public"."channels" to "anon";

grant delete on table "public"."channels" to "authenticated";

grant insert on table "public"."channels" to "authenticated";

grant references on table "public"."channels" to "authenticated";

grant select on table "public"."channels" to "authenticated";

grant trigger on table "public"."channels" to "authenticated";

grant truncate on table "public"."channels" to "authenticated";

grant update on table "public"."channels" to "authenticated";

grant delete on table "public"."channels" to "service_role";

grant insert on table "public"."channels" to "service_role";

grant references on table "public"."channels" to "service_role";

grant select on table "public"."channels" to "service_role";

grant trigger on table "public"."channels" to "service_role";

grant truncate on table "public"."channels" to "service_role";

grant update on table "public"."channels" to "service_role";

grant delete on table "public"."content" to "anon";

grant insert on table "public"."content" to "anon";

grant references on table "public"."content" to "anon";

grant select on table "public"."content" to "anon";

grant trigger on table "public"."content" to "anon";

grant truncate on table "public"."content" to "anon";

grant update on table "public"."content" to "anon";

grant delete on table "public"."content" to "authenticated";

grant insert on table "public"."content" to "authenticated";

grant references on table "public"."content" to "authenticated";

grant select on table "public"."content" to "authenticated";

grant trigger on table "public"."content" to "authenticated";

grant truncate on table "public"."content" to "authenticated";

grant update on table "public"."content" to "authenticated";

grant delete on table "public"."content" to "service_role";

grant insert on table "public"."content" to "service_role";

grant references on table "public"."content" to "service_role";

grant select on table "public"."content" to "service_role";

grant trigger on table "public"."content" to "service_role";

grant truncate on table "public"."content" to "service_role";

grant update on table "public"."content" to "service_role";

grant delete on table "public"."customer_dashboards" to "anon";

grant insert on table "public"."customer_dashboards" to "anon";

grant references on table "public"."customer_dashboards" to "anon";

grant select on table "public"."customer_dashboards" to "anon";

grant trigger on table "public"."customer_dashboards" to "anon";

grant truncate on table "public"."customer_dashboards" to "anon";

grant update on table "public"."customer_dashboards" to "anon";

grant delete on table "public"."customer_dashboards" to "authenticated";

grant insert on table "public"."customer_dashboards" to "authenticated";

grant references on table "public"."customer_dashboards" to "authenticated";

grant select on table "public"."customer_dashboards" to "authenticated";

grant trigger on table "public"."customer_dashboards" to "authenticated";

grant truncate on table "public"."customer_dashboards" to "authenticated";

grant update on table "public"."customer_dashboards" to "authenticated";

grant delete on table "public"."customer_dashboards" to "service_role";

grant insert on table "public"."customer_dashboards" to "service_role";

grant references on table "public"."customer_dashboards" to "service_role";

grant select on table "public"."customer_dashboards" to "service_role";

grant trigger on table "public"."customer_dashboards" to "service_role";

grant truncate on table "public"."customer_dashboards" to "service_role";

grant update on table "public"."customer_dashboards" to "service_role";

grant delete on table "public"."data_providers" to "anon";

grant insert on table "public"."data_providers" to "anon";

grant references on table "public"."data_providers" to "anon";

grant select on table "public"."data_providers" to "anon";

grant trigger on table "public"."data_providers" to "anon";

grant truncate on table "public"."data_providers" to "anon";

grant update on table "public"."data_providers" to "anon";

grant delete on table "public"."data_providers" to "authenticated";

grant insert on table "public"."data_providers" to "authenticated";

grant references on table "public"."data_providers" to "authenticated";

grant select on table "public"."data_providers" to "authenticated";

grant trigger on table "public"."data_providers" to "authenticated";

grant truncate on table "public"."data_providers" to "authenticated";

grant update on table "public"."data_providers" to "authenticated";

grant delete on table "public"."data_providers" to "service_role";

grant insert on table "public"."data_providers" to "service_role";

grant references on table "public"."data_providers" to "service_role";

grant select on table "public"."data_providers" to "service_role";

grant trigger on table "public"."data_providers" to "service_role";

grant truncate on table "public"."data_providers" to "service_role";

grant update on table "public"."data_providers" to "service_role";

grant delete on table "public"."data_source_sync_logs" to "anon";

grant insert on table "public"."data_source_sync_logs" to "anon";

grant references on table "public"."data_source_sync_logs" to "anon";

grant select on table "public"."data_source_sync_logs" to "anon";

grant trigger on table "public"."data_source_sync_logs" to "anon";

grant truncate on table "public"."data_source_sync_logs" to "anon";

grant update on table "public"."data_source_sync_logs" to "anon";

grant delete on table "public"."data_source_sync_logs" to "authenticated";

grant insert on table "public"."data_source_sync_logs" to "authenticated";

grant references on table "public"."data_source_sync_logs" to "authenticated";

grant select on table "public"."data_source_sync_logs" to "authenticated";

grant trigger on table "public"."data_source_sync_logs" to "authenticated";

grant truncate on table "public"."data_source_sync_logs" to "authenticated";

grant update on table "public"."data_source_sync_logs" to "authenticated";

grant delete on table "public"."data_source_sync_logs" to "service_role";

grant insert on table "public"."data_source_sync_logs" to "service_role";

grant references on table "public"."data_source_sync_logs" to "service_role";

grant select on table "public"."data_source_sync_logs" to "service_role";

grant trigger on table "public"."data_source_sync_logs" to "service_role";

grant truncate on table "public"."data_source_sync_logs" to "service_role";

grant update on table "public"."data_source_sync_logs" to "service_role";

grant delete on table "public"."data_sources" to "anon";

grant insert on table "public"."data_sources" to "anon";

grant references on table "public"."data_sources" to "anon";

grant select on table "public"."data_sources" to "anon";

grant trigger on table "public"."data_sources" to "anon";

grant truncate on table "public"."data_sources" to "anon";

grant update on table "public"."data_sources" to "anon";

grant delete on table "public"."data_sources" to "authenticated";

grant insert on table "public"."data_sources" to "authenticated";

grant references on table "public"."data_sources" to "authenticated";

grant select on table "public"."data_sources" to "authenticated";

grant trigger on table "public"."data_sources" to "authenticated";

grant truncate on table "public"."data_sources" to "authenticated";

grant update on table "public"."data_sources" to "authenticated";

grant delete on table "public"."data_sources" to "service_role";

grant insert on table "public"."data_sources" to "service_role";

grant references on table "public"."data_sources" to "service_role";

grant select on table "public"."data_sources" to "service_role";

grant trigger on table "public"."data_sources" to "service_role";

grant truncate on table "public"."data_sources" to "service_role";

grant update on table "public"."data_sources" to "service_role";

grant delete on table "public"."debug_log" to "anon";

grant insert on table "public"."debug_log" to "anon";

grant references on table "public"."debug_log" to "anon";

grant select on table "public"."debug_log" to "anon";

grant trigger on table "public"."debug_log" to "anon";

grant truncate on table "public"."debug_log" to "anon";

grant update on table "public"."debug_log" to "anon";

grant delete on table "public"."debug_log" to "authenticated";

grant insert on table "public"."debug_log" to "authenticated";

grant references on table "public"."debug_log" to "authenticated";

grant select on table "public"."debug_log" to "authenticated";

grant trigger on table "public"."debug_log" to "authenticated";

grant truncate on table "public"."debug_log" to "authenticated";

grant update on table "public"."debug_log" to "authenticated";

grant delete on table "public"."debug_log" to "service_role";

grant insert on table "public"."debug_log" to "service_role";

grant references on table "public"."debug_log" to "service_role";

grant select on table "public"."debug_log" to "service_role";

grant trigger on table "public"."debug_log" to "service_role";

grant truncate on table "public"."debug_log" to "service_role";

grant update on table "public"."debug_log" to "service_role";

grant delete on table "public"."e_ap_call_history" to "anon";

grant insert on table "public"."e_ap_call_history" to "anon";

grant references on table "public"."e_ap_call_history" to "anon";

grant select on table "public"."e_ap_call_history" to "anon";

grant trigger on table "public"."e_ap_call_history" to "anon";

grant truncate on table "public"."e_ap_call_history" to "anon";

grant update on table "public"."e_ap_call_history" to "anon";

grant delete on table "public"."e_ap_call_history" to "authenticated";

grant insert on table "public"."e_ap_call_history" to "authenticated";

grant references on table "public"."e_ap_call_history" to "authenticated";

grant select on table "public"."e_ap_call_history" to "authenticated";

grant trigger on table "public"."e_ap_call_history" to "authenticated";

grant truncate on table "public"."e_ap_call_history" to "authenticated";

grant update on table "public"."e_ap_call_history" to "authenticated";

grant delete on table "public"."e_ap_call_history" to "service_role";

grant insert on table "public"."e_ap_call_history" to "service_role";

grant references on table "public"."e_ap_call_history" to "service_role";

grant select on table "public"."e_ap_call_history" to "service_role";

grant trigger on table "public"."e_ap_call_history" to "service_role";

grant truncate on table "public"."e_ap_call_history" to "service_role";

grant update on table "public"."e_ap_call_history" to "service_role";

grant delete on table "public"."e_ballot_measure_results" to "anon";

grant insert on table "public"."e_ballot_measure_results" to "anon";

grant references on table "public"."e_ballot_measure_results" to "anon";

grant select on table "public"."e_ballot_measure_results" to "anon";

grant trigger on table "public"."e_ballot_measure_results" to "anon";

grant truncate on table "public"."e_ballot_measure_results" to "anon";

grant update on table "public"."e_ballot_measure_results" to "anon";

grant delete on table "public"."e_ballot_measure_results" to "authenticated";

grant insert on table "public"."e_ballot_measure_results" to "authenticated";

grant references on table "public"."e_ballot_measure_results" to "authenticated";

grant select on table "public"."e_ballot_measure_results" to "authenticated";

grant trigger on table "public"."e_ballot_measure_results" to "authenticated";

grant truncate on table "public"."e_ballot_measure_results" to "authenticated";

grant update on table "public"."e_ballot_measure_results" to "authenticated";

grant delete on table "public"."e_ballot_measure_results" to "service_role";

grant insert on table "public"."e_ballot_measure_results" to "service_role";

grant references on table "public"."e_ballot_measure_results" to "service_role";

grant select on table "public"."e_ballot_measure_results" to "service_role";

grant trigger on table "public"."e_ballot_measure_results" to "service_role";

grant truncate on table "public"."e_ballot_measure_results" to "service_role";

grant update on table "public"."e_ballot_measure_results" to "service_role";

grant delete on table "public"."e_ballot_measures" to "anon";

grant insert on table "public"."e_ballot_measures" to "anon";

grant references on table "public"."e_ballot_measures" to "anon";

grant select on table "public"."e_ballot_measures" to "anon";

grant trigger on table "public"."e_ballot_measures" to "anon";

grant truncate on table "public"."e_ballot_measures" to "anon";

grant update on table "public"."e_ballot_measures" to "anon";

grant delete on table "public"."e_ballot_measures" to "authenticated";

grant insert on table "public"."e_ballot_measures" to "authenticated";

grant references on table "public"."e_ballot_measures" to "authenticated";

grant select on table "public"."e_ballot_measures" to "authenticated";

grant trigger on table "public"."e_ballot_measures" to "authenticated";

grant truncate on table "public"."e_ballot_measures" to "authenticated";

grant update on table "public"."e_ballot_measures" to "authenticated";

grant delete on table "public"."e_ballot_measures" to "service_role";

grant insert on table "public"."e_ballot_measures" to "service_role";

grant references on table "public"."e_ballot_measures" to "service_role";

grant select on table "public"."e_ballot_measures" to "service_role";

grant trigger on table "public"."e_ballot_measures" to "service_role";

grant truncate on table "public"."e_ballot_measures" to "service_role";

grant update on table "public"."e_ballot_measures" to "service_role";

grant delete on table "public"."e_candidate_results" to "anon";

grant insert on table "public"."e_candidate_results" to "anon";

grant references on table "public"."e_candidate_results" to "anon";

grant select on table "public"."e_candidate_results" to "anon";

grant trigger on table "public"."e_candidate_results" to "anon";

grant truncate on table "public"."e_candidate_results" to "anon";

grant update on table "public"."e_candidate_results" to "anon";

grant delete on table "public"."e_candidate_results" to "authenticated";

grant insert on table "public"."e_candidate_results" to "authenticated";

grant references on table "public"."e_candidate_results" to "authenticated";

grant select on table "public"."e_candidate_results" to "authenticated";

grant trigger on table "public"."e_candidate_results" to "authenticated";

grant truncate on table "public"."e_candidate_results" to "authenticated";

grant update on table "public"."e_candidate_results" to "authenticated";

grant delete on table "public"."e_candidate_results" to "service_role";

grant insert on table "public"."e_candidate_results" to "service_role";

grant references on table "public"."e_candidate_results" to "service_role";

grant select on table "public"."e_candidate_results" to "service_role";

grant trigger on table "public"."e_candidate_results" to "service_role";

grant truncate on table "public"."e_candidate_results" to "service_role";

grant update on table "public"."e_candidate_results" to "service_role";

grant delete on table "public"."e_candidates" to "anon";

grant insert on table "public"."e_candidates" to "anon";

grant references on table "public"."e_candidates" to "anon";

grant select on table "public"."e_candidates" to "anon";

grant trigger on table "public"."e_candidates" to "anon";

grant truncate on table "public"."e_candidates" to "anon";

grant update on table "public"."e_candidates" to "anon";

grant delete on table "public"."e_candidates" to "authenticated";

grant insert on table "public"."e_candidates" to "authenticated";

grant references on table "public"."e_candidates" to "authenticated";

grant select on table "public"."e_candidates" to "authenticated";

grant trigger on table "public"."e_candidates" to "authenticated";

grant truncate on table "public"."e_candidates" to "authenticated";

grant update on table "public"."e_candidates" to "authenticated";

grant delete on table "public"."e_candidates" to "service_role";

grant insert on table "public"."e_candidates" to "service_role";

grant references on table "public"."e_candidates" to "service_role";

grant select on table "public"."e_candidates" to "service_role";

grant trigger on table "public"."e_candidates" to "service_role";

grant truncate on table "public"."e_candidates" to "service_role";

grant update on table "public"."e_candidates" to "service_role";

grant delete on table "public"."e_countries" to "anon";

grant insert on table "public"."e_countries" to "anon";

grant references on table "public"."e_countries" to "anon";

grant select on table "public"."e_countries" to "anon";

grant trigger on table "public"."e_countries" to "anon";

grant truncate on table "public"."e_countries" to "anon";

grant update on table "public"."e_countries" to "anon";

grant delete on table "public"."e_countries" to "authenticated";

grant insert on table "public"."e_countries" to "authenticated";

grant references on table "public"."e_countries" to "authenticated";

grant select on table "public"."e_countries" to "authenticated";

grant trigger on table "public"."e_countries" to "authenticated";

grant truncate on table "public"."e_countries" to "authenticated";

grant update on table "public"."e_countries" to "authenticated";

grant delete on table "public"."e_countries" to "service_role";

grant insert on table "public"."e_countries" to "service_role";

grant references on table "public"."e_countries" to "service_role";

grant select on table "public"."e_countries" to "service_role";

grant trigger on table "public"."e_countries" to "service_role";

grant truncate on table "public"."e_countries" to "service_role";

grant update on table "public"."e_countries" to "service_role";

grant delete on table "public"."e_election_data_ingestion_log" to "anon";

grant insert on table "public"."e_election_data_ingestion_log" to "anon";

grant references on table "public"."e_election_data_ingestion_log" to "anon";

grant select on table "public"."e_election_data_ingestion_log" to "anon";

grant trigger on table "public"."e_election_data_ingestion_log" to "anon";

grant truncate on table "public"."e_election_data_ingestion_log" to "anon";

grant update on table "public"."e_election_data_ingestion_log" to "anon";

grant delete on table "public"."e_election_data_ingestion_log" to "authenticated";

grant insert on table "public"."e_election_data_ingestion_log" to "authenticated";

grant references on table "public"."e_election_data_ingestion_log" to "authenticated";

grant select on table "public"."e_election_data_ingestion_log" to "authenticated";

grant trigger on table "public"."e_election_data_ingestion_log" to "authenticated";

grant truncate on table "public"."e_election_data_ingestion_log" to "authenticated";

grant update on table "public"."e_election_data_ingestion_log" to "authenticated";

grant delete on table "public"."e_election_data_ingestion_log" to "service_role";

grant insert on table "public"."e_election_data_ingestion_log" to "service_role";

grant references on table "public"."e_election_data_ingestion_log" to "service_role";

grant select on table "public"."e_election_data_ingestion_log" to "service_role";

grant trigger on table "public"."e_election_data_ingestion_log" to "service_role";

grant truncate on table "public"."e_election_data_ingestion_log" to "service_role";

grant update on table "public"."e_election_data_ingestion_log" to "service_role";

grant delete on table "public"."e_election_data_overrides_log" to "anon";

grant insert on table "public"."e_election_data_overrides_log" to "anon";

grant references on table "public"."e_election_data_overrides_log" to "anon";

grant select on table "public"."e_election_data_overrides_log" to "anon";

grant trigger on table "public"."e_election_data_overrides_log" to "anon";

grant truncate on table "public"."e_election_data_overrides_log" to "anon";

grant update on table "public"."e_election_data_overrides_log" to "anon";

grant delete on table "public"."e_election_data_overrides_log" to "authenticated";

grant insert on table "public"."e_election_data_overrides_log" to "authenticated";

grant references on table "public"."e_election_data_overrides_log" to "authenticated";

grant select on table "public"."e_election_data_overrides_log" to "authenticated";

grant trigger on table "public"."e_election_data_overrides_log" to "authenticated";

grant truncate on table "public"."e_election_data_overrides_log" to "authenticated";

grant update on table "public"."e_election_data_overrides_log" to "authenticated";

grant delete on table "public"."e_election_data_overrides_log" to "service_role";

grant insert on table "public"."e_election_data_overrides_log" to "service_role";

grant references on table "public"."e_election_data_overrides_log" to "service_role";

grant select on table "public"."e_election_data_overrides_log" to "service_role";

grant trigger on table "public"."e_election_data_overrides_log" to "service_role";

grant truncate on table "public"."e_election_data_overrides_log" to "service_role";

grant update on table "public"."e_election_data_overrides_log" to "service_role";

grant delete on table "public"."e_election_data_sources" to "anon";

grant insert on table "public"."e_election_data_sources" to "anon";

grant references on table "public"."e_election_data_sources" to "anon";

grant select on table "public"."e_election_data_sources" to "anon";

grant trigger on table "public"."e_election_data_sources" to "anon";

grant truncate on table "public"."e_election_data_sources" to "anon";

grant update on table "public"."e_election_data_sources" to "anon";

grant delete on table "public"."e_election_data_sources" to "authenticated";

grant insert on table "public"."e_election_data_sources" to "authenticated";

grant references on table "public"."e_election_data_sources" to "authenticated";

grant select on table "public"."e_election_data_sources" to "authenticated";

grant trigger on table "public"."e_election_data_sources" to "authenticated";

grant truncate on table "public"."e_election_data_sources" to "authenticated";

grant update on table "public"."e_election_data_sources" to "authenticated";

grant delete on table "public"."e_election_data_sources" to "service_role";

grant insert on table "public"."e_election_data_sources" to "service_role";

grant references on table "public"."e_election_data_sources" to "service_role";

grant select on table "public"."e_election_data_sources" to "service_role";

grant trigger on table "public"."e_election_data_sources" to "service_role";

grant truncate on table "public"."e_election_data_sources" to "service_role";

grant update on table "public"."e_election_data_sources" to "service_role";

grant delete on table "public"."e_election_editorial_content" to "anon";

grant insert on table "public"."e_election_editorial_content" to "anon";

grant references on table "public"."e_election_editorial_content" to "anon";

grant select on table "public"."e_election_editorial_content" to "anon";

grant trigger on table "public"."e_election_editorial_content" to "anon";

grant truncate on table "public"."e_election_editorial_content" to "anon";

grant update on table "public"."e_election_editorial_content" to "anon";

grant delete on table "public"."e_election_editorial_content" to "authenticated";

grant insert on table "public"."e_election_editorial_content" to "authenticated";

grant references on table "public"."e_election_editorial_content" to "authenticated";

grant select on table "public"."e_election_editorial_content" to "authenticated";

grant trigger on table "public"."e_election_editorial_content" to "authenticated";

grant truncate on table "public"."e_election_editorial_content" to "authenticated";

grant update on table "public"."e_election_editorial_content" to "authenticated";

grant delete on table "public"."e_election_editorial_content" to "service_role";

grant insert on table "public"."e_election_editorial_content" to "service_role";

grant references on table "public"."e_election_editorial_content" to "service_role";

grant select on table "public"."e_election_editorial_content" to "service_role";

grant trigger on table "public"."e_election_editorial_content" to "service_role";

grant truncate on table "public"."e_election_editorial_content" to "service_role";

grant update on table "public"."e_election_editorial_content" to "service_role";

grant delete on table "public"."e_elections" to "anon";

grant insert on table "public"."e_elections" to "anon";

grant references on table "public"."e_elections" to "anon";

grant select on table "public"."e_elections" to "anon";

grant trigger on table "public"."e_elections" to "anon";

grant truncate on table "public"."e_elections" to "anon";

grant update on table "public"."e_elections" to "anon";

grant delete on table "public"."e_elections" to "authenticated";

grant insert on table "public"."e_elections" to "authenticated";

grant references on table "public"."e_elections" to "authenticated";

grant select on table "public"."e_elections" to "authenticated";

grant trigger on table "public"."e_elections" to "authenticated";

grant truncate on table "public"."e_elections" to "authenticated";

grant update on table "public"."e_elections" to "authenticated";

grant delete on table "public"."e_elections" to "service_role";

grant insert on table "public"."e_elections" to "service_role";

grant references on table "public"."e_elections" to "service_role";

grant select on table "public"."e_elections" to "service_role";

grant trigger on table "public"."e_elections" to "service_role";

grant truncate on table "public"."e_elections" to "service_role";

grant update on table "public"."e_elections" to "service_role";

grant delete on table "public"."e_exit_polls" to "anon";

grant insert on table "public"."e_exit_polls" to "anon";

grant references on table "public"."e_exit_polls" to "anon";

grant select on table "public"."e_exit_polls" to "anon";

grant trigger on table "public"."e_exit_polls" to "anon";

grant truncate on table "public"."e_exit_polls" to "anon";

grant update on table "public"."e_exit_polls" to "anon";

grant delete on table "public"."e_exit_polls" to "authenticated";

grant insert on table "public"."e_exit_polls" to "authenticated";

grant references on table "public"."e_exit_polls" to "authenticated";

grant select on table "public"."e_exit_polls" to "authenticated";

grant trigger on table "public"."e_exit_polls" to "authenticated";

grant truncate on table "public"."e_exit_polls" to "authenticated";

grant update on table "public"."e_exit_polls" to "authenticated";

grant delete on table "public"."e_exit_polls" to "service_role";

grant insert on table "public"."e_exit_polls" to "service_role";

grant references on table "public"."e_exit_polls" to "service_role";

grant select on table "public"."e_exit_polls" to "service_role";

grant trigger on table "public"."e_exit_polls" to "service_role";

grant truncate on table "public"."e_exit_polls" to "service_role";

grant update on table "public"."e_exit_polls" to "service_role";

grant delete on table "public"."e_geographic_divisions" to "anon";

grant insert on table "public"."e_geographic_divisions" to "anon";

grant references on table "public"."e_geographic_divisions" to "anon";

grant select on table "public"."e_geographic_divisions" to "anon";

grant trigger on table "public"."e_geographic_divisions" to "anon";

grant truncate on table "public"."e_geographic_divisions" to "anon";

grant update on table "public"."e_geographic_divisions" to "anon";

grant delete on table "public"."e_geographic_divisions" to "authenticated";

grant insert on table "public"."e_geographic_divisions" to "authenticated";

grant references on table "public"."e_geographic_divisions" to "authenticated";

grant select on table "public"."e_geographic_divisions" to "authenticated";

grant trigger on table "public"."e_geographic_divisions" to "authenticated";

grant truncate on table "public"."e_geographic_divisions" to "authenticated";

grant update on table "public"."e_geographic_divisions" to "authenticated";

grant delete on table "public"."e_geographic_divisions" to "service_role";

grant insert on table "public"."e_geographic_divisions" to "service_role";

grant references on table "public"."e_geographic_divisions" to "service_role";

grant select on table "public"."e_geographic_divisions" to "service_role";

grant trigger on table "public"."e_geographic_divisions" to "service_role";

grant truncate on table "public"."e_geographic_divisions" to "service_role";

grant update on table "public"."e_geographic_divisions" to "service_role";

grant delete on table "public"."e_historical_results" to "anon";

grant insert on table "public"."e_historical_results" to "anon";

grant references on table "public"."e_historical_results" to "anon";

grant select on table "public"."e_historical_results" to "anon";

grant trigger on table "public"."e_historical_results" to "anon";

grant truncate on table "public"."e_historical_results" to "anon";

grant update on table "public"."e_historical_results" to "anon";

grant delete on table "public"."e_historical_results" to "authenticated";

grant insert on table "public"."e_historical_results" to "authenticated";

grant references on table "public"."e_historical_results" to "authenticated";

grant select on table "public"."e_historical_results" to "authenticated";

grant trigger on table "public"."e_historical_results" to "authenticated";

grant truncate on table "public"."e_historical_results" to "authenticated";

grant update on table "public"."e_historical_results" to "authenticated";

grant delete on table "public"."e_historical_results" to "service_role";

grant insert on table "public"."e_historical_results" to "service_role";

grant references on table "public"."e_historical_results" to "service_role";

grant select on table "public"."e_historical_results" to "service_role";

grant trigger on table "public"."e_historical_results" to "service_role";

grant truncate on table "public"."e_historical_results" to "service_role";

grant update on table "public"."e_historical_results" to "service_role";

grant delete on table "public"."e_media_assets" to "anon";

grant insert on table "public"."e_media_assets" to "anon";

grant references on table "public"."e_media_assets" to "anon";

grant select on table "public"."e_media_assets" to "anon";

grant trigger on table "public"."e_media_assets" to "anon";

grant truncate on table "public"."e_media_assets" to "anon";

grant update on table "public"."e_media_assets" to "anon";

grant delete on table "public"."e_media_assets" to "authenticated";

grant insert on table "public"."e_media_assets" to "authenticated";

grant references on table "public"."e_media_assets" to "authenticated";

grant select on table "public"."e_media_assets" to "authenticated";

grant trigger on table "public"."e_media_assets" to "authenticated";

grant truncate on table "public"."e_media_assets" to "authenticated";

grant update on table "public"."e_media_assets" to "authenticated";

grant delete on table "public"."e_media_assets" to "service_role";

grant insert on table "public"."e_media_assets" to "service_role";

grant references on table "public"."e_media_assets" to "service_role";

grant select on table "public"."e_media_assets" to "service_role";

grant trigger on table "public"."e_media_assets" to "service_role";

grant truncate on table "public"."e_media_assets" to "service_role";

grant update on table "public"."e_media_assets" to "service_role";

grant delete on table "public"."e_parties" to "anon";

grant insert on table "public"."e_parties" to "anon";

grant references on table "public"."e_parties" to "anon";

grant select on table "public"."e_parties" to "anon";

grant trigger on table "public"."e_parties" to "anon";

grant truncate on table "public"."e_parties" to "anon";

grant update on table "public"."e_parties" to "anon";

grant delete on table "public"."e_parties" to "authenticated";

grant insert on table "public"."e_parties" to "authenticated";

grant references on table "public"."e_parties" to "authenticated";

grant select on table "public"."e_parties" to "authenticated";

grant trigger on table "public"."e_parties" to "authenticated";

grant truncate on table "public"."e_parties" to "authenticated";

grant update on table "public"."e_parties" to "authenticated";

grant delete on table "public"."e_parties" to "service_role";

grant insert on table "public"."e_parties" to "service_role";

grant references on table "public"."e_parties" to "service_role";

grant select on table "public"."e_parties" to "service_role";

grant trigger on table "public"."e_parties" to "service_role";

grant truncate on table "public"."e_parties" to "service_role";

grant update on table "public"."e_parties" to "service_role";

grant delete on table "public"."e_race_candidates" to "anon";

grant insert on table "public"."e_race_candidates" to "anon";

grant references on table "public"."e_race_candidates" to "anon";

grant select on table "public"."e_race_candidates" to "anon";

grant trigger on table "public"."e_race_candidates" to "anon";

grant truncate on table "public"."e_race_candidates" to "anon";

grant update on table "public"."e_race_candidates" to "anon";

grant delete on table "public"."e_race_candidates" to "authenticated";

grant insert on table "public"."e_race_candidates" to "authenticated";

grant references on table "public"."e_race_candidates" to "authenticated";

grant select on table "public"."e_race_candidates" to "authenticated";

grant trigger on table "public"."e_race_candidates" to "authenticated";

grant truncate on table "public"."e_race_candidates" to "authenticated";

grant update on table "public"."e_race_candidates" to "authenticated";

grant delete on table "public"."e_race_candidates" to "service_role";

grant insert on table "public"."e_race_candidates" to "service_role";

grant references on table "public"."e_race_candidates" to "service_role";

grant select on table "public"."e_race_candidates" to "service_role";

grant trigger on table "public"."e_race_candidates" to "service_role";

grant truncate on table "public"."e_race_candidates" to "service_role";

grant update on table "public"."e_race_candidates" to "service_role";

grant delete on table "public"."e_race_results" to "anon";

grant insert on table "public"."e_race_results" to "anon";

grant references on table "public"."e_race_results" to "anon";

grant select on table "public"."e_race_results" to "anon";

grant trigger on table "public"."e_race_results" to "anon";

grant truncate on table "public"."e_race_results" to "anon";

grant update on table "public"."e_race_results" to "anon";

grant delete on table "public"."e_race_results" to "authenticated";

grant insert on table "public"."e_race_results" to "authenticated";

grant references on table "public"."e_race_results" to "authenticated";

grant select on table "public"."e_race_results" to "authenticated";

grant trigger on table "public"."e_race_results" to "authenticated";

grant truncate on table "public"."e_race_results" to "authenticated";

grant update on table "public"."e_race_results" to "authenticated";

grant delete on table "public"."e_race_results" to "service_role";

grant insert on table "public"."e_race_results" to "service_role";

grant references on table "public"."e_race_results" to "service_role";

grant select on table "public"."e_race_results" to "service_role";

grant trigger on table "public"."e_race_results" to "service_role";

grant truncate on table "public"."e_race_results" to "service_role";

grant update on table "public"."e_race_results" to "service_role";

grant delete on table "public"."e_races" to "anon";

grant insert on table "public"."e_races" to "anon";

grant references on table "public"."e_races" to "anon";

grant select on table "public"."e_races" to "anon";

grant trigger on table "public"."e_races" to "anon";

grant truncate on table "public"."e_races" to "anon";

grant update on table "public"."e_races" to "anon";

grant delete on table "public"."e_races" to "authenticated";

grant insert on table "public"."e_races" to "authenticated";

grant references on table "public"."e_races" to "authenticated";

grant select on table "public"."e_races" to "authenticated";

grant trigger on table "public"."e_races" to "authenticated";

grant truncate on table "public"."e_races" to "authenticated";

grant update on table "public"."e_races" to "authenticated";

grant delete on table "public"."e_races" to "service_role";

grant insert on table "public"."e_races" to "service_role";

grant references on table "public"."e_races" to "service_role";

grant select on table "public"."e_races" to "service_role";

grant trigger on table "public"."e_races" to "service_role";

grant truncate on table "public"."e_races" to "service_role";

grant update on table "public"."e_races" to "service_role";

grant delete on table "public"."f_stocks" to "anon";

grant insert on table "public"."f_stocks" to "anon";

grant references on table "public"."f_stocks" to "anon";

grant select on table "public"."f_stocks" to "anon";

grant trigger on table "public"."f_stocks" to "anon";

grant truncate on table "public"."f_stocks" to "anon";

grant update on table "public"."f_stocks" to "anon";

grant delete on table "public"."f_stocks" to "authenticated";

grant insert on table "public"."f_stocks" to "authenticated";

grant references on table "public"."f_stocks" to "authenticated";

grant select on table "public"."f_stocks" to "authenticated";

grant trigger on table "public"."f_stocks" to "authenticated";

grant truncate on table "public"."f_stocks" to "authenticated";

grant update on table "public"."f_stocks" to "authenticated";

grant delete on table "public"."f_stocks" to "service_role";

grant insert on table "public"."f_stocks" to "service_role";

grant references on table "public"."f_stocks" to "service_role";

grant select on table "public"."f_stocks" to "service_role";

grant trigger on table "public"."f_stocks" to "service_role";

grant truncate on table "public"."f_stocks" to "service_role";

grant update on table "public"."f_stocks" to "service_role";

grant delete on table "public"."feeds" to "anon";

grant insert on table "public"."feeds" to "anon";

grant references on table "public"."feeds" to "anon";

grant select on table "public"."feeds" to "anon";

grant trigger on table "public"."feeds" to "anon";

grant truncate on table "public"."feeds" to "anon";

grant update on table "public"."feeds" to "anon";

grant delete on table "public"."feeds" to "authenticated";

grant insert on table "public"."feeds" to "authenticated";

grant references on table "public"."feeds" to "authenticated";

grant select on table "public"."feeds" to "authenticated";

grant trigger on table "public"."feeds" to "authenticated";

grant truncate on table "public"."feeds" to "authenticated";

grant update on table "public"."feeds" to "authenticated";

grant delete on table "public"."feeds" to "service_role";

grant insert on table "public"."feeds" to "service_role";

grant references on table "public"."feeds" to "service_role";

grant select on table "public"."feeds" to "service_role";

grant trigger on table "public"."feeds" to "service_role";

grant truncate on table "public"."feeds" to "service_role";

grant update on table "public"."feeds" to "service_role";

grant delete on table "public"."file_sync_queue" to "anon";

grant insert on table "public"."file_sync_queue" to "anon";

grant references on table "public"."file_sync_queue" to "anon";

grant select on table "public"."file_sync_queue" to "anon";

grant trigger on table "public"."file_sync_queue" to "anon";

grant truncate on table "public"."file_sync_queue" to "anon";

grant update on table "public"."file_sync_queue" to "anon";

grant delete on table "public"."file_sync_queue" to "authenticated";

grant insert on table "public"."file_sync_queue" to "authenticated";

grant references on table "public"."file_sync_queue" to "authenticated";

grant select on table "public"."file_sync_queue" to "authenticated";

grant trigger on table "public"."file_sync_queue" to "authenticated";

grant truncate on table "public"."file_sync_queue" to "authenticated";

grant update on table "public"."file_sync_queue" to "authenticated";

grant delete on table "public"."file_sync_queue" to "service_role";

grant insert on table "public"."file_sync_queue" to "service_role";

grant references on table "public"."file_sync_queue" to "service_role";

grant select on table "public"."file_sync_queue" to "service_role";

grant trigger on table "public"."file_sync_queue" to "service_role";

grant truncate on table "public"."file_sync_queue" to "service_role";

grant update on table "public"."file_sync_queue" to "service_role";

grant delete on table "public"."item_tabfields" to "anon";

grant insert on table "public"."item_tabfields" to "anon";

grant references on table "public"."item_tabfields" to "anon";

grant select on table "public"."item_tabfields" to "anon";

grant trigger on table "public"."item_tabfields" to "anon";

grant truncate on table "public"."item_tabfields" to "anon";

grant update on table "public"."item_tabfields" to "anon";

grant delete on table "public"."item_tabfields" to "authenticated";

grant insert on table "public"."item_tabfields" to "authenticated";

grant references on table "public"."item_tabfields" to "authenticated";

grant select on table "public"."item_tabfields" to "authenticated";

grant trigger on table "public"."item_tabfields" to "authenticated";

grant truncate on table "public"."item_tabfields" to "authenticated";

grant update on table "public"."item_tabfields" to "authenticated";

grant delete on table "public"."item_tabfields" to "service_role";

grant insert on table "public"."item_tabfields" to "service_role";

grant references on table "public"."item_tabfields" to "service_role";

grant select on table "public"."item_tabfields" to "service_role";

grant trigger on table "public"."item_tabfields" to "service_role";

grant truncate on table "public"."item_tabfields" to "service_role";

grant update on table "public"."item_tabfields" to "service_role";

grant delete on table "public"."map_data" to "anon";

grant insert on table "public"."map_data" to "anon";

grant references on table "public"."map_data" to "anon";

grant select on table "public"."map_data" to "anon";

grant trigger on table "public"."map_data" to "anon";

grant truncate on table "public"."map_data" to "anon";

grant update on table "public"."map_data" to "anon";

grant delete on table "public"."map_data" to "authenticated";

grant insert on table "public"."map_data" to "authenticated";

grant references on table "public"."map_data" to "authenticated";

grant select on table "public"."map_data" to "authenticated";

grant trigger on table "public"."map_data" to "authenticated";

grant truncate on table "public"."map_data" to "authenticated";

grant update on table "public"."map_data" to "authenticated";

grant delete on table "public"."map_data" to "service_role";

grant insert on table "public"."map_data" to "service_role";

grant references on table "public"."map_data" to "service_role";

grant select on table "public"."map_data" to "service_role";

grant trigger on table "public"."map_data" to "service_role";

grant truncate on table "public"."map_data" to "service_role";

grant update on table "public"."map_data" to "service_role";

grant delete on table "public"."map_settings" to "anon";

grant insert on table "public"."map_settings" to "anon";

grant references on table "public"."map_settings" to "anon";

grant select on table "public"."map_settings" to "anon";

grant trigger on table "public"."map_settings" to "anon";

grant truncate on table "public"."map_settings" to "anon";

grant update on table "public"."map_settings" to "anon";

grant delete on table "public"."map_settings" to "authenticated";

grant insert on table "public"."map_settings" to "authenticated";

grant references on table "public"."map_settings" to "authenticated";

grant select on table "public"."map_settings" to "authenticated";

grant trigger on table "public"."map_settings" to "authenticated";

grant truncate on table "public"."map_settings" to "authenticated";

grant update on table "public"."map_settings" to "authenticated";

grant delete on table "public"."map_settings" to "service_role";

grant insert on table "public"."map_settings" to "service_role";

grant references on table "public"."map_settings" to "service_role";

grant select on table "public"."map_settings" to "service_role";

grant trigger on table "public"."map_settings" to "service_role";

grant truncate on table "public"."map_settings" to "service_role";

grant update on table "public"."map_settings" to "service_role";

grant delete on table "public"."media_assets" to "anon";

grant insert on table "public"."media_assets" to "anon";

grant references on table "public"."media_assets" to "anon";

grant select on table "public"."media_assets" to "anon";

grant trigger on table "public"."media_assets" to "anon";

grant truncate on table "public"."media_assets" to "anon";

grant update on table "public"."media_assets" to "anon";

grant delete on table "public"."media_assets" to "authenticated";

grant insert on table "public"."media_assets" to "authenticated";

grant references on table "public"."media_assets" to "authenticated";

grant select on table "public"."media_assets" to "authenticated";

grant trigger on table "public"."media_assets" to "authenticated";

grant truncate on table "public"."media_assets" to "authenticated";

grant update on table "public"."media_assets" to "authenticated";

grant delete on table "public"."media_assets" to "service_role";

grant insert on table "public"."media_assets" to "service_role";

grant references on table "public"."media_assets" to "service_role";

grant select on table "public"."media_assets" to "service_role";

grant trigger on table "public"."media_assets" to "service_role";

grant truncate on table "public"."media_assets" to "service_role";

grant update on table "public"."media_assets" to "service_role";

grant delete on table "public"."media_distribution" to "anon";

grant insert on table "public"."media_distribution" to "anon";

grant references on table "public"."media_distribution" to "anon";

grant select on table "public"."media_distribution" to "anon";

grant trigger on table "public"."media_distribution" to "anon";

grant truncate on table "public"."media_distribution" to "anon";

grant update on table "public"."media_distribution" to "anon";

grant delete on table "public"."media_distribution" to "authenticated";

grant insert on table "public"."media_distribution" to "authenticated";

grant references on table "public"."media_distribution" to "authenticated";

grant select on table "public"."media_distribution" to "authenticated";

grant trigger on table "public"."media_distribution" to "authenticated";

grant truncate on table "public"."media_distribution" to "authenticated";

grant update on table "public"."media_distribution" to "authenticated";

grant delete on table "public"."media_distribution" to "service_role";

grant insert on table "public"."media_distribution" to "service_role";

grant references on table "public"."media_distribution" to "service_role";

grant select on table "public"."media_distribution" to "service_role";

grant trigger on table "public"."media_distribution" to "service_role";

grant truncate on table "public"."media_distribution" to "service_role";

grant update on table "public"."media_distribution" to "service_role";

grant delete on table "public"."media_push_queue" to "anon";

grant insert on table "public"."media_push_queue" to "anon";

grant references on table "public"."media_push_queue" to "anon";

grant select on table "public"."media_push_queue" to "anon";

grant trigger on table "public"."media_push_queue" to "anon";

grant truncate on table "public"."media_push_queue" to "anon";

grant update on table "public"."media_push_queue" to "anon";

grant delete on table "public"."media_push_queue" to "authenticated";

grant insert on table "public"."media_push_queue" to "authenticated";

grant references on table "public"."media_push_queue" to "authenticated";

grant select on table "public"."media_push_queue" to "authenticated";

grant trigger on table "public"."media_push_queue" to "authenticated";

grant truncate on table "public"."media_push_queue" to "authenticated";

grant update on table "public"."media_push_queue" to "authenticated";

grant delete on table "public"."media_push_queue" to "service_role";

grant insert on table "public"."media_push_queue" to "service_role";

grant references on table "public"."media_push_queue" to "service_role";

grant select on table "public"."media_push_queue" to "service_role";

grant trigger on table "public"."media_push_queue" to "service_role";

grant truncate on table "public"."media_push_queue" to "service_role";

grant update on table "public"."media_push_queue" to "service_role";

grant delete on table "public"."media_tags" to "anon";

grant insert on table "public"."media_tags" to "anon";

grant references on table "public"."media_tags" to "anon";

grant select on table "public"."media_tags" to "anon";

grant trigger on table "public"."media_tags" to "anon";

grant truncate on table "public"."media_tags" to "anon";

grant update on table "public"."media_tags" to "anon";

grant delete on table "public"."media_tags" to "authenticated";

grant insert on table "public"."media_tags" to "authenticated";

grant references on table "public"."media_tags" to "authenticated";

grant select on table "public"."media_tags" to "authenticated";

grant trigger on table "public"."media_tags" to "authenticated";

grant truncate on table "public"."media_tags" to "authenticated";

grant update on table "public"."media_tags" to "authenticated";

grant delete on table "public"."media_tags" to "service_role";

grant insert on table "public"."media_tags" to "service_role";

grant references on table "public"."media_tags" to "service_role";

grant select on table "public"."media_tags" to "service_role";

grant trigger on table "public"."media_tags" to "service_role";

grant truncate on table "public"."media_tags" to "service_role";

grant update on table "public"."media_tags" to "service_role";

grant delete on table "public"."news_articles" to "anon";

grant insert on table "public"."news_articles" to "anon";

grant references on table "public"."news_articles" to "anon";

grant select on table "public"."news_articles" to "anon";

grant trigger on table "public"."news_articles" to "anon";

grant truncate on table "public"."news_articles" to "anon";

grant update on table "public"."news_articles" to "anon";

grant delete on table "public"."news_articles" to "authenticated";

grant insert on table "public"."news_articles" to "authenticated";

grant references on table "public"."news_articles" to "authenticated";

grant select on table "public"."news_articles" to "authenticated";

grant trigger on table "public"."news_articles" to "authenticated";

grant truncate on table "public"."news_articles" to "authenticated";

grant update on table "public"."news_articles" to "authenticated";

grant delete on table "public"."news_articles" to "service_role";

grant insert on table "public"."news_articles" to "service_role";

grant references on table "public"."news_articles" to "service_role";

grant select on table "public"."news_articles" to "service_role";

grant trigger on table "public"."news_articles" to "service_role";

grant truncate on table "public"."news_articles" to "service_role";

grant update on table "public"."news_articles" to "service_role";

grant delete on table "public"."news_clusters" to "anon";

grant insert on table "public"."news_clusters" to "anon";

grant references on table "public"."news_clusters" to "anon";

grant select on table "public"."news_clusters" to "anon";

grant trigger on table "public"."news_clusters" to "anon";

grant truncate on table "public"."news_clusters" to "anon";

grant update on table "public"."news_clusters" to "anon";

grant delete on table "public"."news_clusters" to "authenticated";

grant insert on table "public"."news_clusters" to "authenticated";

grant references on table "public"."news_clusters" to "authenticated";

grant select on table "public"."news_clusters" to "authenticated";

grant trigger on table "public"."news_clusters" to "authenticated";

grant truncate on table "public"."news_clusters" to "authenticated";

grant update on table "public"."news_clusters" to "authenticated";

grant delete on table "public"."news_clusters" to "service_role";

grant insert on table "public"."news_clusters" to "service_role";

grant references on table "public"."news_clusters" to "service_role";

grant select on table "public"."news_clusters" to "service_role";

grant trigger on table "public"."news_clusters" to "service_role";

grant truncate on table "public"."news_clusters" to "service_role";

grant update on table "public"."news_clusters" to "service_role";

grant delete on table "public"."pulsar_commands" to "anon";

grant insert on table "public"."pulsar_commands" to "anon";

grant references on table "public"."pulsar_commands" to "anon";

grant select on table "public"."pulsar_commands" to "anon";

grant trigger on table "public"."pulsar_commands" to "anon";

grant truncate on table "public"."pulsar_commands" to "anon";

grant update on table "public"."pulsar_commands" to "anon";

grant delete on table "public"."pulsar_commands" to "authenticated";

grant insert on table "public"."pulsar_commands" to "authenticated";

grant references on table "public"."pulsar_commands" to "authenticated";

grant select on table "public"."pulsar_commands" to "authenticated";

grant trigger on table "public"."pulsar_commands" to "authenticated";

grant truncate on table "public"."pulsar_commands" to "authenticated";

grant update on table "public"."pulsar_commands" to "authenticated";

grant delete on table "public"."pulsar_commands" to "service_role";

grant insert on table "public"."pulsar_commands" to "service_role";

grant references on table "public"."pulsar_commands" to "service_role";

grant select on table "public"."pulsar_commands" to "service_role";

grant trigger on table "public"."pulsar_commands" to "service_role";

grant truncate on table "public"."pulsar_commands" to "service_role";

grant update on table "public"."pulsar_commands" to "service_role";

grant delete on table "public"."school_closings" to "anon";

grant insert on table "public"."school_closings" to "anon";

grant references on table "public"."school_closings" to "anon";

grant select on table "public"."school_closings" to "anon";

grant trigger on table "public"."school_closings" to "anon";

grant truncate on table "public"."school_closings" to "anon";

grant update on table "public"."school_closings" to "anon";

grant delete on table "public"."school_closings" to "authenticated";

grant insert on table "public"."school_closings" to "authenticated";

grant references on table "public"."school_closings" to "authenticated";

grant select on table "public"."school_closings" to "authenticated";

grant trigger on table "public"."school_closings" to "authenticated";

grant truncate on table "public"."school_closings" to "authenticated";

grant update on table "public"."school_closings" to "authenticated";

grant delete on table "public"."school_closings" to "service_role";

grant insert on table "public"."school_closings" to "service_role";

grant references on table "public"."school_closings" to "service_role";

grant select on table "public"."school_closings" to "service_role";

grant trigger on table "public"."school_closings" to "service_role";

grant truncate on table "public"."school_closings" to "service_role";

grant update on table "public"."school_closings" to "service_role";

grant delete on table "public"."spatial_ref_sys" to "anon";

grant insert on table "public"."spatial_ref_sys" to "anon";

grant references on table "public"."spatial_ref_sys" to "anon";

grant select on table "public"."spatial_ref_sys" to "anon";

grant trigger on table "public"."spatial_ref_sys" to "anon";

grant truncate on table "public"."spatial_ref_sys" to "anon";

grant update on table "public"."spatial_ref_sys" to "anon";

grant delete on table "public"."spatial_ref_sys" to "authenticated";

grant insert on table "public"."spatial_ref_sys" to "authenticated";

grant references on table "public"."spatial_ref_sys" to "authenticated";

grant select on table "public"."spatial_ref_sys" to "authenticated";

grant trigger on table "public"."spatial_ref_sys" to "authenticated";

grant truncate on table "public"."spatial_ref_sys" to "authenticated";

grant update on table "public"."spatial_ref_sys" to "authenticated";

grant delete on table "public"."spatial_ref_sys" to "postgres";

grant insert on table "public"."spatial_ref_sys" to "postgres";

grant references on table "public"."spatial_ref_sys" to "postgres";

grant select on table "public"."spatial_ref_sys" to "postgres";

grant trigger on table "public"."spatial_ref_sys" to "postgres";

grant truncate on table "public"."spatial_ref_sys" to "postgres";

grant update on table "public"."spatial_ref_sys" to "postgres";

grant delete on table "public"."spatial_ref_sys" to "service_role";

grant insert on table "public"."spatial_ref_sys" to "service_role";

grant references on table "public"."spatial_ref_sys" to "service_role";

grant select on table "public"."spatial_ref_sys" to "service_role";

grant trigger on table "public"."spatial_ref_sys" to "service_role";

grant truncate on table "public"."spatial_ref_sys" to "service_role";

grant update on table "public"."spatial_ref_sys" to "service_role";

grant delete on table "public"."sports_events" to "anon";

grant insert on table "public"."sports_events" to "anon";

grant references on table "public"."sports_events" to "anon";

grant select on table "public"."sports_events" to "anon";

grant trigger on table "public"."sports_events" to "anon";

grant truncate on table "public"."sports_events" to "anon";

grant update on table "public"."sports_events" to "anon";

grant delete on table "public"."sports_events" to "authenticated";

grant insert on table "public"."sports_events" to "authenticated";

grant references on table "public"."sports_events" to "authenticated";

grant select on table "public"."sports_events" to "authenticated";

grant trigger on table "public"."sports_events" to "authenticated";

grant truncate on table "public"."sports_events" to "authenticated";

grant update on table "public"."sports_events" to "authenticated";

grant delete on table "public"."sports_events" to "service_role";

grant insert on table "public"."sports_events" to "service_role";

grant references on table "public"."sports_events" to "service_role";

grant select on table "public"."sports_events" to "service_role";

grant trigger on table "public"."sports_events" to "service_role";

grant truncate on table "public"."sports_events" to "service_role";

grant update on table "public"."sports_events" to "service_role";

grant delete on table "public"."sports_leagues" to "anon";

grant insert on table "public"."sports_leagues" to "anon";

grant references on table "public"."sports_leagues" to "anon";

grant select on table "public"."sports_leagues" to "anon";

grant trigger on table "public"."sports_leagues" to "anon";

grant truncate on table "public"."sports_leagues" to "anon";

grant update on table "public"."sports_leagues" to "anon";

grant delete on table "public"."sports_leagues" to "authenticated";

grant insert on table "public"."sports_leagues" to "authenticated";

grant references on table "public"."sports_leagues" to "authenticated";

grant select on table "public"."sports_leagues" to "authenticated";

grant trigger on table "public"."sports_leagues" to "authenticated";

grant truncate on table "public"."sports_leagues" to "authenticated";

grant update on table "public"."sports_leagues" to "authenticated";

grant delete on table "public"."sports_leagues" to "service_role";

grant insert on table "public"."sports_leagues" to "service_role";

grant references on table "public"."sports_leagues" to "service_role";

grant select on table "public"."sports_leagues" to "service_role";

grant trigger on table "public"."sports_leagues" to "service_role";

grant truncate on table "public"."sports_leagues" to "service_role";

grant update on table "public"."sports_leagues" to "service_role";

grant delete on table "public"."sports_teams" to "anon";

grant insert on table "public"."sports_teams" to "anon";

grant references on table "public"."sports_teams" to "anon";

grant select on table "public"."sports_teams" to "anon";

grant trigger on table "public"."sports_teams" to "anon";

grant truncate on table "public"."sports_teams" to "anon";

grant update on table "public"."sports_teams" to "anon";

grant delete on table "public"."sports_teams" to "authenticated";

grant insert on table "public"."sports_teams" to "authenticated";

grant references on table "public"."sports_teams" to "authenticated";

grant select on table "public"."sports_teams" to "authenticated";

grant trigger on table "public"."sports_teams" to "authenticated";

grant truncate on table "public"."sports_teams" to "authenticated";

grant update on table "public"."sports_teams" to "authenticated";

grant delete on table "public"."sports_teams" to "service_role";

grant insert on table "public"."sports_teams" to "service_role";

grant references on table "public"."sports_teams" to "service_role";

grant select on table "public"."sports_teams" to "service_role";

grant trigger on table "public"."sports_teams" to "service_role";

grant truncate on table "public"."sports_teams" to "service_role";

grant update on table "public"."sports_teams" to "service_role";

grant delete on table "public"."sync_config" to "anon";

grant insert on table "public"."sync_config" to "anon";

grant references on table "public"."sync_config" to "anon";

grant select on table "public"."sync_config" to "anon";

grant trigger on table "public"."sync_config" to "anon";

grant truncate on table "public"."sync_config" to "anon";

grant update on table "public"."sync_config" to "anon";

grant delete on table "public"."sync_config" to "authenticated";

grant insert on table "public"."sync_config" to "authenticated";

grant references on table "public"."sync_config" to "authenticated";

grant select on table "public"."sync_config" to "authenticated";

grant trigger on table "public"."sync_config" to "authenticated";

grant truncate on table "public"."sync_config" to "authenticated";

grant update on table "public"."sync_config" to "authenticated";

grant delete on table "public"."sync_config" to "service_role";

grant insert on table "public"."sync_config" to "service_role";

grant references on table "public"."sync_config" to "service_role";

grant select on table "public"."sync_config" to "service_role";

grant trigger on table "public"."sync_config" to "service_role";

grant truncate on table "public"."sync_config" to "service_role";

grant update on table "public"."sync_config" to "service_role";

grant delete on table "public"."sync_queue" to "anon";

grant insert on table "public"."sync_queue" to "anon";

grant references on table "public"."sync_queue" to "anon";

grant select on table "public"."sync_queue" to "anon";

grant trigger on table "public"."sync_queue" to "anon";

grant truncate on table "public"."sync_queue" to "anon";

grant update on table "public"."sync_queue" to "anon";

grant delete on table "public"."sync_queue" to "authenticated";

grant insert on table "public"."sync_queue" to "authenticated";

grant references on table "public"."sync_queue" to "authenticated";

grant select on table "public"."sync_queue" to "authenticated";

grant trigger on table "public"."sync_queue" to "authenticated";

grant truncate on table "public"."sync_queue" to "authenticated";

grant update on table "public"."sync_queue" to "authenticated";

grant delete on table "public"."sync_queue" to "service_role";

grant insert on table "public"."sync_queue" to "service_role";

grant references on table "public"."sync_queue" to "service_role";

grant select on table "public"."sync_queue" to "service_role";

grant trigger on table "public"."sync_queue" to "service_role";

grant truncate on table "public"."sync_queue" to "service_role";

grant update on table "public"."sync_queue" to "service_role";

grant delete on table "public"."systems" to "anon";

grant insert on table "public"."systems" to "anon";

grant references on table "public"."systems" to "anon";

grant select on table "public"."systems" to "anon";

grant trigger on table "public"."systems" to "anon";

grant truncate on table "public"."systems" to "anon";

grant update on table "public"."systems" to "anon";

grant delete on table "public"."systems" to "authenticated";

grant insert on table "public"."systems" to "authenticated";

grant references on table "public"."systems" to "authenticated";

grant select on table "public"."systems" to "authenticated";

grant trigger on table "public"."systems" to "authenticated";

grant truncate on table "public"."systems" to "authenticated";

grant update on table "public"."systems" to "authenticated";

grant delete on table "public"."systems" to "service_role";

grant insert on table "public"."systems" to "service_role";

grant references on table "public"."systems" to "service_role";

grant select on table "public"."systems" to "service_role";

grant trigger on table "public"."systems" to "service_role";

grant truncate on table "public"."systems" to "service_role";

grant update on table "public"."systems" to "service_role";

grant delete on table "public"."tabfields" to "anon";

grant insert on table "public"."tabfields" to "anon";

grant references on table "public"."tabfields" to "anon";

grant select on table "public"."tabfields" to "anon";

grant trigger on table "public"."tabfields" to "anon";

grant truncate on table "public"."tabfields" to "anon";

grant update on table "public"."tabfields" to "anon";

grant delete on table "public"."tabfields" to "authenticated";

grant insert on table "public"."tabfields" to "authenticated";

grant references on table "public"."tabfields" to "authenticated";

grant select on table "public"."tabfields" to "authenticated";

grant trigger on table "public"."tabfields" to "authenticated";

grant truncate on table "public"."tabfields" to "authenticated";

grant update on table "public"."tabfields" to "authenticated";

grant delete on table "public"."tabfields" to "service_role";

grant insert on table "public"."tabfields" to "service_role";

grant references on table "public"."tabfields" to "service_role";

grant select on table "public"."tabfields" to "service_role";

grant trigger on table "public"."tabfields" to "service_role";

grant truncate on table "public"."tabfields" to "service_role";

grant update on table "public"."tabfields" to "service_role";

grant delete on table "public"."tags" to "anon";

grant insert on table "public"."tags" to "anon";

grant references on table "public"."tags" to "anon";

grant select on table "public"."tags" to "anon";

grant trigger on table "public"."tags" to "anon";

grant truncate on table "public"."tags" to "anon";

grant update on table "public"."tags" to "anon";

grant delete on table "public"."tags" to "authenticated";

grant insert on table "public"."tags" to "authenticated";

grant references on table "public"."tags" to "authenticated";

grant select on table "public"."tags" to "authenticated";

grant trigger on table "public"."tags" to "authenticated";

grant truncate on table "public"."tags" to "authenticated";

grant update on table "public"."tags" to "authenticated";

grant delete on table "public"."tags" to "service_role";

grant insert on table "public"."tags" to "service_role";

grant references on table "public"."tags" to "service_role";

grant select on table "public"."tags" to "service_role";

grant trigger on table "public"."tags" to "service_role";

grant truncate on table "public"."tags" to "service_role";

grant update on table "public"."tags" to "service_role";

grant delete on table "public"."template_forms" to "anon";

grant insert on table "public"."template_forms" to "anon";

grant references on table "public"."template_forms" to "anon";

grant select on table "public"."template_forms" to "anon";

grant trigger on table "public"."template_forms" to "anon";

grant truncate on table "public"."template_forms" to "anon";

grant update on table "public"."template_forms" to "anon";

grant delete on table "public"."template_forms" to "authenticated";

grant insert on table "public"."template_forms" to "authenticated";

grant references on table "public"."template_forms" to "authenticated";

grant select on table "public"."template_forms" to "authenticated";

grant trigger on table "public"."template_forms" to "authenticated";

grant truncate on table "public"."template_forms" to "authenticated";

grant update on table "public"."template_forms" to "authenticated";

grant delete on table "public"."template_forms" to "service_role";

grant insert on table "public"."template_forms" to "service_role";

grant references on table "public"."template_forms" to "service_role";

grant select on table "public"."template_forms" to "service_role";

grant trigger on table "public"."template_forms" to "service_role";

grant truncate on table "public"."template_forms" to "service_role";

grant update on table "public"."template_forms" to "service_role";

grant delete on table "public"."template_settings" to "anon";

grant insert on table "public"."template_settings" to "anon";

grant references on table "public"."template_settings" to "anon";

grant select on table "public"."template_settings" to "anon";

grant trigger on table "public"."template_settings" to "anon";

grant truncate on table "public"."template_settings" to "anon";

grant update on table "public"."template_settings" to "anon";

grant delete on table "public"."template_settings" to "authenticated";

grant insert on table "public"."template_settings" to "authenticated";

grant references on table "public"."template_settings" to "authenticated";

grant select on table "public"."template_settings" to "authenticated";

grant trigger on table "public"."template_settings" to "authenticated";

grant truncate on table "public"."template_settings" to "authenticated";

grant update on table "public"."template_settings" to "authenticated";

grant delete on table "public"."template_settings" to "service_role";

grant insert on table "public"."template_settings" to "service_role";

grant references on table "public"."template_settings" to "service_role";

grant select on table "public"."template_settings" to "service_role";

grant trigger on table "public"."template_settings" to "service_role";

grant truncate on table "public"."template_settings" to "service_role";

grant update on table "public"."template_settings" to "service_role";

grant delete on table "public"."templates" to "anon";

grant insert on table "public"."templates" to "anon";

grant references on table "public"."templates" to "anon";

grant select on table "public"."templates" to "anon";

grant trigger on table "public"."templates" to "anon";

grant truncate on table "public"."templates" to "anon";

grant update on table "public"."templates" to "anon";

grant delete on table "public"."templates" to "authenticated";

grant insert on table "public"."templates" to "authenticated";

grant references on table "public"."templates" to "authenticated";

grant select on table "public"."templates" to "authenticated";

grant trigger on table "public"."templates" to "authenticated";

grant truncate on table "public"."templates" to "authenticated";

grant update on table "public"."templates" to "authenticated";

grant delete on table "public"."templates" to "service_role";

grant insert on table "public"."templates" to "service_role";

grant references on table "public"."templates" to "service_role";

grant select on table "public"."templates" to "service_role";

grant trigger on table "public"."templates" to "service_role";

grant truncate on table "public"."templates" to "service_role";

grant update on table "public"."templates" to "service_role";

grant delete on table "public"."user_groups" to "anon";

grant insert on table "public"."user_groups" to "anon";

grant references on table "public"."user_groups" to "anon";

grant select on table "public"."user_groups" to "anon";

grant trigger on table "public"."user_groups" to "anon";

grant truncate on table "public"."user_groups" to "anon";

grant update on table "public"."user_groups" to "anon";

grant delete on table "public"."user_groups" to "authenticated";

grant insert on table "public"."user_groups" to "authenticated";

grant references on table "public"."user_groups" to "authenticated";

grant select on table "public"."user_groups" to "authenticated";

grant trigger on table "public"."user_groups" to "authenticated";

grant truncate on table "public"."user_groups" to "authenticated";

grant update on table "public"."user_groups" to "authenticated";

grant delete on table "public"."user_groups" to "service_role";

grant insert on table "public"."user_groups" to "service_role";

grant references on table "public"."user_groups" to "service_role";

grant select on table "public"."user_groups" to "service_role";

grant trigger on table "public"."user_groups" to "service_role";

grant truncate on table "public"."user_groups" to "service_role";

grant update on table "public"."user_groups" to "service_role";

grant delete on table "public"."user_layouts" to "anon";

grant insert on table "public"."user_layouts" to "anon";

grant references on table "public"."user_layouts" to "anon";

grant select on table "public"."user_layouts" to "anon";

grant trigger on table "public"."user_layouts" to "anon";

grant truncate on table "public"."user_layouts" to "anon";

grant update on table "public"."user_layouts" to "anon";

grant delete on table "public"."user_layouts" to "authenticated";

grant insert on table "public"."user_layouts" to "authenticated";

grant references on table "public"."user_layouts" to "authenticated";

grant select on table "public"."user_layouts" to "authenticated";

grant trigger on table "public"."user_layouts" to "authenticated";

grant truncate on table "public"."user_layouts" to "authenticated";

grant update on table "public"."user_layouts" to "authenticated";

grant delete on table "public"."user_layouts" to "service_role";

grant insert on table "public"."user_layouts" to "service_role";

grant references on table "public"."user_layouts" to "service_role";

grant select on table "public"."user_layouts" to "service_role";

grant trigger on table "public"."user_layouts" to "service_role";

grant truncate on table "public"."user_layouts" to "service_role";

grant update on table "public"."user_layouts" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

grant delete on table "public"."weather_air_quality" to "anon";

grant insert on table "public"."weather_air_quality" to "anon";

grant references on table "public"."weather_air_quality" to "anon";

grant select on table "public"."weather_air_quality" to "anon";

grant trigger on table "public"."weather_air_quality" to "anon";

grant truncate on table "public"."weather_air_quality" to "anon";

grant update on table "public"."weather_air_quality" to "anon";

grant delete on table "public"."weather_air_quality" to "authenticated";

grant insert on table "public"."weather_air_quality" to "authenticated";

grant references on table "public"."weather_air_quality" to "authenticated";

grant select on table "public"."weather_air_quality" to "authenticated";

grant trigger on table "public"."weather_air_quality" to "authenticated";

grant truncate on table "public"."weather_air_quality" to "authenticated";

grant update on table "public"."weather_air_quality" to "authenticated";

grant delete on table "public"."weather_air_quality" to "service_role";

grant insert on table "public"."weather_air_quality" to "service_role";

grant references on table "public"."weather_air_quality" to "service_role";

grant select on table "public"."weather_air_quality" to "service_role";

grant trigger on table "public"."weather_air_quality" to "service_role";

grant truncate on table "public"."weather_air_quality" to "service_role";

grant update on table "public"."weather_air_quality" to "service_role";

grant delete on table "public"."weather_alerts" to "anon";

grant insert on table "public"."weather_alerts" to "anon";

grant references on table "public"."weather_alerts" to "anon";

grant select on table "public"."weather_alerts" to "anon";

grant trigger on table "public"."weather_alerts" to "anon";

grant truncate on table "public"."weather_alerts" to "anon";

grant update on table "public"."weather_alerts" to "anon";

grant delete on table "public"."weather_alerts" to "authenticated";

grant insert on table "public"."weather_alerts" to "authenticated";

grant references on table "public"."weather_alerts" to "authenticated";

grant select on table "public"."weather_alerts" to "authenticated";

grant trigger on table "public"."weather_alerts" to "authenticated";

grant truncate on table "public"."weather_alerts" to "authenticated";

grant update on table "public"."weather_alerts" to "authenticated";

grant delete on table "public"."weather_alerts" to "service_role";

grant insert on table "public"."weather_alerts" to "service_role";

grant references on table "public"."weather_alerts" to "service_role";

grant select on table "public"."weather_alerts" to "service_role";

grant trigger on table "public"."weather_alerts" to "service_role";

grant truncate on table "public"."weather_alerts" to "service_role";

grant update on table "public"."weather_alerts" to "service_role";

grant delete on table "public"."weather_current" to "anon";

grant insert on table "public"."weather_current" to "anon";

grant references on table "public"."weather_current" to "anon";

grant select on table "public"."weather_current" to "anon";

grant trigger on table "public"."weather_current" to "anon";

grant truncate on table "public"."weather_current" to "anon";

grant update on table "public"."weather_current" to "anon";

grant delete on table "public"."weather_current" to "authenticated";

grant insert on table "public"."weather_current" to "authenticated";

grant references on table "public"."weather_current" to "authenticated";

grant select on table "public"."weather_current" to "authenticated";

grant trigger on table "public"."weather_current" to "authenticated";

grant truncate on table "public"."weather_current" to "authenticated";

grant update on table "public"."weather_current" to "authenticated";

grant delete on table "public"."weather_current" to "service_role";

grant insert on table "public"."weather_current" to "service_role";

grant references on table "public"."weather_current" to "service_role";

grant select on table "public"."weather_current" to "service_role";

grant trigger on table "public"."weather_current" to "service_role";

grant truncate on table "public"."weather_current" to "service_role";

grant update on table "public"."weather_current" to "service_role";

grant delete on table "public"."weather_daily_forecast" to "anon";

grant insert on table "public"."weather_daily_forecast" to "anon";

grant references on table "public"."weather_daily_forecast" to "anon";

grant select on table "public"."weather_daily_forecast" to "anon";

grant trigger on table "public"."weather_daily_forecast" to "anon";

grant truncate on table "public"."weather_daily_forecast" to "anon";

grant update on table "public"."weather_daily_forecast" to "anon";

grant delete on table "public"."weather_daily_forecast" to "authenticated";

grant insert on table "public"."weather_daily_forecast" to "authenticated";

grant references on table "public"."weather_daily_forecast" to "authenticated";

grant select on table "public"."weather_daily_forecast" to "authenticated";

grant trigger on table "public"."weather_daily_forecast" to "authenticated";

grant truncate on table "public"."weather_daily_forecast" to "authenticated";

grant update on table "public"."weather_daily_forecast" to "authenticated";

grant delete on table "public"."weather_daily_forecast" to "service_role";

grant insert on table "public"."weather_daily_forecast" to "service_role";

grant references on table "public"."weather_daily_forecast" to "service_role";

grant select on table "public"."weather_daily_forecast" to "service_role";

grant trigger on table "public"."weather_daily_forecast" to "service_role";

grant truncate on table "public"."weather_daily_forecast" to "service_role";

grant update on table "public"."weather_daily_forecast" to "service_role";

grant delete on table "public"."weather_hourly_forecast" to "anon";

grant insert on table "public"."weather_hourly_forecast" to "anon";

grant references on table "public"."weather_hourly_forecast" to "anon";

grant select on table "public"."weather_hourly_forecast" to "anon";

grant trigger on table "public"."weather_hourly_forecast" to "anon";

grant truncate on table "public"."weather_hourly_forecast" to "anon";

grant update on table "public"."weather_hourly_forecast" to "anon";

grant delete on table "public"."weather_hourly_forecast" to "authenticated";

grant insert on table "public"."weather_hourly_forecast" to "authenticated";

grant references on table "public"."weather_hourly_forecast" to "authenticated";

grant select on table "public"."weather_hourly_forecast" to "authenticated";

grant trigger on table "public"."weather_hourly_forecast" to "authenticated";

grant truncate on table "public"."weather_hourly_forecast" to "authenticated";

grant update on table "public"."weather_hourly_forecast" to "authenticated";

grant delete on table "public"."weather_hourly_forecast" to "service_role";

grant insert on table "public"."weather_hourly_forecast" to "service_role";

grant references on table "public"."weather_hourly_forecast" to "service_role";

grant select on table "public"."weather_hourly_forecast" to "service_role";

grant trigger on table "public"."weather_hourly_forecast" to "service_role";

grant truncate on table "public"."weather_hourly_forecast" to "service_role";

grant update on table "public"."weather_hourly_forecast" to "service_role";

grant delete on table "public"."weather_ingest_config" to "anon";

grant insert on table "public"."weather_ingest_config" to "anon";

grant references on table "public"."weather_ingest_config" to "anon";

grant select on table "public"."weather_ingest_config" to "anon";

grant trigger on table "public"."weather_ingest_config" to "anon";

grant truncate on table "public"."weather_ingest_config" to "anon";

grant update on table "public"."weather_ingest_config" to "anon";

grant delete on table "public"."weather_ingest_config" to "authenticated";

grant insert on table "public"."weather_ingest_config" to "authenticated";

grant references on table "public"."weather_ingest_config" to "authenticated";

grant select on table "public"."weather_ingest_config" to "authenticated";

grant trigger on table "public"."weather_ingest_config" to "authenticated";

grant truncate on table "public"."weather_ingest_config" to "authenticated";

grant update on table "public"."weather_ingest_config" to "authenticated";

grant delete on table "public"."weather_ingest_config" to "service_role";

grant insert on table "public"."weather_ingest_config" to "service_role";

grant references on table "public"."weather_ingest_config" to "service_role";

grant select on table "public"."weather_ingest_config" to "service_role";

grant trigger on table "public"."weather_ingest_config" to "service_role";

grant truncate on table "public"."weather_ingest_config" to "service_role";

grant update on table "public"."weather_ingest_config" to "service_role";

grant delete on table "public"."weather_locations" to "anon";

grant insert on table "public"."weather_locations" to "anon";

grant references on table "public"."weather_locations" to "anon";

grant select on table "public"."weather_locations" to "anon";

grant trigger on table "public"."weather_locations" to "anon";

grant truncate on table "public"."weather_locations" to "anon";

grant update on table "public"."weather_locations" to "anon";

grant delete on table "public"."weather_locations" to "authenticated";

grant insert on table "public"."weather_locations" to "authenticated";

grant references on table "public"."weather_locations" to "authenticated";

grant select on table "public"."weather_locations" to "authenticated";

grant trigger on table "public"."weather_locations" to "authenticated";

grant truncate on table "public"."weather_locations" to "authenticated";

grant update on table "public"."weather_locations" to "authenticated";

grant delete on table "public"."weather_locations" to "service_role";

grant insert on table "public"."weather_locations" to "service_role";

grant references on table "public"."weather_locations" to "service_role";

grant select on table "public"."weather_locations" to "service_role";

grant trigger on table "public"."weather_locations" to "service_role";

grant truncate on table "public"."weather_locations" to "service_role";

grant update on table "public"."weather_locations" to "service_role";


  create policy "Allow all for authenticated users"
  on "public"."agent_runs"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow all for authenticated users"
  on "public"."agents"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow all operations for authenticated users"
  on "public"."ai_insights_elections"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow public read access"
  on "public"."ai_insights_elections"
  as permissive
  for select
  to public
using (true);



  create policy "Allow all operations on ai_insights_finance"
  on "public"."ai_insights_finance"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all operations on weather_ai_insights"
  on "public"."ai_insights_weather"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "allow all public"
  on "public"."ai_prompt_injectors"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all operations for authenticated users"
  on "public"."ai_providers"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Allow service role full access"
  on "public"."ai_providers"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Full access for authenticated users"
  on "public"."api_access_logs"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Users can view logs for their endpoints"
  on "public"."api_access_logs"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.api_endpoints
  WHERE ((api_endpoints.id = api_access_logs.endpoint_id) AND (api_endpoints.user_id = auth.uid())))));



  create policy "Full access for authenticated users"
  on "public"."api_documentation"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Users can manage docs for their endpoints"
  on "public"."api_documentation"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.api_endpoints
  WHERE ((api_endpoints.id = api_documentation.endpoint_id) AND (api_endpoints.user_id = auth.uid())))));



  create policy "Full access for authenticated users"
  on "public"."api_endpoint_sources"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Users can manage sources for their endpoints"
  on "public"."api_endpoint_sources"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.api_endpoints
  WHERE ((api_endpoints.id = api_endpoint_sources.endpoint_id) AND (api_endpoints.user_id = auth.uid())))));



  create policy "allow public all"
  on "public"."api_endpoint_sources"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "All authenticated users can delete api_endpoints"
  on "public"."api_endpoints"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "All authenticated users can insert api_endpoints"
  on "public"."api_endpoints"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "All authenticated users can update api_endpoints"
  on "public"."api_endpoints"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "All authenticated users can view api_endpoints"
  on "public"."api_endpoints"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Anyone can view api_endpoints"
  on "public"."api_endpoints"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Authenticated users can create api_endpoints"
  on "public"."api_endpoints"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Full access for authenticated users"
  on "public"."api_endpoints"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Users can create their own endpoints"
  on "public"."api_endpoints"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can delete their own endpoints"
  on "public"."api_endpoints"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own endpoints"
  on "public"."api_endpoints"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own or active endpoints"
  on "public"."api_endpoints"
  as permissive
  for select
  to public
using (((auth.uid() = user_id) OR (active = true)));



  create policy "allow public all"
  on "public"."api_endpoints"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Public read access"
  on "public"."bop_election_results"
  as permissive
  for select
  to public
using (true);



  create policy "Public read access"
  on "public"."bop_insufficient_vote_details"
  as permissive
  for select
  to public
using (true);



  create policy "Public read access"
  on "public"."bop_net_changes"
  as permissive
  for select
  to public
using (true);



  create policy "Public read access"
  on "public"."bop_party_results"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated can read"
  on "public"."channel_playlists"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Authenticated users - full access"
  on "public"."channel_playlists"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated delete from channels"
  on "public"."channels"
  as permissive
  for delete
  to public
using (true);



  create policy "Allow authenticated insert to channels"
  on "public"."channels"
  as permissive
  for insert
  to public
with check (true);



  create policy "Allow authenticated update to channels"
  on "public"."channels"
  as permissive
  for update
  to public
using (true);



  create policy "Allow public read access to channels"
  on "public"."channels"
  as permissive
  for select
  to public
using (true);



  create policy "Enable delete for authenticated users only"
  on "public"."channels"
  as permissive
  for delete
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Enable insert for authenticated users only"
  on "public"."channels"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Enable read access for all users"
  on "public"."channels"
  as permissive
  for select
  to public
using (true);



  create policy "Enable update for authenticated users only"
  on "public"."channels"
  as permissive
  for update
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Authenticated users - full access"
  on "public"."content"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));



  create policy "Users can delete content and widgets"
  on "public"."content"
  as permissive
  for delete
  to public
using (((type = 'widget'::text) OR (auth.uid() = user_id)));



  create policy "Users can insert content and widgets"
  on "public"."content"
  as permissive
  for insert
  to public
with check ((((type = 'widget'::text) AND (user_id IS NULL)) OR (auth.uid() = user_id)));



  create policy "Users can read content and widgets"
  on "public"."content"
  as permissive
  for select
  to public
using (((type = 'widget'::text) OR (auth.uid() = user_id)));



  create policy "Users can update content and widgets"
  on "public"."content"
  as permissive
  for update
  to public
using (((type = 'widget'::text) OR (auth.uid() = user_id)))
with check (((type = 'widget'::text) OR (auth.uid() = user_id)));



  create policy "Authenticated users can manage providers"
  on "public"."data_providers"
  as permissive
  for all
  to public
using (true);



  create policy "Public can view providers"
  on "public"."data_providers"
  as permissive
  for select
  to public
using (true);



  create policy "Users can view their own sync logs"
  on "public"."data_source_sync_logs"
  as permissive
  for select
  to public
using ((data_source_id IN ( SELECT data_sources.id
   FROM public.data_sources
  WHERE (data_sources.user_id = auth.uid()))));



  create policy "Anyone can read active data sources"
  on "public"."data_sources"
  as permissive
  for select
  to public
using ((active = true));



  create policy "Authenticated users - full access"
  on "public"."data_sources"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));



  create policy "Public read access to data sources"
  on "public"."data_sources"
  as permissive
  for select
  to public
using (true);



  create policy "allow public all"
  on "public"."data_sources"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Public read access"
  on "public"."e_ap_call_history"
  as permissive
  for select
  to public
using (true);



  create policy "all select"
  on "public"."e_ap_call_history"
  as permissive
  for select
  to public
using (true);



  create policy "allow public all"
  on "public"."e_ap_call_history"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Public read access"
  on "public"."e_ballot_measure_results"
  as permissive
  for select
  to public
using (true);



  create policy "Public read access"
  on "public"."e_ballot_measures"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated users can create overrides"
  on "public"."e_candidate_results"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Public read access"
  on "public"."e_candidate_results"
  as permissive
  for select
  to public
using (true);



  create policy "Public update access"
  on "public"."e_candidate_results"
  as permissive
  for update
  to public
using (true);



  create policy "Public read access"
  on "public"."e_candidates"
  as permissive
  for select
  to public
using (true);



  create policy "Public update access"
  on "public"."e_candidates"
  as permissive
  for update
  to public
using (true);



  create policy "Public read access"
  on "public"."e_countries"
  as permissive
  for select
  to public
using (true);



  create policy "Public read access"
  on "public"."e_election_data_ingestion_log"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated users can view override logs"
  on "public"."e_election_data_overrides_log"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Public users can insert override logs"
  on "public"."e_election_data_overrides_log"
  as permissive
  for insert
  to public
with check (true);



  create policy "Public users can update override logs"
  on "public"."e_election_data_overrides_log"
  as permissive
  for update
  to public
using (true);



  create policy "Public users can view override logs"
  on "public"."e_election_data_overrides_log"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated users can manage"
  on "public"."e_election_data_sources"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Public read access"
  on "public"."e_election_data_sources"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated users can manage editorial"
  on "public"."e_election_editorial_content"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Public read access"
  on "public"."e_election_editorial_content"
  as permissive
  for select
  to public
using (((status)::text = 'published'::text));



  create policy "Public read access"
  on "public"."e_elections"
  as permissive
  for select
  to public
using (true);



  create policy "Public read access"
  on "public"."e_exit_polls"
  as permissive
  for select
  to public
using (true);



  create policy "Allow public to read"
  on "public"."e_geographic_divisions"
  as permissive
  for select
  to public
using (true);



  create policy "Public read access"
  on "public"."e_geographic_divisions"
  as permissive
  for select
  to public
using (true);



  create policy "Public read access"
  on "public"."e_historical_results"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated users can manage media"
  on "public"."e_media_assets"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Public read access"
  on "public"."e_media_assets"
  as permissive
  for select
  to public
using ((active = true));



  create policy "Public read access"
  on "public"."e_parties"
  as permissive
  for select
  to public
using ((active = true));



  create policy "Public update access"
  on "public"."e_parties"
  as permissive
  for update
  to public
using (true);



  create policy "Public read access"
  on "public"."e_race_candidates"
  as permissive
  for select
  to public
using (true);



  create policy "Public update access"
  on "public"."e_race_candidates"
  as permissive
  for update
  to public
using (true);



  create policy "Authenticated users can create overrides"
  on "public"."e_race_results"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Public read access"
  on "public"."e_race_results"
  as permissive
  for select
  to public
using (true);



  create policy "allow public update"
  on "public"."e_race_results"
  as permissive
  for update
  to public
using (true)
with check (true);



  create policy "Public read access"
  on "public"."e_races"
  as permissive
  for select
  to public
using (true);



  create policy "Public update access"
  on "public"."e_races"
  as permissive
  for update
  to public
using (true);



  create policy "allow public all"
  on "public"."f_stocks"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all for authenticated users"
  on "public"."feeds"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Anyone authenticated can read item_tabfields"
  on "public"."item_tabfields"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Authenticated users - full access"
  on "public"."item_tabfields"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));



  create policy "Users can delete own map settings"
  on "public"."map_settings"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert own map settings"
  on "public"."map_settings"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update own map settings"
  on "public"."map_settings"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can view own map settings"
  on "public"."map_settings"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Public read access to news articles"
  on "public"."news_articles"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Service role full access to news articles"
  on "public"."news_articles"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Allow all for authenticated users"
  on "public"."sports_events"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow public delete access to sports_leagues"
  on "public"."sports_leagues"
  as permissive
  for delete
  to public
using (true);



  create policy "Allow public insert access to sports_leagues"
  on "public"."sports_leagues"
  as permissive
  for insert
  to public
with check (true);



  create policy "Allow public read access to sports_leagues"
  on "public"."sports_leagues"
  as permissive
  for select
  to public
using (true);



  create policy "Allow public update access to sports_leagues"
  on "public"."sports_leagues"
  as permissive
  for update
  to public
using (true);



  create policy "Allow public delete access to sports_teams"
  on "public"."sports_teams"
  as permissive
  for delete
  to public
using (true);



  create policy "Allow public insert access to sports_teams"
  on "public"."sports_teams"
  as permissive
  for insert
  to public
with check (true);



  create policy "Allow public read access to sports_teams"
  on "public"."sports_teams"
  as permissive
  for select
  to public
using (true);



  create policy "Allow public update access to sports_teams"
  on "public"."sports_teams"
  as permissive
  for update
  to public
using (true);



  create policy "Anyone authenticated can read tabfields"
  on "public"."tabfields"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Authenticated users - full access"
  on "public"."tabfields"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));



  create policy "Anyone authenticated can read template_forms"
  on "public"."template_forms"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Authenticated users - full access"
  on "public"."template_forms"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));



  create policy "Authenticated users - full access"
  on "public"."templates"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));

  create policy "Authenticated users - full access"
  on "public"."template_settings"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));

  create policy "Allow all for authenticated users"
  on "public"."user_groups"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Users access own layouts combined"
  on "public"."user_layouts"
  as permissive
  for all
  to public
using (((auth.role() = 'authenticated'::text) AND (((auth.uid() IS NOT NULL) AND (auth.uid() = user_id)) OR ((auth.uid() IS NOT NULL) AND ((auth.uid())::text = (user_id)::text)) OR ((user_id)::text = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)))))
with check (((auth.role() = 'authenticated'::text) AND (((auth.uid() IS NOT NULL) AND (auth.uid() = user_id)) OR ((auth.uid() IS NOT NULL) AND ((auth.uid())::text = (user_id)::text)) OR ((user_id)::text = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)))));



  create policy "Users can manage their own layouts"
  on "public"."user_layouts"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "Allow all for authenticated users"
  on "public"."users"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated users to read weather_air_quality"
  on "public"."weather_air_quality"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow service role to insert weather_air_quality"
  on "public"."weather_air_quality"
  as permissive
  for insert
  to service_role
with check (true);



  create policy "Allow service role to update weather_air_quality"
  on "public"."weather_air_quality"
  as permissive
  for update
  to service_role
using (true)
with check (true);



  create policy "Allow authenticated users to read weather_alerts"
  on "public"."weather_alerts"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow service role to insert weather_alerts"
  on "public"."weather_alerts"
  as permissive
  for insert
  to service_role
with check (true);



  create policy "Allow service role to update weather_alerts"
  on "public"."weather_alerts"
  as permissive
  for update
  to service_role
using (true)
with check (true);



  create policy "Allow authenticated users to read weather_current"
  on "public"."weather_current"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow service role to insert weather_current"
  on "public"."weather_current"
  as permissive
  for insert
  to service_role
with check (true);



  create policy "Allow service role to update weather_current"
  on "public"."weather_current"
  as permissive
  for update
  to service_role
using (true)
with check (true);



  create policy "Allow authenticated users to read weather_daily_forecast"
  on "public"."weather_daily_forecast"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow service role to insert weather_daily_forecast"
  on "public"."weather_daily_forecast"
  as permissive
  for insert
  to service_role
with check (true);



  create policy "Allow service role to update weather_daily_forecast"
  on "public"."weather_daily_forecast"
  as permissive
  for update
  to service_role
using (true)
with check (true);



  create policy "Allow authenticated users to read weather_hourly_forecast"
  on "public"."weather_hourly_forecast"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow service role to insert weather_hourly_forecast"
  on "public"."weather_hourly_forecast"
  as permissive
  for insert
  to service_role
with check (true);



  create policy "Allow service role to update weather_hourly_forecast"
  on "public"."weather_hourly_forecast"
  as permissive
  for update
  to service_role
using (true)
with check (true);



  create policy "Allow authenticated users to read weather_locations"
  on "public"."weather_locations"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow service role to delete weather_locations"
  on "public"."weather_locations"
  as permissive
  for delete
  to service_role
using (true);



  create policy "Allow service role to insert weather_locations"
  on "public"."weather_locations"
  as permissive
  for insert
  to service_role
with check (true);



  create policy "Allow service role to update weather_locations"
  on "public"."weather_locations"
  as permissive
  for update
  to service_role
using (true)
with check (true);



  create policy "allow_delete_weather_locations"
  on "public"."weather_locations"
  as permissive
  for delete
  to authenticated, anon
using (true);


CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_ai_prompt_injectors_updated BEFORE UPDATE ON public.ai_prompt_injectors FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER ai_providers_updated_at_trigger BEFORE UPDATE ON public.ai_providers FOR EACH ROW EXECUTE FUNCTION public.update_ai_providers_updated_at();

CREATE TRIGGER update_api_documentation_updated_at BEFORE UPDATE ON public.api_documentation FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_api_endpoints_updated_at BEFORE UPDATE ON public.api_endpoints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_applications_timestamp BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER shift_order_on_delete AFTER DELETE ON public.channel_playlists FOR EACH ROW EXECUTE FUNCTION public.shift_order_on_delete();

CREATE TRIGGER validate_channel_hierarchy BEFORE INSERT OR UPDATE ON public.channel_playlists FOR EACH ROW EXECUTE FUNCTION public.validate_channel_hierarchy();

CREATE TRIGGER channels_updated_at BEFORE UPDATE ON public.channels FOR EACH ROW EXECUTE FUNCTION public.update_channels_updated_at();

CREATE TRIGGER channels_updated_at_trigger BEFORE UPDATE ON public.channels FOR EACH ROW EXECUTE FUNCTION public.update_channels_updated_at();

CREATE TRIGGER shift_order_on_delete AFTER DELETE ON public.content FOR EACH ROW EXECUTE FUNCTION public.shift_order_on_delete();

CREATE TRIGGER validate_content_hierarchy BEFORE INSERT OR UPDATE ON public.content FOR EACH ROW EXECUTE FUNCTION public.validate_content_hierarchy();

CREATE TRIGGER update_customer_dashboards_updated_at BEFORE UPDATE ON public.customer_dashboards FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER trigger_data_providers_updated_at BEFORE UPDATE ON public.data_providers FOR EACH ROW EXECUTE FUNCTION public.update_data_providers_updated_at();

CREATE TRIGGER set_next_sync_at BEFORE INSERT OR UPDATE ON public.data_sources FOR EACH ROW EXECUTE FUNCTION public.calculate_next_sync_at();

CREATE TRIGGER log_candidate_results_overrides AFTER UPDATE ON public.e_candidate_results FOR EACH ROW WHEN (((old.votes_override IS DISTINCT FROM new.votes_override) OR (old.vote_percentage_override IS DISTINCT FROM new.vote_percentage_override) OR (old.electoral_votes_override IS DISTINCT FROM new.electoral_votes_override) OR (old.winner_override IS DISTINCT FROM new.winner_override))) EXECUTE FUNCTION public.e_log_override_change();

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON public.e_candidates FOR EACH ROW EXECUTE FUNCTION public.e_update_updated_at_column();

CREATE TRIGGER update_elections_updated_at BEFORE UPDATE ON public.e_elections FOR EACH ROW EXECUTE FUNCTION public.e_update_updated_at_column();

CREATE TRIGGER update_media_assets_updated_at BEFORE UPDATE ON public.e_media_assets FOR EACH ROW EXECUTE FUNCTION public.e_update_updated_at_column();

CREATE TRIGGER update_parties_updated_at BEFORE UPDATE ON public.e_parties FOR EACH ROW EXECUTE FUNCTION public.e_update_updated_at_column();

CREATE TRIGGER log_race_results_overrides AFTER UPDATE ON public.e_race_results FOR EACH ROW WHEN (((old.precincts_reporting_override IS DISTINCT FROM new.precincts_reporting_override) OR (old.precincts_total_override IS DISTINCT FROM new.precincts_total_override) OR (old.percent_reporting_override IS DISTINCT FROM new.percent_reporting_override) OR (old.total_votes_override IS DISTINCT FROM new.total_votes_override) OR (old.called_override IS DISTINCT FROM new.called_override) OR ((old.called_status_override)::text IS DISTINCT FROM (new.called_status_override)::text) OR (old.winner_override_candidate_id IS DISTINCT FROM new.winner_override_candidate_id))) EXECUTE FUNCTION public.e_log_override_change();

CREATE TRIGGER update_race_results_updated_at BEFORE UPDATE ON public.e_race_results FOR EACH ROW EXECUTE FUNCTION public.e_update_updated_at_column();

CREATE TRIGGER update_races_updated_at BEFORE UPDATE ON public.e_races FOR EACH ROW EXECUTE FUNCTION public.e_update_updated_at_column();

CREATE TRIGGER trg_alpaca_stocks_updated_at BEFORE UPDATE ON public.f_stocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_normalize_custom_name BEFORE INSERT OR UPDATE OF custom_name ON public.f_stocks FOR EACH ROW EXECUTE FUNCTION public._normalize_custom_name();

CREATE TRIGGER trig_set_updated_at_stocks BEFORE UPDATE ON public.f_stocks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_feeds_updated_at BEFORE UPDATE ON public.feeds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER queue_ready_trigger AFTER UPDATE ON public.file_sync_queue FOR EACH ROW WHEN (((old.status = 'pending'::text) AND (new.status = 'ready'::text))) EXECUTE FUNCTION public.notify_edge_function();

CREATE TRIGGER validate_item_tabfields_content BEFORE INSERT OR UPDATE ON public.item_tabfields FOR EACH ROW EXECUTE FUNCTION public.validate_item_tabfields_content();

CREATE TRIGGER trigger_update_map_settings_timestamp BEFORE UPDATE ON public.map_settings FOR EACH ROW EXECUTE FUNCTION public.update_map_settings_updated_at();

CREATE TRIGGER trigger_update_media_assets_timestamp BEFORE UPDATE ON public.media_assets FOR EACH ROW EXECUTE FUNCTION public.update_media_assets_timestamp();

CREATE TRIGGER news_articles_updated_at BEFORE UPDATE ON public.news_articles FOR EACH ROW EXECUTE FUNCTION public.update_news_articles_updated_at();

CREATE TRIGGER trigger_news_articles_updated_at BEFORE UPDATE ON public.news_articles FOR EACH ROW EXECUTE FUNCTION public.update_news_articles_updated_at();

CREATE TRIGGER update_sports_events_updated_at BEFORE UPDATE ON public.sports_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sports_leagues_updated_at BEFORE UPDATE ON public.sports_leagues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER ensure_template_forms_schema_not_null BEFORE INSERT OR UPDATE ON public.template_forms FOR EACH ROW EXECUTE FUNCTION public.ensure_schema_not_null();

CREATE TRIGGER shift_order_on_delete AFTER DELETE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.shift_order_on_delete();

CREATE TRIGGER templates_order_update_after_delete AFTER DELETE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.update_order_after_delete();

CREATE TRIGGER validate_template_hierarchy BEFORE INSERT OR UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.validate_template_hierarchy();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.user_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weather_locations_updated_at BEFORE UPDATE ON public.weather_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agent_runs: {
        Row: {
          agent_id: string
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          logs: Json | null
          organization_id: string | null
          results: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          logs?: Json | null
          organization_id?: string | null
          results?: Json | null
          started_at?: string | null
          status: string
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          logs?: Json | null
          organization_id?: string | null
          results?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "v_active_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          agent_type: string
          configuration: Json
          created_at: string | null
          description: string | null
          error_count: number | null
          id: string
          last_run: string | null
          name: string
          next_run: string | null
          organization_id: string | null
          run_count: number | null
          schedule: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          agent_type: string
          configuration: Json
          created_at?: string | null
          description?: string | null
          error_count?: number | null
          id?: string
          last_run?: string | null
          name: string
          next_run?: string | null
          organization_id?: string | null
          run_count?: number | null
          schedule?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          agent_type?: string
          configuration?: Json
          created_at?: string | null
          description?: string | null
          error_count?: number | null
          id?: string
          last_run?: string | null
          name?: string
          next_run?: string | null
          organization_id?: string | null
          run_count?: number | null
          schedule?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights_elections: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          insight: string
          metadata: Json | null
          organization_id: string | null
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          insight: string
          metadata?: Json | null
          organization_id?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          insight?: string
          metadata?: Json | null
          organization_id?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_elections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights_finance: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          insight: string
          metadata: Json | null
          organization_id: string | null
          topic: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          insight: string
          metadata?: Json | null
          organization_id?: string | null
          topic: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          insight?: string
          metadata?: Json | null
          organization_id?: string | null
          topic?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_finance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights_news: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          insight: string
          metadata: Json | null
          organization_id: string | null
          topic: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          insight: string
          metadata?: Json | null
          organization_id?: string | null
          topic: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          insight?: string
          metadata?: Json | null
          organization_id?: string | null
          topic?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_news_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights_school_closing: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          insight: string
          metadata: Json | null
          organization_id: string | null
          topic: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          insight: string
          metadata?: Json | null
          organization_id?: string | null
          topic: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          insight?: string
          metadata?: Json | null
          organization_id?: string | null
          topic?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_school_closing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights_weather: {
        Row: {
          category: string
          created_at: string | null
          id: string
          insight: string
          metadata: Json | null
          organization_id: string | null
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          id?: string
          insight: string
          metadata?: Json | null
          organization_id?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          insight?: string
          metadata?: Json | null
          organization_id?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_weather_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_injectors: {
        Row: {
          created_at: string
          feature: Database["public"]["Enums"]["ai_injector_feature"]
          id: string
          is_enabled: boolean
          model: string | null
          organization_id: string | null
          params: Json
          prompt_template: string | null
          provider_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          feature: Database["public"]["Enums"]["ai_injector_feature"]
          id?: string
          is_enabled?: boolean
          model?: string | null
          organization_id?: string | null
          params?: Json
          prompt_template?: string | null
          provider_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          feature?: Database["public"]["Enums"]["ai_injector_feature"]
          id?: string
          is_enabled?: boolean
          model?: string | null
          organization_id?: string | null
          params?: Json
          prompt_template?: string | null
          provider_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_injectors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_providers: {
        Row: {
          api_key: string
          api_secret: string | null
          available_models: Json | null
          created_at: string | null
          dashboard_assignments: Json | null
          description: string | null
          enabled: boolean | null
          endpoint: string | null
          id: string
          max_tokens: number | null
          model: string | null
          name: string
          organization_id: string | null
          provider_name: string
          rate_limit_per_minute: number | null
          temperature: number | null
          top_p: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          api_secret?: string | null
          available_models?: Json | null
          created_at?: string | null
          dashboard_assignments?: Json | null
          description?: string | null
          enabled?: boolean | null
          endpoint?: string | null
          id: string
          max_tokens?: number | null
          model?: string | null
          name: string
          organization_id?: string | null
          provider_name: string
          rate_limit_per_minute?: number | null
          temperature?: number | null
          top_p?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          api_secret?: string | null
          available_models?: Json | null
          created_at?: string | null
          dashboard_assignments?: Json | null
          description?: string | null
          enabled?: boolean | null
          endpoint?: string | null
          id?: string
          max_tokens?: number | null
          model?: string | null
          name?: string
          organization_id?: string | null
          provider_name?: string
          rate_limit_per_minute?: number | null
          temperature?: number | null
          top_p?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_providers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_access_logs: {
        Row: {
          client_ip: unknown
          created_at: string | null
          endpoint_id: string | null
          error_message: string | null
          id: string
          organization_id: string | null
          request_headers: Json | null
          request_method: string | null
          request_params: Json | null
          request_path: string | null
          response_size_bytes: number | null
          response_status: number | null
          response_time_ms: number | null
          user_agent: string | null
        }
        Insert: {
          client_ip?: unknown
          created_at?: string | null
          endpoint_id?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string | null
          request_headers?: Json | null
          request_method?: string | null
          request_params?: Json | null
          request_path?: string | null
          response_size_bytes?: number | null
          response_status?: number | null
          response_time_ms?: number | null
          user_agent?: string | null
        }
        Update: {
          client_ip?: unknown
          created_at?: string | null
          endpoint_id?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string | null
          request_headers?: Json | null
          request_method?: string | null
          request_params?: Json | null
          request_path?: string | null
          response_size_bytes?: number | null
          response_status?: number | null
          response_time_ms?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_access_logs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "api_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_access_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_documentation: {
        Row: {
          created_at: string | null
          endpoint_id: string | null
          examples: Json | null
          id: string
          markdown_docs: string | null
          openapi_spec: Json | null
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint_id?: string | null
          examples?: Json | null
          id?: string
          markdown_docs?: string | null
          openapi_spec?: Json | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint_id?: string | null
          examples?: Json | null
          id?: string
          markdown_docs?: string | null
          openapi_spec?: Json | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_documentation_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: true
            referencedRelation: "api_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_documentation_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_endpoint_sources: {
        Row: {
          created_at: string | null
          data_source_id: string | null
          endpoint_id: string | null
          filter_config: Json | null
          id: string
          is_primary: boolean | null
          join_config: Json | null
          organization_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          data_source_id?: string | null
          endpoint_id?: string | null
          filter_config?: Json | null
          id?: string
          is_primary?: boolean | null
          join_config?: Json | null
          organization_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          data_source_id?: string | null
          endpoint_id?: string | null
          filter_config?: Json | null
          id?: string
          is_primary?: boolean | null
          join_config?: Json | null
          organization_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_endpoint_sources_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_endpoint_sources_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "sync_intervals_view"
            referencedColumns: ["data_source_id"]
          },
          {
            foreignKeyName: "api_endpoint_sources_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "api_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_endpoint_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_endpoints: {
        Row: {
          active: boolean | null
          auth_config: Json | null
          cache_config: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_draft: boolean | null
          name: string
          organization_id: string | null
          output_format: string | null
          rate_limit_config: Json | null
          relationship_config: Json | null
          sample_data: Json | null
          schema_config: Json | null
          slug: string
          target_apps: string[] | null
          transform_config: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          auth_config?: Json | null
          cache_config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_draft?: boolean | null
          name: string
          organization_id?: string | null
          output_format?: string | null
          rate_limit_config?: Json | null
          relationship_config?: Json | null
          sample_data?: Json | null
          schema_config?: Json | null
          slug: string
          target_apps?: string[] | null
          transform_config?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          auth_config?: Json | null
          cache_config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_draft?: boolean | null
          name?: string
          organization_id?: string | null
          output_format?: string | null
          rate_limit_config?: Json | null
          relationship_config?: Json | null
          sample_data?: Json | null
          schema_config?: Json | null
          slug?: string
          target_apps?: string[] | null
          transform_config?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_endpoints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          app_key: string
          app_url: string | null
          created_at: string | null
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          app_key: string
          app_url?: string | null
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          app_key?: string
          app_url?: string | null
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      banner_schedules: {
        Row: {
          active: boolean | null
          channel_ids: string[]
          created_at: string | null
          days_of_week: Json | null
          end_date: string | null
          id: string
          media_id: string
          name: string
          organization_id: string | null
          priority: number | null
          start_date: string | null
          time_ranges: Json | null
          triggers: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          channel_ids?: string[]
          created_at?: string | null
          days_of_week?: Json | null
          end_date?: string | null
          id?: string
          media_id: string
          name: string
          organization_id?: string | null
          priority?: number | null
          start_date?: string | null
          time_ranges?: Json | null
          triggers?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          channel_ids?: string[]
          created_at?: string | null
          days_of_week?: Json | null
          end_date?: string | null
          id?: string
          media_id?: string
          name?: string
          organization_id?: string | null
          priority?: number | null
          start_date?: string | null
          time_ranges?: Json | null
          triggers?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banner_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bop_election_results: {
        Row: {
          created_at: string | null
          election_year: number
          id: number
          is_test: boolean | null
          office: string
          office_type_code: string | null
          organization_id: string | null
          race_type: string
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          election_year: number
          id?: number
          is_test?: boolean | null
          office: string
          office_type_code?: string | null
          organization_id?: string | null
          race_type: string
          timestamp: string
        }
        Update: {
          created_at?: string | null
          election_year?: number
          id?: number
          is_test?: boolean | null
          office?: string
          office_type_code?: string | null
          organization_id?: string | null
          race_type?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "bop_election_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bop_insufficient_vote_details: {
        Row: {
          dem_incumbent: number
          dem_open: number
          election_result_id: number
          gop_incumbent: number
          gop_open: number
          id: number
          organization_id: string | null
          oth_incumbent: number
          oth_open: number
          total: number
        }
        Insert: {
          dem_incumbent?: number
          dem_open?: number
          election_result_id: number
          gop_incumbent?: number
          gop_open?: number
          id?: number
          organization_id?: string | null
          oth_incumbent?: number
          oth_open?: number
          total?: number
        }
        Update: {
          dem_incumbent?: number
          dem_open?: number
          election_result_id?: number
          gop_incumbent?: number
          gop_open?: number
          id?: number
          organization_id?: string | null
          oth_incumbent?: number
          oth_open?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "bop_insufficient_vote_details_election_result_id_fkey"
            columns: ["election_result_id"]
            isOneToOne: false
            referencedRelation: "bop_election_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bop_insufficient_vote_details_election_result_id_fkey"
            columns: ["election_result_id"]
            isOneToOne: false
            referencedRelation: "bop_election_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bop_insufficient_vote_details_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bop_net_changes: {
        Row: {
          id: number
          leaders_change: number
          organization_id: string | null
          party_result_id: number
          winners_change: number
        }
        Insert: {
          id?: number
          leaders_change?: number
          organization_id?: string | null
          party_result_id: number
          winners_change?: number
        }
        Update: {
          id?: number
          leaders_change?: number
          organization_id?: string | null
          party_result_id?: number
          winners_change?: number
        }
        Relationships: [
          {
            foreignKeyName: "bop_net_changes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bop_net_changes_party_result_id_fkey"
            columns: ["party_result_id"]
            isOneToOne: false
            referencedRelation: "bop_party_results"
            referencedColumns: ["id"]
          },
        ]
      }
      bop_party_results: {
        Row: {
          current_seats: number
          election_result_id: number
          holdovers: number
          id: number
          insufficient_vote: number
          leading: number
          organization_id: string | null
          party_name: string
          winning_trend: number
          won: number
        }
        Insert: {
          current_seats?: number
          election_result_id: number
          holdovers?: number
          id?: number
          insufficient_vote?: number
          leading?: number
          organization_id?: string | null
          party_name: string
          winning_trend?: number
          won?: number
        }
        Update: {
          current_seats?: number
          election_result_id?: number
          holdovers?: number
          id?: number
          insufficient_vote?: number
          leading?: number
          organization_id?: string | null
          party_name?: string
          winning_trend?: number
          won?: number
        }
        Relationships: [
          {
            foreignKeyName: "bop_party_results_election_result_id_fkey"
            columns: ["election_result_id"]
            isOneToOne: false
            referencedRelation: "bop_election_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bop_party_results_election_result_id_fkey"
            columns: ["election_result_id"]
            isOneToOne: false
            referencedRelation: "bop_election_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bop_party_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_playlists: {
        Row: {
          active: boolean | null
          carousel_name: string | null
          carousel_type: string | null
          channel_id: string | null
          content_id: string | null
          created_at: string | null
          display_name: string | null
          id: string
          name: string
          order: number
          organization_id: string | null
          parent_id: string | null
          schedule: Json | null
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          carousel_name?: string | null
          carousel_type?: string | null
          channel_id?: string | null
          content_id?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          name: string
          order?: number
          organization_id?: string | null
          parent_id?: string | null
          schedule?: Json | null
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          carousel_name?: string | null
          carousel_type?: string | null
          channel_id?: string | null
          content_id?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          name?: string
          order?: number
          organization_id?: string | null
          parent_id?: string | null
          schedule?: Json | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_playlists_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_playlists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_playlists_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "channel_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          active: boolean | null
          config: Json | null
          created_at: string | null
          description: string | null
          id: string
          mse_host: string | null
          mse_port: number | null
          name: string
          organization_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          mse_host?: string | null
          mse_port?: number | null
          name: string
          organization_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          mse_host?: string | null
          mse_port?: number | null
          name?: string
          organization_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          active: boolean | null
          bucket_config: Json | null
          config: Json | null
          connection_settings: Json | null
          created_at: string | null
          data_source_id: string | null
          display_name: string | null
          duration: number | null
          id: string
          name: string
          order: number
          organization_id: string | null
          parent_id: string | null
          rcp_fields: Json | null
          rcp_presets: Json | null
          schedule: Json | null
          source_row_hash: string | null
          source_row_id: string | null
          template_id: string | null
          type: string
          updated_at: string | null
          user_id: string | null
          widget_type: string | null
        }
        Insert: {
          active?: boolean | null
          bucket_config?: Json | null
          config?: Json | null
          connection_settings?: Json | null
          created_at?: string | null
          data_source_id?: string | null
          display_name?: string | null
          duration?: number | null
          id?: string
          name: string
          order?: number
          organization_id?: string | null
          parent_id?: string | null
          rcp_fields?: Json | null
          rcp_presets?: Json | null
          schedule?: Json | null
          source_row_hash?: string | null
          source_row_id?: string | null
          template_id?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
          widget_type?: string | null
        }
        Update: {
          active?: boolean | null
          bucket_config?: Json | null
          config?: Json | null
          connection_settings?: Json | null
          created_at?: string | null
          data_source_id?: string | null
          display_name?: string | null
          duration?: number | null
          id?: string
          name?: string
          order?: number
          organization_id?: string | null
          parent_id?: string | null
          rcp_fields?: Json | null
          rcp_presets?: Json | null
          schedule?: Json | null
          source_row_hash?: string | null
          source_row_id?: string | null
          template_id?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
          widget_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "sync_intervals_view"
            referencedColumns: ["data_source_id"]
          },
          {
            foreignKeyName: "content_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_dashboards: {
        Row: {
          access_level: string | null
          category: string | null
          created_at: string | null
          customer_id: string | null
          dashboard_id: string
          deployment_id: string | null
          id: string
          is_default: boolean | null
          is_subcategory: boolean | null
          name: string | null
          notes: string | null
          order_index: number | null
          organization_id: string | null
          updated_at: string | null
          visible: boolean | null
        }
        Insert: {
          access_level?: string | null
          category?: string | null
          created_at?: string | null
          customer_id?: string | null
          dashboard_id: string
          deployment_id?: string | null
          id?: string
          is_default?: boolean | null
          is_subcategory?: boolean | null
          name?: string | null
          notes?: string | null
          order_index?: number | null
          organization_id?: string | null
          updated_at?: string | null
          visible?: boolean | null
        }
        Update: {
          access_level?: string | null
          category?: string | null
          created_at?: string | null
          customer_id?: string | null
          dashboard_id?: string
          deployment_id?: string | null
          id?: string
          is_default?: boolean | null
          is_subcategory?: boolean | null
          name?: string | null
          notes?: string | null
          order_index?: number | null
          organization_id?: string | null
          updated_at?: string | null
          visible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_dashboards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_providers: {
        Row: {
          api_key: string | null
          api_secret: string | null
          api_version: string | null
          base_url: string | null
          category: string
          config: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          last_run: string | null
          name: string
          organization_id: string | null
          refresh_interval_minutes: number | null
          source_url: string | null
          storage_path: string | null
          type: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          api_version?: string | null
          base_url?: string | null
          category: string
          config?: Json | null
          created_at?: string
          description?: string | null
          id: string
          is_active?: boolean
          last_run?: string | null
          name: string
          organization_id?: string | null
          refresh_interval_minutes?: number | null
          source_url?: string | null
          storage_path?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          api_version?: string | null
          base_url?: string | null
          category?: string
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_run?: string | null
          name?: string
          organization_id?: string | null
          refresh_interval_minutes?: number | null
          source_url?: string | null
          storage_path?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_providers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_source_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          data_source_id: string | null
          error_message: string | null
          id: string
          items_processed: number | null
          organization_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          data_source_id?: string | null
          error_message?: string | null
          id?: string
          items_processed?: number | null
          organization_id?: string | null
          started_at?: string | null
          status: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          data_source_id?: string | null
          error_message?: string | null
          id?: string
          items_processed?: number | null
          organization_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_source_sync_logs_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_source_sync_logs_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "sync_intervals_view"
            referencedColumns: ["data_source_id"]
          },
          {
            foreignKeyName: "data_source_sync_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          active: boolean | null
          api_config: Json | null
          category: string | null
          created_at: string | null
          database_config: Json | null
          file_config: Json | null
          id: string
          last_sync_at: string | null
          last_sync_count: number | null
          last_sync_error: string | null
          last_sync_result: Json | null
          metadata: Json | null
          name: string
          next_sync_at: string | null
          organization_id: string | null
          rss_config: Json | null
          sync_config: Json | null
          sync_status: string | null
          template_mapping: Json | null
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          api_config?: Json | null
          category?: string | null
          created_at?: string | null
          database_config?: Json | null
          file_config?: Json | null
          id?: string
          last_sync_at?: string | null
          last_sync_count?: number | null
          last_sync_error?: string | null
          last_sync_result?: Json | null
          metadata?: Json | null
          name: string
          next_sync_at?: string | null
          organization_id?: string | null
          rss_config?: Json | null
          sync_config?: Json | null
          sync_status?: string | null
          template_mapping?: Json | null
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          api_config?: Json | null
          category?: string | null
          created_at?: string | null
          database_config?: Json | null
          file_config?: Json | null
          id?: string
          last_sync_at?: string | null
          last_sync_count?: number | null
          last_sync_error?: string | null
          last_sync_result?: Json | null
          metadata?: Json | null
          name?: string
          next_sync_at?: string | null
          organization_id?: string | null
          rss_config?: Json | null
          sync_config?: Json | null
          sync_status?: string | null
          template_mapping?: Json | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      debug_log: {
        Row: {
          created_at: string | null
          data: Json | null
          function_name: string | null
          id: number
          message: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          function_name?: string | null
          id?: number
          message?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          function_name?: string | null
          id?: number
          message?: string | null
        }
        Relationships: []
      }
      e_ap_call_history: {
        Row: {
          created_at: string | null
          electiondate: string | null
          id: string
          level: string | null
          nextrequest: string | null
          officeid: string | null
          organization_id: string | null
          resultstype: string | null
          subtype: string | null
        }
        Insert: {
          created_at?: string | null
          electiondate?: string | null
          id?: string
          level?: string | null
          nextrequest?: string | null
          officeid?: string | null
          organization_id?: string | null
          resultstype?: string | null
          subtype?: string | null
        }
        Update: {
          created_at?: string | null
          electiondate?: string | null
          id?: string
          level?: string | null
          nextrequest?: string | null
          officeid?: string | null
          organization_id?: string | null
          resultstype?: string | null
          subtype?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "e_ap_call_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      e_ballot_measure_results: {
        Row: {
          created_at: string | null
          division_id: string | null
          id: string
          last_updated: string | null
          measure_id: string | null
          metadata: Json | null
          no_percentage: number | null
          no_votes: number | null
          organization_id: string | null
          passed: boolean | null
          percent_reporting: number | null
          precincts_reporting: number | null
          precincts_total: number | null
          reporting_level: string
          updated_at: string | null
          yes_percentage: number | null
          yes_votes: number | null
        }
        Insert: {
          created_at?: string | null
          division_id?: string | null
          id?: string
          last_updated?: string | null
          measure_id?: string | null
          metadata?: Json | null
          no_percentage?: number | null
          no_votes?: number | null
          organization_id?: string | null
          passed?: boolean | null
          percent_reporting?: number | null
          precincts_reporting?: number | null
          precincts_total?: number | null
          reporting_level: string
          updated_at?: string | null
          yes_percentage?: number | null
          yes_votes?: number | null
        }
        Update: {
          created_at?: string | null
          division_id?: string | null
          id?: string
          last_updated?: string | null
          measure_id?: string | null
          metadata?: Json | null
          no_percentage?: number | null
          no_votes?: number | null
          organization_id?: string | null
          passed?: boolean | null
          percent_reporting?: number | null
          precincts_reporting?: number | null
          precincts_total?: number | null
          reporting_level?: string
          updated_at?: string | null
          yes_percentage?: number | null
          yes_votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "e_ballot_measure_results_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "e_geographic_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_ballot_measure_results_measure_id_fkey"
            columns: ["measure_id"]
            isOneToOne: false
            referencedRelation: "e_ballot_measures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_ballot_measure_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      e_ballot_measures: {
        Row: {
          created_at: string | null
          division_id: string | null
          election_id: string | null
          fiscal_impact: string | null
          full_text: string | null
          id: string
          measure_id: string
          metadata: Json | null
          number: string | null
          opponents: string | null
          organization_id: string | null
          proponents: string | null
          subject: string | null
          summary: string | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          division_id?: string | null
          election_id?: string | null
          fiscal_impact?: string | null
          full_text?: string | null
          id?: string
          measure_id: string
          metadata?: Json | null
          number?: string | null
          opponents?: string | null
          organization_id?: string | null
          proponents?: string | null
          subject?: string | null
          summary?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          division_id?: string | null
          election_id?: string | null
          fiscal_impact?: string | null
          full_text?: string | null
          id?: string
          measure_id?: string
          metadata?: Json | null
          number?: string | null
          opponents?: string | null
          organization_id?: string | null
          proponents?: string | null
          subject?: string | null
          summary?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "e_ballot_measures_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "e_geographic_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_ballot_measures_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "e_elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_ballot_measures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      e_candidate_results: {
        Row: {
          candidate_id: string | null
          created_at: string | null
          electoral_votes: number | null
          electoral_votes_override: number | null
          eliminated: boolean | null
          eliminated_override: boolean | null
          id: string
          metadata: Json | null
          organization_id: string | null
          override_at: string | null
          override_by: string | null
          override_reason: string | null
          race_result_id: string | null
          rank: number | null
          rank_override: number | null
          runoff: boolean | null
          runoff_override: boolean | null
          updated_at: string | null
          vote_percentage: number | null
          vote_percentage_override: number | null
          votes: number | null
          votes_override: number | null
          winner: boolean | null
          winner_override: boolean | null
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string | null
          electoral_votes?: number | null
          electoral_votes_override?: number | null
          eliminated?: boolean | null
          eliminated_override?: boolean | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          race_result_id?: string | null
          rank?: number | null
          rank_override?: number | null
          runoff?: boolean | null
          runoff_override?: boolean | null
          updated_at?: string | null
          vote_percentage?: number | null
          vote_percentage_override?: number | null
          votes?: number | null
          votes_override?: number | null
          winner?: boolean | null
          winner_override?: boolean | null
        }
        Update: {
          candidate_id?: string | null
          created_at?: string | null
          electoral_votes?: number | null
          electoral_votes_override?: number | null
          eliminated?: boolean | null
          eliminated_override?: boolean | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          race_result_id?: string | null
          rank?: number | null
          rank_override?: number | null
          runoff?: boolean | null
          runoff_override?: boolean | null
          updated_at?: string | null
          vote_percentage?: number | null
          vote_percentage_override?: number | null
          votes?: number | null
          votes_override?: number | null
          winner?: boolean | null
          winner_override?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "e_candidate_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "e_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_candidate_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_candidate_results_race_result_id_fkey"
            columns: ["race_result_id"]
            isOneToOne: false
            referencedRelation: "e_race_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_candidate_results_race_result_id_fkey"
            columns: ["race_result_id"]
            isOneToOne: false
            referencedRelation: "e_race_results_effective"
            referencedColumns: ["id"]
          },
        ]
      }
      e_candidates: {
        Row: {
          age: number | null
          bio: string | null
          bio_short: string | null
          campaign_email: string | null
          campaign_finance: Json | null
          campaign_headquarters_address: string | null
          campaign_phone: string | null
          candidate_id: string
          created_at: string | null
          date_of_birth: string | null
          display_name: string | null
          education: string[] | null
          endorsements: Json | null
          facebook_page: string | null
          first_name: string | null
          full_name: string
          gender: string | null
          id: string
          incumbent: boolean | null
          incumbent_override: boolean | null
          instagram_handle: string | null
          last_name: string
          media_assets: Json | null
          metadata: Json | null
          organization_id: string | null
          party_id: string | null
          photo_credit: string | null
          photo_thumbnail_url: string | null
          photo_url: string | null
          policy_positions: Json | null
          political_experience: string[] | null
          professional_background: string[] | null
          scandals_controversies: string[] | null
          short_name: string | null
          twitter_handle: string | null
          updated_at: string | null
          video_intro_url: string | null
          website: string | null
          youtube_channel: string | null
        }
        Insert: {
          age?: number | null
          bio?: string | null
          bio_short?: string | null
          campaign_email?: string | null
          campaign_finance?: Json | null
          campaign_headquarters_address?: string | null
          campaign_phone?: string | null
          candidate_id: string
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          education?: string[] | null
          endorsements?: Json | null
          facebook_page?: string | null
          first_name?: string | null
          full_name: string
          gender?: string | null
          id?: string
          incumbent?: boolean | null
          incumbent_override?: boolean | null
          instagram_handle?: string | null
          last_name: string
          media_assets?: Json | null
          metadata?: Json | null
          organization_id?: string | null
          party_id?: string | null
          photo_credit?: string | null
          photo_thumbnail_url?: string | null
          photo_url?: string | null
          policy_positions?: Json | null
          political_experience?: string[] | null
          professional_background?: string[] | null
          scandals_controversies?: string[] | null
          short_name?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
          video_intro_url?: string | null
          website?: string | null
          youtube_channel?: string | null
        }
        Update: {
          age?: number | null
          bio?: string | null
          bio_short?: string | null
          campaign_email?: string | null
          campaign_finance?: Json | null
          campaign_headquarters_address?: string | null
          campaign_phone?: string | null
          candidate_id?: string
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          education?: string[] | null
          endorsements?: Json | null
          facebook_page?: string | null
          first_name?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          incumbent?: boolean | null
          incumbent_override?: boolean | null
          instagram_handle?: string | null
          last_name?: string
          media_assets?: Json | null
          metadata?: Json | null
          organization_id?: string | null
          party_id?: string | null
          photo_credit?: string | null
          photo_thumbnail_url?: string | null
          photo_url?: string | null
          policy_positions?: Json | null
          political_experience?: string[] | null
          professional_background?: string[] | null
          scandals_controversies?: string[] | null
          short_name?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
          video_intro_url?: string | null
          website?: string | null
          youtube_channel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "e_candidates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_candidates_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "e_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      e_countries: {
        Row: {
          area_sq_km: number | null
          capital: string | null
          code_iso2: string
          code_iso3: string
          continent: string | null
          created_at: string | null
          currency_code: string | null
          electoral_system: Json | null
          id: string
          metadata: Json | null
          name: string
          official_name: string | null
          organization_id: string | null
          phone_code: string | null
          population: number | null
          region: string | null
          subregion: string | null
          timezone_default: string | null
          updated_at: string | null
        }
        Insert: {
          area_sq_km?: number | null
          capital?: string | null
          code_iso2: string
          code_iso3: string
          continent?: string | null
          created_at?: string | null
          currency_code?: string | null
          electoral_system?: Json | null
          id?: string
          metadata?: Json | null
          name: string
          official_name?: string | null
          organization_id?: string | null
          phone_code?: string | null
          population?: number | null
          region?: string | null
          subregion?: string | null
          timezone_default?: string | null
          updated_at?: string | null
        }
        Update: {
          area_sq_km?: number | null
          capital?: string | null
          code_iso2?: string
          code_iso3?: string
          continent?: string | null
          created_at?: string | null
          currency_code?: string | null
          electoral_system?: Json | null
          id?: string
          metadata?: Json | null
          name?: string
          official_name?: string | null
          organization_id?: string | null
          phone_code?: string | null
          population?: number | null
          region?: string | null
          subregion?: string | null
          timezone_default?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "e_countries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      e_election_data_ingestion_log: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          election_data_source_id: string | null
          error_message: string | null
          id: string
          organization_id: string | null
          raw_response: Json | null
          records_failed: number | null
          records_processed: number | null
          records_received: number | null
          records_updated: number | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          election_data_source_id?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string | null
          raw_response?: Json | null
          records_failed?: number | null
          records_processed?: number | null
          records_received?: number | null
          records_updated?: number | null
          started_at?: string | null
          status: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          election_data_source_id?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string | null
          raw_response?: Json | null
          records_failed?: number | null
          records_processed?: number | null
          records_received?: number | null
          records_updated?: number | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "e_election_data_ingestion_log_election_data_source_id_fkey"
            columns: ["election_data_source_id"]
            isOneToOne: false
            referencedRelation: "e_election_data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_election_data_ingestion_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      e_election_data_overrides_log: {
        Row: {
          action: string
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          field_name: string
          id: string
          organization_id: string | null
          original_value: string | null
          override_value: string | null
          performed_by: string | null
          previous_override_value: string | null
          reason: string | null
          record_id: string
          rejection_reason: string | null
          table_name: string
        }
        Insert: {
          action: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          field_name: string
          id?: string
          organization_id?: string | null
          original_value?: string | null
          override_value?: string | null
          performed_by?: string | null
          previous_override_value?: string | null
          reason?: string | null
          record_id: string
          rejection_reason?: string | null
          table_name: string
        }
        Update: {
          action?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          field_name?: string
          id?: string
          organization_id?: string | null
          original_value?: string | null
          override_value?: string | null
          performed_by?: string | null
          previous_override_value?: string | null
          reason?: string | null
          record_id?: string
          rejection_reason?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "e_election_data_overrides_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      e_election_data_sources: {
        Row: {
          active: boolean | null
          config: Json | null
          created_at: string | null
          data_source_id: string | null
          election_id: string | null
          feed_type: string
          field_mapping: Json | null
          id: string
          last_error: string | null
          last_fetch_at: string | null
          last_success_at: string | null
          organization_id: string | null
          priority: number | null
          provider: string
          update_frequency_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          config?: Json | null
          created_at?: string | null
          data_source_id?: string | null
          election_id?: string | null
          feed_type: string
          field_mapping?: Json | null
          id?: string
          last_error?: string | null
          last_fetch_at?: string | null
          last_success_at?: string | null
          organization_id?: string | null
          priority?: number | null
          provider: string
          update_frequency_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          config?: Json | null
          created_at?: string | null
          data_source_id?: string | null
          election_id?: string | null
          feed_type?: string
          field_mapping?: Json | null
          id?: string
          last_error?: string | null
          last_fetch_at?: string | null
          last_success_at?: string | null
          organization_id?: string | null
          priority?: number | null
          provider?: string
          update_frequency_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "e_election_data_sources_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_election_data_sources_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "sync_intervals_view"
            referencedColumns: ["data_source_id"]
          },
          {
            foreignKeyName: "e_election_data_sources_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "e_elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_election_data_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      e_election_editorial_content: {
        Row: {
          author: string | null
          author_id: string | null
          content: string
          content_type: string
          created_at: string | null
          entity_id: string
          entity_type: string
          featured: boolean | null
          id: string
          metadata: Json | null
          organization_id: string | null
          published_at: string | null
          status: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          author?: string | null
          author_id?: string | null
          content: string
          content_type: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          featured?: boolean | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          published_at?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          author?: string | null
          author_id?: string | null
          content?: string
          content_type?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          featured?: boolean | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          published_at?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "e_election_editorial_content_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      e_elections: {
        Row: {
          country_id: string | null
          created_at: string | null
          cycle: string | null
          description: string | null
          early_voting_end: string | null
          early_voting_start: string | null
          election_date: string
          election_id: string
          id: string
          level: string
          metadata: Json | null
          name: string
          organization_id: string | null
          registration_deadline: string | null
          status: string | null
          type: string
          updated_at: string | null
          year: number | null
        }
        Insert: {
          country_id?: string | null
          created_at?: string | null
          cycle?: string | null
          description?: string | null
          early_voting_end?: string | null
          early_voting_start?: string | null
          election_date: string
          election_id: string
          id?: string
          level: string
          metadata?: Json | null
          name: string
          organization_id?: string | null
          registration_deadline?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          country_id?: string | null
          created_at?: string | null
          cycle?: string | null
          description?: string | null
          early_voting_end?: string | null
          early_voting_start?: string | null
          election_date?: string
          election_id?: string
          id?: string
          level?: string
          metadata?: Json | null
          name?: string
          organization_id?: string | null
          registration_deadline?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "e_elections_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "e_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_elections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      e_exit_polls: {
        Row: {
          candidate_id: string | null
          collected_date: string | null
          created_at: string | null
          demographic_group: string | null
          demographic_value: string | null
          id: string
          margin_of_error: number | null
          metadata: Json | null
          organization_id: string | null
          pollster: string
          race_id: string | null
          sample_size: number | null
          support_percentage: number | null
        }
        Insert: {
          candidate_id?: string | null
          collected_date?: string | null
          created_at?: string | null
          demographic_group?: string | null
          demographic_value?: string | null
          id?: string
          margin_of_error?: number | null
          metadata?: Json | null
          organization_id?: string | null
          pollster: string
          race_id?: string | null
          sample_size?: number | null
          support_percentage?: number | null
        }
        Update: {
          candidate_id?: string | null
          collected_date?: string | null
          created_at?: string | null
          demographic_group?: string | null
          demographic_value?: string | null
          id?: string
          margin_of_error?: number | null
          metadata?: Json | null
          organization_id?: string | null
          pollster?: string
          race_id?: string | null
          sample_size?: number | null
          support_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "e_exit_polls_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "e_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_exit_polls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_exit_polls_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "e_races"
            referencedColumns: ["id"]
          },
        ]
      }
      e_geographic_divisions: {
        Row: {
          code: string | null
          country_id: string | null
          created_at: string | null
          division_id: string
          fips_code: string | null
          geometry: unknown
          id: string
          metadata: Json | null
          name: string
          organization_id: string | null
          parent_division_id: string | null
          population: number | null
          registered_voters: number | null
          timezone: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          country_id?: string | null
          created_at?: string | null
          division_id: string
          fips_code?: string | null
          geometry?: unknown
          id?: string
          metadata?: Json | null
          name: string
          organization_id?: string | null
          parent_division_id?: string | null
          population?: number | null
          registered_voters?: number | null
          timezone?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          country_id?: string | null
          created_at?: string | null
          division_id?: string
          fips_code?: string | null
          geometry?: unknown
          id?: string
          metadata?: Json | null
          name?: string
          organization_id?: string | null
          parent_division_id?: string | null
          population?: number | null
          registered_voters?: number | null
          timezone?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "e_geographic_divisions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "e_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_geographic_divisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_geographic_divisions_parent_division_id_fkey"
            columns: ["parent_division_id"]
            isOneToOne: false
            referencedRelation: "e_geographic_divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      e_historical_results: {
        Row: {
          country_id: string | null
          created_at: string | null
          division_id: string | null
          election_year: number
          id: string
          metadata: Json | null
          office: string | null
          organization_id: string | null
          race_type: string | null
          total_votes: number | null
          turnout_percentage: number | null
          winning_candidate: string | null
          winning_party: string | null
          winning_percentage: number | null
          winning_votes: number | null
        }
        Insert: {
          country_id?: string | null
          created_at?: string | null
          division_id?: string | null
          election_year: number
          id?: string
          metadata?: Json | null
          office?: string | null
          organization_id?: string | null
          race_type?: string | null
          total_votes?: number | null
          turnout_percentage?: number | null
          winning_candidate?: string | null
          winning_party?: string | null
          winning_percentage?: number | null
          winning_votes?: number | null
        }
        Update: {
          country_id?: string | null
          created_at?: string | null
          division_id?: string | null
          election_year?: number
          id?: string
          metadata?: Json | null
          office?: string | null
          organization_id?: string | null
          race_type?: string | null
          total_votes?: number | null
          turnout_percentage?: number | null
          winning_candidate?: string | null
          winning_party?: string | null
          winning_percentage?: number | null
          winning_votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "e_historical_results_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "e_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_historical_results_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "e_geographic_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_historical_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      e_media_assets: {
        Row: {
          active: boolean | null
          asset_type: string
          caption: string | null
          created_at: string | null
          credit: string | null
          display_order: number | null
          duration_seconds: number | null
          entity_id: string
          entity_type: string
          file_size_bytes: number | null
          height: number | null
          id: string
          is_primary: boolean | null
          license: string | null
          metadata: Json | null
          mime_type: string | null
          organization_id: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          uploaded_by: string | null
          url: string
          width: number | null
        }
        Insert: {
          active?: boolean | null
          asset_type: string
          caption?: string | null
          created_at?: string | null
          credit?: string | null
          display_order?: number | null
          duration_seconds?: number | null
          entity_id: string
          entity_type: string
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          is_primary?: boolean | null
          license?: string | null
          metadata?: Json | null
          mime_type?: string | null
          organization_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          url: string
          width?: number | null
        }
        Update: {
          active?: boolean | null
          asset_type?: string
          caption?: string | null
          created_at?: string | null
          credit?: string | null
          display_order?: number | null
          duration_seconds?: number | null
          entity_id?: string
          entity_type?: string
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          is_primary?: boolean | null
          license?: string | null
          metadata?: Json | null
          mime_type?: string | null
          organization_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "e_media_assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      e_parties: {
        Row: {
          abbreviation: string | null
          achievements: string[] | null
          active: boolean | null
          affiliated_organizations: Json | null
          background_image_url: string | null
          coalition_partners: string[] | null
          color_dark_hex: string | null
          color_hex: string | null
          color_light_hex: string | null
          color_palette: Json | null
          color_secondary_hex: string | null
          controversies: string[] | null
          country_id: string | null
          created_at: string | null
          current_leader: string | null
          description: string | null
          display_name: string | null
          display_order: number | null
          dissolved_date: string | null
          editorial_notes: string | null
          electoral_performance: Json | null
          email: string | null
          facebook_page: string | null
          featured: boolean | null
          founded_date: string | null
          founded_year: string | null
          header_image_url: string | null
          headquarters_address: string | null
          headquarters_city: string | null
          headquarters_country: string | null
          headquarters_state: string | null
          historical_overview: string | null
          icon_url: string | null
          id: string
          ideology: string | null
          ideology_detailed: string | null
          instagram_handle: string | null
          international_affiliation: string | null
          last_election_vote_share: number | null
          leader_title: string | null
          leadership_structure: Json | null
          linkedin_page: string | null
          logo_svg: string | null
          logo_thumbnail_url: string | null
          logo_url: string | null
          major_donors: Json | null
          media_assets: Json | null
          member_count: number | null
          metadata: Json | null
          name: string
          organization_id: string | null
          party_id: string
          phone: string | null
          platform_summary: string | null
          policy_priorities: string[] | null
          political_position: string | null
          political_spectrum_score: number | null
          predecessor_party_id: string | null
          registered_voters: number | null
          seats_held: Json | null
          short_name: string | null
          show_in_nav: boolean | null
          social_media_accounts: Json | null
          stronghold_regions: string[] | null
          successor_party_id: string | null
          tiktok_handle: string | null
          twitter_handle: string | null
          ui_config: Json | null
          updated_at: string | null
          website: string | null
          youth_wing_name: string | null
          youtube_channel: string | null
        }
        Insert: {
          abbreviation?: string | null
          achievements?: string[] | null
          active?: boolean | null
          affiliated_organizations?: Json | null
          background_image_url?: string | null
          coalition_partners?: string[] | null
          color_dark_hex?: string | null
          color_hex?: string | null
          color_light_hex?: string | null
          color_palette?: Json | null
          color_secondary_hex?: string | null
          controversies?: string[] | null
          country_id?: string | null
          created_at?: string | null
          current_leader?: string | null
          description?: string | null
          display_name?: string | null
          display_order?: number | null
          dissolved_date?: string | null
          editorial_notes?: string | null
          electoral_performance?: Json | null
          email?: string | null
          facebook_page?: string | null
          featured?: boolean | null
          founded_date?: string | null
          founded_year?: string | null
          header_image_url?: string | null
          headquarters_address?: string | null
          headquarters_city?: string | null
          headquarters_country?: string | null
          headquarters_state?: string | null
          historical_overview?: string | null
          icon_url?: string | null
          id?: string
          ideology?: string | null
          ideology_detailed?: string | null
          instagram_handle?: string | null
          international_affiliation?: string | null
          last_election_vote_share?: number | null
          leader_title?: string | null
          leadership_structure?: Json | null
          linkedin_page?: string | null
          logo_svg?: string | null
          logo_thumbnail_url?: string | null
          logo_url?: string | null
          major_donors?: Json | null
          media_assets?: Json | null
          member_count?: number | null
          metadata?: Json | null
          name: string
          organization_id?: string | null
          party_id: string
          phone?: string | null
          platform_summary?: string | null
          policy_priorities?: string[] | null
          political_position?: string | null
          political_spectrum_score?: number | null
          predecessor_party_id?: string | null
          registered_voters?: number | null
          seats_held?: Json | null
          short_name?: string | null
          show_in_nav?: boolean | null
          social_media_accounts?: Json | null
          stronghold_regions?: string[] | null
          successor_party_id?: string | null
          tiktok_handle?: string | null
          twitter_handle?: string | null
          ui_config?: Json | null
          updated_at?: string | null
          website?: string | null
          youth_wing_name?: string | null
          youtube_channel?: string | null
        }
        Update: {
          abbreviation?: string | null
          achievements?: string[] | null
          active?: boolean | null
          affiliated_organizations?: Json | null
          background_image_url?: string | null
          coalition_partners?: string[] | null
          color_dark_hex?: string | null
          color_hex?: string | null
          color_light_hex?: string | null
          color_palette?: Json | null
          color_secondary_hex?: string | null
          controversies?: string[] | null
          country_id?: string | null
          created_at?: string | null
          current_leader?: string | null
          description?: string | null
          display_name?: string | null
          display_order?: number | null
          dissolved_date?: string | null
          editorial_notes?: string | null
          electoral_performance?: Json | null
          email?: string | null
          facebook_page?: string | null
          featured?: boolean | null
          founded_date?: string | null
          founded_year?: string | null
          header_image_url?: string | null
          headquarters_address?: string | null
          headquarters_city?: string | null
          headquarters_country?: string | null
          headquarters_state?: string | null
          historical_overview?: string | null
          icon_url?: string | null
          id?: string
          ideology?: string | null
          ideology_detailed?: string | null
          instagram_handle?: string | null
          international_affiliation?: string | null
          last_election_vote_share?: number | null
          leader_title?: string | null
          leadership_structure?: Json | null
          linkedin_page?: string | null
          logo_svg?: string | null
          logo_thumbnail_url?: string | null
          logo_url?: string | null
          major_donors?: Json | null
          media_assets?: Json | null
          member_count?: number | null
          metadata?: Json | null
          name?: string
          organization_id?: string | null
          party_id?: string
          phone?: string | null
          platform_summary?: string | null
          policy_priorities?: string[] | null
          political_position?: string | null
          political_spectrum_score?: number | null
          predecessor_party_id?: string | null
          registered_voters?: number | null
          seats_held?: Json | null
          short_name?: string | null
          show_in_nav?: boolean | null
          social_media_accounts?: Json | null
          stronghold_regions?: string[] | null
          successor_party_id?: string | null
          tiktok_handle?: string | null
          twitter_handle?: string | null
          ui_config?: Json | null
          updated_at?: string | null
          website?: string | null
          youth_wing_name?: string | null
          youtube_channel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "e_parties_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "e_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_parties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_parties_predecessor_party_id_fkey"
            columns: ["predecessor_party_id"]
            isOneToOne: false
            referencedRelation: "e_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_parties_successor_party_id_fkey"
            columns: ["successor_party_id"]
            isOneToOne: false
            referencedRelation: "e_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      e_race_candidates: {
        Row: {
          ballot_order: number | null
          candidate_id: string | null
          created_at: string | null
          id: string
          race_id: string | null
          withdrew: boolean | null
          withdrew_date: string | null
          withdrew_override: boolean | null
          write_in: boolean | null
        }
        Insert: {
          ballot_order?: number | null
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          race_id?: string | null
          withdrew?: boolean | null
          withdrew_date?: string | null
          withdrew_override?: boolean | null
          write_in?: boolean | null
        }
        Update: {
          ballot_order?: number | null
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          race_id?: string | null
          withdrew?: boolean | null
          withdrew_date?: string | null
          withdrew_override?: boolean | null
          write_in?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "e_race_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "e_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_race_candidates_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "e_races"
            referencedColumns: ["id"]
          },
        ]
      }
      e_race_results: {
        Row: {
          called: boolean | null
          called_by_source: string | null
          called_override: boolean | null
          called_override_by: string | null
          called_override_timestamp: string | null
          called_status: string | null
          called_status_override: string | null
          called_timestamp: string | null
          created_at: string | null
          division_id: string | null
          id: string
          last_updated: string | null
          metadata: Json | null
          organization_id: string | null
          override_approved_at: string | null
          override_approved_by: string | null
          override_at: string | null
          override_by: string | null
          override_reason: string | null
          percent_reporting: number | null
          percent_reporting_override: number | null
          precincts_reporting: number | null
          precincts_reporting_override: number | null
          precincts_total: number | null
          precincts_total_override: number | null
          race_id: string | null
          recount_status: string | null
          recount_status_override: string | null
          registered_voters: number | null
          registered_voters_override: number | null
          reporting_level: string
          total_votes: number | null
          total_votes_override: number | null
          updated_at: string | null
          winner_candidate_id: string | null
          winner_override_candidate_id: string | null
        }
        Insert: {
          called?: boolean | null
          called_by_source?: string | null
          called_override?: boolean | null
          called_override_by?: string | null
          called_override_timestamp?: string | null
          called_status?: string | null
          called_status_override?: string | null
          called_timestamp?: string | null
          created_at?: string | null
          division_id?: string | null
          id?: string
          last_updated?: string | null
          metadata?: Json | null
          organization_id?: string | null
          override_approved_at?: string | null
          override_approved_by?: string | null
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          percent_reporting?: number | null
          percent_reporting_override?: number | null
          precincts_reporting?: number | null
          precincts_reporting_override?: number | null
          precincts_total?: number | null
          precincts_total_override?: number | null
          race_id?: string | null
          recount_status?: string | null
          recount_status_override?: string | null
          registered_voters?: number | null
          registered_voters_override?: number | null
          reporting_level: string
          total_votes?: number | null
          total_votes_override?: number | null
          updated_at?: string | null
          winner_candidate_id?: string | null
          winner_override_candidate_id?: string | null
        }
        Update: {
          called?: boolean | null
          called_by_source?: string | null
          called_override?: boolean | null
          called_override_by?: string | null
          called_override_timestamp?: string | null
          called_status?: string | null
          called_status_override?: string | null
          called_timestamp?: string | null
          created_at?: string | null
          division_id?: string | null
          id?: string
          last_updated?: string | null
          metadata?: Json | null
          organization_id?: string | null
          override_approved_at?: string | null
          override_approved_by?: string | null
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          percent_reporting?: number | null
          percent_reporting_override?: number | null
          precincts_reporting?: number | null
          precincts_reporting_override?: number | null
          precincts_total?: number | null
          precincts_total_override?: number | null
          race_id?: string | null
          recount_status?: string | null
          recount_status_override?: string | null
          registered_voters?: number | null
          registered_voters_override?: number | null
          reporting_level?: string
          total_votes?: number | null
          total_votes_override?: number | null
          updated_at?: string | null
          winner_candidate_id?: string | null
          winner_override_candidate_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "e_race_results_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "e_geographic_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_race_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_race_results_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "e_races"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_race_results_winner_candidate_id_fkey"
            columns: ["winner_candidate_id"]
            isOneToOne: false
            referencedRelation: "e_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_race_results_winner_override_candidate_id_fkey"
            columns: ["winner_override_candidate_id"]
            isOneToOne: false
            referencedRelation: "e_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      e_races: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string | null
          division_id: string | null
          editorial_notes: string | null
          election_id: string | null
          historical_context: string | null
          id: string
          incumbent_party: string | null
          key_issues: string[] | null
          metadata: Json | null
          name: string
          num_elect: number | null
          office: string | null
          organization_id: string | null
          partisan: boolean | null
          priority_level: number | null
          race_id: string
          rating: string | null
          seat_name: string | null
          short_name: string | null
          sort_order: number | null
          term_length_years: number | null
          type: string
          ui_config: Json | null
          uncontested: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          division_id?: string | null
          editorial_notes?: string | null
          election_id?: string | null
          historical_context?: string | null
          id?: string
          incumbent_party?: string | null
          key_issues?: string[] | null
          metadata?: Json | null
          name: string
          num_elect?: number | null
          office?: string | null
          organization_id?: string | null
          partisan?: boolean | null
          priority_level?: number | null
          race_id: string
          rating?: string | null
          seat_name?: string | null
          short_name?: string | null
          sort_order?: number | null
          term_length_years?: number | null
          type: string
          ui_config?: Json | null
          uncontested?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          division_id?: string | null
          editorial_notes?: string | null
          election_id?: string | null
          historical_context?: string | null
          id?: string
          incumbent_party?: string | null
          key_issues?: string[] | null
          metadata?: Json | null
          name?: string
          num_elect?: number | null
          office?: string | null
          organization_id?: string | null
          partisan?: boolean | null
          priority_level?: number | null
          race_id?: string
          rating?: string | null
          seat_name?: string | null
          short_name?: string | null
          sort_order?: number | null
          term_length_years?: number | null
          type?: string
          ui_config?: Json | null
          uncontested?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "e_races_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "e_geographic_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_races_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "e_elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_races_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      e_synthetic_candidate_results: {
        Row: {
          candidate_id: string
          created_at: string | null
          division_id: string
          electoral_votes: number | null
          id: string
          metadata: Json | null
          rank: number | null
          synthetic_race_id: string | null
          updated_at: string | null
          vote_percentage: number | null
          votes: number | null
          winner: boolean | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          division_id: string
          electoral_votes?: number | null
          id?: string
          metadata?: Json | null
          rank?: number | null
          synthetic_race_id?: string | null
          updated_at?: string | null
          vote_percentage?: number | null
          votes?: number | null
          winner?: boolean | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          division_id?: string
          electoral_votes?: number | null
          id?: string
          metadata?: Json | null
          rank?: number | null
          synthetic_race_id?: string | null
          updated_at?: string | null
          vote_percentage?: number | null
          votes?: number | null
          winner?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "e_synthetic_candidate_results_synthetic_race_id_fkey"
            columns: ["synthetic_race_id"]
            isOneToOne: false
            referencedRelation: "e_synthetic_races"
            referencedColumns: ["id"]
          },
        ]
      }
      e_synthetic_groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "e_synthetic_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      e_synthetic_race_candidates: {
        Row: {
          ballot_order: number | null
          candidate_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          synthetic_race_id: string | null
          withdrew: boolean | null
          write_in: boolean | null
        }
        Insert: {
          ballot_order?: number | null
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          synthetic_race_id?: string | null
          withdrew?: boolean | null
          write_in?: boolean | null
        }
        Update: {
          ballot_order?: number | null
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          synthetic_race_id?: string | null
          withdrew?: boolean | null
          write_in?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "e_synthetic_race_candidates_synthetic_race_id_fkey"
            columns: ["synthetic_race_id"]
            isOneToOne: false
            referencedRelation: "e_synthetic_races"
            referencedColumns: ["id"]
          },
        ]
      }
      e_synthetic_race_results: {
        Row: {
          created_at: string | null
          division_id: string
          id: string
          metadata: Json | null
          percent_reporting: number | null
          precincts_reporting: number | null
          precincts_total: number | null
          registered_voters: number | null
          reporting_level: string
          synthetic_race_id: string | null
          total_votes: number | null
          updated_at: string | null
          winner_candidate_id: string | null
        }
        Insert: {
          created_at?: string | null
          division_id: string
          id?: string
          metadata?: Json | null
          percent_reporting?: number | null
          precincts_reporting?: number | null
          precincts_total?: number | null
          registered_voters?: number | null
          reporting_level?: string
          synthetic_race_id?: string | null
          total_votes?: number | null
          updated_at?: string | null
          winner_candidate_id?: string | null
        }
        Update: {
          created_at?: string | null
          division_id?: string
          id?: string
          metadata?: Json | null
          percent_reporting?: number | null
          precincts_reporting?: number | null
          precincts_total?: number | null
          registered_voters?: number | null
          reporting_level?: string
          synthetic_race_id?: string | null
          total_votes?: number | null
          updated_at?: string | null
          winner_candidate_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "e_synthetic_race_results_synthetic_race_id_fkey"
            columns: ["synthetic_race_id"]
            isOneToOne: false
            referencedRelation: "e_synthetic_races"
            referencedColumns: ["id"]
          },
        ]
      }
      e_synthetic_races: {
        Row: {
          ai_response: Json | null
          ai_response_raw: Json | null
          base_election_id: string | null
          base_race_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          district: string | null
          id: string
          name: string
          office: string | null
          scenario_input: Json | null
          state: string | null
          summary: Json | null
          synthetic_group_id: string | null
          user_id: string | null
        }
        Insert: {
          ai_response?: Json | null
          ai_response_raw?: Json | null
          base_election_id?: string | null
          base_race_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          district?: string | null
          id?: string
          name: string
          office?: string | null
          scenario_input?: Json | null
          state?: string | null
          summary?: Json | null
          synthetic_group_id?: string | null
          user_id?: string | null
        }
        Update: {
          ai_response?: Json | null
          ai_response_raw?: Json | null
          base_election_id?: string | null
          base_race_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          district?: string | null
          id?: string
          name?: string
          office?: string | null
          scenario_input?: Json | null
          state?: string | null
          summary?: Json | null
          synthetic_group_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "e_synthetic_races_base_election_id_fkey"
            columns: ["base_election_id"]
            isOneToOne: false
            referencedRelation: "e_elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_synthetic_races_base_race_id_fkey"
            columns: ["base_race_id"]
            isOneToOne: false
            referencedRelation: "e_races"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_synthetic_races_synthetic_group_id_fkey"
            columns: ["synthetic_group_id"]
            isOneToOne: false
            referencedRelation: "e_synthetic_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      f_stocks: {
        Row: {
          change_1d: number | null
          change_1d_pct: number | null
          change_1w_pct: number | null
          change_1y_pct: number | null
          chart_1y: Json | null
          class: string | null
          created_at: string | null
          custom_name: string | null
          exchange: string | null
          id: string
          last_update: string | null
          logo_url: string | null
          name: string
          organization_id: string | null
          price: number | null
          rating: Json | null
          source: string | null
          source_id: string | null
          symbol: string
          type: string
          updated_at: string | null
          volume: number | null
          year_high: number | null
          year_low: number | null
        }
        Insert: {
          change_1d?: number | null
          change_1d_pct?: number | null
          change_1w_pct?: number | null
          change_1y_pct?: number | null
          chart_1y?: Json | null
          class?: string | null
          created_at?: string | null
          custom_name?: string | null
          exchange?: string | null
          id?: string
          last_update?: string | null
          logo_url?: string | null
          name: string
          organization_id?: string | null
          price?: number | null
          rating?: Json | null
          source?: string | null
          source_id?: string | null
          symbol: string
          type: string
          updated_at?: string | null
          volume?: number | null
          year_high?: number | null
          year_low?: number | null
        }
        Update: {
          change_1d?: number | null
          change_1d_pct?: number | null
          change_1w_pct?: number | null
          change_1y_pct?: number | null
          chart_1y?: Json | null
          class?: string | null
          created_at?: string | null
          custom_name?: string | null
          exchange?: string | null
          id?: string
          last_update?: string | null
          logo_url?: string | null
          name?: string
          organization_id?: string | null
          price?: number | null
          rating?: Json | null
          source?: string | null
          source_id?: string | null
          symbol?: string
          type?: string
          updated_at?: string | null
          volume?: number | null
          year_high?: number | null
          year_low?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "f_stocks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feeds: {
        Row: {
          active: boolean | null
          category: string
          configuration: Json
          created_at: string | null
          id: string
          name: string
          organization_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category: string
          configuration: Json
          created_at?: string | null
          id?: string
          name: string
          organization_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string
          configuration?: Json
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feeds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      file_sync_queue: {
        Row: {
          created_at: string | null
          data_source_id: string | null
          error_message: string | null
          id: number
          processed: boolean | null
          processed_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          data_source_id?: string | null
          error_message?: string | null
          id?: number
          processed?: boolean | null
          processed_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          data_source_id?: string | null
          error_message?: string | null
          id?: number
          processed?: boolean | null
          processed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_sync_queue_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_sync_queue_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "sync_intervals_view"
            referencedColumns: ["data_source_id"]
          },
        ]
      }
      gfx_animation_presets: {
        Row: {
          category: string
          created_at: string | null
          definition: Json
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          organization_id: string | null
          preview_url: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          definition: Json
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          organization_id?: string | null
          preview_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          definition?: Json
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          organization_id?: string | null
          preview_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gfx_animation_presets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gfx_animations: {
        Row: {
          created_at: string | null
          delay: number | null
          direction: string | null
          duration: number | null
          easing: string | null
          element_id: string | null
          id: string
          iterations: number | null
          phase: string
          preset_id: string | null
          template_id: string | null
        }
        Insert: {
          created_at?: string | null
          delay?: number | null
          direction?: string | null
          duration?: number | null
          easing?: string | null
          element_id?: string | null
          id?: string
          iterations?: number | null
          phase: string
          preset_id?: string | null
          template_id?: string | null
        }
        Update: {
          created_at?: string | null
          delay?: number | null
          direction?: string | null
          duration?: number | null
          easing?: string | null
          element_id?: string | null
          id?: string
          iterations?: number | null
          phase?: string
          preset_id?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gfx_animations_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "gfx_elements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gfx_animations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "gfx_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      gfx_bindings: {
        Row: {
          binding_key: string
          binding_type: string | null
          default_value: string | null
          element_id: string | null
          formatter: string | null
          formatter_options: Json | null
          id: string
          required: boolean | null
          target_property: string
          template_id: string | null
        }
        Insert: {
          binding_key: string
          binding_type?: string | null
          default_value?: string | null
          element_id?: string | null
          formatter?: string | null
          formatter_options?: Json | null
          id?: string
          required?: boolean | null
          target_property: string
          template_id?: string | null
        }
        Update: {
          binding_key?: string
          binding_type?: string | null
          default_value?: string | null
          element_id?: string | null
          formatter?: string | null
          formatter_options?: Json | null
          id?: string
          required?: boolean | null
          target_property?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gfx_bindings_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "gfx_elements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gfx_bindings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "gfx_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      gfx_chat_history: {
        Row: {
          attachments: Json | null
          changes_applied: Json | null
          content: string
          context_element_ids: string[] | null
          context_template_id: string | null
          created_at: string | null
          id: string
          project_id: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          attachments?: Json | null
          changes_applied?: Json | null
          content: string
          context_element_ids?: string[] | null
          context_template_id?: string | null
          created_at?: string | null
          id?: string
          project_id?: string | null
          role: string
          user_id?: string | null
        }
        Update: {
          attachments?: Json | null
          changes_applied?: Json | null
          content?: string
          context_element_ids?: string[] | null
          context_template_id?: string | null
          created_at?: string | null
          id?: string
          project_id?: string | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gfx_chat_history_context_template_id_fkey"
            columns: ["context_template_id"]
            isOneToOne: false
            referencedRelation: "gfx_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gfx_chat_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gfx_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gfx_chat_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "u_users"
            referencedColumns: ["id"]
          },
        ]
      }
      gfx_chat_messages: {
        Row: {
          attachments: Json | null
          changes_applied: boolean | null
          content: string | null
          context_element_ids: string[] | null
          context_template_id: string | null
          created_at: string | null
          error: boolean | null
          id: string
          message: string | null
          message_type: string | null
          metadata: Json | null
          project_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          attachments?: Json | null
          changes_applied?: boolean | null
          content?: string | null
          context_element_ids?: string[] | null
          context_template_id?: string | null
          created_at?: string | null
          error?: boolean | null
          id?: string
          message?: string | null
          message_type?: string | null
          metadata?: Json | null
          project_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          attachments?: Json | null
          changes_applied?: boolean | null
          content?: string | null
          context_element_ids?: string[] | null
          context_template_id?: string | null
          created_at?: string | null
          error?: boolean | null
          id?: string
          message?: string | null
          message_type?: string | null
          metadata?: Json | null
          project_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gfx_chat_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gfx_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gfx_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "u_users"
            referencedColumns: ["id"]
          },
        ]
      }
      gfx_elements: {
        Row: {
          anchor_x: number | null
          anchor_y: number | null
          classes: string[] | null
          content: Json | null
          element_id: string
          element_type: string
          height: number | null
          id: string
          interactions: Json | null
          locked: boolean | null
          name: string
          opacity: number | null
          parent_element_id: string | null
          position_x: number | null
          position_y: number | null
          rotation: number | null
          scale_x: number | null
          scale_y: number | null
          sort_order: number | null
          styles: Json | null
          template_id: string | null
          visible: boolean | null
          width: number | null
          z_index: number | null
        }
        Insert: {
          anchor_x?: number | null
          anchor_y?: number | null
          classes?: string[] | null
          content?: Json | null
          element_id: string
          element_type: string
          height?: number | null
          id?: string
          interactions?: Json | null
          locked?: boolean | null
          name: string
          opacity?: number | null
          parent_element_id?: string | null
          position_x?: number | null
          position_y?: number | null
          rotation?: number | null
          scale_x?: number | null
          scale_y?: number | null
          sort_order?: number | null
          styles?: Json | null
          template_id?: string | null
          visible?: boolean | null
          width?: number | null
          z_index?: number | null
        }
        Update: {
          anchor_x?: number | null
          anchor_y?: number | null
          classes?: string[] | null
          content?: Json | null
          element_id?: string
          element_type?: string
          height?: number | null
          id?: string
          interactions?: Json | null
          locked?: boolean | null
          name?: string
          opacity?: number | null
          parent_element_id?: string | null
          position_x?: number | null
          position_y?: number | null
          rotation?: number | null
          scale_x?: number | null
          scale_y?: number | null
          sort_order?: number | null
          styles?: Json | null
          template_id?: string | null
          visible?: boolean | null
          width?: number | null
          z_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gfx_elements_parent_element_id_fkey"
            columns: ["parent_element_id"]
            isOneToOne: false
            referencedRelation: "gfx_elements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gfx_elements_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "gfx_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      gfx_folders: {
        Row: {
          color: string | null
          created_at: string | null
          expanded: boolean | null
          icon: string | null
          id: string
          layer_id: string | null
          name: string
          parent_folder_id: string | null
          project_id: string | null
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          expanded?: boolean | null
          icon?: string | null
          id?: string
          layer_id?: string | null
          name: string
          parent_folder_id?: string | null
          project_id?: string | null
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          expanded?: boolean | null
          icon?: string | null
          id?: string
          layer_id?: string | null
          name?: string
          parent_folder_id?: string | null
          project_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gfx_folders_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "gfx_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gfx_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "gfx_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gfx_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gfx_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      gfx_keyframes: {
        Row: {
          animation_id: string | null
          background_color: string | null
          clip_path: string | null
          color: string | null
          custom: Json | null
          easing: string | null
          filter_blur: number | null
          filter_brightness: number | null
          id: string
          name: string | null
          opacity: number | null
          position: number
          position_x: number | null
          position_y: number | null
          properties: Json | null
          rotation: number | null
          scale_x: number | null
          scale_y: number | null
          sort_order: number | null
        }
        Insert: {
          animation_id?: string | null
          background_color?: string | null
          clip_path?: string | null
          color?: string | null
          custom?: Json | null
          easing?: string | null
          filter_blur?: number | null
          filter_brightness?: number | null
          id?: string
          name?: string | null
          opacity?: number | null
          position: number
          position_x?: number | null
          position_y?: number | null
          properties?: Json | null
          rotation?: number | null
          scale_x?: number | null
          scale_y?: number | null
          sort_order?: number | null
        }
        Update: {
          animation_id?: string | null
          background_color?: string | null
          clip_path?: string | null
          color?: string | null
          custom?: Json | null
          easing?: string | null
          filter_blur?: number | null
          filter_brightness?: number | null
          id?: string
          name?: string | null
          opacity?: number | null
          position?: number
          position_x?: number | null
          position_y?: number | null
          properties?: Json | null
          rotation?: number | null
          scale_x?: number | null
          scale_y?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gfx_keyframes_animation_id_fkey"
            columns: ["animation_id"]
            isOneToOne: false
            referencedRelation: "gfx_animations"
            referencedColumns: ["id"]
          },
        ]
      }
      gfx_layers: {
        Row: {
          allow_multiple: boolean | null
          always_on: boolean | null
          auto_out: boolean | null
          auto_out_delay: number | null
          created_at: string | null
          enabled: boolean | null
          height: number | null
          id: string
          layer_type: string
          locked: boolean | null
          name: string
          position_anchor: string | null
          position_offset_x: number | null
          position_offset_y: number | null
          project_id: string | null
          sort_order: number | null
          transition_in: string | null
          transition_in_duration: number | null
          transition_out: string | null
          transition_out_duration: number | null
          width: number | null
          z_index: number
        }
        Insert: {
          allow_multiple?: boolean | null
          always_on?: boolean | null
          auto_out?: boolean | null
          auto_out_delay?: number | null
          created_at?: string | null
          enabled?: boolean | null
          height?: number | null
          id?: string
          layer_type: string
          locked?: boolean | null
          name: string
          position_anchor?: string | null
          position_offset_x?: number | null
          position_offset_y?: number | null
          project_id?: string | null
          sort_order?: number | null
          transition_in?: string | null
          transition_in_duration?: number | null
          transition_out?: string | null
          transition_out_duration?: number | null
          width?: number | null
          z_index: number
        }
        Update: {
          allow_multiple?: boolean | null
          always_on?: boolean | null
          auto_out?: boolean | null
          auto_out_delay?: number | null
          created_at?: string | null
          enabled?: boolean | null
          height?: number | null
          id?: string
          layer_type?: string
          locked?: boolean | null
          name?: string
          position_anchor?: string | null
          position_offset_x?: number | null
          position_offset_y?: number | null
          project_id?: string | null
          sort_order?: number | null
          transition_in?: string | null
          transition_in_duration?: number | null
          transition_out?: string | null
          transition_out_duration?: number | null
          width?: number | null
          z_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "gfx_layers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gfx_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      gfx_playback_commands: {
        Row: {
          command: string
          created_at: string | null
          data: Json | null
          executed: boolean | null
          executed_at: string | null
          id: string
          layer_id: string | null
          project_id: string | null
          template_id: string | null
          transition: string | null
          transition_duration: number | null
        }
        Insert: {
          command: string
          created_at?: string | null
          data?: Json | null
          executed?: boolean | null
          executed_at?: string | null
          id?: string
          layer_id?: string | null
          project_id?: string | null
          template_id?: string | null
          transition?: string | null
          transition_duration?: number | null
        }
        Update: {
          command?: string
          created_at?: string | null
          data?: Json | null
          executed?: boolean | null
          executed_at?: string | null
          id?: string
          layer_id?: string | null
          project_id?: string | null
          template_id?: string | null
          transition?: string | null
          transition_duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gfx_playback_commands_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "gfx_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gfx_playback_commands_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gfx_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gfx_playback_commands_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "gfx_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      gfx_playback_state: {
        Row: {
          data_override: Json | null
          id: string
          layer_id: string | null
          project_id: string | null
          started_at: string | null
          state: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          data_override?: Json | null
          id?: string
          layer_id?: string | null
          project_id?: string | null
          started_at?: string | null
          state?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          data_override?: Json | null
          id?: string
          layer_id?: string | null
          project_id?: string | null
          started_at?: string | null
          state?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gfx_playback_state_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "gfx_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gfx_playback_state_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gfx_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gfx_playback_state_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "gfx_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      gfx_project_design_systems: {
        Row: {
          animation_defaults: Json | null
          colors: Json | null
          fonts: Json | null
          id: string
          project_id: string | null
          spacing: Json | null
          updated_at: string | null
        }
        Insert: {
          animation_defaults?: Json | null
          colors?: Json | null
          fonts?: Json | null
          id?: string
          project_id?: string | null
          spacing?: Json | null
          updated_at?: string | null
        }
        Update: {
          animation_defaults?: Json | null
          colors?: Json | null
          fonts?: Json | null
          id?: string
          project_id?: string | null
          spacing?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gfx_project_design_systems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "gfx_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      gfx_projects: {
        Row: {
          api_enabled: boolean | null
          api_key: string | null
          archived: boolean | null
          background_color: string | null
          canvas_height: number | null
          canvas_width: number | null
          created_at: string | null
          created_by: string | null
          custom_url_slug: string | null
          description: string | null
          frame_rate: number | null
          id: string
          interactive_config: Json | null
          interactive_enabled: boolean | null
          is_live: boolean | null
          name: string
          organization_id: string | null
          published: boolean | null
          settings: Json | null
          slug: string
          thumbnail_url: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          api_enabled?: boolean | null
          api_key?: string | null
          archived?: boolean | null
          background_color?: string | null
          canvas_height?: number | null
          canvas_width?: number | null
          created_at?: string | null
          created_by?: string | null
          custom_url_slug?: string | null
          description?: string | null
          frame_rate?: number | null
          id?: string
          interactive_config?: Json | null
          interactive_enabled?: boolean | null
          is_live?: boolean | null
          name: string
          organization_id?: string | null
          published?: boolean | null
          settings?: Json | null
          slug: string
          thumbnail_url?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          api_enabled?: boolean | null
          api_key?: string | null
          archived?: boolean | null
          background_color?: string | null
          canvas_height?: number | null
          canvas_width?: number | null
          created_at?: string | null
          created_by?: string | null
          custom_url_slug?: string | null
          description?: string | null
          frame_rate?: number | null
          id?: string
          interactive_config?: Json | null
          interactive_enabled?: boolean | null
          is_live?: boolean | null
          name?: string
          organization_id?: string | null
          published?: boolean | null
          settings?: Json | null
          slug?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gfx_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gfx_support_tickets: {
        Row: {
          admin_notes: string | null
          app: string | null
          attachments: Json | null
          browser_info: Json | null
          created_at: string | null
          description: string
          id: string
          organization_id: string | null
          priority: string | null
          project_id: string | null
          project_name: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          ticket_type: string | null
          title: string
          type: string | null
          updated_at: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          admin_notes?: string | null
          app?: string | null
          attachments?: Json | null
          browser_info?: Json | null
          created_at?: string | null
          description: string
          id?: string
          organization_id?: string | null
          priority?: string | null
          project_id?: string | null
          project_name?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          ticket_type?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          admin_notes?: string | null
          app?: string | null
          attachments?: Json | null
          browser_info?: Json | null
          created_at?: string | null
          description?: string
          id?: string
          organization_id?: string | null
          priority?: string | null
          project_id?: string | null
          project_name?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          ticket_type?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gfx_support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gfx_support_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gfx_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gfx_support_tickets_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "u_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gfx_support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "u_users"
            referencedColumns: ["id"]
          },
        ]
      }
      gfx_template_versions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          label: string | null
          snapshot: Json
          template_id: string | null
          version_number: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          label?: string | null
          snapshot: Json
          template_id?: string | null
          version_number: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          label?: string | null
          snapshot?: Json
          template_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "gfx_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "gfx_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      gfx_templates: {
        Row: {
          archived: boolean | null
          created_at: string | null
          created_by: string | null
          css_styles: string | null
          custom_script: string | null
          data_source_config: Json | null
          data_source_id: string | null
          description: string | null
          enabled: boolean | null
          folder_id: string | null
          form_schema: Json | null
          height: number | null
          html_template: string | null
          id: string
          in_duration: number | null
          layer_id: string | null
          libraries: string[] | null
          locked: boolean | null
          loop_duration: number | null
          loop_iterations: number | null
          name: string
          out_duration: number | null
          project_id: string | null
          sort_order: number | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
          version: number | null
          width: number | null
        }
        Insert: {
          archived?: boolean | null
          created_at?: string | null
          created_by?: string | null
          css_styles?: string | null
          custom_script?: string | null
          data_source_config?: Json | null
          data_source_id?: string | null
          description?: string | null
          enabled?: boolean | null
          folder_id?: string | null
          form_schema?: Json | null
          height?: number | null
          html_template?: string | null
          id?: string
          in_duration?: number | null
          layer_id?: string | null
          libraries?: string[] | null
          locked?: boolean | null
          loop_duration?: number | null
          loop_iterations?: number | null
          name: string
          out_duration?: number | null
          project_id?: string | null
          sort_order?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          version?: number | null
          width?: number | null
        }
        Update: {
          archived?: boolean | null
          created_at?: string | null
          created_by?: string | null
          css_styles?: string | null
          custom_script?: string | null
          data_source_config?: Json | null
          data_source_id?: string | null
          description?: string | null
          enabled?: boolean | null
          folder_id?: string | null
          form_schema?: Json | null
          height?: number | null
          html_template?: string | null
          id?: string
          in_duration?: number | null
          layer_id?: string | null
          libraries?: string[] | null
          locked?: boolean | null
          loop_duration?: number | null
          loop_iterations?: number | null
          name?: string
          out_duration?: number | null
          project_id?: string | null
          sort_order?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          version?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gfx_templates_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "gfx_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gfx_templates_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "gfx_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gfx_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gfx_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      item_tabfields: {
        Row: {
          created_at: string | null
          id: string
          item_id: string | null
          name: string
          options: Json | null
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          name: string
          options?: Json | null
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          name?: string
          options?: Json | null
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_tabfields_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      kv_store_7eabc66c: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      map_data: {
        Row: {
          created_at: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      map_settings: {
        Row: {
          additional_settings: Json | null
          atmosphere_enabled: boolean | null
          created_at: string
          default_latitude: number
          default_longitude: number
          default_zoom: number
          election_map_opacity: number | null
          globe_mode: boolean | null
          id: string
          map_opacity: number | null
          map_style: Database["public"]["Enums"]["map_style_type"]
          projection_type: Database["public"]["Enums"]["projection_type"]
          saved_positions: Json | null
          show_map_labels: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          additional_settings?: Json | null
          atmosphere_enabled?: boolean | null
          created_at?: string
          default_latitude?: number
          default_longitude?: number
          default_zoom?: number
          election_map_opacity?: number | null
          globe_mode?: boolean | null
          id?: string
          map_opacity?: number | null
          map_style?: Database["public"]["Enums"]["map_style_type"]
          projection_type?: Database["public"]["Enums"]["projection_type"]
          saved_positions?: Json | null
          show_map_labels?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          additional_settings?: Json | null
          atmosphere_enabled?: boolean | null
          created_at?: string
          default_latitude?: number
          default_longitude?: number
          default_zoom?: number
          election_map_opacity?: number | null
          globe_mode?: boolean | null
          id?: string
          map_opacity?: number | null
          map_style?: Database["public"]["Enums"]["map_style_type"]
          projection_type?: Database["public"]["Enums"]["projection_type"]
          saved_positions?: Json | null
          show_map_labels?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          ai_model_used: string | null
          created_at: string | null
          created_by: string
          description: string | null
          file_name: string
          file_url: string | null
          id: string
          latitude: number | null
          longitude: number | null
          media_type: string
          metadata: Json | null
          name: string
          on_map: boolean
          organization_id: string | null
          storage_path: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          ai_model_used?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          file_name: string
          file_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          media_type: string
          metadata?: Json | null
          name: string
          on_map?: boolean
          organization_id?: string | null
          storage_path: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_model_used?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          file_name?: string
          file_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          media_type?: string
          metadata?: Json | null
          name?: string
          on_map?: boolean
          organization_id?: string | null
          storage_path?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      media_distribution: {
        Row: {
          created_at: string | null
          id: string
          last_sync: string | null
          logs: string | null
          media_id: string | null
          path: string
          status: string | null
          system_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_sync?: string | null
          logs?: string | null
          media_id?: string | null
          path: string
          status?: string | null
          system_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_sync?: string | null
          logs?: string | null
          media_id?: string | null
          path?: string
          status?: string | null
          system_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_distribution_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_distribution_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      media_push_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          id: string
          log: Json | null
          media_id: string | null
          method: string | null
          status: string | null
          system_id: string | null
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          log?: Json | null
          media_id?: string | null
          method?: string | null
          status?: string | null
          system_id?: string | null
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          log?: Json | null
          media_id?: string | null
          method?: string | null
          status?: string | null
          system_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_push_queue_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_push_queue_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      media_tags: {
        Row: {
          media_id: string
          tag_id: string
        }
        Insert: {
          media_id: string
          tag_id: string
        }
        Update: {
          media_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_tags_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      ndi_presets: {
        Row: {
          alpha: boolean | null
          created_at: string | null
          fps: string
          id: string
          metadata: Json | null
          name: string
          pixel_format: string
          resolution: string
          stream_name: string | null
        }
        Insert: {
          alpha?: boolean | null
          created_at?: string | null
          fps: string
          id?: string
          metadata?: Json | null
          name: string
          pixel_format: string
          resolution: string
          stream_name?: string | null
        }
        Update: {
          alpha?: boolean | null
          created_at?: string | null
          fps?: string
          id?: string
          metadata?: Json | null
          name?: string
          pixel_format?: string
          resolution?: string
          stream_name?: string | null
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          country: string | null
          created_at: string
          description: string | null
          fetched_at: string
          id: string
          image_url: string | null
          keywords: string[] | null
          language: string | null
          organization_id: string | null
          provider: string
          provider_article_id: string | null
          published_at: string | null
          source_id: string | null
          source_name: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          fetched_at?: string
          id?: string
          image_url?: string | null
          keywords?: string[] | null
          language?: string | null
          organization_id?: string | null
          provider: string
          provider_article_id?: string | null
          published_at?: string | null
          source_id?: string | null
          source_name?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          fetched_at?: string
          id?: string
          image_url?: string | null
          keywords?: string[] | null
          language?: string | null
          organization_id?: string | null
          provider?: string
          provider_article_id?: string | null
          published_at?: string | null
          source_id?: string | null
          source_name?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_articles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      news_clusters: {
        Row: {
          article_count: number | null
          article_ids: string[] | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          keywords: string[] | null
          organization_id: string | null
          sentiment: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          article_count?: number | null
          article_ids?: string[] | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          organization_id?: string | null
          sentiment?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          article_count?: number | null
          article_ids?: string[] | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          organization_id?: string | null
          sentiment?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_clusters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_textures: {
        Row: {
          created_at: string | null
          created_by: string | null
          duration: number | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          height: number | null
          id: string
          media_type: string
          metadata: Json | null
          mime_type: string | null
          name: string
          organization_id: string
          size: number | null
          storage_path: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          duration?: number | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          height?: number | null
          id?: string
          media_type?: string
          metadata?: Json | null
          mime_type?: string | null
          name: string
          organization_id: string
          size?: number | null
          storage_path: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          duration?: number | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          height?: number | null
          id?: string
          media_type?: string
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          organization_id?: string
          size?: number | null
          storage_path?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_textures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "u_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_textures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      output_profiles: {
        Row: {
          auto_start: boolean | null
          created_at: string | null
          full_config: Json
          id: string
          name: string
          ndi_preset_id: string | null
          ndi_settings: Json | null
          output_type: string
          reload_source_on_start: boolean | null
          source_file_path: string | null
          source_url: string | null
          st2110_preset_id: string | null
          st2110_settings: Json | null
          updated_at: string | null
        }
        Insert: {
          auto_start?: boolean | null
          created_at?: string | null
          full_config: Json
          id?: string
          name: string
          ndi_preset_id?: string | null
          ndi_settings?: Json | null
          output_type: string
          reload_source_on_start?: boolean | null
          source_file_path?: string | null
          source_url?: string | null
          st2110_preset_id?: string | null
          st2110_settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          auto_start?: boolean | null
          created_at?: string | null
          full_config?: Json
          id?: string
          name?: string
          ndi_preset_id?: string | null
          ndi_settings?: Json | null
          output_type?: string
          reload_source_on_start?: boolean | null
          source_file_path?: string | null
          source_url?: string | null
          st2110_preset_id?: string | null
          st2110_settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pulsar_channel_state: {
        Row: {
          channel_id: string | null
          command_sequence: number | null
          control_locked_at: string | null
          controlled_by: string | null
          id: string
          last_acknowledged_at: string | null
          last_command: Json | null
          last_command_at: string | null
          layers: Json | null
          pending_command: Json | null
          updated_at: string | null
        }
        Insert: {
          channel_id?: string | null
          command_sequence?: number | null
          control_locked_at?: string | null
          controlled_by?: string | null
          id?: string
          last_acknowledged_at?: string | null
          last_command?: Json | null
          last_command_at?: string | null
          layers?: Json | null
          pending_command?: Json | null
          updated_at?: string | null
        }
        Update: {
          channel_id?: string | null
          command_sequence?: number | null
          control_locked_at?: string | null
          controlled_by?: string | null
          id?: string
          last_acknowledged_at?: string | null
          last_command?: Json | null
          last_command_at?: string | null
          layers?: Json | null
          pending_command?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulsar_channel_state_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: true
            referencedRelation: "pulsar_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      pulsar_channels: {
        Row: {
          assigned_operators: string[] | null
          auto_initialize_on_connect: boolean | null
          auto_initialize_on_publish: boolean | null
          channel_code: string
          channel_mode: string | null
          channel_type: string | null
          created_at: string | null
          id: string
          is_locked: boolean | null
          last_heartbeat: string | null
          last_initialized: string | null
          layer_config: Json | null
          layer_count: number | null
          loaded_project_id: string | null
          locked_by: string | null
          name: string
          organization_id: string
          player_status: string | null
          player_url: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_operators?: string[] | null
          auto_initialize_on_connect?: boolean | null
          auto_initialize_on_publish?: boolean | null
          channel_code: string
          channel_mode?: string | null
          channel_type?: string | null
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          last_heartbeat?: string | null
          last_initialized?: string | null
          layer_config?: Json | null
          layer_count?: number | null
          loaded_project_id?: string | null
          locked_by?: string | null
          name: string
          organization_id: string
          player_status?: string | null
          player_url?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_operators?: string[] | null
          auto_initialize_on_connect?: boolean | null
          auto_initialize_on_publish?: boolean | null
          channel_code?: string
          channel_mode?: string | null
          channel_type?: string | null
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          last_heartbeat?: string | null
          last_initialized?: string | null
          layer_config?: Json | null
          layer_count?: number | null
          loaded_project_id?: string | null
          locked_by?: string | null
          name?: string
          organization_id?: string
          player_status?: string | null
          player_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulsar_channels_loaded_project_id_fkey"
            columns: ["loaded_project_id"]
            isOneToOne: false
            referencedRelation: "gfx_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pulsar_command_log: {
        Row: {
          acknowledged_at: string | null
          channel_id: string | null
          command_type: string
          executed_at: string | null
          id: string
          layer_index: number | null
          organization_id: string
          page_id: string | null
          payload: Json | null
          trigger_source: string | null
          triggered_by: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          channel_id?: string | null
          command_type: string
          executed_at?: string | null
          id?: string
          layer_index?: number | null
          organization_id: string
          page_id?: string | null
          payload?: Json | null
          trigger_source?: string | null
          triggered_by?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          channel_id?: string | null
          command_type?: string
          executed_at?: string | null
          id?: string
          layer_index?: number | null
          organization_id?: string
          page_id?: string | null
          payload?: Json | null
          trigger_source?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulsar_command_log_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "pulsar_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_command_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_command_log_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pulsar_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pulsar_commands: {
        Row: {
          channel: string
          created_at: string | null
          id: number
          payload: Json | null
          project_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          id?: number
          payload?: Json | null
          project_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          id?: number
          payload?: Json | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulsar_commands_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pulsarvs_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pulsar_connections: {
        Row: {
          channel_name: string | null
          created_at: string
          friendly_name: string
          id: string
          object_path: string | null
          project_type: string | null
          rcp_name: string | null
          set_manager_json: Json | null
          updated_at: string
        }
        Insert: {
          channel_name?: string | null
          created_at?: string
          friendly_name: string
          id: string
          object_path?: string | null
          project_type?: string | null
          rcp_name?: string | null
          set_manager_json?: Json | null
          updated_at?: string
        }
        Update: {
          channel_name?: string | null
          created_at?: string
          friendly_name?: string
          id?: string
          object_path?: string | null
          project_type?: string | null
          rcp_name?: string | null
          set_manager_json?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      pulsar_custom_ui_controls: {
        Row: {
          action: Json
          color: string | null
          control_type: string
          created_at: string | null
          custom_ui_id: string | null
          height: number | null
          id: string
          label: string | null
          options: Json | null
          position_x: number
          position_y: number
          size: string | null
          sort_order: number | null
          width: number | null
        }
        Insert: {
          action: Json
          color?: string | null
          control_type: string
          created_at?: string | null
          custom_ui_id?: string | null
          height?: number | null
          id?: string
          label?: string | null
          options?: Json | null
          position_x: number
          position_y: number
          size?: string | null
          sort_order?: number | null
          width?: number | null
        }
        Update: {
          action?: Json
          color?: string | null
          control_type?: string
          created_at?: string | null
          custom_ui_id?: string | null
          height?: number | null
          id?: string
          label?: string | null
          options?: Json | null
          position_x?: number
          position_y?: number
          size?: string | null
          sort_order?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pulsar_custom_ui_controls_custom_ui_id_fkey"
            columns: ["custom_ui_id"]
            isOneToOne: false
            referencedRelation: "pulsar_custom_uis"
            referencedColumns: ["id"]
          },
        ]
      }
      pulsar_custom_uis: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          layout: Json | null
          name: string
          organization_id: string
          page_id: string | null
          scope_type: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          layout?: Json | null
          name: string
          organization_id: string
          page_id?: string | null
          scope_type?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          layout?: Json | null
          name?: string
          organization_id?: string
          page_id?: string | null
          scope_type?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulsar_custom_uis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_custom_uis_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pulsar_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_custom_uis_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "gfx_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pulsar_page_groups: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_collapsed: boolean | null
          name: string
          parent_group_id: string | null
          playlist_id: string | null
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_collapsed?: boolean | null
          name: string
          parent_group_id?: string | null
          playlist_id?: string | null
          sort_order: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_collapsed?: boolean | null
          name?: string
          parent_group_id?: string | null
          playlist_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pulsar_page_groups_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "pulsar_page_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_page_groups_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "pulsar_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      pulsar_page_library: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          duration: number | null
          id: string
          is_favorite: boolean | null
          name: string
          organization_id: string
          payload: Json
          project_id: string | null
          tags: string[] | null
          template_id: string | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_favorite?: boolean | null
          name: string
          organization_id: string
          payload?: Json
          project_id?: string | null
          tags?: string[] | null
          template_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_favorite?: boolean | null
          name?: string
          organization_id?: string
          payload?: Json
          project_id?: string | null
          tags?: string[] | null
          template_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulsar_page_library_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_page_library_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gfx_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_page_library_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "gfx_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pulsar_pages: {
        Row: {
          channel_id: string | null
          created_at: string | null
          data_bindings: Json | null
          data_record_index: number | null
          duration: number | null
          id: string
          is_on_air: boolean | null
          name: string
          organization_id: string
          page_group_id: string | null
          payload: Json
          playlist_id: string | null
          sort_order: number
          tags: string[] | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          data_bindings?: Json | null
          data_record_index?: number | null
          duration?: number | null
          id?: string
          is_on_air?: boolean | null
          name: string
          organization_id: string
          page_group_id?: string | null
          payload?: Json
          playlist_id?: string | null
          sort_order: number
          tags?: string[] | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          data_bindings?: Json | null
          data_record_index?: number | null
          duration?: number | null
          id?: string
          is_on_air?: boolean | null
          name?: string
          organization_id?: string
          page_group_id?: string | null
          payload?: Json
          playlist_id?: string | null
          sort_order?: number
          tags?: string[] | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulsar_pages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "pulsar_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_pages_page_group_id_fkey"
            columns: ["page_group_id"]
            isOneToOne: false
            referencedRelation: "pulsar_page_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_pages_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "pulsar_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_pages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "gfx_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pulsar_playlist_page_links: {
        Row: {
          created_at: string | null
          id: string
          page_id: string
          playlist_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          page_id: string
          playlist_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          page_id?: string
          playlist_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pulsar_playlist_page_links_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pulsar_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_playlist_page_links_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "pulsar_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      pulsar_playlists: {
        Row: {
          channel_id: string | null
          created_at: string | null
          created_by: string | null
          current_page_id: string | null
          default_duration: number | null
          description: string | null
          end_behavior: string | null
          id: string
          loop_mode: string | null
          mode: string | null
          name: string
          organization_id: string
          project_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_page_id?: string | null
          default_duration?: number | null
          description?: string | null
          end_behavior?: string | null
          id?: string
          loop_mode?: string | null
          mode?: string | null
          name: string
          organization_id: string
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_page_id?: string | null
          default_duration?: number | null
          description?: string | null
          end_behavior?: string | null
          id?: string
          loop_mode?: string | null
          mode?: string | null
          name?: string
          organization_id?: string
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulsar_playlists_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "pulsar_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_playlists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_playlists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gfx_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pulsar_playout_log: {
        Row: {
          action: string | null
          channel_code: string | null
          channel_id: string | null
          channel_name: string | null
          created_at: string | null
          data: Json | null
          duration_ms: number | null
          end_reason: string | null
          ended_at: string | null
          id: string
          layer_index: number | null
          layer_name: string | null
          metadata: Json | null
          operator_id: string | null
          operator_name: string | null
          organization_id: string
          page_id: string | null
          page_name: string | null
          payload: Json | null
          payload_snapshot: Json | null
          project_id: string | null
          project_name: string | null
          started_at: string
          template_id: string | null
          template_name: string | null
          trigger_source: string | null
          triggered_by: string | null
        }
        Insert: {
          action?: string | null
          channel_code?: string | null
          channel_id?: string | null
          channel_name?: string | null
          created_at?: string | null
          data?: Json | null
          duration_ms?: number | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          layer_index?: number | null
          layer_name?: string | null
          metadata?: Json | null
          operator_id?: string | null
          operator_name?: string | null
          organization_id: string
          page_id?: string | null
          page_name?: string | null
          payload?: Json | null
          payload_snapshot?: Json | null
          project_id?: string | null
          project_name?: string | null
          started_at?: string
          template_id?: string | null
          template_name?: string | null
          trigger_source?: string | null
          triggered_by?: string | null
        }
        Update: {
          action?: string | null
          channel_code?: string | null
          channel_id?: string | null
          channel_name?: string | null
          created_at?: string | null
          data?: Json | null
          duration_ms?: number | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          layer_index?: number | null
          layer_name?: string | null
          metadata?: Json | null
          operator_id?: string | null
          operator_name?: string | null
          organization_id?: string
          page_id?: string | null
          page_name?: string | null
          payload?: Json | null
          payload_snapshot?: Json | null
          project_id?: string | null
          project_name?: string | null
          started_at?: string
          template_id?: string | null
          template_name?: string | null
          trigger_source?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulsar_playout_log_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "pulsar_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_playout_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_playout_log_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pulsar_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_playout_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gfx_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_playout_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "gfx_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pulsar_user_preferences: {
        Row: {
          active_playlist_id: string | null
          created_at: string | null
          default_channel_id: string | null
          default_project_id: string | null
          id: string
          keyboard_shortcuts: Json | null
          last_project_id: string | null
          notification_preferences: Json | null
          open_playlist_ids: string[] | null
          selected_channel_id: string | null
          show_content_editor: boolean | null
          show_playout_controls: boolean | null
          show_preview: boolean | null
          theme: string | null
          ui_layout: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active_playlist_id?: string | null
          created_at?: string | null
          default_channel_id?: string | null
          default_project_id?: string | null
          id?: string
          keyboard_shortcuts?: Json | null
          last_project_id?: string | null
          notification_preferences?: Json | null
          open_playlist_ids?: string[] | null
          selected_channel_id?: string | null
          show_content_editor?: boolean | null
          show_playout_controls?: boolean | null
          show_preview?: boolean | null
          theme?: string | null
          ui_layout?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active_playlist_id?: string | null
          created_at?: string | null
          default_channel_id?: string | null
          default_project_id?: string | null
          id?: string
          keyboard_shortcuts?: Json | null
          last_project_id?: string | null
          notification_preferences?: Json | null
          open_playlist_ids?: string[] | null
          selected_channel_id?: string | null
          show_content_editor?: boolean | null
          show_playout_controls?: boolean | null
          show_preview?: boolean | null
          theme?: string | null
          ui_layout?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulsar_user_preferences_active_playlist_id_fkey"
            columns: ["active_playlist_id"]
            isOneToOne: false
            referencedRelation: "pulsar_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_user_preferences_default_channel_id_fkey"
            columns: ["default_channel_id"]
            isOneToOne: false
            referencedRelation: "pulsar_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_user_preferences_default_project_id_fkey"
            columns: ["default_project_id"]
            isOneToOne: false
            referencedRelation: "gfx_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_user_preferences_last_project_id_fkey"
            columns: ["last_project_id"]
            isOneToOne: false
            referencedRelation: "gfx_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsar_user_preferences_selected_channel_id_fkey"
            columns: ["selected_channel_id"]
            isOneToOne: false
            referencedRelation: "pulsar_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      pulsarvs_playlist_items: {
        Row: {
          channel_id: string | null
          content_id: string | null
          created_at: string | null
          duration: number | null
          folder_id: string | null
          id: string
          item_type: Database["public"]["Enums"]["pulsarvs_playlist_item_type"]
          media_id: string | null
          metadata: Json | null
          name: string
          parent_item_id: string | null
          playlist_id: string
          scheduled_time: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          channel_id?: string | null
          content_id?: string | null
          created_at?: string | null
          duration?: number | null
          folder_id?: string | null
          id?: string
          item_type: Database["public"]["Enums"]["pulsarvs_playlist_item_type"]
          media_id?: string | null
          metadata?: Json | null
          name: string
          parent_item_id?: string | null
          playlist_id: string
          scheduled_time?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          channel_id?: string | null
          content_id?: string | null
          created_at?: string | null
          duration?: number | null
          folder_id?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["pulsarvs_playlist_item_type"]
          media_id?: string | null
          metadata?: Json | null
          name?: string
          parent_item_id?: string | null
          playlist_id?: string
          scheduled_time?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulsarvs_playlist_items_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsarvs_playlist_items_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "vs_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsarvs_playlist_items_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsarvs_playlist_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "pulsarvs_playlist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsarvs_playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "pulsarvs_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      pulsarvs_playlists: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          loop_enabled: boolean | null
          name: string
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          loop_enabled?: boolean | null
          name: string
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          loop_enabled?: boolean | null
          name?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulsarvs_playlists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pulsarvs_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pulsarvs_projects: {
        Row: {
          color: string | null
          created_at: string | null
          default_channel_id: string | null
          default_instance_id: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          name: string
          settings: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          default_channel_id?: string | null
          default_instance_id?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          name: string
          settings?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          default_channel_id?: string | null
          default_instance_id?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          name?: string
          settings?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulsar_projects_default_channel_id_fkey"
            columns: ["default_channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      school_closings: {
        Row: {
          city: string | null
          county_name: string | null
          fetched_at: string | null
          id: string
          is_manual: boolean | null
          notes: string | null
          organization_id: string | null
          organization_name: string | null
          provider_id: string | null
          raw_data: Json | null
          region_id: string | null
          region_name: string | null
          source_format: string | null
          source_url: string | null
          state: string | null
          status_day: string | null
          status_description: string | null
          type: string | null
          updated_time: string | null
          zone_id: string | null
        }
        Insert: {
          city?: string | null
          county_name?: string | null
          fetched_at?: string | null
          id?: string
          is_manual?: boolean | null
          notes?: string | null
          organization_id?: string | null
          organization_name?: string | null
          provider_id?: string | null
          raw_data?: Json | null
          region_id?: string | null
          region_name?: string | null
          source_format?: string | null
          source_url?: string | null
          state?: string | null
          status_day?: string | null
          status_description?: string | null
          type?: string | null
          updated_time?: string | null
          zone_id?: string | null
        }
        Update: {
          city?: string | null
          county_name?: string | null
          fetched_at?: string | null
          id?: string
          is_manual?: boolean | null
          notes?: string | null
          organization_id?: string | null
          organization_name?: string | null
          provider_id?: string | null
          raw_data?: Json | null
          region_id?: string | null
          region_name?: string | null
          source_format?: string | null
          source_url?: string | null
          state?: string | null
          status_day?: string | null
          status_description?: string | null
          type?: string | null
          updated_time?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_closings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_closings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "data_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_closings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "data_providers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      sponsor_schedules: {
        Row: {
          active: boolean | null
          category: string | null
          channel_id: string | null
          channel_ids: Json | null
          created_at: string | null
          days_of_week: Json | null
          end_date: string | null
          id: string
          is_default: boolean | null
          media_id: string
          name: string
          organization_id: string | null
          priority: number | null
          start_date: string | null
          time_ranges: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          channel_id?: string | null
          channel_ids?: Json | null
          created_at?: string | null
          days_of_week?: Json | null
          end_date?: string | null
          id?: string
          is_default?: boolean | null
          media_id: string
          name: string
          organization_id?: string | null
          priority?: number | null
          start_date?: string | null
          time_ranges?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          channel_id?: string | null
          channel_ids?: Json | null
          created_at?: string | null
          days_of_week?: Json | null
          end_date?: string | null
          id?: string
          is_default?: boolean | null
          media_id?: string
          name?: string
          organization_id?: string | null
          priority?: number | null
          start_date?: string | null
          time_ranges?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_schedules_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_categories: {
        Row: {
          country_code: string | null
          created_at: string | null
          id: number
          name: string
          sportradar_id: string
          updated_at: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          id?: number
          name: string
          sportradar_id: string
          updated_at?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          id?: number
          name?: string
          sportradar_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sports_events: {
        Row: {
          attendance: number | null
          away_score: number | null
          away_score_et: number | null
          away_score_ft: number | null
          away_score_ht: number | null
          away_score_penalties: number | null
          away_team_id: number | null
          created_at: string | null
          home_score: number | null
          home_score_et: number | null
          home_score_ft: number | null
          home_score_ht: number | null
          home_score_penalties: number | null
          home_team_id: number | null
          id: number
          match_day: number | null
          organization_id: string | null
          referee: string | null
          round: string | null
          round_number: number | null
          season_id: number | null
          sportradar_id: string
          start_time: string
          start_time_confirmed: boolean | null
          statistics: Json | null
          status: string | null
          updated_at: string | null
          venue_capacity: number | null
          venue_city: string | null
          venue_country: string | null
          venue_name: string | null
          weather: Json | null
          winner_id: number | null
        }
        Insert: {
          attendance?: number | null
          away_score?: number | null
          away_score_et?: number | null
          away_score_ft?: number | null
          away_score_ht?: number | null
          away_score_penalties?: number | null
          away_team_id?: number | null
          created_at?: string | null
          home_score?: number | null
          home_score_et?: number | null
          home_score_ft?: number | null
          home_score_ht?: number | null
          home_score_penalties?: number | null
          home_team_id?: number | null
          id?: number
          match_day?: number | null
          organization_id?: string | null
          referee?: string | null
          round?: string | null
          round_number?: number | null
          season_id?: number | null
          sportradar_id: string
          start_time: string
          start_time_confirmed?: boolean | null
          statistics?: Json | null
          status?: string | null
          updated_at?: string | null
          venue_capacity?: number | null
          venue_city?: string | null
          venue_country?: string | null
          venue_name?: string | null
          weather?: Json | null
          winner_id?: number | null
        }
        Update: {
          attendance?: number | null
          away_score?: number | null
          away_score_et?: number | null
          away_score_ft?: number | null
          away_score_ht?: number | null
          away_score_penalties?: number | null
          away_team_id?: number | null
          created_at?: string | null
          home_score?: number | null
          home_score_et?: number | null
          home_score_ft?: number | null
          home_score_ht?: number | null
          home_score_penalties?: number | null
          home_team_id?: number | null
          id?: number
          match_day?: number | null
          organization_id?: string | null
          referee?: string | null
          round?: string | null
          round_number?: number | null
          season_id?: number | null
          sportradar_id?: string
          start_time?: string
          start_time_confirmed?: boolean | null
          statistics?: Json | null
          status?: string | null
          updated_at?: string | null
          venue_capacity?: number | null
          venue_city?: string | null
          venue_country?: string | null
          venue_name?: string | null
          weather?: Json | null
          winner_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sports_events_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "sports_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_events_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "sports_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "sports_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_events_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "sports_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_leagues: {
        Row: {
          active: boolean | null
          alternative_name: string | null
          api_source: string | null
          category_id: number | null
          created_at: string | null
          gender: string | null
          id: number
          logo_url: string | null
          name: string
          organization_id: string | null
          short_name: string | null
          sport: string | null
          sportmonks_id: number | null
          sportradar_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          alternative_name?: string | null
          api_source?: string | null
          category_id?: number | null
          created_at?: string | null
          gender?: string | null
          id?: number
          logo_url?: string | null
          name: string
          organization_id?: string | null
          short_name?: string | null
          sport?: string | null
          sportmonks_id?: number | null
          sportradar_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          alternative_name?: string | null
          api_source?: string | null
          category_id?: number | null
          created_at?: string | null
          gender?: string | null
          id?: number
          logo_url?: string | null
          name?: string
          organization_id?: string | null
          short_name?: string | null
          sport?: string | null
          sportmonks_id?: number | null
          sportradar_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sports_leagues_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "sports_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_leagues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_lineups: {
        Row: {
          assists: number | null
          created_at: string | null
          event_id: number | null
          formation_position: string | null
          goals: number | null
          id: number
          jersey_number: number | null
          lineup_type: string
          minutes_played: number | null
          played: boolean | null
          player_id: number | null
          position: string | null
          red_cards: number | null
          subbed_in_minute: number | null
          subbed_out_minute: number | null
          team_id: number | null
          yellow_cards: number | null
        }
        Insert: {
          assists?: number | null
          created_at?: string | null
          event_id?: number | null
          formation_position?: string | null
          goals?: number | null
          id?: number
          jersey_number?: number | null
          lineup_type: string
          minutes_played?: number | null
          played?: boolean | null
          player_id?: number | null
          position?: string | null
          red_cards?: number | null
          subbed_in_minute?: number | null
          subbed_out_minute?: number | null
          team_id?: number | null
          yellow_cards?: number | null
        }
        Update: {
          assists?: number | null
          created_at?: string | null
          event_id?: number | null
          formation_position?: string | null
          goals?: number | null
          id?: number
          jersey_number?: number | null
          lineup_type?: string
          minutes_played?: number | null
          played?: boolean | null
          player_id?: number | null
          position?: string | null
          red_cards?: number | null
          subbed_in_minute?: number | null
          subbed_out_minute?: number | null
          team_id?: number | null
          yellow_cards?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sports_lineups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sports_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_lineups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "sports_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_lineups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "sports_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_match_odds: {
        Row: {
          asian_away_odds: number | null
          asian_handicap_line: number | null
          asian_home_odds: number | null
          away_or_draw_odds: number | null
          away_win_odds: number | null
          away_win_prob: number | null
          btts_no_odds: number | null
          btts_yes_odds: number | null
          correct_score_0_0: number | null
          correct_score_0_1: number | null
          correct_score_0_2: number | null
          correct_score_1_0: number | null
          correct_score_1_1: number | null
          correct_score_1_2: number | null
          correct_score_2_0: number | null
          correct_score_2_1: number | null
          correct_score_2_2: number | null
          correct_score_3_0: number | null
          correct_score_3_1: number | null
          correct_score_3_2: number | null
          created_at: string | null
          draw_odds: number | null
          draw_prob: number | null
          event_id: number | null
          home_or_away_odds: number | null
          home_or_draw_odds: number | null
          home_win_odds: number | null
          home_win_prob: number | null
          ht_away_win_odds: number | null
          ht_draw_odds: number | null
          ht_home_win_odds: number | null
          id: number
          is_live: boolean | null
          last_updated: string | null
          over_1_5_odds: number | null
          over_2_5_odds: number | null
          over_3_5_odds: number | null
          provider: string | null
          suspended: boolean | null
          under_1_5_odds: number | null
          under_2_5_odds: number | null
          under_3_5_odds: number | null
          updated_at: string | null
        }
        Insert: {
          asian_away_odds?: number | null
          asian_handicap_line?: number | null
          asian_home_odds?: number | null
          away_or_draw_odds?: number | null
          away_win_odds?: number | null
          away_win_prob?: number | null
          btts_no_odds?: number | null
          btts_yes_odds?: number | null
          correct_score_0_0?: number | null
          correct_score_0_1?: number | null
          correct_score_0_2?: number | null
          correct_score_1_0?: number | null
          correct_score_1_1?: number | null
          correct_score_1_2?: number | null
          correct_score_2_0?: number | null
          correct_score_2_1?: number | null
          correct_score_2_2?: number | null
          correct_score_3_0?: number | null
          correct_score_3_1?: number | null
          correct_score_3_2?: number | null
          created_at?: string | null
          draw_odds?: number | null
          draw_prob?: number | null
          event_id?: number | null
          home_or_away_odds?: number | null
          home_or_draw_odds?: number | null
          home_win_odds?: number | null
          home_win_prob?: number | null
          ht_away_win_odds?: number | null
          ht_draw_odds?: number | null
          ht_home_win_odds?: number | null
          id?: number
          is_live?: boolean | null
          last_updated?: string | null
          over_1_5_odds?: number | null
          over_2_5_odds?: number | null
          over_3_5_odds?: number | null
          provider?: string | null
          suspended?: boolean | null
          under_1_5_odds?: number | null
          under_2_5_odds?: number | null
          under_3_5_odds?: number | null
          updated_at?: string | null
        }
        Update: {
          asian_away_odds?: number | null
          asian_handicap_line?: number | null
          asian_home_odds?: number | null
          away_or_draw_odds?: number | null
          away_win_odds?: number | null
          away_win_prob?: number | null
          btts_no_odds?: number | null
          btts_yes_odds?: number | null
          correct_score_0_0?: number | null
          correct_score_0_1?: number | null
          correct_score_0_2?: number | null
          correct_score_1_0?: number | null
          correct_score_1_1?: number | null
          correct_score_1_2?: number | null
          correct_score_2_0?: number | null
          correct_score_2_1?: number | null
          correct_score_2_2?: number | null
          correct_score_3_0?: number | null
          correct_score_3_1?: number | null
          correct_score_3_2?: number | null
          created_at?: string | null
          draw_odds?: number | null
          draw_prob?: number | null
          event_id?: number | null
          home_or_away_odds?: number | null
          home_or_draw_odds?: number | null
          home_win_odds?: number | null
          home_win_prob?: number | null
          ht_away_win_odds?: number | null
          ht_draw_odds?: number | null
          ht_home_win_odds?: number | null
          id?: number
          is_live?: boolean | null
          last_updated?: string | null
          over_1_5_odds?: number | null
          over_2_5_odds?: number | null
          over_3_5_odds?: number | null
          provider?: string | null
          suspended?: boolean | null
          under_1_5_odds?: number | null
          under_2_5_odds?: number | null
          under_3_5_odds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sports_match_odds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sports_events"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_outright_odds: {
        Row: {
          created_at: string | null
          id: number
          last_updated: string | null
          provider: string | null
          relegation_odds: number | null
          relegation_prob: number | null
          season_id: number | null
          team_id: number | null
          top_4_odds: number | null
          top_4_prob: number | null
          top_6_odds: number | null
          top_6_prob: number | null
          top_scorer_odds: number | null
          updated_at: string | null
          winner_odds: number | null
          winner_prob: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          last_updated?: string | null
          provider?: string | null
          relegation_odds?: number | null
          relegation_prob?: number | null
          season_id?: number | null
          team_id?: number | null
          top_4_odds?: number | null
          top_4_prob?: number | null
          top_6_odds?: number | null
          top_6_prob?: number | null
          top_scorer_odds?: number | null
          updated_at?: string | null
          winner_odds?: number | null
          winner_prob?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          last_updated?: string | null
          provider?: string | null
          relegation_odds?: number | null
          relegation_prob?: number | null
          season_id?: number | null
          team_id?: number | null
          top_4_odds?: number | null
          top_4_prob?: number | null
          top_6_odds?: number | null
          top_6_prob?: number | null
          top_scorer_odds?: number | null
          updated_at?: string | null
          winner_odds?: number | null
          winner_prob?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sports_outright_odds_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "sports_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_outright_odds_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "sports_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_player_odds: {
        Row: {
          created_at: string | null
          current_assists: number | null
          current_goals: number | null
          id: number
          last_updated: string | null
          player_id: number | null
          pots_odds: number | null
          provider: string | null
          season_id: number | null
          top_assists_odds: number | null
          top_scorer_odds: number | null
          top_scorer_prob: number | null
          updated_at: string | null
          ypots_odds: number | null
        }
        Insert: {
          created_at?: string | null
          current_assists?: number | null
          current_goals?: number | null
          id?: number
          last_updated?: string | null
          player_id?: number | null
          pots_odds?: number | null
          provider?: string | null
          season_id?: number | null
          top_assists_odds?: number | null
          top_scorer_odds?: number | null
          top_scorer_prob?: number | null
          updated_at?: string | null
          ypots_odds?: number | null
        }
        Update: {
          created_at?: string | null
          current_assists?: number | null
          current_goals?: number | null
          id?: number
          last_updated?: string | null
          player_id?: number | null
          pots_odds?: number | null
          provider?: string | null
          season_id?: number | null
          top_assists_odds?: number | null
          top_scorer_odds?: number | null
          top_scorer_prob?: number | null
          updated_at?: string | null
          ypots_odds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sports_player_odds_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "sports_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_player_odds_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "sports_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_player_stats: {
        Row: {
          appearances: number | null
          assists: number | null
          blocks: number | null
          clean_sheets: number | null
          clearances: number | null
          created_at: string | null
          goals: number | null
          goals_conceded: number | null
          id: number
          interceptions: number | null
          key_passes: number | null
          minutes_played: number | null
          pass_accuracy: number | null
          passes: number | null
          penalties_missed: number | null
          penalties_scored: number | null
          player_id: number | null
          rating: number | null
          red_cards: number | null
          saves: number | null
          season_id: number | null
          shots: number | null
          shots_on_target: number | null
          starts: number | null
          tackles: number | null
          team_id: number | null
          updated_at: string | null
          yellow_cards: number | null
        }
        Insert: {
          appearances?: number | null
          assists?: number | null
          blocks?: number | null
          clean_sheets?: number | null
          clearances?: number | null
          created_at?: string | null
          goals?: number | null
          goals_conceded?: number | null
          id?: number
          interceptions?: number | null
          key_passes?: number | null
          minutes_played?: number | null
          pass_accuracy?: number | null
          passes?: number | null
          penalties_missed?: number | null
          penalties_scored?: number | null
          player_id?: number | null
          rating?: number | null
          red_cards?: number | null
          saves?: number | null
          season_id?: number | null
          shots?: number | null
          shots_on_target?: number | null
          starts?: number | null
          tackles?: number | null
          team_id?: number | null
          updated_at?: string | null
          yellow_cards?: number | null
        }
        Update: {
          appearances?: number | null
          assists?: number | null
          blocks?: number | null
          clean_sheets?: number | null
          clearances?: number | null
          created_at?: string | null
          goals?: number | null
          goals_conceded?: number | null
          id?: number
          interceptions?: number | null
          key_passes?: number | null
          minutes_played?: number | null
          pass_accuracy?: number | null
          passes?: number | null
          penalties_missed?: number | null
          penalties_scored?: number | null
          player_id?: number | null
          rating?: number | null
          red_cards?: number | null
          saves?: number | null
          season_id?: number | null
          shots?: number | null
          shots_on_target?: number | null
          starts?: number | null
          tackles?: number | null
          team_id?: number | null
          updated_at?: string | null
          yellow_cards?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sports_player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "sports_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_player_stats_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "sports_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "sports_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_players: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          first_name: string | null
          height: number | null
          id: number
          jersey_number: number | null
          last_name: string | null
          name: string
          nationality: string | null
          nationality_code: string | null
          photo_url: string | null
          position: string | null
          preferred_foot: string | null
          sportradar_id: string
          team_id: number | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          height?: number | null
          id?: number
          jersey_number?: number | null
          last_name?: string | null
          name: string
          nationality?: string | null
          nationality_code?: string | null
          photo_url?: string | null
          position?: string | null
          preferred_foot?: string | null
          sportradar_id: string
          team_id?: number | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          height?: number | null
          id?: number
          jersey_number?: number | null
          last_name?: string | null
          name?: string
          nationality?: string | null
          nationality_code?: string | null
          photo_url?: string | null
          position?: string | null
          preferred_foot?: string | null
          sportradar_id?: string
          team_id?: number | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sports_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "sports_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_season_teams: {
        Row: {
          created_at: string | null
          id: number
          season_id: number | null
          team_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          season_id?: number | null
          team_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          season_id?: number | null
          team_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sports_season_teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "sports_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_season_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "sports_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_seasons: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: number
          is_current: boolean | null
          league_id: number | null
          name: string
          sportradar_id: string
          start_date: string | null
          updated_at: string | null
          year: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: number
          is_current?: boolean | null
          league_id?: number | null
          name: string
          sportradar_id: string
          start_date?: string | null
          updated_at?: string | null
          year?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: number
          is_current?: boolean | null
          league_id?: number | null
          name?: string
          sportradar_id?: string
          start_date?: string | null
          updated_at?: string | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sports_seasons_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "sports_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_standings: {
        Row: {
          draw: number | null
          form: string | null
          goals_against: number | null
          goals_diff: number | null
          goals_for: number | null
          id: number
          is_live: boolean | null
          loss: number | null
          played: number | null
          points: number | null
          rank: number
          season_id: number | null
          sportradar_league_id: string | null
          team_id: number | null
          updated_at: string | null
          win: number | null
        }
        Insert: {
          draw?: number | null
          form?: string | null
          goals_against?: number | null
          goals_diff?: number | null
          goals_for?: number | null
          id?: number
          is_live?: boolean | null
          loss?: number | null
          played?: number | null
          points?: number | null
          rank: number
          season_id?: number | null
          sportradar_league_id?: string | null
          team_id?: number | null
          updated_at?: string | null
          win?: number | null
        }
        Update: {
          draw?: number | null
          form?: string | null
          goals_against?: number | null
          goals_diff?: number | null
          goals_for?: number | null
          id?: number
          is_live?: boolean | null
          loss?: number | null
          played?: number | null
          points?: number | null
          rank?: number
          season_id?: number | null
          sportradar_league_id?: string | null
          team_id?: number | null
          updated_at?: string | null
          win?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sports_standings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "sports_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "sports_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_team_stats: {
        Row: {
          aerial_duels_won: number | null
          avg_possession: number | null
          away_draws: number | null
          away_losses: number | null
          away_wins: number | null
          big_chances_created: number | null
          big_chances_missed: number | null
          blocks: number | null
          clean_sheets: number | null
          clearances: number | null
          corners: number | null
          created_at: string | null
          cross_accuracy: number | null
          crosses: number | null
          draws: number | null
          fouls_committed: number | null
          fouls_won: number | null
          free_kicks_scored: number | null
          goal_difference: number | null
          goals_against: number | null
          goals_for: number | null
          hit_woodwork: number | null
          home_draws: number | null
          home_losses: number | null
          home_wins: number | null
          id: number
          interceptions: number | null
          long_balls: number | null
          losses: number | null
          offsides: number | null
          pass_accuracy: number | null
          penalties_conceded: number | null
          penalties_missed: number | null
          penalties_scored: number | null
          played: number | null
          points: number | null
          red_cards: number | null
          season_id: number | null
          shot_accuracy: number | null
          shots_on_target: number | null
          tackle_success: number | null
          tackles: number | null
          team_id: number | null
          through_balls: number | null
          total_passes: number | null
          total_shots: number | null
          updated_at: string | null
          wins: number | null
          yellow_cards: number | null
        }
        Insert: {
          aerial_duels_won?: number | null
          avg_possession?: number | null
          away_draws?: number | null
          away_losses?: number | null
          away_wins?: number | null
          big_chances_created?: number | null
          big_chances_missed?: number | null
          blocks?: number | null
          clean_sheets?: number | null
          clearances?: number | null
          corners?: number | null
          created_at?: string | null
          cross_accuracy?: number | null
          crosses?: number | null
          draws?: number | null
          fouls_committed?: number | null
          fouls_won?: number | null
          free_kicks_scored?: number | null
          goal_difference?: number | null
          goals_against?: number | null
          goals_for?: number | null
          hit_woodwork?: number | null
          home_draws?: number | null
          home_losses?: number | null
          home_wins?: number | null
          id?: number
          interceptions?: number | null
          long_balls?: number | null
          losses?: number | null
          offsides?: number | null
          pass_accuracy?: number | null
          penalties_conceded?: number | null
          penalties_missed?: number | null
          penalties_scored?: number | null
          played?: number | null
          points?: number | null
          red_cards?: number | null
          season_id?: number | null
          shot_accuracy?: number | null
          shots_on_target?: number | null
          tackle_success?: number | null
          tackles?: number | null
          team_id?: number | null
          through_balls?: number | null
          total_passes?: number | null
          total_shots?: number | null
          updated_at?: string | null
          wins?: number | null
          yellow_cards?: number | null
        }
        Update: {
          aerial_duels_won?: number | null
          avg_possession?: number | null
          away_draws?: number | null
          away_losses?: number | null
          away_wins?: number | null
          big_chances_created?: number | null
          big_chances_missed?: number | null
          blocks?: number | null
          clean_sheets?: number | null
          clearances?: number | null
          corners?: number | null
          created_at?: string | null
          cross_accuracy?: number | null
          crosses?: number | null
          draws?: number | null
          fouls_committed?: number | null
          fouls_won?: number | null
          free_kicks_scored?: number | null
          goal_difference?: number | null
          goals_against?: number | null
          goals_for?: number | null
          hit_woodwork?: number | null
          home_draws?: number | null
          home_losses?: number | null
          home_wins?: number | null
          id?: number
          interceptions?: number | null
          long_balls?: number | null
          losses?: number | null
          offsides?: number | null
          pass_accuracy?: number | null
          penalties_conceded?: number | null
          penalties_missed?: number | null
          penalties_scored?: number | null
          played?: number | null
          points?: number | null
          red_cards?: number | null
          season_id?: number | null
          shot_accuracy?: number | null
          shots_on_target?: number | null
          tackle_success?: number | null
          tackles?: number | null
          team_id?: number | null
          through_balls?: number | null
          total_passes?: number | null
          total_shots?: number | null
          updated_at?: string | null
          wins?: number | null
          yellow_cards?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sports_team_stats_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "sports_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_team_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "sports_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_teams: {
        Row: {
          abbreviation: string | null
          api_source: string | null
          city: string | null
          colors: Json | null
          country: string | null
          country_code: string | null
          created_at: string | null
          founded: number | null
          gender: string | null
          id: number
          logo_url: string | null
          name: string
          organization_id: string | null
          short_name: string | null
          sport: string | null
          sportmonks_id: number | null
          sportradar_id: string | null
          updated_at: string | null
          venue: string | null
          venue_id: number | null
        }
        Insert: {
          abbreviation?: string | null
          api_source?: string | null
          city?: string | null
          colors?: Json | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          founded?: number | null
          gender?: string | null
          id?: number
          logo_url?: string | null
          name: string
          organization_id?: string | null
          short_name?: string | null
          sport?: string | null
          sportmonks_id?: number | null
          sportradar_id?: string | null
          updated_at?: string | null
          venue?: string | null
          venue_id?: number | null
        }
        Update: {
          abbreviation?: string | null
          api_source?: string | null
          city?: string | null
          colors?: Json | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          founded?: number | null
          gender?: string | null
          id?: number
          logo_url?: string | null
          name?: string
          organization_id?: string | null
          short_name?: string | null
          sport?: string | null
          sportmonks_id?: number | null
          sportradar_id?: string | null
          updated_at?: string | null
          venue?: string | null
          venue_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sports_teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_teams_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "sports_venues"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_venues: {
        Row: {
          address: string | null
          architect: string | null
          capacity: number | null
          city: string | null
          cost: string | null
          country: string | null
          country_code: string | null
          created_at: string | null
          description: string | null
          id: number
          image_url: string | null
          latitude: number | null
          longitude: number | null
          name: string
          postal_code: string | null
          roof_type: string | null
          sportradar_id: string | null
          surface: string | null
          thumbnail_url: string | null
          timezone: string | null
          updated_at: string | null
          year_opened: number | null
        }
        Insert: {
          address?: string | null
          architect?: string | null
          capacity?: number | null
          city?: string | null
          cost?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          postal_code?: string | null
          roof_type?: string | null
          sportradar_id?: string | null
          surface?: string | null
          thumbnail_url?: string | null
          timezone?: string | null
          updated_at?: string | null
          year_opened?: number | null
        }
        Update: {
          address?: string | null
          architect?: string | null
          capacity?: number | null
          city?: string | null
          cost?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          postal_code?: string | null
          roof_type?: string | null
          sportradar_id?: string | null
          surface?: string | null
          thumbnail_url?: string | null
          timezone?: string | null
          updated_at?: string | null
          year_opened?: number | null
        }
        Relationships: []
      }
      st2110_presets: {
        Row: {
          created_at: string | null
          fps: string
          id: string
          metadata: Json | null
          multicast_ip: string | null
          name: string
          nic: string | null
          pixel_format: string
          resolution: string
        }
        Insert: {
          created_at?: string | null
          fps: string
          id?: string
          metadata?: Json | null
          multicast_ip?: string | null
          name: string
          nic?: string | null
          pixel_format: string
          resolution: string
        }
        Update: {
          created_at?: string | null
          fps?: string
          id?: string
          metadata?: Json | null
          multicast_ip?: string | null
          name?: string
          nic?: string | null
          pixel_format?: string
          resolution?: string
        }
        Relationships: []
      }
      sync_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      sync_queue: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string | null
          data_source_id: string
          error_message: string | null
          id: number
          max_attempts: number | null
          priority: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          data_source_id: string
          error_message?: string | null
          id?: number
          max_attempts?: number | null
          priority?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          data_source_id?: string
          error_message?: string | null
          id?: number
          max_attempts?: number | null
          priority?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_queue_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_queue_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "sync_intervals_view"
            referencedColumns: ["data_source_id"]
          },
        ]
      }
      systems: {
        Row: {
          channel: string | null
          created_at: string | null
          description: string | null
          id: string
          ip_address: unknown
          name: string
          port: number | null
          system_type: string
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown
          name: string
          port?: number | null
          system_type?: string
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown
          name?: string
          port?: number | null
          system_type?: string
        }
        Relationships: []
      }
      tabfields: {
        Row: {
          created_at: string | null
          id: string
          name: string
          options: Json | null
          template_id: string | null
          updated_at: string | null
          user_id: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          options?: Json | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          options?: Json | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tabfields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          id: string
          name: string | null
        }
        Insert: {
          id?: string
          name?: string | null
        }
        Update: {
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      template_forms: {
        Row: {
          created_at: string | null
          schema: Json
          template_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          schema?: Json
          template_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          schema?: Json
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_forms_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: true
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_settings: {
        Row: {
          advanced_validation_enabled: boolean | null
          created_at: string | null
          scripting_enabled: boolean | null
          settings: Json
          template_id: string
          updated_at: string | null
        }
        Insert: {
          advanced_validation_enabled?: boolean | null
          created_at?: string | null
          scripting_enabled?: boolean | null
          settings?: Json
          template_id: string
          updated_at?: string | null
        }
        Update: {
          advanced_validation_enabled?: boolean | null
          created_at?: string | null
          scripting_enabled?: boolean | null
          settings?: Json
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_settings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: true
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          active: boolean | null
          carousel_name: string | null
          created_at: string | null
          form_schema: Json | null
          id: string
          is_default: boolean | null
          is_favorite: boolean | null
          name: string
          order: number
          organization_id: string | null
          parent_id: string | null
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          carousel_name?: string | null
          created_at?: string | null
          form_schema?: Json | null
          id?: string
          is_default?: boolean | null
          is_favorite?: boolean | null
          name: string
          order?: number
          organization_id?: string | null
          parent_id?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          carousel_name?: string | null
          created_at?: string | null
          form_schema?: Json | null
          id?: string
          is_default?: boolean | null
          is_favorite?: boolean | null
          name?: string
          order?: number
          organization_id?: string | null
          parent_id?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      u_audit_log: {
        Row: {
          action: string
          app_key: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          app_key: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          app_key?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      u_channel_access: {
        Row: {
          can_write: boolean
          channel_id: string
          created_at: string | null
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          can_write?: boolean
          channel_id: string
          created_at?: string | null
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          can_write?: boolean
          channel_id?: string
          created_at?: string | null
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "u_channel_access_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "u_channel_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "u_users"
            referencedColumns: ["id"]
          },
        ]
      }
      u_group_members: {
        Row: {
          added_by: string | null
          created_at: string | null
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "u_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "u_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "u_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "u_users"
            referencedColumns: ["id"]
          },
        ]
      }
      u_group_permissions: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          permission_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          permission_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          permission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "u_group_permissions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "u_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "u_group_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "u_permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      u_groups: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      u_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "u_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "u_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "u_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      u_organizations: {
        Row: {
          allowed_domains: string[] | null
          created_at: string
          id: string
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          allowed_domains?: string[] | null
          created_at?: string
          id?: string
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          allowed_domains?: string[] | null
          created_at?: string
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      u_page_settings: {
        Row: {
          app_key: string
          display_order: number | null
          enabled: boolean
          id: string
          page_key: string
          page_label: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          app_key: string
          display_order?: number | null
          enabled?: boolean
          id?: string
          page_key: string
          page_label: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          app_key?: string
          display_order?: number | null
          enabled?: boolean
          id?: string
          page_key?: string
          page_label?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      u_permissions: {
        Row: {
          action: string
          app_key: string
          description: string | null
          id: string
          resource: string
        }
        Insert: {
          action: string
          app_key: string
          description?: string | null
          id?: string
          resource: string
        }
        Update: {
          action?: string
          app_key?: string
          description?: string | null
          id?: string
          resource?: string
        }
        Relationships: []
      }
      u_user_permissions: {
        Row: {
          created_at: string | null
          granted: boolean
          id: string
          permission_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted?: boolean
          id?: string
          permission_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted?: boolean
          id?: string
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "u_user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "u_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "u_user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "u_users"
            referencedColumns: ["id"]
          },
        ]
      }
      u_users: {
        Row: {
          auth_user_id: string
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_superuser: boolean
          last_login: string | null
          org_role: string | null
          organization_id: string
          preferences: Json | null
          status: string
          updated_at: string | null
        }
        Insert: {
          auth_user_id: string
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          full_name: string
          id?: string
          is_superuser?: boolean
          last_login?: string | null
          org_role?: string | null
          organization_id: string
          preferences?: Json | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          is_superuser?: boolean
          last_login?: string | null
          org_role?: string | null
          organization_id?: string
          preferences?: Json | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "u_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_layouts: {
        Row: {
          created_at: string | null
          id: string
          layout_data: Json
          layout_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          layout_data: Json
          layout_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          layout_data?: Json
          layout_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vs_content: {
        Row: {
          backdrop_url: string | null
          created_at: string
          description: string | null
          folder_id: string | null
          id: string
          is_public: boolean | null
          metadata: Json | null
          name: string
          project_id: string | null
          rcp_bindings: Json | null
          scene_config: Json
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          backdrop_url?: string | null
          created_at?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          name: string
          project_id?: string | null
          rcp_bindings?: Json | null
          scene_config: Json
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          backdrop_url?: string | null
          created_at?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          name?: string
          project_id?: string | null
          rcp_bindings?: Json | null
          scene_config?: Json
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vs_content_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "vs_content_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vs_content_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pulsarvs_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      vs_content_folders: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          project_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          project_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          project_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vs_content_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "vs_content_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vs_content_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pulsarvs_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_air_quality: {
        Row: {
          aqi: number | null
          aqi_category: string | null
          aqi_standard: string | null
          as_of: string
          category: string | null
          co: number | null
          created_at: string | null
          fetched_at: string | null
          id: number
          location_id: string
          no2: number | null
          o3: number | null
          organization_id: string | null
          pm10: number | null
          pm25: number | null
          pollen_grass: number | null
          pollen_risk: string | null
          pollen_tree: number | null
          pollen_weed: number | null
          so2: number | null
          standard: string | null
          updated_at: string | null
        }
        Insert: {
          aqi?: number | null
          aqi_category?: string | null
          aqi_standard?: string | null
          as_of: string
          category?: string | null
          co?: number | null
          created_at?: string | null
          fetched_at?: string | null
          id?: number
          location_id: string
          no2?: number | null
          o3?: number | null
          organization_id?: string | null
          pm10?: number | null
          pm25?: number | null
          pollen_grass?: number | null
          pollen_risk?: string | null
          pollen_tree?: number | null
          pollen_weed?: number | null
          so2?: number | null
          standard?: string | null
          updated_at?: string | null
        }
        Update: {
          aqi?: number | null
          aqi_category?: string | null
          aqi_standard?: string | null
          as_of?: string
          category?: string | null
          co?: number | null
          created_at?: string | null
          fetched_at?: string | null
          id?: number
          location_id?: string
          no2?: number | null
          o3?: number | null
          organization_id?: string | null
          pm10?: number | null
          pm25?: number | null
          pollen_grass?: number | null
          pollen_risk?: string | null
          pollen_tree?: number | null
          pollen_weed?: number | null
          so2?: number | null
          standard?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_air_quality_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "live_weather_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_air_quality_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "weather_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_air_quality_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_alerts: {
        Row: {
          alert_id: string | null
          areas: string[] | null
          certainty: string | null
          created_at: string | null
          description: string | null
          end_time: string
          event: string
          fetched_at: string | null
          headline: string | null
          id: string
          instruction: string | null
          links: string[] | null
          location_id: string
          organization_id: string | null
          provider_id: string | null
          provider_type: string | null
          severity: string | null
          source: string
          start_time: string
          urgency: string | null
        }
        Insert: {
          alert_id?: string | null
          areas?: string[] | null
          certainty?: string | null
          created_at?: string | null
          description?: string | null
          end_time: string
          event: string
          fetched_at?: string | null
          headline?: string | null
          id: string
          instruction?: string | null
          links?: string[] | null
          location_id: string
          organization_id?: string | null
          provider_id?: string | null
          provider_type?: string | null
          severity?: string | null
          source: string
          start_time: string
          urgency?: string | null
        }
        Update: {
          alert_id?: string | null
          areas?: string[] | null
          certainty?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          event?: string
          fetched_at?: string | null
          headline?: string | null
          id?: string
          instruction?: string | null
          links?: string[] | null
          location_id?: string
          organization_id?: string | null
          provider_id?: string | null
          provider_type?: string | null
          severity?: string | null
          source?: string
          start_time?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_alerts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "live_weather_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_alerts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "weather_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_current: {
        Row: {
          admin1: string | null
          as_of: string | null
          cloud_cover: number | null
          country: string | null
          created_at: string | null
          dew_point_unit: string | null
          dew_point_value: number | null
          feels_like_unit: string | null
          feels_like_value: number | null
          fetched_at: string | null
          humidity: number | null
          icon: string | null
          id: number
          lat: number | null
          location_id: string
          lon: number | null
          moon_illumination: number | null
          moon_phase: string | null
          name: string | null
          organization_id: string | null
          precip_last_hr_unit: string | null
          precip_last_hr_value: number | null
          precip_mm: number | null
          precip_type: string | null
          pressure_tendency: string | null
          pressure_unit: string | null
          pressure_value: number | null
          provider_id: string | null
          provider_type: string | null
          snow_depth_unit: string | null
          snow_depth_value: number | null
          summary: string | null
          sunrise: string | null
          sunset: string | null
          temperature_unit: string | null
          temperature_value: number | null
          timestamp: string | null
          updated_at: string | null
          uv_index: number | null
          visibility_unit: string | null
          visibility_value: number | null
          wind_direction_cardinal: string | null
          wind_direction_deg: number | null
          wind_gust_unit: string | null
          wind_gust_value: number | null
          wind_speed_unit: string | null
          wind_speed_value: number | null
        }
        Insert: {
          admin1?: string | null
          as_of?: string | null
          cloud_cover?: number | null
          country?: string | null
          created_at?: string | null
          dew_point_unit?: string | null
          dew_point_value?: number | null
          feels_like_unit?: string | null
          feels_like_value?: number | null
          fetched_at?: string | null
          humidity?: number | null
          icon?: string | null
          id?: number
          lat?: number | null
          location_id: string
          lon?: number | null
          moon_illumination?: number | null
          moon_phase?: string | null
          name?: string | null
          organization_id?: string | null
          precip_last_hr_unit?: string | null
          precip_last_hr_value?: number | null
          precip_mm?: number | null
          precip_type?: string | null
          pressure_tendency?: string | null
          pressure_unit?: string | null
          pressure_value?: number | null
          provider_id?: string | null
          provider_type?: string | null
          snow_depth_unit?: string | null
          snow_depth_value?: number | null
          summary?: string | null
          sunrise?: string | null
          sunset?: string | null
          temperature_unit?: string | null
          temperature_value?: number | null
          timestamp?: string | null
          updated_at?: string | null
          uv_index?: number | null
          visibility_unit?: string | null
          visibility_value?: number | null
          wind_direction_cardinal?: string | null
          wind_direction_deg?: number | null
          wind_gust_unit?: string | null
          wind_gust_value?: number | null
          wind_speed_unit?: string | null
          wind_speed_value?: number | null
        }
        Update: {
          admin1?: string | null
          as_of?: string | null
          cloud_cover?: number | null
          country?: string | null
          created_at?: string | null
          dew_point_unit?: string | null
          dew_point_value?: number | null
          feels_like_unit?: string | null
          feels_like_value?: number | null
          fetched_at?: string | null
          humidity?: number | null
          icon?: string | null
          id?: number
          lat?: number | null
          location_id?: string
          lon?: number | null
          moon_illumination?: number | null
          moon_phase?: string | null
          name?: string | null
          organization_id?: string | null
          precip_last_hr_unit?: string | null
          precip_last_hr_value?: number | null
          precip_mm?: number | null
          precip_type?: string | null
          pressure_tendency?: string | null
          pressure_unit?: string | null
          pressure_value?: number | null
          provider_id?: string | null
          provider_type?: string | null
          snow_depth_unit?: string | null
          snow_depth_value?: number | null
          summary?: string | null
          sunrise?: string | null
          sunset?: string | null
          temperature_unit?: string | null
          temperature_value?: number | null
          timestamp?: string | null
          updated_at?: string | null
          uv_index?: number | null
          visibility_unit?: string | null
          visibility_value?: number | null
          wind_direction_cardinal?: string | null
          wind_direction_deg?: number | null
          wind_gust_unit?: string | null
          wind_gust_value?: number | null
          wind_speed_unit?: string | null
          wind_speed_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_current_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "live_weather_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_current_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "weather_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_current_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_daily_forecast: {
        Row: {
          condition_icon: string | null
          condition_text: string | null
          created_at: string | null
          fetched_at: string | null
          forecast_date: string
          humidity: number | null
          icon: string | null
          id: number
          location_id: string
          moon_illumination: number | null
          moon_phase: string | null
          organization_id: string | null
          precip_accumulation_unit: string | null
          precip_accumulation_value: number | null
          precip_mm: number | null
          precip_probability: number | null
          precip_type: string | null
          pressure_unit: string | null
          pressure_value: number | null
          provider_id: string | null
          provider_type: string | null
          snow_accumulation_unit: string | null
          snow_accumulation_value: number | null
          summary: string | null
          sunrise: string | null
          sunset: string | null
          temp_max_c: number | null
          temp_max_f: number | null
          temp_max_unit: string | null
          temp_max_value: number | null
          temp_min_c: number | null
          temp_min_f: number | null
          temp_min_unit: string | null
          temp_min_value: number | null
          updated_at: string | null
          uv_index: number | null
          uv_index_max: number | null
          visibility_unit: string | null
          visibility_value: number | null
          wind_direction_cardinal: string | null
          wind_direction_deg: number | null
          wind_gust_max_unit: string | null
          wind_gust_max_value: number | null
          wind_speed_avg_unit: string | null
          wind_speed_avg_value: number | null
          wind_speed_unit: string | null
          wind_speed_value: number | null
        }
        Insert: {
          condition_icon?: string | null
          condition_text?: string | null
          created_at?: string | null
          fetched_at?: string | null
          forecast_date: string
          humidity?: number | null
          icon?: string | null
          id?: number
          location_id: string
          moon_illumination?: number | null
          moon_phase?: string | null
          organization_id?: string | null
          precip_accumulation_unit?: string | null
          precip_accumulation_value?: number | null
          precip_mm?: number | null
          precip_probability?: number | null
          precip_type?: string | null
          pressure_unit?: string | null
          pressure_value?: number | null
          provider_id?: string | null
          provider_type?: string | null
          snow_accumulation_unit?: string | null
          snow_accumulation_value?: number | null
          summary?: string | null
          sunrise?: string | null
          sunset?: string | null
          temp_max_c?: number | null
          temp_max_f?: number | null
          temp_max_unit?: string | null
          temp_max_value?: number | null
          temp_min_c?: number | null
          temp_min_f?: number | null
          temp_min_unit?: string | null
          temp_min_value?: number | null
          updated_at?: string | null
          uv_index?: number | null
          uv_index_max?: number | null
          visibility_unit?: string | null
          visibility_value?: number | null
          wind_direction_cardinal?: string | null
          wind_direction_deg?: number | null
          wind_gust_max_unit?: string | null
          wind_gust_max_value?: number | null
          wind_speed_avg_unit?: string | null
          wind_speed_avg_value?: number | null
          wind_speed_unit?: string | null
          wind_speed_value?: number | null
        }
        Update: {
          condition_icon?: string | null
          condition_text?: string | null
          created_at?: string | null
          fetched_at?: string | null
          forecast_date?: string
          humidity?: number | null
          icon?: string | null
          id?: number
          location_id?: string
          moon_illumination?: number | null
          moon_phase?: string | null
          organization_id?: string | null
          precip_accumulation_unit?: string | null
          precip_accumulation_value?: number | null
          precip_mm?: number | null
          precip_probability?: number | null
          precip_type?: string | null
          pressure_unit?: string | null
          pressure_value?: number | null
          provider_id?: string | null
          provider_type?: string | null
          snow_accumulation_unit?: string | null
          snow_accumulation_value?: number | null
          summary?: string | null
          sunrise?: string | null
          sunset?: string | null
          temp_max_c?: number | null
          temp_max_f?: number | null
          temp_max_unit?: string | null
          temp_max_value?: number | null
          temp_min_c?: number | null
          temp_min_f?: number | null
          temp_min_unit?: string | null
          temp_min_value?: number | null
          updated_at?: string | null
          uv_index?: number | null
          uv_index_max?: number | null
          visibility_unit?: string | null
          visibility_value?: number | null
          wind_direction_cardinal?: string | null
          wind_direction_deg?: number | null
          wind_gust_max_unit?: string | null
          wind_gust_max_value?: number | null
          wind_speed_avg_unit?: string | null
          wind_speed_avg_value?: number | null
          wind_speed_unit?: string | null
          wind_speed_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_daily_forecast_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "live_weather_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_daily_forecast_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "weather_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_daily_forecast_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_hourly_forecast: {
        Row: {
          cloud_cover: number | null
          condition_icon: string | null
          condition_text: string | null
          created_at: string | null
          dew_point_unit: string | null
          dew_point_value: number | null
          feels_like_unit: string | null
          feels_like_value: number | null
          fetched_at: string | null
          forecast_time: string
          humidity: number | null
          icon: string | null
          id: number
          location_id: string
          organization_id: string | null
          precip_intensity_unit: string | null
          precip_intensity_value: number | null
          precip_mm: number | null
          precip_probability: number | null
          pressure_unit: string | null
          pressure_value: number | null
          provider_id: string | null
          provider_type: string | null
          summary: string | null
          temp_c: number | null
          temp_f: number | null
          temperature_unit: string | null
          temperature_value: number | null
          updated_at: string | null
          uv_index: number | null
          visibility_unit: string | null
          visibility_value: number | null
          wind_degree: number | null
          wind_dir: string | null
          wind_direction_deg: number | null
          wind_gust_unit: string | null
          wind_gust_value: number | null
          wind_kph: number | null
          wind_mph: number | null
          wind_speed_unit: string | null
          wind_speed_value: number | null
        }
        Insert: {
          cloud_cover?: number | null
          condition_icon?: string | null
          condition_text?: string | null
          created_at?: string | null
          dew_point_unit?: string | null
          dew_point_value?: number | null
          feels_like_unit?: string | null
          feels_like_value?: number | null
          fetched_at?: string | null
          forecast_time: string
          humidity?: number | null
          icon?: string | null
          id?: number
          location_id: string
          organization_id?: string | null
          precip_intensity_unit?: string | null
          precip_intensity_value?: number | null
          precip_mm?: number | null
          precip_probability?: number | null
          pressure_unit?: string | null
          pressure_value?: number | null
          provider_id?: string | null
          provider_type?: string | null
          summary?: string | null
          temp_c?: number | null
          temp_f?: number | null
          temperature_unit?: string | null
          temperature_value?: number | null
          updated_at?: string | null
          uv_index?: number | null
          visibility_unit?: string | null
          visibility_value?: number | null
          wind_degree?: number | null
          wind_dir?: string | null
          wind_direction_deg?: number | null
          wind_gust_unit?: string | null
          wind_gust_value?: number | null
          wind_kph?: number | null
          wind_mph?: number | null
          wind_speed_unit?: string | null
          wind_speed_value?: number | null
        }
        Update: {
          cloud_cover?: number | null
          condition_icon?: string | null
          condition_text?: string | null
          created_at?: string | null
          dew_point_unit?: string | null
          dew_point_value?: number | null
          feels_like_unit?: string | null
          feels_like_value?: number | null
          fetched_at?: string | null
          forecast_time?: string
          humidity?: number | null
          icon?: string | null
          id?: number
          location_id?: string
          organization_id?: string | null
          precip_intensity_unit?: string | null
          precip_intensity_value?: number | null
          precip_mm?: number | null
          precip_probability?: number | null
          pressure_unit?: string | null
          pressure_value?: number | null
          provider_id?: string | null
          provider_type?: string | null
          summary?: string | null
          temp_c?: number | null
          temp_f?: number | null
          temperature_unit?: string | null
          temperature_value?: number | null
          updated_at?: string | null
          uv_index?: number | null
          visibility_unit?: string | null
          visibility_value?: number | null
          wind_degree?: number | null
          wind_dir?: string | null
          wind_direction_deg?: number | null
          wind_gust_unit?: string | null
          wind_gust_value?: number | null
          wind_kph?: number | null
          wind_mph?: number | null
          wind_speed_unit?: string | null
          wind_speed_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_hourly_forecast_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "live_weather_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_hourly_forecast_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "weather_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_hourly_forecast_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_ingest_config: {
        Row: {
          file_path: string
          id: number
          interval_minutes: number | null
          last_run: string | null
          organization_id: string | null
          provider_id: string
        }
        Insert: {
          file_path: string
          id?: number
          interval_minutes?: number | null
          last_run?: string | null
          organization_id?: string | null
          provider_id: string
        }
        Update: {
          file_path?: string
          id?: number
          interval_minutes?: number | null
          last_run?: string | null
          organization_id?: string | null
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weather_ingest_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_location_channels: {
        Row: {
          channel_id: string
          created_at: string | null
          id: string
          location_id: string
          organization_id: string | null
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          id?: string
          location_id: string
          organization_id?: string | null
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          id?: string
          location_id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_location_channels_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_location_channels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "live_weather_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_location_channels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "weather_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_location_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_locations: {
        Row: {
          admin1: string | null
          channel_id: string | null
          country: string
          created_at: string | null
          custom_name: string | null
          elevation_m: number | null
          id: string
          is_active: boolean | null
          lat: number
          lon: number
          name: string
          organization_id: string | null
          provider_id: string | null
          provider_name: string | null
          station_id: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          admin1?: string | null
          channel_id?: string | null
          country: string
          created_at?: string | null
          custom_name?: string | null
          elevation_m?: number | null
          id: string
          is_active?: boolean | null
          lat: number
          lon: number
          name: string
          organization_id?: string | null
          provider_id?: string | null
          provider_name?: string | null
          station_id?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          admin1?: string | null
          channel_id?: string | null
          country?: string
          created_at?: string | null
          custom_name?: string | null
          elevation_m?: number | null
          id?: string
          is_active?: boolean | null
          lat?: number
          lon?: number
          name?: string
          organization_id?: string | null
          provider_id?: string | null
          provider_name?: string | null
          station_id?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_locations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "u_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_locations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "data_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_locations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "data_providers_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ai_providers_public: {
        Row: {
          available_models: Json | null
          created_at: string | null
          dashboard_assignments: Json | null
          description: string | null
          enabled: boolean | null
          endpoint: string | null
          id: string | null
          max_tokens: number | null
          model: string | null
          name: string | null
          provider_name: string | null
          rate_limit_per_minute: number | null
          temperature: number | null
          top_p: number | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          available_models?: Json | null
          created_at?: string | null
          dashboard_assignments?: Json | null
          description?: string | null
          enabled?: boolean | null
          endpoint?: string | null
          id?: string | null
          max_tokens?: number | null
          model?: string | null
          name?: string | null
          provider_name?: string | null
          rate_limit_per_minute?: number | null
          temperature?: number | null
          top_p?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          available_models?: Json | null
          created_at?: string | null
          dashboard_assignments?: Json | null
          description?: string | null
          enabled?: boolean | null
          endpoint?: string | null
          id?: string | null
          max_tokens?: number | null
          model?: string | null
          name?: string | null
          provider_name?: string | null
          rate_limit_per_minute?: number | null
          temperature?: number | null
          top_p?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bop_election_summary: {
        Row: {
          current_seats: number | null
          election_year: number | null
          holdovers: number | null
          id: number | null
          leaders_change: number | null
          leading: number | null
          office: string | null
          party_name: string | null
          race_type: string | null
          timestamp: string | null
          winners_change: number | null
          winning_trend: number | null
          won: number | null
        }
        Relationships: []
      }
      data_providers_public: {
        Row: {
          api_key: string | null
          api_secret: string | null
          api_version: string | null
          base_url: string | null
          category: string | null
          config: Json | null
          created_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          source_url: string | null
          storage_path: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          api_key?: never
          api_secret?: never
          api_version?: string | null
          base_url?: string | null
          category?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          source_url?: string | null
          storage_path?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: never
          api_secret?: never
          api_version?: string | null
          base_url?: string | null
          category?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          source_url?: string | null
          storage_path?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      e_candidate_results_effective: {
        Row: {
          candidate_id: string | null
          created_at: string | null
          electoral_votes: number | null
          eliminated: boolean | null
          id: string | null
          metadata: Json | null
          override_info: Json | null
          race_result_id: string | null
          rank: number | null
          runoff: boolean | null
          updated_at: string | null
          vote_percentage: number | null
          votes: number | null
          winner: boolean | null
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string | null
          electoral_votes?: never
          eliminated?: never
          id?: string | null
          metadata?: Json | null
          override_info?: never
          race_result_id?: string | null
          rank?: never
          runoff?: never
          updated_at?: string | null
          vote_percentage?: never
          votes?: never
          winner?: never
        }
        Update: {
          candidate_id?: string | null
          created_at?: string | null
          electoral_votes?: never
          eliminated?: never
          id?: string | null
          metadata?: Json | null
          override_info?: never
          race_result_id?: string | null
          rank?: never
          runoff?: never
          updated_at?: string | null
          vote_percentage?: never
          votes?: never
          winner?: never
        }
        Relationships: [
          {
            foreignKeyName: "e_candidate_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "e_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_candidate_results_race_result_id_fkey"
            columns: ["race_result_id"]
            isOneToOne: false
            referencedRelation: "e_race_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_candidate_results_race_result_id_fkey"
            columns: ["race_result_id"]
            isOneToOne: false
            referencedRelation: "e_race_results_effective"
            referencedColumns: ["id"]
          },
        ]
      }
      e_race_results_effective: {
        Row: {
          called: boolean | null
          called_status: string | null
          called_timestamp: string | null
          created_at: string | null
          division_id: string | null
          id: string | null
          last_updated: string | null
          metadata: Json | null
          override_info: Json | null
          percent_reporting: number | null
          precincts_reporting: number | null
          precincts_total: number | null
          race_id: string | null
          recount_status: string | null
          registered_voters: number | null
          reporting_level: string | null
          total_votes: number | null
          updated_at: string | null
          winner_candidate_id: string | null
        }
        Insert: {
          called?: never
          called_status?: never
          called_timestamp?: never
          created_at?: string | null
          division_id?: string | null
          id?: string | null
          last_updated?: string | null
          metadata?: Json | null
          override_info?: never
          percent_reporting?: never
          precincts_reporting?: never
          precincts_total?: never
          race_id?: string | null
          recount_status?: never
          registered_voters?: never
          reporting_level?: string | null
          total_votes?: never
          updated_at?: string | null
          winner_candidate_id?: never
        }
        Update: {
          called?: never
          called_status?: never
          called_timestamp?: never
          created_at?: string | null
          division_id?: string | null
          id?: string | null
          last_updated?: string | null
          metadata?: Json | null
          override_info?: never
          percent_reporting?: never
          precincts_reporting?: never
          precincts_total?: never
          race_id?: string | null
          recount_status?: never
          registered_voters?: never
          reporting_level?: string | null
          total_votes?: never
          updated_at?: string | null
          winner_candidate_id?: never
        }
        Relationships: [
          {
            foreignKeyName: "e_race_results_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "e_geographic_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_race_results_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "e_races"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      live_weather_locations: {
        Row: {
          admin1: string | null
          country: string | null
          created_at: string | null
          custom_name: string | null
          elevation_m: number | null
          id: string | null
          is_active: boolean | null
          lat: number | null
          lon: number | null
          name: string | null
          provider_id: string | null
          provider_name: string | null
          station_id: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          admin1?: string | null
          country?: string | null
          created_at?: string | null
          custom_name?: string | null
          elevation_m?: number | null
          id?: string | null
          is_active?: boolean | null
          lat?: number | null
          lon?: number | null
          name?: string | null
          provider_id?: string | null
          provider_name?: string | null
          station_id?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          admin1?: string | null
          country?: string | null
          created_at?: string | null
          custom_name?: string | null
          elevation_m?: number | null
          id?: string | null
          is_active?: boolean | null
          lat?: number | null
          lon?: number | null
          name?: string | null
          provider_id?: string | null
          provider_name?: string | null
          station_id?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_locations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "data_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_locations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "data_providers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ready_for_sync: {
        Row: {
          data_source_id: string | null
          file_config: Json | null
          marked_ready_at: string | null
          name: string | null
          queue_id: number | null
          sync_config: Json | null
          template_mapping: Json | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_sync_queue_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_sync_queue_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "sync_intervals_view"
            referencedColumns: ["data_source_id"]
          },
        ]
      }
      sync_intervals_view: {
        Row: {
          check_time: string | null
          data_source_id: string | null
          interval_string: string | null
          interval_unit: string | null
          interval_value: number | null
          name: string | null
          next_sync_calculated: string | null
          sync_enabled: boolean | null
        }
        Insert: {
          check_time?: never
          data_source_id?: string | null
          interval_string?: never
          interval_unit?: never
          interval_value?: never
          name?: never
          next_sync_calculated?: never
          sync_enabled?: never
        }
        Update: {
          check_time?: never
          data_source_id?: string | null
          interval_string?: never
          interval_unit?: never
          interval_value?: never
          name?: never
          next_sync_calculated?: never
          sync_enabled?: never
        }
        Relationships: []
      }
      sync_monitor: {
        Row: {
          last_sync_at: string | null
          last_sync_count: number | null
          last_sync_error: string | null
          name: string | null
          next_sync_at: string | null
          status_description: string | null
          sync_enabled: string | null
          sync_interval: string | null
          sync_interval_unit: string | null
          sync_status: string | null
          time_until_sync: string | null
          type: string | null
        }
        Insert: {
          last_sync_at?: string | null
          last_sync_count?: number | null
          last_sync_error?: string | null
          name?: string | null
          next_sync_at?: string | null
          status_description?: never
          sync_enabled?: never
          sync_interval?: never
          sync_interval_unit?: never
          sync_status?: string | null
          time_until_sync?: never
          type?: string | null
        }
        Update: {
          last_sync_at?: string | null
          last_sync_count?: number | null
          last_sync_error?: string | null
          name?: string | null
          next_sync_at?: string | null
          status_description?: never
          sync_enabled?: never
          sync_interval?: never
          sync_interval_unit?: never
          sync_status?: string | null
          time_until_sync?: never
          type?: string | null
        }
        Relationships: []
      }
      sync_pipeline_status: {
        Row: {
          items_created_last_hour: number | null
          metric: string | null
          pending: number | null
          processing: number | null
          recent_completed: number | null
        }
        Relationships: []
      }
      v_active_agents: {
        Row: {
          agent_type: string | null
          error_count: number | null
          id: string | null
          last_run: string | null
          name: string | null
          next_run: string | null
          recent_success_rate: number | null
          run_count: number | null
          schedule: string | null
          status: string | null
        }
        Relationships: []
      }
      v_active_feeds: {
        Row: {
          category: string | null
          created_at: string | null
          endpoint: string | null
          id: string | null
          name: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          endpoint?: never
          id?: string | null
          name?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          endpoint?: never
          id?: string | null
          name?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      weather_active_alerts: {
        Row: {
          areas: string[] | null
          certainty: string | null
          country: string | null
          created_at: string | null
          description: string | null
          end_time: string | null
          event: string | null
          fetched_at: string | null
          headline: string | null
          id: string | null
          instruction: string | null
          links: string[] | null
          location_id: string | null
          location_name: string | null
          provider_id: string | null
          provider_type: string | null
          severity: string | null
          source: string | null
          start_time: string | null
          urgency: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_alerts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "live_weather_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_alerts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "weather_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_latest: {
        Row: {
          admin1: string | null
          as_of: string | null
          country: string | null
          created_at: string | null
          feels_like_unit: string | null
          feels_like_value: number | null
          fetched_at: string | null
          humidity: number | null
          icon: string | null
          lat: number | null
          location_id: string | null
          lon: number | null
          name: string | null
          pressure_unit: string | null
          pressure_value: number | null
          provider_type: string | null
          summary: string | null
          temperature_unit: string | null
          temperature_value: number | null
          uv_index: number | null
          visibility_unit: string | null
          visibility_value: number | null
          wind_direction_cardinal: string | null
          wind_direction_deg: number | null
          wind_speed_unit: string | null
          wind_speed_value: number | null
        }
        Insert: {
          admin1?: string | null
          as_of?: string | null
          country?: string | null
          created_at?: string | null
          feels_like_unit?: string | null
          feels_like_value?: number | null
          fetched_at?: string | null
          humidity?: number | null
          icon?: string | null
          lat?: number | null
          location_id?: string | null
          lon?: number | null
          name?: string | null
          pressure_unit?: string | null
          pressure_value?: number | null
          provider_type?: string | null
          summary?: string | null
          temperature_unit?: string | null
          temperature_value?: number | null
          uv_index?: number | null
          visibility_unit?: string | null
          visibility_value?: number | null
          wind_direction_cardinal?: string | null
          wind_direction_deg?: number | null
          wind_speed_unit?: string | null
          wind_speed_value?: number | null
        }
        Update: {
          admin1?: string | null
          as_of?: string | null
          country?: string | null
          created_at?: string | null
          feels_like_unit?: string | null
          feels_like_value?: number | null
          fetched_at?: string | null
          humidity?: number | null
          icon?: string | null
          lat?: number | null
          location_id?: string | null
          lon?: number | null
          name?: string | null
          pressure_unit?: string | null
          pressure_value?: number | null
          provider_type?: string | null
          summary?: string | null
          temperature_unit?: string | null
          temperature_value?: number | null
          uv_index?: number | null
          visibility_unit?: string | null
          visibility_value?: number | null
          wind_direction_cardinal?: string | null
          wind_direction_deg?: number | null
          wind_speed_unit?: string | null
          wind_speed_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_current_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "live_weather_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_current_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "weather_locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      accept_u_invitation: {
        Args: { p_token: string; p_user_id: string }
        Returns: {
          error_message: string
          org_role: string
          organization_id: string
          success: boolean
        }[]
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      bytea_to_text: { Args: { data: string }; Returns: string }
      check_and_trigger_syncs: { Args: never; Returns: undefined }
      check_is_superuser: { Args: never; Returns: boolean }
      check_pg_net_request: { Args: { request_id: number }; Returns: Json }
      check_sync_intervals_detailed: {
        Args: never
        Returns: {
          check_time: string
          data_source_id: string
          interval_string: string
          interval_unit: string
          interval_value: number
          name: string
          next_sync_calculated: string
          sync_enabled: boolean
        }[]
      }
      check_sync_results: { Args: never; Returns: Json }
      check_user_org_id: { Args: never; Returns: string }
      cleanup_log_tables: { Args: never; Returns: Json }
      cleanup_old_agent_runs: { Args: never; Returns: number }
      cleanup_old_drafts: { Args: never; Returns: undefined }
      cleanup_old_weather_data: { Args: never; Returns: undefined }
      cleanup_stuck_syncs: {
        Args: never
        Returns: {
          cleaned_id: string
          cleaned_name: string
        }[]
      }
      copy_gfx_project_complete: {
        Args: {
          p_new_name?: string
          p_source_project_id: string
          p_target_org_id: string
        }
        Returns: string
      }
      create_data_provider: {
        Args: {
          _api_key?: string
          _api_secret?: string
          _api_version?: string
          _base_url?: string
          _category: string
          _config?: Json
          _description?: string
          _id?: string
          _is_active?: boolean
          _last_run?: string
          _name: string
          _refresh_interval_minutes?: number
          _source_url?: string
          _storage_path?: string
          _type: string
        }
        Returns: Json
      }
      create_invitation: {
        Args: {
          p_email: string
          p_organization_id: string
          p_role?: string
          p_user_id: string
        }
        Returns: Json
      }
      create_organization_with_seed: {
        Args: {
          p_admin_email: string
          p_allowed_domains: string[]
          p_dashboard_config?: Json
          p_name: string
          p_seed_config?: Json
          p_slug: string
        }
        Returns: Json
      }
      create_project: {
        Args: {
          p_color?: string
          p_default_channel_id?: string
          p_default_instance_id?: string
          p_description?: string
          p_icon?: string
          p_name: string
          p_settings?: Json
        }
        Returns: Json
      }
      debug_auth: { Args: never; Returns: string }
      debug_auth_uid: {
        Args: never
        Returns: {
          current_role_name: string
          current_uid: string
          is_authenticated: boolean
        }[]
      }
      debug_get_user_layout: {
        Args: { p_layout_name?: string }
        Returns: {
          auth_user_id: string
          found_user_id: string
          layout_data: Json
          layout_exists: boolean
        }[]
      }
      delete_data_provider: {
        Args: { _category?: string; _id?: string; _type?: string }
        Returns: Json
      }
      delete_map_position: {
        Args: { p_position_id: string; p_user_id: string }
        Returns: {
          additional_settings: Json | null
          atmosphere_enabled: boolean | null
          created_at: string
          default_latitude: number
          default_longitude: number
          default_zoom: number
          election_map_opacity: number | null
          globe_mode: boolean | null
          id: string
          map_opacity: number | null
          map_style: Database["public"]["Enums"]["map_style_type"]
          projection_type: Database["public"]["Enums"]["projection_type"]
          saved_positions: Json | null
          show_map_labels: boolean
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "map_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      e_calculate_party_strength: {
        Args: { p_election_id?: string; p_party_id: string }
        Returns: {
          avg_vote_share: number
          division_id: string
          division_name: string
          races_won: number
          total_races: number
          total_votes: number
          win_percentage: number
        }[]
      }
      e_create_synthetic_group: {
        Args: { p_description?: string; p_name: string; p_user_id?: string }
        Returns: string
      }
      e_create_synthetic_race:
        | {
            Args: {
              p_ai_response: Json
              p_base_election_id: string
              p_base_race_id: string
              p_description: string
              p_district?: string
              p_name: string
              p_office: string
              p_scenario_input: Json
              p_state: string
              p_summary?: Json
              p_synthetic_group_id?: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_ai_response: Json
              p_base_election_id: string
              p_base_race_id: string
              p_description: string
              p_district: string
              p_name: string
              p_office: string
              p_scenario_input: Json
              p_state: string
              p_summary: Json
              p_user_id: string
            }
            Returns: string
          }
      e_delete_synthetic_group: {
        Args: { p_cascade_delete_races?: boolean; p_group_id: string }
        Returns: Json
      }
      e_delete_synthetic_race: {
        Args: { p_synthetic_race_id?: string; p_user_id?: string }
        Returns: boolean
      }
      e_get_effective_value: {
        Args: { original_value: unknown; override_value: unknown }
        Returns: unknown
      }
      e_get_race_counties: { Args: { p_race_id: string }; Returns: Json }
      e_get_synthetic_race_full: {
        Args: { p_synthetic_race_id: string }
        Returns: Json
      }
      e_get_synthetic_races: { Args: never; Returns: Json }
      e_list_synthetic_groups: {
        Args: never
        Returns: {
          created_at: string
          created_by: string
          description: string
          id: string
          name: string
          race_count: number
          updated_at: string
        }[]
      }
      e_list_synthetic_races:
        | {
            Args: never
            Returns: {
              created_at: string
              created_by: string
              description: string
              district: string
              group_id: string
              group_name: string
              name: string
              office: string
              state: string
              synthetic_race_id: string
            }[]
          }
        | {
            Args: { p_user_id?: string }
            Returns: {
              ai_response: Json | null
              ai_response_raw: Json | null
              base_election_id: string | null
              base_race_id: string | null
              created_at: string | null
              created_by: string | null
              description: string | null
              district: string | null
              id: string
              name: string
              office: string | null
              scenario_input: Json | null
              state: string | null
              summary: Json | null
              synthetic_group_id: string | null
              user_id: string | null
            }[]
            SetofOptions: {
              from: "*"
              to: "e_synthetic_races"
              isOneToOne: false
              isSetofReturn: true
            }
          }
      e_list_synthetic_races_by_group: {
        Args: { p_group_id?: string }
        Returns: {
          created_at: string
          description: string
          district: string
          group_id: string
          group_name: string
          name: string
          office: string
          state: string
          synthetic_race_id: string
        }[]
      }
      e_merge_parties: {
        Args: {
          source_party_id: string
          target_party_id: string
          update_references?: boolean
        }
        Returns: Json
      }
      e_rename_synthetic_group: {
        Args: {
          p_group_id: string
          p_new_description?: string
          p_new_name: string
        }
        Returns: boolean
      }
      e_search_candidates: {
        Args: { p_query: string }
        Returns: {
          candidate_id: string
          display_name: string
          full_name: string
          id: string
          party_abbreviation: string
          party_id: string
          party_name: string
          photo_url: string
          short_name: string
        }[]
      }
      enablelongtransactions: { Args: never; Returns: string }
      end_active_playout: {
        Args: {
          p_channel_id: string
          p_end_reason?: string
          p_layer_index: number
        }
        Returns: undefined
      }
      end_all_channel_playout: {
        Args: { p_channel_id: string; p_end_reason?: string }
        Returns: undefined
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      fetch_bop_data: {
        Args: { p_election_year?: number; p_race_type?: string }
        Returns: {
          current_seats: number
          election_year: number
          holdovers: number
          insufficient_vote: number
          leading: number
          party_name: string
          race_type: string
          total_seats: number
          winning_trend: number
          won: number
        }[]
      }
      fetch_county_data_extended: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_race_type: string
          p_state?: string
          p_year: number
        }
        Returns: {
          candidate_id: string
          color_hex: string
          county_name: string
          division_id: string
          election_name: string
          election_year: number
          fips_code: string
          full_name: string
          incumbent: boolean
          party_abbreviation: string
          party_name: string
          percent_reporting: number
          photo_url: string
          state_code: string
          vote_percentage: number
          votes: number
          winner: boolean
        }[]
      }
      fetch_election_data_for_api: {
        Args: {
          p_level?: string
          p_race_type?: string
          p_state?: string
          p_year?: number
        }
        Returns: {
          ballot_order: number
          bio: string
          bio_short: string
          called: boolean
          called_status: string
          called_timestamp: string
          candidate_display_name: string
          candidate_id: string
          candidate_results_id: string
          date_of_birth: string
          division_type: string
          education: string[]
          election_id: string
          election_name: string
          electoral_votes: number
          fips_code: string
          first_name: string
          full_name: string
          incumbent: boolean
          last_fetch_at: string
          last_name: string
          last_updated: string
          num_elect: number
          office: string
          party_abbreviations: string[]
          party_aliases: string[]
          party_code: string
          party_color_dark: string
          party_color_light: string
          party_color_primary: string
          party_color_secondary: string
          party_description: string
          party_display_name: string
          party_facebook: string
          party_founded_year: string
          party_headquarters: string
          party_history: string
          party_ideology: string
          party_instagram: string
          party_leadership: Json
          party_name: string
          party_short_name: string
          party_twitter: string
          party_website: string
          percent_reporting: number
          photo_url: string
          political_experience: string[]
          precincts_reporting: number
          precincts_total: number
          professional_background: string[]
          race_candidates_id: string
          race_display_name: string
          race_id: string
          race_name: string
          race_race_id: string
          race_results_id: string
          race_type: string
          state_code: string
          state_electoral_votes: number
          total_votes: number
          uncontested: boolean
          vote_percentage: number
          votes: number
          website: string
          winner: boolean
          withdrew: boolean
          year: number
        }[]
      }
      fetch_election_data_for_ui: {
        Args: { p_year?: number }
        Returns: {
          ballot_order: number
          bio: string
          bio_short: string
          called: boolean
          called_override: boolean
          called_override_timestamp: string
          called_status: string
          called_status_override: string
          called_timestamp: string
          candidate_display_name: string
          candidate_id: string
          candidate_override_at: string
          candidate_override_by: string
          candidate_override_reason: string
          candidate_results_id: string
          date_of_birth: string
          division_type: string
          education: string[]
          election_id: string
          election_name: string
          electoral_votes: number
          electoral_votes_override: number
          fips_code: string
          first_name: string
          full_name: string
          incumbent: boolean
          incumbent_override: boolean
          last_fetch_at: string
          last_name: string
          last_updated: string
          num_elect: number
          office: string
          party_abbreviations: string[]
          party_aliases: string[]
          party_code: string
          party_color_dark: string
          party_color_light: string
          party_color_primary: string
          party_color_primary_override: string
          party_color_secondary: string
          party_description: string
          party_display_name: string
          party_facebook: string
          party_founded_year: string
          party_headquarters: string
          party_history: string
          party_ideology: string
          party_instagram: string
          party_leadership: Json
          party_name: string
          party_short_name: string
          party_twitter: string
          party_website: string
          percent_reporting: number
          percent_reporting_override: number
          photo_url: string
          political_experience: string[]
          precincts_reporting: number
          precincts_reporting_override: number
          precincts_total: number
          precincts_total_override: number
          professional_background: string[]
          race_candidates_id: string
          race_display_name: string
          race_id: string
          race_name: string
          race_override_at: string
          race_override_by: string
          race_override_reason: string
          race_race_id: string
          race_results_id: string
          race_type: string
          state_code: string
          state_electoral_votes: number
          total_votes: number
          total_votes_override: number
          uncontested: boolean
          vote_percentage: number
          vote_percentage_override: number
          votes: number
          votes_override: number
          website: string
          winner: boolean
          winner_override: boolean
          withdrew: boolean
          withdrew_override: boolean
          year: number
        }[]
      }
      fetch_house_district_data_extended: {
        Args: { p_limit?: number; p_offset?: number; p_year: number }
        Returns: {
          candidate_id: string
          color_hex: string
          district_name: string
          election_name: string
          election_year: number
          fips_code: string
          full_name: string
          incumbent: boolean
          party_abbreviation: string
          party_name: string
          percent_reporting: number
          photo_url: string
          state_code: string
          vote_percentage: number
          votes: number
          winner: boolean
        }[]
      }
      fetch_presidential_national_data_extended: {
        Args: { p_year: number }
        Returns: {
          candidate_id: string
          color_hex: string
          election_name: string
          election_year: number
          electoral_votes: number
          full_name: string
          incumbent: boolean
          party_abbreviation: string
          party_name: string
          percent_reporting: number
          photo_url: string
          race_metadata: Json
          state_code: string
          state_electoral_votes: number
          state_name: string
          state_type: string
          vote_percentage: number
          votes: number
          winner: boolean
        }[]
      }
      fetch_presidential_state_data_extended: {
        Args: { p_year: number }
        Returns: {
          candidate_id: string
          color_hex: string
          election_name: string
          election_year: number
          electoral_votes: number
          full_name: string
          incumbent: boolean
          party_abbreviation: string
          party_name: string
          percent_reporting: number
          photo_url: string
          race_metadata: Json
          state_code: string
          state_electoral_votes: number
          state_name: string
          state_type: string
          vote_percentage: number
          votes: number
          winner: boolean
        }[]
      }
      fetch_senate_state_data_extended: {
        Args: { p_year: number }
        Returns: {
          candidate_id: string
          color_hex: string
          election_name: string
          election_year: number
          full_name: string
          incumbent: boolean
          party_abbreviation: string
          party_name: string
          percent_reporting: number
          photo_url: string
          race_metadata: Json
          state_code: string
          state_name: string
          state_type: string
          vote_percentage: number
          votes: number
          winner: boolean
        }[]
      }
      fix_order_gaps: {
        Args: { parent_id_value?: string; table_name: string }
        Returns: number
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_active_feeds_by_category: {
        Args: { p_category: string }
        Returns: {
          configuration: Json
          created_at: string
          id: string
          name: string
          type: string
        }[]
      }
      get_api_endpoint_dependencies: {
        Args: { p_endpoint_ids: string[] }
        Returns: {
          data_source_id: string
          endpoint_id: string
        }[]
      }
      get_competition_with_seasons: {
        Args: { p_competition_id: number }
        Returns: {
          category_name: string
          competition_id: number
          competition_name: string
          competition_sportradar_id: string
          country_code: string
          seasons: Json
        }[]
      }
      get_competitions: {
        Args: { p_active_only?: boolean; p_sport?: string }
        Returns: {
          active: boolean
          alternative_name: string
          category_name: string
          country_code: string
          gender: string
          id: number
          logo_url: string
          name: string
          sport: string
          sportradar_id: string
          type: string
        }[]
      }
      get_current_season: {
        Args: { p_competition_id: number }
        Returns: {
          end_date: string
          name: string
          season_id: number
          sportradar_id: string
          start_date: string
          team_count: number
          year: string
        }[]
      }
      get_dashboard_stats: { Args: never; Returns: Json }
      get_endpoints_by_target_app: {
        Args: { p_organization_id?: string; p_target_app: string }
        Returns: {
          active: boolean
          created_at: string
          description: string
          endpoint_url: string
          id: string
          name: string
          output_format: string
          sample_data: Json
          schema_config: Json
          slug: string
          target_apps: string[]
          updated_at: string
        }[]
      }
      get_event_details: {
        Args: { p_event_id: number }
        Returns: {
          event_data: Json
        }[]
      }
      get_gfx_project_templates: {
        Args: { p_project_ids: string[] }
        Returns: {
          project_id: string
          template_id: string
        }[]
      }
      get_instance_by_channel: {
        Args: { p_channel_name: string }
        Returns: Json
      }
      get_integrations_to_sync: {
        Args: never
        Returns: {
          file_config: Json
          id: string
          name: string
          sync_config: Json
          template_mapping: Json
        }[]
      }
      get_league_team_stats: {
        Args: { p_season_id: number }
        Returns: {
          avg_possession: number
          clean_sheets: number
          draws: number
          goal_difference: number
          goals_against: number
          goals_for: number
          losses: number
          pass_accuracy: number
          played: number
          points: number
          red_cards: number
          shot_accuracy: number
          tackles: number
          team_id: number
          team_logo: string
          team_name: string
          total_shots: number
          wins: number
          yellow_cards: number
        }[]
      }
      get_map_settings: { Args: { p_user_id: string }; Returns: Json }
      get_match_odds: { Args: { p_event_id: number }; Returns: Json }
      get_org_for_email_domain: {
        Args: { p_email: string }
        Returns: {
          allowed: boolean
          error_message: string
          organization_id: string
          organization_name: string
          organization_slug: string
        }[]
      }
      get_player_stats: {
        Args: { p_player_id: number; p_season_id?: number }
        Returns: Json
      }
      get_provider_details: {
        Args: { p_id: string }
        Returns: {
          api_key: string
          api_secret: string
          api_version: string
          base_url: string
          category: string
          config: Json
          created_at: string
          description: string
          id: string
          is_active: boolean
          last_run: string
          name: string
          refresh_interval_minutes: number
          source_url: string
          storage_path: string
          type: string
          updated_at: string
        }[]
      }
      get_recent_results: {
        Args: { p_limit?: number; p_season_id: number }
        Returns: {
          away_score: number
          away_team: Json
          event_id: number
          home_score: number
          home_team: Json
          match_day: number
          round: string
          sportradar_id: string
          start_time: string
          status: string
          venue_name: string
          winner_id: number
        }[]
      }
      get_season_outrights: {
        Args: { p_season_id: number }
        Returns: {
          relegation_odds: number
          relegation_prob: number
          team_id: number
          team_logo: string
          team_name: string
          top_4_odds: number
          top_4_prob: number
          winner_odds: number
          winner_prob: number
        }[]
      }
      get_season_schedule: {
        Args: { p_season_id: number }
        Returns: {
          attendance: number
          away_score: number
          away_team_logo: string
          away_team_name: string
          event_id: number
          home_score: number
          home_team_logo: string
          home_team_name: string
          round: string
          start_time: string
          status: string
          venue_name: string
        }[]
      }
      get_season_standings: {
        Args: { p_season_id: number }
        Returns: {
          draw: number
          form: string
          goals_against: number
          goals_diff: number
          goals_for: number
          loss: number
          played: number
          points: number
          rank: number
          team_abbreviation: string
          team_id: number
          team_logo: string
          team_name: string
          win: number
        }[]
      }
      get_season_teams: {
        Args: { p_season_id: number }
        Returns: {
          abbreviation: string
          country: string
          country_code: string
          logo_url: string
          name: string
          short_name: string
          sportradar_id: string
          team_id: number
        }[]
      }
      get_seedable_dashboard_data: { Args: never; Returns: Json }
      get_seedable_data_summary: {
        Args: never
        Returns: {
          category: string
          item_count: number
          table_name: string
        }[]
      }
      get_seedable_items: {
        Args: { p_category: string }
        Returns: {
          description: string
          id: string
          name: string
        }[]
      }
      get_table_stats: {
        Args: never
        Returns: {
          indexes_size: string
          row_count: number
          table_name: string
          table_size: string
          total_size: string
        }[]
      }
      get_team_schedule: {
        Args: { p_limit?: number; p_season_id?: number; p_team_id: number }
        Returns: {
          away_score: number
          competition_name: string
          event_id: number
          home_score: number
          is_home: boolean
          opponent: Json
          round: string
          season_name: string
          sportradar_id: string
          start_time: string
          status: string
          venue_name: string
        }[]
      }
      get_team_stats: {
        Args: { p_season_id?: number; p_team_id: number }
        Returns: Json
      }
      get_text_providers_for_dashboard: {
        Args: { dash: string }
        Returns: {
          api_key: string
          created_at: string
          dashboard_assignments: Json
          enabled: boolean
          id: string
          model: string
          name: string
          provider_name: string
          type: string
          updated_at: string
        }[]
      }
      get_top_assists: {
        Args: { p_limit?: number; p_season_id: number }
        Returns: {
          appearances: number
          assists: number
          goals: number
          minutes_played: number
          player_id: number
          player_name: string
          player_photo: string
          player_position: string
          rank: number
          team_id: number
          team_logo: string
          team_name: string
        }[]
      }
      get_top_scorer_odds: {
        Args: { p_season_id: number }
        Returns: {
          current_goals: number
          player_id: number
          player_name: string
          player_photo: string
          team_logo: string
          team_name: string
          top_scorer_odds: number
          top_scorer_prob: number
        }[]
      }
      get_top_scorers: {
        Args: { p_limit?: number; p_season_id: number }
        Returns: {
          appearances: number
          assists: number
          goals: number
          minutes_played: number
          player_id: number
          player_name: string
          player_photo: string
          player_position: string
          rank: number
          rating: number
          team_id: number
          team_logo: string
          team_name: string
        }[]
      }
      get_upcoming_events: {
        Args: { p_limit?: number; p_season_id: number }
        Returns: {
          away_team: Json
          event_id: number
          home_team: Json
          match_day: number
          round: string
          sportradar_id: string
          start_time: string
          status: string
          venue_name: string
        }[]
      }
      get_upcoming_with_odds: {
        Args: { p_limit?: number; p_season_id: number }
        Returns: {
          away_team_logo: string
          away_team_name: string
          away_win_odds: number
          away_win_prob: number
          btts_yes_odds: number
          draw_odds: number
          draw_prob: number
          event_id: number
          home_team_logo: string
          home_team_name: string
          home_win_odds: number
          home_win_prob: number
          over_2_5_odds: number
          start_time: string
        }[]
      }
      get_user_layout: { Args: { p_layout_name?: string }; Returns: Json }
      get_user_organization_id: { Args: never; Returns: string }
      get_user_permissions: {
        Args: { p_auth_user_id: string }
        Returns: {
          action: string
          app_key: string
          granted: boolean
          resource: string
          source: string
        }[]
      }
      get_venue_details: { Args: { p_venue_id: number }; Returns: Json }
      get_venues: {
        Args: { p_country?: string; p_limit?: number }
        Returns: {
          capacity: number
          city: string
          country: string
          id: number
          image_url: string
          latitude: number
          longitude: number
          name: string
          sportradar_id: string
          surface: string
          team_count: number
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      inspect_pg_net_tables: { Args: never; Returns: Json }
      is_superuser: { Args: never; Returns: boolean }
      list_active_applications: {
        Args: never
        Returns: {
          app_key: string
          app_url: string | null
          created_at: string | null
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          sort_order: number
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "applications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_invitations: {
        Args: { p_pending_only?: boolean; p_user_id: string }
        Returns: {
          accepted_at: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          token: string
        }[]
      }
      list_providers_with_status: {
        Args: never
        Returns: {
          api_key_configured: boolean
          api_key_len: number
          category: string
          id: string
          is_active: boolean
          name: string
          type: string
        }[]
      }
      list_providers_with_status_all: {
        Args: never
        Returns: {
          api_key_configured: boolean
          api_key_len: number
          api_secret_configured: boolean
          api_secret_len: number
          category: string
          id: string
          is_active: boolean
          name: string
          refresh_interval_minutes: number
          source_url: string
          storage_path: string
          type: string
        }[]
      }
      list_providers_with_status_category: {
        Args: { p_category: string }
        Returns: {
          api_key_configured: boolean
          api_key_len: number
          api_secret_configured: boolean
          api_secret_len: number
          category: string
          id: string
          is_active: boolean
          name: string
          refresh_interval_minutes: number
          source_url: string
          storage_path: string
          type: string
        }[]
      }
      log_debug: {
        Args: { data?: Json; func_name: string; msg: string }
        Returns: undefined
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      migrate_ai_providers_from_kv: {
        Args: never
        Returns: {
          errors: string[]
          migrated_count: number
          skipped_count: number
        }[]
      }
      ndi_preset_rpc: {
        Args: {
          p_action: string
          p_alpha?: boolean
          p_fps?: string
          p_id?: string
          p_name?: string
          p_pixel_format?: string
          p_resolution?: string
          p_stream_name?: string
        }
        Returns: Json
      }
      output_profile_rpc: {
        Args: {
          p_2110_preset_id?: string
          p_2110_settings?: Json
          p_action: string
          p_auto_start?: boolean
          p_full_config?: Json
          p_id?: string
          p_name?: string
          p_ndi_preset_id?: string
          p_ndi_settings?: Json
          p_output_type?: string
          p_reload_source?: boolean
          p_source_file_path?: string
          p_source_url?: string
        }
        Returns: Json
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      populate_sync_queue: { Args: never; Returns: Json }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      preview_log_cleanup: {
        Args: never
        Returns: {
          age_category: string
          count: number
          oldest: string
          size_estimate: string
          status: string
          table_name: string
        }[]
      }
      process_sync_queue: { Args: never; Returns: Json }
      pulsarvs_create_project: {
        Args: {
          p_color?: string
          p_default_channel_id?: string
          p_default_instance_id?: string
          p_description?: string
          p_icon?: string
          p_name: string
          p_settings?: Json
        }
        Returns: Json
      }
      pulsarvs_delete_project: { Args: { p_id: string }; Returns: Json }
      pulsarvs_get_active_project: { Args: never; Returns: Json }
      pulsarvs_get_projects: { Args: never; Returns: Json }
      pulsarvs_playlist_create: {
        Args: {
          p_description?: string
          p_loop_enabled?: boolean
          p_name: string
          p_project_id?: string
        }
        Returns: Json
      }
      pulsarvs_playlist_delete: { Args: { p_id: string }; Returns: Json }
      pulsarvs_playlist_get: { Args: { p_playlist_id: string }; Returns: Json }
      pulsarvs_playlist_item_add:
        | {
            Args: {
              p_channel_id?: string
              p_content_id?: string
              p_duration?: number
              p_item_type: Database["public"]["Enums"]["pulsarvs_playlist_item_type"]
              p_media_id?: string
              p_metadata?: Json
              p_name: string
              p_playlist_id: string
              p_scheduled_time?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_channel_id?: string
              p_content_id?: string
              p_duration?: number
              p_folder_id?: string
              p_item_type: Database["public"]["Enums"]["pulsarvs_playlist_item_type"]
              p_media_id?: string
              p_metadata?: Json
              p_name: string
              p_parent_item_id?: string
              p_playlist_id: string
              p_scheduled_time?: string
            }
            Returns: Json
          }
      pulsarvs_playlist_item_delete: { Args: { p_id: string }; Returns: Json }
      pulsarvs_playlist_item_get_nested: {
        Args: { p_parent_item_id: string }
        Returns: Json
      }
      pulsarvs_playlist_item_set_channel: {
        Args: { p_channel_id: string; p_id: string }
        Returns: Json
      }
      pulsarvs_playlist_item_update:
        | {
            Args: {
              p_channel_id?: string
              p_duration?: number
              p_id: string
              p_metadata?: Json
              p_name?: string
              p_scheduled_time?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_channel_id?: string
              p_duration?: number
              p_id: string
              p_media_id?: string
              p_metadata?: Json
              p_name?: string
              p_scheduled_time?: string
            }
            Returns: Json
          }
      pulsarvs_playlist_items_group: {
        Args: {
          p_group_name: string
          p_item_ids: string[]
          p_playlist_id: string
        }
        Returns: Json
      }
      pulsarvs_playlist_items_reorder: {
        Args: { p_item_ids: string[]; p_playlist_id: string }
        Returns: Json
      }
      pulsarvs_playlist_items_ungroup: {
        Args: { p_group_id: string }
        Returns: Json
      }
      pulsarvs_playlist_list: { Args: { p_project_id?: string }; Returns: Json }
      pulsarvs_playlist_update: {
        Args: {
          p_description?: string
          p_id: string
          p_is_active?: boolean
          p_loop_enabled?: boolean
          p_name?: string
        }
        Returns: Json
      }
      pulsarvs_set_active_project: { Args: { p_id: string }; Returns: Json }
      pulsarvs_update_project: {
        Args: {
          p_color?: string
          p_default_channel_id?: string
          p_default_instance_id?: string
          p_description?: string
          p_icon?: string
          p_id: string
          p_name?: string
          p_settings?: Json
        }
        Returns: Json
      }
      record_agent_run: {
        Args: {
          p_agent_id: string
          p_duration_ms?: number
          p_error_message?: string
          p_logs?: Json
          p_results?: Json
          p_status: string
        }
        Returns: string
      }
      resend_invitation: {
        Args: { p_invitation_id: string; p_user_id: string }
        Returns: Json
      }
      revoke_invitation: {
        Args: { p_invitation_id: string; p_user_id: string }
        Returns: Json
      }
      save_map_position: {
        Args: {
          p_lat: number
          p_lng: number
          p_name: string
          p_user_id: string
          p_zoom: number
        }
        Returns: {
          additional_settings: Json | null
          atmosphere_enabled: boolean | null
          created_at: string
          default_latitude: number
          default_longitude: number
          default_zoom: number
          election_map_opacity: number | null
          globe_mode: boolean | null
          id: string
          map_opacity: number | null
          map_style: Database["public"]["Enums"]["map_style_type"]
          projection_type: Database["public"]["Enums"]["projection_type"]
          saved_positions: Json | null
          show_map_labels: boolean
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "map_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_map_settings: {
        Args: { p_settings: Json; p_user_id: string }
        Returns: {
          additional_settings: Json | null
          atmosphere_enabled: boolean | null
          created_at: string
          default_latitude: number
          default_longitude: number
          default_zoom: number
          election_map_opacity: number | null
          globe_mode: boolean | null
          id: string
          map_opacity: number | null
          map_style: Database["public"]["Enums"]["map_style_type"]
          projection_type: Database["public"]["Enums"]["projection_type"]
          saved_positions: Json | null
          show_map_labels: boolean
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "map_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_user_layout: {
        Args: { p_layout_data: Json }
        Returns: {
          created_at: string | null
          id: string
          layout_data: Json
          layout_name: string | null
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_layouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_e_candidates: { Args: { p_query: string }; Returns: Json[] }
      search_teams: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          abbreviation: string
          country: string
          country_code: string
          logo_url: string
          name: string
          short_name: string
          team_id: number
        }[]
      }
      seed_dashboard_data: {
        Args: { p_dashboard_config: Json; p_target_org_id: string }
        Returns: Json
      }
      seed_elections: {
        Args: { p_election_ids: string[]; p_target_org_id: string }
        Returns: Json
      }
      seed_finance_stocks: {
        Args: { p_stock_ids: string[]; p_target_org_id: string }
        Returns: Json
      }
      seed_organization_data: {
        Args: { p_new_org_id: string; p_seed_config: Json }
        Returns: Json
      }
      seed_sports_leagues: {
        Args: { p_league_ids: string[]; p_target_org_id: string }
        Returns: Json
      }
      seed_weather_locations: {
        Args: { p_location_ids: string[]; p_target_org_id: string }
        Returns: Json
      }
      shift_items_after_deletion: {
        Args: { p_deleted_order: number; p_parent_id: string }
        Returns: undefined
      }
      shift_items_for_insertion: {
        Args: { p_parent_id: string; p_start_order: number }
        Returns: undefined
      }
      sportsmonks_leagues: { Args: { p_dashboard?: string }; Returns: Json }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      st2110_preset_rpc: {
        Args: {
          p_action: string
          p_fps?: string
          p_id?: string
          p_multicast_ip?: string
          p_name?: string
          p_nic?: string
          p_pixel_format?: string
          p_resolution?: string
        }
        Returns: Json
      }
      sync_ap_bop_data: { Args: { results_type: string }; Returns: undefined }
      sync_ap_election_data: {
        Args: {
          office_id: string
          race_level: string
          race_name: string
          race_type: string
          results_type: string
        }
        Returns: undefined
      }
      sync_school_closings: { Args: never; Returns: undefined }
      sync_weather_csv: { Args: never; Returns: undefined }
      system_initialized: { Args: never; Returns: boolean }
      test_auth: { Args: never; Returns: Json }
      test_cascade_delete_order_shift: {
        Args: never
        Returns: {
          result: string
          test_name: string
        }[]
      }
      test_edge_function_simple: { Args: never; Returns: Json }
      test_intervals_basic: {
        Args: never
        Returns: {
          id: string
          interval_num: number
          interval_unit: string
          name: string
        }[]
      }
      test_pg_net_basic: { Args: never; Returns: Json }
      test_pg_net_with_logging: { Args: never; Returns: Json }
      test_simple: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      test_single_item_processing: { Args: never; Returns: Json }
      test_sync_components: {
        Args: never
        Returns: {
          result: string
          test_name: string
        }[]
      }
      test_vault_secrets: {
        Args: never
        Returns: {
          preview: string
          secret_name: string
          status: string
        }[]
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      ui_delete_weather_location: {
        Args: { p_location_id: string }
        Returns: Json
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_data_provider: {
        Args: {
          p_api_key?: string
          p_api_secret?: string
          p_base_url?: string
          p_config?: Json
          p_id: string
          p_is_active?: boolean
          p_refresh_interval_minutes?: number
          p_source_url?: string
          p_storage_path?: string
        }
        Returns: Json
      }
      update_project: {
        Args: {
          p_color?: string
          p_default_channel_id?: string
          p_default_instance_id?: string
          p_description?: string
          p_icon?: string
          p_id: string
          p_name?: string
          p_settings?: Json
        }
        Returns: Json
      }
      update_provider_settings_by_id: {
        Args: {
          p_allow_api_key?: boolean
          p_api_key?: string
          p_api_secret?: string
          p_api_version?: string
          p_base_url?: string
          p_config_patch?: Json
          p_dashboard?: string
          p_id: string
          p_is_active?: boolean
          p_source_url?: string
          p_storage_path?: string
        }
        Returns: undefined
      }
      update_user_profile: {
        Args: {
          p_avatar_url?: string
          p_full_name: string
          p_preferences: Json
          p_user_id: string
        }
        Returns: Json
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_category: {
        Args: {
          p_country_code?: string
          p_name: string
          p_sportradar_id: string
        }
        Returns: number
      }
      upsert_league: {
        Args: {
          p_alternative_name?: string
          p_category_sportradar_id?: string
          p_gender?: string
          p_name: string
          p_sportradar_id: string
        }
        Returns: number
      }
      upsert_season: {
        Args: {
          p_end_date?: string
          p_is_current?: boolean
          p_league_sportradar_id: string
          p_name: string
          p_sportradar_id: string
          p_start_date?: string
          p_year?: string
        }
        Returns: number
      }
      upsert_stock_prices: { Args: { p_stocks: Json }; Returns: number }
      upsert_team: {
        Args: {
          p_abbreviation?: string
          p_country?: string
          p_country_code?: string
          p_gender?: string
          p_name: string
          p_short_name?: string
          p_sportradar_id: string
        }
        Returns: number
      }
      upsert_user_layout: {
        Args: { p_layout_data: Json; p_layout_name: string }
        Returns: {
          created_at: string | null
          id: string
          layout_data: Json
          layout_name: string | null
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_layouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_user_layout_with_id: {
        Args: { p_layout_data: Json; p_layout_name: string; p_user_id: string }
        Returns: {
          created_at: string | null
          id: string
          layout_data: Json
          layout_name: string | null
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_layouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      validate_u_invitation_token: {
        Args: { p_token: string }
        Returns: {
          email: string
          error_message: string
          expires_at: string
          invitation_id: string
          is_valid: boolean
          organization_id: string
          organization_name: string
          organization_slug: string
          role: string
        }[]
      }
      vs_content_delete: { Args: { p_id: string }; Returns: Json }
      vs_content_folder_create: {
        Args: {
          p_color?: string
          p_icon?: string
          p_name: string
          p_parent_id?: string
        }
        Returns: Json
      }
      vs_content_folder_delete: { Args: { p_id: string }; Returns: Json }
      vs_content_folder_list: { Args: never; Returns: Json }
      vs_content_folder_rename: {
        Args: { p_id: string; p_name: string }
        Returns: Json
      }
      vs_content_get: { Args: { p_id: string }; Returns: Json }
      vs_content_list:
        | {
            Args: {
              p_folder_id?: string
              p_limit?: number
              p_my_content_only?: boolean
              p_offset?: number
              p_project_id?: string
              p_public_only?: boolean
              p_search?: string
              p_tags?: string[]
            }
            Returns: Json
          }
        | {
            Args: {
              p_limit?: number
              p_my_content_only?: boolean
              p_offset?: number
              p_public_only?: boolean
              p_search?: string
              p_tags?: string[]
            }
            Returns: Json
          }
        | {
            Args: {
              p_folder_id?: string
              p_limit?: number
              p_my_content_only?: boolean
              p_offset?: number
              p_public_only?: boolean
              p_search?: string
              p_tags?: string[]
            }
            Returns: Json
          }
      vs_content_move_to_folder: {
        Args: { p_content_id: string; p_folder_id: string }
        Returns: Json
      }
      vs_content_save:
        | {
            Args: {
              p_backdrop_url?: string
              p_description?: string
              p_folder_id?: string
              p_id?: string
              p_is_public?: boolean
              p_name?: string
              p_project_id?: string
              p_scene_config?: Json
              p_tags?: string[]
            }
            Returns: Json
          }
        | {
            Args: {
              p_backdrop_url: string
              p_description?: string
              p_folder_id?: string
              p_id?: string
              p_is_public?: boolean
              p_name: string
              p_scene_config: Json
              p_tags?: string[]
            }
            Returns: Json
          }
    }
    Enums: {
      ai_injector_feature:
        | "outliers"
        | "summary"
        | "correlation"
        | "sentiment"
        | "fullscreen"
        | "camera_angle"
        | "point_of_view"
        | "scene_considerations"
        | "airport_instructions"
      map_style_type: "light" | "dark" | "satellite"
      projection_type: "mercator" | "globe" | "equirectangular"
      pulsarvs_playlist_item_type: "page" | "group" | "media"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_injector_feature: [
        "outliers",
        "summary",
        "correlation",
        "sentiment",
        "fullscreen",
        "camera_angle",
        "point_of_view",
        "scene_considerations",
        "airport_instructions",
      ],
      map_style_type: ["light", "dark", "satellite"],
      projection_type: ["mercator", "globe", "equirectangular"],
      pulsarvs_playlist_item_type: ["page", "group", "media"],
    },
  },
} as const

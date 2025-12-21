/**
 * Nova Endpoint Types
 *
 * Types for API endpoints that provide data to Nova GFX.
 * These endpoints are registered in Nova with target_app='nova-gfx'.
 */

export interface NovaEndpoint {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  endpoint_url: string;      // e.g., "/api/nova-gfx-current-weather"
  output_format: string;     // json, rss, xml, csv
  target_apps: string[];     // e.g., ["nova-gfx"]
  schema_config?: {
    schema?: {
      metadata?: {
        jsonMappingConfig?: {
          outputTemplate?: {
            fields?: Array<{
              path: string;
              type: string;
              required?: boolean;
              description?: string;
            }>;
            structure?: Record<string, unknown>;
          };
        };
      };
    };
  };
  sample_data?: Record<string, unknown>[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NovaEndpointListResponse {
  data: NovaEndpoint[];
  count: number;
  targetApp: string;
}

export interface FetchedDataSource {
  id: string;
  name: string;
  slug: string;
  data: Record<string, unknown>[];
  displayField: string;
  endpointUrl: string;
  lastFetched: number;
}

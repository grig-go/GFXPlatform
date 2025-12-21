// Database types - matching nova-old schema
export type AgentOutputFormat = 'json' | 'xml' | 'rss' | 'csv' | 'custom';
export type AgentAuthType = 'none' | 'api-key' | 'bearer' | 'basic' | 'oauth2' | 'custom';

// UI Display types (for backward compatibility)
export type AgentFormat = 'RSS' | 'ATOM' | 'JSON';
export type AgentStatus = 'ACTIVE' | 'PAUSED' | 'ERROR';
export type AgentCacheType = 'OFF' | '5M' | '15M' | '30M' | '1H';
export type AgentDataType = 'Elections' | 'Finance' | 'Sports' | 'Weather' | 'News' | 'Nova Weather' | 'Nova Election' | 'Nova Finance' | 'Nova Sports';
export type TargetApp = 'nova-gfx' | 'pulsar-vs' | 'fusion' | 'pulsar-mcr';

// Database schema matching api_endpoints table
export interface APIEndpoint {
  id: string;
  name: string;
  slug: string;
  description?: string;
  output_format: AgentOutputFormat;
  schema_config: Record<string, any>;
  transform_config: Record<string, any>;
  relationship_config: Record<string, any>;
  cache_config: {
    enabled: boolean;
    ttl: number;
  };
  auth_config: {
    required: boolean;
    type: AgentAuthType;
    config?: Record<string, any>;
  };
  rate_limit_config: {
    enabled: boolean;
    requests_per_minute: number;
  };
  active: boolean;
  user_id?: string;
  target_apps?: string[];
  created_at: string;
  updated_at: string;
  // Optional relations
  api_endpoint_sources?: any[];
}

// Legacy interface for UI compatibility (existing mock data structure)
export interface AgentDataSource {
  id: string;
  name: string;
  feedId?: string; // Reference to an existing feed
  category: AgentDataType;
  // Configuration fields (needed for testing)
  type?: string;
  api_config?: any;
  rss_config?: any;
  database_config?: any;
  file_config?: any;
}

export interface AgentDataRelationship {
  sourceId: string;
  targetId: string;
  joinType: 'inner' | 'left' | 'right';
  joinField: string;
}

export interface AgentFieldMapping {
  outputField: string;
  sourceId: string;
  sourcePath: string;
  transform?: string;
}

export interface AgentTransform {
  type: 'filter' | 'map' | 'extract' | 'format' | 'sort' | 'deduplicate';
  config: Record<string, any>;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  slug?: string; // URL slug for the agent endpoint
  environment?: 'production' | 'staging' | 'development'; // Deployment environment
  autoStart?: boolean; // Auto-start after deployment
  generateDocs?: boolean; // Generate API documentation
  // Step 2: Data Type (can select multiple categories)
  dataType?: AgentDataType | AgentDataType[];
  // Step 3: Data Sources
  dataSources?: AgentDataSource[];
  // Step 4: Data Relationships
  relationships?: AgentDataRelationship[];
  // Step 5: Output Format
  format: AgentFormat;
  formatOptions?: Record<string, any>; // Format-specific options (channelTitle, sourceMappings, etc.)
  itemPath?: string; // JSONPath for generating items
  fieldMappings?: AgentFieldMapping[];
  fixedFields?: Record<string, string>; // For RSS/ATOM fixed fields
  // Step 6: Transformations
  transforms?: AgentTransform[];
  // Step 7: Security
  auth: AgentAuthType;
  apiKey?: string;
  requiresAuth?: boolean;
  authConfig?: Record<string, any>; // Authentication configuration (API keys, tokens, users)
  // Target Apps - which apps this endpoint is built for
  targetApps?: string[];
  // Runtime
  status: AgentStatus;
  cache: AgentCacheType;
  url?: string; // Generated endpoint URL
  created: string;
  lastRun?: string;
  runCount?: number;
  schedule?: string; // cron expression
}

export interface AgentsData {
  agents: Agent[];
  lastUpdated: string;
}

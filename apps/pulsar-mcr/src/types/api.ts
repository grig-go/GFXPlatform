// Unified interfaces to be used in both DataWizard and IntegrationEditDialog

// Extended auth types for comprehensive security support
export type AuthType = 'none' | 'basic' | 'bearer' | 'api_key_header' | 'api_key_query' | 'oauth2' | 'hmac' | 'custom';
export type WizardOption = 'api' | 'rss' | 'database' | 'file' | null;

// API presets for common use cases
export const API_PRESETS: Record<string, APIPresetConfig> = {
  traffic: {
    name: 'Traffic Data',
    icon: 'drive-time',
    defaultAuth: 'api_key_header',
    defaultHeaders: {
      'Accept': 'application/json'
    },
    requiredFields: ['location', 'traffic_level', 'timestamp'],
    sampleEndpoints: [
      {
        name: 'Google Maps Traffic',
        url: 'https://maps.googleapis.com/maps/api/directions/json',
        description: 'Real-time traffic conditions'
      },
      {
        name: 'HERE Traffic API',
        url: 'https://traffic.api.here.com/traffic/6.3/incidents.json',
        description: 'Traffic incidents and flow'
      }
    ]
  },
  sports: {
    name: 'Sports Scores',
    icon: 'trophy',
    defaultAuth: 'bearer',
    defaultHeaders: {
      'Accept': 'application/json'
    },
    requiredFields: ['team_home', 'team_away', 'score_home', 'score_away'],
    sampleEndpoints: [
      {
        name: 'ESPN API',
        url: 'https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard',
        description: 'Live sports scores'
      },
      {
        name: 'The Sports DB',
        url: 'https://www.thesportsdb.com/api/v1/json/{API_KEY}/livescore.php',
        description: 'Live scores across sports'
      }
    ]
  },
  finance: {
    name: 'Financial Data',
    icon: 'dollar',
    defaultAuth: 'api_key_query',
    defaultHeaders: {
      'Accept': 'application/json'
    },
    requiredFields: ['symbol', 'price', 'change', 'timestamp'],
    sampleEndpoints: [
      {
        name: 'Alpha Vantage',
        url: 'https://www.alphavantage.co/query',
        description: 'Stock market data'
      },
      {
        name: 'IEX Cloud',
        url: 'https://cloud.iexapis.com/stable/stock/{symbol}/quote',
        description: 'Real-time stock quotes'
      }
    ]
  },
  election: {
    name: 'Election Results',
    icon: 'chart',
    defaultAuth: 'oauth2',
    defaultHeaders: {
      'Accept': 'application/json'
    },
    requiredFields: ['candidate', 'votes', 'percentage', 'precinct'],
    sampleEndpoints: [
      {
        name: 'AP Election API',
        url: 'https://api.ap.org/v3/elections/{year}',
        description: 'Real-time election results'
      },
      {
        name: 'Google Civic Information',
        url: 'https://www.googleapis.com/civicinfo/v2/elections',
        description: 'Election and polling data'
      }
    ]
  }
};

// Types
export interface FieldMapping {
  source: 'parent' | 'child' | 'child-dynamic' | 'literal';
  field?: string;           // The source field name
  value?: string;           // For literal values
  childIndex?: number;      // For static child index (child[0], child[1], etc.)
  indexPattern?: string;    // For dynamic patterns (default: '{i}')
  indexOffset?: number;     // Offset for dynamic index (default: 0)
  transform?: string;       // Optional transformation
}

export interface ParentChildQueryConfig {
  parentQuery: {
    connectionId: string;
    sql: string;
    parameters?: any[];
  };
  childQuery: {
    connectionId: string;
    sql: string;
    parentKeyField: string;
    limitField?: string;
    maxResults?: number;
  };
  templateSelection: {
    mode: 'static' | 'dynamic' | 'conditional';
    templateId?: string;
    templatePattern?: string;
    rules?: Array<{
      conditions: Array<{
        field: string;
        operator: '=' | '!=' | '>' | '<' | 'in';
        value: any;
        source: 'parent' | 'childCount';
      }>;
      templateId: string;
      childLimit?: number;
    }>;
  };
  fieldMappings: {
    staticFields: Record<string, FieldMapping>;    // Updated to use FieldMapping
    indexedFields: Record<string, FieldMapping>;   // Updated to use FieldMapping
  };
}

export interface SimpleQuery {
  id: string;
  name: string;
  mode: 'simple';
  connectionId: string;
  sql: string;
  type: 'raw' | 'builder';
}

export type DatabaseQuery = SimpleQuery | (ParentChildQueryConfig & {
  id: string;
  name: string;
  mode: 'parent-child';
});

export type DatabaseQueryWithCache = DatabaseQuery & {
  columnMetadata?: {
    parentColumns?: string[];
    childColumns?: string[];
    lastTested?: string;
  };
};

export interface DatabaseQueryStepProps {
  connections: Record<string, any>;
  queries: Record<string, DatabaseQuery>;
  templates: any[];
  onQueriesChange: (queries: Record<string, DatabaseQuery>) => void;
  onTestQuery?: (queryId: string) => Promise<void>;
}

// Extend DatabaseQuery with column metadata
// For parent-child queries, include templateSelection and fieldMappings from ParentChildQueryConfig
export type DatabaseQueryWithMetadata = DatabaseQuery & {
  columnMetadata?: {
    parentColumns?: string[];
    childColumns?: string[];
    lastTested?: string;
  };
  // Add optional fields from ParentChildQueryConfig for type safety
  templateSelection?: ParentChildQueryConfig['templateSelection'];
  fieldMappings?: ParentChildQueryConfig['fieldMappings'];
};

export interface DatabaseConfig {
  dbType?: string;
  connections?: {
    [key: string]: {
      id: string;
      name: string;
      host: string;
      port?: number;
      database: string;
      username: string;
      password: string;
      schema?: string;
      ssl?: boolean;
    };
  };
  queries?: Record<string, DatabaseQueryWithMetadata>;
  transformations?: any;
  conditionalMappings?: Array<{
    id: string;
    priority: number;
    conditions: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    templateId: string;
    fieldMappings: Array<{
      templateField: string;
      sourceColumn: string;
    }>;
  }>;
}

export interface FilterCondition {
  field: string;
  operator: '==' | '!=' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn';
  value: string;
}

export interface FileConfig {
  source: 'upload' | 'url' | 'path';
  url?: string;
  path?: string;
  fileName?: string;
  format?: 'csv' | 'tsv' | 'txt' | 'json';
  delimiter?: string;
  hasHeaders?: boolean;
  headerRowNumber?: number;
  encoding?: string;
  headers?: string[];
  customHeaders?: string[];
  totalRows?: number;

  // Chunking configuration
  chunkMode?: boolean;
  chunkSize?: number;

  // Filtering configuration
  filterEnabled?: boolean;
  filters?: FilterCondition[];
  filterLogic?: 'AND' | 'OR';

  // Keep for backward compatibility
  filterField?: string;
  filterOperator?: '==' | '!=' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn';
  filterValue?: string;

  // Temporary data (NOT saved to database - only used during wizard)
  fileContent?: string;  // Full file content - only for preview/testing
  sample?: any[];        // Sample rows - only for UI display
}

export interface SyncConfig {
  enabled?: boolean;
  interval?: number;
  intervalUnit: 'seconds' | 'minutes' | 'hours' | 'days';
  targetBucketId?: string;
  lastSync?: string;
  syncMode?: 'update' | 'replace';
  chunkMode?: boolean;
  chunkSize?: number;
}

export interface APIConfig {
  // Endpoint configuration
  url?: string;
  endpoint?: string; // Deprecated
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  
  // Authentication
  auth_type?: AuthType;
  auth_config?: {
    // Basic Auth
    username?: string;
    password?: string;
    
    // Bearer Token / OAuth2
    token?: string;
    refresh_token?: string;
    token_endpoint?: string;
    client_id?: string;
    client_secret?: string;
    
    // API Key
    api_key?: string;
    key_header_name?: string;
    key_param_name?: string;
    
    // HMAC Signature
    secret_key?: string;
    signature_header?: string;
    signature_algorithm?: 'sha256' | 'sha512';
    include_timestamp?: boolean;
    include_nonce?: boolean;
    
    // Custom Auth
    custom_headers?: Record<string, string>;
    custom_params?: Record<string, string>;
    custom_script?: string;
  };
  
  // Extracted data from testing
  extracted_fields?: string[];
  sample_response?: any;
  last_test_at?: string;
  last_test_status?: 'success' | 'error';
}

export interface TemplateMapping {
  templateId: string;
  fieldMappings: {
    templateField: string;
    sourceColumn: string | number;
    rowIndex?: number;
    combinedFields?: {
      fields: string[];
      template: string;
    };
  }[];
}

export interface APIPresetConfig {
  name: string;
  icon: string;
  defaultAuth: AuthType;
  defaultHeaders?: Record<string, string>;
  requiredFields?: string[];
  sampleEndpoints?: {
    name: string;
    url: string;
    description: string;
  }[];
}

export interface EnhancedAuthConfig {
  // Basic Auth
  username?: string;
  password?: string;
  
  // Bearer Token / OAuth2
  token?: string;
  refresh_token?: string;
  token_endpoint?: string;
  client_id?: string;
  client_secret?: string;
  
  // API Key
  api_key?: string;
  key_header_name?: string;
  key_param_name?: string;
  
  // HMAC Signature
  secret_key?: string;
  signature_header?: string;
  signature_algorithm?: 'sha256' | 'sha512';
  include_timestamp?: boolean;
  include_nonce?: boolean;
  
  // Custom Auth
  custom_headers?: Record<string, string>;
  custom_params?: Record<string, string>;
  custom_script?: string;
}

export interface DataSourceConfig {
  name: string;
  type: WizardOption;
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;

  // Enhanced auth fields (replacing the existing simple auth)
  auth_required?: boolean;
  auth_type?: AuthType;
  auth_config?: EnhancedAuthConfig;

  // Existing fields
  file_config?: FileConfig;
  database_config?: DatabaseConfig;
  template_mapping?: TemplateMapping;
  sync_config?: SyncConfig;

  api_fields?: string[];        // Extracted field paths
  api_sample_data?: any;         // Sample response data

  // API pagination fields
  api_data_path?: string;
  pagination_enabled?: boolean;
  page_param?: string;
  limit_param?: string;
  page_size?: number;
}

export interface RSSConfig {
  url?: string;
  feedType?: 'rss' | 'atom';
  refreshInterval?: number;
  maxItems?: number;
  extracted_fields?: string[];
  sample_items?: any[];
}

export interface Integration {
  id: string;
  name: string;
  type: 'api' | 'rss' | 'database' | 'file';
  active: boolean;
  
  // Configuration for each integration type
  api_config?: APIConfig;
  file_config?: FileConfig;
  database_config?: DatabaseConfig;
  rss_config?: RSSConfig;
  
  // Common configuration
  sync_config?: SyncConfig;
  template_mapping?: TemplateMapping;
  
  // Metadata
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  next_sync_at?: string;
  sync_status?: 'idle' | 'pending' | 'running' | 'success' | 'error' | 'scheduled' | 'ready';
  last_sync_at?: string;
  last_sync_count?: number;
  last_sync_error?: string;
}

// Helper function to convert between old and new auth format if needed
export const convertAuthConfig = (integration: any): { auth_type: AuthType, auth_config: EnhancedAuthConfig } => {
  // If already in new format
  if (integration.auth_type) {
    return {
      auth_type: integration.auth_type,
      auth_config: integration.auth_config || {}
    };
  }
  
  // Convert from old format (auth_required, auth_type: 'basic' | 'bearer')
  if (!integration.auth_required) {
    return {
      auth_type: 'none',
      auth_config: {}
    };
  }
  
  if (integration.auth_type === 'basic') {
    return {
      auth_type: 'basic',
      auth_config: {
        username: integration.auth_config?.username,
        password: integration.auth_config?.password
      }
    };
  }
  
  if (integration.auth_type === 'bearer') {
    return {
      auth_type: 'bearer',
      auth_config: {
        token: integration.auth_config?.token
      }
    };
  }
  
  // Default
  return {
    auth_type: 'none',
    auth_config: {}
  };
};

// Helper to build authenticated request (matching DataWizard)
// Helper to build authenticated request using APIConfig
export const buildAuthenticatedRequest = (
  apiConfig: APIConfig
): { headers: Record<string, string>, params: Record<string, string> } => {
  const headers: Record<string, string> = { ...apiConfig.headers };
  const params: Record<string, string> = {};
  const auth_type = apiConfig.auth_type || 'none';
  const auth_config = apiConfig.auth_config || {};

  switch (auth_type) {
    case 'basic':
      if (auth_config.username && auth_config.password) {
        const basicAuth = btoa(`${auth_config.username}:${auth_config.password}`);
        headers['Authorization'] = `Basic ${basicAuth}`;
      }
      break;

    case 'bearer':
      if (auth_config.token) {
        headers['Authorization'] = `Bearer ${auth_config.token}`;
      }
      break;

    case 'api_key_header':
      if (auth_config.api_key) {
        const headerName = auth_config.key_header_name || 'X-API-Key';
        headers[headerName] = auth_config.api_key;
      }
      break;

    case 'api_key_query':
      if (auth_config.api_key) {
        const paramName = auth_config.key_param_name || 'api_key';
        params[paramName] = auth_config.api_key;
      }
      break;

    // ... rest of auth types ...
  }

  return { headers, params };
};

export const extractJsonFields = (data: any, prefix: string = ''): string[] => {
  const fields: string[] = [];
  
  if (data === null || data === undefined) return fields;

  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object') {
      return extractJsonFields(data[0], prefix);
    }
    return fields;
  }

  if (typeof data === 'object') {
    Object.keys(data).forEach(key => {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      
      if (data[key] === null || data[key] === undefined) {
        fields.push(fullPath);
      } else if (Array.isArray(data[key])) {
        fields.push(fullPath);
        if (data[key].length > 0 && typeof data[key][0] === 'object') {
          const arrayFields = extractJsonFields(data[key][0], `${fullPath}[0]`);
          fields.push(...arrayFields);
        }
      } else if (typeof data[key] === 'object') {
        fields.push(fullPath);
        const nestedFields = extractJsonFields(data[key], fullPath);
        fields.push(...nestedFields);
      } else {
        fields.push(fullPath);
      }
    });
  }

  return [...new Set(fields)];
};
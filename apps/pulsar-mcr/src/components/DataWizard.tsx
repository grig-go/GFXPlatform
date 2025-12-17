import React, { useState, useEffect } from 'react';
import {
  DialogStep,
  MultistepDialog,
  Button,
  Collapse,
  FormGroup,
  InputGroup,
  RadioGroup,
  Radio,
  Callout,
  Intent,
  Toaster,
  HTMLSelect,
  Switch,
  TextArea,
  FileInput,
  Tag,
  Card,
  Elevation,
  NumericInput,
  Icon,
  Divider,
  Tabs,
  Tab,
  Spinner
} from '@blueprintjs/core';
import { supabase } from '../lib/supabase';
import { useFetchProxy } from '../hooks/useFetchProxy';
import { analyzeColumnsWithClaude } from '../utils/claudeAI';
// @ts-ignore: papaparse lacks type definitions
import Papa from 'papaparse';

import DatabaseQueryStep from './DatabaseQueryStep';
import { ServerFileBrowser } from './ServerFileBrowser';
import { APIPresetConfig, WizardOption, DataSourceConfig, AuthType, SyncConfig } from '../types/api';

const FILE_SERVER_URL = import.meta.env.VITE_FILE_SERVER_URL || 'http://localhost:8001';

// Global toaster instance for notifications
const toaster = Toaster.create({
  position: 'top',
});

// Database type definitions
const DATABASE_TYPES = {
  mysql: {
    name: 'MySQL',
    icon: 'database',
    defaultPort: 3306,
    color: '#00758F',
    features: ['JSON Support', 'Full-Text Search', 'Replication', 'Partitioning'],
    paramStyle: '?',
    identifierQuote: '`'
  },
  postgresql: {
    name: 'PostgreSQL',
    icon: 'database',
    defaultPort: 5432,
    color: '#336791',
    features: ['JSONB', 'Arrays', 'Full-Text Search', 'Window Functions', 'CTEs', 'Schemas'],
    paramStyle: '$',
    identifierQuote: '"'
  },
  mssql: {
    name: 'SQL Server',
    icon: 'database',
    defaultPort: 1433,
    color: '#CC2927',
    features: ['T-SQL', 'CLR Integration', 'XML Support', 'Temporal Tables'],
    paramStyle: '@',
    identifierQuote: '[]'
  }
};



interface DataWizardProps {
  isOpen: boolean;
  onClose: () => void;
}


const API_PRESETS: Record<string, APIPresetConfig> = {
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

export const DataWizard: React.FC<DataWizardProps> = ({ isOpen, onClose }) => {
  const [selectedOption, setSelectedOption] = useState<WizardOption>(null);
  const [currentStepId, setCurrentStepId] = useState<string>('choose');
  const [config, setConfig] = useState<DataSourceConfig>({
    name: '',
    type: null,
  });
  const [testResult, setTestResult] = useState<any>(null);
  const [, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [, setBuckets] = useState<any[]>([]);
  const [aiDetecting, setAiDetecting] = useState<boolean>(false);
  const [templateFields, setTemplateFields] = useState<string[]>([]);
  const [bucketsWithStatus, setBucketsWithStatus] = useState<any[]>([]);
  const [bucketError] = useState<string | null>(null);

  // API-specific state
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showRequestPreview, setShowRequestPreview] = useState<boolean>(false);

  // Database-specific state
  const [, setActiveConnectionId] = useState<string | null>(null);
  const [, setSchemaTree] = useState<any[]>([]);
  const [dbTestResults, setDbTestResults] = useState<Record<string, any>>({});

  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [loadingServerFile, setLoadingServerFile] = useState(false);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const [browserEntries, setBrowserEntries] = useState<any[]>([]);
  const [browserPath, setBrowserPath] = useState('');
  const [selectedBrowserFile, setSelectedBrowserFile] = useState<any>(null);

  const { fetchTextFile, fetchViaProxy } = useFetchProxy();

  const isParentChildQuery = (query: any): query is { id: string; name: string; mode: 'parent-child' } => {
    return query.mode === 'parent-child';
  };

  // Validation functions (keeping all existing validation logic)
  const validateBasicConfig = (): boolean => {
    if (!config.name || config.name.trim() === '') {
      return false;
    }
    
    if (config.type === 'api') {
      return !!(config.url && config.url.trim() !== '');
    }
    
    if (config.type === 'file') {
      return !!(config.file_config?.fileContent || config.file_config?.url);
    }
    
    if (config.type === 'database') {
      return true; // Basic config only needs name for database
    }
    
    return true;
  };

  const validateDatabaseConnections = (): boolean => {
  if (!config.database_config?.dbType) {
    return false;
  }
  
  const connections = Object.values(config.database_config.connections || {});
    if (connections.length === 0) {
      return false;
    }
    
    // At least one connection must be valid
    return connections.some(conn => 
      conn.host && conn.database && conn.username
    );
  };
  
  const validateDatabaseQueries = (): boolean => {
    const queries = Object.values(config.database_config?.queries || {});
    if (queries.length === 0) {
      return false;
    }
  
    return queries.every(query => {
      if (query.mode === 'simple') {
        return query.sql && query.connectionId;
      } else {
        return query.parentQuery.sql && 
               query.parentQuery.connectionId &&
               query.childQuery.sql &&
               query.childQuery.connectionId &&
               query.childQuery.parentKeyField;
      }
    });
  };

  const validateMappingConfig = (): boolean => {
    if (!config.name || config.name.trim() === '') {
      return false;
    }
  
    if (bucketError) {
      return false;
    }
    
    const isDatabase = config.type === 'database';
    const hasParentChildQueries = isDatabase && Object.values(config.database_config?.queries || {})
      .some(q => q.mode === 'parent-child');
    
    if (config.sync_config?.enabled) {
      // For database with parent-child queries, mappings are in the query config
      if (isDatabase && hasParentChildQueries) {
        // Just need a target bucket for parent-child queries
        if (!config.sync_config?.targetBucketId) {
          return false;
        }
        
        // Validate that all parent-child queries have proper configuration
        const parentChildQueries = Object.values(config.database_config?.queries || {})
          .filter(isParentChildQuery); // Type-safe filtering
        
        return parentChildQueries.every(query => {
          // Check template selection
          if (!query.templateSelection?.mode) return false;
          
          switch (query.templateSelection.mode) {
            case 'static':
              if (!query.templateSelection.templateId) return false;
              break;
            case 'dynamic':
              if (!query.templateSelection.templatePattern) return false;
              break;
            case 'conditional':
              if (!query.templateSelection.rules || query.templateSelection.rules.length === 0) return false;
              break;
          }
          
          // Check field mappings - at least one mapping required
          const hasStaticFields = Object.keys(query.fieldMappings?.staticFields || {}).length > 0;
          const hasIndexedFields = Object.keys(query.fieldMappings?.indexedFields || {}).length > 0;
          
          return hasStaticFields || hasIndexedFields;
        });
      }
      
      // For file sources or simple database queries
      if (!config.template_mapping?.templateId) {
        return false;
      }
      
      if (!config.sync_config?.targetBucketId) {
        return false;
      }
      
      const mappings = config.template_mapping?.fieldMappings || [];
      const validMappings = mappings.filter(m => {
        // Must have a template field
        if (!m.templateField || m.templateField.trim() === '') {
          return false;
        }
        
        // Check if it has either:
        // 1. A source column (direct mapping), OR
        // 2. Combined fields with at least one field selected
        const hasSourceColumn = m.sourceColumn !== undefined && m.sourceColumn !== '';
        const hasCombinedFields = m.combinedFields && 
                                  m.combinedFields.fields && 
                                  m.combinedFields.fields.length > 0;
        
        return hasSourceColumn || hasCombinedFields;
      });
      
      return validMappings.length > 0;
    }
    
    // If sync is not enabled, basic config is enough
    return true;
  };

  // Get validation state for current step
  const isCurrentStepValid = (): boolean => {
    switch (currentStepId) {
      case 'choose':
        return selectedOption !== null;
      
      case 'configure':
        return validateBasicConfig();
      
      case 'db-connection':
        return validateDatabaseConnections();
        
      case 'db-query':
        return validateDatabaseQueries();
      
      case 'mapping':
        return validateMappingConfig();
      
      default:
        return true;
    }
  };

  // Enhanced handler for auth config changes
  const handleAuthConfigChange = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      auth_config: {
        ...prev.auth_config,
        [field]: value
      }
    }));
  };

  // Handle API preset selection
  const handlePresetSelect = (presetKey: string) => {
    const preset = API_PRESETS[presetKey];
    setSelectedPreset(presetKey);
    
    setConfig(prev => ({
      ...prev,
      auth_type: preset.defaultAuth,
      headers: {
        ...prev.headers,
        ...preset.defaultHeaders
      }
    }));
  };

  // Build authenticated request
  const buildAuthenticatedRequest = (): { headers: Record<string, string>, params: Record<string, string> } => {
    const headers: Record<string, string> = { ...config.headers };
    const params: Record<string, string> = {};

    if (!config.auth_type || config.auth_type === 'none') {
      return { headers, params };
    }

    const authConfig = config.auth_config || {};

    switch (config.auth_type) {
      case 'basic':
        if (authConfig.username && authConfig.password) {
          const basicAuth = btoa(`${authConfig.username}:${authConfig.password}`);
          headers['Authorization'] = `Basic ${basicAuth}`;
        }
        break;

      case 'bearer':
        if (authConfig.token) {
          headers['Authorization'] = `Bearer ${authConfig.token}`;
        }
        break;

      case 'api_key_header':
        if (authConfig.api_key) {
          const headerName = authConfig.key_header_name || 'X-API-Key';
          headers[headerName] = authConfig.api_key;
        }
        break;

      case 'api_key_query':
        if (authConfig.api_key) {
          const paramName = authConfig.key_param_name || 'api_key';
          params[paramName] = authConfig.api_key;
        }
        break;

      case 'oauth2':
        if (authConfig.token) {
          headers['Authorization'] = `Bearer ${authConfig.token}`;
        }
        break;

      case 'hmac':
        if (authConfig.secret_key) {
          const timestamp = Date.now().toString();

          // In production, use Web Crypto API for HMAC
          const signature = `hmac-${timestamp}`; // Placeholder
          
          headers[authConfig.signature_header || 'X-Signature'] = signature;
          if (authConfig.include_timestamp) {
            headers['X-Timestamp'] = timestamp;
          }
          if (authConfig.include_nonce) {
            headers['X-Nonce'] = Math.random().toString(36).substring(7);
          }
        }
        break;

      case 'custom':
        if (authConfig.custom_headers) {
          Object.assign(headers, authConfig.custom_headers);
        }
        if (authConfig.custom_params) {
          Object.assign(params, authConfig.custom_params);
        }
        break;
    }

    return { headers, params };
  };

  const testConnection = async () => {
    setLoading(true);
    setTestResult(null);
    setError(null);
  
    try {
      const { headers, params } = buildAuthenticatedRequest();
  
      // Build URL with query params
      const url = new URL(config.url!);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
  
      // Use fetchProxy instead of direct fetch
      const result = await fetchViaProxy(url.toString(), {
        method: config.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: config.body && ['POST', 'PUT', 'PATCH'].includes(config.method || 'GET') 
          ? JSON.parse(config.body) // fetchViaProxy expects parsed body
          : undefined,
      });
  
      // The proxy returns a structured result
      if (result.status >= 400) {
        throw new Error(`HTTP error ${result.status}: ${result.statusText}`);
      }
  
      // Extract fields from the JSON response
      const extractedFields = extractJsonFields(result.data);
      
      // Store the extracted fields in config so they persist across steps
      setConfig(prev => ({
        ...prev,
        api_fields: extractedFields,  // Store extracted fields
        api_sample_data: result.data  // Store sample data
      }));
      
      setTestResult({
        success: true,
        status: result.status,
        data: result.data,
        fields: extractedFields,
        headers: (result as any).headers || {},
        metadata: (result as any).metadata // Proxy metadata
      });
  
      toaster.show({
        message: `API connection successful! Found ${extractedFields.length} fields.`,
        intent: Intent.SUCCESS,
        icon: 'tick',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test connection';
      
      // Check if it's likely a CORS error
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('CORS')) {
        setError('Connection failed - this might be a CORS issue. The proxy should handle this, but the target server may be unreachable.');
      } else {
        setError(errorMessage);
      }
      
      setTestResult({
        success: false,
        error: errorMessage,
      });
      
      // Clear any previously stored fields on error
      setConfig(prev => ({
        ...prev,
        api_fields: undefined,
        api_sample_data: undefined
      }));
  
      toaster.show({
        message: errorMessage,
        intent: Intent.DANGER,
        icon: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract JSON fields (same as before)
  const extractJsonFields = (data: any, prefix: string = ''): string[] => {
    const fields: string[] = [];
    
    if (data === null || data === undefined) {
      return fields;
    }
  
    // Handle arrays - analyze first item for structure
    if (Array.isArray(data)) {
      if (data.length > 0) {
        if (typeof data[0] === 'object' && data[0] !== null) {
          return extractJsonFields(data[0], prefix);
        } else {
          fields.push(prefix || '[]');
        }
      }
      return fields;
    }
  
    // Handle objects - recursively extract all paths
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
    } else {
      fields.push(prefix || 'value');
    }
  
    return [...new Set(fields)];
  };

  const renderAPIBasicConfigStep = () => {
    return (
      <div style={{ padding: '20px' }}>
        {/* API Name */}
        <FormGroup label="API Name" labelFor="name-input" labelInfo="(required)">
          <InputGroup
            id="name-input"
            value={config.name}
            onChange={(e) => handleConfigChange('name', e.target.value)}
            placeholder="My API Integration"
            intent={config.name.trim() === '' ? Intent.DANGER : Intent.NONE}
          />
        </FormGroup>
  
        {/* API Type Presets */}
        <FormGroup label="API Type" labelInfo="(optional - helps with configuration)">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {Object.entries(API_PRESETS).map(([key, preset]) => (
              <Card
                key={key}
                interactive
                onClick={() => handlePresetSelect(key)}
                style={{
                  padding: '15px',
                  border: selectedPreset === key ? '2px solid var(--primary-blue)' : '1px solid var(--border-gray)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon icon={preset.icon as any} size={20} />
                  <div>
                    <strong>{preset.name}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {preset.defaultAuth === 'none' ? 'No auth' : `${preset.defaultAuth} auth`}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </FormGroup>
  
        {/* Endpoint Configuration */}
        <FormGroup label="API Endpoint" labelFor="url-input" labelInfo="(required)">
          <InputGroup
            id="url-input"
            value={config.url || ''}
            onChange={(e) => handleConfigChange('url', e.target.value)}
            placeholder="https://api.example.com/v1/data"
            intent={!config.url || config.url.trim() === '' ? Intent.DANGER : Intent.NONE}
          />
        </FormGroup>
  
        <FormGroup label="HTTP Method">
          <HTMLSelect
            value={config.method || 'GET'}
            onChange={(e) => handleConfigChange('method', e.target.value)}
            fill
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </HTMLSelect>
        </FormGroup>
  
        {/* Show sample endpoints if preset selected */}
        {selectedPreset && API_PRESETS[selectedPreset].sampleEndpoints && (
          <Callout icon="info-sign" intent={Intent.PRIMARY} style={{ marginTop: '15px' }}>
            <strong>Sample Endpoints:</strong>
            {API_PRESETS[selectedPreset].sampleEndpoints!.map((endpoint, idx) => (
              <div key={idx} style={{ marginTop: '8px' }}>
                <strong>{endpoint.name}:</strong>
                <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>{endpoint.url}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{endpoint.description}</div>
              </div>
            ))}
          </Callout>
        )}
      </div>
    );
  };

  const renderAPISecurityStep = () => {
    const renderAuthFields = () => {
      const authType = config.auth_type || 'none';
      const authConfig = config.auth_config || {};

      switch (authType) {
        case 'none':
          return (
            <Callout icon="info-sign">
              No authentication required. The API is publicly accessible.
            </Callout>
          );

        case 'basic':
          return (
            <>
              <FormGroup label="Username" labelFor="username-input" labelInfo="(required)">
                <InputGroup
                  id="username-input"
                  value={authConfig.username || ''}
                  onChange={(e) => handleAuthConfigChange('username', e.target.value)}
                  placeholder="Enter username"
                />
              </FormGroup>
              <FormGroup label="Password" labelFor="password-input" labelInfo="(required)">
                <InputGroup
                  id="password-input"
                  type="password"
                  value={authConfig.password || ''}
                  onChange={(e) => handleAuthConfigChange('password', e.target.value)}
                  placeholder="Enter password"
                />
              </FormGroup>
            </>
          );

        case 'bearer':
          return (
            <FormGroup label="Bearer Token" labelFor="token-input" labelInfo="(required)">
              <TextArea
                id="token-input"
                value={authConfig.token || ''}
                onChange={(e) => handleAuthConfigChange('token', e.target.value)}
                placeholder="Enter your bearer token"
                rows={3}
                fill
              />
            </FormGroup>
          );

        case 'api_key_header':
          return (
            <>
              <FormGroup label="API Key" labelFor="api-key-input" labelInfo="(required)">
                <InputGroup
                  id="api-key-input"
                  value={authConfig.api_key || ''}
                  onChange={(e) => handleAuthConfigChange('api_key', e.target.value)}
                  placeholder="Enter your API key"
                />
              </FormGroup>
              <FormGroup label="Header Name" labelFor="header-name-input">
                <InputGroup
                  id="header-name-input"
                  value={authConfig.key_header_name || 'X-API-Key'}
                  onChange={(e) => handleAuthConfigChange('key_header_name', e.target.value)}
                  placeholder="X-API-Key"
                />
              </FormGroup>
            </>
          );

        case 'api_key_query':
          return (
            <>
              <FormGroup label="API Key" labelFor="api-key-input" labelInfo="(required)">
                <InputGroup
                  id="api-key-input"
                  value={authConfig.api_key || ''}
                  onChange={(e) => handleAuthConfigChange('api_key', e.target.value)}
                  placeholder="Enter your API key"
                />
              </FormGroup>
              <FormGroup label="Query Parameter Name" labelFor="param-name-input">
                <InputGroup
                  id="param-name-input"
                  value={authConfig.key_param_name || 'api_key'}
                  onChange={(e) => handleAuthConfigChange('key_param_name', e.target.value)}
                  placeholder="api_key"
                />
              </FormGroup>
            </>
          );

        case 'oauth2':
          return (
            <Tabs id="oauth-tabs">
              <Tab id="token" title="Access Token" panel={
                <div style={{ paddingTop: '10px' }}>
                  <FormGroup label="Access Token" labelFor="token-input" labelInfo="(required)">
                    <TextArea
                      id="token-input"
                      value={authConfig.token || ''}
                      onChange={(e) => handleAuthConfigChange('token', e.target.value)}
                      placeholder="Enter your OAuth2 access token"
                      rows={3}
                      fill
                    />
                  </FormGroup>
                  <FormGroup label="Refresh Token" labelFor="refresh-token-input" labelInfo="(optional)">
                    <TextArea
                      id="refresh-token-input"
                      value={authConfig.refresh_token || ''}
                      onChange={(e) => handleAuthConfigChange('refresh_token', e.target.value)}
                      placeholder="Enter refresh token for automatic renewal"
                      rows={2}
                      fill
                    />
                  </FormGroup>
                </div>
              } />
              <Tab id="credentials" title="Client Credentials" panel={
                <div style={{ paddingTop: '10px' }}>
                  <FormGroup label="Token Endpoint" labelFor="token-endpoint-input">
                    <InputGroup
                      id="token-endpoint-input"
                      value={authConfig.token_endpoint || ''}
                      onChange={(e) => handleAuthConfigChange('token_endpoint', e.target.value)}
                      placeholder="https://auth.example.com/oauth/token"
                    />
                  </FormGroup>
                  <FormGroup label="Client ID" labelFor="client-id-input">
                    <InputGroup
                      id="client-id-input"
                      value={authConfig.client_id || ''}
                      onChange={(e) => handleAuthConfigChange('client_id', e.target.value)}
                      placeholder="Your OAuth2 client ID"
                    />
                  </FormGroup>
                  <FormGroup label="Client Secret" labelFor="client-secret-input">
                    <InputGroup
                      id="client-secret-input"
                      type="password"
                      value={authConfig.client_secret || ''}
                      onChange={(e) => handleAuthConfigChange('client_secret', e.target.value)}
                      placeholder="Your OAuth2 client secret"
                    />
                  </FormGroup>
                </div>
              } />
            </Tabs>
          );

        case 'hmac':
          return (
            <>
              <FormGroup label="Secret Key" labelFor="secret-key-input" labelInfo="(required)">
                <InputGroup
                  id="secret-key-input"
                  type="password"
                  value={authConfig.secret_key || ''}
                  onChange={(e) => handleAuthConfigChange('secret_key', e.target.value)}
                  placeholder="Your HMAC secret key"
                />
              </FormGroup>
              <FormGroup label="Signature Header" labelFor="sig-header-input">
                <InputGroup
                  id="sig-header-input"
                  value={authConfig.signature_header || 'X-Signature'}
                  onChange={(e) => handleAuthConfigChange('signature_header', e.target.value)}
                  placeholder="X-Signature"
                />
              </FormGroup>
              <FormGroup label="Algorithm">
                <HTMLSelect
                  value={authConfig.signature_algorithm || 'sha256'}
                  onChange={(e) => handleAuthConfigChange('signature_algorithm', e.target.value)}
                  fill
                >
                  <option value="sha256">SHA-256</option>
                  <option value="sha512">SHA-512</option>
                </HTMLSelect>
              </FormGroup>
              <FormGroup>
                <Switch
                  checked={authConfig.include_timestamp || false}
                  onChange={(e) => handleAuthConfigChange('include_timestamp', e.currentTarget.checked)}
                  label="Include timestamp in signature"
                />
              </FormGroup>
              <FormGroup>
                <Switch
                  checked={authConfig.include_nonce || false}
                  onChange={(e) => handleAuthConfigChange('include_nonce', e.currentTarget.checked)}
                  label="Include nonce in signature"
                />
              </FormGroup>
            </>
          );

        case 'custom':
          return (
            <>
              <Callout icon="info-sign" intent={Intent.WARNING} style={{ marginBottom: '15px' }}>
                Custom authentication allows you to define your own headers and parameters.
              </Callout>
              
              <FormGroup label="Custom Headers" labelInfo="(JSON format)">
                <TextArea
                  value={JSON.stringify(authConfig.custom_headers || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const headers = JSON.parse(e.target.value);
                      handleAuthConfigChange('custom_headers', headers);
                    } catch (err) {
                      // Invalid JSON
                    }
                  }}
                  rows={4}
                  fill
                  placeholder='{"X-Custom-Auth": "your-value"}'
                />
              </FormGroup>

              <FormGroup label="Custom Query Parameters" labelInfo="(JSON format)">
                <TextArea
                  value={JSON.stringify(authConfig.custom_params || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const params = JSON.parse(e.target.value);
                      handleAuthConfigChange('custom_params', params);
                    } catch (err) {
                      // Invalid JSON
                    }
                  }}
                  rows={3}
                  fill
                  placeholder='{"auth": "your-token"}'
                />
              </FormGroup>
            </>
          );

        default:
          return null;
      }
    };

    return (
      <div style={{ padding: '20px' }}>
        <FormGroup label="Authentication Type" labelInfo="(required)">
          <HTMLSelect
            value={config.auth_type || 'none'}
            onChange={(e) => handleConfigChange('auth_type', e.target.value as AuthType)}
            fill
          >
            <option value="none">No Authentication</option>
            <option value="basic">Basic Authentication</option>
            <option value="bearer">Bearer Token</option>
            <option value="api_key_header">API Key (Header)</option>
            <option value="api_key_query">API Key (Query Parameter)</option>
            <option value="oauth2">OAuth 2.0</option>
            <option value="hmac">HMAC Signature</option>
            <option value="custom">Custom Authentication</option>
          </HTMLSelect>
        </FormGroup>

        <div style={{ marginTop: '20px' }}>
          {renderAuthFields()}
        </div>

      </div>
    );
  };

  const renderAPITestStep = () => {
    // Build preview of the request that will be sent
    const getRequestPreview = () => {
      const { headers, params } = buildAuthenticatedRequest();
      const url = new URL(config.url || 'https://api.example.com');
      
      // Add query params to URL
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
  
      return {
        url: url.toString(),
        method: config.method || 'GET',
        headers: headers,
        body: config.body
      };
    };
  
    return (
      <div style={{ padding: '20px' }}>
        <Callout icon="info-sign" intent={Intent.PRIMARY}>
          <strong>Ready to test your API connection</strong>
          <p>We'll use your configured endpoint and authentication to make a test request.</p>
        </Callout>
  
        {/* Request Preview */}
        <div style={{ marginTop: '20px' }}>
          <Button
            minimal
            icon={showRequestPreview ? "chevron-down" : "chevron-right"}
            text="Preview Request"
            onClick={() => setShowRequestPreview(!showRequestPreview)}
          />
          
          {showRequestPreview && (
            <Card style={{ marginTop: '10px', padding: '15px', backgroundColor: 'var(--bg-light-gray)' }}>
              <pre style={{ margin: 0, fontSize: '12px' }}>
                {JSON.stringify(getRequestPreview(), null, 2)}
              </pre>
            </Card>
          )}
        </div>
  
        {/* Advanced Options */}
        <div style={{ marginTop: '20px' }}>
          <Switch
            checked={showAdvanced}
            onChange={(e) => setShowAdvanced(e.currentTarget.checked)}
            label="Show advanced options"
          />
        </div>
  
        {showAdvanced && (
          <div style={{ marginTop: '15px' }}>
            {/* Additional Headers */}
            <FormGroup label="Additional Headers" labelInfo="(JSON format)">
              <TextArea
                value={JSON.stringify(config.headers || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value);
                    handleConfigChange('headers', headers);
                  } catch (err) {
                    // Invalid JSON, don't update
                  }
                }}
                rows={4}
                fill
              />
            </FormGroup>
  
            {/* Request Body */}
            {['POST', 'PUT', 'PATCH'].includes(config.method || 'GET') && (
              <FormGroup label="Request Body" labelInfo="(JSON format)">
                <TextArea
                  value={config.body || ''}
                  onChange={(e) => handleConfigChange('body', e.target.value)}
                  placeholder='{"key": "value"}'
                  rows={4}
                  fill
                />
              </FormGroup>
            )}
  
            {/* Timeout */}
            <FormGroup label="Timeout (seconds)">
              <InputGroup
                type="number"
                value={config.timeout?.toString() || '30'}
                onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                min={1}
                max={300}
              />
            </FormGroup>
          </div>
        )}
  
        {/* Test Connection Button */}
        <div style={{ marginTop: '30px' }}>
          <Button
            text="Test Connection"
            intent={Intent.PRIMARY}
            onClick={testConnection}
            loading={loading}
            disabled={!config.url}
            icon="exchange"
            large
          />
        </div>
  
        {/* Test Results */}
        {testResult && (
          <Callout
            style={{ marginTop: '15px' }}
            icon={testResult.success ? 'tick' : 'error'}
            intent={testResult.success ? Intent.SUCCESS : Intent.DANGER}
            title={testResult.success ? 'Connection Successful' : 'Connection Failed'}
          >
            {testResult.success ? (
              <div>
                <p>Status: {testResult.status}</p>
                {testResult.usedProxy && (
                  <Tag intent={Intent.WARNING} style={{ marginBottom: '10px' }}>
                    Used {testResult.proxyType} proxy
                  </Tag>
                )}
                <details>
                  <summary style={{ cursor: 'pointer' }}>Response Details</summary>
                  <div style={{ marginTop: '10px' }}>
                    <strong>Headers:</strong>
                    <pre style={{ fontSize: '11px', marginTop: '5px' }}>
                      {JSON.stringify(testResult.headers, null, 2)}
                    </pre>
                    <strong>Data Preview:</strong>
                    <TextArea
                      fill
                      readOnly
                      rows={8}
                      value={JSON.stringify(testResult.data, null, 2)}
                      style={{ marginTop: '5px' }}
                    />
                  </div>
                </details>
              </div>
            ) : (
              <div>
                <p>{testResult.error}</p>
                {testResult.cors_likely && (
                  <div style={{ marginTop: '10px' }}>
                    <Tag intent={Intent.WARNING}>Likely CORS issue</Tag>
                    <p style={{ marginTop: '10px' }}>
                      Enable the proxy option in advanced settings to bypass CORS restrictions during testing.
                    </p>
                    <Button
                      text="Enable Proxy and Retry"
                      intent={Intent.PRIMARY}
                      onClick={() => {
                        handleConfigChange('use_proxy', true);
                        handleConfigChange('proxy_service', 'edge_function');
                        setShowAdvanced(true);
                        // Retry test after short delay
                        setTimeout(() => testConnection, 100);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </Callout>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedOption(null);
      setCurrentStepId('choose');
      setConfig({
        name: '',
        type: null,
      });
      setTestResult(null);
      setError(null);
      fetchTemplates();
      fetchBuckets();
    }
  }, [isOpen]);

  useEffect(() => {
    
    if (currentStepId === 'mapping' && config.type === 'file') {
      
      // Force re-parse to ensure headers are correct
      if (config.file_config?.fileContent && config.file_config?.delimiter) {
        parseDelimitedFile(
          config.file_config.fileContent,
          config.file_config.delimiter
        );
      }
    }
  }, [currentStepId, config.type]);

  const loadTemplateFields = async (templateId: string) => {
    try {
      const { data: formData } = await supabase
        .from('template_forms')
        .select('schema')
        .eq('template_id', templateId)
        .maybeSingle();
  
      if (formData && formData.schema && formData.schema.components) {
        const fields = formData.schema.components
          .filter((comp: any) => comp.key && comp.input)
          .map((comp: any) => comp.key);
        setTemplateFields(fields);
        return;
      }
  
      const { data: tabfieldsData } = await supabase
        .from('tabfields')
        .select('name')
        .eq('template_id', templateId)
        .order('name');
  
      if (tabfieldsData) {
        const fields = tabfieldsData.map(field => field.name);
        setTemplateFields(fields);
      }
    } catch (err) {
      console.error('Error loading template fields:', err);
      setTemplateFields([]);
    }
  };

  useEffect(() => {
    if (config.template_mapping?.templateId) {
      loadTemplateFields(config.template_mapping.templateId);
    } else {
      setTemplateFields([]);
    }
  }, [config.template_mapping?.templateId]);

  // Bucket validation functions (keeping all existing logic)
  const checkBucketInUse = async (bucketId: string, currentIntegrationId?: string) => {
    // Build the query
    let query = supabase
      .from('data_sources')
      .select('id, name, sync_config')
      .eq('active', true);
    
    // Only add the neq clause if we have a current integration ID
    if (currentIntegrationId) {
      query = query.neq('id', currentIntegrationId);
    }
    
    const { data, error } = await query;
    
  
    if (error) {
      console.error('Error checking bucket usage:', error);
      return { inUse: false, usedBy: null };
    }
  
    for (const source of data || []) {
      try {
        const syncConfig = typeof source.sync_config === 'string' 
          ? JSON.parse(source.sync_config) 
          : source.sync_config;
        
        if (syncConfig?.enabled && syncConfig?.targetBucketId === bucketId) {
          return { inUse: true, usedBy: source.name };
        }
      } catch (err) {
        console.error('Error parsing sync config:', err);
      }
    }
  
    return { inUse: false, usedBy: null };
  };
  
  const getBucketsWithUsageStatus = async (currentIntegrationId?: string) => {
    const { data: buckets, error: bucketsError } = await supabase
      .from('content')
      .select('id, name')
      .eq('type', 'bucket')
      .order('name');
  
    if (bucketsError || !buckets) {
      return [];
    }
  
    const { data: dataSources, error: sourcesError } = await supabase
      .from('data_sources')
      .select('id, name, sync_config')
      .eq('active', true)
      .neq('id', currentIntegrationId || 'none');
  
    if (sourcesError || !dataSources) {
      return buckets.map(bucket => ({ ...bucket, inUse: false, usedBy: null }));
    }
  
    const bucketUsageMap = new Map<string, string>();
    
    for (const source of dataSources) {
      try {
        const syncConfig = typeof source.sync_config === 'string' 
          ? JSON.parse(source.sync_config) 
          : source.sync_config;
        
        if (syncConfig?.enabled && syncConfig?.targetBucketId) {
          bucketUsageMap.set(syncConfig.targetBucketId, source.name);
        }
      } catch (err) {
        console.error('Error parsing sync config:', err);
      }
    }
  
    return buckets.map(bucket => ({
      ...bucket,
      inUse: bucketUsageMap.has(bucket.id),
      usedBy: bucketUsageMap.get(bucket.id) || null
    }));
  };

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('templates')
      .select('*')
      .eq('type', 'template')
      .order('name');
    setTemplates(data || []);
  };

  const fetchBuckets = async () => {
    const bucketsData = await getBucketsWithUsageStatus();
    setBucketsWithStatus(bucketsData);
    setBuckets(bucketsData.filter(b => !b.inUse));
  };

  const handleOptionChange = (option: WizardOption) => {
    setSelectedOption(option);
    setConfig(prev => ({
      ...prev,
      type: option,
      file_config: option === 'file' ? {
        source: 'upload',
        hasHeaders: true,
        format: 'csv'
      } : undefined,
      database_config: option === 'database' ? {
        dbType: undefined,
        connections: {},
        queries: {},
        transformations: {},
        conditionalMappings: []
      } : undefined,
      sync_config: (option === 'file' || option === 'database') ? {
        enabled: false,
        interval: 60,
        intervalUnit: 'minutes',
        syncMode: 'replace' 
      } : undefined
    }));
  };

  const handleConfigChange = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileConfigChange = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      file_config: {
        ...prev.file_config,
        [field]: value,
        // If enabling filter and operator isn't set, default to '=='
        ...(field === 'filterEnabled' && value === true && !prev.file_config?.filterOperator ? {
          filterOperator: '=='
        } : {})
      } as any
    }));
  };

  const handleDatabaseConfigChange = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      database_config: {
        ...(prev.database_config || {}),
        [field]: value,
      },
    }));
  };

  const handleSyncConfigChange = (field: keyof SyncConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      sync_config: {
        ...prev.sync_config,
        [field]: value
      } as any
    }));
  };

  // Database-specific handlers
  const handleAddConnection = () => {
    const id = `conn_${Date.now()}`;
    setConfig(prev => ({
      ...prev,
      database_config: {
        ...prev.database_config!,
        connections: {
          ...(prev.database_config?.connections || {}),
          [id]: {
            id,
            name: 'New Connection',
            host: '',
            port: (DATABASE_TYPES as any)[prev.database_config?.dbType || 'mysql'].defaultPort,
            database: '',
            username: '',
            password: ''
          }
        }
      }
    }));
    setActiveConnectionId(id);
  };

  const handleConnectionChange = (connId: string, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      database_config: {
        ...prev.database_config!,
        connections: {
          ...prev.database_config!.connections,
          [connId]: {
            ...prev.database_config!.connections![connId],
            [field]: value
          }
        }
      }
    }));
  };

  const testDatabaseConnection = async (connectionId: string) => {
    setDbTestResults(prev => ({
      ...prev,
      [connectionId]: { testing: true }
    }));
    
    // Simulate connection test
    setTimeout(() => {
      setDbTestResults(prev => ({
        ...prev,
        [connectionId]: { 
          success: true, 
          message: 'Connection successful',
          tables: ['election_results', 'candidates', 'regions']
        }
      }));
      
      // Mock schema discovery
      setSchemaTree([{
        id: 'schema_main',
        label: config.database_config?.connections![connectionId].database,
        icon: 'folder-close',
        isExpanded: true,
        childNodes: [
          {
            id: 'tables',
            label: 'Tables',
            icon: 'th',
            isExpanded: true,
            childNodes: [
              {
                id: 'election_results',
                label: 'election_results',
                icon: 'th',
                secondaryLabel: <Tag minimal>15 columns</Tag>
              },
              {
                id: 'candidates',
                label: 'candidates',
                icon: 'th',
                secondaryLabel: <Tag minimal>8 columns</Tag>
              }
            ]
          }
        ]
      }]);
    }, 1500);
  };

  const handleServerFileSelect = async (path: string, content?: string, metadata?: any) => {
    
    // Update the configuration with the selected file
    handleFileConfigChange('path', path);
    handleFileConfigChange('fileName', path.split('/').pop() || 'file');
    
    if (content) {
      handleFileConfigChange('fileContent', content);
      
      // If we have metadata from the edge function, use it
      if (metadata) {
        if (metadata.delimiter) {
          handleFileConfigChange('delimiter', metadata.delimiter);
        }
        if (metadata.hasHeaders !== undefined) {
          handleFileConfigChange('hasHeaders', metadata.hasHeaders);
        }
        if (metadata.headers) {
          handleFileConfigChange('headers', metadata.headers);
        }
        if (metadata.extension) {
          const format = 
            metadata.extension === 'tsv' ? 'tsv' : 
            metadata.extension === 'csv' ? 'csv' :
            metadata.extension === 'json' ? 'json' : 'txt';
          handleFileConfigChange('format', format);
        }
      }
      
      // Parse the file if it's delimited
      if (metadata?.delimiter) {
        parseDelimitedFile(content, metadata.delimiter);
      }
      
      // Show success message
      toaster.show({
        message: `File loaded: ${path}`,
        intent: Intent.SUCCESS,
        icon: 'tick'
      });
    }
    
    // Close the browser
    setShowFileBrowser(false);
  };

  const loadServerDirectory = async (path: string) => {
    setBrowserLoading(true);
    setBrowserError(null);

    try {
      const response = await fetch(FILE_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', relativePath: path })
      });
      const data = await response.json();
      const error = data.error;
      
      if (error) throw error;
      
      if (data?.success) {
        setBrowserEntries(data.entries || []);
        setBrowserPath(path);
      } else {
        throw new Error(data?.error || 'Failed to load directory');
      }
    } catch (err: any) {
      setBrowserError(err?.message || 'Failed to load directory');
    } finally {
      setBrowserLoading(false);
    }
  };
 
  const loadServerFile = async () => {
    if (!config.file_config?.path) {
      toaster.show({
        message: 'Please enter a file path',
        intent: Intent.WARNING,
        icon: 'warning-sign'
      });
      return;
    }

    setLoadingServerFile(true);
    
    try {
      
      const response = await fetch(FILE_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', relativePath: config.file_config.path })
      });
      const data = await response.json();
      const error = data.error;
      
      if (error) {
        console.error('Error loading file:', error);
        throw error;
      }
      
      if (data.success) {
        handleFileConfigChange('fileContent', data.content);
        
        // Use metadata to set format options
        if (data.metadata) {
          if (data.metadata.delimiter) {
            handleFileConfigChange('delimiter', data.metadata.delimiter);
          }
          if (data.metadata.hasHeaders !== undefined) {
            handleFileConfigChange('hasHeaders', data.metadata.hasHeaders);
          }
          if (data.metadata.headers) {
            handleFileConfigChange('headers', data.metadata.headers);
          }
          if (data.metadata.extension) {
            const format = 
              data.metadata.extension === 'tsv' ? 'tsv' : 
              data.metadata.extension === 'csv' ? 'csv' :
              data.metadata.extension === 'json' ? 'json' : 'txt';
            handleFileConfigChange('format', format);
          }
        }
        
        // Parse the content
        if (data.metadata?.delimiter) {
          parseDelimitedFile(data.content, data.metadata.delimiter);
        }
        
        toaster.show({
          message: 'File loaded successfully',
          intent: Intent.SUCCESS,
          icon: 'tick'
        });
      } else {
        throw new Error(data.error || 'Failed to load file');
      }
    } catch (err) {
      console.error('Failed to load server file:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toaster.show({
        message: `Failed to load file: ${errorMessage}`,
        intent: Intent.DANGER,
        icon: 'error'
      });
    } finally {
      setLoadingServerFile(false);
    }
  };

  // All file handling functions (keeping existing logic)
  const handleFileUpload = async (event: React.FormEvent<HTMLInputElement>) => {
    const files = (event.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        
        handleFileConfigChange('fileName', file.name);
        handleFileConfigChange('fileContent', content);

        await detectFileFormat(content, file.name);
        
        setLoading(false);
      };
      reader.readAsText(file);
    } catch (err) {
      setError('Failed to read file');
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const detectFileFormat = async (content: string, fileName?: string) => {
    let detectedFormat: string = 'txt';
    
    if (fileName) {
      const ext = fileName.split('.').pop()?.toLowerCase();
      if (ext === 'csv') detectedFormat = 'csv';
      else if (ext === 'tsv' || ext === 'tab') detectedFormat = 'tsv';
      else if (ext === 'json') detectedFormat = 'json';
      else if (ext === 'txt') detectedFormat = 'txt';
    }

    if (detectedFormat === 'txt') {
      const lines = content.split('\n').slice(0, 5);
      const hasCommas = lines.some(line => line.includes(','));
      const hasTabs = lines.some(line => line.includes('\t'));
      
      if (hasTabs && !hasCommas) {
        detectedFormat = 'tsv';
      } else if (hasCommas) {
        detectedFormat = 'csv';
      }
    }

    handleFileConfigChange('format', detectedFormat);
    
    if (detectedFormat === 'csv' || detectedFormat === 'tsv') {
      parseDelimitedFile(content, detectedFormat === 'tsv' ? '\t' : ',');
    } else if (detectedFormat === 'json') {
      try {
        const jsonData = JSON.parse(content);
        const sample = Array.isArray(jsonData) ? jsonData.slice(0, 10) : [jsonData];
        handleFileConfigChange('sample', sample);
        handleFileConfigChange('headers', sample.length > 0 ? Object.keys(sample[0]) : []);
      } catch (err) {
        setError('Invalid JSON format');
      }
    }
  };

  const parseDelimitedFile = (content: string, delimiter: string = ',', headerRowNum?: number) => {
    
    // Use parameter if provided, otherwise use config
    const headerRowNumber = headerRowNum ?? config.file_config?.headerRowNumber ?? 1;
    
    let processedContent = content;
    
    // Skip lines before the header row
    if (headerRowNumber > 1) {
      const linesToSkip = headerRowNumber - 1;
      
      for (let i = 0; i < linesToSkip; i++) {
        const newlineIndex = processedContent.indexOf("\n");
        if (newlineIndex !== -1) {
          processedContent = processedContent.substring(newlineIndex + 1);
        }
      }
      
    }
    
    Papa.parse(processedContent, {
      delimiter,
      header: config.file_config?.hasHeaders ?? true,
      preview: 10,
      skipEmptyLines: true,
      complete: (results: any) => {

        let headers: string[] = [];
        
        if (config.file_config?.hasHeaders) {
          headers = results.meta.fields || [];
        } else {
          const firstRow = results.data[0];
          if (Array.isArray(firstRow)) {
            headers = firstRow.map((_, index) => `Column${index + 1}`);
          }
        }
        
        handleFileConfigChange('sample', results.data);
        handleFileConfigChange('headers', headers);
        handleFileConfigChange('delimiter', delimiter);
        
        if (config.file_config?.hasHeaders) {
          handleFileConfigChange('customHeaders', [...headers]);
        }
        
      },
      error: (err: any) => {
        console.error('Parse error:', err);
        setError(`Parse error: ${err.message}`);
      }
    });
  };

  const handleCustomHeaderChange = (index: number, value: string) => {
    const newHeaders = [...(config.file_config?.customHeaders || config.file_config?.headers || [])];
    newHeaders[index] = value;
    handleFileConfigChange('customHeaders', newHeaders);
  };

  const detectWithAI = async () => {
    if (!config.file_config?.fileContent || !config.file_config?.sample) return;

    setAiDetecting(true);
    try {
      toaster.show({
        message: 'Analyzing file structure with AI...',
        intent: Intent.PRIMARY,
        icon: 'predictive-analysis',
      });

      const suggestions = await analyzeColumnsWithClaude(
        config.file_config.sample,
        config.file_config.hasHeaders || false
      );

      if (suggestions.columnNames.length > 0) {
        handleFileConfigChange('customHeaders', suggestions.columnNames);
        
        toaster.show({
          message: `AI suggested column names with ${Math.round(suggestions.confidence * 100)}% confidence: ${suggestions.reasoning}`,
          intent: Intent.SUCCESS,
          icon: 'tick',
          timeout: 5000
        });
      }
    } catch (err) {
      console.error('AI detection error:', err);
      toaster.show({
        message: `AI detection failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        intent: Intent.DANGER,
        icon: 'error',
      });
    } finally {
      setAiDetecting(false);
    }
  };

  const handleAddMapping = () => {
    setConfig(prev => ({
      ...prev,
      template_mapping: {
        templateId: prev.template_mapping?.templateId || '',
        fieldMappings: [
          ...(prev.template_mapping?.fieldMappings || []),
          { templateField: '', sourceColumn: '' }
        ]
      }
    }));
  };

  const handleMappingChange = (index: number, field: 'templateField' | 'sourceColumn', value: string) => {
    setConfig(prev => ({
      ...prev,
      template_mapping: {
        ...prev.template_mapping!,
        fieldMappings: prev.template_mapping!.fieldMappings.map((mapping, i) => 
          i === index ? { ...mapping, [field]: value } : mapping
        )
      }
    }));
  };

  const testFileConnection = async () => {
    setLoading(true);
    setTestResult(null);
    setError(null);

    try {
      if (config.file_config?.source === 'url' && config.file_config.url) {
        const content = await fetchTextFile(config.file_config.url);
        
        handleFileConfigChange('fileContent', content);
        await detectFileFormat(content, config.file_config.url);
        
        setTestResult({
          success: true,
          message: 'File fetched successfully',
          rowCount: config.file_config.sample?.length || 0,
          metadata: {
            size: content.length,
            url: config.file_config.url,
            fetchedAt: new Date().toISOString()
          }
        });
      } else if (config.file_config?.fileContent) {
        setTestResult({
          success: true,
          message: 'File parsed successfully',
          rowCount: config.file_config.sample?.length || 0
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test file source');
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
  
    try {
      // Validate bucket usage if sync is enabled
      if (config.sync_config?.enabled && config.sync_config?.targetBucketId) {
        const { inUse, usedBy } = await checkBucketInUse(config.sync_config.targetBucketId);
        
        if (inUse) {
          setError(`Cannot save: The selected bucket is already being used by integration "${usedBy}".`);
          setLoading(false);
          return;
        }
      }
  
      // Transform queries if needed for storage
      const transformedQueries = config.database_config?.queries 
        ? Object.entries(config.database_config.queries).reduce((acc, [key, query]) => {
            const { id, ...queryWithoutId } = query;
            acc[key] = queryWithoutId;
            return acc;
          }, {} as any)
        : undefined;

      const cleanFileConfig = config.type === 'file' && config.file_config ? {
        source: config.file_config.source,
        url: config.file_config.url,
        path: config.file_config.path,
        fileName: config.file_config.fileName,
        format: config.file_config.format,
        delimiter: config.file_config.delimiter,
        hasHeaders: config.file_config.hasHeaders,
        headerRowNumber: config.file_config.headerRowNumber,
        encoding: config.file_config.encoding,
        headers: config.file_config.headers,
        customHeaders: config.file_config.customHeaders,
        totalRows: config.file_config.totalRows,
        
        // Chunking and filtering
        chunkMode: config.file_config.chunkMode,
        chunkSize: config.file_config.chunkSize,
        
        // NEW: Multi-filter support
        filterEnabled: config.file_config.filterEnabled,
        filters: config.file_config.filters,        
        filterLogic: config.file_config.filterLogic,
        
        // OLD: Single filter (keep for backward compatibility)
        filterField: config.file_config.filterField,
        filterOperator: config.file_config.filterOperator,
        filterValue: config.file_config.filterValue,
        
        // Explicitly exclude fileContent and sample
        // fileContent: undefined,  // Don't save - too large and becomes stale
        // sample: undefined,       // Don't save - just for UI preview
      } : null;
  
      // Prepare data for saving
      const dataSourceData = {
        name: config.name,
        type: config.type,
        active: true,
        
        // API config - everything in one place
        api_config: config.type === 'api' ? {
          url: config.url,
          method: config.method || 'GET',
          headers: config.headers || {},
          body: config.body,
          auth_type: config.auth_type || 'none',
          auth_config: config.auth_config || {},
          auth_required: config.auth_required || false,
          data_path: config.api_data_path,
          pagination_enabled: config.pagination_enabled || false,
          page_param: config.page_param || 'page',
          limit_param: config.limit_param || 'limit',
          page_size: config.page_size || 100,
          extracted_fields: config.api_fields,
          sample_response: config.api_sample_data
        } : null,
        
        // File config
        file_config: cleanFileConfig,

        // Database config
        database_config: config.type === 'database' && config.database_config ? {
          ...config.database_config,
          queries: transformedQueries
        } : null,
        
        sync_config: {
          enabled: config.sync_config?.enabled ?? false,
          interval: config.sync_config?.interval ?? 60,
          intervalUnit: config.sync_config?.intervalUnit ?? 'minutes',
          syncMode: config.sync_config?.syncMode ?? 'replace',
          targetBucketId: config.sync_config?.targetBucketId ?? null,
          // Include any additional fields that might exist
          ...(config.sync_config || {})
        },
        
        template_mapping: config.template_mapping || {
          templateId: '',
          fieldMappings: []
        }
      };
  
  
      // Insert the data source
      const { data, error: insertError } = await supabase
        .from('data_sources')
        .insert(dataSourceData)
        .select()
        .single();
  
      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Failed to save data source: ${insertError.message}`);
      }
  
  
      // Handle initial sync if enabled
      if (config.sync_config?.enabled && data) {
        // ... existing sync code ...
      }
  
      // Show success message
      toaster.show({
        message: 'Data source saved successfully!',
        intent: Intent.SUCCESS,
        icon: 'tick',
      });
  
      // Close the dialog
      onClose();
      
    } catch (err) {
      console.error('Save error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save data source';
      setError(errorMessage);
      
      toaster.show({
        message: errorMessage,
        intent: Intent.DANGER,
        icon: 'error',
        timeout: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (event?: React.SyntheticEvent<HTMLElement>) => {
    
    // Only close if it's a legitimate close action (not backdrop click)
    if (event?.type === 'mousedown' || event?.type === 'click') {
      const target = event.target as HTMLElement;
      // Check if click is on backdrop
      if (target.classList.contains('bp5-overlay-backdrop')) {
        return;
      }
    }
  
    onClose();
  };

  // All render methods for file steps (keeping existing implementation)
  const renderFileStep = () => {
    return (
      <div style={{ padding: '20px' }}>
        <FormGroup label="Name" labelFor="name-input" labelInfo="(required)">
          <InputGroup
            id="name-input"
            value={config.name}
            onChange={(e) => handleConfigChange('name', e.target.value)}
            placeholder="Enter a name for this data source"
            intent={config.name.trim() === '' ? Intent.DANGER : Intent.NONE}
          />
          {config.name.trim() === '' && (
            <div style={{ color: 'var(--text-danger, #d13913)', fontSize: '12px', marginTop: '4px' }}>
              Name is required
            </div>
          )}
        </FormGroup>

        <FormGroup label="File Source">
          <RadioGroup
            selectedValue={config.file_config?.source}
            onChange={(e) => handleFileConfigChange('source', (e.target as HTMLInputElement).value)}
          >
            <Radio value="upload" label="Upload File" />
            <Radio value="url" label="URL" />
            <Radio value="path" label="Server Path (requires backend service)" />
          </RadioGroup>
        </FormGroup>

        {config.file_config?.source === 'upload' && (
          <FormGroup>
            <FileInput
              text={config.file_config?.fileName || "Choose file..."}
              onInputChange={handleFileUpload}
              disabled={loading}
            />
          </FormGroup>
        )}

        {config.file_config?.source === 'url' && (
          <FormGroup label="File URL" labelFor="url-input" labelInfo="(required)">
            <InputGroup
              id="url-input"
              value={config.file_config?.url || ''}
              onChange={(e) => handleFileConfigChange('url', e.target.value)}
              placeholder="https://example.com/data.csv"
              intent={!config.file_config?.url ? Intent.DANGER : Intent.NONE}
            />
          </FormGroup>
        )}

        {config.file_config?.source === 'path' && (
          <>
            <FormGroup label="Server File Path" labelFor="path-input">
              <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                <InputGroup
                  id="path-input"
                  value={config.file_config?.path || ''}
                  onChange={(e) => handleFileConfigChange('path', e.target.value)}
                  placeholder="/data/files/import.csv"
                  style={{ flex: 1 }}
                />
                <Button
                  text={showFileBrowser ? "Hide Browser" : "Browse"}
                  icon={showFileBrowser ? "chevron-up" : "folder-open"}
                  onClick={() => {
                    setShowFileBrowser(!showFileBrowser);
                    if (!showFileBrowser && !browserEntries.length) {
                      loadServerDirectory('');
                    }
                  }}
                  intent={Intent.PRIMARY}
                />
                {config.file_config?.path && (
                  <Button
                    text="Load"
                    icon="cloud-download"
                    intent={Intent.SUCCESS}
                    onClick={loadServerFile}
                    loading={loadingServerFile}
                  />
                )}
              </div>
            </FormGroup>

            {/* Inline File Browser */}
            <Collapse isOpen={showFileBrowser}>
              <Card style={{ 
                marginTop: '10px',
                maxHeight: '400px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Breadcrumbs */}
                <div style={{ 
                  padding: '10px',
                  borderBottom: '1px solid var(--border-gray)',
                  backgroundColor: 'var(--bg-light-gray)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <Button
                    minimal
                    small
                    onClick={() => loadServerDirectory('')}
                    intent={browserPath === '' ? Intent.PRIMARY : Intent.NONE}
                  >
                    Root
                  </Button>
                  {browserPath && browserPath.split('/').map((segment, index, arr) => (
                    <React.Fragment key={index}>
                      <Icon icon="chevron-right" size={12} />
                      <Button
                        minimal
                        small
                        onClick={() => {
                          const newPath = arr.slice(0, index + 1).join('/');
                          loadServerDirectory(newPath);
                        }}
                        intent={index === arr.length - 1 ? Intent.PRIMARY : Intent.NONE}
                      >
                        {segment}
                      </Button>
                    </React.Fragment>
                  ))}
                </div>

                {/* File List */}
                <div style={{ 
                  flex: 1,
                  overflowY: 'auto',
                  padding: '10px'
                }}>
                  {browserLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <Spinner size={30} />
                      <p>Loading directory...</p>
                    </div>
                  ) : browserError ? (
                    <Callout intent={Intent.DANGER}>
                      {browserError}
                    </Callout>
                  ) : browserEntries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      No files found in this directory
                    </div>
                  ) : (
                    <div>
                      {browserEntries.map((entry) => (
                        <div
                          key={entry.path}
                          style={{
                            padding: '8px',
                            cursor: 'pointer',
                            borderRadius: '3px',
                            marginBottom: '4px',
                            backgroundColor: selectedBrowserFile?.path === entry.path ? 'var(--primary-blue-bg)' : 'transparent'
                          } as any}
                          onClick={() => {
                            if (entry.type === 'directory') {
                              loadServerDirectory(entry.path);
                            } else {
                              setSelectedBrowserFile(entry);
                              handleFileConfigChange('path', entry.path);
                            }
                          }}
                          onDoubleClick={() => {
                            if (entry.type === 'file') {
                              handleFileConfigChange('path', entry.path);
                              loadServerFile();
                              setShowFileBrowser(false);
                            }
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icon 
                              icon={entry.type === 'directory' ? 'folder-close' : 'document'} 
                              color={entry.type === 'directory' ? 'var(--icon-warning)' : 'var(--primary-blue)'}
                            />
                            <span>{entry.name}</span>
                            {entry.extension && (
                              <Tag minimal intent={Intent.PRIMARY}>
                                .{entry.extension}
                              </Tag>
                            )}
                            {entry.size !== undefined && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.9em', marginLeft: 'auto' }}>
                                {formatFileSize(entry.size)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ 
                  padding: '10px',
                  borderTop: '1px solid var(--border-gray)',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <Button 
                    small 
                    onClick={() => setShowFileBrowser(false)}
                  >
                    Close
                  </Button>
                  <Button 
                    small
                    intent={Intent.PRIMARY}
                    disabled={!selectedBrowserFile || selectedBrowserFile.type !== 'file'}
                    onClick={() => {
                      if (selectedBrowserFile) {
                        handleFileConfigChange('path', selectedBrowserFile.path);
                        loadServerFile();
                        setShowFileBrowser(false);
                      }
                    }}
                  >
                    Select & Load
                  </Button>
                </div>
              </Card>
            </Collapse>
          </>
        )}

        {config.file_config?.fileContent && (
          <>
            <FormGroup label="File Format">
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <HTMLSelect
                  value={config.file_config?.format || 'csv'}
                  onChange={(e) => handleFileConfigChange('format', e.target.value)}
                >
                  <option value="csv">CSV</option>
                  <option value="tsv">TSV</option>
                  <option value="txt">Plain Text</option>
                  <option value="json">JSON</option>
                </HTMLSelect>
                <Button
                  text="Detect with AI"
                  icon="predictive-analysis"
                  onClick={detectWithAI}
                  loading={aiDetecting}
                  small
                />
              </div>
            </FormGroup>

            {(config.file_config?.format === 'csv' || config.file_config?.format === 'tsv') && (
              <>
                <FormGroup>
                  <Switch
                    checked={config.file_config?.hasHeaders || false}
                    onChange={(e) => handleFileConfigChange('hasHeaders', e.target.checked)}
                    label="File contains headers"
                  />
                </FormGroup>

                {/* Header Row Number Input */}
                {config.file_config?.hasHeaders && (
                  <FormGroup 
                    label="Header Row Number" 
                    helperText="Which row number contains the column headers? (1 = first row)"
                  >
                    <NumericInput
                      value={config.file_config?.headerRowNumber || 1}
                      min={1}
                      max={100}
                      stepSize={1}
                      minorStepSize={1}
                      onValueChange={(value) => {
                        handleFileConfigChange('headerRowNumber', value);
                        
                        // Re-parse if we have content, passing the new value directly
                        if (config.file_config?.fileContent) {
                          parseDelimitedFile(
                            config.file_config.fileContent,
                            config.file_config?.delimiter || ',',
                            value  // Pass the new value directly to avoid stale state
                          );
                        }
                      }}
                      fill
                      leftIcon="numerical"
                    />
                  </FormGroup>
                )}

                {/* Filter Configuration */}
                <Card style={{ marginTop: '15px', padding: '15px', backgroundColor: 'var(--bg-white)' }}>
                  <h5 style={{ marginTop: 0 }}>Filter Rows (Optional)</h5>
                  
                  <FormGroup>
                    <Switch
                      checked={config.file_config?.filterEnabled || false}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        handleFileConfigChange('filterEnabled', enabled);
                        // Initialize with one empty filter if enabling
                        if (enabled && (!config.file_config?.filters || config.file_config.filters.length === 0)) {
                          handleFileConfigChange('filters', [{ field: '', operator: '==', value: '' }]);
                          handleFileConfigChange('filterLogic', 'AND');
                        }
                      }}
                      label="Only include rows that match conditions"
                    />
                  </FormGroup>

                  {config.file_config?.filterEnabled && (
                    <>
                      {/* Filter Logic Selector (only show if multiple filters) */}
                      {config.file_config?.filters && config.file_config.filters.length > 1 && (
                        <FormGroup label="Match Logic" style={{ marginTop: '10px' }}>
                          <HTMLSelect
                            value={config.file_config?.filterLogic || 'AND'}
                            onChange={(e) => handleFileConfigChange('filterLogic', e.target.value)}
                            fill
                          >
                            <option value="AND">All conditions must match (AND)</option>
                            <option value="OR">Any condition can match (OR)</option>
                          </HTMLSelect>
                        </FormGroup>
                      )}

                      {/* Filter Conditions */}
                      {(config.file_config?.filters || []).map((filter, index) => (
                        <Card 
                          key={index} 
                          style={{ 
                            marginTop: '10px', 
                            padding: '12px', 
                            backgroundColor: 'var(--bg-light-gray)',
                            border: '1px solid var(--border-gray)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <strong>Condition {index + 1}</strong>
                            {config.file_config?.filters && config.file_config.filters.length > 1 && (
                              <Button
                                icon="trash"
                                minimal
                                small
                                intent={Intent.DANGER}
                                onClick={() => {
                                  const newFilters = [...(config.file_config?.filters || [])];
                                  newFilters.splice(index, 1);
                                  handleFileConfigChange('filters', newFilters);
                                }}
                              />
                            )}
                          </div>

                          <FormGroup label="Column to Filter">
                            <HTMLSelect
                              value={filter.field || ''}
                              onChange={(e) => {
                                const newFilters = [...(config.file_config?.filters || [])];
                                newFilters[index] = { ...newFilters[index], field: e.target.value };
                                handleFileConfigChange('filters', newFilters);
                              }}
                              fill
                            >
                              <option value="">Select column...</option>
                              {(config.file_config?.customHeaders || config.file_config?.headers || []).map(col => (
                                <option key={col} value={col}>{col}</option>
                              ))}
                            </HTMLSelect>
                          </FormGroup>

                          <FormGroup label="Operator">
                            <HTMLSelect
                              value={filter.operator || '=='}
                              onChange={(e) => {
                                const newFilters = [...(config.file_config?.filters || [])];
                                newFilters[index] = { ...newFilters[index], operator: e.target.value as any };
                                handleFileConfigChange('filters', newFilters);
                              }}
                              fill
                            >
                              <option value="==">Equals (==)</option>
                              <option value="!=">Not Equals (!=)</option>
                              <option value="contains">Contains</option>
                              <option value="startsWith">Starts With</option>
                              <option value="endsWith">Ends With</option>
                              <option value="in">In List</option>
                              <option value="notIn">Not In List</option>
                            </HTMLSelect>
                          </FormGroup>

                          <FormGroup 
                            label={filter.operator === 'in' || filter.operator === 'notIn' 
                              ? "Values (comma-separated)" 
                              : "Value to Match"}
                            helperText={filter.operator === 'in' || filter.operator === 'notIn'
                              ? "Separate values with commas (e.g., Newark, Bronx, JFK)"
                              : undefined}
                          >
                            <InputGroup
                              value={filter.value || ''}
                              onChange={(e) => {
                                const newFilters = [...(config.file_config?.filters || [])];
                                newFilters[index] = { ...newFilters[index], value: e.target.value };
                                handleFileConfigChange('filters', newFilters);
                              }}
                              placeholder={filter.operator === 'in' || filter.operator === 'notIn'
                                ? "e.g., New York, Boston, Chicago"
                                : 'e.g., "Current"'}
                            />
                          </FormGroup>

                          {/* Preview matched values for IN/NOT IN */}
                          {(filter.operator === 'in' || filter.operator === 'notIn') && filter.value && (
                            <div style={{ marginTop: '8px' }}>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                {filter.value.split(',').length} value(s):
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {filter.value.split(',').map((v, i) => (
                                  <Tag key={i} minimal>{v.trim()}</Tag>
                                ))}
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}

                      {/* Add Filter Button */}
                      <Button
                        icon="add"
                        text="Add Filter Condition"
                        onClick={() => {
                          const newFilters = [
                            ...(config.file_config?.filters || []),
                            { field: '', operator: '==', value: '' }
                          ];
                          handleFileConfigChange('filters', newFilters);
                        }}
                        style={{ marginTop: '10px' }}
                        small
                      />

                      {/* Live Preview of Filtered Data */}
                      {config.file_config?.filters && 
                      config.file_config.filters.length > 0 && 
                      config.file_config.filters.every(f => f.field && f.value) && (
                        <Callout intent={Intent.SUCCESS} style={{ marginTop: '10px' }}>
                          <strong>Preview filtered rows:</strong>
                          {(() => {
                            const filtered = (config.file_config?.sample || []).filter(row => {
                              const results = (config.file_config?.filters || []).map(filter => {
                                const value = String(row[filter.field] || '').trim();
                                const compareValue = String(filter.value).trim();
                                
                                switch (filter.operator) {
                                  case '==': 
                                    return value === compareValue;
                                  case '!=': 
                                    return value !== compareValue;
                                  case 'contains': 
                                    return value.toLowerCase().includes(compareValue.toLowerCase());
                                  case 'startsWith': 
                                    return value.toLowerCase().startsWith(compareValue.toLowerCase());
                                  case 'endsWith': 
                                    return value.toLowerCase().endsWith(compareValue.toLowerCase());
                                  case 'in': {
                                    const values = compareValue.split(',').map(v => v.trim().toLowerCase());
                                    return values.includes(value.toLowerCase());
                                  }
                                  case 'notIn': {
                                    const values = compareValue.split(',').map(v => v.trim().toLowerCase());
                                    return !values.includes(value.toLowerCase());
                                  }
                                  default: 
                                    return true;
                                }
                              });


                              // Apply filter logic
                              if (config.file_config?.filterLogic === 'OR') {
                                return results.some(r => r);
                              } else {
                                return results.every(r => r);
                              }
                            });
                            
                            return filtered.length > 0 ? (
                              <div style={{ marginTop: '8px' }}>
                                {filtered.length} rows match (showing first 3):
                                <ul style={{ marginTop: '5px', marginBottom: 0 }}>
                                  {filtered.slice(0, 3).map((row, i) => (
                                    <li key={i}>
                                      {Object.entries(row).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <div style={{ marginTop: '8px', color: 'var(--text-danger, #d13913)' }}>
                                No rows match these filters
                              </div>
                            );
                          })()}
                        </Callout>
                      )}
                    </>
                  )}
                </Card>

                <Callout intent={Intent.PRIMARY} style={{ marginTop: '15px' }}>
                  <strong>How it works:</strong>
                  <ol style={{ marginBottom: 0, paddingLeft: '20px', marginTop: '8px' }}>
                    {config.file_config?.filterEnabled && config.file_config?.filters && config.file_config.filters.length > 0 && (
                      <li>
                        Filter rows that match {config.file_config.filters.length > 1 
                          ? `${config.file_config.filterLogic === 'OR' ? 'ANY' : 'ALL'} of these ${config.file_config.filters.length} conditions`
                          : 'this condition'}:
                        <ul style={{ marginTop: '4px', marginBottom: '4px' }}>
                          {config.file_config.filters.map((f, i) => (
                            <li key={i}>
                              <strong>{f.field || 'column'}</strong>{' '}
                              {f.operator === 'in' ? 'IN' : f.operator === 'notIn' ? 'NOT IN' : f.operator}{' '}
                              {f.operator === 'in' || f.operator === 'notIn' 
                                ? `(${f.value ? f.value.split(',').length : 0} values)` 
                                : `"${f.value || 'value'}"`}
                            </li>
                          ))}
                        </ul>
                      </li>
                    )}
                    <li>Group {config.file_config?.filterEnabled ? 'filtered ' : ''}rows into chunks of {config.file_config?.chunkSize || 3}</li>
                    <li>Create one item per chunk</li>
                    <li>In the next step, map specific rows to template fields</li>
                  </ol>
                  
                  {config.file_config?.filters && config.file_config.filters.some(f => f.operator === 'in' || f.operator === 'notIn') && (
                    <div style={{ marginTop: '10px', padding: '8px', backgroundColor: 'var(--primary-blue-bg)', borderRadius: '4px' }}>
                      <strong>Tip:</strong> For IN/NOT IN operators, separate multiple values with commas. 
                      Example: <code>Newark, Bronx, JFK</code>
                    </div>
                  )}
                </Callout>

                {/* Chunk Mode Configuration */}
                {(config.file_config?.format === 'csv' || config.file_config?.format === 'tsv') && 
                config.file_config?.sample && config.file_config.sample.length > 0 && (
                  <>
                    <Card style={{ marginTop: '20px', padding: '15px', backgroundColor: 'var(--bg-light-gray)' }}>
                      <h4 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon icon="group-objects" />
                        Row Grouping
                      </h4>
                      
                      <FormGroup>
                        <Switch
                          checked={config.file_config?.chunkMode || false}
                          onChange={(e) => {
                            handleFileConfigChange('chunkMode', e.target.checked);
                            if (e.target.checked && !config.file_config?.chunkSize) {
                              handleFileConfigChange('chunkSize', 3);
                            }
                          }}
                          label="Group multiple rows into single items"
                        />
                      </FormGroup>

                      {config.file_config?.chunkMode && (
                        <>
                          <FormGroup 
                            label="Rows per Item" 
                            helperText="How many rows should be combined into each item?"
                          >
                            <NumericInput
                              value={config.file_config?.chunkSize || 3}
                              min={1}
                              max={20}
                              onValueChange={(value) => handleFileConfigChange('chunkSize', value)}
                              fill
                              leftIcon="numbered-list"
                            />
                          </FormGroup>
                        </>
                      )}
                    </Card>
                    <Callout intent={Intent.PRIMARY} style={{ marginTop: '15px' }}>
                      <strong>How it works:</strong>
                      <ol style={{ marginBottom: 0, paddingLeft: '20px', marginTop: '8px' }}>
                        <li>Group consecutive rows into chunks of {config.file_config?.chunkSize || 3}</li>
                        <li>Create one item per chunk</li>
                        <li>In the next step, map specific rows within each chunk to template fields</li>
                        <li>Use the "Row in Chunk" field to specify which row (1, 2, 3, etc.) each field should read from</li>
                      </ol>
                      
                      <div style={{ marginTop: '10px', padding: '8px', backgroundColor: 'var(--bg-white)', borderRadius: '4px' }}>
                        <strong>Example:</strong> With chunk size {config.file_config?.chunkSize || 3}, if you have 9 rows, 
                        you'll create 3 items. Rows 1-3 become Item 1, rows 4-6 become Item 2, rows 7-9 become Item 3. 
                        You can then map different fields to different row positions within each chunk.
                      </div>
                    </Callout>
                  </>
                )}

                {!config.file_config?.hasHeaders && config.file_config?.headers && (
                  <FormGroup label="Define Column Names">
                    <Callout intent={Intent.PRIMARY} style={{ marginBottom: '10px' }}>
                      No header row detected. Please provide names for each column:
                    </Callout>
                    <div style={{ marginBottom: '10px' }}>
                      <Button
                        text="Reset to Default"
                        icon="reset"
                        small
                        onClick={() => {
                          const defaultHeaders = config.file_config?.headers?.map((_, index) => `Column${index + 1}`) || [];
                          handleFileConfigChange('customHeaders', defaultHeaders);
                        }}
                      />
                      <Button
                        text="Use Letters (A, B, C...)"
                        icon="font"
                        small
                        style={{ marginLeft: '10px' }}
                        onClick={() => {
                          const letterHeaders = config.file_config?.headers?.map((_, index) => {
                            let columnName = '';
                            let num = index;
                            while (num >= 0) {
                              columnName = String.fromCharCode(65 + (num % 26)) + columnName;
                              num = Math.floor(num / 26) - 1;
                            }
                            return columnName;
                          }) || [];
                          handleFileConfigChange('customHeaders', letterHeaders);
                        }}
                      />
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {config.file_config.headers.map((header, index) => (
                        <div key={index} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Tag minimal>{`Col ${index + 1}`}</Tag>
                          <InputGroup
                            value={config.file_config?.customHeaders?.[index] || header}
                            onChange={(e) => handleCustomHeaderChange(index, e.target.value)}
                            placeholder={`Name for column ${index + 1}`}
                            style={{ flex: 1 }}
                            intent={
                              !config.file_config?.customHeaders?.[index] || 
                              config.file_config.customHeaders[index].trim() === '' 
                                ? Intent.DANGER 
                                : Intent.NONE
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </FormGroup>
                )}
              </>
            )}

            <FormGroup label="Preview">
              <Card elevation={Elevation.ONE} style={{ maxHeight: '200px', overflow: 'auto' }}>
                {config.file_config?.sample && (
                  <table className="bp5-html-table bp5-html-table-condensed" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        {(config.file_config?.customHeaders || config.file_config?.headers)?.map((header, i) => (
                          <th key={i}>{header || `Column ${i + 1}`}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {config.file_config.sample.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          {Array.isArray(row) ? 
                            row.map((cell, j) => <td key={j}>{cell}</td>) :
                            Object.values(row).map((cell: any, j) => <td key={j}>{cell}</td>)
                          }
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </FormGroup>
          </>
        )}

        <FormGroup>
          <Button
            text="Test File Source"
            intent="primary"
            onClick={testFileConnection}
            loading={loading}
            disabled={!config.file_config?.url && !config.file_config?.fileContent}
          />
        </FormGroup>

        {testResult && (
          <Callout
            icon={testResult.success ? 'tick' : 'error'}
            intent={testResult.success ? Intent.SUCCESS : Intent.DANGER}
            title={testResult.success ? 'File Loaded Successfully' : 'Failed to Load File'}
          >
            {testResult.success ? (
              <>
                <p>File loaded and parsed successfully!</p>
                <p><strong>Total rows:</strong> {config.file_config?.totalRows || testResult.rowCount || 0}</p>
                <p><strong>Preview rows:</strong> {config.file_config?.sample?.length || 0}</p>
                {testResult.metadata && (
                  <p><strong>File size:</strong> {(testResult.metadata.size / 1024).toFixed(2)} KB</p>
                )}
              </>
            ) : (
              <p>{testResult.error}</p>
            )}
          </Callout>
        )}
      </div>
    );
  };

  // Database-specific render methods
  const renderDatabaseStep = () => {
    return (
      <div style={{ padding: '20px' }}>
        <FormGroup label="Name" labelFor="name-input" labelInfo="(required)">
          <InputGroup
            id="name-input"
            value={config.name}
            onChange={(e) => handleConfigChange('name', e.target.value)}
            placeholder="Enter a name for this database integration"
            intent={config.name.trim() === '' ? Intent.DANGER : Intent.NONE}
          />
          {config.name.trim() === '' && (
            <div style={{ color: 'var(--text-danger, #d13913)', fontSize: '12px', marginTop: '4px' }}>
              Name is required
            </div>
          )}
        </FormGroup>

        <FormGroup label="Database Type" labelInfo="(required)">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {Object.entries(DATABASE_TYPES).map(([key, db]) => (
              <Card
                key={key}
                interactive
                onClick={() => handleDatabaseConfigChange('dbType', key)}
                style={{
                  padding: '15px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: config.database_config?.dbType === key ? '2px solid var(--primary-blue)' : '1px solid var(--border-gray)'
                }}
              >
                <Icon icon={db.icon as any} size={24} />
                <div style={{ marginTop: '8px', fontSize: '14px' }}>{db.name}</div>
              </Card>
            ))}
          </div>
          {!config.database_config?.dbType && (
            <div style={{ color: 'var(--text-danger, #d13913)', fontSize: '12px', marginTop: '4px' }}>
              Please select a database type
            </div>
          )}
        </FormGroup>

        <Callout icon="info-sign" intent={Intent.PRIMARY} style={{ marginTop: '20px' }}>
          Next, you'll configure database connections and build queries visually.
        </Callout>
      </div>
    );
  };

  const renderDatabaseConnectionStep = () => {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>Database Connections</h3>
          <Button icon="add" text="Add Connection" onClick={handleAddConnection} />
        </div>

        {Object.values(config.database_config?.connections || {}).map(conn => (
          <Card key={conn.id} style={{ marginBottom: '15px', padding: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <FormGroup label="Connection Name" style={{ margin: 0, flex: 1, marginRight: '10px' }}>
                <InputGroup
                  value={conn.name}
                  onChange={(e) => handleConnectionChange(conn.id, 'name', e.target.value)}
                  placeholder="e.g., Production Database"
                />
              </FormGroup>
              <Button
                icon="cross"
                intent={Intent.DANGER}
                minimal
                onClick={() => {
                  const newConns = { ...config.database_config!.connections };
                  delete newConns[conn.id];
                  handleDatabaseConfigChange('connections', newConns);
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <FormGroup label="Host">
                <InputGroup
                  value={conn.host}
                  onChange={(e) => handleConnectionChange(conn.id, 'host', e.target.value)}
                  placeholder="localhost"
                />
              </FormGroup>
              <FormGroup label="Port">
                <InputGroup
                  type="number"
                  value={conn.port?.toString()}
                  onChange={(e) => handleConnectionChange(conn.id, 'port', parseInt(e.target.value))}
                  placeholder={(DATABASE_TYPES as any)[config.database_config?.dbType || 'mysql'].defaultPort.toString()}
                />
              </FormGroup>
              <FormGroup label="Database">
                <InputGroup
                  value={conn.database}
                  onChange={(e) => handleConnectionChange(conn.id, 'database', e.target.value)}
                  placeholder="database_name"
                />
              </FormGroup>
              <FormGroup label="Username">
                <InputGroup
                  value={conn.username}
                  onChange={(e) => handleConnectionChange(conn.id, 'username', e.target.value)}
                  placeholder="db_user"
                />
              </FormGroup>
              <FormGroup label="Password" style={{ gridColumn: 'span 2' }}>
                <InputGroup
                  type="password"
                  value={conn.password}
                  onChange={(e) => handleConnectionChange(conn.id, 'password', e.target.value)}
                  placeholder="••••••••"
                />
              </FormGroup>
            </div>

            {config.database_config?.dbType === 'postgresql' && (
              <FormGroup label="Schema (optional)">
                <InputGroup
                  value={conn.schema || ''}
                  onChange={(e) => handleConnectionChange(conn.id, 'schema', e.target.value)}
                  placeholder="public"
                />
              </FormGroup>
            )}

            <div style={{ marginTop: '10px' }}>
              <Button
                icon="database"
                text="Test Connection"
                intent={dbTestResults[conn.id]?.success ? Intent.SUCCESS : Intent.PRIMARY}
                loading={dbTestResults[conn.id]?.testing}
                onClick={() => testDatabaseConnection(conn.id)}
              />
              {dbTestResults[conn.id]?.success && (
                <Tag intent={Intent.SUCCESS} style={{ marginLeft: '10px' }}>
                  Connected
                </Tag>
              )}
            </div>
          </Card>
        ))}

        {Object.keys(config.database_config?.connections || {}).length === 0 && (
          <Callout intent={Intent.PRIMARY}>
            Add at least one database connection to continue.
          </Callout>
        )}
      </div>
    );
  };

  const renderDatabaseQueryStep = () => {
    return (
      <div style={{ padding: '20px' }}>
        <DatabaseQueryStep
          connections={config.database_config?.connections || {}}
          queries={config.database_config?.queries || {}}
          templates={templates}
          onQueriesChange={(newQueries) => {
            handleDatabaseConfigChange('queries', newQueries);
          }}
          onTestQuery={testDatabaseQueryFromWizard}
        />
      </div>
    );
  };

  const testDatabaseQueryFromWizard = async (queryId: string) => {
    const query = config.database_config?.queries?.[queryId];
    if (!query) throw new Error('Query not found');
  
    if (query.mode === 'simple') {
      const connection = config.database_config?.connections?.[query.connectionId];
      if (!connection) throw new Error('Connection not found');
  
      const { data, error } = await supabase.functions.invoke('test-database-query', {
        body: {
          mode: 'simple',
          connection,
          sql: query.sql,
          type: config.database_config?.dbType || 'mysql'
        }
      });
  
      if (error) throw error;
      return data;
      
    } else {
      // Parent-child query
      const parentConn = config.database_config?.connections?.[query.parentQuery.connectionId];
      const childConn = config.database_config?.connections?.[query.childQuery.connectionId];
  
      const { data, error } = await supabase.functions.invoke('test-database-query', {
        body: {
          mode: 'parent-child',
          parentConnection: parentConn,
          childConnection: childConn,
          parentQuery: query.parentQuery,
          childQuery: query.childQuery,
          type: config.database_config?.dbType || 'mysql'
        }
      });
  
      if (error) throw error;
      return data;
    }
  };

  const renderMappingStep = () => {
    // Function to get source columns based on data type
    const getSourceColumns = (): string[] => {
      switch (config.type) {
        case 'api':
          // Use stored fields from config instead of testResult
          if (config.api_fields && config.api_fields.length > 0) {
            return config.api_fields;
          }
          // Fallback: try to extract from testResult if available
          if (testResult?.success && testResult?.data) {
            const fields = extractJsonFields(testResult.data);
            // Update config with these fields
            setConfig(prev => ({
              ...prev,
              api_fields: fields,
              api_sample_data: testResult.data
            }));
            return fields;
          }
          return [];
          
        case 'file':
          
          // For file sources, use headers
          if (config.file_config?.headers) {
            return config.file_config.headers.map((header, i) => 
              config.file_config?.customHeaders?.[i] || header || `Column ${i + 1}`
            );
          }
          return [];
          
        case 'database':
          // For database, get columns from test results
          const queries = Object.values(config.database_config?.queries || {});
          if (queries.length > 0) {
            // For simple queries, get columns from test results
            const simpleQueries = queries.filter(q => q.mode === 'simple');
            if (simpleQueries.length > 0 && dbTestResults) {
              const firstQueryId = simpleQueries[0].id;
              const testResult = dbTestResults[`query_${firstQueryId}`];
              if (testResult?.success && testResult?.columns) {
                return testResult.columns;
              }
            }
          }
          return [];
          
        case 'rss':
          // For RSS feeds, return standard RSS fields
          return ['title', 'description', 'link', 'pubDate', 'author', 'category', 'guid'];
          
        default:
          return [];
      }
    };
  
    // Auto-detect field mappings based on name similarity
    const autoDetectMappings = (sourceColumns: string[], templateFields: string[]) => {
      const calculateSimilarity = (str1: string, str2: string): number => {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 100;
        
        // Simple character matching
        let matches = 0;
        for (let i = 0; i < shorter.length; i++) {
          if (longer.includes(shorter[i])) matches++;
        }
        
        return (matches / longer.length) * 100;
      };
  
      const newMappings: Array<{ templateField: string; sourceColumn: string }> = [];
      
      templateFields.forEach(templateField => {
        // Clean template field name for comparison
        const cleanTemplate = templateField.toLowerCase().replace(/[_-]/g, '');
        
        // Find best matching source column
        let bestMatch: string | null = null;
        let bestScore = 0;
        
        sourceColumns.forEach(sourceColumn => {
          // Extract just the field name from nested paths
          const fieldName = sourceColumn.split('.').pop() || sourceColumn;
          const cleanSource = fieldName.toLowerCase().replace(/[_-]/g, '').replace(/\[\d+\]/g, '');
          
          // Calculate similarity score
          let score = 0;
          if (cleanSource === cleanTemplate) {
            score = 100; // Perfect match
          } else if (cleanSource.includes(cleanTemplate) || cleanTemplate.includes(cleanSource)) {
            score = 80; // Partial match
          } else {
            // Simple similarity matching
            score = calculateSimilarity(cleanTemplate, cleanSource);
          }
          
          if (score > bestScore && score > 50) { // Threshold of 50%
            bestScore = score;
            bestMatch = sourceColumn;
          }
        });
        
        if (bestMatch) {
          newMappings.push({
            templateField,
            sourceColumn: bestMatch
          });
        }
      });
      
      // Update config with auto-detected mappings
      setConfig(prev => ({
        ...prev,
        template_mapping: {
          ...prev.template_mapping!,
          fieldMappings: newMappings
        }
      }));
      
      toaster.show({
        message: `Auto-detected ${newMappings.length} field mappings`,
        intent: Intent.SUCCESS,
        icon: 'tick'
      });
    };
  
    const sourceColumns = getSourceColumns();
    const hasTestResults = (() => {
      switch (config.type) {
        case 'api':
          return testResult?.success && testResult?.data;
        case 'file':
          return config.file_config?.sample && config.file_config.sample.length > 0;
        case 'database':
          const queries = Object.values(config.database_config?.queries || {});
          return queries.length > 0 && Object.keys(dbTestResults).some(key => dbTestResults[key]?.success);
        default:
          return false;
      }
    })();
  
    // Check if we have parent-child queries (database only)
    const isDatabase = config.type === 'database';
    const hasParentChildQueries = isDatabase && Object.values(config.database_config?.queries || {})
      .some(q => q.mode === 'parent-child');
    const hasSimpleQueries = isDatabase && Object.values(config.database_config?.queries || {})
      .some(q => q.mode === 'simple');
  
    // Early return for parent-child only databases
    if (isDatabase && hasParentChildQueries && !hasSimpleQueries) {
      return (
        <div style={{ padding: '20px' }}>
          <Callout icon="info-sign" intent={Intent.PRIMARY}>
            <strong>Parent-child queries use custom mapping</strong>
            <p>
              Your parent-child queries have been configured with their own field mappings in the previous step.
              No additional template mapping is needed.
            </p>
          </Callout>
  
          {/* Show summary of configured mappings */}
          <Card style={{ padding: '15px', marginTop: '20px' }}>
            <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Query Mapping Summary</h4>
            {Object.values(config.database_config?.queries || {})
              .filter(q => q.mode === 'parent-child')
              .map((query: any) => (
                <div key={query.id} style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid var(--border-gray)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <Icon icon="git-branch" />
                    <strong>{query.name}</strong>
                  </div>
                  <div style={{ marginLeft: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <div>
                      Template Mode: <Tag minimal>{query.templateSelection?.mode || 'Not configured'}</Tag>
                    </div>
                    {query.templateSelection?.mode === 'static' && query.templateSelection?.templateId && (
                      <div>Template: {templates.find(t => t.id === query.templateSelection.templateId)?.name || 'Unknown'}</div>
                    )}
                    {query.templateSelection?.mode === 'dynamic' && (
                      <div>Pattern: <code>{query.templateSelection?.templatePattern}</code></div>
                    )}
                    <div>
                      Static Fields: {Object.keys(query.fieldMappings?.staticFields || {}).length} | 
                      Indexed Fields: {Object.keys(query.fieldMappings?.indexedFields || {}).length}
                    </div>
                  </div>
                </div>
              ))}
          </Card>
  
          {/* Sync configuration */}
          <Divider style={{ margin: '30px 0' }} />
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Sync Configuration</h3>
          {/* ... sync configuration UI ... */}
        </div>
      );
    }
  
    // Main render for other sources and simple queries
    return (
      <div style={{ padding: '20px' }}>
        {/* Mixed database queries info */}
        {isDatabase && hasParentChildQueries && hasSimpleQueries && (
          <>
            <Callout icon="info-sign" intent={Intent.PRIMARY} style={{ marginBottom: '20px' }}>
              <strong>Mixed Query Types</strong>
              <p>
                Your parent-child queries are already mapped.
                {hasSimpleQueries && ' Simple queries will use the template mapping below.'}
              </p>
            </Callout>
  
            {/* Show parent-child summary */}
            <Card style={{ padding: '15px', marginBottom: '20px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Query Mapping Summary</h4>
              {Object.values(config.database_config?.queries || {})
                .filter(q => q.mode === 'parent-child')
                .map((query: any) => (
                  <div key={query.id} style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid var(--border-gray)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <Icon icon="git-branch" />
                      <strong>{query.name}</strong>
                    </div>
                    <div style={{ marginLeft: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <div>
                        Template Mode: <Tag minimal>{query.templateSelection?.mode || 'Not configured'}</Tag>
                      </div>
                      <div>
                        Static Fields: {Object.keys(query.fieldMappings?.staticFields || {}).length} | 
                        Indexed Fields: {Object.keys(query.fieldMappings?.indexedFields || {}).length}
                      </div>
                    </div>
                  </div>
                ))}
            </Card>
  
            <Divider style={{ marginBottom: '20px' }} />
          </>
        )}
  
        {/* Template Mapping Section */}
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>
          {isDatabase && hasParentChildQueries ? 'Simple Query Mapping' : 'Template Mapping'}
        </h3>
  
        {/* Show warning if no test has been run */}
        {!hasTestResults && (
          <Callout intent={Intent.WARNING} icon="warning-sign" style={{ marginBottom: '20px' }}>
            Please test your {config.type} connection first to see available fields for mapping.
          </Callout>
        )}
  
        {/* Show response preview for API sources */}
        {config.type === 'api' && testResult?.success && testResult?.data && (
          <Card style={{ marginBottom: '20px', padding: '15px' }}>
            <h4 style={{ marginTop: 0, marginBottom: '10px' }}>API Response Preview</h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <pre style={{ fontSize: '12px', margin: 0 }}>
                {JSON.stringify(testResult.data, null, 2).substring(0, 1000)}
                {JSON.stringify(testResult.data, null, 2).length > 1000 && '...'}
              </pre>
            </div>
            <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Found {sourceColumns.length} fields in the response
            </div>
          </Card>
        )}
  
        {/* Target Template Selection */}
        <FormGroup label="Target Template" labelInfo={config.sync_config?.enabled ? "(required)" : "(optional)"}>
          <HTMLSelect
            value={config.template_mapping?.templateId || ''}
            onChange={(e) => setConfig(prev => ({
              ...prev,
              template_mapping: {
                ...(prev.template_mapping || { fieldMappings: [] }),
                templateId: e.target.value
              }
            }))}
            fill
          >
            <option value="">Select a template...</option>
            {templates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </HTMLSelect>
          {config.sync_config?.enabled && !config.template_mapping?.templateId && (
            <div style={{ color: 'var(--text-danger, #d13913)', fontSize: '12px', marginTop: '4px' }}>
              Template selection is required when sync is enabled
            </div>
          )}
        </FormGroup>
  
        {/* Field Mappings */}
        {config.template_mapping?.templateId && (
          <>
            <FormGroup label="Field Mappings">
              <div style={{ marginBottom: '10px' }}>
                <Button
                  text="Add Mapping"
                  icon="add"
                  onClick={handleAddMapping}
                  small
                  disabled={!hasTestResults}
                />
                {sourceColumns.length === 0 && hasTestResults && (
                  <Tag intent={Intent.WARNING} style={{ marginLeft: '10px' }}>
                    No fields found in response
                  </Tag>
                )}
                {config.template_mapping.fieldMappings.length === 0 && config.sync_config?.enabled && (
                  <Tag intent={Intent.WARNING} style={{ marginLeft: '10px' }}>
                    At least one mapping required for sync
                  </Tag>
                )}
              </div>
              
              {config.template_mapping.fieldMappings.map((mapping, index) => (
                <Card key={index} style={{ 
                  marginBottom: '15px', 
                  padding: '15px'
                }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                    {config.file_config?.chunkMode && (
                      <FormGroup label="Row in Chunk" style={{ width: '100px' }}>
                        <NumericInput
                          value={mapping.rowIndex ?? 0}
                          min={0}
                          max={(config.file_config?.chunkSize || 1) - 1}
                          onValueChange={(value) => {
                            const newMappings = [...config.template_mapping!.fieldMappings];
                            newMappings[index] = { ...newMappings[index], rowIndex: value };
                            setConfig(prev => ({
                              ...prev,
                              template_mapping: {
                                ...prev.template_mapping!,
                                fieldMappings: newMappings
                              }
                            }));
                          }}
                          leftIcon="array-numeric"
                          buttonPosition="none"
                        />
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          0 = 1st row, 1 = 2nd row, etc.
                        </div>
                      </FormGroup>
                    )}

                    {/* Template Field */}
                    <FormGroup label="Template Field" style={{ flex: 1 }}>
                      <HTMLSelect
                        value={mapping.templateField}
                        onChange={(e) => handleMappingChange(index, 'templateField', e.target.value)}
                        fill
                      >
                        <option value="">Select template field...</option>
                        {templateFields.map((field) => (
                          <option key={field} value={field}>
                            {field}
                          </option>
                        ))}
                      </HTMLSelect>
                    </FormGroup>

                    {/* Row Index (in chunk mode) */}
                    {config.sync_config?.chunkMode && (
                      <FormGroup label="Row in Chunk" style={{ width: '100px' }}>
                        <NumericInput
                          value={mapping.rowIndex ?? 0}
                          min={0}
                          max={(config.sync_config?.chunkSize || 1) - 1}
                          onValueChange={(value) => {
                            const newMappings = [...config.template_mapping!.fieldMappings];
                            newMappings[index] = { ...newMappings[index], rowIndex: value };
                            setConfig(prev => ({
                              ...prev,
                              template_mapping: {
                                ...prev.template_mapping!,
                                fieldMappings: newMappings
                              }
                            }));
                          }}
                          buttonPosition="none"
                        />
                      </FormGroup>
                    )}

                    <Button
                      icon="delete"
                      intent={Intent.DANGER}
                      minimal
                      onClick={() => {
                        setConfig(prev => ({
                          ...prev,
                          template_mapping: {
                            ...prev.template_mapping!,
                            fieldMappings: prev.template_mapping!.fieldMappings.filter((_, i) => i !== index)
                          }
                        }));
                      }}
                    />
                  </div>

                  {/* Combined Fields Section */}
                  <div style={{ marginTop: '15px' }}>
                    <FormGroup label="Source Fields to Combine">
                      <Callout intent={Intent.PRIMARY} style={{ marginBottom: '10px' }}>
                        Select multiple fields to combine (e.g., LocationName + Temp = "Atlantic City 50")
                      </Callout>
                      
                      {/* Multi-select for fields */}
                      <div style={{ marginBottom: '10px' }}>
                        {sourceColumns.map(col => {
                          const isSelected = mapping.combinedFields?.fields?.includes(col);
                          return (
                            <Tag
                              key={col}
                              interactive
                              intent={isSelected ? Intent.PRIMARY : Intent.NONE}
                              onClick={() => {
                                const newMappings = [...config.template_mapping!.fieldMappings];
                                const currentFields = mapping.combinedFields?.fields || [];
                                
                                if (isSelected) {
                                  // Remove field
                                  newMappings[index] = {
                                    ...newMappings[index],
                                    combinedFields: {
                                      ...newMappings[index].combinedFields!,
                                      fields: currentFields.filter(f => f !== col)
                                    }
                                  };
                                } else {
                                  // Add field
                                  newMappings[index] = {
                                    ...newMappings[index],
                                    combinedFields: {
                                      fields: [...currentFields, col],
                                      template: mapping.combinedFields?.template || currentFields.map((_, i) => `{${i}}`).join(' ') + ` {${currentFields.length}}`
                                    }
                                  };
                                }
                                
                                setConfig(prev => ({
                                  ...prev,
                                  template_mapping: {
                                    ...prev.template_mapping!,
                                    fieldMappings: newMappings
                                  }
                                }));
                              }}
                              style={{ marginRight: '5px', marginBottom: '5px', cursor: 'pointer' }}
                            >
                              {col} {isSelected && <Icon icon="tick" size={12} />}
                            </Tag>
                          );
                        })}
                      </div>

                      {/* Template for combining */}
                      {mapping.combinedFields?.fields && mapping.combinedFields.fields.length > 0 && (
                        <FormGroup 
                          label="Combination Template" 
                          helperText={`Use {0}, {1}, etc. for field positions. Selected: ${mapping.combinedFields.fields.join(', ')}`}
                        >
                          <InputGroup
                            value={mapping.combinedFields.template || ''}
                            onChange={(e) => {
                              const newMappings = [...config.template_mapping!.fieldMappings];
                              newMappings[index] = {
                                ...newMappings[index],
                                combinedFields: {
                                  ...newMappings[index].combinedFields!,
                                  template: e.target.value
                                }
                              };
                              setConfig(prev => ({
                                ...prev,
                                template_mapping: {
                                  ...prev.template_mapping!,
                                  fieldMappings: newMappings
                                }
                              }));
                            }}
                            placeholder="e.g., {0} {1}° or {0} - {1}"
                          />
                          
                          {/* Preview */}
                          {config.file_config?.sample?.[mapping.rowIndex ?? 0] && (
                            <Callout intent={Intent.SUCCESS} style={{ marginTop: '10px' }}>
                              <strong>Preview:</strong> {
                                (() => {
                                  const row = config.file_config.sample[mapping.rowIndex ?? 0];
                                  let preview = mapping.combinedFields.template;
                                  mapping.combinedFields.fields.forEach((field, idx) => {
                                    preview = preview.replace(`{${idx}}`, row[field] || '');
                                  });
                                  return preview;
                                })()
                              }
                            </Callout>
                          )}
                        </FormGroup>
                      )}
                    </FormGroup>
                  </div>
                </Card>
              ))}

              {config.file_config?.chunkMode && (
                <Callout intent={Intent.PRIMARY} style={{ marginTop: '15px' }}>
                  <strong>Chunk Mode Active:</strong> Each item will contain data from {config.file_config.chunkSize} rows.
                  Use the "Row in Chunk" field to specify which row each field should read from.
                  <div style={{ marginTop: '8px' }}>
                    <strong>Example:</strong> If chunk size is 3, you can map:
                    <ul style={{ marginBottom: 0, marginTop: '4px' }}>
                      <li>Row 0 (1st row) → CITY01 fields</li>
                      <li>Row 1 (2nd row) → CITY02 fields</li>
                      <li>Row 2 (3rd row) → CITY03 fields</li>
                    </ul>
                  </div>
                </Callout>
              )}

              {/* Preview in chunk mode */}
              {config.sync_config?.chunkMode && config.file_config?.sample && (
                <Callout intent={Intent.PRIMARY} style={{ marginTop: '20px' }}>
                  <strong>Preview of first chunk:</strong>
                  <table className="bp5-html-table bp5-html-table-condensed" style={{ width: '100%', marginTop: '10px' }}>
                    <thead>
                      <tr>
                        <th>Row</th>
                        {sourceColumns.map(col => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {config.file_config.sample.slice(0, config.sync_config.chunkSize || 3).map((row, i) => (
                        <tr key={i}>
                          <td><Tag>{i}</Tag></td>
                          {sourceColumns.map(col => (
                            <td key={col}>{row[col]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Callout>
              )}
              
              {config.template_mapping.fieldMappings.length === 0 && (
                <Callout intent={Intent.PRIMARY} style={{ marginTop: '10px' }}>
                  Add field mappings to connect your {config.type === 'file' ? 'file' : config.type === 'api' ? 'API' : 'query'} columns to template fields.
                </Callout>
              )}
            </FormGroup>
  
            {/* Auto-detect mappings button */}
            {sourceColumns.length > 0 && templateFields.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <Button
                  text="Auto-detect Mappings"
                  icon="predictive-analysis"
                  onClick={() => autoDetectMappings(sourceColumns, templateFields)}
                  intent={Intent.PRIMARY}
                  outlined
                  loading={aiDetecting}
                />
                <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Uses AI to suggest field mappings based on name similarity
                </span>
              </div>
            )}
          </>
        )}
  
        {/* Sync Configuration */}
        <Divider style={{ margin: '30px 0' }} />
        
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Sync Configuration</h3>
        
        <FormGroup>
          <Switch
            checked={config.sync_config?.enabled || false}
            onChange={(e) => handleSyncConfigChange('enabled', e.currentTarget.checked)}
            label="Enable automatic sync"
          />
        </FormGroup>
  
        {config.sync_config?.enabled && (
          <>
            <FormGroup label="Target Bucket" labelInfo="(required)">
              <HTMLSelect
                value={config.sync_config?.targetBucketId || ''}
                onChange={(e) => handleSyncConfigChange('targetBucketId', e.target.value)}
                fill
              >
                <option value="">Select a bucket...</option>
                {bucketsWithStatus.map(bucket => (
                  <option 
                    key={bucket.id} 
                    value={bucket.id}
                    disabled={bucket.inUse}
                  >
                    {bucket.name} {bucket.inUse ? `(In use by "${bucket.usedBy}")` : ''}
                  </option>
                ))}
              </HTMLSelect>
              {!config.sync_config?.targetBucketId && (
                <div style={{ color: 'var(--text-danger, #d13913)', fontSize: '12px', marginTop: '4px' }}>
                  Target bucket is required when sync is enabled
                </div>
              )}
              {bucketError && (
                <div style={{ color: 'var(--text-danger, #d13913)', fontSize: '12px', marginTop: '4px' }}>
                  {bucketError}
                </div>
              )}
            </FormGroup>
  
            <FormGroup label="Sync Mode">
              <RadioGroup
                onChange={(e) => handleSyncConfigChange('syncMode', e.currentTarget.value)}
                selectedValue={config.sync_config?.syncMode || 'replace'}
              >
                <Radio value="replace" label="Replace - Delete existing items and create new ones" />
                <Radio value="update" label="Update - Update existing items, add new ones" />
              </RadioGroup>
            </FormGroup>
  
            <FormGroup label="Sync Interval">
              <div style={{ display: 'flex', gap: '10px' }}>
                <InputGroup
                  type="number"
                  value={(config.sync_config?.interval || 60).toString()}
                  onChange={(e) => handleSyncConfigChange('interval', parseInt(e.target.value))}
                  min={1}
                  style={{ width: '100px' }}
                />
                <HTMLSelect
                  value={config.sync_config?.intervalUnit || 'minutes'}
                  onChange={(e) => handleSyncConfigChange('intervalUnit', e.target.value)}
                >
                  <option value="seconds">Seconds</option> 
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </HTMLSelect>
              </div>
            </FormGroup>
  
            <Callout icon="info-sign" intent={Intent.PRIMARY} style={{ marginTop: '20px' }}>
              <p>
                <strong>How sync works:</strong>
              </p>
              {config.type === 'file' && (
                <p>
                  The file will be fetched and processed every {config.sync_config.interval} {config.sync_config.intervalUnit}.
                  Each row will be converted into an item using the field mappings above.
                </p>
              )}
              {config.type === 'api' && (
                <p>
                  The API will be called every {config.sync_config.interval} {config.sync_config.intervalUnit}.
                  The response will be processed according to your field mappings.
                </p>
              )}
              {config.type === 'database' && (
                <>
                  <p>
                    Your database queries will be executed every {config.sync_config.interval} {config.sync_config.intervalUnit}.
                  </p>
                  {hasParentChildQueries && (
                    <p>
                      Parent-child relationships will be processed according to your query configurations.
                      Each parent record will fetch its related children, respecting the defined limits.
                    </p>
                  )}
                </>
              )}
              
              {config.sync_config?.targetBucketId && (
                <p>
                  <strong>Target:</strong> Items will be synced to bucket "{bucketsWithStatus.find(b => b.id === config.sync_config?.targetBucketId)?.name || 'Unknown'}".
                </p>
              )}
            </Callout>
          </>
        )}

        <ServerFileBrowser
          isOpen={showFileBrowser}
          onClose={() => {
            setShowFileBrowser(false);
          }} 
          onSelectFile={handleServerFileSelect}
          initialPath={
            config.file_config?.path 
              ? config.file_config.path.split('/').slice(0, -1).join('/') 
              : ''
          }
        />
      </div>
    );
  };

  const getSteps = () => {
    const baseSteps = [
      {
        id: 'choose',
        title: 'Choose Type',
        panel: (
          <div style={{ padding: '20px' }}>
            <FormGroup label="Choose a data source type" labelInfo="(required)">
              <RadioGroup
                selectedValue={selectedOption as any}
                onChange={(e) => handleOptionChange(e.currentTarget.value as WizardOption)}
              >
                <Radio value="api" label="REST API" />
                <Radio value="rss" label="RSS Feed" />
                <Radio value="database" label="Database" />
                <Radio value="file" label="File" />
              </RadioGroup>
              {!selectedOption && (
                <div style={{ color: 'var(--text-danger, #d13913)', fontSize: '12px', marginTop: '8px' }}>
                  Please select a data source type
                </div>
              )}
            </FormGroup>
          </div>
        )
      }
    ];

    if (selectedOption === 'file') {
      return [
        ...baseSteps,
        {
          id: 'configure',
          title: 'Configure File',
          panel: renderFileStep()
        },
        {
          id: 'mapping',
          title: 'Map Fields',
          panel: renderMappingStep()
        }
      ];
    } else if (selectedOption === 'database') {
      return [
        ...baseSteps,
        {
          id: 'configure',
          title: 'Configure Database',
          panel: renderDatabaseStep()
        },
        {
          id: 'db-connection',
          title: 'Connections',
          panel: renderDatabaseConnectionStep()
        },
        {
          id: 'db-query',
          title: 'Queries',
          panel: renderDatabaseQueryStep()
        },
        {
          id: 'mapping',
          title: 'Mapping & Sync',
          panel: renderMappingStep()
        }
      ];
    } else if (selectedOption === 'api') {
      return [
        ...baseSteps,
        {
          id: 'configure',
          title: 'Configure API',
          panel: renderAPIBasicConfigStep()
        },
        {
          id: 'security',
          title: 'Security',
          panel: renderAPISecurityStep()
        },
        {
          id: 'test',
          title: 'Test Connection',
          panel: renderAPITestStep()
        },
        {
          id: 'mapping',
          title: 'Map Fields',
          panel: renderMappingStep()
        }
      ];
    } else {
      return [
        ...baseSteps,
        {
          id: 'configure',
          title: 'Configure',
          panel: (
            <div style={{ padding: '20px' }}>
              <Callout intent={Intent.PRIMARY}>
                Configuration for {selectedOption} will be added in a future update.
              </Callout>
            </div>
          )
        }
      ];
    }
  };

  return (
    <MultistepDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Data Wizard"
      icon="database"
      navigationPosition="top"
      canOutsideClickClose={false}
      canEscapeKeyClose={false}
      style={{ 
        width: '90vw',     // 90% of viewport width
        maxWidth: '1400px', // Max width for larger screens
        minWidth: '800px'   // Min width for smaller screens
      }}
      backdropProps={{
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
      finalButtonProps={{
        text: 'Save',
        intent: 'primary',
        disabled: !isCurrentStepValid() || loading,
        loading: loading,
        onClick: handleSave,
      }}
      nextButtonProps={{
        disabled: !isCurrentStepValid()
      }}
      onChange={(newStepId: string) => {
        setCurrentStepId(newStepId);
      }}
    >
      {getSteps().map(step => (
        <DialogStep
          key={step.id}
          id={step.id}
          title={step.title}
          panel={step.panel}
        />
      ))}
    </MultistepDialog>
  );
};

export default DataWizard;
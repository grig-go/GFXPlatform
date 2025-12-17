import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Tab,
  Tabs,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  Alert,
  AlertTitle,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Paper
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import UpdateIcon from '@mui/icons-material/Update';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import DatabaseIcon from '@mui/icons-material/DataObject';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SyncIcon from '@mui/icons-material/Sync';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckIcon from '@mui/icons-material/Check';

import { analyzeColumnsWithClaude } from '../utils/claudeAI';
import { supabase } from '../lib/supabase';
import { useFetchProxy } from '../hooks/useFetchProxy';
import {
  APIConfig,
  Integration,
  buildAuthenticatedRequest,
  extractJsonFields,
  FileConfig,
  DatabaseConfig,
  SyncConfig,
  TemplateMapping
} from '../types/api';

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

interface IntegrationEditDialogProps {
  open: boolean;
  onClose: () => void;
  integration: Integration | null;
  onSave: (updates: Partial<Integration>) => Promise<void>;
}

const TabPanel = ({ children, value, index, ...other }: any) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

export const IntegrationEditDialog: React.FC<IntegrationEditDialogProps> = ({
  open,
  onClose,
  integration,
  onSave
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [fileConfig, setFileConfig] = useState<FileConfig>({} as FileConfig);
  const [databaseConfig, setDatabaseConfig] = useState<DatabaseConfig>({} as DatabaseConfig);
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
    enabled: true,
    interval: 60,
    intervalUnit: 'minutes',
    syncMode: 'replace'
  });
  const [templateMapping, setTemplateMapping] = useState<TemplateMapping>({} as TemplateMapping);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateFields, setTemplateFields] = useState<string[]>([]);
  const [bucketsWithStatus, setBucketsWithStatus] = useState<any[]>([]);
  const [bucketError, setBucketError] = useState<string | null>(null);
  const [connectionTestResults, setConnectionTestResults] = useState<Record<string, any>>({});
  const [apiConfig, setApiConfig] = useState<APIConfig>({
    method: 'GET',
    auth_type: 'none',
    auth_config: {}
  });
  const [testResult, setTestResult] = useState<any>(null);

  const { fetchViaProxy } = useFetchProxy();

  useEffect(() => {
    if (integration && open) {
      setName(integration.name || '');
      setActive(integration.active ?? true);
      
      // Parse configuration from database
      try {
        const config = integration as any;
        
        // Parse file_config if it's a string
        const fileConfigData = typeof config.file_config === 'string' 
          ? JSON.parse(config.file_config) 
          : config.file_config || {};
        
        setFileConfig({
          ...fileConfigData,
          filterOperator: fileConfigData.filterOperator || '=='
        });
        
        
        // Parse database_config if it's a string
        const databaseConfigData = typeof config.database_config === 'string'
          ? JSON.parse(config.database_config)
          : config.database_config || {};
        
        // Ensure queries maintain their column metadata
        if (databaseConfigData.queries) {
          Object.keys(databaseConfigData.queries).forEach(queryId => {
            const query = databaseConfigData.queries[queryId];
            if (query.columnMetadata) {
              // Column metadata is preserved
              console.log(`Query ${queryId} has cached columns:`, query.columnMetadata);
            }
          });
        }
        
        setDatabaseConfig(databaseConfigData);
        
        // Parse sync_config if it's a string
        const syncConfigData = typeof config.sync_config === 'string'
          ? JSON.parse(config.sync_config)
          : config.sync_config || {};
        setSyncConfig({
          enabled: syncConfigData.enabled ?? false,  // Default to enabled
          interval: syncConfigData.interval || 60,  // Default 60
          intervalUnit: syncConfigData.intervalUnit || 'minutes',  // Default minutes
          syncMode: syncConfigData.syncMode || 'replace',  // Default replace
          targetBucketId: syncConfigData.targetBucketId || '',
          ...syncConfigData  // Override with any existing values
        });
        
        // Parse template_mapping if it's a string
        const templateMappingData = typeof config.template_mapping === 'string'
          ? JSON.parse(config.template_mapping)
          : config.template_mapping || {};
        setTemplateMapping(templateMappingData);
        
        // Parse api_config if it's a string (FIXED)
        if (integration.type === 'api') {
          // Handle string parsing first
          const apiConfigData = typeof config.api_config === 'string'
            ? JSON.parse(config.api_config)
            : config.api_config;
            
          if (apiConfigData) {
            // If we have api_config, use it
            setApiConfig(apiConfigData);
          } else {
            // Otherwise, migrate from old format
            const migratedConfig: APIConfig = {
              endpoint: config.url,
              method: config.method || 'GET',
              headers: config.headers,
              body: config.body,
              timeout: config.timeout,
              auth_type: config.auth_type || (config.auth_required ? 'basic' : 'none'),
              auth_config: config.auth_config || {},
              // Preserve any extracted fields if they exist
              extracted_fields: config.api_fields,
              sample_response: config.api_sample_data
            };
            setApiConfig(migratedConfig);
          }
        }
        
      } catch (err) {
        console.error('Error parsing integration config:', err);
        setError('Failed to load integration configuration');
      }
      
      // Reset tab to first tab when opening
      setTabValue(0);
    }
  }, [integration, open]);

  // Update a field in api_config
  const updateAPIConfig = (field: keyof APIConfig, value: any) => {
    setApiConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Update auth_config within api_config
  const updateAuthConfig = (field: string, value: any) => {
    setApiConfig(prev => ({
      ...prev,
      auth_config: {
        ...prev.auth_config,
        [field]: value
      }
    }));
  };

  // Load templates and buckets when dialog opens
  useEffect(() => {
    if (open) {
      loadTemplates();
      loadBuckets();
    }
  }, [open]);

  // Load template fields when a template is selected
  useEffect(() => {
    if (templateMapping.templateId) {
      loadTemplateFields(templateMapping.templateId);
    }
  }, [templateMapping.templateId]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  };

  const loadBuckets = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('type', 'bucket')
        .order('name');
      
      if (error) throw error;
      
      // Check which buckets are in use
      const { data: integrations } = await supabase
        .from('data_sources')
        .select('id, name, sync_config')
        .neq('id', integration?.id || '');
      
      const bucketsInUse = new Set();
      integrations?.forEach(int => {
        const config = typeof int.sync_config === 'string' 
          ? JSON.parse(int.sync_config) 
          : int.sync_config;
        if (config?.targetBucketId) {
          bucketsInUse.add(config.targetBucketId);
        }
      });
      
      const bucketsWithStatus = data?.map(bucket => ({
        ...bucket,
        inUse: bucketsInUse.has(bucket.id),
        usedBy: integrations?.find(int => {
          const config = typeof int.sync_config === 'string' 
            ? JSON.parse(int.sync_config) 
            : int.sync_config;
          return config?.targetBucketId === bucket.id;
        })?.name
      })) || [];
      
      setBucketsWithStatus(bucketsWithStatus);
      // setBuckets removed - bucketsWithStatus contains the needed data
    } catch (err) {
      console.error('Error loading buckets:', err);
    }
  };

  const loadTemplateFields = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('tabfields')
        .select('name')
        .eq('template_id', templateId)
        .order('name');
      
      if (error) throw error;
      setTemplateFields(data?.map(f => f.name) || []);
    } catch (err) {
      console.error('Error loading template fields:', err);
    }
  };

  const handleSave = async () => {
    if (!integration) return;

    setLoading(true);
    setError(null);

    try {
      // Validate bucket usage
      if (syncConfig.enabled && syncConfig.targetBucketId) {
        const targetBucket = bucketsWithStatus.find(b => b.id === syncConfig.targetBucketId);
        if (targetBucket?.inUse) {
          setError(`Cannot save: The selected bucket is already being used by integration "${targetBucket.usedBy}".`);
          setLoading(false);
          return;
        }
      }

      // Clean file_config - remove temporary data
      const cleanFileConfig = integration.type === 'file' && fileConfig ? {
        source: fileConfig.source,
        url: fileConfig.url,
        path: fileConfig.path,
        fileName: fileConfig.fileName,
        format: fileConfig.format,
        delimiter: fileConfig.delimiter,
        hasHeaders: fileConfig.hasHeaders,
        headerRowNumber: fileConfig.headerRowNumber,
        encoding: fileConfig.encoding,
        headers: fileConfig.headers,
        customHeaders: fileConfig.customHeaders,
        totalRows: fileConfig.totalRows,
        // Chunking and filtering
        chunkMode: fileConfig.chunkMode,
        chunkSize: fileConfig.chunkSize,
        filterEnabled: fileConfig.filterEnabled,
        filters: fileConfig.filters,        
        filterLogic: fileConfig.filterLogic,
        filterField: fileConfig.filterField,
        filterOperator: fileConfig.filterOperator || '==', 
        filterValue: fileConfig.filterValue,
        // Explicitly exclude fileContent and sample
        // fileContent: undefined,  // Don't save - too large and becomes stale
        // sample: undefined,       // Don't save - just for UI preview
      } : undefined;
      
      // Prepare the update data - NO direct column updates for API fields
      const updates: Partial<Integration> = {
        name,
        active,
        
        // For API integrations, EVERYTHING goes in api_config
        api_config: integration?.type === 'api' ? {
          // All API settings in one place
          url: apiConfig.url,
          endpoint: apiConfig.endpoint, // Keep both for compatibility
          method: apiConfig.method || 'GET',
          headers: apiConfig.headers || {},
          body: apiConfig.body,
          timeout: apiConfig.timeout,
          auth_type: apiConfig.auth_type || 'none',
          auth_config: apiConfig.auth_config || {},

          // API-specific settings
          data_path: (apiConfig as any).data_path,
          pagination_enabled: (apiConfig as any).pagination_enabled,
          page_param: (apiConfig as any).page_param,
          limit_param: (apiConfig as any).limit_param,
          page_size: (apiConfig as any).page_size,
          extracted_fields: apiConfig.extracted_fields,
          sample_response: apiConfig.sample_response
        } as any : undefined,
        
        // Other integration type configs
        file_config: cleanFileConfig,
        database_config: integration?.type === 'database' ? databaseConfig : undefined,
        
        // Common configs (these still have their own columns)
        sync_config: {
          ...syncConfig,
          enabled: syncConfig.enabled ?? false,
          interval: syncConfig.interval ?? 60,
          intervalUnit: syncConfig.intervalUnit ?? 'minutes',
          syncMode: syncConfig.syncMode ?? 'replace',
          targetBucketId: syncConfig.targetBucketId || undefined
        },
        template_mapping: templateMapping,
      };
      
      await onSave(updates);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save integration');
    } finally {
      setLoading(false);
    }
  };
  
  // Database-specific methods
  const handleDatabaseTypeSelect = (dbType: string) => {
    setDatabaseConfig(prev => ({
      ...prev,
      dbType,
      connections: prev.connections || {}
    }));
  };

  const handleAddConnection = () => {
    const id = `conn_${Date.now()}`;
    const dbType = DATABASE_TYPES[databaseConfig.dbType as keyof typeof DATABASE_TYPES];
    
    setDatabaseConfig(prev => ({
      ...prev,
      connections: {
        ...prev.connections,
        [id]: {
          id,
          name: 'New Connection',
          host: '',
          port: dbType?.defaultPort,
          database: '',
          username: '',
          password: '',
          schema: '',
          ssl: false
        }
      }
    }));
  };

  const handleConnectionChange = (connId: string, field: string, value: any) => {
    setDatabaseConfig(prev => ({
      ...prev,
      connections: {
        ...prev.connections,
        [connId]: {
          ...prev.connections![connId],
          [field]: value
        }
      }
    }));
  };

  const handleDeleteConnection = (connId: string) => {
    setDatabaseConfig(prev => {
      const newConnections = { ...prev.connections };
      delete newConnections[connId];
      return {
        ...prev,
        connections: newConnections
      };
    });
  };

  const testDatabaseConnection = async (connId: string) => {
    const connection = databaseConfig.connections?.[connId];
    if (!connection) return;

    setConnectionTestResults(prev => ({ ...prev, [connId]: { testing: true } }));

    try {
      const { error } = await supabase.functions.invoke('test-database-connection', {
        body: {
          type: databaseConfig.dbType,
          host: connection.host,
          port: connection.port,
          database: connection.database,
          user: connection.username,
          password: connection.password,
          schema: connection.schema
        }
      });

      if (error) throw error;

      setConnectionTestResults(prev => ({
        ...prev,
        [connId]: { success: true, message: 'Connection successful' }
      }));
    } catch (err) {
      setConnectionTestResults(prev => ({
        ...prev,
        [connId]: { success: false, error: err instanceof Error ? err.message : 'Connection failed' }
      }));
    }
  };

  const handleAddMapping = () => {
    setTemplateMapping(prev => ({
      ...prev,
      fieldMappings: [
        ...(prev.fieldMappings || []),
        { 
          templateField: '', 
          sourceColumn: '',
          rowIndex: 0,
          combinedFields: undefined
        }
      ]
    }));
  };

  const handleMappingChange = (
    index: number,
    field: 'templateField' | 'sourceColumn',
    value: string
  ) => {
    setTemplateMapping(prev => ({
      ...prev,
      fieldMappings: prev.fieldMappings?.map((mapping, i) =>
        i === index ? { ...mapping, [field]: value } : mapping
      ) || []
    }));
  };

  const testApiConnection = async () => {
    setLoading(true);
    setTestResult(null);
    setError(null);
  
    try {
      // Validate that we have an endpoint
      if (!apiConfig.url) {
        throw new Error('API endpoint is required');
      }
  
      // Build authenticated request using api_config
      const { headers: authHeaders, params } = buildAuthenticatedRequest(apiConfig);
  
      // Build URL with query params
      const testUrl = new URL(apiConfig.url);
      Object.entries(params).forEach(([key, value]) => {
        testUrl.searchParams.append(key, value);
      });
  
      // Use proxy to avoid CORS
      const result = await fetchViaProxy(testUrl.toString(), {
        method: apiConfig.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...(apiConfig.headers || {}) // Include any custom headers
        },
        body: apiConfig.body // Include body for POST/PUT/PATCH
      });
  
      if (result.status >= 400) {
        throw new Error(`HTTP error ${result.status}: ${result.statusText}`);
      }
  
      // Extract fields from response
      const extractedFields = extractJsonFields(result.data);
      
      // Update the api_config with test results
      setApiConfig(prev => ({
        ...prev,
        extracted_fields: extractedFields,
        sample_response: result.data,
        last_test_at: new Date().toISOString(),
        last_test_status: 'success'
      }));
  
      // Set test result for UI display
      setTestResult({
        success: true,
        status: result.status,
        data: result.data,
        fields: extractedFields,
        headers: (result as any).headers
      });
  
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test connection';
      setError(errorMessage);
      
      // Update api_config with error status
      setApiConfig(prev => ({
        ...prev,
        last_test_at: new Date().toISOString(),
        last_test_status: 'error',
        last_test_error: errorMessage
      }));
      
      setTestResult({
        success: false,
        error: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const detectMappingsWithAI = async () => {
    if (!integration) return;

    if (!templateFields || templateFields.length === 0) {
      setError('No template fields available');
      return;
    }

    let sourceFields: string[] = [];

    // Determine source fields based on integration type
    if (integration.type === 'api') {
      if (!apiConfig.extracted_fields || apiConfig.extracted_fields.length === 0) {
        setError('No API fields detected. Please test your API connection first.');
        return;
      }
      sourceFields = apiConfig.extracted_fields;
    } else if (integration.type === 'file') {
      if (!fileConfig.headers || fileConfig.headers.length === 0) {
        setError('No file headers detected. Please configure your file source first.');
        return;
      }
      sourceFields = fileConfig.customHeaders || fileConfig.headers;
    } else if (integration.type === 'database') {
      // For database, get columns from the first simple query
      const simpleQuery = Object.values(databaseConfig.queries || {}).find(q => q.mode === 'simple');
      if (!simpleQuery?.columnMetadata?.parentColumns) {
        setError('No database columns detected. Please test your query first.');
        return;
      }
      sourceFields = simpleQuery.columnMetadata.parentColumns;
    }
    
    if (sourceFields.length === 0) {
      setError('No source fields available for mapping');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Call Claude AI to analyze and suggest mappings
      const response = await analyzeColumnsWithClaude([], false);

      // Parse the AI response
      let aiSuggestions;
      try {
        // Extract JSON from the response (in case there's any extra text)
        const jsonMatch = (response as any).match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiSuggestions = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', response);
        throw new Error('Failed to parse AI suggestions');
      }

      // Apply high and medium confidence mappings
      const newMappings = (aiSuggestions as any).mappings
        .filter((m: any) => m.confidence === 'high' || m.confidence === 'medium')
        .map((m: any) => ({
          templateField: m.templateField,
          sourceColumn: m.sourceColumn
        }));
      
      if (newMappings.length === 0) {
        setError('AI could not find any confident field mappings. Please map fields manually.');
        return;
      }
      
      // Update the template mapping
      setTemplateMapping(prev => ({
        ...prev,
        fieldMappings: newMappings
      }));
      
      // Show success message with details
      const highConfidence = aiSuggestions.mappings.filter((m: any) => m.confidence === 'high').length;
      const mediumConfidence = aiSuggestions.mappings.filter((m: any) => m.confidence === 'medium').length;
      
      setSuccess(true);
      setError(null);
      
      // Provide feedback about the mapping
      let message = `AI detected ${newMappings.length} field mapping${newMappings.length > 1 ? 's' : ''}`;
      if (highConfidence > 0) {
        message += ` (${highConfidence} high confidence`;
        if (mediumConfidence > 0) {
          message += `, ${mediumConfidence} medium confidence`;
        }
        message += ')';
      }
      
      if (aiSuggestions.unmappedTemplateFields?.length > 0) {
        message += `. ${aiSuggestions.unmappedTemplateFields.length} template field${aiSuggestions.unmappedTemplateFields.length > 1 ? 's' : ''} couldn't be mapped automatically.`;
      }
      
      // Use a toast or update the success message
      setTimeout(() => {
        setSuccess(false);
        if (aiSuggestions.unmappedTemplateFields?.length > 0) {
          setError(`Note: The following template fields need manual mapping: ${aiSuggestions.unmappedTemplateFields.join(', ')}`);
        }
      }, 5000);
      
    } catch (err) {
      console.error('AI mapping detection failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to detect field mappings with AI');
    } finally {
      setLoading(false);
    }
  };
  
  // Determine which tabs to show based on integration type
  const getTabs = () => {
    const tabs = ['Basic', 'Configuration'];
    
    if (integration?.type === 'database') {
      tabs.push('Connections', 'Queries');
    }
    
    tabs.push('Sync & Mapping');
    
    return tabs;
  };

  if (!integration) return null;

  const tabs = getTabs();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        style: { minHeight: '700px', maxHeight: '90vh' }
      }}
    >
      <DialogTitle>
        Edit Integration: {integration.name}
        <Typography variant="caption" display="block" color="textSecondary">
          Type: {integration.type?.toUpperCase() || 'Unknown'}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Changes saved successfully!
          </Alert>
        )}

        <Tabs value={tabValue} onChange={(_e, newValue) => setTabValue(newValue)}>
          {tabs.map((tab) => (
            <Tab key={tab} label={tab} />
          ))}
        </Tabs>

        {/* Basic Tab */}
        <TabPanel value={tabValue} index={0}>
          <TextField
            fullWidth
            label="Integration Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            required
            error={!name.trim()}
            helperText={!name.trim() ? 'Name is required' : ''}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
            }
            label="Active"
            sx={{ mt: 2 }}
          />
          
          {integration.created_at && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              Created: {new Date(integration.created_at).toLocaleString()}
            </Typography>
          )}
          
          {integration.updated_at && (
            <Typography variant="body2" color="textSecondary">
              Last Updated: {new Date(integration.updated_at).toLocaleString()}
            </Typography>
          )}
        </TabPanel>

        {/* Configuration Tab */}
        <TabPanel value={tabValue} index={1}>
            {integration.type === 'api' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                API Configuration
              </Typography>
              
              {/* Endpoint */}
              <TextField
                fullWidth
                label="API Endpoint"
                value={apiConfig.url || ''}
                onChange={(e) => updateAPIConfig('url', e.target.value)}
                margin="normal"
                required
                error={!apiConfig.url}
                helperText={!apiConfig.url ? 'Endpoint is required' : 'Full URL of the API endpoint'}
              />
              
              {/* HTTP Method */}
              <FormControl fullWidth margin="normal">
                <InputLabel>HTTP Method</InputLabel>
                <Select
                  value={apiConfig.method || 'GET'}
                  onChange={(e) => updateAPIConfig('method', e.target.value)}
                >
                  <MenuItem value="GET">GET</MenuItem>
                  <MenuItem value="POST">POST</MenuItem>
                  <MenuItem value="PUT">PUT</MenuItem>
                  <MenuItem value="PATCH">PATCH</MenuItem>
                  <MenuItem value="DELETE">DELETE</MenuItem>
                </Select>
              </FormControl>
              
              {/* Authentication Type */}
              <FormControl fullWidth margin="normal">
                <InputLabel>Authentication Type</InputLabel>
                <Select
                  value={apiConfig.auth_type || 'none'}
                  onChange={(e) => updateAPIConfig('auth_type', e.target.value)}
                >
                  <MenuItem value="none">No Authentication</MenuItem>
                  <MenuItem value="basic">Basic Auth</MenuItem>
                  <MenuItem value="bearer">Bearer Token</MenuItem>
                  <MenuItem value="api_key_header">API Key (Header)</MenuItem>
                  <MenuItem value="api_key_query">API Key (Query Param)</MenuItem>
                  <MenuItem value="oauth2">OAuth 2.0</MenuItem>
                  <MenuItem value="hmac">HMAC Signature</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>
              
              {/* Authentication Configuration based on type */}
              {apiConfig.auth_type === 'basic' && (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={apiConfig.auth_config?.username || ''}
                    onChange={(e) => updateAuthConfig('username', e.target.value)}
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    value={apiConfig.auth_config?.password || ''}
                    onChange={(e) => updateAuthConfig('password', e.target.value)}
                    margin="normal"
                  />
                </Box>
              )}
              
              {apiConfig.auth_type === 'bearer' && (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Bearer Token"
                    value={apiConfig.auth_config?.token || ''}
                    onChange={(e) => updateAuthConfig('token', e.target.value)}
                    margin="normal"
                    multiline
                    rows={2}
                  />
                </Box>
              )}
              
              {apiConfig.auth_type === 'api_key_header' && (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="API Key"
                    value={apiConfig.auth_config?.api_key || ''}
                    onChange={(e) => updateAuthConfig('api_key', e.target.value)}
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="Header Name"
                    value={apiConfig.auth_config?.key_header_name || 'X-API-Key'}
                    onChange={(e) => updateAuthConfig('key_header_name', e.target.value)}
                    margin="normal"
                    helperText="e.g., X-API-Key, X-Auth-Token, Authorization"
                  />
                </Box>
              )}
              
              {apiConfig.auth_type === 'api_key_query' && (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="API Key"
                    value={apiConfig.auth_config?.api_key || ''}
                    onChange={(e) => updateAuthConfig('api_key', e.target.value)}
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="Query Parameter Name"
                    value={apiConfig.auth_config?.key_param_name || 'api_key'}
                    onChange={(e) => updateAuthConfig('key_param_name', e.target.value)}
                    margin="normal"
                    helperText="e.g., api_key, apikey, key"
                  />
                </Box>
              )}
              
              {apiConfig.auth_type === 'oauth2' && (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Access Token"
                    value={apiConfig.auth_config?.token || ''}
                    onChange={(e) => updateAuthConfig('token', e.target.value)}
                    margin="normal"
                    multiline
                    rows={2}
                  />
                  <TextField
                    fullWidth
                    label="Client ID"
                    value={apiConfig.auth_config?.client_id || ''}
                    onChange={(e) => updateAuthConfig('client_id', e.target.value)}
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="Client Secret"
                    value={apiConfig.auth_config?.client_secret || ''}
                    onChange={(e) => updateAuthConfig('client_secret', e.target.value)}
                    margin="normal"
                    type="password"
                  />
                  <TextField
                    fullWidth
                    label="Token Endpoint"
                    value={apiConfig.auth_config?.token_endpoint || ''}
                    onChange={(e) => updateAuthConfig('token_endpoint', e.target.value)}
                    margin="normal"
                    helperText="URL to refresh the access token"
                  />
                </Box>
              )}
              
              {apiConfig.auth_type === 'hmac' && (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Secret Key"
                    value={apiConfig.auth_config?.secret_key || ''}
                    onChange={(e) => updateAuthConfig('secret_key', e.target.value)}
                    margin="normal"
                    type="password"
                  />
                  <TextField
                    fullWidth
                    label="Signature Header"
                    value={apiConfig.auth_config?.signature_header || 'X-Signature'}
                    onChange={(e) => updateAuthConfig('signature_header', e.target.value)}
                    margin="normal"
                  />
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Signature Algorithm</InputLabel>
                    <Select
                      value={apiConfig.auth_config?.signature_algorithm || 'sha256'}
                      onChange={(e) => updateAuthConfig('signature_algorithm', e.target.value)}
                    >
                      <MenuItem value="sha256">SHA-256</MenuItem>
                      <MenuItem value="sha512">SHA-512</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}
              
              {apiConfig.auth_type === 'custom' && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Custom Headers
                  </Typography>
                  <TextField
                    fullWidth
                    label="Custom Headers (JSON)"
                    value={JSON.stringify(apiConfig.auth_config?.custom_headers || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const headers = JSON.parse(e.target.value);
                        updateAuthConfig('custom_headers', headers);
                      } catch (err) {
                        // Invalid JSON, don't update
                      }
                    }}
                    margin="normal"
                    multiline
                    rows={4}
                    helperText='e.g., {"Authorization": "Custom TOKEN", "X-Custom": "value"}'
                  />
                </Box>
              )}
              
              {/* Request Headers */}
              <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>
                Request Headers
              </Typography>
              <TextField
                fullWidth
                label="Headers (JSON)"
                value={JSON.stringify(apiConfig.headers || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value);
                    updateAPIConfig('headers', headers);
                  } catch (err) {
                    // Invalid JSON, don't update
                  }
                }}
                margin="normal"
                multiline
                rows={4}
                helperText='Additional headers in JSON format, e.g., {"Content-Type": "application/json"}'
              />
              
              {/* Request Body (for POST/PUT/PATCH) */}
              {['POST', 'PUT', 'PATCH'].includes(apiConfig.method || 'GET') && (
                <>
                  <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>
                    Request Body
                  </Typography>
                  <TextField
                    fullWidth
                    label="Body (JSON)"
                    value={apiConfig.body || ''}
                    onChange={(e) => updateAPIConfig('body', e.target.value)}
                    margin="normal"
                    multiline
                    rows={6}
                    helperText="Request body in JSON format"
                  />
                </>
              )}
              
              {/* Timeout */}
              <TextField
                fullWidth
                label="Timeout (seconds)"
                type="number"
                value={apiConfig.timeout || 30}
                onChange={(e) => updateAPIConfig('timeout', parseInt(e.target.value))}
                margin="normal"
                InputProps={{ inputProps: { min: 1, max: 300 } }}
              />
              
              {/* Test Connection Button */}
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={testApiConnection}
                  disabled={loading || !apiConfig.url}
                  startIcon={loading ? <CircularProgress size={20} /> : <SyncIcon />}
                >
                  Test Connection
                </Button>
              </Box>
              
              {/* Test Results */}
              {testResult && (
                <Box sx={{ mt: 2 }}>
                  {testResult.success ? (
                    <Alert severity="success">
                      <AlertTitle>Connection Successful</AlertTitle>
                      <Typography variant="body2">
                        Status: {testResult.status}
                      </Typography>
                      {testResult.fields && testResult.fields.length > 0 && (
                        <>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            Detected Fields: {testResult.fields.length}
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            {testResult.fields.slice(0, 5).map((field: string) => (
                              <Chip key={field} label={field} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                            ))}
                            {testResult.fields.length > 5 && (
                              <Chip label={`+${testResult.fields.length - 5} more`} size="small" />
                            )}
                          </Box>
                        </>
                      )}
                    </Alert>
                  ) : (
                    <Alert severity="error">
                      <AlertTitle>Connection Failed</AlertTitle>
                      {testResult.error}
                    </Alert>
                  )}
                </Box>
              )}
              
              {/* Display sample response if available */}
              {apiConfig.sample_response && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Sample Response
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 300, overflow: 'auto' }}>
                    <pre style={{ margin: 0, fontSize: '0.85rem' }}>
                      {JSON.stringify(apiConfig.sample_response, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              )}
            </Box>
          )}
          
          {integration.type === 'database' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Database Type
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(DATABASE_TYPES).map(([key, db]) => (
                  <Grid item xs={12} sm={4} key={key}>
                    <Card 
                      variant={databaseConfig.dbType === key ? 'elevation' : 'outlined'}
                      onClick={() => handleDatabaseTypeSelect(key)}
                      sx={{ 
                        cursor: 'pointer',
                        border: databaseConfig.dbType === key ? 2 : 1,
                        borderColor: databaseConfig.dbType === key ? 'primary.main' : 'divider'
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center' }}>
                        <DatabaseIcon sx={{ fontSize: 40, color: db.color }} />
                        <Typography variant="h6">{db.name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          Port: {db.defaultPort}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
          
          {integration.type === 'file' && (
            <Box>
              {/* File Source Type */}
              <FormControl fullWidth margin="normal">
                <InputLabel>File Source</InputLabel>
                <Select
                  value={fileConfig.source || 'upload'}
                  onChange={(e) => setFileConfig(prev => ({ ...prev, source: e.target.value as any }))}
                >
                  <MenuItem value="upload">Upload</MenuItem>
                  <MenuItem value="url">URL</MenuItem>
                  <MenuItem value="path">File Path</MenuItem>
                </Select>
              </FormControl>
              
              {/* File URL */}
              {fileConfig.source === 'url' && (
                <TextField
                  fullWidth
                  label="File URL"
                  value={fileConfig.url || ''}
                  onChange={(e) => setFileConfig(prev => ({ ...prev, url: e.target.value }))}
                  margin="normal"
                  helperText="Enter the URL of the file to sync"
                />
              )}

              {/* File Path */}
              {fileConfig.source === 'path' && (
                <TextField
                  fullWidth
                  label="File Path"
                  value={fileConfig.path || ''}
                  onChange={(e) => setFileConfig(prev => ({ ...prev, path: e.target.value }))}
                  margin="normal"
                  helperText="Enter the server path to the file"
                />
              )}

              {/* File Format */}
              <FormControl fullWidth margin="normal">
                <InputLabel>File Format</InputLabel>
                <Select
                  value={fileConfig.format || 'csv'}
                  onChange={(e) => setFileConfig(prev => ({ ...prev, format: e.target.value as any }))}
                >
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="tsv">TSV</MenuItem>
                  <MenuItem value="json">JSON</MenuItem>
                  <MenuItem value="txt">Text</MenuItem>
                </Select>
              </FormControl>

              {/* CSV/TSV Specific Options */}
              {(fileConfig.format === 'csv' || fileConfig.format === 'tsv') && (
                <>
                  {/* Has Headers */}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={fileConfig.hasHeaders ?? true}
                        onChange={(e) => setFileConfig(prev => ({ ...prev, hasHeaders: e.target.checked }))}
                      />
                    }
                    label="File contains headers"
                    sx={{ mt: 2, mb: 1 }}
                  />

                  {/* Header Row Number - NEW */}
                  {fileConfig.hasHeaders && (
                    <TextField
                      fullWidth
                      type="number"
                      label="Header Row Number"
                      value={fileConfig.headerRowNumber || 1}
                      onChange={(e) => setFileConfig(prev => ({ 
                        ...prev, 
                        headerRowNumber: parseInt(e.target.value) || 1 
                      }))}
                      margin="normal"
                      helperText="Which row contains the column headers? (1 = first row)"
                      InputProps={{ inputProps: { min: 1, max: 100 } }}
                    />
                  )}

                  {/* Filter Configuration */}
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'white', borderRadius: 1 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>Filter Rows (Optional)</Typography>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={fileConfig.filterEnabled || false}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setFileConfig(prev => ({ 
                              ...prev, 
                              filterEnabled: enabled,
                              // Initialize with one empty filter if enabling and no filters exist
                              filters: enabled && (!prev.filters || prev.filters.length === 0) 
                                ? [{ field: '', operator: '==', value: '' }] 
                                : prev.filters || [],
                              filterLogic: prev.filterLogic || 'AND'
                            }));
                          }}
                        />
                      }
                      label="Only include rows that match conditions"
                    />

                    {fileConfig.filterEnabled && (
                      <>
                        {/* Filter Logic Selector (only show if multiple filters) */}
                        {fileConfig.filters && fileConfig.filters.length > 1 && (
                          <FormControl sx={{ mt: 2, mb: 2, minWidth: 150 }} size="small">
                            <InputLabel>Match Logic</InputLabel>
                            <Select
                              value={fileConfig.filterLogic || 'AND'}
                              onChange={(e) => setFileConfig(prev => ({ 
                                ...prev, 
                                filterLogic: e.target.value as 'AND' | 'OR'
                              }))}
                              label="Match Logic"
                            >
                              <MenuItem value="AND">All conditions (AND)</MenuItem>
                              <MenuItem value="OR">Any condition (OR)</MenuItem>
                            </Select>
                          </FormControl>
                        )}

                        {/* Filter Conditions */}
                        {(fileConfig.filters || []).map((filter, index) => (
                          <Box key={index} sx={{ 
                            mt: 2, 
                            p: 2, 
                            border: '1px solid #e0e0e0', 
                            borderRadius: 1,
                            bgcolor: '#fafafa'
                          }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="body2" fontWeight="bold">
                                Condition {index + 1}
                              </Typography>
                              {fileConfig.filters && fileConfig.filters.length > 1 && (
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const newFilters = [...(fileConfig.filters || [])];
                                    newFilters.splice(index, 1);
                                    setFileConfig(prev => ({ ...prev, filters: newFilters }));
                                  }}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>

                            <TextField
                              fullWidth
                              label="Column Name"
                              value={filter.field || ''}
                              onChange={(e) => {
                                const newFilters = [...(fileConfig.filters || [])];
                                newFilters[index] = { ...newFilters[index], field: e.target.value };
                                setFileConfig(prev => ({ ...prev, filters: newFilters }));
                              }}
                              margin="dense"
                              size="small"
                              placeholder="e.g., ForecastName"
                            />

                            <FormControl fullWidth margin="dense" size="small">
                              <InputLabel>Operator</InputLabel>
                              <Select
                                value={filter.operator || '=='}
                                onChange={(e) => {
                                  const newFilters = [...(fileConfig.filters || [])];
                                  newFilters[index] = { ...newFilters[index], operator: e.target.value as any };
                                  setFileConfig(prev => ({ ...prev, filters: newFilters }));
                                }}
                              >
                                <MenuItem value="==">Equals (==)</MenuItem>
                                <MenuItem value="!=">Not Equals (!=)</MenuItem>
                                <MenuItem value="contains">Contains</MenuItem>
                                <MenuItem value="startsWith">Starts With</MenuItem>
                                <MenuItem value="endsWith">Ends With</MenuItem>
                                <MenuItem value="in">In List</MenuItem>
                                <MenuItem value="notIn">Not In List</MenuItem>
                              </Select>
                            </FormControl>

                            <TextField
                              fullWidth
                              label={filter.operator === 'in' || filter.operator === 'notIn' 
                                ? "Values (comma-separated)" 
                                : "Value"}
                              value={filter.value || ''}
                              onChange={(e) => {
                                const newFilters = [...(fileConfig.filters || [])];
                                newFilters[index] = { ...newFilters[index], value: e.target.value };
                                setFileConfig(prev => ({ ...prev, filters: newFilters }));
                              }}
                              margin="dense"
                              size="small"
                              placeholder={filter.operator === 'in' || filter.operator === 'notIn'
                                ? "e.g., Newark, Bronx, JFK"
                                : 'e.g., "Current"'}
                              helperText={filter.operator === 'in' || filter.operator === 'notIn'
                                ? "Separate values with commas"
                                : undefined}
                              multiline={filter.operator === 'in' || filter.operator === 'notIn'}
                              rows={filter.operator === 'in' || filter.operator === 'notIn' ? 2 : 1}
                            />

                            {/* Preview matched values for IN/NOT IN */}
                            {(filter.operator === 'in' || filter.operator === 'notIn') && filter.value && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" color="textSecondary">
                                  {filter.value.split(',').length} value(s):
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                  {filter.value.split(',').map((v, i) => (
                                    <Chip key={i} label={v.trim()} size="small" />
                                  ))}
                                </Box>
                              </Box>
                            )}
                          </Box>
                        ))}

                        {/* Add Filter Button */}
                        <Button
                          startIcon={<AddIcon />}
                          onClick={() => {
                            const newFilters = [
                              ...(fileConfig.filters || []),
                              { field: '', operator: '==' as any, value: '' }
                            ];
                            setFileConfig(prev => ({ ...prev, filters: newFilters as any }));
                          }}
                          sx={{ mt: 2 }}
                          variant="outlined"
                          size="small"
                        >
                          Add Filter Condition
                        </Button>
                      </>
                    )}
                  </Box>

                  <Alert severity="info" sx={{ mt: 2 }}>
                    <strong>How it works:</strong>
                    <ol style={{ marginBottom: 0, paddingLeft: '20px', marginTop: '8px' }}>
                      {fileConfig.filterEnabled && fileConfig.filters && fileConfig.filters.length > 0 && (
                        <li>
                          Filter rows that match {fileConfig.filters.length > 1 
                            ? `${fileConfig.filterLogic === 'OR' ? 'ANY' : 'ALL'} of these ${fileConfig.filters.length} conditions`
                            : 'this condition'}:
                          <ul style={{ marginTop: '4px', marginBottom: '4px' }}>
                            {fileConfig.filters.map((f, i) => (
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
                      <li>Group {fileConfig.filterEnabled ? 'filtered ' : ''}rows into chunks of {fileConfig.chunkSize || 3}</li>
                      <li>Create one item per chunk</li>
                      <li>Map specific rows to template fields in the Sync & Mapping tab</li>
                    </ol>
                    
                    {fileConfig.filters && fileConfig.filters.some(f => f.operator === 'in' || f.operator === 'notIn') && (
                      <Box sx={{ mt: 1.5, p: 1, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                        <strong>Tip:</strong> For IN/NOT IN operators, separate multiple values with commas. 
                        Example: <code>New York, Boston, Chicago</code>
                      </Box>
                    )}
                  </Alert>

                  {/* Chunk Mode */}
                  <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f8ff', borderRadius: 1 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Row Grouping (Chunk Mode)</Typography>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={fileConfig.chunkMode || false}
                          onChange={(e) => {
                            const newChunkMode = e.target.checked;
                            setFileConfig(prev => ({ 
                              ...prev, 
                              chunkMode: newChunkMode,
                              chunkSize: newChunkMode && !prev.chunkSize ? 3 : prev.chunkSize
                            }));
                          }}
                        />
                      }
                      label="Group multiple rows into single items"
                    />

                    {fileConfig.chunkMode && (
                      <>
                        <TextField
                          fullWidth
                          type="number"
                          label="Rows per Item"
                          value={fileConfig.chunkSize || 3}
                          onChange={(e) => setFileConfig(prev => ({ 
                            ...prev, 
                            chunkSize: parseInt(e.target.value) || 3 
                          }))}
                          margin="normal"
                          helperText="How many rows should be combined into each item?"
                          InputProps={{ inputProps: { min: 1, max: 20 } }}
                        />
                      </>
                    )}
                  </Box>

                  <Alert severity="info" sx={{ mt: 2 }}>
                    <strong>How it works:</strong>
                    <ol style={{ marginBottom: 0, paddingLeft: '20px', marginTop: '8px' }}>
                      <li>Group consecutive rows into chunks of {fileConfig.chunkSize || 3}</li>
                      <li>Create one item per chunk</li>
                      <li>Map specific rows within each chunk to template fields in the Sync & Mapping tab</li>
                      <li>Use the "Row in Chunk" field mapping setting to specify which row (1, 2, 3, etc.) each field should read from</li>
                    </ol>
                    
                    <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#fff', borderRadius: '4px' }}>
                      <strong>Example:</strong> With chunk size 3, rows 1-3 become Item 1, rows 4-6 become Item 2. 
                      You can map "Name" to row 1, "Email" to row 2, and "Phone" to row 3 within each chunk.
                    </div>
                  </Alert>
                </>
              )}
            </Box>
          )}
        </TabPanel>

        {/* Database Connections Tab (only for database type) */}
        {integration.type === 'database' && (
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Database Connections</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddConnection}
                variant="contained"
                disabled={!databaseConfig.dbType}
              >
                Add Connection
              </Button>
            </Box>
            
            {!databaseConfig.dbType && (
              <Alert severity="info">
                Please select a database type in the Configuration tab first.
              </Alert>
            )}
            
            {Object.values(databaseConfig.connections || {}).map(conn => (
              <Card key={conn.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <TextField
                      label="Connection Name"
                      value={conn.name}
                      onChange={(e) => handleConnectionChange(conn.id, 'name', e.target.value)}
                      size="small"
                    />
                    <IconButton
                      onClick={() => handleDeleteConnection(conn.id)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={8}>
                      <TextField
                        fullWidth
                        label="Host"
                        value={conn.host}
                        onChange={(e) => handleConnectionChange(conn.id, 'host', e.target.value)}
                        size="small"
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Port"
                        type="number"
                        value={conn.port || ''}
                        onChange={(e) => handleConnectionChange(conn.id, 'port', parseInt(e.target.value) || 0)}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Database"
                        value={conn.database}
                        onChange={(e) => handleConnectionChange(conn.id, 'database', e.target.value)}
                        size="small"
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Username"
                        value={conn.username}
                        onChange={(e) => handleConnectionChange(conn.id, 'username', e.target.value)}
                        size="small"
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        value={conn.password}
                        onChange={(e) => handleConnectionChange(conn.id, 'password', e.target.value)}
                        size="small"
                        required
                      />
                    </Grid>
                    {databaseConfig.dbType === 'postgresql' && (
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Schema (optional)"
                          value={conn.schema || ''}
                          onChange={(e) => handleConnectionChange(conn.id, 'schema', e.target.value)}
                          size="small"
                          placeholder="public"
                        />
                      </Grid>
                    )}
                  </Grid>
                  
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                      startIcon={<PlayArrowIcon />}
                      onClick={() => testDatabaseConnection(conn.id)}
                      variant="outlined"
                      disabled={!conn.host || !conn.database || !conn.username}
                    >
                      Test Connection
                    </Button>
                    {connectionTestResults[conn.id]?.testing && <CircularProgress size={20} />}
                    {connectionTestResults[conn.id]?.success && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Connected"
                        color="success"
                        size="small"
                      />
                    )}
                    {connectionTestResults[conn.id]?.error && (
                      <Typography variant="caption" color="error">
                        {connectionTestResults[conn.id].error}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
            
            {Object.keys(databaseConfig.connections || {}).length === 0 && databaseConfig.dbType && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Add at least one database connection to continue.
              </Alert>
            )}
          </TabPanel>
        )}

        {/* Database Queries Tab (only for database type) */}
        {integration.type === 'database' && (
          <TabPanel value={tabValue} index={3}>
            {Object.keys(databaseConfig.connections || {}).length === 0 ? (
              <Alert severity="warning">
                Please add at least one database connection before creating queries.
              </Alert>
            ) : (
              <>
                {/* <DatabaseQueryStep
                  connections={databaseConfig.connections || {}}
                  queries={databaseConfig.queries || {}}
                  templates={templates}
                  onQueriesChange={handleQueriesChange}
                  onTestQuery={testDatabaseQuery}
                /> */}
                <div>Database query configuration temporarily disabled</div>
                {Object.values(databaseConfig.queries || {}).some(q => (q as any).columnMetadata) && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Some queries have saved column information from previous tests. 
                    Re-test if your database schema has changed.
                  </Alert>
                )}
              </>
            )}
          </TabPanel>
        )}

        {/* Sync & Mapping Tab */}
        <TabPanel value={tabValue} index={tabs.indexOf('Sync & Mapping')}>
          <FormControlLabel
            control={
              <Switch
                checked={syncConfig.enabled ?? false}
                onChange={(e) => setSyncConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              />
            }
            label="Enable Auto Sync"
            sx={{ mb: 2 }}
          />
          
          {syncConfig.enabled && (
            <>
              {/* Sync Mode Selection */}
              <FormControl fullWidth margin="normal">
                <InputLabel>Sync Mode</InputLabel>
                <Select
                  value={syncConfig.syncMode || 'replace'}
                  onChange={(e) => setSyncConfig(prev => ({ ...prev, syncMode: e.target.value as 'update' | 'replace' }))}
                >
                  <MenuItem value="update">Update existing items</MenuItem>
                  <MenuItem value="replace">Replace all items</MenuItem>
                </Select>
              </FormControl>
              
              {/* Mode Explanation */}
              <Alert 
                severity="info" 
                sx={{ mb: 2, mt: 1 }}
                icon={syncConfig.syncMode === 'update' ? <UpdateIcon /> : <SwapHorizIcon />}
              >
                {syncConfig.syncMode === 'update' ? (
                  <>
                    <strong>Update Mode:</strong> Existing items will be updated in-place, matching by position. 
                    Item IDs and relationships are preserved. Extra items will be removed if the source has fewer rows.
                  </>
                ) : (
                  <>
                    <strong>Replace Mode:</strong> All existing items will be deleted and replaced with new ones. 
                    This ensures a clean sync but will create new item IDs each time.
                  </>
                )}
              </Alert>
              
              {/* Sync Interval */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  type="number"
                  label="Sync Interval"
                  value={syncConfig.interval || 60}
                  onChange={(e) => setSyncConfig(prev => ({ ...prev, interval: parseInt(e.target.value) || 60 }))}
                  InputProps={{ inputProps: { min: 1 } }}
                />
                <FormControl>
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={syncConfig.intervalUnit || 'minutes'}
                    onChange={(e) => setSyncConfig(prev => ({ ...prev, intervalUnit: e.target.value as any }))}
                  >
                    <MenuItem value="seconds">Seconds</MenuItem> 
                    <MenuItem value="minutes">Minutes</MenuItem>
                    <MenuItem value="hours">Hours</MenuItem>
                    <MenuItem value="days">Days</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {/* Target Template - Only for simple queries or file sources */}
              {(integration.type === 'file' || 
                (integration.type === 'database' && 
                 Object.values(databaseConfig.queries || {}).some(q => q.mode === 'simple'))) && (
                <FormControl fullWidth margin="normal">
                  <InputLabel>Target Template</InputLabel>
                  <Select
                    value={templateMapping.templateId || ''}
                    onChange={(e) => setTemplateMapping(prev => ({ ...prev, templateId: e.target.value }))}
                  >
                    <MenuItem value="">Select a template...</MenuItem>
                    {templates.map(template => (
                      <MenuItem key={template.id} value={template.id}>
                        {template.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              {/* Target Bucket */}
              <FormControl fullWidth margin="normal" error={!!bucketError}>
                <InputLabel>Target Bucket</InputLabel>
                <Select
                  value={syncConfig.targetBucketId || ''}
                  onChange={(e) => {
                    const bucketId = e.target.value;
                    setSyncConfig(prev => ({ ...prev, targetBucketId: bucketId }));
                    
                    const bucket = bucketsWithStatus.find(b => b.id === bucketId);
                    if (bucket?.inUse) {
                      setBucketError(`This bucket is already in use by integration "${bucket.usedBy}"`);
                    } else {
                      setBucketError(null);
                    }
                  }}
                >
                  <MenuItem value="">Select a bucket...</MenuItem>
                  {bucketsWithStatus.map(bucket => (
                    <MenuItem key={bucket.id} value={bucket.id} disabled={bucket.inUse}>
                      {bucket.name}
                      {bucket.inUse && ` (Used by ${bucket.usedBy})`}
                    </MenuItem>
                  ))}
                </Select>
                {bucketError && (
                  <Typography variant="caption" color="error">
                    {bucketError}
                  </Typography>
                )}
              </FormControl>
              
              {/* Field Mappings - For all non parent-child sources including API */}
              {templateMapping.templateId && templateFields.length > 0 && 
               (integration.type === 'file' || 
                integration.type === 'api' ||
                (integration.type === 'database' && 
                 Object.values(databaseConfig.queries || {}).some(q => q.mode === 'simple'))) && (
                <>
                  <Box sx={{ mt: 3, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Field Mappings</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {/* AI Detection Button */}
                      <Button
                        startIcon={loading ? <CircularProgress size={20} /> : <AutoFixHighIcon />}
                        onClick={detectMappingsWithAI}
                        variant="outlined"
                        size="small"
                        disabled={loading || !templateMapping.templateId}
                        color="secondary"
                      >
                        {loading ? 'Detecting...' : 'AI Detect'}
                      </Button>
                      <Button
                        startIcon={<AddIcon />}
                        onClick={handleAddMapping}
                        size="small"
                      >
                        Add Mapping
                      </Button>
                    </Box>
                  </Box>
                  
                  {/* AI Detection Help Text */}
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <AlertTitle>Smart Field Mapping</AlertTitle>
                    <Typography variant="body2">
                      Use the <strong>AI Detect</strong> button to automatically map fields based on their names and data patterns.
                      {integration.type === 'api' && ' Make sure to test your API connection first to detect available fields.'}
                      {integration.type === 'file' && ' Ensure your file configuration is complete with headers detected.'}
                      {integration.type === 'database' && ' Test your query first to detect available columns.'}
                    </Typography>
                  </Alert>
                  
                  {/* Show available source fields for API integrations */}
                  {integration.type === 'api' && apiConfig.extracted_fields && apiConfig.extracted_fields.length > 0 && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      <AlertTitle>Available API Fields ({apiConfig.extracted_fields.length})</AlertTitle>
                      <Box sx={{ mt: 1 }}>
                        {apiConfig.extracted_fields.slice(0, 10).map((field: string) => (
                          <Chip 
                            key={field} 
                            label={field} 
                            size="small" 
                            sx={{ mr: 0.5, mb: 0.5 }}
                            onClick={() => {
                              // Helper to auto-add this field to mappings if user clicks it
                              const existingMapping = templateMapping.fieldMappings?.find(m => m.sourceColumn === field);
                              if (!existingMapping) {
                                setTemplateMapping(prev => ({
                                  ...prev,
                                  fieldMappings: [
                                    ...(prev.fieldMappings || []),
                                    { templateField: '', sourceColumn: field }
                                  ]
                                }));
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        ))}
                        {apiConfig.extracted_fields.length > 10 && (
                          <Chip label={`+${apiConfig.extracted_fields.length - 10} more fields`} size="small" />
                        )}
                      </Box>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Click on a field to add it to mappings, or use AI Detect for automatic mapping.
                      </Typography>
                    </Alert>
                  )}
                  
                  {/* Show hint if API hasn't been tested yet */}
                  {integration.type === 'api' && (!apiConfig.extracted_fields || apiConfig.extracted_fields.length === 0) && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      No API fields detected. Please test your API connection in the Configuration tab first.
                    </Alert>
                  )}
                  
                  {/* Display each field mapping */}
                  {templateMapping.fieldMappings?.map((mapping, index) => (
                    <Card key={index} sx={{ p: 2, mb: 2, bgcolor: '#f9f9f9' }}>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        
                        {/* Row Index - only for chunk mode */}
                        {integration.type === 'file' && fileConfig.chunkMode && (
                          <TextField
                            type="number"
                            label="Row in Chunk"
                            value={mapping.rowIndex ?? 0}
                            onChange={(e) => {
                              const newMappings = [...templateMapping.fieldMappings];
                              newMappings[index] = { 
                                ...newMappings[index], 
                                rowIndex: parseInt(e.target.value) || 0 
                              };
                              setTemplateMapping(prev => ({ ...prev, fieldMappings: newMappings }));
                            }}
                            sx={{ width: 120 }}
                            InputProps={{ inputProps: { min: 0, max: (fileConfig.chunkSize || 1) - 1 } }}
                            helperText="0=1st, 1=2nd"
                          />
                        )}
                        
                        {/* Template Field */}
                        <FormControl sx={{ minWidth: 200, flex: 1 }}>
                          <InputLabel>Template Field</InputLabel>
                          <Select
                            value={mapping.templateField || ''}
                            onChange={(e) => handleMappingChange(index, 'templateField', e.target.value)}
                          >
                            <MenuItem value="">Select field...</MenuItem>
                            {templateFields.map(field => (
                              <MenuItem key={field} value={field}>
                                {field}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        
                        {/* Delete Button */}
                        <IconButton 
                          color="error" 
                          onClick={() => {
                            setTemplateMapping(prev => ({
                              ...prev,
                              fieldMappings: prev.fieldMappings.filter((_, i) => i !== index)
                            }));
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>

                      {/* Mapping Type Toggle */}
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Mapping Type</InputLabel>
                        <Select
                          value={mapping.combinedFields ? 'combined' : 'direct'}
                          onChange={(e) => {
                            const newMappings = [...templateMapping.fieldMappings];
                            if (e.target.value === 'combined') {
                              // Switch to combined mode
                              newMappings[index] = {
                                ...newMappings[index],
                                combinedFields: {
                                  fields: [],
                                  template: ''
                                },
                                sourceColumn: '' as any
                              };
                            } else {
                              // Switch to direct mode
                              newMappings[index] = {
                                ...newMappings[index],
                                sourceColumn: '',
                                combinedFields: undefined as any
                              };
                            }
                            setTemplateMapping(prev => ({ ...prev, fieldMappings: newMappings }));
                          }}
                        >
                          <MenuItem value="direct">Direct Mapping (Single Field)</MenuItem>
                          <MenuItem value="combined">Combined Fields (Multiple Fields)</MenuItem>
                        </Select>
                      </FormControl>

                      {/* Direct Mapping */}
                      {!mapping.combinedFields && (
                        <TextField
                          fullWidth
                          label="Source Column"
                          value={mapping.sourceColumn || ''}
                          onChange={(e) => handleMappingChange(index, 'sourceColumn', e.target.value)}
                          placeholder={
                            integration.type === 'api' 
                              ? 'e.g., user.email or data[0].name' 
                              : 'Enter column name'
                          }
                          helperText="The source field to map from"
                        />
                      )}

                      {/* Combined Fields Mapping */}
                      {mapping.combinedFields && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Select Fields to Combine
                          </Typography>
                          
                          {/* Field Selection Tags */}
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                            {(integration?.type === 'file' ? (fileConfig.customHeaders || fileConfig.headers) :
                              integration?.type === 'api' ? apiConfig.extracted_fields :
                              [])?.map((field: string) => {
                              const isSelected = mapping.combinedFields?.fields?.includes(field);
                              return (
                                <Chip
                                  key={field}
                                  label={field}
                                  onClick={() => {
                                    const newMappings = [...templateMapping.fieldMappings];
                                    const currentFields = mapping.combinedFields?.fields || [];
                                    
                                    if (isSelected) {
                                      // Remove field
                                      newMappings[index] = {
                                        ...newMappings[index],
                                        combinedFields: {
                                          ...mapping.combinedFields!,
                                          fields: currentFields.filter(f => f !== field)
                                        }
                                      };
                                    } else {
                                      // Add field
                                      newMappings[index] = {
                                        ...newMappings[index],
                                        combinedFields: {
                                          fields: [...currentFields, field],
                                          template: mapping.combinedFields?.template || 
                                                  [...currentFields, field].map((_, i) => `{${i}}`).join(' ')
                                        }
                                      };
                                    }
                                    setTemplateMapping(prev => ({ ...prev, fieldMappings: newMappings }));
                                  }}
                                  color={isSelected ? 'primary' : 'default'}
                                  variant={isSelected ? 'filled' : 'outlined'}
                                  icon={isSelected ? <CheckIcon /> : undefined}
                                />
                              );
                            })}
                          </Box>

                          {/* Combination Template */}
                          {mapping.combinedFields?.fields && mapping.combinedFields.fields.length > 0 && (
                            <>
                              <TextField
                                fullWidth
                                label="Combination Template"
                                value={mapping.combinedFields.template || ''}
                                onChange={(e) => {
                                  const newMappings = [...templateMapping.fieldMappings];
                                  newMappings[index] = {
                                    ...newMappings[index],
                                    combinedFields: {
                                      ...mapping.combinedFields!,
                                      template: e.target.value
                                    }
                                  };
                                  setTemplateMapping(prev => ({ ...prev, fieldMappings: newMappings }));
                                }}
                                placeholder="e.g., {0} {1}° or {0} - {1}"
                                helperText={`Use {0}, {1}, etc. for field positions. Selected: ${mapping.combinedFields.fields.join(', ')}`}
                                sx={{ mb: 1 }}
                              />

                              {/* Preview */}
                              <Alert severity="success">
                                <strong>Preview:</strong> {
                                  (() => {
                                    // Create a sample preview
                                    let preview = mapping.combinedFields.template || '';
                                    mapping.combinedFields.fields.forEach((field, idx) => {
                                      preview = preview.replace(`{${idx}}`, `[${field}]`);
                                    });
                                    return preview || 'Enter a template above';
                                  })()
                                }
                              </Alert>
                            </>
                          )}
                        </Box>
                      )}
                    </Card>
                  ))}

                  {integration.type === 'file' && fileConfig.chunkMode && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <strong>Chunk Mode Active:</strong> Each item will contain data from {fileConfig.chunkSize} rows.
                      Use the "Row in Chunk" field to specify which row each field should read from.
                    </Alert>
                  )}
                  
                  {(!templateMapping.fieldMappings || templateMapping.fieldMappings.length === 0) && (
                    <Alert severity="info">
                      Add field mappings manually or use the AI Detect button for automatic mapping.
                      {integration.type === 'api' && ' Test your API connection first to see available fields.'}
                    </Alert>
                  )}
                </>
              )}
              
              {/* Info for Parent-Child Queries */}
              {integration.type === 'database' && 
               Object.values(databaseConfig.queries || {}).some(q => q.mode === 'parent-child') && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <AlertTitle>Parent-Child Query Configuration</AlertTitle>
                  Template selection and field mappings for parent-child queries are configured 
                  within each query in the Queries tab.
                </Alert>
              )}

            </>
          )}
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || !name.trim() || !!bucketError}
          startIcon={loading && <CircularProgress size={20} />}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};
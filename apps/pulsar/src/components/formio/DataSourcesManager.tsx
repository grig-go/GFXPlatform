import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Collapse,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Grid
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useDataSources, DataSource, NewDataSource } from '../../hooks/useDataSources';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`datasource-tabpanel-${index}`}
      aria-labelledby={`datasource-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

/**
 * Props for the DataSourcesManager component
 */
export interface DataSourcesManagerProps {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
}

/**
 * Component for managing Form.io data sources
 */
export const DataSourcesManager: React.FC<DataSourcesManagerProps> = ({
  open,
  onClose,
  onSave
}) => {
  const { 
    dataSources, 
    loading: datasourcesLoading, 
    error: datasourcesError, 
    fetchDataSources,
    addDataSource,
    editDataSource,
    removeDataSource,
    testDataSource
  } = useDataSources();

  const [tabValue, setTabValue] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [newSource, setNewSource] = useState<NewDataSource>({
    name: '',
    url: '',
    method: 'GET',
    headers: {},
    auth_required: false
  });
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [headerKey, setHeaderKey] = useState<string>('');
  const [headerValue, setHeaderValue] = useState<string>('');
  const [authUsername, setAuthUsername] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authToken, setAuthToken] = useState<string>('');
  const [editMode, setEditMode] = useState<boolean>(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      fetchDataSources();
      resetForm();
    }
  }, [open, fetchDataSources]);

  // Reset form
  const resetForm = useCallback(() => {
    setNewSource({
      name: '',
      url: '',
      method: 'GET',
      headers: {},
      auth_required: false
    });
    setEditingSource(null);
    setHeaderKey('');
    setHeaderValue('');
    setAuthUsername('');
    setAuthPassword('');
    setAuthToken('');
    setTestResult(null);
    setEditMode(false);
    setTabValue(0);
  }, []);

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Toggle accordion expansion
  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Handle input changes for new source
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    
    if (name) {
      setNewSource(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle method change
  const handleMethodChange = (e: any) => {
    const method = e.target.value as string;
    setNewSource(prev => ({
      ...prev,
      method: method as any
    }));
  };

  // Handle auth type change
  const handleAuthTypeChange = (e: any) => {
    const authType = e.target.value as string;
    setNewSource(prev => ({
      ...prev,
      auth_type: authType,
      auth_config: {}
    }));
    
    // Reset auth fields
    setAuthUsername('');
    setAuthPassword('');
    setAuthToken('');
  };

  // Handle auth required toggle
  const handleAuthRequiredChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setNewSource(prev => ({
      ...prev,
      auth_required: checked,
      auth_type: checked ? 'bearer' : undefined,
      auth_config: checked ? { token: '' } : undefined
    }));
  };

  // Add header to the headers object
  const addHeader = () => {
    if (!headerKey.trim()) return;
    
    setNewSource(prev => ({
      ...prev,
      headers: {
        ...prev.headers,
        [headerKey.trim()]: headerValue
      }
    }));
    
    setHeaderKey('');
    setHeaderValue('');
  };

  // Remove header from the headers object
  const removeHeader = (key: string) => {
    setNewSource(prev => {
      const updatedHeaders = { ...prev.headers };
      delete updatedHeaders[key];
      
      return {
        ...prev,
        headers: updatedHeaders
      };
    });
  };

  // Update auth config based on selected auth type
  const updateAuthConfig = useCallback(() => {
    if (!newSource.auth_required) return;
    
    const authType = newSource.auth_type;
    let authConfig = {};
    
    if (authType === 'basic') {
      authConfig = {
        username: authUsername,
        password: authPassword
      };
    } else if (authType === 'bearer') {
      authConfig = {
        token: authToken
      };
    }
    
    setNewSource(prev => ({
      ...prev,
      auth_config: authConfig
    }));
  }, [newSource.auth_required, newSource.auth_type, authUsername, authPassword, authToken]);

  // Update auth config when auth fields change
  useEffect(() => {
    updateAuthConfig();
  }, [authUsername, authPassword, authToken, updateAuthConfig]);

  // Edit existing data source
  const handleEditSource = (source: DataSource) => {
    setEditingSource(source);

    // Handle both data structures - check api_config for DataWizard-created sources
    const sourceAny = source as any;
    const url = source.url || sourceAny.api_config?.url || '';
    const method = source.method || sourceAny.api_config?.method || 'GET';
    const headers = source.headers || sourceAny.api_config?.headers || {};
    const auth_required = source.auth_required !== undefined
      ? source.auth_required
      : sourceAny.api_config?.auth_required || false;
    const auth_type = source.auth_type || sourceAny.api_config?.auth_type;
    const auth_config = source.auth_config || sourceAny.api_config?.auth_config;
    
    setNewSource({
      name: source.name,
      url: url,
      method: method,
      headers: headers,
      auth_required: auth_required,
      auth_type: auth_type,
      auth_config: auth_config
    });
    
    // Extract auth fields from config
    if (auth_required && auth_config) {
      if (auth_type === 'basic') {
        setAuthUsername(auth_config.username || '');
        setAuthPassword(auth_config.password || '');
      } else if (auth_type === 'bearer') {
        setAuthToken(auth_config.token || '');
      }
    }
    
    setEditMode(true);
    setTabValue(1);
  };

  // Save data source (create or update)
  const handleSaveSource = async () => {
    try {
      if (editMode && editingSource) {
        // Update existing source
        await editDataSource(editingSource.id, newSource as any);
      } else {
        // Create new source
        await addDataSource(newSource);
      }
      
      resetForm();
      setTabValue(0);
      
      // Call the onSave callback if provided
      if (onSave) {
        onSave();
      }
    } catch (err) {
      console.error('Error saving data source:', err);
    }
  };

  // Delete data source
  const handleDeleteSource = async (sourceId: string) => {
    if (window.confirm('Are you sure you want to delete this data source?')) {
      try {
        await removeDataSource(sourceId);
        
        // Call the onSave callback if provided
        if (onSave) {
          onSave();
        }
      } catch (err) {
        console.error('Error deleting data source:', err);
      }
    }
  };

  // Test data source
  const handleTestDataSource = async (source: DataSource | NewDataSource) => {
    setTestLoading(true);
    setTestResult(null);
    
    try {
      const result = await testDataSource(source);
      setTestResult(result);
    } catch (err) {
      console.error('Error testing data source:', err);
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    resetForm();
    setTabValue(0);
  };

  // Check if form is valid
  const isFormValid = () => {
    // Basic validation
    if (!newSource.name.trim() || !newSource.url.trim()) {
      return false;
    }
    
    // Auth validation
    if (newSource.auth_required) {
      if (newSource.auth_type === 'basic') {
        return authUsername.trim() !== '' && authPassword.trim() !== '';
      } else if (newSource.auth_type === 'bearer') {
        return authToken.trim() !== '';
      }
    }
    
    return true;
  };

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          return; // Prevent closing
        }
        onClose();
      }}
      maxWidth="lg"
      fullWidth
      aria-labelledby="data-sources-dialog-title"
    >
      <DialogTitle id="data-sources-dialog-title">
        Data Sources Manager
      </DialogTitle>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          aria-label="data sources tabs"
        >
          <Tab label="Data Sources" />
          <Tab label="Add / Edit Data Source" />
          <Tab label="Documentation" />
        </Tabs>
      </Box>
      
      <DialogContent>
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => {
                resetForm();
                setTabValue(1);
              }}
            >
              Add New Data Source
            </Button>
          </Box>
          
          {datasourcesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : datasourcesError ? (
            <Alert severity="error">{datasourcesError}</Alert>
          ) : dataSources.length === 0 ? (
            <Alert severity="info">
              No data sources found. Create your first data source to make it available in your forms.
            </Alert>
          ) : (
            <List>
              {dataSources.map((source) => (
                <Paper key={source.id} sx={{ mb: 2 }}>
                  <ListItem button onClick={() => toggleExpanded(source.id)}>
                    <ListItemText
                      primary={source.name}
                      secondary={`${source.method} | ${source.url}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        aria-label="edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSource(source);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        aria-label="test"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestDataSource(source);
                        }}
                        disabled={testLoading}
                        sx={{ ml: 1 }}
                      >
                        {testLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        aria-label="delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSource(source.id);
                        }}
                        sx={{ ml: 1 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                    {expandedId === source.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItem>
                  
                  <Collapse in={expandedId === source.id} timeout="auto" unmountOnExit>
                    <Box sx={{ p: 2, pt: 0 }}>
                      <Divider sx={{ my: 1 }} />
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2">URL</Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {source.url}
                          </Typography>
                          
                          <Typography variant="subtitle2">Method</Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {source.method}
                          </Typography>
                          
                          <Typography variant="subtitle2">Authentication</Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {source.auth_required ? 
                              `${source.auth_type || 'Bearer'} Authentication` : 
                              'No authentication required'}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2">Headers</Typography>
                          {Object.keys(source.headers || {}).length > 0 ? (
                            <List dense>
                              {Object.entries(source.headers || {}).map(([key, value]) => (
                                <ListItem key={key} dense>
                                  <ListItemText
                                    primary={`${key}: ${value}`}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          ) : (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              No custom headers
                            </Typography>
                          )}
                        </Grid>
                      </Grid>
                      
                      {testResult && testResult.success === true && testResult.data && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2">Sample Response</Typography>
                          <Paper variant="outlined" sx={{ p: 1, bgcolor: '#f5f5f5' }}>
                            <pre style={{ margin: 0, overflow: 'auto', maxHeight: '200px' }}>
                              {JSON.stringify(testResult.data, null, 2)}
                            </pre>
                          </Paper>
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </Paper>
              ))}
            </List>
          )}
          
          {testResult && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">Test Result</Typography>
              <Paper sx={{ p: 2, bgcolor: testResult.success ? '#edf7ed' : '#fdeded' }}>
                <Typography variant="subtitle1" color={testResult.success ? 'success.main' : 'error.main'}>
                  {testResult.success ? 'Success' : 'Error'}
                </Typography>
                {testResult.error && (
                  <Typography variant="body2" color="error">
                    {testResult.error}
                  </Typography>
                )}
                {testResult.success && testResult.status && (
                  <Typography variant="body2">
                    Status: {testResult.status}
                  </Typography>
                )}
              </Paper>
            </Box>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            {editMode ? 'Edit Data Source' : 'Add New Data Source'}
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Name"
                name="name"
                value={newSource.name}
                onChange={handleInputChange}
                fullWidth
                required
                helperText="A descriptive name for this data source"
              />
            </Grid>
            
            <Grid item xs={12} md={9}>
              <TextField
                label="URL"
                name="url"
                value={newSource.url}
                onChange={handleInputChange}
                fullWidth
                required
                helperText="The API endpoint URL"
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Method</InputLabel>
                <Select
                  value={newSource.method}
                  onChange={handleMethodChange}
                >
                  <MenuItem value="GET">GET</MenuItem>
                  <MenuItem value="POST">POST</MenuItem>
                  <MenuItem value="PUT">PUT</MenuItem>
                  <MenuItem value="DELETE">DELETE</MenuItem>
                  <MenuItem value="PATCH">PATCH</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Authentication
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={newSource.auth_required || false}
                    onChange={handleAuthRequiredChange}
                    name="auth_required"
                  />
                }
                label="Requires Authentication"
              />
            </Grid>
            
            {newSource.auth_required && (
              <>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Authentication Type</InputLabel>
                    <Select
                      value={newSource.auth_type || 'bearer'}
                      onChange={handleAuthTypeChange}
                    >
                      <MenuItem value="basic">Basic Auth</MenuItem>
                      <MenuItem value="bearer">Bearer Token</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                {newSource.auth_type === 'basic' ? (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Username"
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                        fullWidth
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Password"
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        fullWidth
                        required
                      />
                    </Grid>
                  </>
                ) : newSource.auth_type === 'bearer' ? (
                  <Grid item xs={12}>
                    <TextField
                      label="Token"
                      value={authToken}
                      onChange={(e) => setAuthToken(e.target.value)}
                      fullWidth
                      required
                    />
                  </Grid>
                ) : null}
              </>
            )}
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Headers
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  label="Header Name"
                  value={headerKey}
                  onChange={(e) => setHeaderKey(e.target.value)}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Value"
                  value={headerValue}
                  onChange={(e) => setHeaderValue(e.target.value)}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="outlined"
                  onClick={addHeader}
                  disabled={!headerKey.trim()}
                >
                  Add
                </Button>
              </Box>
              
              {Object.keys(newSource.headers || {}).length > 0 ? (
                <List dense sx={{ bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  {Object.entries(newSource.headers || {}).map(([key, value]) => (
                    <ListItem key={key}>
                      <ListItemText
                        primary={key}
                        secondary={value as string}
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end" aria-label="delete" onClick={() => removeHeader(key)}>
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No headers added
                </Typography>
              )}
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveSource}
                  disabled={!isFormValid()}
                >
                  {editMode ? 'Update Data Source' : 'Create Data Source'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => handleTestDataSource(newSource)}
                  disabled={!isFormValid() || testLoading}
                  startIcon={testLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                  sx={{ ml: 'auto' }}
                >
                  Test Connection
                </Button>
              </Box>
            </Grid>
          </Grid>
          
          {testResult && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6">Test Result</Typography>
              <Paper sx={{ p: 2, bgcolor: testResult.success ? '#edf7ed' : '#fdeded' }}>
                <Typography variant="subtitle1" color={testResult.success ? 'success.main' : 'error.main'}>
                  {testResult.success ? 'Success' : 'Error'}
                </Typography>
                {testResult.error && (
                  <Typography variant="body2" color="error">
                    {testResult.error}
                  </Typography>
                )}
                {testResult.success && testResult.status && (
                  <Typography variant="body2">
                    Status: {testResult.status}
                  </Typography>
                )}
                {testResult.success && testResult.data && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Response Data</Typography>
                    <Paper variant="outlined" sx={{ p: 1, bgcolor: '#f5f5f5' }}>
                      <pre style={{ margin: 0, overflow: 'auto', maxHeight: '200px' }}>
                        {JSON.stringify(testResult.data, null, 2)}
                      </pre>
                    </Paper>
                  </Box>
                )}
              </Paper>
            </Box>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h5" gutterBottom>
            Data Sources Documentation
          </Typography>
          
          <Typography variant="body1" paragraph>
            Data sources allow you to connect your forms to external data using RESTful APIs. 
            They can be used to populate dropdown options, load data dynamically, and more.
          </Typography>
          
          <Typography variant="h6" gutterBottom>
            Creating a Data Source
          </Typography>
          
          <Typography variant="body1" paragraph>
            To create a data source, you need to provide:
          </Typography>
          
          <ul>
            <li>
              <Typography variant="body1">
                <strong>Name:</strong> A descriptive name for the data source
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>URL:</strong> The API endpoint that will return the data
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>Method:</strong> HTTP method to use (GET, POST, PUT, DELETE)
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>Authentication:</strong> Optional authentication method
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>Headers:</strong> Optional HTTP headers to include in the request
              </Typography>
            </li>
          </ul>
          
          <Typography variant="h6" gutterBottom>
            Using Data Sources in Forms
          </Typography>
          
          <Typography variant="body1" paragraph>
            Data sources can be used with the following form components:
          </Typography>
          
          <ul>
            <li>
              <Typography variant="body1">
                <strong>Select:</strong> Populate dropdown options from an API
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>Radio:</strong> Load radio button options dynamically
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>Checkbox:</strong> Create dynamic checkbox groups
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>Select Boxes:</strong> Multi-select options from an API
              </Typography>
            </li>
          </ul>
          
          <Typography variant="h6" gutterBottom>
            Expected API Response Format
          </Typography>
          
          <Typography variant="body1" paragraph>
            Your API should return data in one of these formats:
          </Typography>
          
          <Typography variant="subtitle2">Array of Objects with Value/Label Properties</Typography>
          <Paper sx={{ p: 2, my: 1, bgcolor: '#f5f5f5' }}>
            <pre style={{ margin: 0, overflow: 'auto' }}>
{`[
  { "value": "1", "label": "Option One" },
  { "value": "2", "label": "Option Two" },
  { "value": "3", "label": "Option Three" }
]`}
            </pre>
          </Paper>
          
          <Typography variant="subtitle2">Simple Array (values will be used as labels)</Typography>
          <Paper sx={{ p: 2, my: 1, bgcolor: '#f5f5f5' }}>
            <pre style={{ margin: 0, overflow: 'auto' }}>
{`["Option One", "Option Two", "Option Three"]`}
            </pre>
          </Paper>
          
          <Typography variant="subtitle2">Object with Properties (keys as values, values as labels)</Typography>
          <Paper sx={{ p: 2, my: 1, bgcolor: '#f5f5f5' }}>
            <pre style={{ margin: 0, overflow: 'auto' }}>
{`{
  "1": "Option One",
  "2": "Option Two",
  "3": "Option Three"
}`}
            </pre>
          </Paper>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Authentication Options
          </Typography>
          
          <Typography variant="subtitle2">Basic Authentication</Typography>
          <Typography variant="body1" paragraph>
            Provides a username and password that are encoded and sent in the Authorization header.
          </Typography>
          
          <Typography variant="subtitle2">Bearer Token</Typography>
          <Typography variant="body1" paragraph>
            Sends an Authorization header with a Bearer token, commonly used with OAuth 2.0 and JWT.
          </Typography>
        </TabPanel>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DataSourcesManager;
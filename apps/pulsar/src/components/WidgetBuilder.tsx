import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Box,
  Chip,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  AppBar,
  Tabs,
  Tab,
  Snackbar
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIndicatorIcon,
  Build as BuildIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { parseWidgetConfig, type UE5WidgetConfig } from '../types/widget';

interface WidgetBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  widgetId?: string;
  widgetName?: string;
}

interface RCPVariable {
  name: string;
  type: string;
  value: any;
  presetId: string;
  presetName: string;
  propertyId?: string;
}

interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: any;
  rcpVariable?: RCPVariable;
}

export const WidgetBuilder: React.FC<WidgetBuilderProps> = ({
  isOpen,
  onClose,
  widgetId,
  widgetName
}) => {
  const [widgetConfig, setWidgetConfig] = useState<UE5WidgetConfig | null>(null);
  const [rcpVariables, setRcpVariables] = useState<RCPVariable[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [usedRcpVariables, setUsedRcpVariables] = useState<Set<string>>(new Set());

  // Load widget data when dialog opens
  useEffect(() => {
    if (isOpen && widgetId) {
      loadWidgetData();
    }
  }, [isOpen, widgetId]);

  // Track used RCP variables
  useEffect(() => {
    const used = new Set<string>();
    formFields.forEach(field => {
      if (field.rcpVariable) {
        used.add(`${field.rcpVariable.presetId}_${field.rcpVariable.name}`);
      }
    });
    setUsedRcpVariables(used);
  }, [formFields]);

  const loadWidgetData = async () => {
    if (!widgetId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('id', widgetId)
        .eq('type', 'widget')
        .single();

      if (error) throw error;

      // Parse widget configuration
      if (data.config) {
        const config = parseWidgetConfig(data.config);
        setWidgetConfig(config);
        
        // Load RCP variables from the selected presets
        await loadRCPVariables(config as UE5WidgetConfig);
      }
      
      // Load existing form configuration if any
      if (data.form_config) {
        setFormFields(data.form_config.fields || []);
      }
    } catch (err) {
      console.error('Error loading widget:', err);
      setError(err instanceof Error ? err.message : 'Failed to load widget');
    } finally {
      setLoading(false);
    }
  };

  const loadRCPVariables = async (config: UE5WidgetConfig) => {
    // This would normally fetch from an RCP scanning endpoint
    // For now, using mock data
    const mockRcpVariables: RCPVariable[] = config.selectedRcps.map((rcp, index) => {
      const presetId = `preset_${index}`;
      const presetName = rcp.split('/').pop() || rcp;
      
      return [
        { name: 'title', type: 'text', value: '', presetId, presetName },
        { name: 'subtitle', type: 'text', value: '', presetId, presetName },
        { name: 'value', type: 'number', value: 0, presetId, presetName },
        { name: 'active', type: 'boolean', value: false, presetId, presetName }
      ];
    }).flat();

    setRcpVariables(mockRcpVariables);
  };

  const handleAddRcpVariable = (variable: RCPVariable) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      name: variable.name,
      label: variable.name,
      type: variable.type as FormField['type'],
      required: false,
      defaultValue: variable.value,
      rcpVariable: variable
    };
    setFormFields(prev => [...prev, newField]);
  };

  const handleAddBasicField = (type: FormField['type'], label: string) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      name: '',
      label: label,
      type: type,
      required: false,
      placeholder: ''
    };
    setFormFields(prev => [...prev, newField]);
  };

  const updateFormField = (fieldId: string, updates: Partial<FormField>) => {
    setFormFields(prev => prev.map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    ));
  };

  const deleteFormField = (fieldId: string) => {
    setFormFields(prev => prev.filter(field => field.id !== fieldId));
  };

  const handleSave = async () => {
    if (!widgetId) return;

    setSaving(true);
    try {
      const formConfig = {
        fields: formFields,
        settings: {
          theme: 'default',
          submitButtonText: 'Submit',
          resetButtonText: 'Reset'
        }
      };

      const { error } = await supabase
        .from('content')
        .update({ 
          form_config: formConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', widgetId);

      if (error) throw error;

      setSnackbarMessage('Form configuration saved successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Error saving form configuration:', err);
      setSnackbarMessage('Failed to save form configuration');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const handleTestForm = async () => {
    try {
      const testData: any = {};
      formFields.forEach(field => {
        testData[field.name || field.id] = field.defaultValue || '';
      });

      console.log('Test form submission:', testData);
      setSnackbarMessage('Test form submission successful');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error testing form submission:', error);
      setSnackbarMessage('Test form submission failed');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const renderFormBuilder = () => (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Left Panel: Component Palette */}
      <Box sx={{ 
        width: 250, 
        borderRight: '1px solid #e0e0e0', 
        p: 2, 
        backgroundColor: '#f8f9fa',
        overflowY: 'auto'
      }}>
        <Typography variant="h6" gutterBottom>Components</Typography>
        
        {/* Search Field */}
        <TextField
          label="Search field(s)"
          size="small"
          fullWidth
          sx={{ mb: 2 }}
        />
        
        {/* RCP Variables Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2">RCP Variables</Typography>
          <IconButton 
            size="small" 
            onClick={() => loadRCPVariables(widgetConfig!)}
            sx={{ 
              p: 0.5,
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
            title="Refresh RCPs"
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
        
        <Box sx={{ maxHeight: 400, overflowY: 'auto', mb: 3 }}>
          {rcpVariables.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ p: 2, textAlign: 'center' }}>
              No RCP variables loaded
            </Typography>
          ) : (
            <Box>
              {Array.from(new Set(rcpVariables.map(v => v.presetName))).map(presetName => (
                <Accordion key={presetName} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {presetName}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {rcpVariables.filter(v => v.presetName === presetName).map(variable => {
                        const varKey = `${variable.presetId}_${variable.name}`;
                        const isUsed = usedRcpVariables.has(varKey);
                        const isImageGenField = variable.name.startsWith('*');
                        const displayType = isImageGenField ? 'img' : variable.type;
                        
                        return (
                          <Button
                            key={varKey}
                            variant="outlined"
                            size="small"
                            disabled={isUsed}
                            onClick={() => !isUsed && handleAddRcpVariable(variable)}
                            startIcon={<DragIndicatorIcon />}
                            sx={{
                              justifyContent: 'flex-start',
                              textTransform: 'none',
                              fontSize: '11px',
                              height: 28,
                              px: 1,
                              backgroundColor: isUsed ? '#f5f5f5' : 'transparent',
                              opacity: isUsed ? 0.5 : 1,
                              cursor: isUsed ? 'not-allowed' : 'pointer',
                              '& .MuiButton-startIcon': { mr: 0.5 }
                            }}
                          >
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                              <span style={{ fontWeight: 'bold' }}>{variable.name}</span>
                              <span style={{ fontSize: '9px', color: isUsed ? '#999' : (isImageGenField ? '#9c27b0' : '#666') }}>
                                {displayType}
                              </span>
                            </Box>
                          </Button>
                        );
                      })}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </Box>

        {/* Basic Components Section */}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Basic</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {[
            { type: 'text', label: 'Text Field' },
            { type: 'textarea', label: 'Text Area' },
            { type: 'number', label: 'Number' },
            { type: 'boolean', label: 'Checkbox' },
            { type: 'select', label: 'Select' }
          ].map(component => (
            <Button
              key={component.type}
              variant="outlined"
              size="small"
              startIcon={<DragIndicatorIcon />}
              onClick={() => handleAddBasicField(component.type as FormField['type'], component.label)}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                fontSize: '11px',
                height: 28,
                px: 1,
                borderColor: '#1976d2',
                color: '#1976d2',
                '& .MuiButton-startIcon': { mr: 0.5 }
              }}
            >
              {component.label}
            </Button>
          ))}
        </Box>
      </Box>

      {/* Right Panel: Form Canvas */}
      <Box sx={{ flex: 1, p: 2 }}>
        {/* Drag and Drop Zone */}
        <Box sx={{
          border: '2px dashed #1976d2',
          borderRadius: 2,
          p: 5,
          textAlign: 'center',
          backgroundColor: '#f0f8ff',
          mb: 2
        }}>
          <Typography variant="body1" color="primary">
            Drag and Drop a form component
          </Typography>
        </Box>

        {/* Form Fields */}
        <Box sx={{ minHeight: 300 }}>
          {formFields.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', mt: 4 }}>
              No form fields added yet. Add components from the left panel.
            </Typography>
          ) : (
            formFields.map((field) => (
              <Card key={field.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">
                      {field.rcpVariable ? (
                        <Chip 
                          label={`RCP: ${field.rcpVariable.presetName}`} 
                          size="small" 
                          color="primary"
                          sx={{ mr: 1 }}
                        />
                      ) : (
                        <Chip 
                          label={field.type} 
                          size="small" 
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                      )}
                      {field.label || 'Untitled Field'}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => deleteFormField(field.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>

                  {/* Field Configuration */}
                  {field.rcpVariable ? (
                    // Read-only for RCP variables
                    (<Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          label="RCP Variable"
                          value={field.rcpVariable.name}
                          fullWidth
                          size="small"
                          InputProps={{ readOnly: true }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Type"
                          value={field.rcpVariable.type}
                          fullWidth
                          size="small"
                          InputProps={{ readOnly: true }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Default Value"
                          value={field.defaultValue || '(empty)'}
                          fullWidth
                          size="small"
                          InputProps={{ readOnly: true }}
                        />
                      </Grid>
                    </Grid>)
                  ) : (
                    // Editable fields for custom components
                    (<Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          label="Field Name"
                          value={field.name}
                          onChange={(e) => updateFormField(field.id, { name: e.target.value })}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Label"
                          value={field.label}
                          onChange={(e) => updateFormField(field.id, { label: e.target.value })}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.required}
                              onChange={(e) => updateFormField(field.id, { required: e.target.checked })}
                              size="small"
                            />
                          }
                          label="Required"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Placeholder"
                          value={field.placeholder || ''}
                          onChange={(e) => updateFormField(field.id, { placeholder: e.target.value })}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                    </Grid>)
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );

  const renderPreview = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>Form Preview</Typography>
      <Card sx={{ p: 3 }}>
        <form>
          {formFields.map(field => (
            <Box key={field.id} sx={{ mb: 3 }}>
              {field.type === 'text' && (
                <TextField
                  label={field.label}
                  placeholder={field.placeholder}
                  required={field.required}
                  fullWidth
                  variant="outlined"
                />
              )}
              {field.type === 'textarea' && (
                <TextField
                  label={field.label}
                  placeholder={field.placeholder}
                  required={field.required}
                  multiline
                  rows={4}
                  fullWidth
                  variant="outlined"
                />
              )}
              {field.type === 'number' && (
                <TextField
                  label={field.label}
                  placeholder={field.placeholder}
                  required={field.required}
                  type="number"
                  fullWidth
                  variant="outlined"
                />
              )}
              {field.type === 'boolean' && (
                <FormControlLabel
                  control={<Switch />}
                  label={field.label}
                />
              )}
              {field.type === 'select' && (
                <FormControl fullWidth>
                  <InputLabel>{field.label}</InputLabel>
                  <Select label={field.label} required={field.required}>
                    {field.options?.map(opt => (
                      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          ))}
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button variant="contained" color="primary" onClick={handleTestForm}>
              Submit
            </Button>
            <Button variant="outlined" type="reset">
              Reset
            </Button>
          </Box>
        </form>
      </Card>
    </Box>
  );

  if (loading) {
    return (
      <Dialog open={isOpen} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogContent sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: 400 
        }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog 
        open={isOpen} 
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            maxHeight: 900,
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Widget Builder - {widgetName || 'Untitled'}
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        {error && (
          <Alert severity="error" sx={{ mx: 3, mb: 2 }}>
            <strong>Error:</strong> {error}
          </Alert>
        )}

        {widgetConfig && (
          <Alert severity="info" sx={{ mx: 3, mb: 2 }}>
            <strong>Widget:</strong> {widgetName}<br />
            <strong>Channel:</strong> {widgetConfig.connectionSettings.host}:{widgetConfig.connectionSettings.port}<br />
            <strong>RCP Presets:</strong> {widgetConfig.selectedRcps.length} selected
          </Alert>
        )}

        <AppBar position="static" color="default" elevation={0} sx={{ px: 3 }}>
          <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)} indicatorColor="primary" textColor="primary">
            <Tab label="Form Builder" icon={<BuildIcon />} iconPosition="start" />
            <Tab label="Preview" icon={<VisibilityIcon />} iconPosition="start" />
          </Tabs>
        </AppBar>

        <DialogContent sx={{ flex: 1, p: 0 }}>
          {activeTab === 0 && renderFormBuilder()}
          {activeTab === 1 && renderPreview()}
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};
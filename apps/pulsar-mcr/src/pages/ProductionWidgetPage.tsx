import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Typography,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import SendIcon from '@mui/icons-material/Send';
import BuildIcon from '@mui/icons-material/Build';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import { supabase } from '../lib/supabase';
import { parseWidgetConfig, type ContentItem, type UE5WidgetConfig } from '../types/widget';
import { loadAIImageGenSettings, callGoogleAPIViaProxy } from '../types/aiImageGen';

// Define the ref interface
export interface ProductionWidgetPageRef {
  openWidget: (widgetId: string) => void;
}

interface ProductionWidgetPageProps {
  widgetId?: string;
}

interface RCPVariable {
  name: string;
  type: string;
  value: any;
  presetId: string;
  presetName: string;
  propertyId?: string; // The actual property ID from RCP system
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

const ProductionWidgetPageComponent: React.ForwardRefRenderFunction<ProductionWidgetPageRef, ProductionWidgetPageProps> = (props, ref) => {
  const [selectedWidget, setSelectedWidget] = useState<ContentItem | null>(null);
  const [widgetConfig, setWidgetConfig] = useState<UE5WidgetConfig | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isAIImageGenOpen, setIsAIImageGenOpen] = useState(false);
  const [selectedRCPField, setSelectedRCPField] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Open widget in production mode
  const openWidget = useCallback(async (widgetId: string) => {
    console.log('ProductionWidgetPage: openWidget called with widgetId:', widgetId);
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('id', widgetId)
        .eq('type', 'widget')
        .single();

      if (error) throw error;

      console.log('ProductionWidgetPage: Widget data loaded:', data);
      setSelectedWidget(data);
      
      if (data.config) {
        const config = parseWidgetConfig(data.config);
        console.log('ProductionWidgetPage: Parsed config:', config);
        setWidgetConfig(config);

        // Load form fields and values
        if (config && config.formFields && config.formFields.length > 0) {
          setFormFields(config.formFields);

          // Load saved form values
          if (config.formValues) {
            console.log('ProductionWidgetPage: Loading saved form values:', config.formValues);
            setFormValues(config.formValues);
          }
        }

        // Check connection
        if (config) {
          await checkConnection(config);
        }
      }
    } catch (err) {
      console.error('Error loading widget:', err);
      setError(err instanceof Error ? err.message : 'Failed to load widget');
    } finally {
      setLoading(false);
    }
  }, []);

  // Connection check
  const checkConnection = async (config: UE5WidgetConfig | null) => {
    if (!config) return;

    setIsConnecting(true);
    try {
      const { host, port } = config.connectionSettings;
      // Remove http:// or https:// from host if present
      const cleanHost = host.replace(/^https?:\/\//, '');
      const baseUrl = `http://${cleanHost}:${port}`;
      
      const response = await fetch(`${baseUrl}/remote/info`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        setIsConnected(true);
        setSnackbarMessage('✅ Connected to Unreal Engine');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      setIsConnected(false);
      console.error('Connection check failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Send field to Unreal
  const sendFieldToUnreal = async (field: FormField, value: any) => {
    if (!widgetConfig || !isConnected) {
      setSnackbarMessage('⚠️ Not connected to Unreal Engine');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    if (!field.rcpVariable) {
      setSnackbarMessage('⚠️ Field is not linked to an RCP variable');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    try {
      const { host, port } = widgetConfig.connectionSettings;
      // Remove http:// or https:// from host if present
      const cleanHost = host.replace(/^https?:\/\//, '');
      const baseUrl = `http://${cleanHost}:${port}`;
      
      const preset = widgetConfig.rcpPresets.find(p => p.ID === field.rcpVariable!.presetId);
      if (!preset) {
        throw new Error('Preset not found for field');
      }

      // Use PRESET_ID instead of preset.Name, and use the actual property ID
      const url = `${baseUrl}/remote/preset/${preset.ID}/property/${field.rcpVariable.propertyId || field.rcpVariable.name}`;
      const requestBody = { propertyValue: value };
      
      // DEBUG: Log the request details
      console.log('🔍 [DEBUG] Individual PUT Request Details:');
      console.log('  URL:', url);
      console.log('  Method: PUT');
      console.log('  Headers:', { 'Content-Type': 'application/json' });
      console.log('  Body:', JSON.stringify(requestBody, null, 2));
      console.log('  Field Info:', {
        fieldName: field.name,
        fieldLabel: field.label,
        presetId: preset.ID,
        presetName: preset.Name,
        propertyId: field.rcpVariable.propertyId,
        propertyName: field.rcpVariable.name,
        value: value
      });
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      // DEBUG: Log the response details
      console.log('🔍 [DEBUG] Response Details:');
      console.log('  Status:', response.status, response.statusText);
      console.log('  Headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('  Response Body:', responseText);

      if (response.ok) {
        console.log('✅ [DEBUG] Request successful');
        setSnackbarMessage(`✅ Sent "${field.label || field.name}" to Unreal`);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        console.log('❌ [DEBUG] Request failed');
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: { message: 'Unknown error' } };
        }
        console.log('  Error Data:', errorData);
        throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
      }
    } catch (error) {
      console.error('❌ [DEBUG] Failed to send field to Unreal:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send to Unreal';
      setSnackbarMessage(`❌ ${errorMessage}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Send all fields to Unreal using batch endpoint
  const sendAllFieldsToUnreal = async () => {
    if (!widgetConfig || !isConnected) {
      setSnackbarMessage('⚠️ Not connected to Unreal Engine');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    // Collect all fields with values and RCP variables
    const fieldsToSend = formFields.filter(field => 
      field.rcpVariable && 
      formValues[field.id] !== undefined && 
      formValues[field.id] !== null && 
      formValues[field.id] !== ''
    );

    if (fieldsToSend.length === 0) {
      setSnackbarMessage('⚠️ No fields with values to send');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    try {
      const { host, port } = widgetConfig.connectionSettings;
      // Remove http:// or https:// from host if present
      const cleanHost = host.replace(/^https?:\/\//, '');
      const baseUrl = `http://${cleanHost}:${port}`;
      
      // Build batch requests array
      const requests = fieldsToSend.map((field, index) => {
        const preset = widgetConfig.rcpPresets.find(p => p.ID === field.rcpVariable!.presetId);
        if (!preset) {
          throw new Error(`Preset not found for field ${field.name}`);
        }

        return {
          RequestId: index + 1,
          URL: `/remote/preset/${preset.ID}/property/${field.rcpVariable!.propertyId || field.rcpVariable!.name}`,
          Verb: 'PUT',
          Body: {
            propertyValue: formValues[field.id]
          }
        };
      });

      // Send batch request
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json'
      };
      
      // Add passphrase if configured
      if (widgetConfig.connectionSettings.passphrase) {
        headers['Passphrase'] = widgetConfig.connectionSettings.passphrase;
      }
      
      const batchBody = { Requests: requests };
      
      // DEBUG: Log the batch request details
      console.log('🔍 [DEBUG] Batch PUT Request Details:');
      console.log('  URL:', `${baseUrl}/remote/batch`);
      console.log('  Method: PUT');
      console.log('  Headers:', headers);
      console.log('  Body:', JSON.stringify(batchBody, null, 2));
      console.log('  Fields to Send:', fieldsToSend.length);
      
      const response = await fetch(`${baseUrl}/remote/batch`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(batchBody)
      });

      if (response.ok) {
        setSnackbarMessage(`✅ Sent ${fieldsToSend.length} field${fieldsToSend.length > 1 ? 's' : ''} to Unreal via batch`);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send batch to Unreal:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send batch to Unreal';
      setSnackbarMessage(`❌ ${errorMessage}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // AI Image Generation
  const openAIImageGen = (fieldId: string) => {
    setSelectedRCPField(fieldId);
    setIsAIImageGenOpen(true);
  };

  const generateImage = async () => {
    if (!aiPrompt.trim() || !selectedRCPField) {
      setSnackbarMessage('Please enter a prompt and select an RCP field');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    setIsGenerating(true);

    try {
      const aiSettings = await loadAIImageGenSettings();

      if (!aiSettings.imagen.apiKey || aiSettings.imagen.apiKey === 'YOUR_GOOGLE_STUDIO_API_KEY') {
        throw new Error('Please configure your Google Studio API key in Settings');
      }

      const getDimensions = (ratio: string) => {
        switch (ratio) {
          case '9:16': return { width: 1080, height: 1920 };
          case '16:9': return { width: 1920, height: 1080 };
          case '1:1': return { width: 1024, height: 1024 };
          default: return { width: 1080, height: 1920 };
        }
      };

      const { width, height } = getDimensions(aspectRatio);
      let finalPrompt = `Generate an image: ${aiPrompt}. Aspect ratio: ${aspectRatio} (${width}x${height})`;

      if (aiSettings.virtualSet.promptEnhancement && aiSettings.virtualSet.promptEnhancement.trim()) {
        if (aiSettings.virtualSet.promptEnhancement.includes('{prompt}')) {
          finalPrompt = aiSettings.virtualSet.promptEnhancement
            .replace(/\{prompt\}/g, aiPrompt)
            .replace(/\{aspectRatio\}/g, aspectRatio)
            .replace(/\{width\}/g, width.toString())
            .replace(/\{height\}/g, height.toString());
        } else {
          finalPrompt = `${aiPrompt}. ${aiSettings.virtualSet.promptEnhancement}. Aspect ratio: ${aspectRatio} (${width}x${height})`;
        }
      }

      const apiUrl = `${aiSettings.imagen.baseUrl}/v1beta/models/${aiSettings.imagen.model}:generateContent?key=${aiSettings.imagen.apiKey}`;

      const requestBody = {
        contents: [{
          parts: [{ text: finalPrompt }]
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096,
        }
      };

      const data = await callGoogleAPIViaProxy(apiUrl, 'POST', { 'Content-Type': 'application/json' }, requestBody);
      
      if (data.candidates && data.candidates[0]?.content?.parts) {
        const imagePart = data.candidates[0].content.parts.find((part: any) => part.inlineData?.data);
        if (imagePart?.inlineData?.data) {
          const base64Image = `data:image/png;base64,${imagePart.inlineData.data}`;
          setGeneratedImageUrl(base64Image);
          setSnackbarMessage('✅ Image generated successfully!');
          setSnackbarSeverity('success');
          setSnackbarOpen(true);
        }
      }
    } catch (error) {
      console.error('Image generation failed:', error);
      setSnackbarMessage(`❌ ${error instanceof Error ? error.message : 'Image generation failed'}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-open widget when widgetId prop is provided
  useEffect(() => {
    if (props.widgetId) {
      openWidget(props.widgetId);
    }
  }, [props.widgetId, openWidget]);

  // Expose functions via ref
  useImperativeHandle(ref, () => ({
    openWidget
  }));

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert severity="error">{error}</Alert>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Typography variant="h6">Production Widget{selectedWidget && `: ${selectedWidget.name}`}</Typography>
            {!isAIImageGenOpen && (
              <Button
                variant="text"
                size="small"
                onClick={() => setIsAIImageGenOpen(true)}
                startIcon={<VisibilityIcon />}
                style={{ 
                  textTransform: 'none',
                  fontSize: '11px',
                  padding: '2px 8px'
                }}
              >
                Show AI Image Gen
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button 
              variant="contained" 
              color="primary"
              disabled={!isConnected || formFields.length === 0}
              onClick={sendAllFieldsToUnreal}
              size="small"
            >
              ▶️ Send to Unreal
            </Button>
            <Button 
              variant={isConnected ? 'contained' : 'outlined'}
              color={isConnected ? 'success' as any : 'primary'}
              startIcon={<WifiIcon />}
              onClick={() => checkConnection(widgetConfig)}
              disabled={isConnecting}
              size="small"
            >
              {isConnecting ? 'Connecting...' : (isConnected ? 'Connected' : 'Disconnected')}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', gap: '16px', height: 'calc(100vh - 200px)', padding: '16px' }}>
        {/* Form Preview - Left Side */}
        <div style={{ flex: isAIImageGenOpen ? 1 : 1, width: isAIImageGenOpen ? 'auto' : '100%' }}>
          <Card style={{ height: '100%' }}>
            <CardContent style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>Widget Controls</Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Fill in values and send commands to Unreal Engine
              </Typography>
            
              <div style={{ flex: 1, overflow: 'auto' }}>
                {formFields.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <BuildIcon fontSize="large" />
                    <Typography variant="body1" style={{ marginTop: '16px' }}>
                      No fields configured
                    </Typography>
                    <Typography variant="body2" style={{ marginTop: '8px' }}>
                      Configure fields in the Widget Builder first
                    </Typography>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
                    {formFields.map(field => (
                      <div key={field.id}>
                        {field.type === 'text' && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                              <TextField
                                label={field.label || field.name}
                                value={formValues[field.id] || ''}
                                onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                placeholder={field.placeholder}
                                required={field.required}
                                fullWidth
                              />
                              {field.name.startsWith('*') && !isAIImageGenOpen && (
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() => openAIImageGen(field.id)}
                                  startIcon={<VisibilityIcon style={{ fontSize: '14px' }} />}
                                  style={{ 
                                    position: 'absolute',
                                    right: '8px',
                                    top: '12px',
                                    minWidth: 'auto',
                                    padding: '4px 10px',
                                    fontSize: '11px',
                                    height: '26px',
                                    textTransform: 'none',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    fontWeight: '500'
                                  }}
                                >
                                  AI Gen
                                </Button>
                              )}
                            </div>
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => sendFieldToUnreal(field, formValues[field.id])}
                              disabled={!isConnected || !field.rcpVariable}
                              style={{ 
                                marginTop: '8px',
                                backgroundColor: isConnected && field.rcpVariable ? '#eff6ff' : 'transparent',
                                border: `1px solid ${isConnected && field.rcpVariable ? '#bfdbfe' : '#d1d5db'}`,
                              }}
                              title="Send to UE5"
                            >
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </div>
                        )}
                        {field.type === 'textarea' && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <TextField
                              label={field.label || field.name}
                              value={formValues[field.id] || ''}
                              onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                              placeholder={field.placeholder}
                              required={field.required}
                              fullWidth
                              multiline
                              rows={3}
                            />
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => sendFieldToUnreal(field, formValues[field.id])}
                              disabled={!isConnected || !field.rcpVariable}
                              style={{ 
                                marginTop: '8px',
                                backgroundColor: isConnected && field.rcpVariable ? '#eff6ff' : 'transparent',
                                border: `1px solid ${isConnected && field.rcpVariable ? '#bfdbfe' : '#d1d5db'}`,
                              }}
                              title="Send to UE5"
                            >
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </div>
                        )}
                        {field.type === 'number' && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <TextField
                              label={field.label || field.name}
                              type="number"
                              value={formValues[field.id] || ''}
                              onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                              placeholder={field.placeholder}
                              required={field.required}
                              fullWidth
                            />
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => sendFieldToUnreal(field, formValues[field.id])}
                              disabled={!isConnected || !field.rcpVariable}
                              style={{ 
                                marginTop: '8px',
                                backgroundColor: isConnected && field.rcpVariable ? '#eff6ff' : 'transparent',
                                border: `1px solid ${isConnected && field.rcpVariable ? '#bfdbfe' : '#d1d5db'}`,
                              }}
                              title="Send to UE5"
                            >
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </div>
                        )}
                        {field.type === 'boolean' && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={formValues[field.id] || false}
                                  onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.checked }))}
                                />
                              }
                              label={field.label || field.name}
                              style={{ flex: 1 }}
                            />
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => sendFieldToUnreal(field, formValues[field.id])}
                              disabled={!isConnected || !field.rcpVariable}
                              style={{ 
                                backgroundColor: isConnected && field.rcpVariable ? '#eff6ff' : 'transparent',
                                border: `1px solid ${isConnected && field.rcpVariable ? '#bfdbfe' : '#d1d5db'}`,
                              }}
                              title="Send to UE5"
                            >
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </div>
                        )}
                        {field.type === 'select' && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <FormControl fullWidth>
                              <InputLabel>{field.label || field.name}</InputLabel>
                              <Select
                                value={formValues[field.id] || ''}
                                onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                              >
                                {(field.options || ['Option 1', 'Option 2', 'Option 3']).map(opt => (
                                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => sendFieldToUnreal(field, formValues[field.id])}
                              disabled={!isConnected || !field.rcpVariable}
                              style={{ 
                                marginTop: '8px',
                                backgroundColor: isConnected && field.rcpVariable ? '#eff6ff' : 'transparent',
                                border: `1px solid ${isConnected && field.rcpVariable ? '#bfdbfe' : '#d1d5db'}`,
                              }}
                              title="Send to UE5"
                            >
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Image Gen - Right Side */}
        {isAIImageGenOpen && (
          <div style={{ width: '350px' }}>
            <Card style={{ height: '100%' }}>
              <CardContent style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <Typography variant="h6">Image Gen Settings</Typography>
                  <IconButton
                    size="small"
                    onClick={() => setIsAIImageGenOpen(false)}
                    style={{
                      padding: '4px',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                    title="Hide AI Image Gen"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {/* RCP Field Selection */}
                  <div>
                    <FormControl fullWidth size="small">
                      <InputLabel>Select RCP Field</InputLabel>
                      <Select
                        value={selectedRCPField}
                        onChange={(e) => setSelectedRCPField(e.target.value)}
                        label="Select RCP Field"
                      >
                        {formFields
                          .filter(field => field.type === 'text' && field.name.startsWith('*'))
                          .map(field => (
                            <MenuItem key={field.id} value={field.id}>
                              {field.label || field.name}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                    
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={generateImage}
                      disabled={isGenerating || !aiPrompt.trim() || !selectedRCPField}
                      startIcon={isGenerating ? <CircularProgress size={16} /> : <VisibilityIcon />}
                      style={{ 
                        marginTop: '8px', 
                        width: '100%',
                        fontSize: '12px',
                        height: '28px'
                      }}
                    >
                      {isGenerating ? 'Generating...' : 'Generate with AI'}
                    </Button>
                  </div>

                  {/* Prompt Input */}
                  <TextField
                    label="Prompt"
                    multiline
                    rows={2}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe the image..."
                    fullWidth
                    size="small"
                  />

                  {/* Aspect Ratio */}
                  <FormControl fullWidth size="small">
                    <InputLabel>Aspect Ratio</InputLabel>
                    <Select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                      label="Aspect Ratio"
                    >
                      <MenuItem value="9:16">Vertical (9:16)</MenuItem>
                      <MenuItem value="16:9">Horizontal (16:9)</MenuItem>
                      <MenuItem value="1:1">Square (1:1)</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Image Preview */}
                  <div style={{ 
                    flex: 1, 
                    minHeight: '200px', 
                    border: '1px solid #e0e0e0', 
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fafafa'
                  }}>
                    {isGenerating ? (
                      <div style={{ textAlign: 'center' }}>
                        <CircularProgress size={40} />
                        <Typography variant="body2" color="textSecondary" style={{ marginTop: '8px' }}>
                          Generating image...
                        </Typography>
                      </div>
                    ) : generatedImageUrl ? (
                      <div style={{ width: '100%', height: '100%' }}>
                        <img
                          src={generatedImageUrl}
                          alt="Generated AI"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            borderRadius: '8px'
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', color: '#666' }}>
                        <VisibilityIcon style={{ fontSize: '40px', marginBottom: '8px' }} />
                        <Typography variant="body2">No image generated yet</Typography>
                        <Typography variant="caption" color="textSecondary">
                          Enter a prompt and click "Generate with AI"
                        </Typography>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {generatedImageUrl && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={generateImage}
                        startIcon={<RefreshIcon />}
                        style={{ flex: 1, fontSize: '11px', height: '28px' }}
                      >
                        Regenerate
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => {
                          if (selectedRCPField && generatedImageUrl) {
                            setFormValues(prev => ({
                              ...prev,
                              [selectedRCPField]: generatedImageUrl
                            }));
                            setSnackbarMessage('✅ Image applied to selected field!');
                            setSnackbarSeverity('success');
                            setSnackbarOpen(true);
                          }
                        }}
                        style={{ flex: 1, fontSize: '11px', height: '28px' }}
                      >
                        Use this Image
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

const ProductionWidgetPage = forwardRef(ProductionWidgetPageComponent);
export default ProductionWidgetPage;


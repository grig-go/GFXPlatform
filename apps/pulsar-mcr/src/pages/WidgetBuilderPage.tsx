import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
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
  Grid,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WifiIcon from '@mui/icons-material/Wifi';
import RefreshIcon from '@mui/icons-material/Refresh';
import BuildIcon from '@mui/icons-material/Build';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { supabase, sessionReady } from '../lib/supabase';
import { ImageStorageFactory, DEFAULT_IMAGE_CONFIG, ImageStorageProvider, LocalImageStorage } from '../utils/imageStorage';
import { parseWidgetConfig, type ContentItem, type UE5WidgetConfig } from '../types/widget';
import { loadAIImageGenSettings, callGoogleAPIViaProxy } from '../types/aiImageGen';

// Define the ref interface
export interface WidgetBuilderPageRef {
  openWidgetInBuilder: (widgetId: string) => void;
}

interface WidgetBuilderPageProps {
  // Add any props if needed
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


const WidgetBuilderPageComponent: React.ForwardRefRenderFunction<WidgetBuilderPageRef, WidgetBuilderPageProps> = (_props, ref) => {
  const [selectedWidget, setSelectedWidget] = useState<ContentItem | null>(null);
  const [widgetConfig, setWidgetConfig] = useState<UE5WidgetConfig | null>(null);
  const [rcpVariables, setRcpVariables] = useState<RCPVariable[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [usedRcpVariables, setUsedRcpVariables] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'form-builder' | 'preview'>('form-builder');
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
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
  const [generatedImagePath, setGeneratedImagePath] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageStorage] = useState<ImageStorageProvider>(() => {
    const storage = ImageStorageFactory.getInstance();
    // DEBUG: Log cache info on initialization
    if (storage instanceof LocalImageStorage) {
    }
    return storage;
  });
  

  // Expose functions via ref
  const openWidgetInBuilder = useCallback(async (widgetId: string, isNewWidget: boolean = false) => {
    setLoading(true);

    try {
      // Wait for session to be restored from cookies before checking
      await sessionReady;

      // Check session before making the query
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

      if (error) {
        // Handle specific RLS errors
        if (error.message.includes('JWT') || error.message.includes('session') || error.message.includes('expired')) {
          throw new Error('Session expired. Please refresh the page and log in again.');
        }
        throw error;
      }

      setSelectedWidget(data);
      
      // Parse widget configuration
      if (data.config) {
        const config = parseWidgetConfig(data.config);
        setWidgetConfig(config);

        // Load RCP variables from the selected presets (for the left panel)
        if (config) {
          await loadRCPVariables(config);
        }

        // Handle form fields based on whether this is a new widget or existing
        if (isNewWidget && config && config.rcpFields && config.rcpFields.length > 0) {
          // NEW WIDGET: Auto-populate all RCP fields into the form
          const fields: FormField[] = config.rcpFields.map((rcpField, index) => {
            const isImageGenField = rcpField.name.startsWith('*');
            const fieldType = isImageGenField ? 'text' : mapRCPTypeToFieldType(rcpField.type);

            return {
              id: `field_${Date.now()}_${index}`,
              name: rcpField.name,
              label: `${rcpField.presetName} - ${rcpField.name}`,
              type: fieldType,
              required: false,
              placeholder: isImageGenField ? 'Image URL (Generate with AI)' : `Enter ${rcpField.name}`,
              defaultValue: (rcpField as any).value,
              rcpVariable: {
                ...rcpField,
                type: isImageGenField ? 'Image Generation' : rcpField.type,
                value: (rcpField as any).value || ''
              }
            };
          });
          
          setFormFields(fields);
          
          // Mark all loaded RCP variables as used
          const usedKeys = new Set(config.rcpFields?.map(f => `${f.presetId}_${f.name}`) || []);
          setUsedRcpVariables(usedKeys);
        } else if (config && config.formFields && config.formFields.length > 0) {
          // EXISTING WIDGET: Load saved form fields (user's configuration)
          setFormFields(config.formFields);
          
          // Load saved form values from Preview tab
          if (config.formValues) {
            
            // Convert base64 URLs to proper URLs when loading
            const convertedFormValues = { ...config.formValues };
            let convertedCount = 0;
            
            Object.entries(config.formValues).forEach(([fieldId, value]) => {
              if (typeof value === 'string' && value.startsWith('data:image/')) {
                
                // Try to convert this data URL to a proper URL
                const properUrl = imageStorage.convertDataUrlToProperUrl?.(value);
                if (properUrl) {
                  convertedFormValues[fieldId] = properUrl;
                  convertedCount++;
                } else {
                }
              }
            });
            
            if (convertedCount > 0) {
            }
            
            setFormValues(convertedFormValues);
          }
          
          // Mark RCP variables that are in the form as used
          const usedKeys = new Set(
            config.formFields
              ?.filter(f => f.rcpVariable)
              .map(f => `${f.rcpVariable!.presetId}_${f.rcpVariable!.name}`) || []
          );
          setUsedRcpVariables(usedKeys);
        } else {
          // No saved form fields, start with empty form
          setFormFields([]);
          setUsedRcpVariables(new Set());
        }

        // Check channel connection status on open
        if (config) {
          await checkConnection(config);
        }
      }
    } catch (err) {
      console.error('Error loading widget:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper to map RCP type to field type
  const mapRCPTypeToFieldType = (rcpType: string): FormField['type'] => {
    switch (rcpType.toLowerCase()) {
      case 'string':
      case 'text':
      case 'fstring':
      case 'ftext':
      case 'fname':
        return 'text';
      case 'number':
      case 'integer':
      case 'float':
      case 'fint32':
      case 'fint64':
      case 'fint16':
      case 'fint8':
      case 'ffloat':
      case 'fdouble':
        return 'number';
      case 'boolean':
      case 'fbool':
        return 'boolean';
      case 'select':
      case 'dropdown':
        return 'select';
      default:
        return 'text';
    }
  };

  // Load RCP variables from widget configuration and auto-add them to form
  const loadRCPVariables = async (config: UE5WidgetConfig) => {
    if (!config.rcpFields || config.rcpFields.length === 0) return;

    try {
      // Convert RCP fields to RCP variables format
      const variables: RCPVariable[] = config.rcpFields.map(field => ({
        name: field.name,
        type: field.type,
        value: field.defaultValue || '',
        presetId: field.presetId,
        presetName: field.presetName
      }));

      setRcpVariables(variables);
      
      // Auto-add all RCP variables to the form on first load
      const autoFields: FormField[] = variables.map((variable, index) => {
        const fieldType = mapRCPTypeToFieldType(variable.type);
        return {
          id: `field_${Date.now()}_${index}`,
          name: variable.name,
          label: `${variable.presetName} - ${variable.name}`,
          type: fieldType,
          required: false,
          placeholder: `Enter ${variable.name}`,
          defaultValue: variable.value,
          rcpVariable: variable
        };
      });
      setFormFields(autoFields);
      
      // Mark all as used
      const usedSet = new Set(variables.map(v => `${v.presetId}_${v.name}`));
      setUsedRcpVariables(usedSet);
    } catch (error) {
      console.error('Error loading RCP variables:', error);
    }
  };

  // Check (or re-check) connection to channel; accepts optional config
  const checkConnection = useCallback(async (cfg?: UE5WidgetConfig | null) => {
    const effective = cfg ?? widgetConfig;
    if (!effective?.connectionSettings) return;
    const { host, port } = effective.connectionSettings as any;
    if (!host || !port) return;

    setIsConnecting(true);
    try {
      const baseUrl = `${host.startsWith('http') ? host : `http://${host}`}:${port}`;
      // Attempt a lightweight endpoint
      const res = await fetch(`${baseUrl}/remote/presets`, { method: 'GET' });
      setIsConnected(res.ok);
      setSnackbarMessage(res.ok ? 'Connected to channel' : 'Failed to connect to channel');
      setSnackbarSeverity(res.ok ? 'success' : 'error');
      setSnackbarOpen(true);
    } catch (e) {
      setIsConnected(false);
      setSnackbarMessage('Failed to connect to channel');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsConnecting(false);
    }
  }, [widgetConfig]);

  // Helper function to create placeholder image
  const createPlaceholderImage = async (prompt: string, ratio: string): Promise<string> => {
    const getDimensions = (r: string) => {
      switch (r) {
        case '9:16': return { width: 1080, height: 1920 };
        case '16:9': return { width: 1920, height: 1080 };
        case '1:1': return { width: 1024, height: 1024 };
        default: return { width: 1080, height: 1920 };
      }
    };

    const { width, height } = getDimensions(ratio);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Set canvas size
    const maxSize = 800;
    const scaleFactor = Math.min(maxSize / width, maxSize / height);
    canvas.width = width * scaleFactor;
    canvas.height = height * scaleFactor;
    
    // Create a gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AI Generated Image', canvas.width / 2, canvas.height / 2 - 20);
    
    ctx.font = '16px Arial';
    const words = prompt.split(' ');
    const lines = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > canvas.width - 40) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    
    lines.forEach((line, index) => {
      ctx.fillText(line, canvas.width / 2, canvas.height / 2 + 20 + (index * 25));
    });
    
    // Convert to data URL
    return canvas.toDataURL('image/png');
  };

  // UE5 RCP Send functions
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
      const baseUrl = `http://${host}:${port}`;
      
      // Find the preset for this field
      const preset = widgetConfig.rcpPresets.find(p => p.ID === field.rcpVariable!.presetId);
      if (!preset) {
        throw new Error('Preset not found for field');
      }

      // Use PRESET_ID instead of preset.Name, and use the actual property ID
      const url = `${baseUrl}/remote/preset/${preset.ID}/property/${field.rcpVariable.propertyId || field.rcpVariable.name}`;
      const requestBody = { propertyValue: value };

      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();

      if (response.ok) {
        setSnackbarMessage(`✅ Sent "${field.label || field.name}" to Unreal`);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: { message: 'Unknown error' } };
        }
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
      const baseUrl = `http://${host}:${port}`;
      
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
      
      const response = await fetch(`${baseUrl}/remote/batch`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ Requests: requests })
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

  // AI Image Generation functions
  const generateImage = async () => {
    if (!aiPrompt.trim() || !selectedRCPField) {
      setSnackbarMessage('Please enter a prompt and select an RCP field');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    setIsGenerating(true);
    
    // Show loading placeholder
    const placeholderUrl = await createPlaceholderImage(aiPrompt, aspectRatio);
    setGeneratedImageUrl(placeholderUrl);
    
    try {
      // Load AI settings
      const aiSettings = await loadAIImageGenSettings();

      if (!aiSettings.gemini.apiKey || aiSettings.gemini.apiKey === 'YOUR_GOOGLE_STUDIO_API_KEY') {
        throw new Error('Please configure your Google Studio API key in Settings');
      }

      // Get aspect ratio dimensions
      const getDimensions = (ratio: string) => {
        switch (ratio) {
          case '9:16': return { width: 1080, height: 1920 };
          case '16:9': return { width: 1920, height: 1080 };
          case '1:1': return { width: 1024, height: 1024 };
          default: return { width: 1080, height: 1920 };
        }
      };

      const { width, height } = getDimensions(aspectRatio);

      // Build the final prompt with enhancement if available
      let finalPrompt = `Generate an image: ${aiPrompt}. Aspect ratio: ${aspectRatio} (${width}x${height})`;

      // Debug: Log user's original prompt

      const promptEnhancement = aiSettings.virtualSet.promptEnhancement;
      if (promptEnhancement && promptEnhancement.trim()) {
        // Check if the enhancement template contains {prompt} placeholder
        if (promptEnhancement.includes('{prompt}')) {
          // Inject the prompt enhancement with user's prompt and aspect ratio
          finalPrompt = promptEnhancement
            .replace(/\{prompt\}/g, aiPrompt)
            .replace(/\{aspectRatio\}/g, aspectRatio)
            .replace(/\{width\}/g, width.toString())
            .replace(/\{height\}/g, height.toString());
        } else {
          // If no {prompt} placeholder, merge the enhancement with the user's prompt
          finalPrompt = `${aiPrompt}. ${promptEnhancement}. Aspect ratio: ${aspectRatio} (${width}x${height})`;
        }

      }


      // Call Google Gemini API for image generation via proxy
      const apiUrl = `${aiSettings.gemini.baseUrl}/v1beta/models/${aiSettings.gemini.textModel}:generateContent?key=${aiSettings.gemini.apiKey}`;

      const requestBody = {
        contents: [{
          parts: [{
            text: finalPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096,
        }
      };

      const data = await callGoogleAPIViaProxy(apiUrl, 'POST', { 'Content-Type': 'application/json' }, requestBody);
      
      // Extract image data from response
      // Note: The actual response format may vary depending on the Gemini model used
      let imageData: string | null = null;
      
      if (data.candidates && data.candidates[0]?.content?.parts) {
        for (const part of data.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            imageData = part.inlineData.data;
            break;
          }
        }
      }

      if (!imageData) {
        throw new Error('No image data received from API. The model may not support image generation.');
      }

      // Convert base64 image data to blob
      const byteString = atob(imageData);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([arrayBuffer], { type: 'image/png' });
      
      // Create a file from the blob
      const file = new File([blob], `ai-generated-${Date.now()}.png`, { type: 'image/png' });
      
      // Store the image using our storage system
      const result = await imageStorage.uploadImage(file, DEFAULT_IMAGE_CONFIG);
      
      if (result.success && result.url) {
        // DEBUG: Log the image storage result
        
        // Set the display URL (data URL for fast loading) and form path (proper URL)
        if (result.path) {
          const displayUrl = imageStorage.getImageUrl(result.path);
          setGeneratedImageUrl(displayUrl); // Data URL for display
          setGeneratedImagePath(result.url); // Proper URL for form values
          
          
          // Auto-fill the selected RCP field with the proper URL
          setFormValues(prev => ({
            ...prev,
            [selectedRCPField]: result.url
          }));
        }


        setSnackbarMessage('✅ Image generated and stored successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        throw new Error(result.error || 'Failed to store image');
      }
    } catch (error) {
      console.error('Image generation failed:', error);
      setSnackbarMessage(`❌ Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const openAIImageGen = (fieldId: string) => {
    setSelectedRCPField(fieldId);
    setIsAIImageGenOpen(true);
  };

  // Refresh and rescan RCPs from UE5 for the presets in config
  const refreshRcpScan = useCallback(async () => {
    if (!widgetConfig) return;

    try {
      const connection = (widgetConfig.connectionSettings || {}) as any;
      const host = connection.host || 'localhost';
      const port = connection.port || 30010;
      const baseUrl = `${host.toString().startsWith('http') ? host : `http://${host}`}:${port}`;

      const presets = (widgetConfig.rcpPresets || []) as any[];
      const variables: RCPVariable[] = [];

      for (const preset of presets) {
        const presetName = preset.Name || preset.name || preset.ID || 'Preset';
        try {
          const resp = await fetch(`${baseUrl}/remote/preset/${encodeURIComponent(presetName)}`);
          const data = await resp.json();
          const groups = data?.Preset?.Groups || [];
          for (const group of groups) {
            const props = group?.ExposedProperties || [];
            for (const p of props) {
              const varName = p?.DisplayName || p?.Name || 'Variable';
              const varType = (p?.Type || '').toString();
              variables.push({
                name: varName,
                type: varType,
                value: p?.DefaultValue ?? '',
                presetId: preset.ID || presetName,
                presetName: presetName
              });
            }
          }
        } catch (e) {
          // Skip errors per preset to avoid blocking the rest
          // eslint-disable-next-line no-continue
          continue;
        }
      }

      setRcpVariables(variables);
      setSnackbarMessage('RCPs refreshed');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (e) {
      setSnackbarMessage('Failed to refresh RCPs');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }, [widgetConfig]);

  // Add form field from RCP variable (and mark as used)
  const addFormFieldFromRCP = (variable: RCPVariable) => {
    // Check if this is an image generation field (starts with *)
    const isImageGenField = variable.name.startsWith('*');
    const fieldType = isImageGenField ? 'text' : mapRCPTypeToFieldType(variable.type);

    const newField: FormField = {
      id: `field_${Date.now()}`,
      name: variable.name,
      label: `${variable.presetName} - ${variable.name}`,
      type: fieldType,
      required: false,
      placeholder: isImageGenField ? 'Image URL (Generate with AI)' : `Enter ${variable.name}`,
      defaultValue: variable.value,
      rcpVariable: {
        ...variable,
        type: isImageGenField ? 'Image Generation' : variable.type
      }
    };

    setFormFields(prev => [...prev, newField]);
    
    // Mark this RCP variable as used
    const key = `${variable.presetId}_${variable.name}`;
    setUsedRcpVariables(prev => new Set([...prev, key]));
    
    setSnackbarMessage(`Added ${variable.name} from ${variable.presetName}`);
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const updateFormField = (fieldId: string, updates: Partial<FormField>) => {
    setFormFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
  };

  const removeFormField = (fieldId: string) => {
    // Find the field to remove
    const fieldToRemove = formFields.find(f => f.id === fieldId);
    
    // If it's an RCP variable field, mark it as available again
    if (fieldToRemove?.rcpVariable) {
      const key = `${fieldToRemove.rcpVariable.presetId}_${fieldToRemove.rcpVariable.name}`;
      setUsedRcpVariables(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
    
    setFormFields(prev => prev.filter(field => field.id !== fieldId));
  };


  const saveFormConfiguration = async () => {
    if (!selectedWidget) return;

    setSaving(true);
    try {
      // Convert form fields back to RCP fields format for storage
      const rcpFieldsToSave = formFields
        .filter(field => field.rcpVariable) // Only save RCP-based fields
        .map(field => ({
          name: field.rcpVariable!.name,
          type: field.rcpVariable!.type,
          value: field.rcpVariable!.value,
          presetId: field.rcpVariable!.presetId,
          presetName: field.rcpVariable!.presetName
        }));

      // Update the widget's configuration with the form fields, RCP fields, AND form values
      const updatedConfig = {
        ...widgetConfig,
        rcpFields: rcpFieldsToSave,
        formFields: formFields.map(field => ({
          id: field.id,
          name: field.name,
          label: field.label,
          type: field.type,
          required: field.required,
          placeholder: field.placeholder,
          options: field.options,
          defaultValue: field.defaultValue,
          rcpVariable: field.rcpVariable
        })),
        formValues: formValues // Save the current form values from Preview tab
      };

      const { error } = await supabase
        .from('content')
        .update({ 
          config: JSON.stringify(updatedConfig),
          rcp_fields: JSON.stringify(rcpFieldsToSave),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedWidget.id);

      if (error) throw error;

      // Update local state
      setWidgetConfig(updatedConfig as any);

      setSnackbarMessage('Form configuration saved successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error saving form configuration:', error);
      setSnackbarMessage('Failed to save form configuration');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSaving(false);
    }
  };

  // Expose functions to parent via ref
  useImperativeHandle(ref, () => ({
    openWidgetInBuilder
  }), [openWidgetInBuilder]);

  // Render Form Builder tab
  const renderFormBuilder = () => (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left Panel: Component Palette */}
      <div style={{ width: '250px', borderRight: '1px solid #e0e0e0', padding: '16px', backgroundColor: '#f8f9fa' }}>
        <Typography variant="h6" gutterBottom>Components</Typography>
        
        {/* Search Field */}
        <TextField
          label="Search field(s)"
          size="small"
          fullWidth
          style={{ marginBottom: '16px' }}
        />
        
        {/* RCP Variables - MOVED TO TOP */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <Typography variant="subtitle2">
            RCP Variables
          </Typography>
          <IconButton 
            size="small" 
            onClick={refreshRcpScan}
            style={{ 
              padding: '4px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
            title="Refresh RCPs"
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </div>
        <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '24px' }}>
          {rcpVariables.length === 0 ? (
            <Typography variant="body2" color="textSecondary" style={{ padding: '16px', textAlign: 'center' }}>
              No RCP variables loaded
            </Typography>
          ) : (
            <div>
              {Array.from(new Set(rcpVariables.map(v => v.presetName))).map(presetName => (
                <Accordion key={presetName} style={{ marginBottom: '8px' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2" style={{ fontWeight: 'bold' }}>
                      {presetName}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {rcpVariables.filter(v => v.presetName === presetName).map(variable => {
                        const varKey = `${variable.presetId}_${variable.name}`;
                        const isUsed = usedRcpVariables.has(varKey);
                        const isImageGenField = variable.name.startsWith('*');
                        const displayType = isImageGenField ? 'Image Generation Field' : variable.type;
                        return (
                          <Button
                            key={varKey}
                            variant="outlined"
                            size="small"
                            startIcon={<DragIndicatorIcon />}
                            onClick={() => addFormFieldFromRCP(variable)}
                            disabled={isUsed}
                            style={{ 
                              justifyContent: 'flex-start',
                              textTransform: 'none',
                              fontSize: '11px',
                              height: 'auto',
                              minHeight: '28px',
                              padding: '4px 8px',
                              borderColor: isUsed ? '#ccc' : (isImageGenField ? '#9c27b0' : '#1976d2'),
                              color: isUsed ? '#999' : (isImageGenField ? '#9c27b0' : '#1976d2'),
                              backgroundColor: isUsed ? '#f5f5f5' : 'transparent',
                              opacity: isUsed ? 0.5 : 1,
                              cursor: isUsed ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                              <span style={{ fontWeight: 'bold' }}>{variable.name}</span>
                              <span style={{ fontSize: '9px', color: isUsed ? '#999' : (isImageGenField ? '#9c27b0' : '#666') }}>
                                {displayType}
                              </span>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </AccordionDetails>
                </Accordion>
              ))}
            </div>
          )}
        </div>

        {/* Basic Components - Matching Template Form Builder */}
        <Typography variant="subtitle2" style={{ marginBottom: '8px' }}>
          Basic
        </Typography>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
              onClick={() => {
                const newField: FormField = {
                  id: `field_${Date.now()}`,
                  name: '',
                  label: component.label,
                  type: component.type as FormField['type'],
                  required: false,
                  placeholder: ''
                };
                setFormFields(prev => [...prev, newField]);
              }}
              style={{ 
                justifyContent: 'flex-start',
                textTransform: 'none',
                fontSize: '11px',
                height: '28px',
                padding: '4px 8px',
                borderColor: '#1976d2',
                color: '#1976d2'
              }}
            >
              {component.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Right Panel: Form Canvas */}
      <div style={{ flex: 1, padding: '16px' }}>
        {/* Drag and Drop Zone */}
        <div style={{
          border: '2px dashed #1976d2',
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#f0f8ff',
          marginBottom: '16px'
        }}>
          <Typography variant="body1" color="primary">
            Drag and Drop a form component
          </Typography>
        </div>

        {/* Form Fields */}
        <div style={{ minHeight: '300px' }}>
          {formFields.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <BuildIcon fontSize="large" />
              <Typography variant="h6" style={{ marginTop: '16px' }}>
                No form fields configured
              </Typography>
              <Typography variant="body2" style={{ marginTop: '8px' }}>
                Click "Add Field" or drag components from the left panel
              </Typography>
            </div>
          ) : (
            formFields.map((field, index) => (
              <Card key={field.id} style={{ 
                marginBottom: '16px', 
                padding: '16px',
                backgroundColor: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: 4
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <Typography variant="h6">
                      {field.rcpVariable ? '🔗 RCP Field' : `Field ${index + 1}`}
                    </Typography>
                    {field.rcpVariable && (
                      <Typography variant="caption">
                        {field.rcpVariable.presetName} → {field.rcpVariable.name}
                      </Typography>
                    )}
                  </div>
                  <IconButton onClick={() => removeFormField(field.id)}>
                    <DeleteIcon />
                  </IconButton>
                </div>
                
                {field.rcpVariable ? (
                  // Read-only display for RCP variables
                  (<Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="Label"
                        value={field.label}
                        fullWidth
                        size="small"
                        InputProps={{ readOnly: true }}
                        helperText="RCP variable fields are automatically configured"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Type"
                        value={(() => {
                          // Convert technical types to user-friendly names
                          const type = field.rcpVariable.type.toLowerCase();
                          if (type === 'image generation') return 'Image Generation';
                          if (type.includes('string') || type.includes('text') || type.includes('fstring') || type.includes('ftext') || type.includes('fname')) return 'Text';
                          if (type.includes('int') || type.includes('float') || type.includes('double') || type.includes('number')) return 'Number';
                          if (type.includes('bool')) return 'Yes/No';
                          if (type.includes('color') || type.includes('fcolor')) return 'Color';
                          if (type.includes('vector') || type.includes('fvector')) return 'Vector';
                          return field.rcpVariable.type; // fallback to original
                        })()}
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
                    <Grid item xs={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={field.type}
                          onChange={(e) => updateFormField(field.id, { type: e.target.value as any })}
                        >
                          <MenuItem value="text">Text</MenuItem>
                          <MenuItem value="textarea">Text Area</MenuItem>
                          <MenuItem value="number">Number</MenuItem>
                          <MenuItem value="boolean">Boolean</MenuItem>
                          <MenuItem value="select">Select</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={4}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={field.required}
                            onChange={(e) => updateFormField(field.id, { required: e.target.checked })}
                          />
                        }
                        label="Required"
                      />
                    </Grid>
                    <Grid item xs={4}>
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
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );


  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%' 
      }}>
        <CircularProgress />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <Typography variant="h5" component="h1">
            {selectedWidget?.name || 'New Widget'}
          </Typography>
        </div>
        <div />
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa'
      }}>
        {[
          { id: 'form-builder', label: 'FORM BUILDER', icon: <BuildIcon /> },
          { id: 'preview', label: 'PREVIEW', icon: <VisibilityIcon /> }
        ].map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'contained' : 'text'}
            startIcon={tab.icon}
            onClick={() => setActiveTab(tab.id as any)}
            style={{ 
              borderRadius: 0,
              backgroundColor: activeTab === tab.id ? '#1976d2' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#666',
              textTransform: 'uppercase',
              fontWeight: 'bold'
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'form-builder' && renderFormBuilder()}
        {activeTab === 'preview' && (
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Typography variant="h6">Preview</Typography>
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
                  onClick={async () => {
                    await checkConnection(null);
                    // If connection successful, refresh RCPs
                    if (widgetConfig) {
                      await refreshRcpScan();
                    }
                  }}
                  disabled={isConnecting}
                  size="small"
                >
                  {isConnecting ? 'Connecting...' : (isConnected ? 'Connected' : 'Disconnected')}
                </Button>
              </div>
            </div>

            {/* Main Preview Content - Dynamic Layout */}
            <div style={{ display: 'flex', gap: '16px', height: 'calc(100vh - 200px)' }}>
              {/* Form Preview - Left Side */}
              <div style={{ flex: isAIImageGenOpen ? 1 : 1, width: isAIImageGenOpen ? 'auto' : '100%' }}>
                <Card style={{ height: '100%' }}>
                  <CardContent style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" gutterBottom>Form Preview</Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Preview how your form will look and test filling in values before production use
                    </Typography>
                
                    <div style={{ flex: 1, overflow: 'auto' }}>
                      {formFields.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <BuildIcon fontSize="large" />
                          <Typography variant="body1" style={{ marginTop: '16px' }}>
                            No fields configured
                          </Typography>
                          <Typography variant="body2" style={{ marginTop: '8px' }}>
                            Add fields in the Form Builder tab first
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

              {/* AI Image Gen - Right Side - Conditionally Rendered */}
              {isAIImageGenOpen && (
                <div style={{ width: '350px' }}>
                  <Card style={{ height: '100%' }}>
                    <CardContent style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <Typography variant="h6">
                          AI Image Gen
                        </Typography>
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
                          
                          {/* Generate with AI Button - Small and under the field */}
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

                        {/* Image Preview - Compact */}
                        <div style={{ 
                          flex: 1, 
                          minHeight: '200px', 
                          border: '1px solid #e0e0e0', 
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#fafafa',
                          position: 'relative'
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
                                onError={(e) => {
                                  console.error('🔍 [DEBUG] Image failed to load:', generatedImageUrl?.substring(0, 100) + '...');
                                  console.error('  Error event:', e);
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

                        {/* Action Buttons - Compact Row */}
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
                                if (selectedRCPField && generatedImagePath) {
                                  setFormValues(prev => ({
                                    ...prev,
                                    [selectedRCPField]: generatedImagePath
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
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ 
        padding: '16px', 
        borderTop: '1px solid #e0e0e0',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px'
      }}>
        <Button variant="outlined">
          CANCEL
        </Button>
        <Button 
          variant="contained" 
          onClick={saveFormConfiguration}
          disabled={saving}
          startIcon={<BuildIcon />}
        >
          {saving ? 'Saving...' : 'SAVE FORM'}
        </Button>
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

const WidgetBuilderPage = forwardRef(WidgetBuilderPageComponent);
export default WidgetBuilderPage;
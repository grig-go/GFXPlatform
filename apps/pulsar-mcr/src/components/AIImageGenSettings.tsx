import React, { useState, useEffect } from 'react';
import {
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import {
  AISettings,
  DEFAULT_AI_SETTINGS,
  loadAIImageGenSettings,
  saveAIImageGenSettings,
  callGoogleAPIViaProxy,
  IMAGEN_MODELS,
  GEMINI_MODELS
} from '../types/aiImageGen';

interface AIImageGenSettingsProps {
  onSettingsChange?: (settings: AISettings) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const AIImageGenSettingsComponent: React.FC<AIImageGenSettingsProps> = ({ 
  onSettingsChange, 
  isOpen = false, 
  onClose 
}) => {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [isLoading, setIsLoading] = useState(true); // Start as loading
  const [isSaving, setIsSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      console.log('Loading AI settings from Supabase...');
      const loadedSettings = await loadAIImageGenSettings();
      setSettings(loadedSettings);
      console.log('✅ Settings loaded successfully:', loadedSettings);
    } catch (error) {
      console.error('❌ Failed to load settings:', error);
      setSnackbarMessage('Failed to load settings. Using defaults.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      // Keep default settings
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof AISettings, subfield?: string) => (
    event: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent
  ) => {
    const value = event.target.value;
    
    if (subfield) {
      // Handle nested fields like gemini.apiKey
      setSettings(prev => ({
        ...prev,
        [field]: {
          ...((prev as any)[field]),
          [subfield]: value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validate settings
      if (!settings.gemini.apiKey.trim() || settings.gemini.apiKey === 'YOUR_GOOGLE_STUDIO_API_KEY') {
        setSnackbarMessage('Please enter a valid API Key');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setIsSaving(false);
        return;
      }

      if (!settings.gemini.textModel.trim()) {
        setSnackbarMessage('Gemini text model is required');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setIsSaving(false);
        return;
      }

      if (!settings.imagen.model.trim()) {
        setSnackbarMessage('Imagen model is required');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setIsSaving(false);
        return;
      }

      console.log('💾 Saving settings to Supabase...');
      
      // Save to Supabase (this function handles both Supabase and localStorage backup)
      await saveAIImageGenSettings(settings);
      
      console.log('✅ Settings saved successfully');
      
      // Notify parent component
      if (onSettingsChange) {
        onSettingsChange(settings);
      }

      setSnackbarMessage('Settings saved successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
      setSnackbarMessage(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    // Reload settings from database
    await loadSettings();
  };

  const handleTestConnection = async () => {
    setIsSaving(true);
    try {
      // Test the Imagen API connection via proxy
      const testUrl = `${settings.imagen.baseUrl}/v1beta/models/${settings.imagen.model}:generate?key=${settings.imagen.apiKey}`;

      console.log('🧪 Testing API connection via proxy...');

      const requestBody = {
        prompt: 'test',
        number_of_images: 1
      };

      await callGoogleAPIViaProxy(testUrl, 'POST', { 'Content-Type': 'application/json' }, requestBody);

      // If we get here without error, the connection is successful
      setSnackbarMessage('✅ API connection successful!');
      setSnackbarSeverity('success');
    } catch (error) {
      console.error('Connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // If it's a 400 error, that's actually OK - it means the API is reachable
      if (errorMessage.includes('400')) {
        setSnackbarMessage('✅ API connection successful! (400 expected for test prompt)');
        setSnackbarSeverity('success');
      } else {
        setSnackbarMessage(`❌ Connection test failed: ${errorMessage}`);
        setSnackbarSeverity('error');
      }
    } finally {
      setIsSaving(false);
      setSnackbarOpen(true);
    }
  };

  const formContent = (
    <>
      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Typography variant="body2" color="textSecondary" paragraph>
            Configure your AI image generation API settings. These settings are saved to your Supabase account.
          </Typography>

          <Box display="flex" flexDirection="column" gap={3} sx={{ mt: 2 }}>
            {/* API Key Field */}
            <TextField
              label="Google AI API Key"
              value={settings.gemini.apiKey}
              onChange={handleInputChange('gemini', 'apiKey') as any}
              fullWidth
              type="password"
              helperText="Get your API key from https://aistudio.google.com/apikey"
              placeholder="Enter your Google AI Studio API key"
            />

            {/* Gemini Text Model Selection */}
            <FormControl fullWidth>
              <InputLabel>Virtual Studio Text Model (Gemini)</InputLabel>
              <Select
                value={settings.gemini.textModel}
                onChange={handleInputChange('gemini', 'textModel')}
                label="Virtual Studio Text Model (Gemini)"
              >
                {GEMINI_MODELS.map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, ml: 1.5 }}>
                Used for generating virtual studio scene configurations from text prompts
              </Typography>
            </FormControl>

            {/* Image Model Selection */}
            <FormControl fullWidth>
              <InputLabel>Image Generation Model (Imagen)</InputLabel>
              <Select
                value={settings.imagen.model}
                onChange={handleInputChange('imagen', 'model')}
                label="Image Generation Model (Imagen)"
              >
                {IMAGEN_MODELS.map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, ml: 1.5 }}>
                Used for generating backdrop images
              </Typography>
            </FormControl>

            {/* Base URL Field */}
            <TextField
              label="API Base URL"
              value={settings.imagen.baseUrl}
              onChange={handleInputChange('imagen', 'baseUrl') as any}
              fullWidth
              helperText="The base URL for the Google AI API (usually no need to change)"
              placeholder="https://generativelanguage.googleapis.com"
            />

            {/* Prompt Enhancement Field */}
            <TextField
              label="Default Prompt Enhancement"
              value={settings.virtualSet.promptEnhancement || ''}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                virtualSet: {
                  ...prev.virtualSet,
                  promptEnhancement: e.target.value
                }
              }))}
              fullWidth
              multiline
              rows={3}
              helperText="Text automatically added to enhance your prompts (e.g., 'photorealistic, 4K quality, professional lighting')"
              placeholder="Example: photorealistic, professional broadcast quality, high resolution"
            />
          </Box>

          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined" 
              onClick={handleCancel} 
              disabled={isSaving}
            >
              Reset
            </Button>
            <Button 
              variant="outlined" 
              onClick={handleTestConnection} 
              disabled={isSaving}
            >
              Test Connection
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSave} 
              disabled={isSaving}
            >
              {isSaving ? <CircularProgress size={20} /> : 'Save Settings'}
            </Button>
          </Box>
        </>
      )}
    </>
  );

  // If no onClose handler provided, render without Dialog (embedded mode)
  if (!onClose) {
    return (
      <Box>
        {formContent}
        <Snackbar 
          open={snackbarOpen} 
          autoHideDuration={6000} 
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setSnackbarOpen(false)} 
            severity={snackbarSeverity}
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  // Otherwise render as Dialog (popup mode)
  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>AI Image Generation Settings</DialogTitle>
      <DialogContent>
        {formContent}
      </DialogContent>
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default AIImageGenSettingsComponent;
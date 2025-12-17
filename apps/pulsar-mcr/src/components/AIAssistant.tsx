import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Grid
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import DeleteIcon from '@mui/icons-material/Delete';
import BugReportIcon from '@mui/icons-material/BugReport';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

// The Claude API service
const callClaudeAPI = async (prompt: string) => {
  try {
    console.log('Calling Claude API with env vars:', {
      url: import.meta.env.VITE_SUPABASE_URL,
      hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
    });
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
};

interface AIAssistantProps {
  formSchema: any;
  onPopulateForm: (data: Record<string, any>) => void;
  disabled?: boolean;
  templateName?: string;
}

const AIAssistant = ({
  formSchema,
  onPopulateForm,
  disabled = false,
  templateName
}: AIAssistantProps) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [debugMode, setDebugMode] = useState(true); // Default to true
  const [useDirectFormat, setUseDirectFormat] = useState(false);
  const [testDataFormat, setTestDataFormat] = useState('data[XX]'); // or 'direct'
  
  // Log form schema whenever it changes
  useEffect(() => {
    if (debugMode && formSchema) {
      console.log('Form schema updated:', formSchema);
      
      if (formSchema.components) {
        console.log('Form components:');
        const logComponents = (components: any[], level = 0) => {
          components.forEach((comp: any) => {
            const indent = ' '.repeat(level * 2);
            console.log(`${indent}- ${comp.key} (${comp.type})`);
            if (comp.components && Array.isArray(comp.components)) {
              logComponents(comp.components, level + 1);
            }
          });
        };
        
        logComponents(formSchema.components);
      }
    }
  }, [formSchema, debugMode]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const handleClearPrompt = () => {
    setPrompt('');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPrompt(text);
    } catch (err) {
      console.error('Failed to read clipboard: ', err);
      setError('Failed to access clipboard. Please paste manually.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Create a prompt that includes the form fields and context
      const formFields = formSchema ? extractFormFields(formSchema) : [];
      
      // Log field keys to help with debugging
      console.log('Form field keys:', formFields.map(f => f.key));
      
      const fieldList = formFields.map(field => 
        `- ${field.label || field.key} (${field.type}${field.required ? ', required' : ''})`
      ).join('\n');
      
      console.log('Form fields for prompt:', fieldList || 'No fields found');
      
      // Build the exact field keys list for precise mapping
      const fieldKeys = formFields.map(f => f.key);

      // Create system prompt with template context and explicit field mapping
      const templateContext = templateName
        ? `You are filling out a "${templateName}" template for broadcast/display purposes.`
        : 'You are filling out a form for content creation.';

      const systemPrompt = `You are an AI assistant that helps populate form fields for broadcast graphics and content.

${templateContext}

The form has the following fields that you MUST populate:
${fieldList || 'No specific fields provided.'}

CRITICAL INSTRUCTIONS:
1. You MUST return a JSON object with EXACTLY these field keys: ${JSON.stringify(fieldKeys)}
2. Each key in your response must match one of these field keys exactly
3. Generate appropriate content for each field based on its label/name and the user's request
4. Keep content concise (short headlines, brief text)
5. Use normal sentence case or title case - DO NOT use all caps
6. If a field name is unclear (like "01", "02"), infer its purpose from the template name "${templateName || 'unknown'}" and field order (01 is usually the main headline/title)

Respond ONLY with a valid JSON object, no markdown formatting or explanation:
{
${fieldKeys.map((key, i) => `  "${key}": "content for ${formFields[i]?.label || key}"`).join(',\n')}
}`;

      const fullPrompt = `${systemPrompt}\n\nUser request: ${prompt}`;
      
      console.log('Sending prompt to Claude API');
      
      // Call the Claude API
      const aiResponse = await callClaudeAPI(fullPrompt);
      setResponse(aiResponse);
      console.log('Received response from Claude API');
      
      // Extract JSON from the response
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || 
                         aiResponse.match(/\{[\s\S]*\}/);
      
      console.log('JSON match found:', !!jsonMatch);
      
      if (jsonMatch) {
        try {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          console.log('Extracted JSON string:', jsonStr);
          
          const formData = JSON.parse(jsonStr);
          console.log('Parsed form data:', formData);
          
          onPopulateForm(formData);
          console.log('Form data sent to parent component');
        } catch (jsonError) {
          console.error('Failed to parse JSON from response:', jsonError);
          setError('Failed to parse form data from the AI response.');
        }
      } else {
        setError('AI response did not contain valid form data.');
      }
    } catch (err: any) {
      console.error('Error generating content:', err);
      setError(`Error generating content: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to extract fields from form schema
  const extractFormFields = (schema: any) => {
    if (!schema || !schema.components) {
      console.warn('Invalid schema for extractFormFields:', schema);
      return [];
    }

    const extractFields = (components: any[], fields: any[] = []) => {
      components.forEach((component: any) => {
        if (component.key && (component.input || component.type === 'textfield' || component.type === 'textarea')) {
          fields.push({
            key: component.key,
            label: component.label,
            type: component.type,
            required: component.validate?.required || false
          });
        }
        
        if (component.components) {
          extractFields(component.components, fields);
        }
      });
      return fields;
    };
    
    return extractFields(schema.components);
  };

  // Test function to populate form with sample data
  const handleTestForm = () => {
    if (!formSchema) {
      setError('No form schema available for testing');
      return;
    }
    
    try {
      const fields = extractFormFields(formSchema);
      if (fields.length === 0) {
        setError('No form fields found for testing');
        return;
      }
      
      // Create test data for each field using the selected format
      const testData = {};
      fields.forEach(field => {
        // Determine the key format based on settings
        const isNumeric = /^\d+$/.test(field.key);
        const keyName = isNumeric && testDataFormat === 'data[XX]' 
          ? `data[${field.key}]` 
          : field.key;
        
        switch (field.type) {
          case 'textfield':
            (testData as any)[keyName] = `Test value for ${field.label || field.key}`;
            break;
          case 'textarea':
            (testData as any)[keyName] = `This is a test paragraph for the ${field.label || field.key} field.\nIt contains multiple lines of text.`;
            break;
          case 'number':
            (testData as any)[keyName] = 42;
            break;
          case 'checkbox':
            (testData as any)[keyName] = true;
            break;
          case 'select':
            // Just a placeholder, select would need options from the schema
            (testData as any)[keyName] = 'test-option';
            break;
          case 'email':
            (testData as any)[keyName] = 'test@example.com';
            break;
          default:
            (testData as any)[keyName] = `Test for ${field.key}`;
        }
      });
      
      console.log('Testing form population with data:', testData);
      onPopulateForm(testData);
      
      setResponse('Test data applied to form. Check if fields were populated correctly.');
    } catch (err) {
      console.error('Error during form test:', err);
      setError('Failed to test form population.');
    }
  };

  // Create a simplified test data specifically for field "01"
  const handleTestField01 = () => {
    try {
      // Test data only for field "01"
      const testData: any = {};

      // Use the selected format
      if (testDataFormat === 'data[XX]') {
        testData['data[01]'] = "Test headline using data[01] format";
      } else {
        testData['01'] = "Test headline using direct format";
      }
      
      console.log('Testing specific field "01" with data:', testData);
      onPopulateForm(testData);
      
      setResponse(`Test data applied to field 01 using ${testDataFormat} format. Check if it was populated correctly.`);
    } catch (err) {
      console.error('Error during field 01 test:', err);
      setError('Failed to test field population.');
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2, mt: 2, bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          AI Assistant
        </Typography>
        <Tooltip title="Toggle Debug Mode">
          <IconButton 
            onClick={() => setDebugMode(!debugMode)}
            color={debugMode ? "primary" : "default"}
            size="small"
          >
            <BugReportIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter a prompt to generate content for the form. For example, "Generate a headline about this news story: [paste URL or text]"
      </Typography>
      
      <Box sx={{ display: 'flex', mb: 2 }}>
        <TextField
          fullWidth
          label="Your prompt"
          multiline
          rows={3}
          value={prompt}
          onChange={handlePromptChange}
          disabled={loading || disabled}
          placeholder="Enter your prompt here..."
          sx={{ 
            '& .MuiOutlinedInput-root': {
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0
            }
          }}
        />
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          bgcolor: 'background.paper', 
          border: 1, 
          borderLeft: 0,
          borderColor: 'divider',
          borderTopRightRadius: 4,
          borderBottomRightRadius: 4,
        }}>
          <Tooltip title="Paste from clipboard">
            <IconButton 
              onClick={handlePaste} 
              disabled={loading || disabled}
              sx={{ p: 1 }}
            >
              <ContentPasteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Divider sx={{ width: '100%' }} />
          <Tooltip title="Clear prompt">
            <IconButton 
              onClick={handleClearPrompt} 
              disabled={loading || disabled || !prompt}
              sx={{ p: 1 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      
      {debugMode && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Debug Options:
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={useDirectFormat}
                    onChange={(e) => setUseDirectFormat(e.target.checked)}
                  />
                }
                label="Use direct field format (no data[XX])"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={testDataFormat === 'direct'}
                    onChange={(e) => setTestDataFormat(e.target.checked ? 'direct' : 'data[XX]')}
                  />
                }
                label="Test with direct format"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Button
                variant="outlined"
                color="info"
                startIcon={<PlayArrowIcon />}
                onClick={handleTestField01}
                size="small"
                fullWidth
              >
                Test Field "01" Only
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<BugReportIcon />}
                onClick={handleTestForm}
                disabled={loading || disabled || !formSchema}
                size="small"
                fullWidth
              >
                Test All Fields
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={!prompt.trim() || loading || disabled}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoFixHighIcon />}
        >
          {loading ? 'Generating...' : 'Generate Content'}
        </Button>
      </Box>
      
      {response && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            AI Response:
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              mt: 1, 
              maxHeight: '150px', 
              overflow: 'auto',
              bgcolor: 'action.hover',
              fontSize: '0.875rem'
            }}
          >
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{response}</pre>
          </Paper>
        </Box>
      )}
      
      {debugMode && formSchema && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" color="text.secondary">
            Debug: Form Schema
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              mt: 1, 
              maxHeight: '150px', 
              overflow: 'auto',
              bgcolor: 'action.hover',
              fontSize: '0.875rem'
            }}
          >
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(formSchema, null, 2)}
            </pre>
          </Paper>
        </Box>
      )}
    </Paper>
  );
};

export default AIAssistant;
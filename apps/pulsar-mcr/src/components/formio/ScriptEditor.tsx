import React, { useState, useEffect, useCallback, useRef } from 'react';

// Add global type for Form.io
declare global {
  interface Window {
    Formio?: any;
    scriptEditorCallback?: (options: any) => void;
  }
}

// Initialize global callback
window.scriptEditorCallback = undefined;
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box, 
  Tabs, 
  Tab, 
  Paper, 
  Alert, 
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider
} from '@mui/material';
import CodeEditor from '@monaco-editor/react';

/**
 * Props for the ScriptEditor component
 */
export interface ScriptEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (code: string, scriptType: string, options?: any) => void;
  initialCode?: string;
  scriptType?: 'validation' | 'calculation' | 'custom' | 'conditional' | 'logic';
  targetField?: string;
  title?: string;
  readOnly?: boolean;
}

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
      id={`script-editor-tabpanel-${index}`}
      aria-labelledby={`script-editor-tab-${index}`}
      style={{ height: value === index ? '100%' : 0 }}
      {...other}
    >
      {value === index && (
        <Box sx={{ height: '100%', p: 2 }}>{children}</Box>
      )}
    </div>
  );
}

/**
 * ScriptEditor component for editing Form.io related scripts
 */
export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  open,
  onClose,
  onSave,
  initialCode = '',
  scriptType = 'custom',
  targetField = '',
  title = 'Script Editor',
  readOnly = false
}) => {
  const [code, setCode] = useState<string>(initialCode);
  const [tabValue, setTabValue] = useState(0);
  const [currentScriptType, setCurrentScriptType] = useState<string>(scriptType);
  const [currentTargetField, setCurrentTargetField] = useState<string>(targetField);
  const [testData, setTestData] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testing, setTesting] = useState<boolean>(false);
  const [scriptOptions, setScriptOptions] = useState<Record<string, any>>({});

  // Reset state when component opens with new parameters
  useEffect(() => {
    if (open) {
      setCode(initialCode || getDefaultCode(scriptType));
      setCurrentScriptType(scriptType);
      setCurrentTargetField(targetField);
      setTestData({ [targetField]: '' });
      setTestResult(null);
      setTestError(null);
      setScriptOptions({});
    }
  }, [open, initialCode, scriptType, targetField]);

  // Handle tab changes
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle code changes in the editor
  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  };

  // Handle script type changes
  const handleScriptTypeChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    const newType = e.target.value as string;
    setCurrentScriptType(newType);
    
    // Only update the code if it's the default or empty
    if (!code || code === getDefaultCode(scriptType)) {
      setCode(getDefaultCode(newType as any));
    }
  };

  // Get default code template based on script type
  const getDefaultCode = (type: string): string => {
    switch (type) {
      case 'validation':
        return `/**
 * Validate the field value
 * @param value - The field value to validate
 * @return {boolean|string} - Return true if validation passes or an error message
 */
valid = (value) => {
  if (!value) {
    return 'This field is required';
  }
  return true;
};`;

      case 'calculation':
        return `/**
 * Calculate the value for this field
 * @param component - The current component definition
 * @param value - The current value
 * @param data - The form data
 * @return {*} - The calculated value
 */
value = (component, value, data) => {
  // Example: Calculate a total
  return data.quantity * data.price;
};`;

      case 'conditional':
        return `/**
 * Determine if this field should be shown
 * @param component - The current component definition
 * @param data - The form data
 * @return {boolean} - Return true if the field should be shown
 */
show = (component, data) => {
  // Example: Show this field only if the user is an admin
  return data.userRole === 'admin';
};`;

      case 'logic':
        return `/**
 * Advanced logic for a form component
 * @param component - The current component definition
 * @param data - The form data
 * @return {*} - The result of your logic
 */
result = (component, data) => {
  // Example: Return different values based on conditions
  if (data.category === 'business') {
    return 'Business logic applied';
  } else {
    return 'Standard logic applied';
  }
};`;

      case 'custom':
      default:
        return `/**
 * Custom JavaScript code
 * @param component - The current component definition
 * @param data - The form data
 */
// Add your custom code here
console.log('Custom script executing');
`;
    }
  };

  // Test the script with the provided data
  const testScript = useCallback(() => {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    
    try {
      // Create a safe evaluation context
      const evalContext = {
        component: { key: currentTargetField || 'testField' },
        data: testData,
        value: testData[currentTargetField || 'testField'] || '',
        result: null,
        valid: null,
        show: null,
        console: {
          log: (...args: any[]) => {
            console.log('Script log:', ...args);
            return args;
          }
        }
      };

      // Wrap code in a function to provide scope isolation
      const wrappedCode = `
        (function() {
          const component = this.component;
          const data = this.data;
          const value = this.value;
          const console = this.console;
          let valid, show, result;
          
          ${code}
          
          // Assign results back to the context
          this.valid = valid;
          this.show = show;
          this.result = result;
          
          // For calculation scripts, return the value function result
          if (typeof value === 'function') {
            return value(component, this.value, data);
          }
          
          // For validation scripts
          if (typeof valid === 'function') {
            return valid(this.value);
          }
          
          // For conditional scripts
          if (typeof show === 'function') {
            return show(component, data);
          }
          
          // For logic scripts
          if (typeof result === 'function') {
            return result(component, data);
          }
          
          return null;
        }).call(this);
      `;

      // Execute the script in the context
      const result = Function(wrappedCode).call(evalContext);
      
      setTestResult({
        result,
        valid: evalContext.valid,
        show: evalContext.show,
        error: null
      });
    } catch (error) {
      console.error('Script execution error:', error);
      setTestError(error instanceof Error ? error.message : String(error));
    } finally {
      setTesting(false);
    }
  }, [code, currentTargetField, testData]);

  // Save the script and options
  const handleSave = () => {
    const options = {
      scriptType: currentScriptType,
      targetField: currentTargetField,
      ...scriptOptions
    };
    
    onSave(code, currentScriptType, options);
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
      PaperProps={{
        style: {
          height: '80vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle>
        {title || `${currentScriptType.charAt(0).toUpperCase() + currentScriptType.slice(1)} Script Editor`}
        {currentTargetField && <Typography variant="subtitle2" color="text.secondary">Target Field: {currentTargetField}</Typography>}
      </DialogTitle>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Script Editor" />
          <Tab label="Test" />
          <Tab label="Documentation" />
        </Tabs>
      </Box>
      
      <DialogContent style={{ flex: 1, display: 'flex', padding: 0, overflow: 'hidden' }}>
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 2 }}>
              <FormControl fullWidth variant="outlined" size="small" sx={{ mb: 2 }}>
                <InputLabel id="script-type-label">Script Type</InputLabel>
                <Select
                  labelId="script-type-label"
                  value={currentScriptType}
                  onChange={handleScriptTypeChange as any}
                  label="Script Type"
                  disabled={readOnly}
                >
                  <MenuItem value="custom">Custom Script</MenuItem>
                  <MenuItem value="validation">Validation Script</MenuItem>
                  <MenuItem value="calculation">Calculation Script</MenuItem>
                  <MenuItem value="conditional">Conditional Logic</MenuItem>
                  <MenuItem value="logic">Advanced Logic</MenuItem>
                </Select>
              </FormControl>
              
              {currentScriptType !== 'custom' && (
                <TextField
                  fullWidth
                  size="small"
                  label="Target Field"
                  value={currentTargetField}
                  onChange={(e) => setCurrentTargetField(e.target.value)}
                  disabled={readOnly}
                  sx={{ mb: 2 }}
                  helperText="The field this script affects"
                />
              )}
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <CodeEditor
                height="100%"
                language="javascript"
                value={code}
                onChange={handleCodeChange}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  readOnly: readOnly,
                  tabSize: 2,
                  formatOnPaste: true,
                  formatOnType: true
                }}
              />
            </Box>
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h6" gutterBottom>Test Data</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Enter JSON data to use when testing your script.
            </Typography>
            
            <Box sx={{ height: '40%', mb: 2 }}>
              <CodeEditor
                height="100%"
                language="json"
                value={JSON.stringify(testData, null, 2)}
                onChange={(value) => {
                  if (value) {
                    try {
                      setTestData(JSON.parse(value));
                    } catch (error) {
                      // Ignore parse errors while typing
                    }
                  }
                }}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2
                }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={testScript}
                disabled={testing}
                startIcon={testing ? <CircularProgress size={20} color="inherit" /> : undefined}
              >
                {testing ? 'Testing...' : 'Test Script'}
              </Button>
            </Box>
            
            <Typography variant="h6" gutterBottom>Test Results</Typography>
            
            {testError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {testError}
              </Alert>
            )}
            
            <Paper 
              variant="outlined" 
              sx={{ 
                flex: 1,
                p: 2, 
                bgcolor: '#f5f5f5',
                overflowY: 'auto'
              }}
            >
              {testResult ? (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    {currentScriptType === 'validation' ? 'Validation Result:' : 
                    currentScriptType === 'calculation' ? 'Calculated Value:' : 
                    currentScriptType === 'conditional' ? 'Condition Result:' : 
                    currentScriptType === 'logic' ? 'Logic Result:' : 
                    'Script Result:'}
                  </Typography>
                  <pre style={{ 
                    backgroundColor: '#ffffff', 
                    padding: '10px', 
                    borderRadius: '4px',
                    overflow: 'auto',
                    margin: 0
                  }}>
                    {typeof testResult.result === 'object' 
                      ? JSON.stringify(testResult.result, null, 2) 
                      : String(testResult.result)}
                  </pre>
                </Box>
              ) : (
                <Typography color="text.secondary">
                  No results yet. Click "Test Script" to see the output of your script.
                </Typography>
              )}
            </Paper>
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            <Typography variant="h5" gutterBottom>Form.io Scripting Reference</Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>Script Types</Typography>
              <Typography variant="body2" paragraph>
                Form.io supports several types of scripts that serve different purposes in your forms:
              </Typography>
              
              <Box component="ul" sx={{ pl: 2 }}>
                <li>
                  <Typography variant="subtitle1">Validation Scripts</Typography>
                  <Typography variant="body2" paragraph>
                    Determine if a value is valid. Return true if valid, or an error message if invalid.
                  </Typography>
                </li>
                <li>
                  <Typography variant="subtitle1">Calculation Scripts</Typography>
                  <Typography variant="body2" paragraph>
                    Compute a value based on other form values. Return the calculated value.
                  </Typography>
                </li>
                <li>
                  <Typography variant="subtitle1">Conditional Logic</Typography>
                  <Typography variant="body2" paragraph>
                    Determine if a component should be shown. Return true to show, false to hide.
                  </Typography>
                </li>
                <li>
                  <Typography variant="subtitle1">Advanced Logic</Typography>
                  <Typography variant="body2" paragraph>
                    Apply complex business logic to form data. Can return any type of value.
                  </Typography>
                </li>
                <li>
                  <Typography variant="subtitle1">Custom Scripts</Typography>
                  <Typography variant="body2" paragraph>
                    General purpose scripts that can perform any operation.
                  </Typography>
                </li>
              </Box>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>Available Variables</Typography>
              <Typography variant="body2" paragraph>
                The following variables are available in your scripts:
              </Typography>
              
              <Box component="ul" sx={{ pl: 2 }}>
                <li>
                  <Typography variant="subtitle1">component</Typography>
                  <Typography variant="body2" paragraph>
                    The component definition for the field associated with this script.
                    Contains properties like key, label, type, and validation settings.
                  </Typography>
                </li>
                <li>
                  <Typography variant="subtitle1">data</Typography>
                  <Typography variant="body2" paragraph>
                    An object containing all the form data, where keys are the field keys
                    and values are the current field values.
                  </Typography>
                </li>
                <li>
                  <Typography variant="subtitle1">value</Typography>
                  <Typography variant="body2" paragraph>
                    The current value of the field associated with this script.
                  </Typography>
                </li>
              </Box>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>Script Examples</Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1">Validation Example</Typography>
                <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <pre style={{ margin: 0, fontSize: '0.875rem' }}>
{`valid = (value) => {
  if (!value) {
    return 'This field is required';
  }
  
  if (value.length < 5) {
    return 'Must be at least 5 characters';
  }
  
  // Email validation pattern
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(value)) {
    return 'Invalid email format';
  }
  
  return true;
};`}
                  </pre>
                </Paper>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1">Calculation Example</Typography>
                <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <pre style={{ margin: 0, fontSize: '0.875rem' }}>
{`value = (component, value, data) => {
  // Calculate total price
  const quantity = data.quantity || 0;
  const unitPrice = data.unitPrice || 0;
  
  // Apply discount if applicable
  const discount = data.discount || 0;
  const subtotal = quantity * unitPrice;
  
  return subtotal * (1 - discount / 100);
};`}
                  </pre>
                </Paper>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1">Conditional Logic Example</Typography>
                <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <pre style={{ margin: 0, fontSize: '0.875rem' }}>
{`show = (component, data) => {
  // Show shipping address fields only if "Ship to different address" is checked
  return data.shipToDifferentAddress === true;
};`}
                  </pre>
                </Paper>
              </Box>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box>
              <Typography variant="h6" gutterBottom>Best Practices</Typography>
              <Typography variant="body2" paragraph>
                Follow these best practices for writing effective Form.io scripts:
              </Typography>
              
              <Box component="ol" sx={{ pl: 2 }}>
                <li>
                  <Typography variant="body2" paragraph>
                    <strong>Handle missing values:</strong> Always check if a value exists before using it to avoid errors.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" paragraph>
                    <strong>Keep scripts simple:</strong> Divide complex logic into smaller, manageable pieces.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" paragraph>
                    <strong>Use descriptive error messages:</strong> In validation scripts, provide clear guidance to users.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" paragraph>
                    <strong>Test thoroughly:</strong> Use the test tab to verify your script works with various inputs.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" paragraph>
                    <strong>Avoid infinite loops:</strong> Be careful when referencing fields that might trigger each other.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" paragraph>
                    <strong>Limit DOM manipulation:</strong> Form.io handles the UI; your script should focus on data and logic.
                  </Typography>
                </li>
              </Box>
            </Box>
          </Box>
        </TabPanel>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          color="primary" 
          variant="contained"
          disabled={readOnly}
        >
          Save Script
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * A wrapper component that provides scripting integration with Form.io
 * This component sets up the necessary event listeners and global handlers
 */
export const ScriptingIntegration: React.FC = () => {
  const [scriptEditorOpen, setScriptEditorOpen] = useState(false);
  const [currentScript, setCurrentScript] = useState('');
  const [scriptType, setScriptType] = useState<string>('custom');
  const [targetField, setTargetField] = useState('');
  const [editorTitle, setEditorTitle] = useState('Script Editor');
  const currentComponentRef = useRef<any>(null);

  // Set up global callback for script editor
  useEffect(() => {
    window.scriptEditorCallback = (options) => {
      currentComponentRef.current = options.component;
      setCurrentScript(options.script || '');
      setScriptType(options.scriptType || 'custom');
      setTargetField(options.targetField || '');
      setEditorTitle(options.title || 'Edit Script');
      setScriptEditorOpen(true);
    };
    
    return () => {
      window.scriptEditorCallback = undefined;
    };
  }, []);

  // Handle saving the script back to the component
  const handleSaveScript = (script: string, type: string, options: any) => {
    if (currentComponentRef.current) {
      currentComponentRef.current.script = script;
      currentComponentRef.current.scriptType = type;
      currentComponentRef.current.targetField = options.targetField;
    }
    setScriptEditorOpen(false);
  };

  return (
    <ScriptEditor
      open={scriptEditorOpen}
      onClose={() => setScriptEditorOpen(false)}
      onSave={handleSaveScript}
      initialCode={currentScript}
      scriptType={scriptType as any}
      targetField={targetField}
      title={editorTitle}
    />
  );
};


// Add Form.io typings to the Window interface
declare global {
  interface Window {
    Formio?: any;
  }
}
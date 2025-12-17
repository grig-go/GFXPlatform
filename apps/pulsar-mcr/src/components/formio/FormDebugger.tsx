// components/FormDebugger.tsx
import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControlLabel,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BugReportIcon from '@mui/icons-material/BugReport';

/**
 * Form debugging component that can be added to help diagnose form issues
 */
const FormDebugger = ({ formRef, onTestField, targetFieldKey = '01' }: any) => {
  const [expanded, setExpanded] = useState(false);
  const [formInfo, setFormInfo] = useState<any>(null);
  const [inputValue, setInputValue] = useState('Test value');
  const [useDataFormat, setUseDataFormat] = useState(true);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);
  const [formComponents, setFormComponents] = useState<any[]>([]);
  
  // Function to inspect the form reference
  const inspectForm = () => {
    if (!formRef?.current) {
      setFormInfo({ error: 'Form reference not available' });
      return;
    }
    
    try {
      const info: any = {
        hasFormio: !!formRef.current.formio,
        formId: formRef.current.formId || 'Not available',
        componentsMethod: typeof formRef.current.getComponents === 'function',
      };
      
      // Get formio instance details if available
      if (formRef.current.formio) {
        const formio = formRef.current.formio;
        info.formioProperties = Object.keys(formio).filter(k => typeof formio[k] !== 'function');
        info.formioMethods = Object.keys(formio).filter(k => typeof formio[k] === 'function');
        info.hasSubmission = !!formio.submission;
        info.hasData = !!formio.data;
        
        // Check if form schema is available
        if (formio.form) {
          info.hasFormSchema = true;
          info.componentCount = (formio.form.components || []).length;
        }
        
        // Check if components are available
        if (formio.components) {
          info.components = formio.components.map((c: any) => ({
            key: c.key,
            type: c.type || 'unknown',
            hasSetValue: typeof c.setValue === 'function'
          }));
        }
      }
      
      // Try getting components through the getComponents method
      if (typeof formRef.current.getComponents === 'function') {
        const components = formRef.current.getComponents();
        setFormComponents(components || []);
        info.componentCount = components ? components.length : 0;
      }
      
      setFormInfo(info);
    } catch (error) {
      console.error('Error inspecting form:', error);
      setFormInfo({ error: String(error) });
    }
  };
  
  // Test method to update a specific field
  const testField = () => {
    if (!formRef?.current) {
      setTestResult({
        success: false,
        message: 'Form reference not available'
      });
      return;
    }
    
    try {
      // Create field data in the appropriate format
      const fieldData: Record<string, string> = {};
      const key = useDataFormat ? `data[${targetFieldKey}]` : targetFieldKey;
      fieldData[key] = inputValue;
      
      // Call the onTestField callback with the test data
      if (onTestField) {
        onTestField(fieldData);
        setTestResult({
          success: true,
          message: `Test data sent to form: { "${key}": "${inputValue}" }`
        });
      } else {
        // Direct DOM approach as fallback
        if (formRef.current.formId) {
          const formElement = document.getElementById(formRef.current.formId);
          if (formElement) {
            // Try various selectors
            const selectors = [
              `[name="${targetFieldKey}"]`,
              `[name="data[${targetFieldKey}]"]`,
              `[data-key="${targetFieldKey}"]`,
              `[id="${targetFieldKey}"]`
            ];
            
            let inputFound = false;
            
            for (const selector of selectors) {
              const input = formElement.querySelector(selector) as HTMLInputElement | null;
              if (input && 'value' in input) {
                input.value = inputValue;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                
                setTestResult({
                  success: true,
                  message: `Field updated via selector: ${selector}`
                });
                
                inputFound = true;
                break;
              }
            }
            
            if (!inputFound) {
              setTestResult({
                success: false,
                message: `Could not find field with key: ${targetFieldKey}`
              });
            }
          } else {
            setTestResult({
              success: false,
              message: `Form element with ID ${formRef.current.formId} not found`
            });
          }
        } else {
          setTestResult({
            success: false,
            message: 'No form ID available and no test callback provided'
          });
        }
      }
    } catch (error) {
      console.error('Error testing field:', error);
      setTestResult({
        success: false,
        message: String(error)
      });
    }
  };
  
  // Force refresh on form components directly
  const forceComponentRefresh = () => {
    if (!formRef?.current?.formio) {
      setTestResult({
        success: false,
        message: 'Form.io instance not available'
      });
      return;
    }
    
    try {
      const formio = formRef.current.formio;
      
      // Try various methods to force a refresh
      if (typeof formio.redraw === 'function') {
        formio.redraw();
      }
      
      if (typeof formio.triggerChange === 'function') {
        formio.triggerChange();
      }
      
      if (typeof formio.render === 'function') {
        formio.render();
      }
      
      setTestResult({
        success: true,
        message: 'Form refresh methods called'
      });
    } catch (error) {
      console.error('Error refreshing form:', error);
      setTestResult({
        success: false,
        message: String(error)
      });
    }
  };
  
  // Update form info when expanded
  useEffect(() => {
    if (expanded) {
      inspectForm();
    }
  }, [expanded]);
  
  return (
    <Accordion 
      expanded={expanded} 
      onChange={() => setExpanded(!expanded)}
      sx={{ mb: 2 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BugReportIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography>Form Debugger</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
          {/* Test Field Controls */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Test Field Population
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TextField
                label={`Test value for field "${targetFieldKey}"`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                size="small"
                sx={{ flexGrow: 1, mr: 2 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={useDataFormat}
                    onChange={(e) => setUseDataFormat(e.target.checked)}
                  />
                }
                label="Use data[XX] format"
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="contained"
                onClick={testField}
                color="primary"
              >
                Test Field
              </Button>
              <Button 
                variant="outlined"
                onClick={forceComponentRefresh}
                color="secondary"
              >
                Force Refresh
              </Button>
              <Button 
                variant="outlined"
                onClick={inspectForm}
              >
                Refresh Form Info
              </Button>
            </Box>
            
            {testResult && (
              <Alert 
                severity={testResult.success ? 'success' : 'error'}
                sx={{ mt: 2 }}
              >
                {testResult.message}
              </Alert>
            )}
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          {/* Form Information */}
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            Form Reference Information
          </Typography>
          
          {formInfo ? (
            <>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Form.io Instance" 
                    secondary={formInfo.hasFormio ? "Available" : "Not Available"} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Form ID" 
                    secondary={formInfo.formId} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="getComponents Method" 
                    secondary={formInfo.componentsMethod ? "Available" : "Not Available"} 
                  />
                </ListItem>
                {formInfo.hasFormio && (
                  <>
                    <ListItem>
                      <ListItemText 
                        primary="Form Submission" 
                        secondary={formInfo.hasSubmission ? "Available" : "Not Available"} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Form Data" 
                        secondary={formInfo.hasData ? "Available" : "Not Available"} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Form Schema" 
                        secondary={formInfo.hasFormSchema ? `Available (${formInfo.componentCount} components)` : "Not Available"} 
                      />
                    </ListItem>
                  </>
                )}
              </List>
              
              {formComponents.length > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Form Components: {formComponents.length}
                  </Typography>
                  <Box 
                    sx={{ 
                      maxHeight: 200, 
                      overflow: 'auto', 
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1
                    }}
                  >
                    {formComponents.map((comp, index) => (
                      <Box key={index} sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {comp.key || 'Unknown Key'}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', ml: 1 }}>
                          hasSetValue: {typeof comp.setValue === 'function' ? 'Yes' : 'No'}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
              
              {formInfo.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  Error: {formInfo.error}
                </Alert>
              )}
            </>
          ) : (
            <Typography color="text.secondary">
              Click "Refresh Form Info" to see form details
            </Typography>
          )}
        </Paper>
      </AccordionDetails>
    </Accordion>
  );
};

export default FormDebugger;
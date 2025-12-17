import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Form } from '@formio/react';
import { 
  Paper, 
  Typography, 
  Divider, 
  Box, 
  Tabs, 
  Tab, 
  Alert,
  CircularProgress,
  Button,
  TextField
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { supabase } from '../../lib/supabase';
import FormDebugger from './FormDebugger';
import { createImageComponent, fixImageComponentsInSchema } from './ImageComponent';
import { createWeatherCitiesComponent } from './WeatherCitiesComponent';
import { createSchoolClosingsComponent } from './SchoolClosingsComponent';
import { createWeatherForecastComponent } from './WeatherForecastComponent';
import { createElectionComponent } from './ElectionComponent';
import { ScheduleDialog } from '../ScheduleDialog';
import { MediaSelectorBridge } from './MediaSelectorBridge';

interface FormPreviewProps {
  schema?: any;
  templateId?: string | null;
  initialData?: any;
  readOnly?: boolean;
  showSubmitButton?: boolean;
  onSubmit?: (submission: any) => void;
  onError?: (error: any) => void;
  onSchemaLoad?: (schema: any) => void;
  showSettingsTab?: boolean;           // Whether to show the settings tab
  itemDuration?: number | null;        // Current duration value
  itemSchedule?: any;                  // Current schedule value
  onDurationChange?: (duration: number | null) => void;
  onScheduleChange?: (schedule: any) => void;
  initialTab?: number;                 // Initial tab index to display (0=Form, 1=Data, 2=Settings)
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
      id={`form-preview-tabpanel-${index}`}
      aria-labelledby={`form-preview-tab-${index}`}
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

const FormPreview = forwardRef<any, FormPreviewProps>(function FormPreview(props, ref) {
  const {
    schema,
    templateId,
    initialData = {},
    readOnly = false,
    showSubmitButton = true,
    onSubmit,
    onError,
    onSchemaLoad,
    showSettingsTab = false,
    itemDuration = null,
    itemSchedule = null,
    onDurationChange,
    onScheduleChange,
    initialTab = 0
  } = props;

  const [tabValue, setTabValue] = useState(initialTab);
  const [submissionData, setSubmissionData] = useState<any>(initialData);
  const [submission, setSubmission] = useState<any>({ data: initialData });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formSchema, setFormSchema] = useState<any>(schema || null);
  const [loading, setLoading] = useState(false);
  const [componentRegistered, setComponentRegistered] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  // Use ref to store form instance instead of state to avoid rerenders
  const formInstanceRef = useRef<any>(null);

  // Update tab when initialTab prop changes (e.g., when opening dialog with specific tab)
  useEffect(() => {
    setTabValue(initialTab);
  }, [initialTab]);
  
  // Track if we're in the middle of handling a submission
  const isSubmittingRef = useRef(false);
  
  // Track the last schema to prevent unnecessary updates
  const lastSchemaRef = useRef<string | null>(null);
  
  // Use ref to track loaded template (prevents multiple fetches)
  const lastLoadedTemplateIdRef = useRef<string | null>(null);
  
  // Track if we're currently fetching
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (!componentRegistered) {
      const Formio = (window as any).Formio;

      if (Formio) {
        try {
          // In development mode, force re-registration to support HMR
          const isDev = import.meta.env.DEV;

          // Register Image component
          if (isDev || !Formio.Components.components.image) {
            const ImageComponent = createImageComponent(Formio);
            if (ImageComponent) {
              Formio.Components.addComponent('image', ImageComponent);
              console.log('✅ Image component registered in FormPreview');
            }
          }

          // Register Weather Cities component
          if (isDev || !Formio.Components.components.weatherCities) {
            const WeatherCitiesComponent = createWeatherCitiesComponent(Formio);
            if (WeatherCitiesComponent) {
              Formio.Components.addComponent('weatherCities', WeatherCitiesComponent);
              console.log('✅ Weather Cities component registered in FormPreview');
            }
          }

          // Register School Closings component
          if (isDev || !Formio.Components.components.schoolClosings) {
            const SchoolClosingsComponent = createSchoolClosingsComponent(Formio);
            if (SchoolClosingsComponent) {
              Formio.Components.addComponent('schoolClosings', SchoolClosingsComponent);
              console.log('✅ School Closings component registered in FormPreview');
            }
          }

          // Register Weather Forecast component
          if (isDev || !Formio.Components.components.weatherForecast) {
            const WeatherForecastComponent = createWeatherForecastComponent(Formio);
            if (WeatherForecastComponent) {
              Formio.Components.addComponent('weatherForecast', WeatherForecastComponent);
              console.log('✅ Weather Forecast component registered in FormPreview');
            }
          }

          // Register Election component
          if (isDev || !Formio.Components.components.election) {
            const ElectionComponent = createElectionComponent(Formio);
            if (ElectionComponent) {
              Formio.Components.addComponent('election', ElectionComponent);
              console.log('✅ Election component registered in FormPreview');
            }
          }

          setComponentRegistered(true);
        } catch (error) {
          console.error('Failed to register custom components in FormPreview:', error);
        }
      }
    }
  }, [componentRegistered]);
  
  const formId = useMemo(() => `formio-${Math.random().toString(36).substr(2, 9)}`, []);

  useImperativeHandle(ref, () => {
    const updateField = (key: string, value: any): boolean => {
      try {
        if (formInstanceRef.current) {
          const component = formInstanceRef.current.getComponent(key);

          if (component && typeof component.setValue === 'function') {
            component.setValue(value);
            return true;
          }

          const altKey = `data[${key}]`;
          const altComponent = formInstanceRef.current.getComponent(altKey);

          if (altComponent && typeof altComponent.setValue === 'function') {
            altComponent.setValue(value);
            return true;
          }

          const element = document.querySelector(`[data-key="${key}"]`);
          if (element) {
            const input = element.querySelector('input, textarea, select') as HTMLInputElement;
            if (input) {
              input.value = value;
              input.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
        }

        console.warn(`Unable to update field "${key}"`);
        return false;
      } catch (err) {
        console.error(`Error updating field "${key}":`, err);
        return false;
      }
    };

    return {
      formio: formInstanceRef.current,

      getComponents: () => {
        if (formInstanceRef.current) {
          return formInstanceRef.current.getComponents();
        }
        
        const formElement = document.getElementById(formId);
        if (!formElement) return [];
        
        const componentElements = formElement.querySelectorAll('[data-component]');
        return Array.from(componentElements).map(element => {
          const key = element.getAttribute('data-key') || '';
          
          const setValue = (value: any) => {
            const input = element.querySelector('input, textarea, select');
            if (input) {
              (input as HTMLInputElement).value = value;
              const event = new Event('change', { bubbles: true });
              input.dispatchEvent(event);
              return true;
            }
            return false;
          };
          
          return { key, setValue };
        });
      },
      
      formId,
      schema: formSchema,

      getSubmissionData: () => {
        if (formInstanceRef.current) {
          const submission = formInstanceRef.current.submission || { data: {} };
          
          
          const collectData = (component: any): Record<string, any> => {
            const data: Record<string, any> = {};

            if (component.component?.input && component.component?.key) {
              const key = component.component.key;
              if (typeof component.getValue === 'function') {
                const value = component.getValue();
                if (value !== null && value !== undefined && value !== '') {
                  data[key] = value;

                  // For image components, preserve the cached filename
                  if (component.component?.type === 'image') {
                    let filename = null;

                    // Method 1: Check cached filename (for existing data)
                    if (component._cachedFilename) {
                      filename = component._cachedFilename;
                    }
                    // Method 2: Get from uploaded files (for new uploads)
                    else if (component.uploadedFiles && component.uploadedFiles.length > 0) {
                      filename = component.uploadedFiles[0].name;
                    }
                    // Method 3: Get from _dataValue (backup)
                    else if (component._dataValue && component._dataValue.name) {
                      filename = component._dataValue.name;
                    }
                    // Method 4: Try component.data
                    else if (component.data) {
                      const filenameKey = `__${key}_filename`;
                      for (const k in component.data) {
                        if (k === filenameKey) {
                          filename = component.data[k];
                          break;
                        }
                      }
                    }

                    // Save the filename if we found it
                    if (filename) {
                      data[`__${key}_filename`] = filename;
                    }
                  }

                  // For components with getAdditionalFields method (e.g., WeatherForecast, WeatherCities)
                  // This is the authoritative source for additional field data like location names
                  if (typeof component.getAdditionalFields === 'function') {
                    const additionalFields = component.getAdditionalFields();
                    console.log(`getAdditionalFields for ${key}:`, additionalFields);
                    if (additionalFields) {
                      Object.assign(data, additionalFields);
                    }
                  }
                }
              }
            }

            if (component.components && Array.isArray(component.components)) {
              component.components.forEach((child: any) => {
                Object.assign(data, collectData(child));
              });
            }

            return data;
          };

          const collectedData = collectData(formInstanceRef.current);

          // Also use everyComponent to catch custom components that may not be in the standard tree
          if (typeof formInstanceRef.current.everyComponent === 'function') {
            formInstanceRef.current.everyComponent((comp: any) => {
              const compKey = comp.component?.key;
              if (!compKey) return;

              // First, try getAdditionalFields() - the authoritative method for custom components
              if (typeof comp.getAdditionalFields === 'function') {
                const additionalFields = comp.getAdditionalFields();
                if (additionalFields) {
                  // Only add fields that weren't already collected
                  for (const [fieldKey, fieldValue] of Object.entries(additionalFields)) {
                    if (!collectedData[fieldKey]) {
                      collectedData[fieldKey] = fieldValue;
                      console.log(`everyComponent getAdditionalFields for ${compKey}:`, fieldKey, fieldValue);
                    }
                  }
                }
              }
            });
          }
          
          return {
            ...submission,
            data: {
              ...submission.data,
              ...collectedData
            }
          };
        }
        return { data: submissionData };
      },

      updateField,
      
      updateFields: (fields: Record<string, any>) => {
        let successCount = 0;
        let failCount = 0;

        Object.entries(fields).forEach(([key, value]) => {
          let processedKey = key;

          if (key.startsWith('data[') && key.endsWith(']')) {
            processedKey = key.substring(5, key.length - 1);
          }

          const success = updateField(processedKey, value);
          if (success) {
            successCount++;
          } else {
            failCount++;
          }
        });
        
        if (formInstanceRef.current) {
          if (typeof formInstanceRef.current.triggerChange === 'function') {
            formInstanceRef.current.triggerChange();
          }
          if (typeof formInstanceRef.current.redraw === 'function') {
            formInstanceRef.current.redraw();
          }
        }
        
        return successCount > 0;
      }
    };
  }, [formId, formSchema, submissionData]);

  const fetchFormSchema = useCallback(async () => {
    if (!templateId) return;

    // Check ref to prevent duplicate fetches
    if (lastLoadedTemplateIdRef.current === templateId) {
      return;
    }
    
    // Check if already fetching
    if (isFetchingRef.current) {
      return;
    }
    
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const { data: formData, error: formError } = await supabase
        .from('template_forms')
        .select('schema')
        .eq('template_id', templateId)
        .maybeSingle();
      
      if (formError) throw formError;
      
      if (formData?.schema) {
        const fixedSchema = fixImageComponentsInSchema(formData.schema);
        lastSchemaRef.current = JSON.stringify(fixedSchema); // Track fetched schema
        setFormSchema(fixedSchema);
        lastLoadedTemplateIdRef.current = templateId; // Update ref

        if (onSchemaLoad) {
          onSchemaLoad(fixedSchema);
        }
      } else {
        const { data: tabfields, error: tabfieldsError } = await supabase
          .from('tabfields')
          .select('*')
          .eq('template_id', templateId);
        
        if (tabfieldsError) throw tabfieldsError;
        
        if (tabfields && tabfields.length > 0) {
          const components = tabfields.map(field => {
            const baseComponent = {
              type: field.options?.type || 'textfield',
              key: field.name,
              label: field.options?.label || field.name,
              placeholder: field.options?.placeholder || '',
              defaultValue: field.value,
              input: true,
              persistent: true
            };
            
            if (field.options?.type === 'image') {
              return {
                ...baseComponent,
                storage: 'supabase',
                supabaseBucket: field.options?.supabaseBucket || 'images',
                supabaseFolder: field.options?.supabaseFolder || 'uploads',
                fileMaxSize: field.options?.fileMaxSize || '10MB',
                filePattern: field.options?.filePattern || '*.jpg,*.jpeg,*.png,*.gif,*.webp'
              };
            }
            
            return baseComponent;
          });
          
          const newSchema = {
            display: 'form',
            components
          };
          
          lastSchemaRef.current = JSON.stringify(newSchema); // Track generated schema
          setFormSchema(newSchema);
          lastLoadedTemplateIdRef.current = templateId; // Update ref
          
          if (onSchemaLoad) {
            onSchemaLoad(newSchema);
          }
        } else {
          setFormSchema(null);
          setError('No form configuration found for this template');

          if (onSchemaLoad) {
            onSchemaLoad(null);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching form schema:', error);
      setError('Failed to load form schema');
      setFormSchema(null);
      
      if (onSchemaLoad) {
        onSchemaLoad(null);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [templateId, onSchemaLoad]);

  // Load schema from prop or fetch from database
  useEffect(() => {
    if (schema) {
      // Compare schema content, not reference
      const schemaString = JSON.stringify(schema);
      if (lastSchemaRef.current !== schemaString) {
        lastSchemaRef.current = schemaString;
        const fixedSchema = fixImageComponentsInSchema(schema);
        setFormSchema(fixedSchema);
      } else {
      }
    } else if (templateId && templateId !== lastLoadedTemplateIdRef.current) {
      fetchFormSchema();
    }
    // DON'T include fetchFormSchema in deps - it's stable via useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, templateId]);

  // Separate cleanup effect that only runs on unmount
  useEffect(() => {
    return () => {
      setFormSchema(null);
      setSubmission({ data: {} });
      setSubmissionData({});
      setError(null);
      setSuccess(null);
    };
  }, []); // Empty deps = only on mount/unmount

  // Update submission whenever initialData changes
  useEffect(() => {
    if (Object.keys(initialData).length > 0) {
      setSubmission({ data: { ...initialData } });
      setSubmissionData({ ...initialData });
    }
  }, [initialData]);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  // Memoize handleSubmit to prevent recreation on every render
  const handleSubmit = useCallback((submission: any) => {
    // Prevent double submissions
    if (isSubmittingRef.current) {
      return;
    }
    
    isSubmittingRef.current = true;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      setSubmission(submission);
      setSubmissionData(submission.data);
      
      if (onSubmit) {
        Promise.resolve(onSubmit(submission))
          .then(() => {
            setSuccess('Form submitted successfully');
            setSubmitting(false);
            isSubmittingRef.current = false;
          })
          .catch(err => {
            console.error('Form submission error:', err);
            setError(err.message || 'Error submitting form');
            if (onError) onError(err);
            setSubmitting(false);
            isSubmittingRef.current = false;
          });
      } else {
        setSuccess('Form submitted successfully (preview mode)');
        setSubmitting(false);
        isSubmittingRef.current = false;
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err instanceof Error ? err.message : 'Error submitting form');
      if (onError) onError(err);
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  }, [onSubmit, onError]);

  // Memoize captureFormInstance to prevent recreation
  const captureFormInstance = useCallback((form: any) => {
    
    formInstanceRef.current = form;
    
    // Fix character count display for existing data
    if (form) {
      setTimeout(() => {
        try {
          form.everyComponent((component: any) => {
            if (component.component?.showCharCount) {
              const currentValue = component.getValue();
              
              if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
                
                // Get the actual DOM element using the component's element property
                if (component.element) {
                  // Try to find the input/textarea within the component element
                  const inputElement = component.element.querySelector('input, textarea');
                  
                  if (inputElement) {
                    
                    // Dispatch keyboard events on the actual DOM element
                    ['keydown', 'keyup', 'input'].forEach(eventType => {
                      const event = new Event(eventType, {
                        bubbles: true,
                        cancelable: true
                      });
                      inputElement.dispatchEvent(event);
                    });
                    
                  } else {
                  }
                }
              }
            }

            if (component.component?.validate?.maxLength) {
              const maxLength = component.component.validate.maxLength;
              
              if (component.element) {
                const wrapper = component.element;
                wrapper.classList.add('has-char-limit');
                
                const inputElement = wrapper.querySelector('input, textarea');
                if (inputElement) {
                  // Calculate approximate position based on font
                  const style = window.getComputedStyle(inputElement);
                  const fontSize = parseFloat(style.fontSize);
                  const charWidth = fontSize * 0.6; // Approximate character width
                  const limitPosition = charWidth * maxLength;
                  
                  // Set the line position
                  wrapper.style.setProperty('--limit-position', `${limitPosition}px`);
                }
              }
            }
          });
        } catch (err) {
          console.error('Error updating character counts:', err);
        }
      }, 1000);
    }
    
  }, []);

  // Memoize form options to prevent recreation
  const formOptions = useMemo(() => ({
    readOnly: readOnly,
    noAlerts: true,
    submitOnEnter: false,
    enableScripting: true,
    enableAdvancedValidation: true,
    sanitizeConfig: {
      addTags: ['script'],
      addAttr: ['onclick']
    },
    hooks: {
      beforeSubmit: (_submission: any, next: any) => {
        next();
      }
    }
  }), [readOnly]);

  const handleTestField = useCallback((fieldData: Record<string, any>) => {
    
    if (ref && 'current' in ref && ref.current && typeof ref.current.updateFields === 'function') {
      const success = ref.current.updateFields(fieldData);
      return success;
    }
    
    return false;
  }, [ref]);

  const renderScheduleSummary = (schedule: any) => {
    if (!schedule) return 'No schedule set';
    
    const parts = [];
    
    if (schedule.startDate && schedule.endDate) {
      parts.push(`${new Date(schedule.startDate).toLocaleDateString()} - ${new Date(schedule.endDate).toLocaleDateString()}`);
    } else if (schedule.startDate) {
      parts.push(`From ${new Date(schedule.startDate).toLocaleDateString()}`);
    } else if (schedule.endDate) {
      parts.push(`Until ${new Date(schedule.endDate).toLocaleDateString()}`);
    }
    
    const selectedDays = Object.entries(schedule.daysOfWeek || {})
      .filter(([_, enabled]) => enabled)
      .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1, 3));
    
    if (selectedDays.length > 0) {
      parts.push(selectedDays.join(', '));
    }
    
    const times = (schedule.timeRanges || [])
      .filter((r: any) => r.start && r.end)
      .map((r: any) => `${r.start}-${r.end}`);
    
    if (times.length > 0) {
      parts.push(times.join(', '));
    }
    
    return parts.length > 0 ? parts.join(' | ') : 'Always active';
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!formSchema) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          {error || 'No form schema available'}
        </Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {false && (
        <FormDebugger 
          formRef={ref} 
          onTestField={handleTestField}
        />
      )}
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="form preview tabs"
        >
          <Tab label="Form" />
          <Tab label="Submission Data" />
          {showSettingsTab && <Tab label="Settings" />}
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {(error || success) && (
          <Box sx={{ mb: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
          </Box>
        )}

        {submitting ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <div id={formId}>
            <Form
              key={`form-${templateId}-${Object.keys(initialData).length}`}
              form={formSchema}
              submission={submission}
              onSubmit={handleSubmit}
              options={formOptions}
              formReady={(formInstance: any) => {
                captureFormInstance(formInstance);
              }}
            />
          </div>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          Form Submission Data
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {!readOnly && showSubmitButton && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleSubmit(submission)}
            sx={{ mb: 2 }}
          >
            Save Changes
          </Button>
        )}
        <Box
          component="pre"
          sx={{
            p: 2,
            borderRadius: 1,
            bgcolor: 'grey.100',
            overflow: 'auto',
            maxHeight: '500px',
            '& code': {
              display: 'block',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }
          }}
        >
          <code>{JSON.stringify(submissionData, null, 2)}</code>
        </Box>
      </TabPanel>

      {showSettingsTab && (
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Item Settings
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          {/* Duration Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Duration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Set how long this item should be displayed (in seconds)
            </Typography>
            <TextField
              label="Duration (seconds)"
              type="number"
              value={itemDuration !== null ? itemDuration : ''}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (onDurationChange) {
                  onDurationChange(isNaN(val) ? null : val);
                }
              }}
              fullWidth
              variant="outlined"
              helperText={
                'Override the default duration in seconds'
              }
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          {/* Schedule Section */}
          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Schedule
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Configure when this item should be active. Leave empty for "always active".
            </Typography>
            
            <Button
              variant="outlined"
              onClick={() => setScheduleDialogOpen(true)}
              fullWidth
              size="large"
              sx={{ mb: 2 }}
            >
              {itemSchedule ? 'Edit Schedule' : 'Set Schedule'}
            </Button>
            
            {/* Display current schedule */}
            {itemSchedule && (
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  bgcolor: 'grey.50', 
                  border: '1px solid',
                  borderColor: 'grey.300',
                  borderRadius: 1 
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      Current Schedule:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {renderScheduleSummary(itemSchedule)}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    color="secondary"
                    startIcon={<RestartAltIcon />}
                    onClick={() => {
                      if (onScheduleChange) {
                        onScheduleChange(null);
                      }
                    }}
                    sx={{ ml: 2 }}
                  >
                    Clear
                  </Button>
                </Box>
              </Paper>
            )}
            
            {!itemSchedule && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No schedule configured - this item will be active all the time
              </Alert>
            )}
          </Box>
          
          {/* Schedule Dialog */}
          <ScheduleDialog
            open={scheduleDialogOpen}
            onClose={() => setScheduleDialogOpen(false)}
            onSave={(schedule) => {
              if (onScheduleChange) {
                onScheduleChange(schedule);
              }
              setScheduleDialogOpen(false);
            }}
            initialSchedule={itemSchedule}
          />
        </TabPanel>
      )}

      {/* Media Selector Bridge for FormIO Image components */}
      <MediaSelectorBridge />
    </Paper>
  );
});

FormPreview.displayName = 'FormPreview';

export default FormPreview;
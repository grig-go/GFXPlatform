import React, { useCallback, useState, useEffect, useRef } from 'react';
import { FormBuilder, Form } from '@formio/react';
import { supabase } from '../../lib/supabase';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tab,
  Tabs,
  AppBar,
  Typography,
  Box,
  Divider,
  TextField,
  IconButton,
  CircularProgress
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import DataObjectIcon from '@mui/icons-material/DataObject';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import CodeEditor from '@monaco-editor/react';
import { createImageComponent } from './ImageComponent';
import { createWeatherCitiesComponent } from './WeatherCitiesComponent';
import { createSchoolClosingsComponent } from './SchoolClosingsComponent';
import { createWeatherForecastComponent } from './WeatherForecastComponent';
import { createElectionComponent } from './ElectionComponent';
import { MediaSelectorBridge } from './MediaSelectorBridge';

interface FormEditorProps {
  templateId: string | null;
  open: boolean;
  onClose: () => void;
  onSave: (schema: any) => void;
  initialSchema: any;
  defaultTab?: 'edit' | 'preview';
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
      id={`form-editor-tabpanel-${index}`}
      aria-labelledby={`form-editor-tab-${index}`}
      style={{ height: '100%', overflow: 'auto' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3, height: '100%' }}>{children}</Box>
      )}
    </div>
  );
}

// Base default schema with proper minimal structure for Form.io builder
const defaultFormSchema = {
  display: 'form',
  type: 'form',
  components: []
};

// Enhanced Form Editor that includes the Form.io Builder
const FormEditor: React.FC<FormEditorProps> = ({ 
  templateId, 
  open, 
  onClose, 
  onSave, 
  initialSchema,
  defaultTab = 'edit'
}) => {
  const builderRef = useRef<any>(null);
  const isInitializingRef = useRef<boolean>(false);
  const initializationCountRef = useRef<number>(0);

  // Initialize tabValue based on defaultTab prop
  const [tabValue, setTabValue] = useState(defaultTab === 'preview' ? 3 : 0);
  const [formSchema, setFormSchema] = useState<any>(defaultFormSchema);
  const [jsonEditor, setJsonEditor] = useState<string>(JSON.stringify(defaultFormSchema, null, 2));
  const [, setDataSources] = useState<any[]>([]);
  const [scriptingEnabled, setScriptingEnabled] = useState<boolean>(true);
  const [advancedValidationEnabled, setAdvancedValidationEnabled] = useState<boolean>(true);
  const [formSettings, setFormSettings] = useState<any>({});
  const [previewData] = useState<any>({});
  const [builderKey, setBuilderKey] = useState<string>('initial');
  const [componentRegistered, setComponentRegistered] = useState(false);
  const [loading] = useState(false);

  // Clean up FormIO dialogs function
  const cleanupFormIODialogs = useCallback(() => {
    // Only remove dialogs that are actually supposed to be closed
    const formioDialogs = document.querySelectorAll('.formio-dialog, .formio-dialog-overlay, .modal-backdrop');
    formioDialogs.forEach(dialog => {
      // Check if the dialog is actually meant to be closed
      const dialogElement = dialog as HTMLElement;
      if (dialogElement && !dialogElement.querySelector('.formio-component-settings')) {
        if (dialog.parentNode) {
          dialog.parentNode.removeChild(dialog);
        }
      }
    });
    
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  }, []);

  // Register custom components when dialog opens
  useEffect(() => {
    if (open && !componentRegistered) {
      // Get Formio from window (loaded by @formio/react)
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
              console.log('✅ Image component registered');
            }
          }

          // Register Weather Cities component
          if (isDev || !Formio.Components.components.weatherCities) {
            const WeatherCitiesComponent = createWeatherCitiesComponent(Formio);
            if (WeatherCitiesComponent) {
              Formio.Components.addComponent('weatherCities', WeatherCitiesComponent);
              console.log('✅ Weather Cities component registered');
            }
          }

          // Register School Closings component
          if (isDev || !Formio.Components.components.schoolClosings) {
            const SchoolClosingsComponent = createSchoolClosingsComponent(Formio);
            if (SchoolClosingsComponent) {
              Formio.Components.addComponent('schoolClosings', SchoolClosingsComponent);
              console.log('✅ School Closings component registered');
            }
          }

          // Register Weather Forecast component
          if (isDev || !Formio.Components.components.weatherForecast) {
            const WeatherForecastComponent = createWeatherForecastComponent(Formio);
            if (WeatherForecastComponent) {
              Formio.Components.addComponent('weatherForecast', WeatherForecastComponent);
              console.log('✅ Weather Forecast component registered');
            }
          }

          // Register Election component
          if (isDev || !Formio.Components.components.election) {
            const ElectionComponent = createElectionComponent(Formio);
            if (ElectionComponent) {
              Formio.Components.addComponent('election', ElectionComponent);
              console.log('✅ Election component registered');
            }
          }

          setComponentRegistered(true);
        } catch (error) {
          console.error('Failed to register custom components:', error);
        }
      }
    }
  }, [open, componentRegistered]);

  // Initialize schema immediately when dialog opens or when initialSchema changes
  useEffect(() => {
    if (!open) return;

    console.log('FormEditor opened, initializing...');
    console.log('Initial schema received:', initialSchema);

    // Set initialization flag and reset counter
    isInitializingRef.current = true;
    initializationCountRef.current = 0;

    let validSchema;

    if (initialSchema && typeof initialSchema === 'object' && Object.keys(initialSchema).length > 0) {
      console.log('Using initialSchema:', initialSchema);
      validSchema = {
        display: initialSchema.display || 'form',
        type: initialSchema.type || 'form',
        components: initialSchema.components || [],
        ...initialSchema
      };
    } else {
      console.log('No valid initialSchema, using default');
      validSchema = { ...defaultFormSchema };
    }

    console.log('Final schema to use:', validSchema);

    setFormSchema(validSchema);
    setJsonEditor(JSON.stringify(validSchema, null, 2));

    // Force a new builder key to ensure full remount and component menu loads
    const newKey = `form-builder-${templateId || 'new'}-${Date.now()}`;
    setBuilderKey(newKey);

    // Clear initialization flag after a delay, but also have a maximum timeout
    const initTimer = setTimeout(() => {
      if (isInitializingRef.current) {
        isInitializingRef.current = false;
        console.log('Builder initialization timeout reached, accepting changes now');

        // Force a refresh of the builder to ensure component menu loads
        if (builderRef.current && builderRef.current.instance) {
          builderRef.current.instance.redraw();
        }
      }
    }, 2000);

    // Clean up timer on unmount or re-run
    return () => {
      clearTimeout(initTimer);
    };

  }, [open, initialSchema, templateId]);

  // Load data sources
  useEffect(() => {
    if (!open) return;
    
    const fetchDataSources = async () => {
      try {
        const { data, error } = await supabase
          .from('data_sources')
          .select('*');
        
        if (error) throw error;
        setDataSources(data || []);
      } catch (error) {
        console.error('Error loading data sources:', error);
      }
    };

    fetchDataSources();
  }, [open]);

  // Load form settings
  useEffect(() => {
    if (!templateId || !open) return;

    const fetchFormSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('template_settings')
          .select('*')
          .eq('template_id', templateId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading form settings:', error);
          return;
        }

        if (data) {
          console.log('Loaded form settings:', data);
          setFormSettings(data.settings || {});
          setScriptingEnabled(data.scripting_enabled ?? true);
          setAdvancedValidationEnabled(data.advanced_validation_enabled ?? true);
        } else {
          // Reset to empty if no settings exist for this template
          setFormSettings({});
        }
      } catch (error) {
        console.error('Error loading form settings:', error);
      }
    };

    fetchFormSettings();
  }, [templateId, open]);

  // Clean up FormIO dialogs when component unmounts or dialog closes
  useEffect(() => {
    if (!open) {
      cleanupFormIODialogs();
    }
    
    return () => {
      cleanupFormIODialogs();
    };
  }, [open, cleanupFormIODialogs]);

  // Add event listeners to handle FormIO dialog events
  useEffect(() => {
    if (!open) return;

    const handleFormIOEvents = (event: Event) => {
      const target = event.target as HTMLElement;

      // Only clean up if it's actually a button that should close the dialog
      if (target && target.tagName === 'BUTTON' && (
        target.classList.contains('btn-success') ||
        target.classList.contains('btn-danger') ||
        (target.classList.contains('btn-secondary') && target.textContent?.includes('Cancel')) ||
        target.textContent === 'Save' ||
        target.textContent === 'Remove Component'
      )) {
        // Only clean up after the FormIO action has completed
        setTimeout(() => {
          // Check if there are still any FormIO dialogs that should be closed
          const openDialogs = document.querySelectorAll('.formio-dialog, .formio-component-settings');
          if (openDialogs.length === 0) {
            cleanupFormIODialogs();
          }
        }, 500);
      }
    };

    // Prevent Delete/Backspace key events from propagating when FormIO dialog is open
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Check if a FormIO dialog is open
        const formioDialog = document.querySelector('.formio-dialog, .formio-dialog-overlay, .formio-component-modal-wrapper');
        if (formioDialog) {
          // Allow the event within input fields
          const target = event.target as HTMLElement;
          const isInputField = target.tagName === 'INPUT' ||
                              target.tagName === 'TEXTAREA' ||
                              target.isContentEditable;
          if (!isInputField) {
            event.stopPropagation();
          }
        }
      }
    };

    document.addEventListener('click', handleFormIOEvents, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('click', handleFormIOEvents, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open, cleanupFormIODialogs]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    if (newValue === 1 && formSchema) {
      setJsonEditor(JSON.stringify(formSchema, null, 2));
    }
    else if (tabValue === 1) {
      try {
        const parsedSchema = JSON.parse(jsonEditor);
        if (!parsedSchema || typeof parsedSchema !== 'object') {
          console.error('Invalid JSON format');
          return;
        }
        setFormSchema(parsedSchema);
      } catch (error) {
        console.error('Invalid JSON:', error);
        return;
      }
    }
    
    setTabValue(newValue);
  };

  const handleBuilderChange = (schema: any) => {
    if (!schema || typeof schema !== 'object') {
      console.error('Invalid schema received from builder:', schema);
      return;
    }

    // During initialization, increment counter and ignore the first few onChange events
    if (isInitializingRef.current) {
      initializationCountRef.current++;
      console.log(`Builder initialization change ${initializationCountRef.current} - ignoring`);

      // Check if the schema from builder matches what we expect
      const isDefaultSubmitOnly = schema.components &&
                                   schema.components.length === 1 &&
                                   schema.components[0].key === 'submit' &&
                                   schema.components[0].type === 'button';

      // Check if we have the expected schema loaded
      const hasExpectedComponents = formSchema.components &&
                                    formSchema.components.length > 0;

      // If we're expecting components and builder loaded with real components, stop ignoring
      if (hasExpectedComponents && !isDefaultSubmitOnly) {
        isInitializingRef.current = false;
        console.log('Builder loaded with correct schema, accepting changes now');
      }
      // If we've had enough initialization events (builder should be fully loaded), stop ignoring
      else if (initializationCountRef.current >= 5) {
        isInitializingRef.current = false;
        console.log('Builder initialization count reached, accepting changes now');
      }

      return; // Don't apply this change during initialization
    }

    console.log('Builder changed schema:', schema);

    const updatedSchema = {
      ...schema,
      settings: {
        ...(formSchema?.settings || {}),
        ...(schema.settings || {})
      }
    };

    setFormSchema(updatedSchema);

    // Only clean up dialogs if schema actually changed (component was saved/removed)
    // Don't clean up just from opening component settings
  };

  const handleJsonChange = (value: string | undefined) => {
    if (value) {
      setJsonEditor(value);
    }
  };

  const handleFormSettingChange = (key: string, value: any) => {
    setFormSettings((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveForm = useCallback(async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!formSchema) {
      console.error('No form schema to save');
      return;
    }

    if (tabValue === 1) {
      try {
        const parsedSchema = JSON.parse(jsonEditor);
        if (!parsedSchema || typeof parsedSchema !== 'object') {
          console.error('Invalid JSON format');
          return;
        }
        setFormSchema(parsedSchema);
      } catch (error) {
        console.error('Invalid JSON:', error);
        return;
      }
    }

    const finalSchema = {
      ...formSchema,
      settings: {
        ...(formSchema.settings || {}),
        enableScripting: scriptingEnabled,
        enableAdvancedValidation: advancedValidationEnabled
      }
    };

    if (templateId) {
      try {
        console.log('Saving template_settings for templateId:', templateId);
        console.log('formSettings to save:', formSettings);
        const { data, error } = await supabase.from('template_settings').upsert({
          template_id: templateId,
          settings: formSettings,
          scripting_enabled: scriptingEnabled,
          advanced_validation_enabled: advancedValidationEnabled
        }, {
          onConflict: 'template_id'
        }).select();

        if (error) {
          console.error('Error saving form settings:', error);
        } else {
          console.log('Saved template_settings successfully:', data);
        }
      } catch (error) {
        console.error('Error saving form settings:', error);
      }
    } else {
      console.log('No templateId provided, skipping template_settings save');
    }

    console.log('Saving final schema:', finalSchema);
    
    cleanupFormIODialogs();
    onSave(finalSchema);
    onClose();
  }, [formSchema, tabValue, jsonEditor, scriptingEnabled, advancedValidationEnabled, templateId, formSettings, onSave, onClose, cleanupFormIODialogs]);
  
  const handleCloseDialog = useCallback((event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    cleanupFormIODialogs();
    onClose();
  }, [cleanupFormIODialogs, onClose]);

  const getBuilderOptions = () => {
    const fieldsToHide = {
      display: ['widget', 'allowMultipleMasks', 'customClass', 'modalEdit'],
      data: ['multiple', 'persistent', 'inputFormat', 'protected', 'dbIndex', 'redrawOn', 'calculateServer', 'allowCalculateOverride'],
      validation: ['validateOn', 'validate.required', 'unique', 'validateWhenHidden']
    };
      
    const componentTypes = [
      'textfield', 'textarea', 'number', 'checkbox', 
      'selectboxes', 'select', 'radio', 'datetime',
      'day', 'time', 'file', 'container', 'datamap',
      'datagrid', 'editgrid', 'tree', 'panel', 'table',
      'tabs', 'well', 'columns', 'fieldset', 'content'
    ];

    const editFormConfig: any = {};

    componentTypes.forEach(componentType => {
      editFormConfig[componentType] = [];
      
      Object.entries(fieldsToHide).forEach(([tabKey, fields]) => {
        const tabConfig = {
          key: tabKey,
          ignore: false,
          components: []
        };
        
        fields.forEach(field => {
          (tabConfig.components as any).push({
            key: field,
            ignore: true
          });
        });
        
        editFormConfig[componentType].push(tabConfig);
      });
    });
    
    const options = {
      builder: {
        custom: {
          title: 'Custom',
          default: false,
          weight: 5,
          components: {
            weatherCities: true,
            schoolClosings: true,
            weatherForecast: true
          }
        },
        basic: {
          default: true,
          components: {
            textfield: true,
            textarea: true,
            number: true,
            password: false,
            checkbox: true,
            selectboxes: true,
            select: true,
            radio: true,
            button: false,
            image: true
          }
        },
        advanced: {
          components: {
            email: false,
            url: false,
            phoneNumber: false,
            tags: false,
            address: false,
            datetime: true,
            day: true,
            time: true,
            currency: false,
            survey: false,
            signature: false,
            file: true
          }
        },
        data: {
          components: {
            hidden: false,
            container: true,
            datamap: true,
            datagrid: true,
            editgrid: true,
            tree: true
          }
        },
        layout: {
          components: {
            panel: true,
            table: true,
            tabs: true,
            well: true,
            columns: true,
            fieldset: true,
            content: true,
            htmlelement: false
          }
        }
      },
      editForm: editFormConfig,
      noDefaultSubmitButton: true
    };

    return options;
  };

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          return; // Prevent closing
        }
        handleCloseDialog();
      }}
      maxWidth="xl"
      fullWidth
      disableEnforceFocus={true}
      disableAutoFocus={true}
      disableRestoreFocus={true}
      disableEscapeKeyDown={false}
      BackdropProps={{
        style: {
          pointerEvents: 'auto'
        },
        onClick: (e) => {
          e.stopPropagation();
          if (e.target === e.currentTarget) {
            handleCloseDialog(e);
          }
        }
      }}
      PaperProps={{
        style: {
          height: '90vh',
          maxHeight: '900px',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'auto'
        }
      }}
    >
      <DialogTitle>
        <Typography variant="h6">Form Builder</Typography>
        <IconButton
          aria-label="close"
          onClick={handleCloseDialog}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <AppBar position="static" color="default" elevation={0}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Form Builder" icon={<SettingsIcon />} />
          <Tab label="JSON Editor" icon={<CodeIcon />} />
          <Tab label="Settings" icon={<DataObjectIcon />} />
          <Tab label="Preview" icon={<VisibilityIcon />} />
        </Tabs>
      </AppBar>
      
      <DialogContent 
        style={{ 
          padding: 0, 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflowY: 'auto',
          pointerEvents: 'auto'
        }}
        tabIndex={-1}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading form builder...</Typography>
          </Box>
        ) : (
          <>
            <TabPanel value={tabValue} index={0}>
              <Box
                ref={builderRef}
                sx={{
                  flex: 1,
                  display: 'flex',
                  overflow: 'hidden',
                  width: '100%',
                  '& > div': {
                    width: '100%',
                    maxWidth: '100%'
                  },
                  '& .formbuilder': {
                    width: '100%',
                    maxWidth: '100%'
                  },
                  '& .formbuilder > *': {
                    boxSizing: 'border-box'
                  }
                }}
              >
                {formSchema && (
                  <FormBuilder
                    key={builderKey}
                    form={formSchema}
                    onChange={handleBuilderChange}
                    options={getBuilderOptions()}
                  />
                )}
              </Box>
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ height: '100%' }}>
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    try {
                      const formattedJson = JSON.stringify(JSON.parse(jsonEditor), null, 2);
                      setJsonEditor(formattedJson);
                    } catch (error) {
                      console.error('Invalid JSON:', error);
                    }
                  }}
                  sx={{ mb: 2 }}
                >
                  Format JSON
                </Button>
                <CodeEditor
                  height="calc(100% - 50px)"
                  language="json"
                  value={jsonEditor}
                  onChange={handleJsonChange}
                  options={{
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    formatOnPaste: true,
                    formatOnType: false
                  }}
                />
              </Box>
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
              <Box>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Item Display Name Format"
                  value={formSettings.displayNameFormat || ''}
                  onChange={(e) => handleFormSettingChange('displayNameFormat', e.target.value)}
                  helperText="Format for item names in Content grid. Use {fieldName} for field values, {name} for item name. Example: {headline} - {date}"
                  placeholder="{name} [{field1}, {field2}]"
                />
              </Box>
            </TabPanel>
            
            <TabPanel value={tabValue} index={3}>
              <Box sx={{ height: '100%', overflow: 'auto' }}>
                <Typography variant="h6" gutterBottom>Form Preview</Typography>
                <Divider sx={{ mb: 2 }} />
                {formSchema ? (
                  <Form
                    form={formSchema}
                    submission={{ data: previewData }}
                    options={{
                      readOnly: false,
                      noAlerts: false
                    } as any}
                  />
                ) : (
                  <Typography>No form schema available for preview</Typography>
                )}
              </Box>
            </TabPanel>
          </>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
        <Button
          onClick={handleCloseDialog}
          color="primary"
          variant="outlined"
          sx={{ mr: 1 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSaveForm}
          color="primary"
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={loading}
        >
          Save Form
        </Button>
      </DialogActions>

      {/* Media Selector Bridge for FormIO Image components */}
      <MediaSelectorBridge />
    </Dialog>
  );
};

export { FormEditor };
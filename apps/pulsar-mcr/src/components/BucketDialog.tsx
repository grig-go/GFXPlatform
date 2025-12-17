// src/components/BucketDialog.tsx - Enhanced version with bucket config
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert
} from '@mui/material';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTemplates } from '../hooks/useTemplates';

export interface BucketConfig {
  generateItem?: {
    enabled: boolean;
    templateId?: string;
    fieldName?: string;
    fieldValue?: string;
  };
}

interface BucketDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (bucket: BucketData) => void;
  initialData?: BucketData;
  mode: 'create' | 'edit';
  parentFolder?: { id: string; name: string };
  existingNames?: string[];
  allBucketNames?: string[];
}

interface BucketData {
  name: string;
  active: boolean;
  parent_id?: string;
  bucket_config?: BucketConfig;
}

export const BucketDialog: React.FC<BucketDialogProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  mode = 'create',
  parentFolder,
  existingNames = [],
  allBucketNames = []
}) => {
  const { templates } = useTemplates();
  const [formData, setFormData] = useState<BucketData>({
    name: '',
    active: true,
    parent_id: parentFolder?.id,
    bucket_config: {
      generateItem: {
        enabled: false,
        templateId: undefined,
        fieldName: '',
        fieldValue: ''
      }
    }
  });
  const [nameError, setNameError] = useState<string>('');
  const [availableFields, setAvailableFields] = useState<string[]>([]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          ...initialData,
          bucket_config: initialData.bucket_config || {
            generateItem: {
              enabled: false,
              templateId: undefined,
              fieldName: '',
              fieldValue: ''
            }
          }
        });
        
        // Load template fields if already configured
        if (initialData.bucket_config?.generateItem?.templateId) {
          loadTemplateFields(initialData.bucket_config.generateItem.templateId);
        }
      } else {
        // Generate a suggested name for new buckets
        const bucketsInFolder = existingNames.filter(name => 
          name.match(/^Bucket \d+$/)
        );
        const baseNumber = bucketsInFolder.length + 1;
        setFormData({
          name: `Bucket ${baseNumber}`,
          active: true,
          parent_id: parentFolder?.id,
          bucket_config: {
            generateItem: {
              enabled: false,
              templateId: undefined,
              fieldName: '',
              fieldValue: ''
            }
          }
        });
      }
      setNameError('');
      setAvailableFields([]);
    }
  }, [open, initialData, parentFolder, existingNames]);

  const loadTemplateFields = async (templateId: string) => {
    const { supabase } = await import('../lib/supabase');
    
    try {
      const { data: fields, error } = await supabase
        .from('tabfields')
        .select('name')
        .eq('template_id', templateId)
        .order('name');
      
      if (error) throw error;
      setAvailableFields(fields?.map(f => f.name) || []);
    } catch (err) {
      console.error('Error loading template fields:', err);
      setAvailableFields([]);
    }
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, name: value }));
    
    // Validate name
    if (!value.trim()) {
      setNameError('Bucket name is required');
    } else if (mode === 'create' && allBucketNames.includes(value)) {
      setNameError('A bucket with this name already exists in the system');
    } else if (mode === 'edit' && value !== initialData?.name && allBucketNames.includes(value)) {
      setNameError('A bucket with this name already exists in the system');
    } else {
      setNameError('');
    }
  };

  const handleGenerateItemEnabledChange = (enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      bucket_config: {
        ...prev.bucket_config,
        generateItem: {
          ...prev.bucket_config?.generateItem,
          enabled
        }
      }
    }));
  };

  const handleTemplateChange = async (templateId: string) => {
    setFormData(prev => ({
      ...prev,
      bucket_config: {
        ...prev.bucket_config,
        generateItem: {
          ...prev.bucket_config?.generateItem,
          templateId,
          fieldName: '' // Reset field selection when template changes
        }
      }
    } as any));

    if (templateId) {
      await loadTemplateFields(templateId);
    } else {
      setAvailableFields([]);
    }
  };

  const handleFieldNameChange = (fieldName: string) => {
    setFormData(prev => ({
      ...prev,
      bucket_config: {
        ...prev.bucket_config,
        generateItem: {
          ...prev.bucket_config?.generateItem,
          fieldName
        }
      }
    } as any));
  };

  const handleFieldValueChange = (fieldValue: string) => {
    setFormData(prev => ({
      ...prev,
      bucket_config: {
        ...prev.bucket_config,
        generateItem: {
          ...prev.bucket_config?.generateItem,
          fieldValue
        }
      }
    } as any));
  };

  const handleSave = () => {
    // Final validation
    if (!formData.name.trim()) {
      setNameError('Bucket name is required');
      return;
    }
    
    if (mode === 'create' && allBucketNames.includes(formData.name)) {
      setNameError('A bucket with this name already exists in the system');
      return;
    }
    
    if (mode === 'edit' && formData.name !== initialData?.name && allBucketNames.includes(formData.name)) {
      setNameError('A bucket with this name already exists in the system');
      return;
    }

    if (mode === 'create' && !parentFolder) {
      console.error('No parent folder specified for new bucket');
      return;
    }

    onSave({
      ...formData,
      parent_id: formData.parent_id || parentFolder?.id
    });
    onClose();
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !nameError && formData.name.trim()) {
      handleSave();
    }
  };

  const isConfigValid = !formData.bucket_config?.generateItem?.enabled || 
    (formData.bucket_config.generateItem.templateId && formData.bucket_config.generateItem.fieldName);

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          return;
        }
        onClose();
      }}
      maxWidth="sm"      
      fullWidth
      aria-labelledby="bucket-dialog-title"
    >
      <DialogTitle id="bucket-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingBasketIcon />
          {mode === 'create' ? 'Create New Bucket' : 'Edit Bucket'}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Parent Folder Display */}
          {parentFolder && mode === 'create' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Adding to folder:
              </Typography>
              <Chip
                icon={<CreateNewFolderIcon />}
                label={parentFolder.name}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
          )}
          
          {/* Bucket Name */}
          <TextField
            autoFocus
            label="Bucket Name"
            fullWidth
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyPress={handleKeyPress}
            error={!!nameError}
            helperText={nameError}
            placeholder="Enter bucket name"
            required
          />
          
          {/* Active Status */}
          <FormControlLabel
            control={
              <Switch
                checked={formData.active}
                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
              />
            }
            label="Active"
          />

          {/* Generate Item Configuration - Collapsible */}
          <Accordion defaultExpanded={formData.bucket_config?.generateItem?.enabled}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SettingsIcon fontSize="small" />
                <Typography>Generate Item from Bucket</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="info" sx={{ mb: 1 }}>
                  Generate a virtual XML item at the start of this bucket in the vizrt-ticker feed.
                  This item is not stored in the database.
                </Alert>

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.bucket_config?.generateItem?.enabled || false}
                      onChange={(e) => handleGenerateItemEnabledChange(e.target.checked)}
                    />
                  }
                  label="Enable Generation"
                />

                {formData.bucket_config?.generateItem?.enabled && (
                  <>
                    <FormControl fullWidth required>
                      <InputLabel>Template</InputLabel>
                      <Select
                        value={formData.bucket_config.generateItem.templateId || ''}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                        label="Template"
                      >
                        <MenuItem value="">
                          <em>Select a template...</em>
                        </MenuItem>
                        {templates.map(template => (
                          <MenuItem key={template.id} value={template.id}>
                            {template.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {formData.bucket_config.generateItem.templateId && (
                      <>
                        <FormControl fullWidth required>
                          <InputLabel>Field to Populate</InputLabel>
                          <Select
                            value={formData.bucket_config.generateItem.fieldName || ''}
                            onChange={(e) => handleFieldNameChange(e.target.value)}
                            label="Field to Populate"
                            disabled={availableFields.length === 0}
                          >
                            <MenuItem value="">
                              <em>Select a field...</em>
                            </MenuItem>
                            {availableFields.map(field => (
                              <MenuItem key={field} value={field}>
                                {field}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <TextField
                          label="Field Value (Optional)"
                          fullWidth
                          value={formData.bucket_config.generateItem.fieldValue || ''}
                          onChange={(e) => handleFieldValueChange(e.target.value)}
                          placeholder="Leave blank to use bucket instance name"
                          helperText="Enter a custom value, or leave blank to use the bucket name"
                        />
                      </>
                    )}
                  </>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
          
          {/* Info Box */}
          <Box sx={{ 
            bgcolor: 'info.main', 
            color: 'info.contrastText',
            p: 2, 
            borderRadius: 1,
            opacity: 0.9
          }}>
            <Typography variant="body2">
              <strong>Tips:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>Buckets contain items and item folders</li>
                <li>Buckets can be referenced in playlists</li>
                <li>You can organize items within buckets using folders</li>
              </ul>
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={!!nameError || !formData.name.trim() || !isConfigValid}
        >
          {mode === 'create' ? 'Create Bucket' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
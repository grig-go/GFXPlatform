import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Loader2, Info, Plus, Edit, Trash2, X, ArrowRight, AlertCircle, Repeat } from 'lucide-react';
import { Agent, AgentTransform } from '../types/agents';
import TransformationBuilder from './TransformationBuilder/TransformationBuilder';

interface TransformationStepProps {
  formData: Partial<Agent>;
  setFormData: (data: Partial<Agent> | ((prev: Partial<Agent>) => Partial<Agent>)) => void;
  sampleData?: Record<string, any>;
}

interface FieldInfo {
  path: string;
  display: string;
  type: string;
}

// Type for transformations from nova-old
interface Transformation {
  id: string;
  type: string;
  config: Record<string, any>;
  source_field: string;
  target_field: string;
}

const TransformationStep: React.FC<TransformationStepProps> = ({
  formData,
  setFormData,
  sampleData = {}
}) => {
  const [transformations, setTransformations] = useState<Transformation[]>(
    (formData.transforms || []).map((t: any, index: number) => ({
      id: t.id || `transform_${index}`,
      type: t.type || 'direct',
      config: t.config || {},
      source_field: t.source_field || '',
      target_field: t.target_field || ''
    }))
  );
  const [selectedTransform, setSelectedTransform] = useState<string | null>(null);
  const [editingTransform, setEditingTransform] = useState<Transformation | null>(null);
  const [newFieldName, setNewFieldName] = useState<string>('');
  const [availableFields, setAvailableFields] = useState<FieldInfo[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);

  // Sync transformations TO parent formData when local state changes
  useEffect(() => {
    setFormData((prevFormData: Partial<Agent>) => ({
      ...prevFormData,
      transforms: transformations
    }));
  }, [transformations, setFormData]);

  // Function to extract fields from data
  const extractFieldsFromData = (data: any, prefix = ''): string[] => {
    const fields: string[] = [];

    if (!data || typeof data !== 'object') {
      return fields;
    }

    // If it's an array, analyze the first element
    if (Array.isArray(data)) {
      if (data.length > 0 && typeof data[0] === 'object') {
        return extractFieldsFromData(data[0], prefix);
      }
      return fields;
    }

    // Extract fields from object
    Object.keys(data).forEach(key => {
      // Skip internal/system fields
      if (key.startsWith('_') || key.startsWith('$')) return;

      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const value = data[key];

      // Add the field
      fields.push(fieldPath);

      // Recursively extract nested object fields (but not arrays)
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nestedFields = extractFieldsFromData(value, fieldPath);
        fields.push(...nestedFields);
      }
      // For arrays, just note it's an array field but don't traverse
      else if (Array.isArray(value)) {
        // Optionally add array notation
        if (value.length > 0 && typeof value[0] === 'object') {
          const arrayItemFields = extractFieldsFromData(value[0], `${fieldPath}[*]`);
          fields.push(...arrayItemFields);
        }
      }
    });

    return fields;
  };

  useEffect(() => {
    const extractFields = () => {
      setIsLoadingFields(true);
      const allFields: FieldInfo[] = [];
      const fieldPaths = new Set<string>();

      const isRSSEndpoint = formData.format === 'RSS';
      const sourceMappings = (formData.formatOptions as any)?.outputSchema?.metadata?.sourceMappings || [];

      console.log('TransformationStep - Processing fields:', {
        isRSSEndpoint,
        sourceMappings,
        dataSources: formData.dataSources?.length || 0,
        hasSampleData: Object.keys(sampleData).length > 0
      });

      // Process each data source
      for (const source of formData.dataSources || []) {
        try {
          // Use passed sampleData
          if (sampleData[source.id]) {
            console.log(`Using sample data for ${source.name}`);

            let dataToAnalyze = sampleData[source.id];

            // Handle nested data paths for APIs
            if (source.type === 'api' && (source as any).api_config?.data_path) {
              const pathParts = (source as any).api_config.data_path.split('.');
              let current = dataToAnalyze;

              for (const part of pathParts) {
                if (current && typeof current === 'object') {
                  current = current[part];
                }
              }

              if (Array.isArray(current) && current.length > 0) {
                dataToAnalyze = current[0];
              } else if (current) {
                dataToAnalyze = current;
              }
            }

            // Handle RSS source mappings
            if (isRSSEndpoint) {
              const mapping = sourceMappings.find((m: any) => m.sourceId === source.id);
              if (mapping?.itemsPath) {
                const pathParts = mapping.itemsPath.split('.');
                let current = dataToAnalyze;

                for (const part of pathParts) {
                  if (current && typeof current === 'object') {
                    current = current[part];
                  }
                }

                if (Array.isArray(current) && current.length > 0) {
                  dataToAnalyze = current[0];
                } else if (current) {
                  dataToAnalyze = current;
                }
              }
            }

            // Extract fields
            const extractedFields = extractFieldsFromData(dataToAnalyze);
            extractedFields.forEach(field => {
              if (!fieldPaths.has(field)) {
                fieldPaths.add(field);
                allFields.push({
                  path: field,
                  display: field.includes('.') ? field.split('.').join(' → ') : field,
                  type: inferFieldType(field)
                });
              }
            });
          }
          // Fallback to stored fields
          else if (source.fields && source.fields.length > 0) {
            console.log(`Using stored fields for ${source.name}:`, source.fields);
            source.fields.forEach((field: string) => {
              if (!fieldPaths.has(field)) {
                fieldPaths.add(field);
                allFields.push({
                  path: field,
                  display: field.includes('.') ? field.split('.').join(' → ') : field,
                  type: inferFieldType(field)
                });
              }
            });
          }
          else {
            console.log(`No sample data for ${source.name}. Test in Output Format step first.`);
          }
        } catch (error) {
          console.error(`Error processing source ${source.name}:`, error);
        }
      }

      // Sort fields
      allFields.sort((a, b) => {
        const aDepth = a.path.split('.').length;
        const bDepth = b.path.split('.').length;
        if (aDepth !== bDepth) return aDepth - bDepth;
        return a.path.localeCompare(b.path);
      });

      setAvailableFields(allFields);
      setIsLoadingFields(false);
    };

    // Only extract fields if we have data sources
    if (formData.dataSources?.length && formData.dataSources.length > 0) {
      extractFields();
    } else {
      setAvailableFields([]);
      setIsLoadingFields(false);
    }
  }, [sampleData, formData.dataSources, formData.format, formData.formatOptions]);

  // Sync transformations with formData
  useEffect(() => {
    setFormData((prev: Partial<Agent>) => ({
      ...prev,
      transforms: transformations.map(t => ({
        id: t.id,
        type: t.type,
        config: t.config,
        source_field: t.source_field,
        target_field: t.target_field
      })) as AgentTransform[]
    }));
  }, [transformations]);

  const addTransformation = () => {
    const newTransform: Transformation = {
      id: `transform_${Date.now()}`,
      type: 'direct',
      config: {},
      source_field: '',
      target_field: ''
    };
    setEditingTransform(newTransform);
  };

  const saveTransformation = (transform: Transformation) => {
    // Handle new field creation
    if (transform.target_field === '__new__' && newFieldName) {
      transform.target_field = newFieldName;
    }

    const updated = editingTransform?.id && transformations.find(t => t.id === editingTransform.id)
      ? transformations.map(t => t.id === editingTransform.id ? transform : t)
      : [...transformations, transform];

    setTransformations(updated);
    setEditingTransform(null);
    setNewFieldName('');
  };

  const removeTransformation = (id: string) => {
    const updated = transformations.filter(t => t.id !== id);
    setTransformations(updated);
  };

  const getTransformIcon = (type: string) => {
    // Return a simple text representation since lucide-react doesn't have all the icons
    return type.charAt(0).toUpperCase();
  };

  if (isLoadingFields) {
    return (
      <div className="transformation-step">
        <Card className="p-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-5">Loading available fields...</p>
        </Card>
      </div>
    );
  }

  // Show warning if no sample data is available
  if (!Object.keys(sampleData || {}).length && formData.dataSources && formData.dataSources.length > 0 && !isLoadingFields) {
    return (
      <div className="transformation-step">
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle>Sample Data Required</AlertTitle>
          <AlertDescription>
            Please go back to the "Output Format" step and click "Test & Discover All" to load sample data first.
            This will enable field selection for transformations.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="transformation-step space-y-5">
      <Alert className="bg-blue-50 border-blue-200 mb-4">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          Apply transformations to your data before output. Transform text, dates, numbers,
          and create computed fields.
        </AlertDescription>
      </Alert>

      <div className="transformations-container">
        <div className="transformations-list">
          <div className="list-header flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold">Transformations Pipeline</h4>
            <Button
              onClick={addTransformation}
              disabled={availableFields.length === 0}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Transformation
            </Button>
          </div>

          {availableFields.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center">
                <AlertCircle className="h-10 w-10 mx-auto text-yellow-500 mb-3 mt-2" />
                <h3 className="font-semibold mb-2">Sample Data Required</h3>
                <p className="text-sm text-gray-600">
                  Please go back to the Output Format step and test your data sources to load sample data. This will enable field selection for transformations.
                </p>
              </CardContent>
            </Card>
          ) : transformations.length > 0 ? (
            <div className="pipeline-list space-y-3">
              {transformations.map((transform, index) => (
                <Card
                  key={transform.id}
                  className={`cursor-pointer transition-colors ${selectedTransform === transform.id ? 'border-blue-500 bg-blue-50' : ''}`}
                  onClick={() => setSelectedTransform(transform.id)}
                >
                  <CardContent className="p-4">
                    <div className="transform-header flex justify-between items-start">
                      <div className="transform-info flex gap-3 items-start flex-1">
                        <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center font-semibold flex-shrink-0">
                          {getTransformIcon(transform.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <strong className="block">
                            Step {index + 1}: {transform.type.replace('-', ' ').replace('_', ' ')}
                          </strong>
                          {transform.source_field && (
                            <div className="field-mapping mt-2 flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="truncate max-w-xs" title={transform.source_field}>
                                {transform.source_field.length > 30
                                  ? `...${transform.source_field.slice(-28)}`
                                  : transform.source_field}
                              </Badge>
                              <ArrowRight className="h-3 w-3 flex-shrink-0" />
                              <Badge variant="default" className="truncate max-w-xs" title={transform.target_field || transform.source_field}>
                                {(transform.target_field || transform.source_field).length > 30
                                  ? `...${(transform.target_field || transform.source_field).slice(-28)}`
                                  : (transform.target_field || transform.source_field)}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="transform-actions flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTransform(transform);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTransformation(transform.id);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {transform.config && Object.keys(transform.config).length > 0 && (
                      <div className="transform-config-preview mt-3 flex gap-2 flex-wrap">
                        {Object.entries(transform.config).map(([key, value]) => (
                          <Badge key={key} variant="secondary">
                            {key}: {String(value)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 pt-6 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <Repeat className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="font-semibold mb-2 text-lg">No transformations</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Add transformations to modify your data
                </p>
                <Button
                  onClick={addTransformation}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Transformation
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {editingTransform && (
          <Card className="transformation-editor mt-5">
            <CardContent className="p-8">
              <div className="editor-header flex justify-between mb-6">
                <h4 className="text-lg font-semibold">
                  {editingTransform.id && transformations.find(t => t.id === editingTransform.id) ? 'Edit' : 'New'} Transformation
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingTransform(null);
                    setNewFieldName('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="editor-content space-y-6">
                <div>
                  <Label htmlFor="source-field">Source Field <span className="text-red-500">*</span></Label>
                  <Select
                    value={editingTransform.source_field || undefined}
                    onValueChange={(value) => setEditingTransform({
                      ...editingTransform,
                      source_field: value
                    })}
                  >
                    <SelectTrigger id="source-field">
                      <SelectValue placeholder="Select field..." />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Simple Fields */}
                      {availableFields.some(f => !f.path.includes('.') && !f.path.includes('[*]')) && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Simple Fields</div>
                          {availableFields
                            .filter(f => !f.path.includes('.') && !f.path.includes('[*]'))
                            .map(field => (
                              <SelectItem key={field.path} value={field.path}>
                                {field.display} ({field.type})
                              </SelectItem>
                            ))}
                        </>
                      )}

                      {/* Nested Fields */}
                      {availableFields.some(f => f.path.includes('.') && !f.path.includes('[*]')) && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Nested Fields</div>
                          {availableFields
                            .filter(f => f.path.includes('.') && !f.path.includes('[*]'))
                            .map(field => (
                              <SelectItem key={field.path} value={field.path}>
                                {field.display} ({field.type})
                              </SelectItem>
                            ))}
                        </>
                      )}

                      {/* Array Item Fields */}
                      {availableFields.some(f => f.path.includes('[*]')) && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Array Item Fields</div>
                          {availableFields
                            .filter(f => f.path.includes('[*]'))
                            .map(field => (
                              <SelectItem key={field.path} value={field.path}>
                                {field.display} ({field.type})
                              </SelectItem>
                            ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="target-field">
                    Target Field <span className="text-xs text-gray-500">(leave empty to transform in place)</span>
                  </Label>
                  <Select
                    value={editingTransform.target_field || undefined}
                    onValueChange={(value) => {
                      setEditingTransform({
                        ...editingTransform,
                        target_field: value
                      });
                      if (value !== '__new__') {
                        setNewFieldName('');
                      }
                    }}
                  >
                    <SelectTrigger id="target-field">
                      <SelectValue placeholder="Same as source" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Existing Fields</div>
                      {availableFields
                        .filter(f => !f.path.includes('[*]'))
                        .map(field => (
                          <SelectItem key={field.path} value={field.path}>
                            {field.display}
                          </SelectItem>
                        ))}

                      <SelectItem value="__new__">Create new field...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editingTransform.target_field === '__new__' && (
                  <div>
                    <Label htmlFor="new-field-name">New Field Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="new-field-name"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="Enter new field name..."
                    />
                  </div>
                )}

                <div className="mt-5">
                  <TransformationBuilder
                    sourceType={inferFieldType(editingTransform.source_field || '')}
                    targetType={inferFieldType(editingTransform.target_field || editingTransform.source_field || '')}
                    value={editingTransform.type}
                    options={editingTransform.config}
                    availableFields={availableFields.map(f => f.path)}
                    onChange={(type, options) => setEditingTransform({
                      ...editingTransform,
                      type,
                      config: options || {}
                    })}
                  />
                </div>

                <div className="editor-actions flex gap-3 justify-end pt-6 mt-2 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingTransform(null);
                      setNewFieldName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => saveTransformation(editingTransform)}
                    disabled={!editingTransform.source_field || (editingTransform.target_field === '__new__' && !newFieldName)}
                  >
                    Save Transformation
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

function inferFieldType(fieldPath: string): string {
  // Simple type inference based on field name/path
  if (!fieldPath) return 'string';

  // Extract the last part of the path for analysis
  const fieldName = fieldPath.split('.').pop() || fieldPath;
  const lower = fieldName.toLowerCase();

  // Check for array notation
  if (fieldPath.includes('[*]')) {
    return 'array';
  }

  // Common date/time fields
  if (lower.includes('date') || lower.includes('time') ||
      lower.includes('created') || lower.includes('updated') ||
      lower.includes('timestamp')) {
    return 'date';
  }

  // Numeric fields
  if (lower.includes('count') || lower.includes('amount') ||
      lower.includes('price') || lower.includes('quantity') ||
      lower.includes('total') || lower.includes('sum') ||
      lower.includes('id') || lower.endsWith('_id')) {
    return 'number';
  }

  // Boolean fields
  if (lower.startsWith('is_') || lower.startsWith('has_') ||
      lower.includes('enabled') || lower.includes('active') ||
      lower.includes('visible') || lower.includes('completed')) {
    return 'boolean';
  }

  // Array fields
  if (lower.includes('items') || lower.includes('tags') ||
      lower.includes('categories') || lower.includes('list')) {
    return 'array';
  }

  // URL fields
  if (lower.includes('url') || lower.includes('link') ||
      lower.includes('href') || lower.includes('uri')) {
    return 'string';
  }

  // Default to string
  return 'string';
}

export default TransformationStep;

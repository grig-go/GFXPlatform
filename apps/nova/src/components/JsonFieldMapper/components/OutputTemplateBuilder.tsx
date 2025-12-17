import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Switch } from '../../ui/switch';
import { Alert, AlertDescription } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Check,
  X,
  Download,
  Maximize,
  Minimize,
  ArrowRight,
  ArrowLeft,
  Info,
  AlertCircle,
  FileJson
} from 'lucide-react';
import { OutputTemplate, OutputField } from '../../../types/jsonMapping.types';

interface OutputTemplateBuilderProps {
  template: OutputTemplate;
  sourceSelection: any;
  sampleData: Record<string, any>;
  onChange: (template: OutputTemplate) => void;
  onNext: () => void;
  onPrevious: () => void;
}

interface EditableFieldNameProps {
  value: string;
  onSave: (newValue: string) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}

const EditableFieldName: React.FC<EditableFieldNameProps> = ({
  value,
  onSave,
  isEditing,
  onStartEdit,
  onCancelEdit
}) => {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() && editValue !== value) {
      onSave(editValue.trim());
    } else {
      onCancelEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      onCancelEdit();
    }
  };

  if (!isEditing) {
    return (
      <span
        onClick={onStartEdit}
        className="cursor-pointer hover:text-blue-600 transition-colors"
        title="Click to edit field name"
      >
        {value}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-7 py-0 text-sm"
        style={{ minWidth: 100 }}
      />
      <Button
        size="sm"
        variant="ghost"
        onClick={handleSave}
        className="h-6 w-6 p-0"
      >
        <Check className="w-3 h-3" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setEditValue(value);
          onCancelEdit();
        }}
        className="h-6 w-6 p-0"
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
};

export const OutputTemplateBuilder: React.FC<OutputTemplateBuilderProps> = ({
  template,
  sourceSelection,
  sampleData,
  onChange,
  onNext,
  onPrevious
}) => {
  const [editMode, setEditMode] = useState<'visual' | 'json'>('visual');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newFieldCounter, setNewFieldCounter] = useState(1);

  // Extract fields from JSON structure
  const extractFieldsFromStructure = (obj: any, path = ''): OutputField[] => {
    const fields: OutputField[] = [];

    if (!obj || typeof obj !== 'object') return fields;

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const fieldPath = path ? `${path}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Object field
        fields.push({
          path: fieldPath,
          type: 'object',
          required: false,
          description: ''
        });
        // Recursively add nested fields
        fields.push(...extractFieldsFromStructure(value, fieldPath));
      } else if (Array.isArray(value)) {
        // Array field
        fields.push({
          path: fieldPath,
          type: 'array',
          required: false,
          description: ''
        });
        // If array has objects, extract their structure
        if (value.length > 0 && typeof value[0] === 'object') {
          fields.push(...extractFieldsFromStructure(value[0], `${fieldPath}[0]`));
        }
      } else {
        // Primitive field
        const type = typeof value === 'number' ? 'number' :
                     typeof value === 'boolean' ? 'boolean' : 'string';
        fields.push({
          path: fieldPath,
          type,
          required: false,
          description: ''
        });
      }
    });

    return fields;
  };

  useEffect(() => {
    if (editMode === 'json') {
      setJsonText(JSON.stringify(template.structure || {}, null, 2));
    }
  }, [editMode, template.structure]);

  const handleAddField = (parentPath: string = '') => {
    const newFieldName = `field${newFieldCounter}`;
    const newPath = parentPath ? `${parentPath}.${newFieldName}` : newFieldName;

    const newField: OutputField = {
      path: newPath,
      type: 'string',
      required: false,
      description: ''
    };

    onChange({
      ...template,
      fields: [...template.fields, newField]
    });

    setNewFieldCounter(newFieldCounter + 1);
    if (parentPath) {
      setExpandedFields(new Set([...expandedFields, parentPath]));
    }
  };

  const handleAddNestedField = (parentPath: string) => {
    handleAddField(parentPath);
  };

  const handleDeleteField = (path: string) => {
    const updatedFields = template.fields.filter(
      f => f.path !== path && !f.path.startsWith(path + '.')
    );
    onChange({
      ...template,
      fields: updatedFields
    });
  };

  const handleDuplicateField = (field: OutputField) => {
    const pathParts = field.path.split('.');
    const fieldName = pathParts[pathParts.length - 1];
    const parentPath = pathParts.slice(0, -1).join('.');

    let counter = 1;
    let newName = `${fieldName}_copy`;
    let newPath = parentPath ? `${parentPath}.${newName}` : newName;

    while (template.fields.some(f => f.path === newPath)) {
      newName = `${fieldName}_copy${counter}`;
      newPath = parentPath ? `${parentPath}.${newName}` : newName;
      counter++;
    }

    const duplicatedField: OutputField = {
      ...field,
      path: newPath
    };

    onChange({
      ...template,
      fields: [...template.fields, duplicatedField]
    });
  };

  const handleRenameField = (oldPath: string, newName: string) => {
    const pathParts = oldPath.split('.');
    const parentPath = pathParts.slice(0, -1).join('.');
    const newPath = parentPath ? `${parentPath}.${newName}` : newName;

    if (template.fields.some(f => f.path === newPath && f.path !== oldPath)) {
      alert('A field with this name already exists at this level');
      return;
    }

    const updatedFields = template.fields.map(field => {
      if (field.path === oldPath) {
        return { ...field, path: newPath, name: newName };
      }
      if (field.path.startsWith(oldPath + '.')) {
        const suffix = field.path.substring(oldPath.length);
        return { ...field, path: newPath + suffix };
      }
      return field;
    });

    onChange({
      ...template,
      fields: updatedFields
    });

    if (expandedFields.has(oldPath)) {
      const newExpanded = new Set(expandedFields);
      newExpanded.delete(oldPath);
      newExpanded.add(newPath);
      setExpandedFields(newExpanded);
    }

    setEditingField(null);
  };

  const handleFieldUpdate = (path: string, updates: Partial<OutputField>) => {
    const updatedFields = template.fields.map(field =>
      field.path === path ? { ...field, ...updates } : field
    );
    onChange({
      ...template,
      fields: updatedFields
    });
  };

  const handleImportFromSample = () => {
    const firstSource = sourceSelection?.sources?.[0];
    if (!firstSource?.id) {
      alert('No data source selected');
      return;
    }

    const data = sampleData[firstSource.id];
    if (!data) {
      alert('No sample data available');
      return;
    }

    const path = firstSource.primaryPath || '';
    const dataAtPath = path ? getValueAtPath(data, path) : data;

    if (!dataAtPath) {
      alert('No data found at specified path');
      return;
    }

    const sampleItem = Array.isArray(dataAtPath) ? dataAtPath[0] : dataAtPath;
    if (!sampleItem || typeof sampleItem !== 'object') {
      alert('Sample data is not an object or array of objects');
      return;
    }

    const extractedFields = extractFieldsFromStructure(sampleItem);

    onChange({
      structure: sampleItem,
      fields: extractedFields
    });
  };

  const getValueAtPath = (obj: any, path: string): any => {
    if (!path) return obj;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return current;
  };

  const handleJsonUpdate = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const extractedFields = extractFieldsFromStructure(parsed);

      onChange({
        structure: parsed,
        fields: extractedFields
      });

      setJsonError('');
      setEditMode('visual');
    } catch (error) {
      setJsonError(`Invalid JSON: ${(error as any).message}`);
    }
  };

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFields(newExpanded);
  };

  const renderField = (field: OutputField, depth: number = 0): React.ReactNode => {
    const hasChildren = template.fields.some(f =>
      f.path.startsWith(field.path + '.') &&
      f.path.split('.').length === field.path.split('.').length + 1
    );
    const isExpanded = expandedFields.has(field.path);
    const isEditing = editingField === field.path;
    const indent = depth * 24;

    // Extract field name from path (last segment after the last dot)
    const fieldName = field.path.split('.').pop() || field.path;

    return (
      <div key={field.path} style={{ marginBottom: '4px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px',
            marginLeft: `${indent}px`,
            border: '1px solid #e1e8ed',
            borderRadius: '4px',
            backgroundColor: '#ffffff',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f8fa'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
        >
          {/* Expand/Collapse */}
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            {hasChildren ? (
              <button onClick={() => toggleExpanded(field.path)} className="hover:bg-gray-200 rounded p-0.5">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : null}
          </div>

          {/* Field Name */}
          <div style={{ flex: '0 0 180px' }}>
            <code className="font-mono text-sm font-semibold">
              <EditableFieldName
                value={fieldName}
                onSave={(newName) => handleRenameField(field.path, newName)}
                isEditing={isEditing}
                onStartEdit={() => setEditingField(field.path)}
                onCancelEdit={() => setEditingField(null)}
              />
            </code>
          </div>

          {/* Type Selector */}
          <Select
            value={field.type}
            onValueChange={(value) => handleFieldUpdate(field.path, { type: value as any })}
          >
            <SelectTrigger className="w-28 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="string">string</SelectItem>
              <SelectItem value="number">number</SelectItem>
              <SelectItem value="boolean">boolean</SelectItem>
              <SelectItem value="object">object</SelectItem>
              <SelectItem value="array">array</SelectItem>
              <SelectItem value="any">any</SelectItem>
            </SelectContent>
          </Select>

          {/* Required Toggle */}
          <div className="flex items-center gap-1">
            <Switch
              checked={field.required}
              onCheckedChange={(checked) => handleFieldUpdate(field.path, { required: checked })}
              className="scale-75"
            />
            <Label className="text-xs cursor-pointer whitespace-nowrap" onClick={() => handleFieldUpdate(field.path, { required: !field.required })}>
              Required
            </Label>
          </div>

          {/* Description */}
          <Input
            value={field.description || ''}
            onChange={(e) => handleFieldUpdate(field.path, { description: e.target.value })}
            placeholder="Description..."
            className="h-7 text-xs w-32"
          />

          {/* Default Value */}
          <Input
            value={field.defaultValue || ''}
            onChange={(e) => handleFieldUpdate(field.path, { defaultValue: e.target.value })}
            placeholder="Default..."
            className="h-7 text-xs w-24"
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {(field.type === 'object' || field.type === 'array') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAddNestedField(field.path)}
                title="Add nested field"
                className="h-7 w-7 p-0"
              >
                <Plus className="w-3 h-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDuplicateField(field)}
              title="Duplicate field"
              className="h-7 w-7 p-0"
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm(`Delete field "${field.path}" and all its nested fields?`)) {
                  handleDeleteField(field.path);
                }
              }}
              title="Delete field"
              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Nested Fields */}
        {isExpanded && hasChildren && (
          <div className="mt-1">
            {template.fields
              .filter((f: OutputField) =>
                f.path.startsWith(field.path + '.') &&
                f.path.split('.').length === field.path.split('.').length + 1
              )
              .map((childField: OutputField) => renderField(childField, depth + 1))
            }
          </div>
        )}
      </div>
    );
  };

  const getRootFields = () => {
    return template.fields.filter((f: OutputField) => !f.path.includes('.'));
  };

  return (
    <div className="output-template-builder space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Define Output Structure</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={editMode === 'visual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditMode('visual')}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Visual Editor
              </Button>
              <Button
                variant={editMode === 'json' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditMode('json')}
              >
                <FileJson className="w-4 h-4 mr-2" />
                JSON Editor
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {editMode === 'visual' ? (
            <>
              <Alert className="bg-blue-50 border-blue-200 mb-4">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  Define your JSON output structure. Click field names to edit them.
                  Press Enter to save or Escape to cancel editing.
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex gap-2 mb-4 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => handleAddField()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Field
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleImportFromSample}
                  disabled={!sourceSelection?.sources?.[0]?.id || !sampleData[sourceSelection.sources[0].id]}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Import from Sample
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const allParents = template.fields
                      .filter(f => f.type === 'object' || f.type === 'array')
                      .map(f => f.path);
                    setExpandedFields(new Set(allParents));
                  }}
                  disabled={template.fields.length === 0}
                >
                  <Maximize className="w-4 h-4 mr-2" />
                  Expand All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExpandedFields(new Set())}
                  disabled={expandedFields.size === 0}
                >
                  <Minimize className="w-4 h-4 mr-2" />
                  Collapse All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all fields?')) {
                      onChange({ ...template, fields: [] });
                      setNewFieldCounter(1);
                    }
                  }}
                  disabled={template.fields.length === 0}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>

              {/* Field List */}
              <Card className="bg-gray-50 max-h-96 overflow-y-auto">
                <CardContent className="p-3">
                  {template.fields && template.fields.length > 0 ? (
                    getRootFields().map((field: OutputField) => renderField(field))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileJson className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <h4 className="font-semibold mb-1">No fields defined</h4>
                      <p className="text-sm">Click 'Add Field' to start building your output structure</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Field Statistics */}
              {template.fields.length > 0 && (
                <div className="flex gap-3 mt-4 flex-wrap">
                  <Badge variant="outline" className="text-sm">
                    {template.fields.length} field{template.fields.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge className="bg-yellow-100 text-yellow-800 text-sm">
                    {template.fields.filter(f => f.required).length} required
                  </Badge>
                  <Badge className="bg-green-100 text-green-800 text-sm">
                    {template.fields.filter(f => f.type === 'object').length} object{template.fields.filter(f => f.type === 'object').length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-800 text-sm">
                    {template.fields.filter(f => f.type === 'array').length} array{template.fields.filter(f => f.type === 'array').length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </>
          ) : (
            /* JSON Editor Mode */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>JSON Structure Template</Label>
                <p className="text-xs text-gray-500">Define your output structure as JSON</p>
                <Textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  rows={15}
                  className="font-mono text-xs"
                />
                {jsonError && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription>{jsonError}</AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleJsonUpdate}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Apply JSON Structure
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(jsonText);
                      setJsonText(JSON.stringify(parsed, null, 2));
                      setJsonError('');
                    } catch (error) {
                      setJsonError(`Invalid JSON: ${(error as any).message}`);
                    }
                  }}
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  Format JSON
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onPrevious}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button
          onClick={onNext}
          disabled={!template.fields || template.fields.length === 0}
        >
          Next: Map Fields
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

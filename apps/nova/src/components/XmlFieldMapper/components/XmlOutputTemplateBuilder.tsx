import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Switch } from '../../ui/switch';
import { Alert, AlertDescription } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
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
  Check,
  X,
  Download,
  Maximize,
  Minimize,
  ArrowRight,
  ArrowLeft,
  Info,
  AlertCircle,
  FileCode,
  Hash,
  Type
} from 'lucide-react';
import { XmlOutputTemplate, XmlOutputField } from '../../../types/xmlMapping.types';

interface XmlOutputTemplateBuilderProps {
  template: XmlOutputTemplate;
  sourceSelection: any;
  sampleData: Record<string, any>;
  onChange: (template: XmlOutputTemplate) => void;
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
        title="Click to edit element name"
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

export const XmlOutputTemplateBuilder: React.FC<XmlOutputTemplateBuilderProps> = ({
  template,
  sourceSelection,
  sampleData,
  onChange,
  onNext,
  onPrevious
}) => {
  const [editMode, setEditMode] = useState<'visual' | 'xml'>('visual');
  const [xmlText, setXmlText] = useState('');
  const [xmlError, setXmlError] = useState('');
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newFieldCounter, setNewFieldCounter] = useState(1);

  // Initialize with defaults if not set
  useEffect(() => {
    if (!template.rootElement) {
      onChange({
        ...template,
        rootElement: 'root',
        itemElement: 'item',
        fields: template.fields || []
      });
    }
  }, []);

  useEffect(() => {
    if (editMode === 'xml') {
      setXmlText(generateXmlPreview());
    }
  }, [editMode, template]);

  const generateXmlPreview = (): string => {
    const indent = '  ';
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<${template.rootElement || 'root'}>\n`;

    if (template.fields && template.fields.length > 0) {
      // Group fields by their parent element
      const rootFields = template.fields.filter(f => !f.path.includes('.'));
      const elementFields = rootFields.filter(f => f.xmlType === 'element');
      const attributeFields = rootFields.filter(f => f.xmlType === 'attribute');

      // Add item element with attributes if array type
      if (sourceSelection?.type === 'array') {
        xml += `${indent}<${template.itemElement || 'item'}`;

        // Add attributes
        attributeFields.forEach(field => {
          xml += ` ${field.elementName}="..."`;
        });

        xml += `>\n`;

        // Add child elements
        elementFields.forEach(field => {
          if (field.type === 'object' || field.type === 'array') {
            xml += `${indent}${indent}<${field.elementName}>\n`;
            xml += `${indent}${indent}${indent}<!-- nested content -->\n`;
            xml += `${indent}${indent}</${field.elementName}>\n`;
          } else {
            xml += `${indent}${indent}<${field.elementName}>${field.cdata ? '<![CDATA[...]]>' : '...'}</${field.elementName}>\n`;
          }
        });

        xml += `${indent}</${template.itemElement || 'item'}>\n`;
      } else {
        // Single object mode
        attributeFields.forEach(field => {
          xml += `<!-- attribute: ${field.elementName}="..." -->\n`;
        });

        elementFields.forEach(field => {
          if (field.type === 'object' || field.type === 'array') {
            xml += `${indent}<${field.elementName}>\n`;
            xml += `${indent}${indent}<!-- nested content -->\n`;
            xml += `${indent}</${field.elementName}>\n`;
          } else {
            xml += `${indent}<${field.elementName}>${field.cdata ? '<![CDATA[...]]>' : '...'}</${field.elementName}>\n`;
          }
        });
      }
    }

    xml += `</${template.rootElement || 'root'}>`;
    return xml;
  };

  const handleAddField = (parentPath: string = '', xmlType: 'element' | 'attribute' = 'element') => {
    const newFieldName = xmlType === 'attribute' ? `attr${newFieldCounter}` : `element${newFieldCounter}`;
    const newPath = parentPath ? `${parentPath}.${newFieldName}` : newFieldName;

    const newField: XmlOutputField = {
      path: newPath,
      name: newFieldName,
      elementName: newFieldName,
      type: 'string',
      xmlType: xmlType,
      parentElement: parentPath || undefined,
      required: false,
      description: '',
      cdata: false
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

  const handleDeleteField = (path: string) => {
    const updatedFields = template.fields.filter(
      f => f.path !== path && !f.path.startsWith(path + '.')
    );
    onChange({
      ...template,
      fields: updatedFields
    });
  };

  const handleDuplicateField = (field: XmlOutputField) => {
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

    const duplicatedField: XmlOutputField = {
      ...field,
      path: newPath,
      name: newName,
      elementName: newName
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
        return { ...field, path: newPath, name: newName, elementName: newName };
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

  const handleFieldUpdate = (path: string, updates: Partial<XmlOutputField>) => {
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

    const extractedFields = extractFieldsFromSample(sampleItem);

    onChange({
      ...template,
      structure: sampleItem,
      fields: extractedFields
    });
  };

  const extractFieldsFromSample = (obj: any, prefix = ''): XmlOutputField[] => {
    const fields: XmlOutputField[] = [];

    if (!obj || typeof obj !== 'object') return fields;

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const fieldPath = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Object field - always element
        fields.push({
          path: fieldPath,
          name: key,
          elementName: key,
          type: 'object',
          xmlType: 'element',
          required: false,
          description: '',
          cdata: false
        });
        // Recursively add nested fields
        fields.push(...extractFieldsFromSample(value, fieldPath));
      } else if (Array.isArray(value)) {
        // Array field - always element
        fields.push({
          path: fieldPath,
          name: key,
          elementName: key,
          type: 'array',
          xmlType: 'element',
          required: false,
          description: '',
          cdata: false
        });
        // If array has objects, extract their structure
        if (value.length > 0 && typeof value[0] === 'object') {
          fields.push(...extractFieldsFromSample(value[0], `${fieldPath}[0]`));
        }
      } else {
        // Primitive field - default to element, can be changed to attribute
        const type = typeof value === 'number' ? 'number' :
                     typeof value === 'boolean' ? 'boolean' : 'string';

        // Simple fields like 'id' are good candidates for attributes
        const isAttributeCandidate = key === 'id' || key === 'type' || key === 'name' || key.startsWith('_');

        fields.push({
          path: fieldPath,
          name: key,
          elementName: key,
          type,
          xmlType: isAttributeCandidate ? 'attribute' : 'element',
          required: false,
          description: '',
          cdata: false
        });
      }
    });

    return fields;
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

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFields(newExpanded);
  };

  const renderField = (field: XmlOutputField, depth: number = 0): React.ReactNode => {
    const hasChildren = template.fields.some(f =>
      f.path.startsWith(field.path + '.') &&
      f.path.split('.').length === field.path.split('.').length + 1
    );
    const isExpanded = expandedFields.has(field.path);
    const isEditing = editingField === field.path;
    const indent = depth * 24;

    // Extract field name from path (last segment after the last dot)
    const fieldName = field.elementName || field.path.split('.').pop() || field.path;

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
            backgroundColor: field.xmlType === 'attribute' ? '#fff7ed' : '#ffffff',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = field.xmlType === 'attribute' ? '#ffedd5' : '#f5f8fa'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = field.xmlType === 'attribute' ? '#fff7ed' : '#ffffff'}
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

          {/* XML Type Badge */}
          <Badge
            variant="outline"
            className={`text-xs px-1.5 py-0 ${
              field.xmlType === 'attribute'
                ? 'bg-orange-100 text-orange-800 border-orange-300'
                : 'bg-blue-100 text-blue-800 border-blue-300'
            }`}
          >
            {field.xmlType === 'attribute' ? (
              <><Hash className="w-3 h-3 mr-1" />attr</>
            ) : (
              <><Type className="w-3 h-3 mr-1" />elem</>
            )}
          </Badge>

          {/* Field Name */}
          <div style={{ flex: '0 0 140px' }}>
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

          {/* XML Type Selector */}
          <Select
            value={field.xmlType}
            onValueChange={(value) => handleFieldUpdate(field.path, { xmlType: value as 'element' | 'attribute' })}
            disabled={field.type === 'object' || field.type === 'array'}
          >
            <SelectTrigger className="w-28 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="element">Element</SelectItem>
              <SelectItem value="attribute" disabled={field.type === 'object' || field.type === 'array'}>
                Attribute
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Data Type Selector */}
          <Select
            value={field.type}
            onValueChange={(value) => {
              const updates: Partial<XmlOutputField> = { type: value as any };
              // Objects and arrays can't be attributes
              if (value === 'object' || value === 'array') {
                updates.xmlType = 'element';
              }
              handleFieldUpdate(field.path, updates);
            }}
          >
            <SelectTrigger className="w-24 h-7 text-xs">
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
              Req
            </Label>
          </div>

          {/* CDATA Toggle (only for elements) */}
          {field.xmlType === 'element' && field.type !== 'object' && field.type !== 'array' && (
            <div className="flex items-center gap-1">
              <Switch
                checked={field.cdata || false}
                onCheckedChange={(checked) => handleFieldUpdate(field.path, { cdata: checked })}
                className="scale-75"
              />
              <Label className="text-xs cursor-pointer whitespace-nowrap" onClick={() => handleFieldUpdate(field.path, { cdata: !field.cdata })}>
                CDATA
              </Label>
            </div>
          )}

          {/* Default Value */}
          <Input
            value={field.defaultValue || ''}
            onChange={(e) => handleFieldUpdate(field.path, { defaultValue: e.target.value })}
            placeholder="Default..."
            className="h-7 text-xs w-20"
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {(field.type === 'object' || field.type === 'array') && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAddField(field.path, 'element')}
                  title="Add nested element"
                  className="h-7 w-7 p-0"
                >
                  <Plus className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAddField(field.path, 'attribute')}
                  title="Add attribute"
                  className="h-7 w-7 p-0 text-orange-600"
                >
                  <Hash className="w-3 h-3" />
                </Button>
              </>
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
                if (confirm(`Delete ${field.xmlType} "${field.elementName}" and all nested fields?`)) {
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
              .filter((f: XmlOutputField) =>
                f.path.startsWith(field.path + '.') &&
                f.path.split('.').length === field.path.split('.').length + 1
              )
              .map((childField: XmlOutputField) => renderField(childField, depth + 1))
            }
          </div>
        )}
      </div>
    );
  };

  const getRootFields = () => {
    return template.fields.filter((f: XmlOutputField) => !f.path.includes('.'));
  };

  return (
    <div className="xml-output-template-builder space-y-4">
      {/* Root Element Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">XML Document Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="root-element">Root Element Name</Label>
              <Input
                id="root-element"
                value={template.rootElement || 'root'}
                onChange={(e) => onChange({ ...template, rootElement: e.target.value })}
                placeholder="root"
              />
              <p className="text-xs text-gray-500">The top-level XML element</p>
            </div>
            {sourceSelection?.type === 'array' && (
              <div className="space-y-2">
                <Label htmlFor="item-element">Item Element Name</Label>
                <Input
                  id="item-element"
                  value={template.itemElement || 'item'}
                  onChange={(e) => onChange({ ...template, itemElement: e.target.value })}
                  placeholder="item"
                />
                <p className="text-xs text-gray-500">Element name for each array item</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Field Definition */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Define XML Structure</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={editMode === 'visual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditMode('visual')}
              >
                <FileCode className="w-4 h-4 mr-2" />
                Visual Editor
              </Button>
              <Button
                variant={editMode === 'xml' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditMode('xml')}
              >
                <FileCode className="w-4 h-4 mr-2" />
                XML Preview
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
                  Define your XML output structure. Each field can be either an <strong>element</strong> (child node) or an <strong>attribute</strong> of its parent element.
                  Click element names to edit them. Use CDATA for content that may contain special characters.
                </AlertDescription>
              </Alert>

              {/* Legend */}
              <div className="flex gap-4 mb-4 text-xs">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                    <Type className="w-3 h-3 mr-1" />elem
                  </Badge>
                  <span>XML Element (child node)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                    <Hash className="w-3 h-3 mr-1" />attr
                  </Badge>
                  <span>XML Attribute</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mb-4 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => handleAddField('', 'element')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Element
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddField('', 'attribute')}
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  <Hash className="w-4 h-4 mr-2" />
                  Add Attribute
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
                  disabled={!template.fields || template.fields.length === 0}
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
                  disabled={!template.fields || template.fields.length === 0}
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
                    getRootFields().map((field: XmlOutputField) => renderField(field))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileCode className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <h4 className="font-semibold mb-1">No fields defined</h4>
                      <p className="text-sm">Click 'Add Element' or 'Add Attribute' to start building your XML structure</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Field Statistics */}
              {template.fields && template.fields.length > 0 && (
                <div className="flex gap-3 mt-4 flex-wrap">
                  <Badge variant="outline" className="text-sm">
                    {template.fields.length} field{template.fields.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-800 text-sm">
                    {template.fields.filter(f => f.xmlType === 'element').length} element{template.fields.filter(f => f.xmlType === 'element').length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge className="bg-orange-100 text-orange-800 text-sm">
                    {template.fields.filter(f => f.xmlType === 'attribute').length} attribute{template.fields.filter(f => f.xmlType === 'attribute').length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge className="bg-yellow-100 text-yellow-800 text-sm">
                    {template.fields.filter(f => f.required).length} required
                  </Badge>
                </div>
              )}
            </>
          ) : (
            /* XML Preview Mode */
            <div className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  This is a preview of your XML output structure. Edit fields in Visual Editor mode.
                </AlertDescription>
              </Alert>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-xs font-mono whitespace-pre-wrap break-words">
                  <code>{generateXmlPreview()}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-gray-400 hover:text-white"
                  onClick={() => {
                    navigator.clipboard.writeText(generateXmlPreview());
                  }}
                >
                  <Copy className="w-4 h-4" />
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

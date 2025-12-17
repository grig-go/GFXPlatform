import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Switch } from '../../ui/switch';
import { Badge } from '../../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '../../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { ArrowRight } from 'lucide-react';
import { JsonFieldMapping, MappingTransformation } from '../../../types/jsonMapping.types';
import { applyTransformation } from '../utils/transformations';

interface TransformationModalProps {
  mapping: JsonFieldMapping;
  onSave: (updated: JsonFieldMapping) => void;
  onClose: () => void;
}

export const TransformationModal: React.FC<TransformationModalProps> = ({
  mapping,
  onSave,
  onClose
}) => {
  const [transformType, setTransformType] = useState<string>('none');
  const [transformConfig, setTransformConfig] = useState<Record<string, any>>({});
  const [fallbackValue, setFallbackValue] = useState<string>(mapping.fallbackValue || '');
  const [useConditional, setUseConditional] = useState<boolean>(!!mapping.conditional);
  const [conditional, setConditional] = useState(mapping.conditional || {
    type: 'simple',
    when: '',
    operator: 'equals',
    value: '',
    then: '',
    else: ''
  });
  const [previewInput, setPreviewInput] = useState<string>('Sample text');
  const [previewOutput, setPreviewOutput] = useState<string>('');

  useEffect(() => {
    if (mapping.transformId) {
      setTransformType(mapping.transformId.split('_')[0] || 'none');
    }
  }, [mapping]);

  useEffect(() => {
    updatePreview();
  }, [transformType, transformConfig, previewInput]);

  const updatePreview = () => {
    try {
      if (transformType === 'none') {
        setPreviewOutput(previewInput);
        return;
      }

      const transform: MappingTransformation = {
        id: `${transformType}_preview`,
        name: transformType,
        type: transformType as any,
        config: transformConfig
      };

      const result = applyTransformation(previewInput, transform);
      setPreviewOutput(String(result));
    } catch (error) {
      setPreviewOutput(`Error: ${(error as any).message}`);
    }
  };

  const handleSave = () => {
    const updated: JsonFieldMapping = {
      ...mapping,
      fallbackValue: fallbackValue || undefined
    };

    if (transformType !== 'none') {
      updated.transformId = `${transformType}_${Date.now()}`;
    }

    if (useConditional && conditional.when) {
      updated.conditional = conditional as any;
    } else {
      updated.conditional = undefined;
    }

    onSave(updated);
  };

  const renderTransformConfig = () => {
    switch (transformType) {
      case 'concatenate':
        return (
          <>
            <div className="space-y-2">
              <Label>Separator</Label>
              <Input
                value={transformConfig.separator || ' '}
                onChange={(e) => setTransformConfig({
                  ...transformConfig,
                  separator: e.target.value
                })}
                placeholder="Space, comma, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>Additional Fields</Label>
              <p className="text-xs text-gray-500">Comma-separated field paths</p>
              <Textarea
                value={transformConfig.fields || ''}
                onChange={(e) => setTransformConfig({
                  ...transformConfig,
                  fields: e.target.value
                })}
                placeholder="field1.path, field2.path"
              />
            </div>
          </>
        );

      case 'substring':
        return (
          <>
            <div className="space-y-2">
              <Label>Start Index</Label>
              <Input
                type="number"
                value={transformConfig.start || 0}
                onChange={(e) => setTransformConfig({
                  ...transformConfig,
                  start: parseInt(e.target.value)
                })}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Length</Label>
              <p className="text-xs text-gray-500">Leave empty for rest of string</p>
              <Input
                type="number"
                value={transformConfig.length || ''}
                onChange={(e) => setTransformConfig({
                  ...transformConfig,
                  length: parseInt(e.target.value)
                })}
                min={1}
                placeholder="Optional"
              />
            </div>
          </>
        );

      case 'replace':
        return (
          <>
            <div className="space-y-2">
              <Label>Find</Label>
              <Input
                value={transformConfig.find || ''}
                onChange={(e) => setTransformConfig({
                  ...transformConfig,
                  find: e.target.value
                })}
                placeholder="Text to find"
              />
            </div>
            <div className="space-y-2">
              <Label>Replace With</Label>
              <Input
                value={transformConfig.replace || ''}
                onChange={(e) => setTransformConfig({
                  ...transformConfig,
                  replace: e.target.value
                })}
                placeholder="Replacement text"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={transformConfig.regex || false}
                onCheckedChange={(checked) => setTransformConfig({
                  ...transformConfig,
                  regex: checked
                })}
              />
              <Label>Use Regular Expression</Label>
            </div>
          </>
        );

      case 'date_format':
        return (
          <>
            <div className="space-y-2">
              <Label>Input Format</Label>
              <p className="text-xs text-gray-500">e.g., YYYY-MM-DD</p>
              <Input
                value={transformConfig.inputFormat || 'YYYY-MM-DD'}
                onChange={(e) => setTransformConfig({
                  ...transformConfig,
                  inputFormat: e.target.value
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Output Format</Label>
              <p className="text-xs text-gray-500">e.g., MMM DD, YYYY</p>
              <Input
                value={transformConfig.outputFormat || 'MMM DD, YYYY'}
                onChange={(e) => setTransformConfig({
                  ...transformConfig,
                  outputFormat: e.target.value
                })}
              />
            </div>
          </>
        );

      case 'number_format':
        return (
          <>
            <div className="space-y-2">
              <Label>Decimal Places</Label>
              <Input
                type="number"
                value={transformConfig.decimals || 2}
                onChange={(e) => setTransformConfig({
                  ...transformConfig,
                  decimals: parseInt(e.target.value)
                })}
                min={0}
                max={10}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={transformConfig.thousandSeparator || false}
                onCheckedChange={(checked) => setTransformConfig({
                  ...transformConfig,
                  thousandSeparator: checked
                })}
              />
              <Label>Use Thousand Separator</Label>
            </div>
            <div className="space-y-2">
              <Label>Prefix</Label>
              <p className="text-xs text-gray-500">e.g., $ for currency</p>
              <Input
                value={transformConfig.prefix || ''}
                onChange={(e) => setTransformConfig({
                  ...transformConfig,
                  prefix: e.target.value
                })}
                placeholder="Optional"
              />
            </div>
          </>
        );

      case 'calculate':
        return (
          <>
            <div className="space-y-2">
              <Label>Operation</Label>
              <Select
                value={transformConfig.operation || 'add'}
                onValueChange={(value) => setTransformConfig({
                  ...transformConfig,
                  operation: value
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add</SelectItem>
                  <SelectItem value="subtract">Subtract</SelectItem>
                  <SelectItem value="multiply">Multiply</SelectItem>
                  <SelectItem value="divide">Divide</SelectItem>
                  <SelectItem value="modulo">Modulo</SelectItem>
                  <SelectItem value="power">Power</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type="number"
                value={transformConfig.value || 0}
                onChange={(e) => setTransformConfig({
                  ...transformConfig,
                  value: parseFloat(e.target.value)
                })}
              />
            </div>
          </>
        );

      case 'split':
        return (
          <>
            <div className="space-y-2">
              <Label>Delimiter</Label>
              <Input
                value={transformConfig.delimiter || ','}
                onChange={(e) => setTransformConfig({
                  ...transformConfig,
                  delimiter: e.target.value
                })}
                placeholder="Comma, space, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>Return Index</Label>
              <p className="text-xs text-gray-500">Which part to return (0-based)</p>
              <Input
                type="number"
                value={transformConfig.index || 0}
                onChange={(e) => setTransformConfig({
                  ...transformConfig,
                  index: parseInt(e.target.value)
                })}
                min={0}
              />
            </div>
          </>
        );

      case 'lookup':
        return (
          <>
            <div className="space-y-2">
              <Label>Lookup Table</Label>
              <p className="text-xs text-gray-500">JSON object mapping</p>
              <Textarea
                value={transformConfig.lookupTable || '{}'}
                onChange={(e) => setTransformConfig({
                  ...transformConfig,
                  lookupTable: e.target.value
                })}
                placeholder='{"key1": "value1", "key2": "value2"}'
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Value</Label>
              <Input
                value={transformConfig.defaultValue || ''}
                onChange={(e) => setTransformConfig({
                  ...transformConfig,
                  defaultValue: e.target.value
                })}
                placeholder="If key not found"
              />
            </div>
          </>
        );

      case 'custom':
        return (
          <div className="space-y-2">
            <Label>JavaScript Expression</Label>
            <p className="text-xs text-gray-500">Use 'value' to reference the input</p>
            <Textarea
              value={transformConfig.expression || ''}
              onChange={(e) => setTransformConfig({
                ...transformConfig,
                expression: e.target.value
              })}
              placeholder="value.toLowerCase().trim()"
              rows={3}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Field Transformation</DialogTitle>
          <DialogDescription>
            Set up transformations, fallback values, and conditional logic for this mapping
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <strong className="text-sm">Source:</strong>
                  <Badge variant="outline">{mapping.sourcePath}</Badge>
                </div>
                <ArrowRight className="w-4 h-4" />
                <div className="flex items-center gap-2">
                  <strong className="text-sm">Target:</strong>
                  <Badge variant="outline">{mapping.targetPath}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transformation Type Selection */}
          <div className="space-y-2">
            <Label>Transformation Type</Label>
            <Select value={transformType} onValueChange={setTransformType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Direct Mapping)</SelectItem>
                <SelectGroup>
                  <SelectLabel>Text Transformations</SelectLabel>
                  <SelectItem value="uppercase">Uppercase</SelectItem>
                  <SelectItem value="lowercase">Lowercase</SelectItem>
                  <SelectItem value="capitalize">Capitalize</SelectItem>
                  <SelectItem value="trim">Trim Whitespace</SelectItem>
                  <SelectItem value="substring">Substring</SelectItem>
                  <SelectItem value="replace">Find & Replace</SelectItem>
                  <SelectItem value="concatenate">Concatenate Fields</SelectItem>
                  <SelectItem value="split">Split Text</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Number Transformations</SelectLabel>
                  <SelectItem value="number_format">Format Number</SelectItem>
                  <SelectItem value="calculate">Calculate</SelectItem>
                  <SelectItem value="round">Round</SelectItem>
                  <SelectItem value="ceil">Ceiling</SelectItem>
                  <SelectItem value="floor">Floor</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Date Transformations</SelectLabel>
                  <SelectItem value="date_format">Format Date</SelectItem>
                  <SelectItem value="date_add">Add Time</SelectItem>
                  <SelectItem value="date_diff">Date Difference</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Advanced</SelectLabel>
                  <SelectItem value="parse_json">Parse JSON</SelectItem>
                  <SelectItem value="stringify">Convert to String</SelectItem>
                  <SelectItem value="lookup">Lookup Table</SelectItem>
                  <SelectItem value="custom">Custom JavaScript</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Transformation Configuration */}
          {transformType !== 'none' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Transformation Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderTransformConfig()}
              </CardContent>
            </Card>
          )}

          {/* Fallback Value */}
          <div className="space-y-2">
            <Label>Fallback Value</Label>
            <p className="text-xs text-gray-500">Used when source field is empty or null</p>
            <Input
              value={fallbackValue}
              onChange={(e) => setFallbackValue(e.target.value)}
              placeholder="Optional default value"
            />
          </div>

          {/* Conditional Mapping */}
          <div className="flex items-center gap-3">
            <Switch
              checked={useConditional}
              onCheckedChange={setUseConditional}
            />
            <Label>Use Conditional Mapping</Label>
          </div>

          {useConditional && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conditional Logic</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>When Field</Label>
                  <Input
                    value={conditional.when}
                    onChange={(e) => setConditional({
                      ...conditional,
                      when: e.target.value
                    })}
                    placeholder="Field path to check"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Operator</Label>
                  <Select
                    value={conditional.operator}
                    onValueChange={(value) => setConditional({
                      ...conditional,
                      operator: value as any
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="not_equals">Not Equals</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="greater_than">Greater Than</SelectItem>
                      <SelectItem value="less_than">Less Than</SelectItem>
                      <SelectItem value="exists">Exists</SelectItem>
                      <SelectItem value="not_exists">Does Not Exist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {conditional.operator !== 'exists' && conditional.operator !== 'not_exists' && (
                  <div className="space-y-2">
                    <Label>Value</Label>
                    <Input
                      value={conditional.value}
                      onChange={(e) => setConditional({
                        ...conditional,
                        value: e.target.value
                      })}
                      placeholder="Value to compare"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Then (if true)</Label>
                  <Input
                    value={conditional.then}
                    onChange={(e) => setConditional({
                      ...conditional,
                      then: e.target.value
                    })}
                    placeholder="Value when condition is true"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Else (if false)</Label>
                  <Input
                    value={conditional.else}
                    onChange={(e) => setConditional({
                      ...conditional,
                      else: e.target.value
                    })}
                    placeholder="Value when condition is false"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          {transformType !== 'none' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Sample Input</Label>
                  <Input
                    value={previewInput}
                    onChange={(e) => setPreviewInput(e.target.value)}
                    placeholder="Enter sample value"
                  />
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Input:</p>
                    <p className="font-semibold">{previewInput}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Output:</p>
                    <p className="font-semibold">{previewOutput}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Transformation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

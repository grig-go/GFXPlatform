import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  ArrowRight,
  Info,
  Type,
  Scissors,
  Search,
  Code,
  Filter,
  Hash,
  BarChart,
  HelpCircle,
  Columns,
  ArrowDown,
  ArrowUp,
  Plus,
  Calculator,
  DollarSign,
  ChevronRight,
  Equal,
  Calendar,
  Clock,
  Repeat,
  Link,
  TrendingUp,
  Sparkles,
  SplitSquareHorizontal,
  Layers,
  Eraser
} from 'lucide-react';
import { getAvailableTransformations } from '../../utils/transformations';
import AITransformationOptions from './AITransformationOptions';

// Icon mapping from Blueprint.js to Lucide React
const iconMap: Record<string, any> = {
  'arrow-right': ArrowRight,
  'font': Type,
  'clean': Eraser,
  'cut': Scissors,
  'search-text': Search,
  'filter': Filter,
  'code-block': Code,
  'numerical': Hash,
  'horizontal-bar-chart': BarChart,
  'help': HelpCircle,
  'search': Search,
  'split-columns': Columns,
  'arrow-down': ArrowDown,
  'arrow-up': ArrowUp,
  'plus': Plus,
  'calculator': Calculator,
  'dollar': DollarSign,
  'chevron-right': ChevronRight,
  'equals': Equal,
  'calendar': Calendar,
  'time': Clock,
  'swap-horizontal': Repeat,
  'join': Link,
  'arrow-top-left': ArrowUp,
  'arrow-bottom-right': ArrowDown,
  'timeline-line-chart': TrendingUp,
  'exchange': Repeat,
  'sort': ArrowDown,
  'group-objects': Layers,
  'predictive-analysis': Sparkles
};

type TransformationType = string;

interface TransformationBuilderProps {
  sourceType: string;
  targetType: string;
  value?: TransformationType;
  options?: Record<string, any>;
  availableFields?: string[];
  onChange: (transform: TransformationType, options?: Record<string, any>) => void;
}

const TransformationBuilder: React.FC<TransformationBuilderProps> = ({
  sourceType,
  targetType,
  value,
  options = {},
  availableFields = [],
  onChange
}) => {
  const availableTransforms = getAvailableTransformations(sourceType, targetType);

  const [selectedTransform, setSelectedTransform] = useState<TransformationType | null>(value || null);
  const [transformOptions, setTransformOptions] = useState(options);

  const handleTransformSelect = (transform: TransformationType) => {
    setSelectedTransform(transform);
    onChange(transform, {});
  };

  const handleOptionsChange = (newOptions: Record<string, any>) => {
    setTransformOptions(newOptions);
    if (selectedTransform) {
      onChange(selectedTransform, newOptions);
    }
  };

  const renderTransformOptions = () => {
    if (!selectedTransform) return null;

    switch (selectedTransform) {
      case 'string-format':
        return (
          <div className="space-y-3">
            <Label>Template</Label>
            <Textarea
              value={transformOptions.template || ''}
              onChange={(e) => handleOptionsChange({ ...transformOptions, template: e.target.value })}
              placeholder="Use {{value}} for the field value, e.g., Hello {{value}}!"
              rows={3}
            />
            <p className="text-xs text-gray-500">Available fields: {availableFields.join(', ')}</p>
          </div>
        );

      case 'date-format':
        return (
          <div className="space-y-3">
            <div>
              <Label>Input Format</Label>
              <Input
                value={transformOptions.inputFormat || ''}
                onChange={(e) => handleOptionsChange({ ...transformOptions, inputFormat: e.target.value })}
                placeholder="e.g., YYYY-MM-DD"
              />
            </div>
            <div>
              <Label>Output Format</Label>
              <Input
                value={transformOptions.outputFormat || ''}
                onChange={(e) => handleOptionsChange({ ...transformOptions, outputFormat: e.target.value })}
                placeholder="e.g., MM/DD/YYYY"
              />
            </div>
            <div>
              <Label>Timezone</Label>
              <Input
                value={transformOptions.timezone || ''}
                onChange={(e) => handleOptionsChange({ ...transformOptions, timezone: e.target.value })}
                placeholder="e.g., America/New_York"
              />
            </div>
          </div>
        );

      case 'math-operation':
        return (
          <div className="space-y-3">
            <div>
              <Label>Operation</Label>
              <Select
                value={transformOptions.operation || 'add'}
                onValueChange={(value) => handleOptionsChange({ ...transformOptions, operation: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add</SelectItem>
                  <SelectItem value="subtract">Subtract</SelectItem>
                  <SelectItem value="multiply">Multiply</SelectItem>
                  <SelectItem value="divide">Divide</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Operand</Label>
              <Input
                type="number"
                value={transformOptions.operand || 0}
                onChange={(e) => handleOptionsChange({ ...transformOptions, operand: Number(e.target.value) })}
                placeholder="Enter number"
              />
            </div>
          </div>
        );

      case 'lookup':
        return (
          <div className="space-y-3">
            <Label>Lookup Mappings (JSON)</Label>
            <Textarea
              value={JSON.stringify(transformOptions.mappings || {}, null, 2)}
              onChange={(e) => {
                try {
                  const mappings = JSON.parse(e.target.value);
                  handleOptionsChange({ ...transformOptions, mappings });
                } catch (err) {
                  // Invalid JSON, ignore
                }
              }}
              placeholder='{"key1": "value1", "key2": "value2"}'
              rows={5}
            />
            <div>
              <Label>Default Value</Label>
              <Input
                value={transformOptions.defaultValue || ''}
                onChange={(e) => handleOptionsChange({ ...transformOptions, defaultValue: e.target.value })}
                placeholder="Value if no match found"
              />
            </div>
          </div>
        );

      case 'regex-extract':
        return (
          <div className="space-y-3">
            <div>
              <Label>Pattern</Label>
              <Input
                value={transformOptions.pattern || ''}
                onChange={(e) => handleOptionsChange({ ...transformOptions, pattern: e.target.value })}
                placeholder="e.g., \d+"
              />
            </div>
            <div>
              <Label>Capture Group</Label>
              <Input
                type="number"
                value={transformOptions.group || 0}
                onChange={(e) => handleOptionsChange({ ...transformOptions, group: Number(e.target.value) })}
                min={0}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Flags</Label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="global-flag"
                    checked={transformOptions.flags?.includes('g')}
                    onCheckedChange={(checked) => {
                      const flags = transformOptions.flags || '';
                      const newFlags = checked ? flags + 'g' : flags.replace('g', '');
                      handleOptionsChange({ ...transformOptions, flags: newFlags });
                    }}
                  />
                  <Label htmlFor="global-flag" className="cursor-pointer">Global (g)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="case-flag"
                    checked={transformOptions.flags?.includes('i')}
                    onCheckedChange={(checked) => {
                      const flags = transformOptions.flags || '';
                      const newFlags = checked ? flags + 'i' : flags.replace('i', '');
                      handleOptionsChange({ ...transformOptions, flags: newFlags });
                    }}
                  />
                  <Label htmlFor="case-flag" className="cursor-pointer">Case Insensitive (i)</Label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'join':
      case 'split':
        return (
          <div className="space-y-3">
            <div>
              <Label>Delimiter</Label>
              <Input
                value={transformOptions.delimiter || ''}
                onChange={(e) => handleOptionsChange({ ...transformOptions, delimiter: e.target.value })}
                placeholder="e.g., ,"
              />
            </div>
            {selectedTransform === 'split' && (
              <div>
                <Label>Limit (optional)</Label>
                <Input
                  type="number"
                  value={transformOptions.limit || ''}
                  onChange={(e) => handleOptionsChange({ ...transformOptions, limit: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="Max items"
                />
              </div>
            )}
          </div>
        );

      case 'custom-aggregate':
        return (
          <div className="space-y-3">
            <div>
              <Label>Aggregate Type</Label>
              <Select
                value={transformOptions.aggregateType || 'sum'}
                onValueChange={(value) => handleOptionsChange({ ...transformOptions, aggregateType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="min">Minimum</SelectItem>
                  <SelectItem value="max">Maximum</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {transformOptions.aggregateType === 'custom' && (
              <div>
                <Label>Custom Logic (JavaScript)</Label>
                <Textarea
                  value={transformOptions.customLogic || ''}
                  onChange={(e) => handleOptionsChange({ ...transformOptions, customLogic: e.target.value })}
                  placeholder="e.g., (acc, item) => acc + item.value"
                  rows={4}
                />
              </div>
            )}
          </div>
        );

      case 'round':
      case 'floor':
      case 'ceil':
        return (
          <div>
            <Label>Decimal Places</Label>
            <Input
              type="number"
              value={transformOptions.precision || 0}
              onChange={(e) => handleOptionsChange({ ...transformOptions, precision: Number(e.target.value) })}
              min={0}
              max={10}
              placeholder="0"
            />
          </div>
        );

      case 'uppercase':
      case 'lowercase':
      case 'capitalize':
      case 'trim':
        return (
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              This transformation will be applied directly without additional configuration.
            </AlertDescription>
          </Alert>
        );

      case 'substring':
        return (
          <div className="space-y-3">
            <div>
              <Label>Start Index</Label>
              <Input
                type="number"
                value={transformOptions.start || 0}
                onChange={(e) => handleOptionsChange({ ...transformOptions, start: Number(e.target.value) })}
                min={0}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Length <span className="text-xs text-gray-500">(leave empty for rest of string)</span></Label>
              <Input
                type="number"
                value={transformOptions.length || ''}
                onChange={(e) => handleOptionsChange({ ...transformOptions, length: e.target.value ? Number(e.target.value) : undefined })}
                min={1}
                placeholder="Optional"
              />
            </div>
          </div>
        );

      case 'replace':
        return (
          <div className="space-y-3">
            <div>
              <Label>Find</Label>
              <Input
                value={transformOptions.find || ''}
                onChange={(e) => handleOptionsChange({ ...transformOptions, find: e.target.value })}
                placeholder="Text to find"
              />
            </div>
            <div>
              <Label>Replace With</Label>
              <Input
                value={transformOptions.replace || ''}
                onChange={(e) => handleOptionsChange({ ...transformOptions, replace: e.target.value })}
                placeholder="Replacement text"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="replace-all"
                checked={transformOptions.replaceAll !== false}
                onCheckedChange={(checked) => handleOptionsChange({ ...transformOptions, replaceAll: checked })}
              />
              <Label htmlFor="replace-all" className="cursor-pointer">Replace All Occurrences</Label>
            </div>
          </div>
        );

      case 'ai-transform':
        return (
          <AITransformationOptions
            prompt={transformOptions.prompt || ''}
            systemPrompt={transformOptions.systemPrompt}
            outputFormat={transformOptions.outputFormat}
            fieldContext={availableFields}
            examples={transformOptions.examples}
            cacheResults={transformOptions.cacheResults}
            onChange={handleOptionsChange}
          />
        );

      default:
        return (
          <Alert className="bg-yellow-50 border-yellow-200">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              Configuration options for {selectedTransform} are not yet implemented.
            </AlertDescription>
          </Alert>
        );
    }
  };

  // Helper function to get the icon component
  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName] || ArrowRight;
    return <IconComponent className="h-5 w-5" />;
  };

  return (
    <div className="transformation-builder p-6 bg-gray-50 rounded-lg border space-y-6">
      <div className="transform-selector">
        <h4 className="text-sm font-semibold mb-4">Select Transformation</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {availableTransforms.map(transform => (
            <Card
              key={transform.id}
              className={`cursor-pointer transition-all ${selectedTransform === transform.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'hover:border-gray-400 hover:shadow-sm'}`}
              onClick={() => handleTransformSelect(transform.id as TransformationType)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedTransform === transform.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                    {getIconComponent(transform.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <strong className="text-sm block truncate mb-1">{transform.name}</strong>
                    <small className="text-xs text-gray-600 line-clamp-2">{transform.description}</small>
                  </div>
                </div>
                {transform.id === 'ai-transform' && (
                  <Badge variant="default" className="mt-3 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {selectedTransform && (
        <div className="transform-options space-y-4">
          <h4 className="text-sm font-semibold mb-4">Configuration</h4>
          <div className="space-y-4">
            {renderTransformOptions()}
          </div>

          {selectedTransform !== 'ai-transform' && (
            <div className="transform-preview">
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle>Example</AlertTitle>
                <AlertDescription>
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span>Input:</span>
                    <Badge variant="outline">Sample Value</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <span>Output:</span>
                    <Badge variant="default">
                      {getTransformPreview(selectedTransform, transformOptions, 'Sample Value')}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to generate preview
function getTransformPreview(
  transform: TransformationType,
  options: Record<string, any>,
  input: string
): string {
  switch (transform) {
    case 'uppercase':
      return input.toUpperCase();
    case 'lowercase':
      return input.toLowerCase();
    case 'capitalize':
      return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
    case 'trim':
      return input.trim();
    case 'string-format':
      return options.template?.replace('{{value}}', input) || input;
    case 'substring':
      return input.substring(options.start || 0, options.length ? (options.start || 0) + options.length : undefined);
    case 'replace':
      return options.replaceAll !== false
        ? input.replaceAll(options.find || '', options.replace || '')
        : input.replace(options.find || '', options.replace || '');
    default:
      return `[${transform}]`;
  }
}

export default TransformationBuilder;

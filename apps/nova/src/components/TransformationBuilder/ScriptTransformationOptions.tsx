import React, { useState, useEffect, useMemo } from 'react';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Code, AlertTriangle, Info, Play, CheckCircle2, XCircle, Database } from 'lucide-react';
import { Button } from '../ui/button';

interface ScriptTransformationOptionsProps {
  script: string;
  language?: 'javascript';
  applyTo?: 'item' | 'array';
  timeout?: number;
  fieldContext?: string[];
  sampleData?: Record<string, any>;
  sourceDataPaths?: Record<string, string>;
  onChange: (options: Record<string, any>) => void;
}

const EXAMPLE_SCRIPTS = {
  'format-price': `// Format price with currency symbol
return {
  ...item,
  formattedPrice: '$' + (item.price || 0).toFixed(2)
};`,
  'combine-fields': `// Combine first and last name
return {
  ...item,
  fullName: (item.firstName || '') + ' ' + (item.lastName || '')
};`,
  'calculate-total': `// Calculate total from quantity and price
return {
  ...item,
  total: (item.quantity || 0) * (item.price || 0)
};`,
  'filter-transform': `// Transform and add computed fields
const score = item.votes / item.totalVotes * 100;
return {
  ...item,
  percentage: Math.round(score * 10) / 10,
  isLeading: score > 50
};`,
  'array-aggregate': `// Aggregate array data (when applyTo is 'array')
const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
return data.map(item => ({
  ...item,
  percentOfTotal: total > 0 ? (item.value / total * 100).toFixed(1) : 0
}));`,
  'custom': ''
};

const ScriptTransformationOptions: React.FC<ScriptTransformationOptionsProps> = ({
  script,
  language = 'javascript',
  applyTo = 'item',
  timeout = 5000,
  fieldContext = [],
  sampleData = {},
  sourceDataPaths = {},
  onChange
}) => {
  const [localScript, setLocalScript] = useState(script || EXAMPLE_SCRIPTS['format-price']);
  const [localApplyTo, setLocalApplyTo] = useState<'item' | 'array'>(applyTo);
  const [localTimeout, setLocalTimeout] = useState(timeout);
  const [selectedExample, setSelectedExample] = useState<string>('format-price');
  const [testResult, setTestResult] = useState<{ success: boolean; output?: string; error?: string } | null>(null);

  // Helper to get value at a dot-separated path
  const getValueAtPath = (obj: any, path: string): any => {
    if (!path) return obj;
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Helper to clean internal fields from an item
  const cleanItem = (item: any): any => {
    if (typeof item === 'object' && item !== null) {
      const cleaned = { ...item };
      delete cleaned._sourceInfo;
      return cleaned;
    }
    return item;
  };

  // Extract test data from sample data (respects user's data root selection)
  const testData = useMemo(() => {
    // Get the first available source's data
    const sourceIds = Object.keys(sampleData);
    if (sourceIds.length === 0) {
      // Fallback test data if no sample data
      return localApplyTo === 'item'
        ? { name: 'Test Item', price: 19.99, quantity: 2, votes: 75, totalVotes: 100 }
        : [
            { name: 'Item 1', value: 30 },
            { name: 'Item 2', value: 70 }
          ];
    }

    const firstSourceId = sourceIds[0];
    const firstSourceData = sampleData[firstSourceId];

    // Use the configured data path for this source if available
    const configuredPath = sourceDataPaths[firstSourceId];
    if (configuredPath) {
      const dataAtPath = getValueAtPath(firstSourceData, configuredPath);
      if (Array.isArray(dataAtPath) && dataAtPath.length > 0) {
        if (localApplyTo === 'item') {
          return cleanItem(dataAtPath[0]);
        }
        return dataAtPath.slice(0, 5).map(cleanItem);
      } else if (dataAtPath && typeof dataAtPath === 'object') {
        return localApplyTo === 'item' ? cleanItem(dataAtPath) : [cleanItem(dataAtPath)];
      }
    }

    // Fallback: If it's an array, return first item for 'item' mode or full array for 'array' mode
    if (Array.isArray(firstSourceData)) {
      if (localApplyTo === 'item') {
        return cleanItem(firstSourceData[0]) || {};
      }
      return firstSourceData.slice(0, 5).map(cleanItem);
    }

    // Fallback: If it's an object, try to find array data inside
    if (typeof firstSourceData === 'object' && firstSourceData !== null) {
      // Look for common array keys
      const arrayKeys = ['items', 'data', 'results', 'records', 'events', 'entries', 'rows', 'list'];
      for (const key of arrayKeys) {
        if (Array.isArray(firstSourceData[key]) && firstSourceData[key].length > 0) {
          if (localApplyTo === 'item') {
            return cleanItem(firstSourceData[key][0]) || {};
          }
          return firstSourceData[key].slice(0, 5).map(cleanItem);
        }
      }
      // Return the object itself for item mode
      return localApplyTo === 'item' ? cleanItem(firstSourceData) : [cleanItem(firstSourceData)];
    }

    return localApplyTo === 'item' ? {} : [];
  }, [sampleData, sourceDataPaths, localApplyTo]);

  const hasSampleData = Object.keys(sampleData).length > 0;

  useEffect(() => {
    onChange({
      script: localScript,
      language: 'javascript',
      applyTo: localApplyTo,
      timeout: localTimeout
    });
  }, [localScript, localApplyTo, localTimeout]);

  const handleExampleSelect = (example: string) => {
    setSelectedExample(example);
    if (example !== 'custom' && EXAMPLE_SCRIPTS[example as keyof typeof EXAMPLE_SCRIPTS]) {
      setLocalScript(EXAMPLE_SCRIPTS[example as keyof typeof EXAMPLE_SCRIPTS]);
    }
  };

  const handleTestScript = () => {
    try {
      // Build the function based on applyTo mode
      let fn;
      if (localApplyTo === 'item') {
        fn = new Function('item', localScript);
      } else {
        fn = new Function('data', localScript);
      }

      const result = fn(testData);
      setTestResult({
        success: true,
        output: JSON.stringify(result, null, 2)
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message
      });
    }
  };

  return (
    <div className="space-y-5 w-full min-w-0 max-w-full overflow-hidden">
      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Script Transformation</AlertTitle>
        <AlertDescription className="text-amber-700">
          Write custom JavaScript to transform your data. Scripts run in a sandboxed environment
          with access only to the data being transformed.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <Label>Apply Script To</Label>
        <Select value={localApplyTo} onValueChange={(v) => setLocalApplyTo(v as 'item' | 'array')}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="item">
              <div className="flex items-center gap-2">
                <span>Each Item</span>
                <Badge variant="outline" className="text-xs">item =&gt; item</Badge>
              </div>
            </SelectItem>
            <SelectItem value="array">
              <div className="flex items-center gap-2">
                <span>Entire Array</span>
                <Badge variant="outline" className="text-xs">data[] =&gt; data[]</Badge>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          {localApplyTo === 'item'
            ? 'Script receives each array item as "item" variable and should return the transformed item.'
            : 'Script receives the entire array as "data" variable and should return the transformed array.'}
        </p>
      </div>

      <div className="space-y-3">
        <Label>Start From Example</Label>
        <Select value={selectedExample} onValueChange={handleExampleSelect}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="format-price">Format Price</SelectItem>
            <SelectItem value="combine-fields">Combine Fields</SelectItem>
            <SelectItem value="calculate-total">Calculate Total</SelectItem>
            <SelectItem value="filter-transform">Transform with Calculations</SelectItem>
            <SelectItem value="array-aggregate">Array Aggregation</SelectItem>
            <SelectItem value="custom">Custom Script</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            JavaScript Code
          </Label>
          <Badge variant="secondary" className="text-xs">
            {localApplyTo === 'item' ? 'function(item)' : 'function(data)'}
          </Badge>
        </div>
        <div className="relative w-full">
          <Textarea
            value={localScript}
            onChange={(e) => {
              setLocalScript(e.target.value);
              setSelectedExample('custom');
            }}
            placeholder={localApplyTo === 'item'
              ? "// Transform each item\nreturn { ...item, newField: item.existingField };"
              : "// Transform the entire array\nreturn data.map(item => ({ ...item }));"}
            rows={10}
            className="font-mono text-sm bg-gray-900 text-gray-100 border-gray-700 w-full resize-none"
          />
        </div>
      </div>

      {/* Sample Data Preview */}
      <Card className="bg-gray-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" />
            {hasSampleData ? 'Sample Data (from your data source)' : 'Test Data (mock)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-auto max-h-32 whitespace-pre-wrap break-all">
            {JSON.stringify(testData, null, 2)}
          </pre>
          {!hasSampleData && (
            <p className="text-xs text-gray-500 mt-2">
              Test your data sources in the Output Format step to use real sample data.
            </p>
          )}
        </CardContent>
      </Card>

      {fieldContext.length > 0 && (
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <Label className="text-xs text-gray-600 mb-2 block">Available Fields</Label>
            <div className="flex flex-wrap gap-1">
              {fieldContext.slice(0, 15).map(field => (
                <Badge key={field} variant="outline" className="text-xs font-mono">
                  {field.length > 25 ? '...' + field.slice(-23) : field}
                </Badge>
              ))}
              {fieldContext.length > 15 && (
                <Badge variant="secondary" className="text-xs">+{fieldContext.length - 15} more</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={handleTestScript}>
          <Play className="h-4 w-4 mr-2" />
          Test Script{hasSampleData ? ' with Sample Data' : ''}
        </Button>
      </div>

      {testResult && (
        <Alert className={testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
          {testResult.success ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertTitle className={testResult.success ? 'text-green-800' : 'text-red-800'}>
            {testResult.success ? 'Test Passed' : 'Test Failed'}
          </AlertTitle>
          <AlertDescription>
            {testResult.success ? (
              <pre className="text-xs mt-2 p-2 bg-white rounded border overflow-auto max-h-40 whitespace-pre-wrap break-all">
                {testResult.output}
              </pre>
            ) : (
              <span className="text-red-700">{testResult.error}</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Script Reference</AlertTitle>
        <AlertDescription className="text-blue-700 text-xs space-y-2">
          <p><strong>Available variable:</strong> <code className="bg-blue-100 px-1 rounded">{localApplyTo === 'item' ? 'item' : 'data'}</code> - The {localApplyTo === 'item' ? 'current item being transformed' : 'full array of items'}</p>
          <p><strong>Must return:</strong> The transformed {localApplyTo === 'item' ? 'item object' : 'array'}</p>
          <p><strong>Timeout:</strong> Scripts timeout after {localTimeout / 1000}s to prevent infinite loops</p>
          <p><strong>Restrictions:</strong> No access to fetch, DOM, or external resources</p>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ScriptTransformationOptions;

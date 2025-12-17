import React, { useState, useEffect } from 'react';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ChevronDown, ChevronUp, Trash2, Plus, Play, Info, ArrowRight } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { useToast } from '../ui/use-toast';
import { isDevelopment, SKIP_AUTH_IN_DEV } from '../../utils/constants';

const publicAnonKey = import.meta.env.VITE_NOVA_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface AITransformationOptionsProps {
  prompt: string;
  systemPrompt?: string;
  outputFormat?: 'text' | 'json' | 'structured';
  fieldContext?: string[];
  examples?: Array<{ input: any; output: any }>;
  cacheResults?: boolean;
  onChange: (options: Record<string, any>) => void;
}

const AITransformationOptions: React.FC<AITransformationOptionsProps> = ({
  prompt = '',
  systemPrompt = '',
  outputFormat = 'text',
  fieldContext = [],
  examples = [],
  cacheResults = true,
  onChange
}) => {
  const { toast } = useToast();
  const [localPrompt, setLocalPrompt] = useState(prompt);
  const [localSystemPrompt, setLocalSystemPrompt] = useState(systemPrompt);
  const [localOutputFormat, setLocalOutputFormat] = useState(outputFormat);
  const [localExamples, setLocalExamples] = useState(examples);
  const [localCacheResults, setLocalCacheResults] = useState(cacheResults);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  // Predefined prompt templates
  const promptTemplates = [
    {
      name: 'Extract Information',
      prompt: 'Extract the following information: {{fields}}',
      system: 'You are a data extraction assistant. Extract only the requested information from the input.'
    },
    {
      name: 'Summarize',
      prompt: 'Summarize this text in 2-3 sentences',
      system: 'You are a summarization assistant. Create concise, informative summaries.'
    },
    {
      name: 'Translate',
      prompt: 'Translate this text to {{language}}',
      system: 'You are a translation assistant. Translate accurately while preserving meaning and tone.'
    },
    {
      name: 'Format/Clean',
      prompt: 'Clean and format this data as {{format}}',
      system: 'You are a data formatting assistant. Clean, standardize, and format data consistently.'
    },
    {
      name: 'Categorize',
      prompt: 'Categorize this into one of: {{categories}}',
      system: 'You are a categorization assistant. Assign the most appropriate category based on the content.'
    },
    {
      name: 'Sentiment Analysis',
      prompt: 'Analyze the sentiment (positive/negative/neutral) and confidence score',
      system: 'You are a sentiment analysis assistant. Analyze emotional tone and provide confidence scores.'
    },
    {
      name: 'Entity Extraction',
      prompt: 'Extract all {{entity_type}} entities',
      system: 'You are an entity extraction assistant. Identify and extract specific types of entities from text.'
    },
    {
      name: 'Custom',
      prompt: '',
      system: ''
    }
  ];

  // Update parent when options change
  useEffect(() => {
    onChange({
      prompt: localPrompt,
      systemPrompt: localSystemPrompt,
      outputFormat: localOutputFormat,
      examples: localExamples,
      cacheResults: localCacheResults
    });
  }, [localPrompt, localSystemPrompt, localOutputFormat, localExamples, localCacheResults]);

  // Test the AI transformation
  const testTransformation = async () => {
    if (!testInput || !localPrompt) {
      toast({
        title: 'Missing input',
        description: 'Please provide both test input and a prompt',
        variant: 'destructive'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Build the full prompt with context
      let fullPrompt = localPrompt;

      // Add field context if available
      if (fieldContext && fieldContext.length > 0) {
        fullPrompt = fullPrompt.replace('{{fields}}', fieldContext.join(', '));
      }

      // Add the input value
      fullPrompt = `Input: ${testInput}\n\nTask: ${fullPrompt}`;

      // Add examples if provided
      if (localExamples.length > 0) {
        fullPrompt += '\n\nExamples:\n';
        localExamples.forEach((ex, idx) => {
          fullPrompt += `Example ${idx + 1}:\nInput: ${JSON.stringify(ex.input)}\nOutput: ${JSON.stringify(ex.output)}\n\n`;
        });
      }

      // Add output format instruction
      if (localOutputFormat === 'json') {
        fullPrompt += '\n\nRespond with valid JSON only.';
      } else if (localOutputFormat === 'structured') {
        fullPrompt += '\n\nRespond with structured data matching the examples provided.';
      }

      // Call the edge function
      // In development mode with auth disabled, use the anon key instead of session token
      const headers: Record<string, string> = {};

      if (isDevelopment && SKIP_AUTH_IN_DEV) {
        // Use anon key for development
        headers['Authorization'] = `Bearer ${publicAnonKey}`;
      } else {
        // Use session token in production
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }

      const response = await supabase.functions.invoke('claude', {
        body: {
          prompt: fullPrompt,
          systemPrompt: localSystemPrompt || 'You are a data transformation assistant. Transform the input according to the instructions provided.',
          outputFormat: localOutputFormat
        },
        headers
      });

      if (response.error) {
        throw response.error;
      }

      // Parse the response based on output format
      let result = response.data.response;
      if (localOutputFormat === 'json' || localOutputFormat === 'structured') {
        try {
          // Try to extract JSON from the response
          const jsonMatch = result.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.warn('Could not parse as JSON, returning raw text');
        }
      }

      setTestResult(result);
      toast({
        title: 'Test successful',
        description: 'AI transformation completed'
      });
    } catch (error: any) {
      console.error('Test transformation error:', error);
      console.error('Error details:', {
        message: error?.message,
        context: error?.context,
        details: error?.details,
        status: error?.status,
        statusText: error?.statusText,
        full: JSON.stringify(error, null, 2)
      });

      let errorMessage = error.message || 'Failed to test transformation';

      // Provide more helpful error messages
      if (errorMessage.includes('Edge Function') || errorMessage.includes('FunctionsHttpError')) {
        const detailsMsg = error?.context?.body ? ` Details: ${JSON.stringify(error.context.body)}` : '';
        errorMessage = `Claude AI function not available. Please ensure the edge function is deployed and ANTHROPIC_API_KEY is configured.${detailsMsg}`;
      } else if (errorMessage.includes('request')) {
        errorMessage = 'Failed to connect to Claude AI service. Please check your network connection and Supabase configuration.';
      }

      toast({
        title: 'Test failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  // Add an example
  const addExample = () => {
    setLocalExamples([...localExamples, { input: '', output: '' }]);
  };

  // Remove an example
  const removeExample = (index: number) => {
    setLocalExamples(localExamples.filter((_, i) => i !== index));
  };

  // Update an example
  const updateExample = (index: number, field: 'input' | 'output', value: string) => {
    const updated = [...localExamples];
    updated[index][field] = value;
    setLocalExamples(updated);
  };

  // Apply a template
  const applyTemplate = (templateName: string) => {
    const template = promptTemplates.find(t => t.name === templateName);
    if (template) {
      setLocalPrompt(template.prompt);
      setLocalSystemPrompt(template.system);
    }
  };

  return (
    <div className="ai-transformation-options space-y-4">
      {/* Template Selection */}
      <div>
        <Label>Template</Label>
        <Select onValueChange={applyTemplate} defaultValue="Custom">
          <SelectTrigger>
            <SelectValue placeholder="Start with a template" />
          </SelectTrigger>
          <SelectContent>
            {promptTemplates.map(t => (
              <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">Start with a predefined template or create custom</p>
      </div>

      {/* Main Prompt */}
      <div>
        <Label>
          Transformation Prompt <span className="text-red-500">*</span>
        </Label>
        <Textarea
          value={localPrompt}
          onChange={(e) => setLocalPrompt(e.target.value)}
          placeholder="e.g., Extract the product name and price from this description"
          rows={3}
          className="resize-y"
        />
        <p className="text-xs text-gray-500 mt-1">
          Describe how to transform the data. Use {`{{field_name}}`} for placeholders.
        </p>
      </div>

      {/* Output Format */}
      <div>
        <Label>Output Format</Label>
        <Select value={localOutputFormat} onValueChange={(value: any) => setLocalOutputFormat(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Plain Text</SelectItem>
            <SelectItem value="json">JSON Object</SelectItem>
            <SelectItem value="structured">Structured (Match Examples)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Options */}
      <Button
        variant="ghost"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full justify-start"
      >
        {showAdvanced ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
        Advanced Options
      </Button>

      {showAdvanced && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* System Prompt */}
            <div>
              <Label>System Prompt</Label>
              <Textarea
                value={localSystemPrompt}
                onChange={(e) => setLocalSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant that..."
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">Optional: Override the default system instructions</p>
            </div>

            {/* Examples */}
            <div>
              <Label>Examples</Label>
              <p className="text-xs text-gray-500 mb-2">Provide input/output examples for better results</p>
              {localExamples.map((example, idx) => (
                <Card key={idx} className="mb-2">
                  <CardContent className="p-3">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Input
                          placeholder="Example input..."
                          value={example.input}
                          onChange={(e) => updateExample(idx, 'input', e.target.value)}
                        />
                      </div>
                      <ArrowRight className="h-4 w-4 mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <Input
                          placeholder="Expected output..."
                          value={example.output}
                          onChange={(e) => updateExample(idx, 'output', e.target.value)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExample(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addExample}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Example
              </Button>
            </div>

            {/* Cache Results */}
            <div className="flex items-center space-x-2">
              <Switch
                id="cache-results"
                checked={localCacheResults}
                onCheckedChange={setLocalCacheResults}
              />
              <Label htmlFor="cache-results" className="cursor-pointer">Cache Results</Label>
            </div>
            <p className="text-xs text-gray-500">
              Cache identical transformations to reduce API calls and costs
            </p>
          </CardContent>
        </Card>
      )}

      {/* Test Transformation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test Transformation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Test Input</Label>
            <Textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Enter sample data to test the transformation..."
              rows={2}
            />
          </div>

          <Button
            onClick={testTransformation}
            disabled={!testInput || !localPrompt || testing}
          >
            {testing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Testing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Test
              </>
            )}
          </Button>

          {testResult && (
            <Card className="bg-gray-50">
              <CardContent className="pt-4">
                <strong className="text-sm">Result:</strong>
                <pre className="mt-2 p-3 bg-white rounded border overflow-auto max-h-48 text-xs">
                  {typeof testResult === 'object'
                    ? JSON.stringify(testResult, null, 2)
                    : testResult}
                </pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Usage Info */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">AI Transformation Usage</AlertTitle>
        <AlertDescription className="text-blue-900">
          <ul className="mt-2 ml-4 text-sm space-y-1 list-disc">
            <li>Each transformation calls Claude API (costs apply)</li>
            <li>Use caching to reduce repeated API calls</li>
            <li>Provide clear prompts and examples for best results</li>
            <li>Test thoroughly before applying to production data</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default AITransformationOptions;

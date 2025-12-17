import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Copy, Play, Loader2, CheckCircle, XCircle, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { useToast } from './ui/use-toast';
import type { Agent } from '../types/agents';
import { JSONTree } from 'react-json-tree';
import { XMLParser } from 'fast-xml-parser';

interface TestStepProps {
  formData: Partial<Agent>;
  onSaveTest?: (testAgentData: Partial<Agent>) => Promise<{ success: boolean; agentId?: string; error?: string }>; // Function to save a temporary test agent
}

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  responseTime?: number;
  statusCode?: number;
  headers?: Record<string, string>;
  size?: number;
}

export const TestStep: React.FC<TestStepProps> = ({ formData, onSaveTest }) => {
  const { toast } = useToast();
  const [testMethod, setTestMethod] = useState<string>('GET');
  const [queryParams, setQueryParams] = useState<Array<{ key: string; value: string }>>([{ key: '', value: '' }]);
  const [testBody, setTestBody] = useState<string>('');
  const [testHeaders, setTestHeaders] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('response');

  // Track the current test agent for cleanup on unmount
  const currentTestAgentRef = useRef<{ id: string; slug: string } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function to delete test agent
  const cleanupTestAgent = async (agentId: string, slug: string) => {
    try {
      await supabase
        .from('api_endpoints')
        .delete()
        .eq('id', agentId);
      console.log('Cleaned up temporary test endpoint:', slug);
    } catch (cleanupError) {
      console.error('Failed to clean up test endpoint:', cleanupError);
    }
  };

  // Cleanup on component unmount (e.g., page refresh)
  useEffect(() => {
    return () => {
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Clean up test agent if one exists
      if (currentTestAgentRef.current) {
        const { id, slug } = currentTestAgentRef.current;
        // Fire-and-forget cleanup (can't await in cleanup function)
        cleanupTestAgent(id, slug);
      }
    };
  }, []);

  const getEndpointUrl = () => {
    const baseUrl = window.location.origin;
    const slug = formData.slug || 'endpoint';
    return `${baseUrl}/api/${slug}`;
  };

  const addQueryParam = () => {
    setQueryParams([...queryParams, { key: '', value: '' }]);
  };

  const updateQueryParam = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...queryParams];
    updated[index][field] = value;
    setQueryParams(updated);
  };

  const removeQueryParam = (index: number) => {
    setQueryParams(queryParams.filter((_, i) => i !== index));
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusIntent = (statusCode: number): 'default' | 'secondary' | 'destructive' => {
    if (statusCode >= 200 && statusCode < 300) return 'default';
    if (statusCode >= 400) return 'destructive';
    return 'secondary';
  };

  const generateCurlCommand = (): string => {
    let url = getEndpointUrl();

    // Add query parameters
    const params = queryParams.filter(p => p.key && p.value);
    if (params.length > 0) {
      const queryString = params.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      url += `?${queryString}`;
    }

    let cmd = `curl -X ${testMethod} "${url}"`;

    // Add headers
    if (testHeaders.trim()) {
      try {
        const headers = JSON.parse(testHeaders);
        Object.entries(headers).forEach(([key, value]) => {
          cmd += ` \\\n  -H "${key}: ${value}"`;
        });
      } catch (e) {
        // Invalid JSON, skip headers
      }
    }

    // Add body for non-GET/DELETE methods
    if (testMethod !== 'GET' && testMethod !== 'DELETE' && testBody.trim()) {
      cmd += ` \\\n  -d '${testBody}'`;
    }

    return cmd;
  };

  const runTest = async () => {
    if (!onSaveTest) {
      toast({
        title: 'Test Not Available',
        description: 'Test functionality is not available',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    let tempAgentId: string | undefined;
    let tempSlug: string | undefined;

    try {
      // Validate JSON inputs
      let parsedBody = null;
      if (testBody.trim() && testMethod !== 'GET' && testMethod !== 'DELETE') {
        try {
          parsedBody = JSON.parse(testBody);
        } catch (e) {
          toast({
            title: 'Invalid JSON',
            description: 'The request body is not valid JSON',
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }
      }

      let parsedHeaders: Record<string, string> = {};
      if (testHeaders.trim()) {
        try {
          parsedHeaders = JSON.parse(testHeaders);
        } catch (e) {
          toast({
            title: 'Invalid JSON',
            description: 'The headers are not valid JSON',
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }
      }

      // Create a temporary slug for testing
      tempSlug = `${formData.slug || 'test'}-test-${Date.now()}`;

      // Create test agent data with temporary slug
      const testAgentData = {
        ...formData,
        slug: tempSlug,
        name: `[TEST] ${formData.name || 'Test Agent'}`,
        status: 'ACTIVE' as const // Must be active for edge function to find it
      };

      // Save the temporary test agent
      const saveResult = await onSaveTest(testAgentData);

      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to create test endpoint');
      }

      tempAgentId = saveResult.agentId;

      // Store in ref for cleanup on unmount
      if (tempAgentId && tempSlug) {
        currentTestAgentRef.current = { id: tempAgentId, slug: tempSlug };
      }

      // Wait a moment for database consistency
      await new Promise(resolve => setTimeout(resolve, 500));

      // Build the test endpoint URL
      const baseUrl = window.location.origin;
      let testUrl = `${baseUrl}/api/${tempSlug}`;

      // Add query parameters
      const params = queryParams.filter(p => p.key && p.value);
      if (params.length > 0) {
        const queryString = params.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
        testUrl += `?${queryString}`;
      }

      const startTime = Date.now();

      // Create AbortController for request timeout and cancellation
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Set timeout for 60 seconds
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, 60000);

      // Make request to the actual endpoint
      const requestOptions: RequestInit = {
        method: testMethod,
        headers: {
          'Content-Type': 'application/json',
          ...parsedHeaders
        },
        signal: abortController.signal
      };

      // Add body for non-GET/DELETE methods
      if (parsedBody && testMethod !== 'GET' && testMethod !== 'DELETE') {
        requestOptions.body = JSON.stringify(parsedBody);
      }

      const response = await fetch(testUrl, requestOptions);
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      // Get response data
      const contentType = response.headers.get('content-type');
      let responseData;

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      const responseSize = JSON.stringify(responseData).length;

      // Extract headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      if (response.ok) {
        setTestResult({
          success: true,
          data: responseData,
          responseTime,
          statusCode: response.status,
          headers: responseHeaders,
          size: responseSize
        });
        toast({
          title: 'Test Successful',
          description: `API endpoint responded in ${responseTime}ms`
        });
      } else {
        setTestResult({
          success: false,
          error: typeof responseData === 'string' ? responseData : JSON.stringify(responseData),
          responseTime,
          statusCode: response.status,
          headers: responseHeaders
        });
        toast({
          title: 'Test Failed',
          description: `Endpoint returned status ${response.status}`,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Test error:', error);

      // Check if request was aborted (timeout or manual cancellation)
      const isAborted = error.name === 'AbortError';

      setTestResult({
        success: false,
        error: isAborted ? 'Request timed out after 60 seconds' : (error.message || 'Unknown error occurred'),
        responseTime: 0,
        statusCode: 500
      });
      toast({
        title: isAborted ? 'Request Timeout' : 'Test Error',
        description: isAborted ? 'The test request timed out after 60 seconds' : (error.message || 'An error occurred while testing'),
        variant: 'destructive'
      });
    } finally {
      // Clear abort controller ref
      abortControllerRef.current = null;

      // Clean up: Delete the temporary test endpoint
      if (tempAgentId && tempSlug) {
        await cleanupTestAgent(tempAgentId, tempSlug);
        // Clear the ref after cleanup
        currentTestAgentRef.current = null;
      }

      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Copied to clipboard'
    });
  };

  return (
    <div className="space-y-6">
      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Endpoint URL */}
          <div>
            <Label>Endpoint URL</Label>
            <div className="flex gap-2">
              <Input
                value={getEndpointUrl()}
                readOnly
                className="flex-1 font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(getEndpointUrl())}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* HTTP Method */}
          <div>
            <Label>HTTP Method</Label>
            <Select value={testMethod} onValueChange={setTestMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Query Parameters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Query Parameters</Label>
              <Button size="sm" variant="outline" onClick={addQueryParam}>
                <Plus className="h-4 w-4 mr-2" />
                Add Parameter
              </Button>
            </div>
            <div className="space-y-2">
              {queryParams.map((param, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Key"
                    value={param.key}
                    onChange={(e) => updateQueryParam(index, 'key', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Value"
                    value={param.value}
                    onChange={(e) => updateQueryParam(index, 'value', e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeQueryParam(index)}
                    disabled={queryParams.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Request Body (only for non-GET/DELETE) */}
          {testMethod !== 'GET' && testMethod !== 'DELETE' && (
            <div>
              <Label>Request Body (JSON)</Label>
              <Textarea
                value={testBody}
                onChange={(e) => setTestBody(e.target.value)}
                placeholder='{"key": "value"}'
                rows={6}
                className="font-mono text-sm"
              />
            </div>
          )}

          {/* Headers */}
          <div>
            <Label>Headers (JSON, optional)</Label>
            <Textarea
              value={testHeaders}
              onChange={(e) => setTestHeaders(e.target.value)}
              placeholder='{"Content-Type": "application/json"}'
              rows={4}
              className="font-mono text-sm"
            />
          </div>

          {/* Run Test Button */}
          <Button onClick={runTest} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Test
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Test Results
              {testResult.success ? (
                <Badge variant="default" className="ml-2">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Success
                </Badge>
              ) : (
                <Badge variant="destructive" className="ml-2">
                  <XCircle className="h-3 w-3 mr-1" />
                  Failed
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Metrics */}
            <div className="flex gap-4 text-sm">
              {testResult.statusCode && (
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <Badge variant={getStatusIntent(testResult.statusCode)}>
                    {testResult.statusCode}
                  </Badge>
                </div>
              )}
              {testResult.responseTime !== undefined && (
                <div>
                  <span className="text-muted-foreground">Response Time: </span>
                  <span className="font-medium">{testResult.responseTime}ms</span>
                </div>
              )}
              {testResult.size !== undefined && (
                <div>
                  <span className="text-muted-foreground">Size: </span>
                  <span className="font-medium">{formatBytes(testResult.size)}</span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {!testResult.success && testResult.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{testResult.error}</AlertDescription>
              </Alert>
            )}

            {/* Results Tabs */}
            {testResult.success && testResult.data && (
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="response">Response</TabsTrigger>
                  <TabsTrigger value="raw">Raw</TabsTrigger>
                  <TabsTrigger value="headers">Headers</TabsTrigger>
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                </TabsList>

                <TabsContent value="response" className="mt-4">
                  <div className="bg-muted p-4 rounded-md overflow-auto max-h-96">
                    {(() => {
                      // Try to parse and display as collapsible tree
                      let dataToDisplay = testResult.data;

                      // If it's a string, try to parse it as XML
                      if (typeof testResult.data === 'string') {
                        const trimmedData = testResult.data.trim();
                        if (trimmedData.startsWith('<?xml') || trimmedData.startsWith('<')) {
                          try {
                            const parser = new XMLParser({
                              ignoreAttributes: false,
                              attributeNamePrefix: '@_',
                              textNodeName: '#text'
                            });
                            dataToDisplay = parser.parse(testResult.data);
                          } catch (e) {
                            // If parsing fails, show as plain text
                            return (
                              <pre className="text-sm whitespace-pre-wrap break-words">
                                {testResult.data}
                              </pre>
                            );
                          }
                        } else {
                          // Plain text response
                          return (
                            <pre className="text-sm whitespace-pre-wrap break-words">
                              {testResult.data}
                            </pre>
                          );
                        }
                      }

                      // Show collapsible tree view for objects (JSON or parsed XML)
                      return (
                        <JSONTree
                          data={dataToDisplay}
                          theme={{
                            scheme: 'bright',
                            base00: '#000000',
                            base01: '#2a2a2a',
                            base02: '#3a3a3a',
                            base03: '#5a5a5a',
                            base04: '#898989',
                            base05: '#d0d0d0',
                            base06: '#e0e0e0',
                            base07: '#ffffff',
                            base08: '#fb0120',
                            base09: '#fc6d24',
                            base0A: '#fda331',
                            base0B: '#a1c659',
                            base0C: '#76c7b7',
                            base0D: '#6fb3d2',
                            base0E: '#d381c3',
                            base0F: '#be643c'
                          }}
                          invertTheme={false}
                          hideRoot={true}
                          shouldExpandNodeInitially={(keyPath, data, level) => level < 2}
                        />
                      );
                    })()}
                  </div>
                </TabsContent>

                <TabsContent value="raw" className="mt-4">
                  <div className="bg-muted p-4 rounded-md overflow-auto max-h-96">
                    <pre className="text-sm whitespace-pre-wrap break-words font-mono">
                      {typeof testResult.data === 'string'
                        ? testResult.data
                        : JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="headers" className="mt-4">
                  <div className="bg-muted p-4 rounded-md overflow-auto max-h-96">
                    {testResult.headers && Object.keys(testResult.headers).length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Header</th>
                            <th className="text-left p-2">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(testResult.headers).map(([key, value]) => (
                            <tr key={key} className="border-b">
                              <td className="p-2 font-medium">{key}</td>
                              <td className="p-2 font-mono">{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-muted-foreground">No headers available</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="curl" className="mt-4">
                  <div className="bg-muted p-4 rounded-md overflow-auto">
                    <div className="flex items-start justify-between gap-2">
                      <pre className="text-sm flex-1">{generateCurlCommand()}</pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(generateCurlCommand())}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Test your API endpoint before deploying. This will execute the endpoint with your configured data sources and transformations.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default TestStep;

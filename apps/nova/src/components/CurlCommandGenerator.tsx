import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Code, Copy, Download, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useToast } from './ui/use-toast';

const novaBaseUrl = import.meta.env.VITE_NOVA_URL || '';

interface CurlCommandGeneratorProps {
  endpoint: {
    slug: string;
    authentication?: any;
  };
  baseUrl?: string;
}

export const CurlCommandGenerator: React.FC<CurlCommandGeneratorProps> = ({
  endpoint,
  baseUrl = novaBaseUrl
}) => {
  const [activeTab, setActiveTab] = useState<string>('curl');
  const { toast } = useToast();

  const generateCurlCommand = (): string => {
    const url = `${baseUrl}/api/${endpoint.slug}`;
    const auth = endpoint.authentication;

    if (!auth?.required) {
      return `curl "${url}"`;
    }

    let command = `curl`;

    switch (auth.type) {
      case 'api-key':
        const headerName = auth.config?.header_name || 'X-API-Key';
        command += ` -H "${headerName}: YOUR_API_KEY"`;
        break;

      case 'bearer':
        command += ` -H "Authorization: Bearer YOUR_TOKEN"`;
        break;

      case 'basic':
        command += ` -u "username:password"`;
        break;

      case 'custom':
        command += ` -H "Authorization: YOUR_CUSTOM_TOKEN"`;
        break;
    }

    command += ` \\\n  "${url}"`;

    return command;
  };

  const generateJavaScriptCode = (): string => {
    const url = `${baseUrl}/api/${endpoint.slug}`;
    const auth = endpoint.authentication;

    let headers = '';

    if (auth?.required) {
      switch (auth.type) {
        case 'api-key':
          const headerName = auth.config?.header_name || 'X-API-Key';
          headers = `    '${headerName}': 'YOUR_API_KEY'`;
          break;

        case 'bearer':
          headers = `    'Authorization': 'Bearer YOUR_TOKEN'`;
          break;

        case 'basic':
          const credentials = btoa('username:password');
          headers = `    'Authorization': 'Basic ${credentials}'`;
          break;
      }
    }

    return `fetch('${url}'${headers ? `, {
  headers: {
${headers}
  }
}` : ''})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;
  };

  const generatePythonCode = (): string => {
    const url = `${baseUrl}/api/${endpoint.slug}`;
    const auth = endpoint.authentication;

    let headers = '';

    if (auth?.required) {
      switch (auth.type) {
        case 'api-key':
          const headerName = auth.config?.header_name || 'X-API-Key';
          headers = `headers = {'${headerName}': 'YOUR_API_KEY'}\n`;
          break;

        case 'bearer':
          headers = `headers = {'Authorization': 'Bearer YOUR_TOKEN'}\n`;
          break;

        case 'basic':
          return `import requests
from requests.auth import HTTPBasicAuth

response = requests.get(
    '${url}',
    auth=HTTPBasicAuth('username', 'password')
)
print(response.json())`;
      }
    }

    return `import requests

${headers}response = requests.get('${url}'${headers ? ', headers=headers' : ''})
print(response.json())`;
  };

  const generatePostmanCollection = () => {
    const collection = {
      info: {
        name: `${endpoint.slug} API`,
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: [
        {
          name: `Test ${endpoint.slug}`,
          request: {
            method: "GET",
            header: [] as any[],
            url: {
              raw: `${baseUrl}/api/${endpoint.slug}`,
              protocol: baseUrl.split('://')[0],
              host: [baseUrl.split('://')[1].split('/')[0]],
              path: ["api", endpoint.slug]
            }
          }
        }
      ]
    };

    const auth = endpoint.authentication;
    if (auth?.required) {
      switch (auth.type) {
        case 'api-key':
          collection.item[0].request.header.push({
            key: auth.config?.header_name || 'X-API-Key',
            value: 'YOUR_API_KEY',
            type: 'text'
          });
          break;

        case 'bearer':
          collection.item[0].request.header.push({
            key: 'Authorization',
            value: 'Bearer YOUR_TOKEN',
            type: 'text'
          });
          break;

        case 'basic':
          (collection.item[0].request as any).auth = {
            type: 'basic',
            basic: [
              { key: 'username', value: 'username', type: 'string' },
              { key: 'password', value: 'password', type: 'string' }
            ]
          };
          break;
      }
    }

    return JSON.stringify(collection, null, 2);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copied to clipboard!',
        description: 'The code has been copied to your clipboard'
      });
    });
  };

  const downloadPostmanCollection = () => {
    const collection = generatePostmanCollection();
    const blob = new Blob([collection], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${endpoint.slug}-api.postman_collection.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Postman collection downloaded!',
      description: 'You can now import this into Postman'
    });
  };

  const getExampleResponse = () => {
    return JSON.stringify({
      status: 'success',
      data: {
        message: 'Authentication successful',
        endpoint: endpoint.slug,
        timestamp: new Date().toISOString()
      }
    }, null, 2);
  };

  const getAuthInstructions = (auth: any): string => {
    switch (auth.type) {
      case 'api-key':
        const headerName = auth.config?.header_name || 'X-API-Key';
        return `Include your API key in the '${headerName}' header. Replace 'YOUR_API_KEY' with an actual key from the configuration above.`;

      case 'bearer':
        return 'Include your bearer token in the Authorization header. Replace YOUR_TOKEN with an actual token.';

      case 'basic':
        return 'Use Basic Authentication with a username and password from the configuration above.';

      case 'custom':
        return 'Use your custom authentication method as configured.';

      default:
        return 'Configure authentication as required.';
    }
  };

  return (
    <Card className="mt-5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Code className="h-4 w-4" />
          Test Your Agent
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="curl">cURL</TabsTrigger>
            <TabsTrigger value="javascript">JavaScript</TabsTrigger>
            <TabsTrigger value="python">Python</TabsTrigger>
            <TabsTrigger value="postman">Postman</TabsTrigger>
          </TabsList>

          <TabsContent value="curl" className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Command line tool for API testing</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(generateCurlCommand())}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <pre style={{
              display: 'block',
              padding: '15px',
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              borderRadius: '4px',
              fontSize: '13px',
              lineHeight: '1.5',
              overflow: 'auto'
            }}>
              {generateCurlCommand()}
            </pre>
          </TabsContent>

          <TabsContent value="javascript" className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Fetch API example</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(generateJavaScriptCode())}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <pre style={{
              display: 'block',
              padding: '15px',
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              borderRadius: '4px',
              fontSize: '13px',
              lineHeight: '1.5',
              overflow: 'auto'
            }}>
              {generateJavaScriptCode()}
            </pre>
          </TabsContent>

          <TabsContent value="python" className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Using requests library</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(generatePythonCode())}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <pre style={{
              display: 'block',
              padding: '15px',
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              borderRadius: '4px',
              fontSize: '13px',
              lineHeight: '1.5',
              overflow: 'auto'
            }}>
              {generatePythonCode()}
            </pre>
          </TabsContent>

          <TabsContent value="postman" className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Import this collection into Postman</span>
              <Button
                size="sm"
                onClick={downloadPostmanCollection}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Collection
              </Button>
            </div>
            <pre style={{
              display: 'block',
              padding: '15px',
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              borderRadius: '4px',
              fontSize: '13px',
              lineHeight: '1.5',
              overflow: 'auto',
              maxHeight: '300px'
            }}>
              {generatePostmanCollection()}
            </pre>
          </TabsContent>
        </Tabs>

        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f8fa', borderRadius: '4px' }}>
          <h5 className="font-medium mb-2">Example Response</h5>
          <pre className="p-3 bg-white border rounded text-xs overflow-auto">
            {getExampleResponse()}
          </pre>
        </div>

        {endpoint.authentication?.required && (
          <Alert className="mt-4 bg-yellow-50 border-yellow-200">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-900">Authentication Required</AlertTitle>
            <AlertDescription className="text-yellow-900">
              {getAuthInstructions(endpoint.authentication)}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default CurlCommandGenerator;

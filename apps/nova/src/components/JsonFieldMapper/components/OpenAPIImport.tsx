import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import {
  FileUp,
  Clipboard,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Upload,
  X
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { useToast } from '../../ui/use-toast';

interface OpenAPIImportProps {
  onImport: (schema: any, mappingConfig: any) => void;
  onCancel: () => void;
}

export const OpenAPIImport: React.FC<OpenAPIImportProps> = ({ onImport, onCancel }) => {
  const [importedSpec, setImportedSpec] = useState<any>(null);
  const [schemaPreview, setSchemaPreview] = useState<any>(null);
  const [importMethod, setImportMethod] = useState<'file' | 'paste'>('file');
  const [pastedContent, setPastedContent] = useState('');
  const [parseError, setParseError] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const parseOpenAPISpec = (content: string) => {
    try {
      const spec = JSON.parse(content);

      // Detect format
      if (spec.openapi && spec.openapi.startsWith('3.')) {
        return parseOpenAPI3(spec);
      } else if (spec.swagger === '2.0') {
        return parseSwagger2(spec);
      } else if (spec.$schema || spec.type) {
        return parseJSONSchema(spec);
      } else {
        throw new Error('Unsupported specification format');
      }
    } catch (error) {
      // Try YAML parsing if JSON fails
      try {
        // You'd need to add a YAML parser library like js-yaml
        // const yaml = require('js-yaml');
        // const spec = yaml.load(content);
        // return parseOpenAPISpec(JSON.stringify(spec));
        throw new Error('YAML parsing not implemented - please provide JSON format');
      } catch (yamlError) {
        throw new Error(`Failed to parse specification: ${(error as any).message}`);
      }
    }
  };

  const parseOpenAPI3 = (spec: any) => {
    const schemas = spec.components?.schemas || {};
    const paths = spec.paths || {};

    // Extract response schemas from paths
    const responseSchemas: any[] = [];

    Object.entries(paths).forEach(([path, methods]: [string, any]) => {
      Object.entries(methods).forEach(([method, operation]: [string, any]) => {
        if (operation.responses) {
          Object.entries(operation.responses).forEach(([status, response]: [string, any]) => {
            if (response.content?.['application/json']?.schema) {
              responseSchemas.push({
                path,
                method: method.toUpperCase(),
                status,
                schema: response.content['application/json'].schema,
                description: response.description
              });
            }
          });
        }
      });
    });

    return {
      type: 'openapi3',
      info: spec.info,
      schemas,
      responseSchemas,
      servers: spec.servers || []
    };
  };

  const parseSwagger2 = (spec: any) => {
    const definitions = spec.definitions || {};
    const paths = spec.paths || {};

    // Extract response schemas
    const responseSchemas: any[] = [];

    Object.entries(paths).forEach(([path, methods]: [string, any]) => {
      Object.entries(methods).forEach(([method, operation]: [string, any]) => {
        if (operation.responses) {
          Object.entries(operation.responses).forEach(([status, response]: [string, any]) => {
            if (response.schema) {
              responseSchemas.push({
                path,
                method: method.toUpperCase(),
                status,
                schema: response.schema,
                description: response.description
              });
            }
          });
        }
      });
    });

    return {
      type: 'swagger2',
      info: spec.info,
      schemas: definitions,
      responseSchemas,
      basePath: spec.basePath || '',
      host: spec.host || ''
    };
  };

  const parseJSONSchema = (schema: any) => {
    return {
      type: 'jsonschema',
      schema,
      info: {
        title: schema.title || 'Imported Schema',
        version: schema.version || '1.0.0'
      }
    };
  };

  const convertToInternalSchema = (spec: any) => {
    let rootSchema: any = {
      key: 'root',
      type: 'object',
      children: []
    };

    if (spec.type === 'jsonschema') {
      rootSchema = convertJSONSchemaToInternal(spec.schema);
    } else if (spec.responseSchemas && spec.responseSchemas.length > 0) {
      // Use the first 200 response schema as default
      const defaultResponse = spec.responseSchemas.find((r: any) => r.status === '200') || spec.responseSchemas[0];
      rootSchema = resolveSchemaRef(defaultResponse.schema, spec.schemas);
    }

    return rootSchema;
  };

  const convertJSONSchemaToInternal = (schema: any, key: string = 'root'): any => {
    const internalSchema: any = {
      key,
      type: schema.type || 'object',
      description: schema.description
    };

    if (schema.type === 'object' && schema.properties) {
      internalSchema.children = Object.entries(schema.properties).map(([propKey, propSchema]: [string, any]) => {
        return convertJSONSchemaToInternal(propSchema, propKey);
      });
    } else if (schema.type === 'array' && schema.items) {
      internalSchema.children = [convertJSONSchemaToInternal(schema.items, 'item')];
    }

    if (schema.required && Array.isArray(schema.required)) {
      schema.required.forEach((reqField: string) => {
        const child = internalSchema.children?.find((c: any) => c.key === reqField);
        if (child) child.required = true;
      });
    }

    return internalSchema;
  };

  const resolveSchemaRef = (schema: any, definitions: any): any => {
    if (schema.$ref) {
      const refPath = schema.$ref.replace('#/components/schemas/', '').replace('#/definitions/', '');
      const resolved = definitions[refPath];
      if (resolved) {
        return convertJSONSchemaToInternal(resolved);
      }
    }
    return convertJSONSchemaToInternal(schema);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleImportContent(content);
    };
    reader.readAsText(file);
  };

  const handlePasteImport = () => {
    if (!pastedContent.trim()) {
      setParseError('Please paste a valid OpenAPI/Swagger specification');
      return;
    }
    handleImportContent(pastedContent);
  };

  const handleImportContent = (content: string) => {
    try {
      setParseError('');
      const parsed = parseOpenAPISpec(content);
      setImportedSpec(parsed);

      const internalSchema = convertToInternalSchema(parsed);
      setSchemaPreview(internalSchema);
      setShowPreview(true);

      toast({
        title: 'Success',
        description: `Successfully imported ${parsed.info?.title || 'schema'}`,
      });
    } catch (error) {
      setParseError((error as any).message);
      toast({
        title: 'Import Failed',
        description: (error as any).message,
        variant: 'destructive',
      });
    }
  };

  const handleConfirmImport = () => {
    if (schemaPreview) {
      // Generate mapping configuration
      const mappingConfig = {
        mode: 'openapi',
        sourceSpec: importedSpec,
        autoMapFields: true
      };

      onImport(schemaPreview, mappingConfig);
    }
  };

  const renderSchemaTree = (node: any, level: number = 0): React.ReactNode => {
    return (
      <div key={node.key} style={{ marginLeft: level * 20, marginTop: 8 }}>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{node.key}</span>
          <Badge variant="outline">{node.type}</Badge>
          {node.required && <Badge variant="destructive">required</Badge>}
        </div>
        {node.children && node.children.map((child: any) => renderSchemaTree(child, level + 1))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import OpenAPI/Swagger Specification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-3 block">Import Method</Label>
          <div className="flex gap-2 mb-4">
            <Button
              variant={importMethod === 'file' ? 'default' : 'outline'}
              onClick={() => setImportMethod('file')}
              className="flex-1"
            >
              <FileUp className="h-4 w-4 mr-2" />
              Upload File
            </Button>
            <Button
              variant={importMethod === 'paste' ? 'default' : 'outline'}
              onClick={() => setImportMethod('paste')}
              className="flex-1"
            >
              <Clipboard className="h-4 w-4 mr-2" />
              Paste JSON/YAML
            </Button>
          </div>
        </div>

        {importMethod === 'file' ? (
          <div>
            <Label htmlFor="file-upload" className="cursor-pointer">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  {importedSpec ? `Imported: ${importedSpec.info?.title}` : 'Click to choose file or drag and drop'}
                </p>
                <p className="text-xs text-gray-400 mt-1">JSON, YAML, or YML files</p>
              </div>
              <Input
                id="file-upload"
                type="file"
                accept=".json,.yaml,.yml"
                onChange={handleFileImport}
                className="hidden"
              />
            </Label>
          </div>
        ) : (
          <div className="space-y-3">
            <Label htmlFor="paste-content">
              Paste Specification
              <span className="text-xs text-gray-500 ml-2">Paste your OpenAPI 3.0, Swagger 2.0, or JSON Schema</span>
            </Label>
            <Textarea
              id="paste-content"
              rows={10}
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              placeholder={`{
  "openapi": "3.0.0",
  "info": { "title": "My API", "version": "1.0.0" },
  "paths": { ... },
  "components": { "schemas": { ... } }
}`}
              className={parseError ? 'border-red-500' : ''}
            />
            <Button
              onClick={handlePasteImport}
              disabled={!pastedContent.trim()}
            >
              Parse Specification
            </Button>
          </div>
        )}

        {parseError && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        )}

        {importedSpec && (
          <div className="space-y-4 mt-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>{importedSpec.info?.title || 'Schema'}</AlertTitle>
              <AlertDescription>
                {importedSpec.info?.description}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Badge>Version: {importedSpec.info?.version || '1.0.0'}</Badge>
                  <Badge variant="default">Type: {importedSpec.type.toUpperCase()}</Badge>
                  {importedSpec.responseSchemas && (
                    <Badge variant="secondary">
                      {importedSpec.responseSchemas.length} endpoints found
                    </Badge>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            <Collapsible open={showPreview} onOpenChange={setShowPreview}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  {showPreview ? 'Hide' : 'Show'} Schema Preview
                  {showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2 max-h-96 overflow-y-auto">
                  <CardContent className="pt-4">
                    {schemaPreview && renderSchemaTree(schemaPreview)}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex gap-3">
              <Button onClick={handleConfirmImport}>
                <Upload className="h-4 w-4 mr-2" />
                Use This Schema
              </Button>
              <Button variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

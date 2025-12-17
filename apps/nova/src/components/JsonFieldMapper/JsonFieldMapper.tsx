import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Save } from 'lucide-react';

// Types
import {
  JsonMappingConfig,
  JsonFieldMapping
} from '../../types/jsonMapping.types';
import { JsonFieldMapperProps } from './types';

// Sub-components
import { SourceSelector } from './components/SourceSelector';
import { OutputTemplateBuilder } from './components/OutputTemplateBuilder';
import { FieldMappingCanvas } from './components/FieldMappingCanvas';
import { MappingPreview } from './components/MappingPreview';

// Hooks
import { useMappingEngine } from './hooks/useMappingEngine';

// Styles
import './JsonFieldMapper.css';

export const JsonFieldMapper: React.FC<JsonFieldMapperProps> = ({
  dataSources,
  sampleData = {},
  initialConfig,
  onChange,
  onTest,
  onTestDataSource
}) => {
  const [activeTab, setActiveTab] = useState<string>('source');
  const [config, setConfig] = useState<JsonMappingConfig>(() => {
    const defaultConfig = {
      sourceSelection: {
        type: 'object' as const,
        primaryPath: '',
        sources: []
      },
      outputTemplate: {
        structure: {},
        fields: []
      },
      fieldMappings: [],
      transformations: [],
      outputWrapper: {
        enabled: false,
        wrapperKey: 'data',
        includeMetadata: false,
        metadataFields: {
          timestamp: true,
          source: true,
          count: true,
          version: false
        },
        customMetadata: {}
      }
    };

    if (!initialConfig) {
      return defaultConfig;
    }

    // Merge initialConfig with defaults to ensure all required fields exist
    return {
      ...defaultConfig,
      ...initialConfig,
      sourceSelection: {
        ...defaultConfig.sourceSelection,
        ...initialConfig.sourceSelection
      },
      outputTemplate: {
        ...defaultConfig.outputTemplate,
        ...initialConfig.outputTemplate,
        fields: initialConfig.outputTemplate?.fields || []
      },
      outputWrapper: {
        ...defaultConfig.outputWrapper,
        ...initialConfig.outputWrapper,
        metadataFields: {
          ...defaultConfig.outputWrapper.metadataFields,
          ...initialConfig.outputWrapper?.metadataFields
        }
      }
    };
  });

  // Mapping engine (unused but required for initialization)
  useMappingEngine(config, sampleData);

  // Debug log to verify config is loaded properly in edit mode
  useEffect(() => {
    if (initialConfig) {
      console.log('🔧 JsonFieldMapper loaded with config:', {
        hasSourceSelection: !!initialConfig.sourceSelection,
        sourceCount: initialConfig.sourceSelection?.sources?.length || 0,
        hasOutputTemplate: !!initialConfig.outputTemplate,
        fieldCount: initialConfig.outputTemplate?.fields?.length || 0,
        fields: initialConfig.outputTemplate?.fields
      });
    }
  }, []);

  const updateSourceSelection = (selection: any) => {
    const newConfig = {
      ...config,
      sourceSelection: selection
    };
    setConfig(newConfig);
  };

  const updateOutputTemplate = (template: any) => {
    const newConfig = {
      ...config,
      outputTemplate: template
    };
    setConfig(newConfig);
  };

  const updateFieldMappings = (mappings: JsonFieldMapping[]) => {
    const newConfig = {
      ...config,
      fieldMappings: mappings
    };
    setConfig(newConfig);
  };

  const updateOutputWrapper = (wrapper: any) => {
    const newConfig = {
      ...config,
      outputWrapper: wrapper
    };
    setConfig(newConfig);
  };

  const handleNextStep = () => {
    const tabs = ['source', 'template', 'mapping', 'preview'];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);

      // Notify parent only when moving between major steps
      if (currentIndex === 2) { // Moving from mapping to preview
        onChange(config); // Save the configuration when user completes mapping
      }
    }
  };

  const handlePreviousStep = () => {
    const tabs = ['source', 'template', 'mapping', 'preview'];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
  };

  const getSourceSelection = () => {
    const selection = config?.sourceSelection || {};

    if (config?.sourceSelection) {
      return config.sourceSelection;
    }

    return {
      type: 'object' as const,
      sources: [],
      primaryPath: ''
    };
  };

  return (
    <div className="json-field-mapper space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>JSON Field Mapping Configuration</CardTitle>
          <CardDescription className="pb-4">
            Configure how your data sources map to the JSON output structure
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Output Wrapper Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Output Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Switch
                id="wrap-output"
                checked={config.outputWrapper?.enabled || false}
                onCheckedChange={(checked) => updateOutputWrapper({
                  ...config.outputWrapper,
                  enabled: checked
                })}
              />
              <Label htmlFor="wrap-output" className="font-normal">
                Wrap output in container object
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Switch
                id="unwrap-single"
                checked={config.sourceSelection?.unwrapSingleItems || false}
                onCheckedChange={(checked) => updateSourceSelection({
                  ...config.sourceSelection,
                  unwrapSingleItems: checked
                })}
              />
              <Label htmlFor="unwrap-single" className="font-normal">
                Return single object instead of array (when array has only 1 item)
              </Label>
            </div>
            <p className="text-xs text-gray-500 pl-11">
              Automatically unwraps single-item arrays to return just the object.<br />
              Example: <code>[{'{...}'}]</code> → <code>{'{...}'}</code>
            </p>
          </div>

          {config.outputWrapper?.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="wrapper-key">Wrapper Key</Label>
                <Input
                  id="wrapper-key"
                  value={config.outputWrapper.wrapperKey || 'data'}
                  onChange={(e) => updateOutputWrapper({
                    ...config.outputWrapper,
                    wrapperKey: e.target.value || 'data'
                  })}
                  placeholder="e.g., data, results, items"
                />
                <p className="text-xs text-gray-500">The key that will contain your mapped data</p>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="include-metadata"
                  checked={config.outputWrapper.includeMetadata || false}
                  onCheckedChange={(checked) => updateOutputWrapper({
                    ...config.outputWrapper,
                    includeMetadata: checked
                  })}
                />
                <Label htmlFor="include-metadata" className="font-normal">
                  Include metadata in wrapper
                </Label>
              </div>

              {config.outputWrapper.includeMetadata && (
                <Card className="bg-gray-50">
                  <CardHeader>
                    <CardTitle className="text-sm">Metadata Fields</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="meta-timestamp"
                        checked={config.outputWrapper?.metadataFields?.timestamp !== false}
                        onCheckedChange={(checked) => updateOutputWrapper({
                          ...config.outputWrapper,
                          metadataFields: {
                            ...config.outputWrapper?.metadataFields,
                            timestamp: checked
                          }
                        })}
                      />
                      <Label htmlFor="meta-timestamp" className="font-normal">Include timestamp</Label>
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        id="meta-source"
                        checked={config.outputWrapper?.metadataFields?.source !== false}
                        onCheckedChange={(checked) => updateOutputWrapper({
                          ...config.outputWrapper,
                          metadataFields: {
                            ...config.outputWrapper?.metadataFields,
                            source: checked
                          }
                        })}
                      />
                      <Label htmlFor="meta-source" className="font-normal">Include source info</Label>
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        id="meta-count"
                        checked={config.outputWrapper?.metadataFields?.count !== false}
                        onCheckedChange={(checked) => updateOutputWrapper({
                          ...config.outputWrapper,
                          metadataFields: {
                            ...config.outputWrapper?.metadataFields,
                            count: checked
                          }
                        })}
                      />
                      <Label htmlFor="meta-count" className="font-normal">Include item count</Label>
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        id="meta-version"
                        checked={config.outputWrapper?.metadataFields?.version || false}
                        onCheckedChange={(checked) => updateOutputWrapper({
                          ...config.outputWrapper,
                          metadataFields: {
                            ...config.outputWrapper?.metadataFields,
                            version: checked
                          }
                        })}
                      />
                      <Label htmlFor="meta-version" className="font-normal">Include API version</Label>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Preview of wrapper structure */}
              <Card className="bg-gray-900 text-gray-100">
                <CardHeader>
                  <CardTitle className="text-sm text-blue-400">Output Structure Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs overflow-auto">
{`{
${config.outputWrapper.includeMetadata ? `  "metadata": {
${config.outputWrapper.metadataFields?.timestamp !== false ? '    "timestamp": "2024-01-01T00:00:00Z",\n' : ''}${config.outputWrapper.metadataFields?.source !== false ? '    "source": { "id": "...", "name": "..." },\n' : ''}${config.outputWrapper.metadataFields?.count !== false ? '    "count": 10,\n' : ''}${config.outputWrapper.metadataFields?.version ? '    "version": "1.0.0",\n' : ''}  },
` : ''}  "${config.outputWrapper.wrapperKey || 'data'}": ${config.sourceSelection.type === 'array' ? '[' : '{'}
    // Your mapped fields here
  ${config.sourceSelection.type === 'array' ? ']' : '}'}
}`}
                  </pre>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="source">1. Select Source</TabsTrigger>
          <TabsTrigger value="template" disabled={!config.sourceSelection.primaryPath}>
            2. Define Output
          </TabsTrigger>
          <TabsTrigger value="mapping" disabled={!config.outputTemplate.fields.length}>
            3. Map Fields
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={!config.fieldMappings.length}>
            4. Preview & Test
          </TabsTrigger>
        </TabsList>

        <TabsContent value="source" className="mt-4">
          <SourceSelector
            dataSources={dataSources}
            sampleData={sampleData}
            selection={getSourceSelection()}
            onChange={updateSourceSelection}
            onNext={handleNextStep}
            onTestDataSource={onTestDataSource}
          />
        </TabsContent>

        <TabsContent value="template" className="mt-4">
          <OutputTemplateBuilder
            template={config.outputTemplate}
            sourceSelection={config.sourceSelection}
            sampleData={sampleData}
            onChange={updateOutputTemplate}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
          />
        </TabsContent>

        <TabsContent value="mapping" className="mt-4">
          <FieldMappingCanvas
            sourceSelection={config.sourceSelection}
            outputTemplate={config.outputTemplate}
            mappings={config.fieldMappings}
            transformations={config.transformations}
            sampleData={sampleData}
            onChange={updateFieldMappings}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <MappingPreview
            config={config}
            sampleData={sampleData}
            onTest={onTest}
            onPrevious={handlePreviousStep}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end mt-4">
        <Button onClick={() => onChange(config)}>
          <Save className="w-4 h-4 mr-2" />
          Save Configuration
        </Button>
      </div>
    </div>
  );
};

export default JsonFieldMapper;

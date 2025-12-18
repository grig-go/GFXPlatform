import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Save } from 'lucide-react';

// Types
import {
  XmlMappingConfig,
  XmlFieldMapping,
  XmlOutputTemplate,
  XmlSourceSelection
} from '../../types/xmlMapping.types';
import { XmlFieldMapperProps } from './types';

// Sub-components
import { SourceSelector } from '../JsonFieldMapper/components/SourceSelector'; // Reuse JSON source selector
import { XmlOutputTemplateBuilder } from './components/XmlOutputTemplateBuilder';
import { XmlFieldMappingCanvas } from './components/XmlFieldMappingCanvas';
import { XmlMappingPreview } from './components/XmlMappingPreview';

export const XmlFieldMapper: React.FC<XmlFieldMapperProps> = ({
  dataSources,
  sampleData = {},
  initialConfig,
  onChange,
  onTest,
  onTestDataSource
}) => {
  const [activeTab, setActiveTab] = useState<string>('source');
  const [config, setConfig] = useState<XmlMappingConfig>(() => {
    const defaultConfig: XmlMappingConfig = {
      sourceSelection: {
        type: 'object' as const,
        primaryPath: '',
        sources: []
      },
      outputTemplate: {
        structure: {},
        fields: [],
        rootElement: 'root',
        itemElement: 'item'
      },
      fieldMappings: [],
      transformations: [],
      outputWrapper: {
        enabled: true,
        rootElement: 'root',
        includeDeclaration: true,
        encoding: 'UTF-8',
        version: '1.0',
        includeMetadata: false,
        metadataFields: {
          timestamp: true,
          source: true,
          count: true,
          version: false
        }
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
          ...defaultConfig.outputWrapper?.metadataFields,
          ...initialConfig.outputWrapper?.metadataFields
        }
      }
    };
  });

  // Debug log to verify config is loaded properly in edit mode
  useEffect(() => {
    if (initialConfig) {
      console.log('🔧 XmlFieldMapper loaded with config:', {
        hasSourceSelection: !!initialConfig.sourceSelection,
        sourceCount: initialConfig.sourceSelection?.sources?.length || 0,
        hasOutputTemplate: !!initialConfig.outputTemplate,
        fieldCount: initialConfig.outputTemplate?.fields?.length || 0,
        fields: initialConfig.outputTemplate?.fields
      });
    }
  }, []);

  // Track whether this is the initial mount to avoid calling onChange with initial value
  const isFirstRender = useRef(true);

  // Sync config changes back to parent immediately
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onChange(config);
  }, [config]);

  const updateSourceSelection = (selection: any) => {
    const newConfig = {
      ...config,
      sourceSelection: selection
    };
    setConfig(newConfig);
  };

  const updateOutputTemplate = (template: XmlOutputTemplate) => {
    const newConfig = {
      ...config,
      outputTemplate: template
    };
    setConfig(newConfig);
  };

  const updateFieldMappings = (mappings: XmlFieldMapping[]) => {
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

      // Notify parent when moving between major steps
      if (currentIndex === 2) { // Moving from mapping to preview
        onChange(config);
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
    <div className="xml-field-mapper space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>XML Field Mapping Configuration</CardTitle>
          <CardDescription className="pb-4">
            Configure how your data sources map to the XML output structure.
            Define elements and attributes for your XML schema.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Output Wrapper Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">XML Document Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="xml-version">XML Version</Label>
              <Input
                id="xml-version"
                value={config.outputWrapper?.version || '1.0'}
                onChange={(e) => updateOutputWrapper({
                  ...config.outputWrapper,
                  version: e.target.value
                })}
                placeholder="1.0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="xml-encoding">Encoding</Label>
              <Input
                id="xml-encoding"
                value={config.outputWrapper?.encoding || 'UTF-8'}
                onChange={(e) => updateOutputWrapper({
                  ...config.outputWrapper,
                  encoding: e.target.value
                })}
                placeholder="UTF-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Switch
                id="include-declaration"
                checked={config.outputWrapper?.includeDeclaration !== false}
                onCheckedChange={(checked) => updateOutputWrapper({
                  ...config.outputWrapper,
                  includeDeclaration: checked
                })}
              />
              <Label htmlFor="include-declaration" className="font-normal">
                Include XML declaration (&lt;?xml ...?&gt;)
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="namespace">XML Namespace (optional)</Label>
              <Input
                id="namespace"
                value={config.outputWrapper?.namespace || ''}
                onChange={(e) => updateOutputWrapper({
                  ...config.outputWrapper,
                  namespace: e.target.value
                })}
                placeholder="http://example.com/ns"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="namespace-prefix">Namespace Prefix (optional)</Label>
              <Input
                id="namespace-prefix"
                value={config.outputWrapper?.namespacePrefix || ''}
                onChange={(e) => updateOutputWrapper({
                  ...config.outputWrapper,
                  namespacePrefix: e.target.value
                })}
                placeholder="ns"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Switch
                id="include-xml-metadata"
                checked={config.outputWrapper?.includeMetadata || false}
                onCheckedChange={(checked) => updateOutputWrapper({
                  ...config.outputWrapper,
                  includeMetadata: checked
                })}
              />
              <Label htmlFor="include-xml-metadata" className="font-normal">
                Include metadata element
              </Label>
            </div>
            <p className="text-xs text-gray-500 pl-11">
              Adds a metadata element with timestamp, source info, and count
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Switch
                id="unwrap-single-xml"
                checked={config.sourceSelection?.unwrapSingleItems || false}
                onCheckedChange={(checked) => updateSourceSelection({
                  ...config.sourceSelection,
                  unwrapSingleItems: checked
                })}
              />
              <Label htmlFor="unwrap-single-xml" className="font-normal">
                Skip item wrapper for single items
              </Label>
            </div>
            <p className="text-xs text-gray-500 pl-11">
              When array has only 1 item, output directly without item wrapper element
            </p>
          </div>

          {/* Preview of XML structure */}
          <Card className="bg-gray-900 text-gray-100">
            <CardHeader>
              <CardTitle className="text-sm text-blue-400">XML Structure Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto">
{`${config.outputWrapper?.includeDeclaration !== false ? `<?xml version="${config.outputWrapper?.version || '1.0'}" encoding="${config.outputWrapper?.encoding || 'UTF-8'}"?>\n` : ''}<${config.outputWrapper?.namespacePrefix ? `${config.outputWrapper.namespacePrefix}:` : ''}${config.outputTemplate?.rootElement || 'root'}${config.outputWrapper?.namespace ? ` xmlns${config.outputWrapper?.namespacePrefix ? `:${config.outputWrapper.namespacePrefix}` : ''}="${config.outputWrapper.namespace}"` : ''}>
${config.outputWrapper?.includeMetadata ? `  <metadata>
    <timestamp>...</timestamp>
    <source>...</source>
    <count>...</count>
  </metadata>
` : ''}  <${config.outputTemplate?.itemElement || 'item'} attr="...">
    <!-- Your mapped elements here -->
  </${config.outputTemplate?.itemElement || 'item'}>
</${config.outputWrapper?.namespacePrefix ? `${config.outputWrapper.namespacePrefix}:` : ''}${config.outputTemplate?.rootElement || 'root'}>`}
              </pre>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="source">1. Select Source</TabsTrigger>
          <TabsTrigger value="template" disabled={!config.sourceSelection.primaryPath && config.sourceSelection.sources.length === 0}>
            2. Define Structure
          </TabsTrigger>
          <TabsTrigger value="mapping" disabled={!config.outputTemplate.fields || config.outputTemplate.fields.length === 0}>
            3. Map Fields
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={!config.fieldMappings || config.fieldMappings.length === 0}>
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
          <XmlOutputTemplateBuilder
            template={config.outputTemplate}
            sourceSelection={config.sourceSelection}
            sampleData={sampleData}
            onChange={updateOutputTemplate}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
          />
        </TabsContent>

        <TabsContent value="mapping" className="mt-4">
          <XmlFieldMappingCanvas
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
          <XmlMappingPreview
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

export default XmlFieldMapper;

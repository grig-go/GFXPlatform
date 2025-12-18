import React, { useState, useMemo } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
  ArrowLeft,
  Copy,
  CheckCircle,
  Info,
  FileCode,
  List,
  PlayCircle,
  Download
} from 'lucide-react';
import { XmlMappingConfig, XmlFieldMapping, XmlOutputField } from '../../../types/xmlMapping.types';

interface XmlMappingPreviewProps {
  config: XmlMappingConfig;
  sampleData: Record<string, any>;
  onTest?: () => void;
  onPrevious: () => void;
}

export const XmlMappingPreview: React.FC<XmlMappingPreviewProps> = ({
  config,
  sampleData,
  onTest,
  onPrevious
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');

  // Helper to get value from nested path
  const getValueFromPath = (obj: any, path: string): any => {
    if (!path || !obj) return null;

    // Handle array notation like items[0].name
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return null;
      current = current[part];
    }

    return current;
  };

  // Helper to escape XML special characters
  const escapeXml = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Generate XML output based on mappings
  const generatedXml = useMemo(() => {
    const indent = '  ';
    const rootElement = config.outputTemplate?.rootElement || 'root';
    const itemElement = config.outputTemplate?.itemElement || 'item';
    const wrapperConfig = config.outputWrapper;

    // Start building XML
    let xml = '';

    // Add XML declaration if enabled
    if (wrapperConfig?.includeDeclaration !== false) {
      xml += `<?xml version="${wrapperConfig?.version || '1.0'}" encoding="${wrapperConfig?.encoding || 'UTF-8'}"?>\n`;
    }

    // Open root element with optional namespace
    if (wrapperConfig?.namespace) {
      const prefix = wrapperConfig.namespacePrefix ? `${wrapperConfig.namespacePrefix}:` : '';
      xml += `<${prefix}${rootElement} xmlns${wrapperConfig.namespacePrefix ? `:${wrapperConfig.namespacePrefix}` : ''}="${wrapperConfig.namespace}">\n`;
    } else {
      xml += `<${rootElement}>\n`;
    }

    // Add metadata if enabled
    if (wrapperConfig?.includeMetadata) {
      xml += `${indent}<metadata>\n`;
      if (wrapperConfig.metadataFields?.timestamp !== false) {
        xml += `${indent}${indent}<timestamp>${new Date().toISOString()}</timestamp>\n`;
      }
      if (wrapperConfig.metadataFields?.source !== false && config.sourceSelection?.sources?.[0]) {
        xml += `${indent}${indent}<source>${escapeXml(config.sourceSelection.sources[0].name)}</source>\n`;
      }
      if (wrapperConfig.metadataFields?.count !== false) {
        xml += `${indent}${indent}<count>1</count>\n`;
      }
      if (wrapperConfig.metadataFields?.version) {
        xml += `${indent}${indent}<version>1.0.0</version>\n`;
      }
      xml += `${indent}</metadata>\n`;
    }

    // Get sample data for preview
    const firstSource = config.sourceSelection?.sources?.[0];
    let itemData: any[] = [];

    if (firstSource?.id && sampleData[firstSource.id]) {
      let data = sampleData[firstSource.id];

      // Navigate to primary path if specified
      if (firstSource.primaryPath) {
        data = getValueFromPath(data, firstSource.primaryPath);
      }

      // Ensure we have an array
      itemData = Array.isArray(data) ? data.slice(0, 3) : [data]; // Limit to 3 items for preview
    }

    // If no data, create a sample structure
    if (itemData.length === 0) {
      itemData = [{}];
    }

    // Group fields by their role
    const elementFields = config.outputTemplate?.fields?.filter((f: XmlOutputField) => f.xmlType === 'element' && !f.path.includes('.')) || [];
    const attributeFields = config.outputTemplate?.fields?.filter((f: XmlOutputField) => f.xmlType === 'attribute' && !f.path.includes('.')) || [];

    // Generate items
    const isArrayOutput = config.sourceSelection?.type === 'array';

    if (isArrayOutput) {
      itemData.forEach((item, itemIndex) => {
        // Build attribute string
        let attrStr = '';
        attributeFields.forEach((field: XmlOutputField) => {
          const mapping = config.fieldMappings?.find((m: XmlFieldMapping) => m.targetPath === field.path);
          let value = '';

          if (mapping) {
            value = getValueFromPath(item, mapping.sourcePath) ?? mapping.fallbackValue ?? '';
          } else {
            value = field.defaultValue ?? '';
          }

          attrStr += ` ${field.elementName}="${escapeXml(value)}"`;
        });

        xml += `${indent}<${itemElement}${attrStr}>\n`;

        // Add element fields
        elementFields.forEach((field: XmlOutputField) => {
          const mapping = config.fieldMappings?.find((m: XmlFieldMapping) => m.targetPath === field.path);
          let value = '';

          if (mapping) {
            value = getValueFromPath(item, mapping.sourcePath) ?? mapping.fallbackValue ?? '';
          } else {
            value = field.defaultValue ?? '';
          }

          if (field.cdata && value) {
            xml += `${indent}${indent}<${field.elementName}><![CDATA[${value}]]></${field.elementName}>\n`;
          } else {
            xml += `${indent}${indent}<${field.elementName}>${escapeXml(value)}</${field.elementName}>\n`;
          }
        });

        xml += `${indent}</${itemElement}>\n`;
      });
    } else {
      // Single object mode
      const item = itemData[0];

      // Add attributes as comment (since they'd be on root)
      if (attributeFields.length > 0) {
        xml += `${indent}<!-- Attributes: `;
        attributeFields.forEach((field: XmlOutputField, idx: number) => {
          const mapping = config.fieldMappings?.find((m: XmlFieldMapping) => m.targetPath === field.path);
          let value = '';

          if (mapping) {
            value = getValueFromPath(item, mapping.sourcePath) ?? mapping.fallbackValue ?? '';
          }

          xml += `${field.elementName}="${escapeXml(value)}"${idx < attributeFields.length - 1 ? ' ' : ''}`;
        });
        xml += ` -->\n`;
      }

      // Add elements
      elementFields.forEach((field: XmlOutputField) => {
        const mapping = config.fieldMappings?.find((m: XmlFieldMapping) => m.targetPath === field.path);
        let value = '';

        if (mapping) {
          value = getValueFromPath(item, mapping.sourcePath) ?? mapping.fallbackValue ?? '';
        } else {
          value = field.defaultValue ?? '';
        }

        if (field.cdata && value) {
          xml += `${indent}<${field.elementName}><![CDATA[${value}]]></${field.elementName}>\n`;
        } else {
          xml += `${indent}<${field.elementName}>${escapeXml(value)}</${field.elementName}>\n`;
        }
      });
    }

    // Close root element
    if (wrapperConfig?.namespace && wrapperConfig.namespacePrefix) {
      xml += `</${wrapperConfig.namespacePrefix}:${rootElement}>`;
    } else {
      xml += `</${rootElement}>`;
    }

    return xml;
  }, [config, sampleData]);

  // Generate mapping summary
  const mappingSummary = useMemo(() => {
    const totalFields = config.outputTemplate?.fields?.length || 0;
    const mappedFields = config.fieldMappings?.length || 0;
    const elements = config.outputTemplate?.fields?.filter((f: XmlOutputField) => f.xmlType === 'element').length || 0;
    const attributes = config.outputTemplate?.fields?.filter((f: XmlOutputField) => f.xmlType === 'attribute').length || 0;
    const required = config.outputTemplate?.fields?.filter((f: XmlOutputField) => f.required).length || 0;
    const requiredMapped = config.outputTemplate?.fields?.filter((f: XmlOutputField) =>
      f.required && config.fieldMappings?.some((m: XmlFieldMapping) => m.targetPath === f.path)
    ).length || 0;

    return {
      totalFields,
      mappedFields,
      elements,
      attributes,
      required,
      requiredMapped,
      completionPercent: totalFields > 0 ? Math.round((mappedFields / totalFields) * 100) : 0
    };
  }, [config]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedXml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'preview.xml';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="xml-mapping-preview space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Mapping Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{mappingSummary.mappedFields}/{mappingSummary.totalFields}</div>
              <div className="text-xs text-gray-500">Fields Mapped</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{mappingSummary.elements}</div>
              <div className="text-xs text-gray-500">XML Elements</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{mappingSummary.attributes}</div>
              <div className="text-xs text-gray-500">XML Attributes</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{mappingSummary.completionPercent}%</div>
              <div className="text-xs text-gray-500">Complete</div>
            </div>
          </div>

          {mappingSummary.required > 0 && (
            <Alert className={`mt-4 ${mappingSummary.requiredMapped === mappingSummary.required ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <Info className={`h-4 w-4 ${mappingSummary.requiredMapped === mappingSummary.required ? 'text-green-600' : 'text-yellow-600'}`} />
              <AlertDescription>
                {mappingSummary.requiredMapped === mappingSummary.required
                  ? `All ${mappingSummary.required} required fields are mapped.`
                  : `${mappingSummary.requiredMapped} of ${mappingSummary.required} required fields are mapped.`
                }
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Preview Tabs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Output Preview</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              {onTest && (
                <Button size="sm" onClick={onTest}>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Test Live
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="preview">
                <FileCode className="w-4 h-4 mr-2" />
                XML Preview
              </TabsTrigger>
              <TabsTrigger value="mappings">
                <List className="w-4 h-4 mr-2" />
                Mapping Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-4">
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono whitespace-pre">
                  <code>{generatedXml}</code>
                </pre>
              </div>

              <Alert className="mt-4 bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  This is a preview based on sample data. The actual output will depend on the live data from your sources.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="mappings" className="mt-4">
              <div className="space-y-2">
                {config.outputTemplate?.fields?.map((field: XmlOutputField, index: number) => {
                  const mapping = config.fieldMappings?.find((m: XmlFieldMapping) => m.targetPath === field.path);

                  return (
                    <div
                      key={`${field.path}_${index}`}
                      className={`p-3 rounded-lg border ${mapping ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-300'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              field.xmlType === 'attribute'
                                ? 'bg-orange-100 text-orange-800 border-orange-300'
                                : 'bg-blue-100 text-blue-800 border-blue-300'
                            }`}
                          >
                            {field.xmlType === 'attribute' ? '@' : '</>'}
                          </Badge>
                          <span className="font-mono text-sm">{field.elementName}</span>
                          <Badge variant="outline" className="text-xs">{field.type}</Badge>
                          {field.required && (
                            <Badge className="bg-red-100 text-red-800 text-xs">Required</Badge>
                          )}
                          {field.cdata && (
                            <Badge className="bg-purple-100 text-purple-800 text-xs">CDATA</Badge>
                          )}
                        </div>

                        {mapping ? (
                          <div className="flex items-center gap-2 text-sm text-green-700">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-mono">{mapping.sourcePath}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Not mapped</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <div className="text-sm text-gray-500 flex items-center">
          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
          Configuration complete. Save your agent to apply these settings.
        </div>
      </div>
    </div>
  );
};

export default XmlMappingPreview;

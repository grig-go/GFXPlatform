import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import {
  AlertCircle,
  Code,
  FileCode,
  FileSpreadsheet,
  RefreshCw,
  Rss,
  Search,
  Copy,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Info,
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { useToast } from './ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { JsonFieldMapper } from './JsonFieldMapper/JsonFieldMapper';
import { XmlFieldMapper } from './XmlFieldMapper/XmlFieldMapper';

// Helper function to extract field paths with data examples
function extractFieldPaths(obj: any, prefix = ''): Array<{ path: string; display: string }> {
  const fields: Array<{ path: string; display: string }> = [];

  if (!obj || typeof obj !== 'object') return fields;

  Object.keys(obj).forEach(key => {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    const valuePreview = typeof value === 'string'
      ? `"${value.substring(0, 30)}${value.length > 30 ? '...' : ''}"`
      : typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : Array.isArray(value)
      ? `[${value.length} items]`
      : typeof value === 'object' && value !== null
      ? '{...}'
      : 'null';

    fields.push({
      path,
      display: `${key} (${valuePreview})`
    });

    // Recurse for nested objects (but not arrays)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      fields.push(...extractFieldPaths(value, path));
    }
  });

  return fields;
}

// JsonPathSelector component for selecting array containing items
const JsonPathSelector: React.FC<{
  data: any;
  onSelectItemsPath: (path: string) => void;
  selectedItemsPath: string;
  autoSelect?: boolean;
}> = ({ data, onSelectItemsPath, selectedItemsPath, autoSelect = false }) => {
  const findArrayPaths = (obj: any, currentPath = ''): Array<{ path: string; count: number }> => {
    const arrayPaths: Array<{ path: string; count: number }> = [];

    if (!obj || typeof obj !== 'object') return arrayPaths;

    Object.keys(obj).forEach(key => {
      const path = currentPath ? `${currentPath}.${key}` : key;
      const value = obj[key];

      if (Array.isArray(value)) {
        arrayPaths.push({ path, count: value.length });
        // Don't recurse into arrays - we want the array itself, not its contents
      } else if (typeof value === 'object' && value !== null) {
        // Recurse into objects
        arrayPaths.push(...findArrayPaths(value, path));
      }
    });

    return arrayPaths;
  };

  const arrayPaths = findArrayPaths(data);
  const selectedArray = arrayPaths.find(a => a.path === selectedItemsPath);

  // Auto-select first array path when autoSelect prop is true
  useEffect(() => {
    if (autoSelect && arrayPaths.length > 0 && !selectedItemsPath) {
      const firstPath = arrayPaths[0].path;
      onSelectItemsPath(firstPath);
    }
  }, [autoSelect, arrayPaths.length, selectedItemsPath, onSelectItemsPath]);

  return (
    <div className="space-y-3">
      <Label>Select the array containing RSS items (required)</Label>
      <RadioGroup value={selectedItemsPath} onValueChange={onSelectItemsPath}>
        {arrayPaths.length === 0 ? (
          <Alert className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <AlertDescription className="flex-1">
              No arrays found in the data structure. Make sure your API returns an array of items.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            {arrayPaths.map(({ path, count }) => (
              <div key={path} className="flex items-center space-x-2">
                <RadioGroupItem value={path} id={`array-${path}`} className="border-2 border-gray-700" />
                <label htmlFor={`array-${path}`} className="font-normal cursor-pointer flex items-center gap-2">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{path}</code>
                  <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                    {count} items
                  </Badge>
                </label>
              </div>
            ))}
          </div>
        )}
      </RadioGroup>

      {selectedItemsPath && selectedArray && (
        <Alert className="bg-green-50 border-green-200 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          <AlertDescription className="flex-1">
            <span className="whitespace-nowrap">
              RSS items will be generated from the <strong className="inline">{selectedArray.count}</strong> items in <code className="inline">{selectedItemsPath}</code>
            </span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// SingleSourceFieldSelector component with Simple/Nested Fields optgroups
const SingleSourceFieldSelector: React.FC<{
  sourcePath: string;
  sourceId: string;
  sampleData: any;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ sourcePath, sampleData, value, onChange, placeholder }) => {
  // Get sample item from the selected path
  const getSampleItem = () => {
    if (!sampleData) return null;

    const parts = sourcePath.split('.');
    let current = sampleData;

    for (const part of parts) {
      current = current?.[part];
    }

    return Array.isArray(current) && current.length > 0 ? current[0] : null;
  };

  const sampleItem = getSampleItem();
  const availableFields = sampleItem ? extractFieldPaths(sampleItem) : [];

  const simpleFields = availableFields.filter(f => !f.path.includes('.'));
  const nestedFields = availableFields.filter(f => f.path.includes('.'));

  // If we have a saved value but no sample data, show it as a saved option
  const hasSavedValue = value && value !== '__none__';
  const hasFieldData = availableFields.length > 0;

  return (
    <Select value={value || '__none__'} onValueChange={(v) => onChange(v === '__none__' ? '' : v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder || "Select field..."} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">{placeholder || "Select field..."}</SelectItem>

        {/* Show saved value even if no sample data */}
        {hasSavedValue && !hasFieldData && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Saved Field</div>
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
            <div className="px-2 py-1.5 text-xs text-orange-600 italic">
              Click "Test & Discover" to see all available fields
            </div>
          </>
        )}

        {simpleFields.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Simple Fields</div>
            {simpleFields.map(field => (
              <SelectItem key={field.path} value={field.path}>
                {field.display}
              </SelectItem>
            ))}
          </>
        )}

        {nestedFields.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t">Nested Fields</div>
            {nestedFields.map(field => (
              <SelectItem key={field.path} value={field.path}>
                {field.display}
              </SelectItem>
            ))}
          </>
        )}

        {/* Show message when no fields are available and no saved value */}
        {!hasFieldData && !hasSavedValue && (
          <div className="px-2 py-1.5 text-xs text-orange-600 italic">
            Click "Test & Discover" above to see available fields
          </div>
        )}
      </SelectContent>
    </Select>
  );
};

// Helper function to smart-match field names based on common patterns
function smartMatchField(availableFields: Array<{ path: string; display: string }>, targetField: 'title' | 'description' | 'link' | 'pubDate' | 'guid' | 'author' | 'category'): string {
  if (!availableFields || availableFields.length === 0) return '';

  const patterns: Record<string, string[]> = {
    title: ['title', 'name', 'headline', 'subject', 'header'],
    description: ['description', 'desc', 'summary', 'body', 'content', 'text', 'abstract'],
    link: ['link', 'url', 'href', 'permalink', 'uri'],
    pubDate: ['date', 'pubdate', 'published', 'publishedat', 'createdat', 'timestamp', 'time', 'updated', 'modified'],
    guid: ['id', 'guid', 'uuid', 'identifier', 'key'],
    author: ['author', 'creator', 'by', 'writer', 'user', 'username'],
    category: ['category', 'tag', 'type', 'genre', 'topic', 'section']
  };

  const targetPatterns = patterns[targetField] || [];

  // Try exact matches first (case-insensitive)
  for (const pattern of targetPatterns) {
    const match = availableFields.find(f =>
      f.path.toLowerCase() === pattern.toLowerCase()
    );
    if (match) return match.path;
  }

  // Try partial matches (contains pattern)
  for (const pattern of targetPatterns) {
    const match = availableFields.find(f =>
      f.path.toLowerCase().includes(pattern.toLowerCase())
    );
    if (match) return match.path;
  }

  return '';
}

// Helper function to get value from nested path
function getValueFromPath(obj: any, path: string): any {
  if (!path || !obj) return null;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return null;
    current = current[part];
  }
  return current;
}

// Helper function to convert XML mapping config to JSON mapping config
function convertXmlToJsonConfig(xmlConfig: any): any {
  if (!xmlConfig) return null;

  // Convert source selection (nearly identical)
  const jsonSourceSelection = {
    type: xmlConfig.sourceSelection?.type || 'object',
    primaryPath: xmlConfig.sourceSelection?.primaryPath || '',
    sources: (xmlConfig.sourceSelection?.sources || []).map((source: any) => ({
      id: source.id,
      name: source.name,
      path: source.path,
      category: source.category,
      primaryPath: source.primaryPath,
      alias: source.alias,
      type: source.type
    }))
  };

  // Convert output fields (XML XmlOutputField -> JSON OutputField)
  const jsonOutputFields = (xmlConfig.outputTemplate?.fields || []).map((field: any) => ({
    path: field.path,
    type: field.type || 'string',
    required: field.required,
    defaultValue: field.defaultValue,
    description: field.description
  }));

  // Convert output template
  const jsonOutputTemplate = {
    structure: xmlConfig.outputTemplate?.structure || {},
    fields: jsonOutputFields
  };

  // Convert field mappings (XML XmlFieldMapping -> JSON JsonFieldMapping)
  const jsonFieldMappings = (xmlConfig.fieldMappings || []).map((mapping: any) => ({
    id: mapping.id,
    targetPath: mapping.targetPath,
    sourcePath: mapping.sourcePath,
    sourceId: mapping.sourceId,
    sourceName: mapping.sourceName,
    sourceCategory: mapping.sourceCategory,
    sourceType: mapping.sourceType,
    sourceTimestamp: mapping.sourceTimestamp,
    transformId: mapping.transformId,
    fallbackValue: mapping.fallbackValue,
    conditional: mapping.conditional
  }));

  // Convert transformations (nearly identical)
  const jsonTransformations = (xmlConfig.transformations || []).map((transform: any) => ({
    id: transform.id,
    name: transform.name,
    type: transform.type,
    config: transform.config
  }));

  // Convert output wrapper
  const jsonOutputWrapper = {
    enabled: xmlConfig.outputWrapper?.enabled ?? false,
    wrapperKey: xmlConfig.outputWrapper?.rootElement || 'data',
    includeMetadata: xmlConfig.outputWrapper?.includeMetadata || false,
    metadataFields: xmlConfig.outputWrapper?.metadataFields || {
      timestamp: true,
      source: true,
      count: true,
      version: false
    },
    customMetadata: {}
  };

  return {
    sourceSelection: jsonSourceSelection,
    outputTemplate: jsonOutputTemplate,
    fieldMappings: jsonFieldMappings,
    transformations: jsonTransformations,
    outputWrapper: jsonOutputWrapper
  };
}

// Helper function to convert JSON mapping config to XML mapping config
function convertJsonToXmlConfig(jsonConfig: any): any {
  if (!jsonConfig) return null;

  // Convert source selection (nearly identical)
  const xmlSourceSelection = {
    type: jsonConfig.sourceSelection?.type || 'object',
    primaryPath: jsonConfig.sourceSelection?.primaryPath || '',
    sources: (jsonConfig.sourceSelection?.sources || []).map((source: any) => ({
      id: source.id,
      name: source.name,
      path: source.path,
      category: source.category,
      primaryPath: source.primaryPath,
      alias: source.alias,
      type: source.type
    })),
    unwrapSingleItems: false
  };

  // Convert output fields (JSON OutputField -> XML XmlOutputField)
  const xmlOutputFields = (jsonConfig.outputTemplate?.fields || []).map((field: any) => ({
    path: field.path,
    name: field.path, // Use path as display name
    elementName: field.path, // Use path as element name
    type: field.type || 'string',
    xmlType: 'element' as const, // Default to element (not attribute)
    required: field.required,
    defaultValue: field.defaultValue,
    description: field.description,
    cdata: false
  }));

  // Convert output template
  const xmlOutputTemplate = {
    structure: jsonConfig.outputTemplate?.structure || {},
    fields: xmlOutputFields,
    rootElement: jsonConfig.outputWrapper?.wrapperKey || 'data',
    itemElement: 'item'
  };

  // Convert field mappings (JSON JsonFieldMapping -> XML XmlFieldMapping)
  const xmlFieldMappings = (jsonConfig.fieldMappings || []).map((mapping: any) => ({
    id: mapping.id,
    targetPath: mapping.targetPath,
    targetElementName: mapping.targetPath, // Use target path as element name
    xmlType: 'element' as const,
    sourcePath: mapping.sourcePath,
    sourceId: mapping.sourceId,
    sourceName: mapping.sourceName,
    sourceCategory: mapping.sourceCategory,
    sourceType: mapping.sourceType,
    sourceTimestamp: mapping.sourceTimestamp,
    transformId: mapping.transformId,
    fallbackValue: mapping.fallbackValue,
    conditional: mapping.conditional,
    cdata: false
  }));

  // Convert transformations (nearly identical, just ensure type compatibility)
  const xmlTransformations = (jsonConfig.transformations || []).map((transform: any) => ({
    id: transform.id,
    name: transform.name,
    type: transform.type,
    config: transform.config
  }));

  // Convert output wrapper
  const xmlOutputWrapper = {
    enabled: jsonConfig.outputWrapper?.enabled ?? true,
    rootElement: jsonConfig.outputWrapper?.wrapperKey || 'data',
    includeDeclaration: true,
    encoding: 'UTF-8',
    version: '1.0',
    includeMetadata: jsonConfig.outputWrapper?.includeMetadata || false,
    metadataFields: jsonConfig.outputWrapper?.metadataFields || {
      timestamp: true,
      source: true,
      count: true,
      version: false
    }
  };

  return {
    sourceSelection: xmlSourceSelection,
    outputTemplate: xmlOutputTemplate,
    fieldMappings: xmlFieldMappings,
    transformations: xmlTransformations,
    outputWrapper: xmlOutputWrapper
  };
}

// MultiSourceRSSPreview component - shows live RSS preview
const MultiSourceRSSPreview: React.FC<{
  sourceMappings: RSSSourceMapping[];
  sampleData: Record<string, any>;
  channelInfo: { title: string; description: string; link: string };
  mergeStrategy: string;
  dataSources: any[];
}> = ({ sourceMappings, sampleData, channelInfo, mergeStrategy, dataSources }) => {
  // Collect all items from all enabled sources
  const allItems: Array<{
    source: string;
    title: string;
    description: string;
    link: string;
    pubDate: any;
    guid: any;
    author: any;
    category: any;
    itemCount: number;
  }> = [];

  sourceMappings.forEach(mapping => {
    const sourceData = sampleData[mapping.sourceId];
    if (!sourceData || !mapping.itemsPath) return;

    // Get items array
    const items = getValueFromPath(sourceData, mapping.itemsPath);
    if (!Array.isArray(items) || items.length === 0) return;

    // Get source name for display
    const sourceName = dataSources.find(ds => ds.id === mapping.sourceId)?.name || 'Unknown';

    // Take first item as example
    const item = items[0];
    allItems.push({
      source: sourceName,
      title: mapping.fieldMappings.title ? getValueFromPath(item, mapping.fieldMappings.title) || '[No title]' : '[No title]',
      description: mapping.fieldMappings.description ? getValueFromPath(item, mapping.fieldMappings.description) || '[No description]' : '[No description]',
      link: mapping.fieldMappings.link ? getValueFromPath(item, mapping.fieldMappings.link) || '[No link]' : '[No link]',
      pubDate: mapping.fieldMappings.pubDate ? getValueFromPath(item, mapping.fieldMappings.pubDate) : null,
      guid: mapping.fieldMappings.guid ? getValueFromPath(item, mapping.fieldMappings.guid) : null,
      author: mapping.fieldMappings.author ? getValueFromPath(item, mapping.fieldMappings.author) : null,
      category: mapping.fieldMappings.category ? getValueFromPath(item, mapping.fieldMappings.category) : null,
      itemCount: items.length
    });
  });

  if (allItems.length === 0) {
    return null;
  }

  const totalItems = allItems.reduce((sum, item) => sum + item.itemCount, 0);

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${channelInfo.title || '[Channel Title]'}</title>
    <description>${channelInfo.description || '[Channel Description]'}</description>
    <link>${channelInfo.link || '[Channel Link]'}</link>

    <!-- Items from ${sourceMappings.length} sources (${mergeStrategy} merge) -->
${allItems.map((item, idx) => `
    <!-- Item ${idx + 1} from ${item.source} -->
    <item>
      <title>${item.title}</title>
      <description>${item.description}</description>
      <link>${item.link}</link>${item.pubDate ? `
      <pubDate>${item.pubDate}</pubDate>` : ''}${item.guid ? `
      <guid>${item.guid}</guid>` : ''}${item.author ? `
      <author>${item.author}</author>` : ''}${item.category ? `
      <category>${item.category}</category>` : ''}
      <source url="${channelInfo.link}">${item.source}</source>
    </item>`).join('\n')}
  </channel>
</rss>`;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">RSS Feed Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <Alert className="bg-green-50 border-green-200 flex items-start gap-2">
          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <AlertTitle>Feed Summary</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {allItems.map((item, idx) => (
                  <li key={idx}>
                    {item.source}: {item.itemCount} items
                  </li>
                ))}
                <li><strong>Total: {totalItems} items</strong></li>
                <li>Merge Strategy: {mergeStrategy}</li>
              </ul>
            </AlertDescription>
          </div>
        </Alert>

        {/* XML Preview */}
        <div className="relative">
          <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-xs font-mono whitespace-pre-wrap break-words">
            <code>{rssXml}</code>
          </pre>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => {
              navigator.clipboard.writeText(rssXml);
            }}
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Types for RSS multi-source configuration
interface RSSSourceMapping {
  sourceId: string;
  itemsPath: string;
  fieldMappings: {
    title: string;
    description: string;
    link: string;
    pubDate?: string;
    guid?: string;
    author?: string;
    category?: string;
  };
  enabled: boolean;
}

interface OutputFormatStepProps {
  formData: any;
  setFormData: (data: any) => void;
  sampleData?: Record<string, any>;
  onTestDataSource?: (source: any) => Promise<void>;
  isCreateMode?: boolean;
}

const OutputFormatStep: React.FC<OutputFormatStepProps> = ({
  formData,
  setFormData,
  sampleData = {},
  onTestDataSource,
  isCreateMode = false
}) => {
  const { toast } = useToast();

  // Store discovered fields in a ref to persist across renders
  const discoveredFieldsRef = useRef<Record<string, string[]>>({});

  const [format, setFormat] = useState(formData.format || 'JSON');
  const [formatOptions, setFormatOptions] = useState<any>({
    // JSON options
    prettyPrint: formData.formatOptions?.prettyPrint !== false,
    includeMetadata: formData.formatOptions?.includeMetadata || false,
    wrapResponse: formData.formatOptions?.wrapResponse || false,
    rootElement: formData.formatOptions?.rootElement || 'data',
    rootWrapper: formData.formatOptions?.rootWrapper || 'data',
    sourceId: formData.formatOptions?.sourceId || '',
    includeNulls: formData.formatOptions?.includeNulls !== false,
    sortKeys: formData.formatOptions?.sortKeys || false,
    isoDates: formData.formatOptions?.isoDates !== false,
    encoding: formData.formatOptions?.encoding || 'UTF-8',

    // JSON Advanced Field Mapping Configuration
    jsonMappingConfig: formData.formatOptions?.jsonMappingConfig || undefined,

    // XML Advanced Field Mapping Configuration
    xmlMappingConfig: formData.formatOptions?.xmlMappingConfig || undefined,

    // XML options
    xmlRootElement: formData.formatOptions?.xmlRootElement || 'response',
    namespace: formData.formatOptions?.namespace || '',
    includeDeclaration: formData.formatOptions?.includeDeclaration !== false,
    useAttributes: formData.formatOptions?.useAttributes || false,

    // RSS options
    channelTitle: formData.formatOptions?.channelTitle || '',
    channelDescription: formData.formatOptions?.channelDescription || '',
    channelLink: formData.formatOptions?.channelLink || '',

    // RSS Single-source field mappings (legacy) - shared with ATOM
    titleField: formData.formatOptions?.titleField || '',
    descriptionField: formData.formatOptions?.descriptionField || '',
    linkField: formData.formatOptions?.linkField || '',
    contentField: formData.formatOptions?.contentField || '',
    pubDateField: formData.formatOptions?.pubDateField || '',
    guidField: formData.formatOptions?.guidField || '',
    authorField: formData.formatOptions?.authorField || '',
    categoryField: formData.formatOptions?.categoryField || '',

    // RSS Multi-source configuration
    sourceMappings: formData.formatOptions?.sourceMappings || [],
    mergeStrategy: formData.formatOptions?.mergeStrategy || 'sequential',
    maxItemsPerSource: formData.formatOptions?.maxItemsPerSource || 0,
    maxTotalItems: formData.formatOptions?.maxTotalItems || 0,

    // Atom options
    feedId: formData.formatOptions?.feedId || '',
    feedTitle: formData.formatOptions?.feedTitle || '',
    feedSubtitle: formData.formatOptions?.feedSubtitle || '',
    feedLink: formData.formatOptions?.feedLink || '',
    authorName: formData.formatOptions?.authorName || '',
    authorEmail: formData.formatOptions?.authorEmail || '',
    idField: formData.formatOptions?.idField || '',
    summaryField: formData.formatOptions?.summaryField || '',
    // Note: linkField, contentField, titleField are shared with RSS and already defined above
    updatedField: formData.formatOptions?.updatedField || '',
    publishedField: formData.formatOptions?.publishedField || '',
    categoriesField: formData.formatOptions?.categoriesField || '',

    // CSV options
    delimiter: formData.formatOptions?.delimiter || ',',
    includeHeaders: formData.formatOptions?.includeHeaders !== false,
    quoteStrings: formData.formatOptions?.quoteStrings || false,
    lineEnding: formData.formatOptions?.lineEnding || 'LF',
  });

  const [testingSource, setTestingSource] = useState<string | null>(null);

  // RSS Multi-source state
  const [sourceMappings, setSourceMappings] = useState<RSSSourceMapping[]>(() => {
    // If we have saved mappings, use them
    if (formData.formatOptions?.sourceMappings && formData.formatOptions.sourceMappings.length > 0) {
      // Ensure all current data sources are represented
      const savedMappings = formData.formatOptions.sourceMappings;
      const mappingsBySourceId = new Map(
        savedMappings.map((m: any) => [m.sourceId, m])
      );

      // Create mappings for all data sources, using saved data where available
      return (formData.dataSources || []).map((source: any) => {
        const savedMapping = mappingsBySourceId.get(source.id);

        if (savedMapping) {
          // Use the saved mapping
          return savedMapping;
        } else {
          // Create a new empty mapping for this source
          return {
            sourceId: source.id,
            itemsPath: '',
            fieldMappings: {
              title: '',
              description: '',
              link: '',
              pubDate: '',
              guid: '',
              author: '',
              category: ''
            },
            enabled: false
          };
        }
      });
    } else {
      // No saved mappings, create empty ones for each data source
      return (formData.dataSources || []).map((source: any) => ({
        sourceId: source.id,
        itemsPath: '',
        fieldMappings: {
          title: '',
          description: '',
          link: '',
          pubDate: '',
          guid: '',
          author: '',
          category: ''
        },
        enabled: false
      }));
    }
  });

  const [expandedSources, setExpandedSources] = useState<Set<string>>(() => {
    // Auto-expand enabled sources when loading
    const enabled = new Set<string>();
    if (formData.formatOptions?.sourceMappings) {
      formData.formatOptions.sourceMappings.forEach((mapping: RSSSourceMapping) => {
        if (mapping.enabled) {
          enabled.add(mapping.sourceId);
        }
      });
    }
    return enabled;
  });

  const [autoSelectSourceId, setAutoSelectSourceId] = useState<string | null>(null);

  // Reset autoSelectSourceId after a selection is made
  useEffect(() => {
    if (autoSelectSourceId) {
      const mapping = sourceMappings.find((m: RSSSourceMapping) => m.sourceId === autoSelectSourceId);
      if (mapping?.itemsPath) {
        // Selection was made, reset the auto-select trigger
        setAutoSelectSourceId(null);
      }
    }
  }, [autoSelectSourceId, sourceMappings]);

  useEffect(() => {
    // When switching to XML format, sync JSON mappings to XML if XML config is empty
    if (format === 'XML' && formatOptions.jsonMappingConfig) {
      const hasXmlConfig = formatOptions.xmlMappingConfig?.outputTemplate?.fields?.length > 0 ||
                           formatOptions.xmlMappingConfig?.fieldMappings?.length > 0;

      if (!hasXmlConfig) {
        const convertedConfig = convertJsonToXmlConfig(formatOptions.jsonMappingConfig);
        if (convertedConfig) {
          setFormatOptions((prev: any) => ({
            ...prev,
            xmlMappingConfig: convertedConfig
          }));
          console.log('Synced JSON mapping config to XML format');
        }
      }
    }

    // When switching to JSON format, sync XML mappings to JSON if JSON config is empty
    if (format === 'JSON' && formatOptions.xmlMappingConfig) {
      const hasJsonConfig = formatOptions.jsonMappingConfig?.outputTemplate?.fields?.length > 0 ||
                            formatOptions.jsonMappingConfig?.fieldMappings?.length > 0;

      if (!hasJsonConfig) {
        const convertedConfig = convertXmlToJsonConfig(formatOptions.xmlMappingConfig);
        if (convertedConfig) {
          setFormatOptions((prev: any) => ({
            ...prev,
            jsonMappingConfig: convertedConfig
          }));
          console.log('Synced XML mapping config to JSON format');
        }
      }
    }

    setFormData((prevFormData: any) => ({
      ...prevFormData,
      format,
      formatOptions: {
        ...formatOptions,
        sourceMappings: format === 'RSS' ? sourceMappings : formatOptions.sourceMappings
      }
    }));
  }, [format]);

  // Sync formatOptions changes back to formData
  useEffect(() => {
    setFormData((prevFormData: any) => ({
      ...prevFormData,
      formatOptions
    }));
  }, [formatOptions, setFormData]);

  const updateFormatOption = (key: string, value: any) => {
    setFormatOptions((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  const testDataSource = async (source: any) => {
    if (onTestDataSource) {
      setTestingSource(source.id);
      try {
        const result = await onTestDataSource(source);

        // If the test was successful and returned fields, store them in the ref
        if (result && result.fields) {
          // Store fields in the ref to persist across renders
          discoveredFieldsRef.current[source.id] = result.fields;

          // Also update formData with the discovered fields
          setFormData((prev: any) => ({
            ...prev,
            dataSources: prev.dataSources?.map((ds: any) =>
              String(ds.id) === String(source.id)
                ? { ...ds, fields: result.fields }
                : ds
            )
          }));
        }

        toast({
          title: 'Test successful',
          description: `Successfully tested ${source.name}`,
        });

        // Trigger auto-selection for RSS format after successful test
        if (format === 'RSS') {
          setAutoSelectSourceId(source.id);
          // Reset after triggering
          setTimeout(() => setAutoSelectSourceId(null), 100);
        }
      } catch (error) {
        toast({
          title: 'Test failed',
          description: 'Failed to test data source',
          variant: 'destructive',
        });
      } finally {
        setTestingSource(null);
      }
    }
  };

  const testAndDiscoverAll = async () => {
    if (!onTestDataSource || !formData.dataSources) return;

    // Test all sources (allow re-testing)
    const sourcesToTest = formData.dataSources;

    if (sourcesToTest.length === 0) {
      toast({
        title: 'No sources available',
        description: 'Please add data sources first',
      });
      return;
    }

    setTestingSource('all');
    let successCount = 0;
    let failCount = 0;

    for (const source of sourcesToTest) {
      try {
        const result = await onTestDataSource(source) as any;

        // If the test was successful and returned fields, store them
        if (result && result.fields) {
          // Store fields in the ref to persist across renders
          discoveredFieldsRef.current[source.id] = result.fields;

          // Also update formData with the discovered fields
          setFormData((prev: any) => ({
            ...prev,
            dataSources: prev.dataSources?.map((ds: any) =>
              String(ds.id) === String(source.id)
                ? { ...ds, fields: result.fields }
                : ds
            )
          }));
        }

        successCount++;

        // Trigger auto-selection for RSS format after successful test
        if (format === 'RSS') {
          setAutoSelectSourceId(source.id);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        failCount++;
        console.error(`Failed to test ${source.name}:`, error);
      }
    }

    setTestingSource(null);

    toast({
      title: 'Bulk test complete',
      description: `Successfully tested ${successCount} source(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
      variant: failCount > 0 ? 'destructive' : 'default',
    });
  };

  const getAllFields = () => {
    const fields: string[] = [];

    (formData.dataSources || []).forEach((source: any) => {
      if (source.fields && source.fields.length > 0) {
        fields.push(...source.fields);
      } else if (sampleData[source.id]) {
        const data = sampleData[source.id];
        if (Array.isArray(data) && data.length > 0) {
          Object.keys(data[0]).forEach(key => {
            if (!key.startsWith('_') && !key.startsWith('$')) {
              fields.push(key);
            }
          });
        }
      }
    });

    return [...new Set(fields)];
  };

  // RSS Multi-source functions
  const updateSourceMapping = (sourceId: string, updates: Partial<RSSSourceMapping>) => {
    const updated = sourceMappings.map(mapping => {
      if (mapping.sourceId === sourceId) {
        const updatedMapping = { ...mapping, ...updates };

        // If itemsPath is being set and field mappings are empty, auto-suggest fields
        if (updates.itemsPath && updates.itemsPath !== mapping.itemsPath) {
          const sourceData = (sampleData as Record<string, any>)[sourceId];

          if (sourceData) {
            // Get the items array from the itemsPath
            const itemsArray = getValueFromPath(sourceData, updates.itemsPath);

            if (Array.isArray(itemsArray) && itemsArray.length > 0) {
              const firstItem = itemsArray[0];
              const availableFields = extractFieldPaths(firstItem);

              // Auto-suggest fields only if they're currently empty
              const currentMappings = updatedMapping.fieldMappings;

              // Check if this is a newly added source (no optional fields set yet)
              const isNewlyAddedSource = !currentMappings.pubDate && !currentMappings.guid &&
                                         !currentMappings.author && !currentMappings.category;

              // In create mode OR for newly added sources in edit mode, only auto-fill required fields
              // For existing sources in edit mode, auto-fill all fields
              if (isCreateMode || isNewlyAddedSource) {
                updatedMapping.fieldMappings = {
                  title: currentMappings.title || smartMatchField(availableFields, 'title'),
                  description: currentMappings.description || smartMatchField(availableFields, 'description'),
                  link: currentMappings.link || smartMatchField(availableFields, 'link'),
                  pubDate: currentMappings.pubDate || '',
                  guid: currentMappings.guid || '',
                  author: currentMappings.author || '',
                  category: currentMappings.category || '',
                };
              } else {
                updatedMapping.fieldMappings = {
                  title: currentMappings.title || smartMatchField(availableFields, 'title'),
                  description: currentMappings.description || smartMatchField(availableFields, 'description'),
                  link: currentMappings.link || smartMatchField(availableFields, 'link'),
                  pubDate: currentMappings.pubDate || smartMatchField(availableFields, 'pubDate'),
                  guid: currentMappings.guid || smartMatchField(availableFields, 'guid'),
                  author: currentMappings.author || smartMatchField(availableFields, 'author'),
                  category: currentMappings.category || smartMatchField(availableFields, 'category'),
                };
              }
            }
          }
        }

        return updatedMapping;
      }
      return mapping;
    });
    setSourceMappings(updated);

    // Critical: Update the parent formatOptions immediately
    updateFormatOption('sourceMappings', updated);
  };

  const updateFieldMapping = (sourceId: string, field: string, value: string) => {
    const updated = sourceMappings.map(mapping =>
      mapping.sourceId === sourceId
        ? {
            ...mapping,
            fieldMappings: {
              ...mapping.fieldMappings,
              [field]: value
            }
          }
        : mapping
    );
    setSourceMappings(updated);

    // Critical: Update the parent formatOptions immediately
    updateFormatOption('sourceMappings', updated);
  };

  const toggleSourceExpansion = (sourceId: string) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(sourceId)) {
      newExpanded.delete(sourceId);
    } else {
      newExpanded.add(sourceId);

      // Auto-select first array path when expanding in create mode
      if (isCreateMode) {
        const mapping = sourceMappings.find((m: RSSSourceMapping) => m.sourceId === sourceId);
        const hasData = sampleData[sourceId];

        // Only auto-select if we have data but no itemsPath selected yet
        if (hasData && mapping && !mapping.itemsPath) {
          // Set the auto-select state immediately
          setAutoSelectSourceId(sourceId);
        }
      }
    }
    setExpandedSources(newExpanded);
  };

  const enabledSourcesCount = sourceMappings.filter(m => m.enabled).length;

  // Helper function to get value from nested path
  const getValueFromPath = (obj: any, path: string): any => {
    if (!path || !obj) return null;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return null;
      current = current[part];
    }
    return current;
  };

  return (
    <div className="space-y-6">
      {/* Format Selection */}
      <div>
        <Label className="text-base font-medium mb-3 block">Select Output Format</Label>
        <div className="grid grid-cols-5 gap-3">
          {[
            { value: 'JSON', icon: Code, label: 'JSON', desc: 'RESTful API' },
            { value: 'XML', icon: FileCode, label: 'XML', desc: 'Enterprise' },
            { value: 'RSS', icon: Rss, label: 'RSS', desc: 'Feed 2.0' },
            { value: 'ATOM', icon: Rss, label: 'Atom', desc: 'Modern Feed' },
            { value: 'CSV', icon: FileSpreadsheet, label: 'CSV', desc: 'Spreadsheet' }
          ].map(({ value, icon: Icon, label, desc }) => (
            <Card
              key={value}
              className={`cursor-pointer transition-all hover:shadow-md ${
                format === value ? 'border-primary ring-2 ring-primary/20' : ''
              }`}
              onClick={() => setFormat(value)}
            >
              <CardContent className="flex flex-col items-center justify-center p-4">
                <Icon className="w-8 h-8 mb-2 text-muted-foreground" />
                <div className="font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Format Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{format} Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {format === 'JSON' && (
            <>
              <JsonFieldMapper
                dataSources={formData.dataSources || []}
                sampleData={sampleData}
                initialConfig={(() => {
                  // If we have saved JSON config with fields or mappings, use it
                  const hasJsonConfig = formatOptions.jsonMappingConfig?.outputTemplate?.fields?.length > 0 ||
                                        formatOptions.jsonMappingConfig?.fieldMappings?.length > 0 ||
                                        formatOptions.jsonMappingConfig?.sourceSelection?.sources?.length > 0;

                  if (hasJsonConfig) {
                    return formatOptions.jsonMappingConfig;
                  }

                  // If we have XML config, convert it to JSON config
                  const hasXmlConfig = formatOptions.xmlMappingConfig?.outputTemplate?.fields?.length > 0 ||
                                       formatOptions.xmlMappingConfig?.fieldMappings?.length > 0 ||
                                       formatOptions.xmlMappingConfig?.sourceSelection?.sources?.length > 0;

                  if (hasXmlConfig) {
                    const converted = convertXmlToJsonConfig(formatOptions.xmlMappingConfig);
                    if (converted) {
                      // Also update formatOptions so changes persist
                      setTimeout(() => updateFormatOption('jsonMappingConfig', converted), 0);
                      return converted;
                    }
                  }

                  // Otherwise, create default config with default fields for "create new agent" mode
                  return {
                    sourceSelection: {
                      type: 'object',
                      primaryPath: '',
                      sources: []
                    },
                    outputTemplate: {
                      structure: {},
                      fields: [
                        { path: 'id', name: 'ID', type: 'string', required: false, defaultValue: null },
                        { path: 'title', name: 'Title', type: 'string', required: true, defaultValue: null },
                        { path: 'description', name: 'Description', type: 'string', required: false, defaultValue: null },
                        { path: 'value', name: 'Value', type: 'string', required: false, defaultValue: null }
                      ]
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
                })()}
                onChange={(config: any) => updateFormatOption('jsonMappingConfig', config)}
                onTestDataSource={onTestDataSource}
              />

              {/* Quick Actions */}
              <Card className="mt-4 bg-gray-50">
                <CardContent className="pt-6">
                  <h4 className="text-sm font-semibold mb-3">Quick Actions</h4>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (formatOptions.jsonMappingConfig) {
                          const configJson = JSON.stringify(formatOptions.jsonMappingConfig, null, 2);
                          const blob = new Blob([configJson], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'json-mapping-config.json';
                          a.click();
                          URL.revokeObjectURL(url);

                          toast({
                            title: 'Success',
                            description: 'Configuration exported',
                          });
                        }
                      }}
                      disabled={!formatOptions.jsonMappingConfig}
                    >
                      <FileCode className="w-4 h-4 mr-2" />
                      Export Configuration
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            try {
                              const text = await file.text();
                              const config = JSON.parse(text);
                              updateFormatOption('jsonMappingConfig', config);

                              toast({
                                title: 'Success',
                                description: 'Configuration imported successfully',
                              });
                            } catch (error) {
                              toast({
                                title: 'Error',
                                description: 'Failed to import configuration',
                                variant: 'destructive',
                              });
                            }
                          }
                        };
                        input.click();
                      }}
                    >
                      <FileCode className="w-4 h-4 mr-2" />
                      Import Configuration
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (formatOptions.xmlMappingConfig) {
                          const convertedConfig = convertXmlToJsonConfig(formatOptions.xmlMappingConfig);
                          if (convertedConfig) {
                            updateFormatOption('jsonMappingConfig', convertedConfig);
                            toast({
                              title: 'Success',
                              description: 'Imported field mappings from XML configuration',
                            });
                          }
                        } else {
                          toast({
                            title: 'No XML config',
                            description: 'Configure XML output format first to import mappings',
                            variant: 'destructive',
                          });
                        }
                      }}
                      disabled={!formatOptions.xmlMappingConfig}
                    >
                      <FileCode className="w-4 h-4 mr-2" />
                      Import from XML
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to reset the mapping configuration?')) {
                          updateFormatOption('jsonMappingConfig', null);
                          toast({
                            title: 'Warning',
                            description: 'Configuration reset',
                          });
                        }
                      }}
                      disabled={!formatOptions.jsonMappingConfig}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {format === 'XML' && (
            <>
              <XmlFieldMapper
                dataSources={formData.dataSources || []}
                sampleData={sampleData}
                initialConfig={(() => {
                  // If we have saved XML config with fields or mappings, use it
                  const hasXmlConfig = formatOptions.xmlMappingConfig?.outputTemplate?.fields?.length > 0 ||
                                       formatOptions.xmlMappingConfig?.fieldMappings?.length > 0 ||
                                       formatOptions.xmlMappingConfig?.sourceSelection?.sources?.length > 0;

                  if (hasXmlConfig) {
                    return formatOptions.xmlMappingConfig;
                  }

                  // If we have JSON config, convert it to XML config
                  const hasJsonConfig = formatOptions.jsonMappingConfig?.outputTemplate?.fields?.length > 0 ||
                                        formatOptions.jsonMappingConfig?.fieldMappings?.length > 0 ||
                                        formatOptions.jsonMappingConfig?.sourceSelection?.sources?.length > 0;

                  if (hasJsonConfig) {
                    const converted = convertJsonToXmlConfig(formatOptions.jsonMappingConfig);
                    if (converted) {
                      // Also update formatOptions so changes persist
                      setTimeout(() => updateFormatOption('xmlMappingConfig', converted), 0);
                      return converted;
                    }
                  }

                  // Otherwise, create default config
                  return {
                    sourceSelection: {
                      type: 'object',
                      primaryPath: '',
                      sources: []
                    },
                    outputTemplate: {
                      structure: {},
                      fields: [
                        { path: 'id', name: 'ID', elementName: 'id', type: 'string', xmlType: 'attribute', required: false },
                        { path: 'title', name: 'Title', elementName: 'title', type: 'string', xmlType: 'element', required: true },
                        { path: 'description', name: 'Description', elementName: 'description', type: 'string', xmlType: 'element', required: false, cdata: true },
                        { path: 'value', name: 'Value', elementName: 'value', type: 'string', xmlType: 'element', required: false }
                      ],
                      rootElement: 'data',
                      itemElement: 'item'
                    },
                    fieldMappings: [],
                    transformations: [],
                    outputWrapper: {
                      enabled: true,
                      rootElement: 'data',
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
                })()}
                onChange={(config: any) => updateFormatOption('xmlMappingConfig', config)}
                onTestDataSource={onTestDataSource}
              />

              {/* Quick Actions */}
              <Card className="mt-4 bg-gray-50">
                <CardContent className="pt-6">
                  <h4 className="text-sm font-semibold mb-3">Quick Actions</h4>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (formatOptions.xmlMappingConfig) {
                          const configJson = JSON.stringify(formatOptions.xmlMappingConfig, null, 2);
                          const blob = new Blob([configJson], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'xml-mapping-config.json';
                          a.click();
                          URL.revokeObjectURL(url);

                          toast({
                            title: 'Success',
                            description: 'Configuration exported',
                          });
                        }
                      }}
                      disabled={!formatOptions.xmlMappingConfig}
                    >
                      <FileCode className="w-4 h-4 mr-2" />
                      Export Configuration
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            try {
                              const text = await file.text();
                              const config = JSON.parse(text);
                              updateFormatOption('xmlMappingConfig', config);

                              toast({
                                title: 'Success',
                                description: 'Configuration imported successfully',
                              });
                            } catch (error) {
                              toast({
                                title: 'Error',
                                description: 'Failed to import configuration',
                                variant: 'destructive',
                              });
                            }
                          }
                        };
                        input.click();
                      }}
                    >
                      <FileCode className="w-4 h-4 mr-2" />
                      Import Configuration
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (formatOptions.jsonMappingConfig) {
                          const convertedConfig = convertJsonToXmlConfig(formatOptions.jsonMappingConfig);
                          if (convertedConfig) {
                            updateFormatOption('xmlMappingConfig', convertedConfig);
                            toast({
                              title: 'Success',
                              description: 'Imported field mappings from JSON configuration',
                            });
                          }
                        } else {
                          toast({
                            title: 'No JSON config',
                            description: 'Configure JSON output format first to import mappings',
                            variant: 'destructive',
                          });
                        }
                      }}
                      disabled={!formatOptions.jsonMappingConfig}
                    >
                      <Code className="w-4 h-4 mr-2" />
                      Import from JSON
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to reset the mapping configuration?')) {
                          updateFormatOption('xmlMappingConfig', null);
                          toast({
                            title: 'Warning',
                            description: 'Configuration reset',
                          });
                        }
                      }}
                      disabled={!formatOptions.xmlMappingConfig}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {format === 'RSS' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="channel-title">Channel Title *</Label>
                <Input
                  id="channel-title"
                  value={formatOptions.channelTitle}
                  onChange={(e) => updateFormatOption('channelTitle', e.target.value)}
                  placeholder="My RSS Feed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel-desc">Channel Description *</Label>
                <Textarea
                  id="channel-desc"
                  value={formatOptions.channelDescription}
                  onChange={(e) => updateFormatOption('channelDescription', e.target.value)}
                  placeholder="Description of your RSS feed"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel-link">Channel Link *</Label>
                <Input
                  id="channel-link"
                  value={formatOptions.channelLink}
                  onChange={(e) => updateFormatOption('channelLink', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>

              {/* Multi-Source RSS Configuration - Always show when there are data sources */}
              {formData.dataSources && formData.dataSources.length > 0 && (
                <>
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Configure Multiple Data Sources</h4>
                      <div className="flex items-center gap-2">
                        {enabledSourcesCount > 0 && formData.dataSources.some((source: any) => {
                          const mapping = sourceMappings.find((m: RSSSourceMapping) => m.sourceId === source.id);
                          return mapping?.enabled && !source.fields?.length && !sampleData[source.id];
                        }) && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={async () => {
                              const enabledSourcesToTest = formData.dataSources.filter((source: any) => {
                                const mapping = sourceMappings.find((m: RSSSourceMapping) => m.sourceId === source.id);
                                return mapping?.enabled && !source.fields?.length && !sampleData[source.id];
                              });

                              if (enabledSourcesToTest.length === 0) return;

                              setTestingSource('all');
                              let successCount = 0;
                              let failCount = 0;

                              for (const source of enabledSourcesToTest) {
                                try {
                                  if (onTestDataSource) {
                                    await onTestDataSource(source);
                                    successCount++;
                                    setAutoSelectSourceId(source.id);
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                  }
                                } catch (error) {
                                  failCount++;
                                  console.error(`Failed to test ${source.name}:`, error);
                                }
                              }

                              setTestingSource(null);

                              toast({
                                title: 'Bulk test complete',
                                description: `Successfully tested ${successCount} source(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
                                variant: failCount > 0 ? 'destructive' : 'default',
                              });
                            }}
                            disabled={testingSource !== null}
                          >
                            {testingSource === 'all' ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <Search className="w-4 h-4 mr-2" />
                                Test & Discover Enabled
                              </>
                            )}
                          </Button>
                        )}
                        <Badge variant={enabledSourcesCount > 0 ? "default" : "secondary"}>
                          {enabledSourcesCount} of {formData.dataSources.length} sources enabled
                        </Badge>
                      </div>
                    </div>

                    <Alert className="mb-4 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <AlertDescription className="flex-1">
                        Enable and configure each data source that will contribute items to your RSS feed.
                        You can combine multiple sources with different schemas.
                      </AlertDescription>
                    </Alert>

                    {formData.dataSources.map((source: any, index: number) => {
                      const mapping = sourceMappings.find((m: RSSSourceMapping) => m.sourceId === source.id) || sourceMappings[index];
                      const isExpanded = expandedSources.has(source.id);
                      const hasFields = source.fields?.length > 0 || sampleData[source.id];

                      return (
                        <Card key={source.id} className="mb-3">
                          <CardContent className="p-4">
                            {/* Source Header with Toggle */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Switch
                                  checked={mapping.enabled}
                                  onCheckedChange={(checked) => {
                                    updateSourceMapping(source.id, { enabled: checked });
                                    // Auto-expand when enabled
                                    if (checked) {
                                      setExpandedSources((prev: Set<string>) => new Set(prev).add(source.id));

                                      // Auto-select first array path when enabling in create mode
                                      if (isCreateMode && (sampleData as Record<string, any>)[source.id] && !mapping.itemsPath) {
                                        setAutoSelectSourceId(source.id);
                                      }
                                    }
                                  }}
                                />
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{source.name}</span>
                                  <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                                    {source.type}
                                  </Badge>
                                  {mapping.enabled && mapping.itemsPath && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Configured
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleSourceExpansion(source.id)}
                                  disabled={!mapping.enabled}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Expanded Configuration */}
                            {isExpanded && mapping.enabled && (
                              <div className="space-y-4 mt-4 border-t pt-4">
                                {!hasFields ? (
                                  <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Field discovery needed</AlertTitle>
                                    <AlertDescription>
                                      Test this data source first to discover available fields.
                                      <Button
                                        className="mt-2"
                                        size="sm"
                                        onClick={() => testDataSource(source)}
                                        disabled={testingSource === source.id}
                                      >
                                        {testingSource === source.id ? (
                                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                          <Search className="w-4 h-4 mr-2" />
                                        )}
                                        Test & Discover
                                      </Button>
                                    </AlertDescription>
                                  </Alert>
                                ) : (
                                  <>
                                    {/* Items Path Selection */}
                                    {sampleData[source.id] && (
                                      <div className="mb-4">
                                        <JsonPathSelector
                                          data={sampleData[source.id]}
                                          onSelectItemsPath={(path) => updateSourceMapping(source.id, { itemsPath: path })}
                                          selectedItemsPath={mapping.itemsPath}
                                          autoSelect={autoSelectSourceId === source.id}
                                        />
                                      </div>
                                    )}

                                    {/* Field Mappings */}
                                    {mapping.itemsPath && (
                                      <div>
                                        <h5 className="font-medium mb-3 text-sm">Field Mappings for {source.name}</h5>

                                        <div className="space-y-3">
                                          <div className="space-y-2">
                                            <Label className="text-sm">Title Field *</Label>
                                            <SingleSourceFieldSelector
                                              sourcePath={mapping.itemsPath}
                                              sourceId={source.id}
                                              sampleData={sampleData[source.id]}
                                              value={mapping.fieldMappings.title}
                                              onChange={(value) => updateFieldMapping(source.id, 'title', value)}
                                              placeholder="Select title field..."
                                            />
                                          </div>

                                          <div className="space-y-2">
                                            <Label className="text-sm">Description Field *</Label>
                                            <SingleSourceFieldSelector
                                              sourcePath={mapping.itemsPath}
                                              sourceId={source.id}
                                              sampleData={sampleData[source.id]}
                                              value={mapping.fieldMappings.description}
                                              onChange={(value) => updateFieldMapping(source.id, 'description', value)}
                                              placeholder="Select description field..."
                                            />
                                          </div>

                                          <div className="space-y-2">
                                            <Label className="text-sm">Link Field *</Label>
                                            <SingleSourceFieldSelector
                                              sourcePath={mapping.itemsPath}
                                              sourceId={source.id}
                                              sampleData={sampleData[source.id]}
                                              value={mapping.fieldMappings.link}
                                              onChange={(value) => updateFieldMapping(source.id, 'link', value)}
                                              placeholder="Select link field..."
                                            />
                                          </div>

                                          <div className="space-y-2">
                                            <Label className="text-sm">Publication Date Field</Label>
                                            <SingleSourceFieldSelector
                                              sourcePath={mapping.itemsPath}
                                              sourceId={source.id}
                                              sampleData={sampleData[source.id]}
                                              value={mapping.fieldMappings.pubDate || ''}
                                              onChange={(value) => updateFieldMapping(source.id, 'pubDate', value)}
                                              placeholder="Select date field (optional)..."
                                            />
                                          </div>

                                          <div className="space-y-2">
                                            <Label className="text-sm">GUID Field</Label>
                                            <SingleSourceFieldSelector
                                              sourcePath={mapping.itemsPath}
                                              sourceId={source.id}
                                              sampleData={sampleData[source.id]}
                                              value={mapping.fieldMappings.guid || ''}
                                              onChange={(value) => updateFieldMapping(source.id, 'guid', value)}
                                              placeholder="Select unique ID field (optional)..."
                                            />
                                          </div>

                                          <div className="space-y-2">
                                            <Label className="text-sm">Author Field</Label>
                                            <SingleSourceFieldSelector
                                              sourcePath={mapping.itemsPath}
                                              sourceId={source.id}
                                              sampleData={sampleData[source.id]}
                                              value={mapping.fieldMappings.author || ''}
                                              onChange={(value) => updateFieldMapping(source.id, 'author', value)}
                                              placeholder="Select author field (optional)..."
                                            />
                                          </div>

                                          <div className="space-y-2">
                                            <Label className="text-sm">Category Field</Label>
                                            <SingleSourceFieldSelector
                                              sourcePath={mapping.itemsPath}
                                              sourceId={source.id}
                                              sampleData={sampleData[source.id]}
                                              value={mapping.fieldMappings.category || ''}
                                              onChange={(value) => updateFieldMapping(source.id, 'category', value)}
                                              placeholder="Select category field (optional)..."
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Merge Strategy - Only show when multiple sources are enabled */}
                  {enabledSourcesCount > 1 && (
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle className="text-base">Merge Strategy</CardTitle>
                        <CardDescription>Configure how items from multiple sources are combined</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <Label>How should items from multiple sources be combined?</Label>
                          <RadioGroup
                            value={formatOptions.mergeStrategy}
                            onValueChange={(v) => updateFormatOption('mergeStrategy', v)}
                            className="space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="sequential" id="sequential" className="border-2 border-gray-700" />
                              <Label htmlFor="sequential" className="font-normal cursor-pointer">
                                Sequential - Append sources one after another
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="chronological" id="chronological" className="border-2 border-gray-700" />
                              <Label htmlFor="chronological" className="font-normal cursor-pointer">
                                Chronological - Sort by publication date (requires pubDate mapping)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="interleaved" id="interleaved" className="border-2 border-gray-700" />
                              <Label htmlFor="interleaved" className="font-normal cursor-pointer">
                                Interleaved - Alternate between sources evenly
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="priority" id="priority" className="border-2 border-gray-700" />
                              <Label htmlFor="priority" className="font-normal cursor-pointer">
                                Priority - Order by source priority (order above)
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {formatOptions.mergeStrategy === 'chronological' && (
                          <Alert className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <AlertDescription className="flex-1">
                              Ensure all enabled sources have a publication date field mapped for proper chronological sorting.
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="max-per-source">Max Items Per Source</Label>
                            <Input
                              id="max-per-source"
                              type="number"
                              min={0}
                              value={formatOptions.maxItemsPerSource}
                              onChange={(e) => updateFormatOption('maxItemsPerSource', parseInt(e.target.value) || 0)}
                              placeholder="0 = unlimited"
                            />
                            <p className="text-xs text-muted-foreground">0 means unlimited items from each source</p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="max-total">Total Max Items</Label>
                            <Input
                              id="max-total"
                              type="number"
                              min={0}
                              value={formatOptions.maxTotalItems}
                              onChange={(e) => updateFormatOption('maxTotalItems', parseInt(e.target.value) || 0)}
                              placeholder="0 = unlimited"
                            />
                            <p className="text-xs text-muted-foreground">0 means no limit on total items</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Live RSS Preview - Show when at least one source is enabled */}
                  {enabledSourcesCount > 0 && (
                    <MultiSourceRSSPreview
                      sourceMappings={sourceMappings.filter((m: RSSSourceMapping) => m.enabled)}
                      sampleData={sampleData as Record<string, any>}
                      channelInfo={{
                        title: formatOptions.channelTitle,
                        description: formatOptions.channelDescription,
                        link: formatOptions.channelLink
                      }}
                      mergeStrategy={formatOptions.mergeStrategy || 'sequential'}
                      dataSources={formData.dataSources || []}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {format === 'ATOM' && (
            <div className="space-y-4">
              {/* Feed Metadata */}
              <div className="space-y-2">
                <Label htmlFor="feed-id">Feed ID (unique URI) *</Label>
                <Input
                  id="feed-id"
                  value={formatOptions.feedId}
                  onChange={(e) => updateFormatOption('feedId', e.target.value)}
                  placeholder="https://example.com/feed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feed-title">Feed Title *</Label>
                <Input
                  id="feed-title"
                  value={formatOptions.feedTitle}
                  onChange={(e) => updateFormatOption('feedTitle', e.target.value)}
                  placeholder="My Atom Feed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feed-subtitle">Feed Subtitle</Label>
                <Textarea
                  id="feed-subtitle"
                  value={formatOptions.feedSubtitle}
                  onChange={(e) => updateFormatOption('feedSubtitle', e.target.value)}
                  placeholder="Description of your feed"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feed-link">Feed Link</Label>
                <Input
                  id="feed-link"
                  value={formatOptions.feedLink}
                  onChange={(e) => updateFormatOption('feedLink', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author-name">Author Name</Label>
                <Input
                  id="author-name"
                  value={formatOptions.authorName}
                  onChange={(e) => updateFormatOption('authorName', e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author-email">Author Email</Label>
                <Input
                  id="author-email"
                  value={formatOptions.authorEmail}
                  onChange={(e) => updateFormatOption('authorEmail', e.target.value)}
                  placeholder="john@example.com"
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Entry Field Mappings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="id-field">ID Field *</Label>
                    <Select
                      value={formatOptions.idField}
                      onValueChange={(v) => updateFormatOption('idField', v)}
                    >
                      <SelectTrigger id="id-field">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAllFields().map(field => (
                          <SelectItem key={field} value={field}>{field}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="atom-title-field">Title Field *</Label>
                    <Select
                      value={formatOptions.titleField}
                      onValueChange={(v) => updateFormatOption('titleField', v)}
                    >
                      <SelectTrigger id="atom-title-field">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAllFields().map(field => (
                          <SelectItem key={field} value={field}>{field}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="summary-field">Summary Field *</Label>
                    <Select
                      value={formatOptions.summaryField}
                      onValueChange={(v) => updateFormatOption('summaryField', v)}
                    >
                      <SelectTrigger id="summary-field">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAllFields().map(field => (
                          <SelectItem key={field} value={field}>{field}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="atom-content-field">Content Field</Label>
                    <Select
                      value={formatOptions.contentField || '__none__'}
                      onValueChange={(v) => updateFormatOption('contentField', v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger id="atom-content-field">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {getAllFields().map(field => (
                          <SelectItem key={field} value={field}>{field}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="atom-link-field">Link Field</Label>
                    <Select
                      value={formatOptions.linkField || '__none__'}
                      onValueChange={(v) => updateFormatOption('linkField', v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger id="atom-link-field">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {getAllFields().map(field => (
                          <SelectItem key={field} value={field}>{field}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="updated-field">Updated Date Field</Label>
                    <Select
                      value={formatOptions.updatedField || '__none__'}
                      onValueChange={(v) => updateFormatOption('updatedField', v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger id="updated-field">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {getAllFields().map(field => (
                          <SelectItem key={field} value={field}>{field}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="published-field">Published Date Field</Label>
                    <Select
                      value={formatOptions.publishedField || '__none__'}
                      onValueChange={(v) => updateFormatOption('publishedField', v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger id="published-field">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {getAllFields().map(field => (
                          <SelectItem key={field} value={field}>{field}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categories-field">Categories Field</Label>
                    <Select
                      value={formatOptions.categoriesField || '__none__'}
                      onValueChange={(v) => updateFormatOption('categoriesField', v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger id="categories-field">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {getAllFields().map(field => (
                          <SelectItem key={field} value={field}>{field}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {format === 'CSV' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delimiter">Delimiter</Label>
                <Select
                  value={formatOptions.delimiter}
                  onValueChange={(v) => updateFormatOption('delimiter', v)}
                >
                  <SelectTrigger id="delimiter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=",">Comma (,)</SelectItem>
                    <SelectItem value=";">Semicolon (;)</SelectItem>
                    <SelectItem value="\t">Tab</SelectItem>
                    <SelectItem value="|">Pipe (|)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="headers"
                  checked={formatOptions.includeHeaders}
                  onCheckedChange={(v) => updateFormatOption('includeHeaders', v)}
                />
                <Label htmlFor="headers">Include headers</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="quote"
                  checked={formatOptions.quoteStrings}
                  onCheckedChange={(v) => updateFormatOption('quoteStrings', v)}
                />
                <Label htmlFor="quote">Quote strings</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="line-ending">Line Ending</Label>
                <Select
                  value={formatOptions.lineEnding}
                  onValueChange={(v) => updateFormatOption('lineEnding', v)}
                >
                  <SelectTrigger id="line-ending">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LF">LF (Unix/Mac)</SelectItem>
                    <SelectItem value="CRLF">CRLF (Windows)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default OutputFormatStep;
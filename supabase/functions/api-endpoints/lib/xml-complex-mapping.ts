// ===== lib/xml-complex-mapping.ts =====
// Complex field mapping logic for XML with element/attribute support
import { fetchDataFromSource } from "./data-fetcher.ts";
import { applyTransformationPipeline } from "./transformations.ts";
import { getValueFromPath } from "./transformations.ts";
import { deepCleanObject } from "./utils.ts";
import { escapeXML } from "./utils.ts";

interface XmlMappingConfig {
  sourceSelection: {
    type: string;
    primaryPath: string;
    sources: Array<{
      id: string;
      name: string;
      primaryPath?: string;
    }>;
    unwrapSingleItems?: boolean;
  };
  outputTemplate: {
    structure: any;
    fields: XmlOutputField[];
    rootElement: string;
    itemElement?: string;
  };
  fieldMappings: XmlFieldMapping[];
  transformations?: any[];
  outputWrapper?: {
    enabled: boolean;
    rootElement: string;
    namespace?: string;
    namespacePrefix?: string;
    includeDeclaration: boolean;
    encoding: string;
    version: string;
    includeMetadata: boolean;
    metadataFields?: {
      timestamp?: boolean;
      source?: boolean;
      count?: boolean;
      version?: boolean;
    };
  };
}

interface XmlOutputField {
  path: string;
  name: string;
  elementName: string;
  type: string;
  xmlType: 'element' | 'attribute';
  parentElement?: string;
  required?: boolean;
  defaultValue?: any;
  cdata?: boolean;
}

interface XmlFieldMapping {
  id: string;
  targetPath: string;
  targetElementName: string;
  xmlType: 'element' | 'attribute';
  sourcePath: string;
  sourceId?: string;
  sourceName?: string;
  fallbackValue?: any;
  cdata?: boolean;
}

export async function applyXmlComplexMapping(
  endpoint: any,
  dataSources: any[],
  mappingConfig: XmlMappingConfig,
  supabase: any,
  queryParams: Record<string, string> = {}
): Promise<string> {
  console.log("XML Complex Mapping Config:", {
    hasFieldMappings: !!mappingConfig?.fieldMappings?.length,
    fieldMappingCount: mappingConfig?.fieldMappings?.length || 0,
    hasOutputTemplate: !!mappingConfig?.outputTemplate,
    rootElement: mappingConfig?.outputTemplate?.rootElement,
    itemElement: mappingConfig?.outputTemplate?.itemElement
  });

  if (!mappingConfig?.fieldMappings?.length) {
    console.error("No field mappings configured for XML");
    return generateErrorXml("No field mappings configured");
  }

  const sources = mappingConfig.sourceSelection?.sources || [];
  const wrapperConfig = mappingConfig.outputWrapper;
  const templateConfig = mappingConfig.outputTemplate;

  // Get configuration values - defaults are "data" for root and "item" for children
  const rootElement = wrapperConfig?.rootElement || templateConfig?.rootElement || "data";
  const itemElement = templateConfig?.itemElement || "item";
  const includeDeclaration = wrapperConfig?.includeDeclaration !== false;
  const encoding = wrapperConfig?.encoding || "UTF-8";
  const version = wrapperConfig?.version || "1.0";
  const namespace = wrapperConfig?.namespace || "";
  const namespacePrefix = wrapperConfig?.namespacePrefix || "";

  // Fetch and process data from sources
  let allItems: any[] = [];

  for (const sourceConfig of sources) {
    const dataSource = dataSources.find(ds => ds.id === sourceConfig.id);
    if (!dataSource) {
      console.log(`Data source not found: ${sourceConfig.id}`);
      continue;
    }

    console.log(`Fetching data from source: ${dataSource.name}`);
    let sourceData = await fetchDataFromSource(dataSource, supabase, queryParams);

    if (!sourceData) {
      console.log(`No data from source: ${dataSource.name}`);
      continue;
    }

    // Apply transformations if configured
    if (endpoint.transform_config?.transformations?.length > 0) {
      console.log(`Applying transformations to source: ${dataSource.name}`);
      sourceData = await applyTransformationPipeline(
        sourceData,
        endpoint.transform_config,
        supabase
      );
    }

    // Navigate to primary path
    let dataToProcess = sourceData;
    const primaryPath = sourceConfig.primaryPath || mappingConfig.sourceSelection?.primaryPath;

    if (primaryPath) {
      console.log(`Navigating to path: ${primaryPath}`);
      dataToProcess = getValueFromPath(sourceData, primaryPath);
    }

    if (!dataToProcess) {
      console.log(`No data at path for source: ${dataSource.name}`);
      continue;
    }

    // Add items with source tracking
    if (Array.isArray(dataToProcess)) {
      dataToProcess.forEach((item) => {
        allItems.push({
          ...item,
          _sourceInfo: {
            id: dataSource.id,
            name: dataSource.name,
            type: dataSource.type,
            category: dataSource.category
          }
        });
      });
    } else if (typeof dataToProcess === "object") {
      allItems.push({
        ...dataToProcess,
        _sourceInfo: {
          id: dataSource.id,
          name: dataSource.name,
          type: dataSource.type,
          category: dataSource.category
        }
      });
    }
  }

  console.log(`Total items to map to XML: ${allItems.length}`);

  // Build XML string
  let xml = "";

  // XML declaration
  if (includeDeclaration) {
    xml += `<?xml version="${version}" encoding="${encoding}"?>\n`;
  }

  // Build root element with namespace
  let rootTag = namespacePrefix ? `${namespacePrefix}:${rootElement}` : rootElement;
  const nsAttributes: string[] = [];

  if (namespace) {
    if (namespacePrefix) {
      nsAttributes.push(`xmlns:${namespacePrefix}="${namespace}"`);
    } else {
      nsAttributes.push(`xmlns="${namespace}"`);
    }
  }

  const nsString = nsAttributes.length > 0 ? " " + nsAttributes.join(" ") : "";
  xml += `<${rootTag}${nsString}>\n`;

  // Add metadata if configured
  if (wrapperConfig?.includeMetadata) {
    xml += "  <metadata>\n";
    if (wrapperConfig.metadataFields?.timestamp !== false) {
      xml += `    <timestamp>${new Date().toISOString()}</timestamp>\n`;
    }
    if (wrapperConfig.metadataFields?.source !== false && sources.length > 0) {
      xml += `    <source>${escapeXML(sources[0].name || "")}</source>\n`;
    }
    if (wrapperConfig.metadataFields?.count !== false) {
      xml += `    <count>${allItems.length}</count>\n`;
    }
    if (wrapperConfig.metadataFields?.version) {
      xml += `    <version>1.0.0</version>\n`;
    }
    xml += "  </metadata>\n";
  }

  // Map each item
  for (const item of allItems) {
    xml += generateMappedItemXml(
      item,
      mappingConfig.fieldMappings,
      templateConfig?.fields || [],
      itemElement,
      "  "
    );
  }

  // Close root element
  xml += `</${rootTag}>`;

  return xml;
}

/**
 * Generate XML for a single mapped item with element/attribute support
 */
function generateMappedItemXml(
  item: any,
  fieldMappings: XmlFieldMapping[],
  templateFields: XmlOutputField[],
  itemElement: string,
  indent: string
): string {
  // Build a map of field configurations for easy lookup
  const fieldConfigMap = new Map<string, XmlOutputField>();
  templateFields.forEach(field => {
    fieldConfigMap.set(field.path, field);
  });

  // Get the source ID for this item
  const itemSourceId = item._sourceInfo?.id;

  // Group mappings by target path - only include mappings that match this item's source
  const mappedValues: Map<string, { value: any; mapping: XmlFieldMapping; fieldConfig?: XmlOutputField }> = new Map();

  // First, group all mappings by targetPath
  const mappingsByTarget: Record<string, XmlFieldMapping[]> = {};
  for (const mapping of fieldMappings) {
    if (!mappingsByTarget[mapping.targetPath]) {
      mappingsByTarget[mapping.targetPath] = [];
    }
    mappingsByTarget[mapping.targetPath].push(mapping);
  }

  // For each target, find the mapping that matches this item's source
  for (const [targetPath, mappings] of Object.entries(mappingsByTarget)) {
    // Find a mapping that matches this item's source ID
    const matchingMapping = mappings.find((m: XmlFieldMapping) =>
      m.sourceId === itemSourceId
    ) || mappings.find((m: XmlFieldMapping) =>
      // Fallback: if no sourceId match, try one without sourceId
      !m.sourceId
    );

    if (!matchingMapping) {
      continue; // No matching mapping for this source
    }

    let value: any;

    // Handle metadata fields
    if (matchingMapping.sourcePath.startsWith("_source.")) {
      const metaField = matchingMapping.sourcePath.substring(8);
      value = item._sourceInfo?.[metaField];
    } else {
      // Get value from source path
      let adjustedPath = matchingMapping.sourcePath;

      // Strip leading array notation if present
      if (adjustedPath.startsWith('[*].')) {
        adjustedPath = adjustedPath.substring(4);
      } else if (adjustedPath.startsWith('[0].')) {
        adjustedPath = adjustedPath.substring(4);
      }

      value = getValueFromPath(item, adjustedPath);
    }

    // Apply fallback if value is missing
    if (value === undefined || value === null) {
      value = matchingMapping.fallbackValue;
    }

    // Get field configuration
    const fieldConfig = fieldConfigMap.get(targetPath);

    mappedValues.set(targetPath, {
      value,
      mapping: matchingMapping,
      fieldConfig
    });
  }

  // Separate attributes and elements
  const attributes: Array<{ name: string; value: any }> = [];
  const elements: Array<{ name: string; value: any; cdata: boolean }> = [];

  for (const [targetPath, data] of mappedValues) {
    const { value, mapping, fieldConfig } = data;

    // Determine if this is an attribute or element
    const xmlType = mapping.xmlType || fieldConfig?.xmlType || 'element';
    const elementName = mapping.targetElementName || fieldConfig?.elementName || targetPath;
    const useCdata = mapping.cdata || fieldConfig?.cdata || false;

    if (xmlType === 'attribute') {
      attributes.push({ name: elementName, value });
    } else {
      elements.push({ name: elementName, value, cdata: useCdata });
    }
  }

  // Build the item XML
  let xml = indent + `<${itemElement}`;

  // Add attributes
  for (const attr of attributes) {
    if (attr.value !== undefined && attr.value !== null) {
      xml += ` ${attr.name}="${escapeXML(String(attr.value))}"`;
    }
  }

  xml += ">\n";

  // Add elements
  for (const elem of elements) {
    const elemIndent = indent + "  ";
    const value = elem.value;

    if (value === undefined || value === null) {
      // Skip undefined/null elements or use empty element
      continue;
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      // Nested object - recursively generate
      xml += elemIndent + `<${elem.name}>\n`;
      xml += objectToXmlElements(value, elemIndent + "  ");
      xml += elemIndent + `</${elem.name}>\n`;
    } else if (Array.isArray(value)) {
      // Array - generate multiple elements
      for (const arrayItem of value) {
        if (typeof arrayItem === "object") {
          xml += elemIndent + `<${elem.name}>\n`;
          xml += objectToXmlElements(arrayItem, elemIndent + "  ");
          xml += elemIndent + `</${elem.name}>\n`;
        } else {
          xml += elemIndent + `<${elem.name}>`;
          if (elem.cdata) {
            xml += `<![CDATA[${arrayItem}]]>`;
          } else {
            xml += escapeXML(String(arrayItem));
          }
          xml += `</${elem.name}>\n`;
        }
      }
    } else {
      // Primitive value
      xml += elemIndent + `<${elem.name}>`;
      if (elem.cdata) {
        xml += `<![CDATA[${value}]]>`;
      } else {
        xml += escapeXML(String(value));
      }
      xml += `</${elem.name}>\n`;
    }
  }

  xml += indent + `</${itemElement}>\n`;

  return xml;
}

/**
 * Convert a plain object to XML elements (for nested objects)
 */
function objectToXmlElements(obj: any, indent: string): string {
  if (!obj || typeof obj !== "object") {
    return "";
  }

  let xml = "";

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;

    // Sanitize key for XML
    const validKey = key.replace(/[^a-zA-Z0-9_\-:.]/g, "_");

    if (typeof value === "object" && !Array.isArray(value)) {
      xml += indent + `<${validKey}>\n`;
      xml += objectToXmlElements(value, indent + "  ");
      xml += indent + `</${validKey}>\n`;
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "object") {
          xml += indent + `<${validKey}>\n`;
          xml += objectToXmlElements(item, indent + "  ");
          xml += indent + `</${validKey}>\n`;
        } else {
          xml += indent + `<${validKey}>${escapeXML(String(item))}</${validKey}>\n`;
        }
      }
    } else {
      xml += indent + `<${validKey}>${escapeXML(String(value))}</${validKey}>\n`;
    }
  }

  return xml;
}

/**
 * Generate error XML response
 */
function generateErrorXml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<error>
  <message>${escapeXML(message)}</message>
  <timestamp>${new Date().toISOString()}</timestamp>
</error>`;
}

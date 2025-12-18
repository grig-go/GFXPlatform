// XML Mapping specific types

export interface XmlMappingConfig {
  sourceSelection: XmlSourceSelection;
  outputTemplate: XmlOutputTemplate;
  fieldMappings: XmlFieldMapping[];
  transformations: XmlMappingTransformation[];
  outputWrapper?: XmlOutputWrapperConfig;
}

export interface XmlOutputWrapperConfig {
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
    [key: string]: boolean | undefined;
  };
}

export interface XmlSourceSelection {
  type: 'array' | 'object' | 'mixed';
  primaryPath: string;
  sources: XmlDataSourceSelection[];
  unwrapSingleItems?: boolean;
}

export interface XmlDataSourceSelection {
  id: string;
  name: string;
  path: string;
  category: string;
  primaryPath: string;
  alias?: string;
  type: 'array' | 'object';
}

export interface XmlOutputTemplate {
  structure: any; // The XML structure template as JSON representation
  fields: XmlOutputField[];
  rootElement: string;
  itemElement?: string; // Element name for array items
}

export interface XmlOutputField {
  path: string;
  name: string; // Display name
  elementName: string; // Actual XML element/attribute name
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  xmlType: 'element' | 'attribute'; // Whether this field is an XML element or attribute
  parentElement?: string; // Parent element path for attributes
  required?: boolean;
  defaultValue?: any;
  description?: string;
  cdata?: boolean; // Wrap content in CDATA section
}

export interface XmlFieldMapping {
  id: string;
  targetPath: string;
  targetElementName: string;
  xmlType: 'element' | 'attribute';
  sourcePath: string;
  sourceId?: string;
  sourceName?: string;
  sourceCategory?: string;
  sourceType?: string;
  sourceTimestamp?: string;
  transformId?: string;
  fallbackValue?: any;
  conditional?: XmlMappingCondition;
  cdata?: boolean;
}

export interface XmlMappingCondition {
  type: 'simple' | 'complex';
  when: string; // Field path to check
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'greater_than'
    | 'less_than'
    | 'exists'
    | 'not_exists';
  value?: any;
  then: any;
  else?: any;
}

export interface XmlMappingTransformation {
  id: string;
  name: string;
  type: XmlTransformationType;
  config: Record<string, any>;
}

export type XmlTransformationType =
  | 'concatenate'
  | 'split'
  | 'uppercase'
  | 'lowercase'
  | 'capitalize'
  | 'trim'
  | 'substring'
  | 'replace'
  | 'date_format'
  | 'date_add'
  | 'number_format'
  | 'parse_json'
  | 'stringify'
  | 'calculate'
  | 'lookup'
  | 'custom'
  | 'round'
  | 'ceil'
  | 'floor'
  | 'xml_escape'
  | 'cdata_wrap';

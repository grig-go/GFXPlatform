// Internal component prop types for XmlFieldMapper
import { XmlMappingConfig, XmlFieldMapping } from '../../types/xmlMapping.types';

export interface XmlFieldMapperProps {
  dataSources: any[];
  sampleData?: Record<string, any>;
  initialConfig?: XmlMappingConfig;
  onChange: (config: XmlMappingConfig) => void;
  onTest?: () => void;
  onTestDataSource?: (source: any) => Promise<void>;
}

export interface XmlSourceSelectorProps {
  dataSources: any[];
  sampleData: Record<string, any>;
  selection: any;
  onChange: (selection: any) => void;
  onNext: () => void;
  onTestDataSource?: (source: any) => Promise<void>;
}

export interface XmlOutputTemplateBuilderProps {
  template: any;
  sourceSelection: any;
  sampleData: Record<string, any>;
  onChange: (template: any) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export interface XmlFieldMappingCanvasProps {
  sourceSelection: any;
  outputTemplate: any;
  mappings: XmlFieldMapping[];
  transformations: any[];
  sampleData: Record<string, any>;
  onChange: (mappings: XmlFieldMapping[]) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export interface XmlMappingPreviewProps {
  config: XmlMappingConfig;
  sampleData: Record<string, any>;
  onTest?: () => void;
  onPrevious: () => void;
}

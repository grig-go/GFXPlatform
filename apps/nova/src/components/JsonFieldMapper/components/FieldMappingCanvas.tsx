import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Separator } from '../../ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip';
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  Link2,
  X,
  Info,
  Grid,
  Layers,
  GripVertical,
  Cloud,
  Database,
  FileText,
  Folder,
  List,
  AlertCircle
} from 'lucide-react';
import { JsonFieldMapping } from '../../../types/jsonMapping.types';
import { extractFields } from '../utils/fieldExtraction';

interface FieldMappingCanvasProps {
  sourceSelection: any;
  outputTemplate: any;
  mappings: JsonFieldMapping[];
  transformations: any[];
  sampleData: Record<string, any>;
  onChange: (mappings: JsonFieldMapping[]) => void;
  onNext: () => void;
  onPrevious: () => void;
}

interface SourceField {
  path: string;
  name: string;
  type: string;
  value?: any;
  isMetadata?: boolean;
  category?: string;
  sourceId: string;
  sourceName: string;
  hasWildcard?: boolean;
  arrayLength?: number;
}

interface MappingWithConfig extends JsonFieldMapping {
  arrayConfig?: string;
}

export const FieldMappingCanvas: React.FC<FieldMappingCanvasProps> = ({
  sourceSelection,
  outputTemplate,
  mappings,
  transformations: _transformations,
  sampleData,
  onChange,
  onNext,
  onPrevious
}) => {
  const [draggedField, setDraggedField] = useState<any>(null);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(() =>
    new Set(sourceSelection.sources.map((s: any) => s.id))
  );
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Refs for scroll restoration
  const savedScrollPosition = useRef<number>(0);
  const outputFieldsContainerRef = useRef<HTMLDivElement | null>(null);
  const hasRestoredScrollForCurrentDrag = useRef<boolean>(false);
  const savedContentHeight = useRef<number | null>(null);

  // Persist UI preferences in localStorage to match nova-old behavior
  const [viewMode, setViewMode] = useState<'side-by-side' | 'floating'>(() => {
    const saved = localStorage.getItem('jsonMapper.viewMode');
    return (saved as 'side-by-side' | 'floating') || 'side-by-side';
  });

  const [showMiniMap, setShowMiniMap] = useState(() => {
    const saved = localStorage.getItem('jsonMapper.showMiniMap');
    return saved ? JSON.parse(saved) : false;
  });

  const [expandedConfigs, setExpandedConfigs] = useState<Set<string>>(new Set());

  const [debugMode, setDebugMode] = useState(() => {
    const saved = localStorage.getItem('jsonMapper.debugMode');
    return saved ? JSON.parse(saved) : false;
  });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Save UI preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('jsonMapper.viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('jsonMapper.showMiniMap', JSON.stringify(showMiniMap));
  }, [showMiniMap]);

  useEffect(() => {
    localStorage.setItem('jsonMapper.debugMode', JSON.stringify(debugMode));
  }, [debugMode]);

  // Restore scroll position immediately when draggedField changes (when drag starts)
  useEffect(() => {
    if (draggedField && outputFieldsContainerRef.current) {
      // Use requestAnimationFrame to restore scroll immediately after render
      requestAnimationFrame(() => {
        if (outputFieldsContainerRef.current) {
          outputFieldsContainerRef.current.scrollTop = savedScrollPosition.current;
        }
      });
    }
  }, [draggedField]);

  // Listen for scroll events to save content height
  useEffect(() => {
    const container = outputFieldsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Save the scrollHeight whenever user scrolls
      if (container.scrollHeight) {
        savedContentHeight.current = container.scrollHeight;
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Also restore scroll when dragOverTarget changes (when reaching Output Fields)
  // Only restore if scroll position actually changed (jumped)
  // Use useLayoutEffect to restore BEFORE browser paints (invisible to user)
  useLayoutEffect(() => {
    if (dragOverTarget && outputFieldsContainerRef.current) {
      const scrollAfterRender = outputFieldsContainerRef.current.scrollTop;

      // Only restore if scroll actually jumped (changed by more than 5px)
      if (Math.abs(scrollAfterRender - savedScrollPosition.current) > 5) {
        outputFieldsContainerRef.current.scrollTop = savedScrollPosition.current;
      } else {
        // Update saved position to current position
        savedScrollPosition.current = scrollAfterRender;
      }
    }
  }, [dragOverTarget]);

  const mappingsWithIds = React.useMemo(() => {
    return mappings.map((m, index) => {
      if (!m.id) {
        const newId = `mapping_${m.targetPath}_${index}_${Date.now()}`;
        if (debugMode) {
          console.log(`[ID FIX] Generated ID for mapping without ID: ${newId} for target: ${m.targetPath}`);
        }
        return { ...m, id: newId };
      }
      return m;
    });
  }, [mappings, debugMode]);

  useEffect(() => {
    if (debugMode) {
      console.log('=== FieldMappingCanvas State Debug ===');
      console.log('Mappings:', mappingsWithIds.map(m => ({
        id: m.id,
        targetPath: m.targetPath,
        sourcePath: m.sourcePath,
        arrayConfig: (m as any).arrayConfig ? JSON.parse((m as any).arrayConfig) : null
      })));
      console.log('Expanded Configs Set:', Array.from(expandedConfigs));
      console.log('=====================================');
    }
  }, [mappingsWithIds, expandedConfigs, debugMode]);

  if (!sourceSelection || !sourceSelection.sources || sourceSelection.sources.length === 0) {
    return (
      <div className="field-mapping-canvas" ref={canvasRef}>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-16 h-16 text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Sources Selected</h3>
          <p className="text-gray-600 mb-4">Please go back and select data sources first.</p>
          <Button onClick={onPrevious}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!outputTemplate || !outputTemplate.fields || outputTemplate.fields.length === 0) {
    return (
      <div className="field-mapping-canvas" ref={canvasRef}>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-16 h-16 text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Output Fields Defined</h3>
          <p className="text-gray-600 mb-4">Please go back and define your output structure first.</p>
          <Button onClick={onPrevious}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const getAllSourceFields = (): Record<string, SourceField[]> => {
    const fieldsBySource: Record<string, SourceField[]> = {};

    sourceSelection.sources.forEach((source: any) => {
      const fields: SourceField[] = [];
      const processedPaths = new Set<string>();

      const metadataFields = [
        {
          path: '_source.id',
          name: 'Source ID',
          type: 'string',
          value: source.id,
          isMetadata: true,
          category: 'metadata',
          sourceId: source.id,
          sourceName: source.name
        },
        {
          path: '_source.name',
          name: 'Source Name',
          type: 'string',
          value: source.name,
          isMetadata: true,
          category: 'metadata',
          sourceId: source.id,
          sourceName: source.name
        },
        {
          path: '_source.timestamp',
          name: 'Timestamp',
          type: 'string',
          value: new Date().toISOString(),
          isMetadata: true,
          category: 'metadata',
          sourceId: source.id,
          sourceName: source.name
        },
        {
          path: '_source.category',
          name: 'Source Category',
          type: 'string',
          value: source.category,
          isMetadata: true,
          category: 'metadata',
          sourceId: source.id,
          sourceName: source.name
        }
      ];

      metadataFields.forEach(field => {
        if (!processedPaths.has(field.path)) {
          fields.push(field);
          processedPaths.add(field.path);
        }
      });

      if (sampleData[source.id]) {
        let dataToAnalyze = sampleData[source.id];

        if (source.primaryPath) {
          const parts = source.primaryPath.split('.');
          for (const part of parts) {
            if (dataToAnalyze && typeof dataToAnalyze === 'object') {
              dataToAnalyze = dataToAnalyze[part];
            }
          }
        }

        const extracted = extractFields(dataToAnalyze, '', {
          includeWildcards: true,
          includeFixedIndices: false,
          maxArrayIndices: 0,
          includeValues: true,
          maxDepth: 10
        });

        extracted.forEach(field => {
          if (field.type === 'info' || field.type === 'array' || field.type === 'object' || field.type === 'array-iterator') {
            return;
          }

          let cleanPath = field.path;
          if (source.primaryPath && Array.isArray(dataToAnalyze)) {
            if (cleanPath.startsWith('[*].')) {
              cleanPath = cleanPath.substring(4);
            }
          }

          const hasWildcard = cleanPath.includes('[*]');

          let arrayLength = undefined;
          if (hasWildcard) {
            const pathParts = cleanPath.split('[*]')[0].split('.');
            let arrayData = dataToAnalyze;

            if (Array.isArray(dataToAnalyze) && pathParts[0] && dataToAnalyze[0]) {
              arrayData = dataToAnalyze[0];
            }

            for (const part of pathParts) {
              if (part && arrayData && typeof arrayData === 'object') {
                arrayData = arrayData[part];
              }
            }

            if (Array.isArray(arrayData)) {
              arrayLength = arrayData.length;
            }
          }

          if (!processedPaths.has(cleanPath)) {
            const sourceField: SourceField = {
              path: cleanPath,
              name: field.name || cleanPath,
              type: field.type,
              value: field.value,
              category: 'data',
              isMetadata: false,
              sourceId: source.id,
              sourceName: source.name,
              hasWildcard: hasWildcard,
              arrayLength: arrayLength
            };

            fields.push(sourceField);
            processedPaths.add(cleanPath);
          }
        });
      }

      fieldsBySource[source.id] = fields;
    });

    return fieldsBySource;
  };

  const fieldsBySource = getAllSourceFields();

  const handleDragStart = (e: React.DragEvent, field: SourceField) => {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('application/json', JSON.stringify(field));
    }

    // Save current scroll position when drag starts
    if (outputFieldsContainerRef.current) {
      savedScrollPosition.current = outputFieldsContainerRef.current.scrollTop;
    }

    // Reset the restoration flag for this new drag operation
    hasRestoredScrollForCurrentDrag.current = false;

    setDraggedField(field);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();

    // Save scroll position before clearing drag state (which will cause re-render)
    const scrollBeforeEnd = outputFieldsContainerRef.current?.scrollTop || 0;

    // Clear the saved content height to allow natural height
    savedContentHeight.current = null;

    setDraggedField(null);
    setDragOverTarget(null);

    // Restore scroll position after the state change
    requestAnimationFrame(() => {
      if (outputFieldsContainerRef.current) {
        outputFieldsContainerRef.current.scrollTop = scrollBeforeEnd;
      }
    });

    // Reset the restoration flag for the next drag operation
    hasRestoredScrollForCurrentDrag.current = false;
  };

  const handleDragOver = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    setDragOverTarget(targetPath);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();

    // Save scroll position before clearing dragOverTarget (which will cause re-render)
    const scrollBeforeLeave = outputFieldsContainerRef.current?.scrollTop || 0;

    setDragOverTarget(null);

    // Restore scroll position after the state change
    requestAnimationFrame(() => {
      if (outputFieldsContainerRef.current) {
        outputFieldsContainerRef.current.scrollTop = scrollBeforeLeave;
      }
    });
  };

  const handleDrop = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();

    // Save scroll position before clearing dragOverTarget (which will cause re-render)
    const scrollBeforeDrop = outputFieldsContainerRef.current?.scrollTop || 0;

    // Clear the saved content height to allow natural height
    savedContentHeight.current = null;

    setDragOverTarget(null);

    // Restore scroll position after the state change
    requestAnimationFrame(() => {
      if (outputFieldsContainerRef.current) {
        outputFieldsContainerRef.current.scrollTop = scrollBeforeDrop;
      }
    });

    // Try to get field from state first, then from dataTransfer
    let field = draggedField;
    if (!field && e.dataTransfer) {
      try {
        const data = e.dataTransfer.getData('application/json');
        if (data) {
          field = JSON.parse(data);
        }
      } catch (err) {
        console.error('Failed to parse drag data:', err);
      }
    }

    if (!field) return;

    const mappingId = `mapping_${targetPath.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${Math.round(Math.random() * 10000)}`;

    if (debugMode) {
      console.log(`[DROP] Creating new mapping with ID: ${mappingId}`);
      console.log(`[DROP] Target: ${targetPath}, Source: ${field.path}`);
    }

    // Save the original field path to check if it has wildcards
    const originalFieldPath = field.path;
    let sourcePath = field.path;
    let arrayConfig: any = null;

    if (sourcePath.includes('[')) {
      const arrayFields: string[] = [];

      const wildcardMatches = sourcePath.match(/(\w+)\[\*\]/g) || [];
      const indexMatches = sourcePath.match(/(\w+)\[\d+\]/g) || [];
      const allMatches = [...wildcardMatches, ...indexMatches];

      const fieldSet = new Set<string>();
      allMatches.forEach((match: string) => {
        const fieldName = match.replace(/\[\*\]|\[\d+\]/g, '');
        fieldSet.add(fieldName);
      });

      fieldSet.forEach(field => arrayFields.push(field));

      if (arrayFields.length > 0) {
        const indices: Record<string, number> = {};

        arrayFields.forEach(field => {
          const regex = new RegExp(`${field}\\[(\\d+)\\]`);
          const match = sourcePath.match(regex);
          if (match) {
            indices[field] = parseInt(match[1]);
          } else {
            if (field === 'competitors' && targetPath.toLowerCase().includes('away')) {
              indices[field] = 1;
            } else {
              indices[field] = 0;
            }
          }
        });

        // When dropping array fields, default to 'index' mode (specific index)
        // Users can change to 'array' mode if they want the entire array
        const hasWildcards = originalFieldPath.includes('[*]');
        // Always default to index mode for better UX
        const mappingModeToSet = 'index';

        console.log('[DROP] Creating arrayConfig:', {
          originalFieldPath,
          hasWildcards,
          mappingMode: mappingModeToSet,
          note: 'Defaulting to index mode for arrays'
        });

        arrayConfig = JSON.stringify({
          fields: arrayFields,
          indices: indices,
          expanded: false,
          templatePath: sourcePath.replace(/\[\d+\]/g, '[*]'),
          useWildcard: false,  // Default to index mode (not wildcard)
          mappingMode: mappingModeToSet
        });

        sourcePath = field.path;
        if (sourcePath.includes('[*]')) {
          Object.entries(indices).forEach(([fieldName, index]) => {
            sourcePath = sourcePath.replace(`${fieldName}[*]`, `${fieldName}[${index}]`);
          });
        }
      }
    }

    const newMapping: MappingWithConfig = {
      id: mappingId,
      sourceId: field.sourceId,
      sourceName: field.sourceName,
      sourcePath: sourcePath,
      targetPath: targetPath,
      arrayConfig: arrayConfig
    };

    const updatedMappings = mappingsWithIds.filter(m =>
      !(m.targetPath === targetPath && m.sourceId === field.sourceId)
    );

    updatedMappings.push(newMapping);

    onChange(updatedMappings);
    setDraggedField(null);
  };

  const updateMappingPath = (mappingId: string, fieldName: string, newIndex: number) => {
    if (debugMode) {
      console.log(`[UPDATE INDEX] Mapping: ${mappingId}, Field: ${fieldName}, New Index: ${newIndex}`);
    }

    const updatedMappings = mappingsWithIds.map(m => {
      if (m.id === mappingId) {
        const mapping = m as MappingWithConfig;

        if (debugMode) {
          console.log(`[UPDATE INDEX] Found mapping:`, {
            id: mapping.id,
            targetPath: mapping.targetPath,
            sourcePath: mapping.sourcePath,
            arrayConfig: mapping.arrayConfig
          });
        }

        if (mapping.arrayConfig) {
          const config = JSON.parse(mapping.arrayConfig);
          const oldIndex = config.indices[fieldName];
          config.indices[fieldName] = newIndex;

          let templatePath = config.templatePath || mapping.sourcePath.replace(/\[\d+\]/g, '[*]');

          let newPath = templatePath;
          Object.entries(config.indices).forEach(([field, index]) => {
            newPath = newPath.replace(`${field}[*]`, `${field}[${index}]`);
          });

          if (debugMode) {
            console.log(`[UPDATE INDEX] Changed ${fieldName} from ${oldIndex} to ${newIndex}`);
            console.log(`[UPDATE INDEX] New path: ${newPath}`);
            console.log(`[UPDATE INDEX] All indices:`, config.indices);
          }

          return {
            ...mapping,
            sourcePath: newPath,
            arrayConfig: JSON.stringify(config)
          };
        }
      }
      return m;
    });

    onChange(updatedMappings);
  };

  const toggleMappingExpanded = (mappingId: string) => {
    if (debugMode) {
      console.log(`[TOGGLE] Before - Mapping ID: ${mappingId}, Currently expanded:`, expandedConfigs.has(mappingId));
    }

    setExpandedConfigs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mappingId)) {
        newSet.delete(mappingId);
      } else {
        newSet.add(mappingId);
      }

      if (debugMode) {
        console.log(`[TOGGLE] After - Mapping ID: ${mappingId}, Now expanded:`, newSet.has(mappingId));
        console.log('[TOGGLE] All expanded:', Array.from(newSet));
      }

      return newSet;
    });
  };

  const removeMapping = (mappingId: string) => {
    onChange(mappingsWithIds.filter(m => m.id !== mappingId));
    setExpandedConfigs(prev => {
      const newSet = new Set(prev);
      newSet.delete(mappingId);
      return newSet;
    });
  };

  const toggleSourceExpanded = (sourceId: string) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(sourceId)) {
      newExpanded.delete(sourceId);
    } else {
      newExpanded.add(sourceId);
    }
    setExpandedSources(newExpanded);
  };

  const getMappingsForTarget = (targetPath: string) => {
    return mappingsWithIds.filter(m => m.targetPath === targetPath);
  };

  const ArrayIndexConfig: React.FC<{
    mapping: MappingWithConfig;
    config: any;
  }> = React.memo(({ mapping, config }) => {

    if (debugMode) {
      console.log(`[RENDER ArrayIndexConfig] Mapping ID: ${mapping.id}`);
      console.log(`[RENDER ArrayIndexConfig] Target: ${mapping.targetPath}`);
      console.log(`[RENDER ArrayIndexConfig] Config:`, config);
    }

    const [mappingMode, setMappingMode] = React.useState<'array' | 'index'>(
      config.mappingMode || 'index'
    );

    const getArrayLength = (fieldName: string): number => {
      try {
        const sourceData = sampleData[mapping.sourceId || ''];
        if (sourceData && sourceData[fieldName]) {
          return Array.isArray(sourceData[fieldName]) ? sourceData[fieldName].length : 10;
        }
      } catch (e) {}
      return 10;
    };

    const handleModeChange = (newMode: 'array' | 'index') => {
      setMappingMode(newMode);

      const updatedMappings = mappingsWithIds.map(m => {
        if (m.id === mapping.id) {
          let newSourcePath = config.templatePath;

          if (newMode === 'array') {
            newSourcePath = config.templatePath;
          } else {
            config.fields.forEach((field: string) => {
              const index = config.indices[field] || 0;
              newSourcePath = newSourcePath.replace(
                new RegExp(`${field}\\[\\*\\]`, 'g'),
                `${field}[${index}]`
              );
            });
          }

          const newConfig = {
            ...config,
            mappingMode: newMode,
            useWildcard: newMode === 'array'
          };

          return {
            ...m,
            sourcePath: newSourcePath,
            arrayConfig: JSON.stringify(newConfig)
          };
        }
        return m;
      });

      onChange(updatedMappings);
    };

    return (
      <Card className="mt-2 bg-gray-50">
        <CardContent className="p-3">
          <div className="flex justify-between items-center mb-3">
            <strong className="text-xs">Array Configuration - {mapping.targetPath}</strong>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (debugMode) {
                  console.log(`[CLOSE] Closing config for mapping: ${mapping.id}`);
                }
                toggleMappingExpanded(mapping.id);
              }}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          <div className="mb-3">
            <Label className="text-xs font-semibold mb-2 block">Mapping Mode:</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={mappingMode === 'array' ? 'default' : 'outline'}
                onClick={() => handleModeChange('array')}
                className="flex-1"
              >
                <List className="w-3 h-3 mr-1" />
                Map Entire Array
              </Button>
              <Button
                size="sm"
                variant={mappingMode === 'index' ? 'default' : 'outline'}
                onClick={() => handleModeChange('index')}
                className="flex-1"
              >
                Map Specific Index
              </Button>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {mappingMode === 'array'
                ? 'All array items will be mapped using [*] notation'
                : 'Select specific array indices to map'
              }
            </p>
          </div>

          {mappingMode === 'index' && (
            <>
              <p className="text-xs text-gray-500 mb-2">Mapping ID: {mapping.id}</p>

              {config.fields.map((field: string) => (
                <div key={`${mapping.id}_${field}_input`} className="flex items-center gap-2 mb-2">
                  <span className="text-xs min-w-[100px]">{field}</span>
                  <Input
                    type="number"
                    value={config.indices[field] || 0}
                    min={0}
                    max={getArrayLength(field) - 1}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (debugMode) {
                        console.log(`[INPUT CHANGE] Mapping: ${mapping.id}, Field: ${field}, Value: ${value}`);
                      }
                      updateMappingPath(mapping.id, field, value);
                    }}
                    className="h-7 w-16 text-xs"
                  />
                  <span className="text-xs text-gray-500">
                    max: {getArrayLength(field) - 1}
                  </span>
                </div>
              ))}
            </>
          )}

          <div className={`mt-2 p-2 rounded text-xs font-mono break-all ${
            mappingMode === 'array' ? 'bg-blue-50' : 'bg-green-50'
          }`}>
            <strong>Path: </strong>{mapping.sourcePath}
          </div>
        </CardContent>
      </Card>
    );
  });

  const renderSourceField = (field: SourceField) => {
    const isMapped = mappingsWithIds.some(
      (m: any) => m.sourceId === field.sourceId &&
           m.sourcePath.replace(/\[\d+\]/g, '[*]') === field.path
    );

    const hasArrays = field.path.includes('[*]');

    return (
      <div
        key={`${field.sourceId}_${field.path}`}
        draggable
        onDragStart={(e) => handleDragStart(e, field)}
        onDragEnd={handleDragEnd}
        className={`flex items-center gap-2 p-2 my-1 rounded border cursor-grab transition-all ${
          isMapped ? 'bg-green-50 border-green-300' : 'bg-white border-gray-300'
        } hover:shadow-sm`}
      >
        <GripVertical className="w-3 h-3 text-gray-400" />
        <span className="flex-1 text-sm">{field.path}</span>
        {hasArrays && (
          <Badge className="bg-blue-100 text-blue-800 text-xs">
            <List className="w-2 h-2" />
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">{field.type}</Badge>
        {isMapped && <Link2 className="w-3 h-3 text-green-600" />}
      </div>
    );
  };

  const OutputFieldsPanel = ({ isFloating = false }) => (
    <Card style={isFloating ? {
      position: 'absolute',
      right: '150px',
      top: '20px',
      width: '400px',
      maxHeight: '80vh',
      zIndex: 1000,
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
    } : {}}>
      <CardHeader className="pb-3 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Output Fields</CardTitle>
          {isFloating && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setViewMode('side-by-side')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent style={{ padding: 0 }}>
        <div
          ref={outputFieldsContainerRef}
          style={{
            maxHeight: isFloating ? 'calc(80vh - 120px)' : 'calc(80vh - 120px)',
            overflowY: 'auto',
            padding: '0.75rem',
            paddingBottom: '2rem',
            ...(savedContentHeight.current !== null && { height: savedContentHeight.current + 'px', minHeight: savedContentHeight.current + 'px' })
          }}
        >
        {outputTemplate.fields.map((field: any, fieldIndex: number) => {
          const targetMappings = getMappingsForTarget(field.path);
          const hasMappings = targetMappings.length > 0;
          const isDragOver = dragOverTarget === field.path;

          return (
            <div
              key={`output_${field.path}_${fieldIndex}`}
              onDragOver={(e) => handleDragOver(e, field.path)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, field.path)}
              className={`p-3 my-2 rounded-lg border-2 transition-all ${
                isDragOver
                  ? 'bg-blue-50 border-blue-500 scale-[1.02]'
                  : hasMappings
                    ? 'bg-green-50 border-green-500'
                    : 'bg-gray-50 border-dashed border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <strong className="text-sm">{field.name || field.path}</strong>
                  <Badge variant="outline" className="text-xs">{field.type}</Badge>
                  {field.required && (
                    <Badge className="bg-red-100 text-red-800 text-xs">Required</Badge>
                  )}
                </div>
              </div>

              {targetMappings.length > 0 ? (
                <div className="text-sm space-y-2">
                  {targetMappings.map((mapping: MappingWithConfig) => {
                    const hasArrays = mapping.sourcePath && mapping.sourcePath.includes('[');
                    const isExpanded = expandedConfigs.has(mapping.id);
                    const config = mapping.arrayConfig ? JSON.parse(mapping.arrayConfig) : null;

                    if (debugMode) {
                      console.log(`[RENDER Mapping] ID: ${mapping.id || 'NO_ID'}, Target: ${mapping.targetPath}, Expanded: ${isExpanded}`);
                    }

                    return (
                      <div
                        key={mapping.id}
                        className="relative"
                        style={{
                          border: debugMode ? '1px dotted blue' : 'none',
                          marginTop: debugMode ? '10px' : '0'
                        }}
                      >
                        {debugMode && mapping.id && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '-10px',
                              left: '0',
                              fontSize: '9px',
                              background: 'yellow',
                              padding: '2px 4px',
                              zIndex: 10
                            }}
                          >
                            ID: {mapping.id.substring(0, 8)}...
                          </div>
                        )}
                        <div className="flex items-center gap-2 p-2 bg-white rounded border">
                          <Link2 className="w-3 h-3 flex-shrink-0" />
                          <span className="flex-1 text-xs">
                            <strong>{mapping.sourceName}:</strong> {mapping.sourcePath}
                          </span>
                          {hasArrays && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (debugMode) {
                                  console.log(`[BUTTON CLICK] Mapping ID: ${mapping.id}`);
                                }

                                if (!mapping.arrayConfig) {
                                  const arrayFields: string[] = [];
                                  const indices: Record<string, number> = {};

                                  const matches = mapping.sourcePath.matchAll(/(\w+)\[(\d+)\]/g);
                                  for (const match of matches) {
                                    arrayFields.push(match[1]);
                                    indices[match[1]] = parseInt(match[2]);
                                  }

                                  const templatePath = mapping.sourcePath.replace(/\[\d+\]/g, '[*]');
                                  // Check if the original path has numeric indices - if so, we're in index mode
                                  const hasNumericIndices = /\[\d+\]/.test(mapping.sourcePath);
                                  const useWildcard = !hasNumericIndices;

                                  const newConfig = {
                                    fields: arrayFields,
                                    indices: indices,
                                    templatePath: templatePath,
                                    mappingMode: hasNumericIndices ? 'index' : 'array',
                                    useWildcard: useWildcard
                                  };

                                  if (debugMode) {
                                    console.log('[CREATE CONFIG] Creating config for mapping:', mapping.id);
                                    console.log('[CREATE CONFIG] Config:', newConfig);
                                  }

                                  const updatedMappings = mappingsWithIds.map(m =>
                                    m.id === mapping.id
                                      ? { ...m, arrayConfig: JSON.stringify(newConfig) }
                                      : m
                                  );
                                  onChange(updatedMappings);
                                }
                                toggleMappingExpanded(mapping.id);
                              }}
                              className="h-6 px-2"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <>
                                  <List className="w-3 h-3 mr-1" />
                                  {mapping.sourcePath.match(/\[\d+\]/g)?.join('') || '[...]'}
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeMapping(mapping.id)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>

                        {hasArrays && isExpanded && (
                          <ArrayIndexConfig
                            mapping={mapping}
                            config={config || {
                              fields: (() => {
                                const fields: string[] = [];
                                const indices: Record<string, number> = {};
                                const matches = mapping.sourcePath.matchAll(/(\w+)\[(\d+)\]/g);
                                for (const match of matches) {
                                  fields.push(match[1]);
                                  indices[match[1]] = parseInt(match[2]);
                                }
                                const templatePath = mapping.sourcePath.replace(/\[\d+\]/g, '[*]');
                                // Check if the original path has numeric indices - if so, we're in index mode
                                const hasNumericIndices = /\[\d+\]/.test(mapping.sourcePath);
                                const useWildcard = !hasNumericIndices;
                                return {
                                  fields,
                                  indices,
                                  templatePath,
                                  mappingMode: hasNumericIndices ? 'index' : 'array',
                                  useWildcard
                                };
                              })()
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-gray-500 text-center py-2">
                  {isDragOver ? 'Drop here to map' : 'Drag a source field here'}
                </div>
              )}
            </div>
          );
        })}
        </div>
      </CardContent>
    </Card>
  );

  const MiniMap = () => {
    const mappedCount = outputTemplate.fields.filter((f: any) =>
      mappingsWithIds.some((m: any) => m.targetPath === f.path)
    ).length;

    const requiredMapped = outputTemplate.fields.filter((f: any) =>
      f.required && mappingsWithIds.some((m: any) => m.targetPath === f.path)
    ).length;

    const totalRequired = outputTemplate.fields.filter((f: any) => f.required).length;

    console.log('MiniMap rendering, showMiniMap:', showMiniMap);

    return (
      <Card style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '208px',
        zIndex: 9999,
        backgroundColor: 'white',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }}>
        <CardHeader style={{ paddingBottom: '0rem' }}>
          <CardTitle style={{ fontSize: '0.875rem', lineHeight: '1rem' }}>Mapping Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Overall</span>
              <span>{mappedCount}/{outputTemplate.fields.length}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${(mappedCount / outputTemplate.fields.length) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Required</span>
              <span>{requiredMapped}/{totalRequired}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded overflow-hidden">
              <div
                className={`h-full transition-all ${requiredMapped === totalRequired ? 'bg-green-500' : 'bg-orange-500'}`}
                style={{ width: `${totalRequired > 0 ? (requiredMapped / totalRequired) * 100 : 0}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'api': return <Cloud className="w-4 h-4" />;
      case 'database': return <Database className="w-4 h-4" />;
      case 'file': return <FileText className="w-4 h-4" />;
      default: return <Folder className="w-4 h-4" />;
    }
  };

  return (
    <div className="field-mapping-canvas space-y-4" ref={canvasRef}>
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <div className="flex justify-between items-center">
            <div>
              Drag fields from sources to output fields. Fields with [*] can be configured with specific indices.
              {debugMode && <strong className="text-red-600 ml-2">DEBUG MODE ON - Check Console</strong>}
            </div>
            <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={debugMode ? 'destructive' : 'ghost'}
              onClick={() => setDebugMode(!debugMode)}
            >
              Debug
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={viewMode === 'side-by-side' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('side-by-side')}
                    className="h-8 w-8 p-0"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Side-by-side view</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={viewMode === 'floating' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('floating')}
                    className="h-8 w-8 p-0"
                  >
                    <Layers className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Floating output panel</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <Switch
                checked={showMiniMap}
                onCheckedChange={setShowMiniMap}
              />
              <Label className="text-xs">Mini Map</Label>
            </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      <div className="flex gap-4 min-h-[600px]" style={{ position: 'relative' }}>
        {/* Source Fields Panel - wrapped in relative container for floating mode */}
        <div style={viewMode === 'floating' ? { flex: '1 1 100%', position: 'relative' } : { flex: '0 0 45%' }}>
          <Card className={viewMode === 'floating' ? 'max-h-[80vh] overflow-hidden flex flex-col' : 'max-h-[80vh] overflow-hidden flex flex-col'}>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Source Fields</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-3">
              {sourceSelection.sources.map((source: any) => {
                const sourceFields = fieldsBySource[source.id] || [];

                return (
                  <Collapsible
                    key={source.id}
                    defaultOpen={expandedSources.has(source.id)}
                    onOpenChange={() => toggleSourceExpanded(source.id)}
                    className="mb-4"
                  >
                    <CollapsibleTrigger className="flex items-center gap-2 p-2 w-full bg-gray-100 hover:bg-gray-200 rounded cursor-pointer">
                      {expandedSources.has(source.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      {getSourceIcon(source.type)}
                      <span className="flex-1 font-semibold text-sm text-left">{source.name}</span>
                      <Badge variant="outline" className="text-xs">{sourceFields.length} fields</Badge>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="pt-2 pl-8">
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 mb-1">METADATA</div>
                        {sourceFields
                          .filter(f => f.isMetadata)
                          .map(field => renderSourceField(field))}
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 mb-1">DATA FIELDS</div>
                        {sourceFields
                          .filter(f => !f.isMetadata)
                          .map(field => renderSourceField(field))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </CardContent>
          </Card>

          {/* Floating Output Panel - positioned relative to Source Fields */}
          {viewMode === 'floating' && <OutputFieldsPanel isFloating={true} />}
        </div>

        {/* Center Arrow */}
        {viewMode === 'side-by-side' && (
          <div className="flex items-center">
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        )}

        {/* Output Fields Panel */}
        {viewMode === 'side-by-side' && (
          <div style={{ flex: '0 0 45%', maxHeight: '80vh', overflow: 'hidden', position: 'sticky', top: 20 }}>
            <OutputFieldsPanel />
          </div>
        )}
      </div>

      {/* Mini Map - rendered via portal to appear outside agent popup */}
      {showMiniMap && (() => {
        console.log('Creating MiniMap portal, showMiniMap:', showMiniMap);
        return createPortal(<MiniMap />, document.body);
      })()}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button onClick={onNext} disabled={mappings.length === 0}>
          Next: Preview & Test
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default FieldMappingCanvas;

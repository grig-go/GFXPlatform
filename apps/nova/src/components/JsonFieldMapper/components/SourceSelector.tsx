import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Checkbox } from '../../ui/checkbox';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import {
  ChevronDown,
  ChevronUp,
  Cloud,
  Database,
  FileText,
  Package,
  Info,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  Search
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { findArraysAndObjects } from '../utils/pathHelpers';
import { useToast } from '../../ui/use-toast';

interface SourceSelectorProps {
  dataSources: any[];
  sampleData: Record<string, any>;
  selection: any;
  onChange: (selection: any) => void;
  onNext: () => void;
  onTestDataSource?: (source: any) => Promise<void>;
}

export const SourceSelector: React.FC<SourceSelectorProps> = ({
  dataSources,
  sampleData,
  selection,
  onChange,
  onNext,
  onTestDataSource
}) => {
  const [selectedSources, setSelectedSources] = useState<Set<string>>(() => {
    const initialSelected = selection.sources && selection.sources.length > 0
      ? new Set<string>(selection.sources.map((s: any) => s.id))
      : new Set<string>();
    return initialSelected;
  });

  const [expandedSources, setExpandedSources] = useState<Set<string>>(() => {
    if (selection.sources && selection.sources.length > 0) {
      return new Set(selection.sources.map((s: any) => s.id));
    }
    return new Set();
  });

  const [sourcePaths, setSourcePaths] = useState<Record<string, string>>(() => {
    const paths: Record<string, string> = {};
    if (selection.sources) {
      selection.sources.forEach((source: any) => {
        paths[source.id] = source.primaryPath || '';
      });
    }
    return paths;
  });

  const [mergeMode, setMergeMode] = useState<'separate' | 'combined'>(() => {
    return selection.mergeMode || 'combined';
  });

  const [testingSource, setTestingSource] = useState<string | null>(null);
  const [justTestedSource, setJustTestedSource] = useState<string | null>(null);
  const { toast } = useToast();

  // Watch for sampleData changes after testing to trigger auto-detection
  useEffect(() => {
    if (justTestedSource && sampleData[justTestedSource]) {
      // Data is now available, run auto-detection
      autoDetectPath(justTestedSource);
      setJustTestedSource(null);
    }
  }, [sampleData, justTestedSource]);

  const testDataSource = async (source: any) => {
    if (!onTestDataSource) return;

    setTestingSource(source.id);
    try {
      await onTestDataSource(source);
      // Mark this source as just tested so the useEffect can detect the new data
      setJustTestedSource(source.id);
    } finally {
      setTestingSource(null);
    }
  };

  const testAndDiscoverSelected = async () => {
    if (!onTestDataSource) return;

    // Test all selected sources (allow re-testing)
    const sourcesToTest = Array.from(selectedSources)
      .map(sourceId => dataSources.find(ds => ds.id === sourceId))
      .filter((source): source is any => source !== undefined);

    if (sourcesToTest.length === 0) {
      toast({
        title: 'No sources selected',
        description: 'Please select data sources to test',
      });
      return;
    }

    setTestingSource('all');
    let successCount = 0;
    let failCount = 0;

    for (const source of sourcesToTest) {
      try {
        await onTestDataSource(source);
        setJustTestedSource(source.id);
        successCount++;
        // Small delay to allow state updates
        await new Promise(resolve => setTimeout(resolve, 100));
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

  useEffect(() => {
    if (selection.sources && selection.sources.length > 0) {
      const savedSources = new Set<string>();
      const savedPaths: Record<string, string> = {};
      const shouldExpand = new Set<string>();

      selection.sources.forEach((source: any) => {
        savedSources.add(source.id);
        if ('primaryPath' in source) {
          savedPaths[source.id] = source.primaryPath;
          shouldExpand.add(source.id);
        }
      });

      setSelectedSources(savedSources);
      setSourcePaths(savedPaths);
      setExpandedSources(shouldExpand);
    }
  }, []);

  const toggleSource = (sourceId: string) => {
    const newSelected = new Set(selectedSources);
    if (newSelected.has(sourceId)) {
      newSelected.delete(sourceId);
      const newPaths = { ...sourcePaths };
      delete newPaths[sourceId];
      setSourcePaths(newPaths);
    } else {
      newSelected.add(sourceId);
      const existingSource = selection.sources?.find((s: any) => s.id === sourceId);
      if (existingSource && existingSource.primaryPath) {
        const newPaths = { ...sourcePaths, [sourceId]: existingSource.primaryPath };
        setSourcePaths(newPaths);
      } else {
        autoDetectPath(sourceId);
      }
    }
    setSelectedSources(newSelected);
    updateSelection(newSelected, sourcePaths);
  };

  const toggleExpanded = (sourceId: string) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(sourceId)) {
      newExpanded.delete(sourceId);
    } else {
      newExpanded.add(sourceId);
    }
    setExpandedSources(newExpanded);
  };

  const autoDetectPath = (sourceId: string) => {
    // Always check for existing saved path first, regardless of isExistingConfig
    const existingSource = selection.sources?.find((s: any) => s.id === sourceId);
    // Only use existing path if it's defined AND not empty
    if (existingSource && existingSource.primaryPath !== undefined && existingSource.primaryPath !== '') {
      updateSourcePath(sourceId, existingSource.primaryPath);
      return;
    }

    const data = sampleData[sourceId];
    if (!data) return;

    const paths = findArraysAndObjects(data);
    if (paths.length === 1) {
      updateSourcePath(sourceId, paths[0].path);
    } else if (paths.length > 0) {
      // Filter to get only array paths
      const arrayPaths = paths.filter(p => p.type === 'array');

      if (arrayPaths.length > 0) {
        // Prefer non-root array paths (paths with non-empty path property)
        const nonRootArrayPath = arrayPaths.find(p => p.path && p.path !== '');
        if (nonRootArrayPath) {
          updateSourcePath(sourceId, nonRootArrayPath.path);
        } else {
          // Fallback to first array path (could be root)
          updateSourcePath(sourceId, arrayPaths[0].path);
        }
      }
    }
  };

  const updateSourcePath = (sourceId: string, path: string) => {
    const newPaths = { ...sourcePaths, [sourceId]: path };
    setSourcePaths(newPaths);
    updateSelection(selectedSources, newPaths);
  };

  const updateSelection = (sources: Set<string>, paths: Record<string, string>) => {
    const sourcesArray = Array.from(sources).map(sourceId => {
      const source = dataSources.find(ds => ds.id === sourceId);
      const data = sampleData[sourceId];
      const path = paths[sourceId] || '';

      let type: 'array' | 'object' = 'object';
      if (data && path) {
        const valueAtPath = getValueAtPath(data, path);
        type = Array.isArray(valueAtPath) ? 'array' : 'object';
      } else if (data) {
        type = Array.isArray(data) ? 'array' : 'object';
      }

      return {
        id: sourceId,
        name: source?.name || sourceId,
        type: source?.type || 'unknown',
        category: source?.category,
        primaryPath: path,
        dataType: type
      };
    });

    const finalSelection = {
      type: sourcesArray.length > 0 ? sourcesArray[0].dataType : 'object',
      sources: sourcesArray,
      mergeMode: sources.size > 1 ? mergeMode : 'single',
      primaryPath: sourcesArray.length === 1 ? sourcesArray[0].primaryPath : '',
      unwrapSingleItems: selection.unwrapSingleItems
    };

    onChange(finalSelection);
  };

  const getValueAtPath = (obj: any, path: string): any => {
    if (!path) return obj;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return current;
  };

  const renderPathSelector = (sourceId: string) => {
    const data = sampleData[sourceId];
    const source = dataSources.find(ds => ds.id === sourceId);

    if (!data) {
      return (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            No sample data available. Test this data source first to discover available fields.
            {onTestDataSource && source && (
              <Button
                className="mt-2"
                size="sm"
                onClick={() => testDataSource(source)}
                disabled={testingSource === sourceId}
              >
                {testingSource === sourceId ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : sampleData[sourceId] ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Re-test
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Test & Discover
                  </>
                )}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    const paths = findArraysAndObjects(data);
    const currentPath = sourcePaths[sourceId] || '';

    return (
      <div className="space-y-2">
        <Label>Select data path</Label>
        <p className="text-xs text-gray-500">Choose where your data is located</p>
        <div className="space-y-2 mt-2">
          {paths.length === 0 ? (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription>
                No suitable data structures found in the sample data.
              </AlertDescription>
            </Alert>
          ) : (
            <RadioGroup value={currentPath} onValueChange={(path) => updateSourcePath(sourceId, path)}>
              {paths.map(({ path, type, count }) => (
                <div key={path || 'root'} className="flex items-center space-x-2">
                  <RadioGroupItem value={path} id={`path-${sourceId}-${path}`} className="border-2 border-gray-700" />
                  <Label htmlFor={`path-${sourceId}-${path}`} className="font-normal cursor-pointer flex items-center gap-2">
                    {type === 'array' ? '[]' : '{}'}
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{path || 'root'}</code>
                    <Badge variant="default" className="bg-blue-100 text-blue-800">
                      {type === 'array' ? `${count} items` : 'object'}
                    </Badge>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>
      </div>
    );
  };

  const canProceed = selectedSources.size > 0 &&
    Array.from(selectedSources).every(sourceId =>
      sourcePaths[sourceId] !== undefined || !sampleData[sourceId]
    );

  const handleMergeModeChange = (newMergeMode: 'separate' | 'combined') => {
    setMergeMode(newMergeMode);

    const sourcesArray = Array.from(selectedSources).map(sourceId => {
      const source = dataSources.find(ds => ds.id === sourceId);
      const data = sampleData[sourceId];
      const path = sourcePaths[sourceId] || '';

      let type: 'array' | 'object' = 'object';
      if (data && path) {
        const valueAtPath = getValueAtPath(data, path);
        type = Array.isArray(valueAtPath) ? 'array' : 'object';
      } else if (data) {
        type = Array.isArray(data) ? 'array' : 'object';
      }

      return {
        id: sourceId,
        name: source?.name || sourceId,
        type: source?.type || 'unknown',
        category: source?.category,
        primaryPath: path,
        dataType: type
      };
    });

    onChange({
      type: sourcesArray.length > 0 ? sourcesArray[0].dataType : 'object',
      sources: sourcesArray,
      mergeMode: newMergeMode,
      primaryPath: sourcesArray.length === 1 ? sourcesArray[0].primaryPath : '',
      unwrapSingleItems: selection.unwrapSingleItems
    });
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'api': return <Cloud className="w-4 h-4" />;
      case 'database': return <Database className="w-4 h-4" />;
      case 'file': return <FileText className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="source-selector space-y-4">
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          Select one or more data sources to map their fields to your output structure.
          You can combine data from multiple sources into a single API response.
        </AlertDescription>
      </Alert>

      {/* Source Selection */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Select Data Sources</CardTitle>
            <div className="flex gap-2">
              {selectedSources.size > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={testAndDiscoverSelected}
                  disabled={testingSource !== null}
                >
                  {testingSource === 'all' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (Array.from(selectedSources) as string[]).every((sourceId: string) => sampleData[sourceId]) ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Re-test Selected
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Test & Discover Selected
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="border-2"
                onClick={() => {
                  const allIds = new Set(dataSources.map(ds => ds.id));
                  setSelectedSources(allIds);
                  // Expand all sources when selecting all
                  setExpandedSources(allIds);

                  // Auto-detect paths for all sources
                  const newPaths: Record<string, string> = { ...sourcePaths };
                  allIds.forEach(id => {
                    // Check for existing saved path first
                    const existingSource = selection.sources?.find((s: any) => s.id === id);
                    // Only use existing path if it's defined AND not empty
                    if (existingSource && existingSource.primaryPath !== undefined && existingSource.primaryPath !== '') {
                      newPaths[id] = existingSource.primaryPath;
                    } else {
                      // Auto-detect from sample data
                      const data = sampleData[id];
                      if (data) {
                        const paths = findArraysAndObjects(data);
                        if (paths.length === 1) {
                          newPaths[id] = paths[0].path;
                        } else if (paths.length > 0) {
                          // Filter to get only array paths
                          const arrayPaths = paths.filter(p => p.type === 'array');

                          if (arrayPaths.length > 0) {
                            // Prefer non-root array paths (paths with non-empty path property)
                            const nonRootArrayPath = arrayPaths.find(p => p.path && p.path !== '');
                            if (nonRootArrayPath) {
                              newPaths[id] = nonRootArrayPath.path;
                            } else {
                              // Fallback to first array path (could be root)
                              newPaths[id] = arrayPaths[0].path;
                            }
                          }
                        }
                      }
                    }
                  });

                  setSourcePaths(newPaths);
                  updateSelection(allIds, newPaths);
                }}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-2"
                onClick={() => {
                  setSelectedSources(new Set());
                  setSourcePaths({});
                  // Update the parent component with empty selection
                  updateSelection(new Set(), {});
                }}
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {dataSources.length === 0 ? (
            <Alert>
              <AlertDescription>
                No data sources available. Please add data sources in the previous step.
              </AlertDescription>
            </Alert>
          ) : (
            dataSources.map(source => {
              const isSelected = selectedSources.has(source.id);
              const isExpanded = expandedSources.has(source.id);
              const hasData = !!sampleData[source.id];
              const currentPath = sourcePaths[source.id];

              return (
                <Card
                  key={source.id}
                  className={isSelected ? 'border-2 border-blue-500 bg-blue-50' : ''}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          toggleSource(source.id);
                          // Auto-expand when checked
                          if (checked) {
                            const newExpanded = new Set(expandedSources);
                            newExpanded.add(source.id);
                            setExpandedSources(newExpanded);
                          }
                        }}
                      />

                      {getSourceIcon(source.type)}

                      <div className="flex-1">
                        <div className="font-semibold">{source.name}</div>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">{source.type.toUpperCase()}</Badge>
                          {source.category && (
                            <Badge variant="outline">{source.category}</Badge>
                          )}
                          {hasData && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Data loaded
                            </Badge>
                          )}
                          {isSelected && currentPath && (
                            <Badge className="bg-blue-100 text-blue-800">
                              Path: {currentPath || 'root'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(source.id)}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>

                    {isSelected && isExpanded && (
                      <div className="mt-4 pt-4 border-t pl-7">
                        {renderPathSelector(source.id)}

                        {hasData && currentPath !== undefined && (
                          <div className="mt-4">
                            <Label>Data Preview:</Label>
                            <pre className="bg-gray-100 p-3 rounded mt-2 text-xs overflow-auto max-h-40 whitespace-pre-wrap break-words">
                              {JSON.stringify(
                                getValueAtPath(sampleData[source.id], currentPath),
                                null,
                                2
                              ).slice(0, 500)}...
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Merge Mode */}
      {selectedSources.size > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How should multiple sources be combined?</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={mergeMode} onValueChange={(v) => handleMergeModeChange(v as 'separate' | 'combined')}>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="separate" id="merge-separate" className="border-2 border-gray-700 mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="merge-separate" className="font-semibold cursor-pointer">
                      Keep sources separate
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Map fields from each source independently
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="combined" id="merge-combined" className="border-2 border-gray-700 mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="merge-combined" className="font-semibold cursor-pointer">
                      Combine into single dataset
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Merge all sources into one unified structure
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Info className="w-4 h-4" />
            <span className="font-semibold">Selection Summary:</span>
            {selectedSources.size === 0 ? (
              <span className="text-gray-600">No sources selected</span>
            ) : (
              <>
                <Badge className="bg-blue-100 text-blue-800">
                  {selectedSources.size} source{selectedSources.size !== 1 ? 's' : ''} selected
                </Badge>
                {Array.from(selectedSources).map(sourceId => {
                  const source = dataSources.find(ds => ds.id === sourceId);
                  return (
                    <Badge key={sourceId} variant="outline">
                      {source?.name}
                    </Badge>
                  );
                })}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canProceed}>
          Next: Define Output Structure
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

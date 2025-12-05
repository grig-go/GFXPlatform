import { useState, useMemo } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import { Button, Checkbox, ScrollArea, Separator, cn } from '@emergent-platform/ui';
import { Play, LogOut, Layers, Pin } from 'lucide-react';
import type { Template, Layer } from '@emergent-platform/types';

interface PreviewControlPanelProps {
  onPlay?: (selectedTemplateIds: string[]) => void;
  onStop?: () => void;
  isPlaying?: boolean;
}

export function PreviewControlPanel({ onPlay, onStop, isPlaying: externalIsPlaying = false }: PreviewControlPanelProps) {
  const { 
    layers, 
    templates, 
    project,
    playIn,
    playOut,
    clearOnAir,
    onAirTemplates,
  } = useDesignerStore();
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [alwaysOnLayerIds, setAlwaysOnLayerIds] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingTemplateIds, setPlayingTemplateIds] = useState<Set<string>>(new Set());

  // Group templates by layer
  const templatesByLayer = useMemo(() => {
    const grouped = new Map<string, { layer: Layer; templates: Template[] }>();
    
    layers.forEach((layer) => {
      const layerTemplates = templates.filter(t => t.layer_id === layer.id && t.enabled);
      if (layerTemplates.length > 0) {
        grouped.set(layer.id, { layer, templates: layerTemplates });
      }
    });
    
    return grouped;
  }, [layers, templates]);

  // Get always-on layers
  const alwaysOnLayers = useMemo(() => {
    return layers.filter(l => l.always_on || alwaysOnLayerIds.has(l.id));
  }, [layers, alwaysOnLayerIds]);

  // Get always-on layer templates
  const alwaysOnTemplates = useMemo(() => {
    const templateIds = new Set<string>();
    alwaysOnLayers.forEach(layer => {
      const layerTemplates = templates.filter(t => t.layer_id === layer.id && t.enabled);
      // If layer has only one template, auto-select it
      if (layerTemplates.length === 1) {
        templateIds.add(layerTemplates[0].id);
      } else if (layerTemplates.length > 0) {
        // If multiple templates, use the first one or the one that's already selected
        const selected = layerTemplates.find(t => selectedTemplateIds.has(t.id));
        if (selected) {
          templateIds.add(selected.id);
        } else {
          templateIds.add(layerTemplates[0].id);
        }
      }
    });
    return templateIds;
  }, [alwaysOnLayers, templates, selectedTemplateIds]);

  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      return next;
    });
  };

  const toggleAlwaysOn = (layerId: string) => {
    setAlwaysOnLayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  };

  const handlePlay = () => {
    // Combine selected templates with always-on templates
    const allSelected = new Set([...selectedTemplateIds, ...alwaysOnTemplates]);
    if (allSelected.size === 0) return;
    
    // Get layer for each template and play them
    const templateToLayer = new Map<string, string>();
    templates.forEach(t => {
      if (allSelected.has(t.id)) {
        templateToLayer.set(t.id, t.layer_id);
      }
    });
    
    // Play each selected template
    allSelected.forEach(templateId => {
      const layerId = templateToLayer.get(templateId);
      if (layerId) {
        playIn(templateId, layerId);
      }
    });
    
    setPlayingTemplateIds(allSelected);
    setIsPlaying(true);
    
    // Also call external onPlay if provided
    if (onPlay) {
      onPlay(Array.from(allSelected));
    }
  };

  const handleStop = () => {
    // Stop all playing templates
    playingTemplateIds.forEach(templateId => {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        playOut(template.layer_id);
        // Clear after a delay to allow out animation
        setTimeout(() => {
          clearOnAir(template.layer_id);
        }, 500);
      }
    });
    
    setPlayingTemplateIds(new Set());
    setIsPlaying(false);
    
    // Also call external onStop if provided
    if (onStop) {
      onStop();
    }
  };
  
  // Update isPlaying based on onAirTemplates
  const currentIsPlaying = useMemo(() => {
    return Array.from(playingTemplateIds).some(templateId => {
      const template = templates.find(t => t.id === templateId);
      if (!template) return false;
      const onAir = onAirTemplates[template.layer_id];
      return onAir && (onAir.state === 'in' || onAir.state === 'loop');
    });
  }, [playingTemplateIds, templates, onAirTemplates]);
  
  const effectiveIsPlaying = externalIsPlaying || currentIsPlaying;

  const allTemplateIds = useMemo(() => {
    return new Set([...selectedTemplateIds, ...alwaysOnTemplates]);
  }, [selectedTemplateIds, alwaysOnTemplates]);

  return (
    <div className="h-full flex flex-col bg-background border-r border-border">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Preview Control</h3>
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handlePlay}
            disabled={allTemplateIds.size === 0 || effectiveIsPlaying}
            className="flex-1"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Play
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleStop}
            disabled={!effectiveIsPlaying}
            className="flex-1"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Play Out
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Always On Layers Section */}
          {alwaysOnLayers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Pin className="w-3.5 h-3.5" />
                Always On Layers
              </div>
              {alwaysOnLayers.map((layer) => {
                const layerData = templatesByLayer.get(layer.id);
                if (!layerData) return null;
                
                return (
                  <div key={layer.id} className="space-y-1.5">
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                      <Checkbox
                        checked={alwaysOnLayerIds.has(layer.id) || layer.always_on}
                        onCheckedChange={() => toggleAlwaysOn(layer.id)}
                        disabled={layer.always_on} // Can't uncheck if set in layer settings
                      />
                      <span className="text-xs font-medium flex-1">{layer.name}</span>
                      {layer.always_on && (
                        <Pin className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    {layerData.templates.length > 1 && (
                      <div className="ml-6 space-y-1">
                        {layerData.templates.map((template) => (
                          <label
                            key={template.id}
                            className={cn(
                              "flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-muted/30 transition-colors",
                              alwaysOnTemplates.has(template.id) && "bg-violet-500/10"
                            )}
                          >
                            <Checkbox
                              checked={alwaysOnTemplates.has(template.id)}
                              onCheckedChange={() => {
                                // For always-on layers, we need to ensure at least one template is selected
                                if (alwaysOnTemplates.has(template.id) && alwaysOnTemplates.size === 1) {
                                  return; // Don't allow deselecting the last template
                                }
                                toggleTemplateSelection(template.id);
                              }}
                            />
                            <span className="text-xs flex-1">{template.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <Separator />
            </div>
          )}

          {/* Regular Layers Section */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Select Templates
            </div>
            {Array.from(templatesByLayer.entries()).map(([layerId, { layer, templates: layerTemplates }]) => {
              // Skip always-on layers (they're shown above)
              if (alwaysOnLayerIds.has(layerId) || layer.always_on) return null;
              
              return (
                <div key={layerId} className="space-y-1.5">
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                    <Checkbox
                      checked={layerTemplates.every(t => selectedTemplateIds.has(t.id))}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          // Select all templates in this layer
                          layerTemplates.forEach(t => {
                            setSelectedTemplateIds(prev => new Set(prev).add(t.id));
                          });
                        } else {
                          // Deselect all templates in this layer
                          layerTemplates.forEach(t => {
                            setSelectedTemplateIds(prev => {
                              const next = new Set(prev);
                              next.delete(t.id);
                              return next;
                            });
                          });
                        }
                      }}
                    />
                    <span className="text-xs font-medium flex-1">{layer.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => toggleAlwaysOn(layerId)}
                    >
                      <Pin className="w-3 h-3" />
                    </Button>
                  </div>
                  {layerTemplates.length > 1 && (
                    <div className="ml-6 space-y-1">
                      {layerTemplates.map((template) => (
                        <label
                          key={template.id}
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-muted/30 transition-colors",
                            selectedTemplateIds.has(template.id) && "bg-violet-500/10"
                          )}
                        >
                          <Checkbox
                            checked={selectedTemplateIds.has(template.id)}
                            onCheckedChange={() => toggleTemplateSelection(template.id)}
                          />
                          <span className="text-xs flex-1">{template.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>

      {/* Selection Summary */}
      {allTemplateIds.size > 0 && (
        <div className="p-3 border-t border-border bg-muted/30">
          <div className="text-xs text-muted-foreground">
            {allTemplateIds.size} template{allTemplateIds.size !== 1 ? 's' : ''} selected
          </div>
        </div>
      )}
    </div>
  );
}


import { useMemo } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import { StageElement } from './StageElement';
import { useOnAirAnimation } from '@/hooks/useOnAirAnimation';

export function Stage() {
  const {
    project,
    elements,
    templates,
    layers,
    selectedElementIds,
    showGrid,
    showSafeArea,
  } = useDesignerStore();

  // Handle on-air animations
  useOnAirAnimation();

  const width = project?.canvas_width ?? 1920;
  const height = project?.canvas_height ?? 1080;

  // Get visible elements (respect layer and template visibility)
  const rootElements = useMemo(() => {
    // Create sets of hidden template and layer IDs for fast lookup
    const hiddenTemplateIds = new Set(
      templates.filter((t) => !t.enabled).map((t) => t.id)
    );
    const hiddenLayerIds = new Set(
      layers.filter((l) => !l.enabled).map((l) => l.id)
    );
    
    // Get template-to-layer mapping
    const templateToLayer = new Map(
      templates.map((t) => [t.id, t.layer_id])
    );
    
    // Get layer z_index mapping
    const layerZIndex = new Map(
      layers.map((l) => [l.id, l.z_index])
    );

    return elements
      .filter((e) => {
        // Element must be visible
        if (!e.visible) return false;
        // Must be a root element
        if (e.parent_element_id) return false;
        // Template must be visible
        if (hiddenTemplateIds.has(e.template_id)) return false;
        // Layer must be visible
        const layerId = templateToLayer.get(e.template_id);
        if (layerId && hiddenLayerIds.has(layerId)) return false;
        return true;
      })
      .sort((a, b) => {
        // First sort by layer z_index
        const aLayerId = templateToLayer.get(a.template_id);
        const bLayerId = templateToLayer.get(b.template_id);
        const aLayerZ = aLayerId ? (layerZIndex.get(aLayerId) ?? 0) : 0;
        const bLayerZ = bLayerId ? (layerZIndex.get(bLayerId) ?? 0) : 0;
        
        if (aLayerZ !== bLayerZ) {
          return aLayerZ - bLayerZ;
        }
        
        // Then sort by element z_index within the same layer
        return (a.z_index ?? 0) - (b.z_index ?? 0);
      });
  }, [elements, templates, layers]);

  return (
    <div
      className="relative shadow-2xl"
      style={{ 
        width, 
        height,
        backgroundColor: project?.background_color === 'transparent' ? '#1a1a1a' : project?.background_color,
        backgroundImage: project?.background_color === 'transparent' 
          ? `linear-gradient(45deg, #252525 25%, transparent 25%),
             linear-gradient(-45deg, #252525 25%, transparent 25%),
             linear-gradient(45deg, transparent 75%, #252525 75%),
             linear-gradient(-45deg, transparent 75%, #252525 75%)`
          : 'none',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      }}
      data-stage="true"
    >
      {/* Grid */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, #333 1px, transparent 1px),
              linear-gradient(to bottom, #333 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px',
          }}
        />
      )}

      {/* Safe Areas */}
      {showSafeArea && (
        <>
          {/* Action Safe (90%) */}
          <div
            className="absolute border border-dashed border-amber-500/40 pointer-events-none"
            style={{
              left: width * 0.05,
              top: height * 0.05,
              width: width * 0.9,
              height: height * 0.9,
            }}
          >
            <span className="absolute top-1 left-1 text-[10px] text-amber-500/60">
              Action Safe
            </span>
          </div>
          {/* Title Safe (80%) */}
          <div
            className="absolute border border-dashed border-red-500/40 pointer-events-none"
            style={{
              left: width * 0.1,
              top: height * 0.1,
              width: width * 0.8,
              height: height * 0.8,
            }}
          >
            <span className="absolute top-1 left-1 text-[10px] text-red-500/60">
              Title Safe
            </span>
          </div>
        </>
      )}

      {/* Render Elements */}
      {rootElements.map((element) => {
        // Get layer z_index for this element
        const template = templates.find(t => t.id === element.template_id);
        const layer = template ? layers.find(l => l.id === template.layer_id) : null;
        const layerZIndex = layer?.z_index ?? 0;
        
        return (
          <StageElement
            key={element.id}
            element={element}
            allElements={elements}
            layerZIndex={layerZIndex}
          />
        );
      })}

      {/* Selection handles would go here */}
    </div>
  );
}


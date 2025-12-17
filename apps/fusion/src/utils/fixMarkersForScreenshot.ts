// Simple screenshot fix utilities for html2canvas
// Ensures proper z-index stacking in cloned DOM

export function fixMarkersInsideClone(cloneDoc: Document) {
  // Fix canvas z-index
  cloneDoc.querySelectorAll<HTMLCanvasElement>(".mapboxgl-canvas").forEach(c => {
    c.style.zIndex = "0";
  });

  // Fix marker z-index
  cloneDoc.querySelectorAll<HTMLElement>(".mapboxgl-marker").forEach(el => {
    el.style.zIndex = "1";
  });
  
  // Fix custom marker element z-index
  cloneDoc.querySelectorAll<HTMLElement>(
    ".weather-card-marker, .stadium-marker, .ai-infra-marker, .media-marker"
  ).forEach(el => {
    el.style.zIndex = "2";
  });
}

// Legacy function kept for compatibility
export function fixMapboxCanvasForClone(cloneDoc: Document) {
  cloneDoc.querySelectorAll<HTMLCanvasElement>('.mapboxgl-canvas').forEach(canvas => {
    canvas.style.zIndex = '0';
  });
}
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { MapStyle, MapMarker, MapMarkerTemplate, MapProjection, MapLocationKeyframe } from '@emergent-platform/types';
import { useDesignerStore } from '@/stores/designerStore';
import { DEFAULT_MARKER_TEMPLATES } from '@/components/designer/MapPropertiesPanel';

// Map style URLs
const MAP_STYLES: Record<MapStyle, string> = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  'satellite-streets': 'mapbox://styles/mapbox/satellite-streets-v12',
  'navigation-day': 'mapbox://styles/mapbox/navigation-day-v1',
  'navigation-night': 'mapbox://styles/mapbox/navigation-night-v1',
};

// Default dev key (users will add their own in settings)
const DEV_MAPBOX_KEY = 'pk.eyJ1IjoiZW1lcmdlbnRzb2x1dGlvbnMiLCJhIjoiY21mbGJuanZ1MDNhdDJqcTU1cHVjcWJycCJ9.Tk2txI10-WExxSoPnHlu_g';

interface MapElementProps {
  content: {
    type: 'map';
    mapStyle?: MapStyle;
    center: [number, number]; // [lng, lat]
    zoom: number;
    pitch?: number;
    bearing?: number;
    projection?: MapProjection;
    markers?: MapMarker[];
    markerTemplates?: MapMarkerTemplate[];
    locationKeyframes?: MapLocationKeyframe[];
    animateLocation?: boolean;
    animationDuration?: number;
    animationEasing?: string;
  };
  width: number | null;
  height: number | null;
  elementId?: string;
  interactive?: boolean;
  isPlaying?: boolean; // True during timeline playback
  isAnimated?: boolean; // True when values come from keyframe animation (scrubbing or playing)
  playheadPosition?: number; // Current playhead position in ms for location keyframe interpolation
  currentPhase?: 'in' | 'loop' | 'out'; // Current animation phase
}

// Easing functions for smooth map transitions
const EASING_FUNCTIONS: Record<string, (t: number) => number> = {
  'linear': (t) => t,
  'ease': (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  'ease-in': (t) => t * t,
  'ease-out': (t) => 1 - (1 - t) * (1 - t),
  'ease-in-out': (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
};

// Interpolate between two location keyframes
function interpolateLocation(
  from: MapLocationKeyframe,
  to: MapLocationKeyframe,
  progress: number, // 0-1
  easing: string = 'ease-in-out'
): { lng: number; lat: number; zoom: number; pitch: number; bearing: number } {
  const easingFn = EASING_FUNCTIONS[easing] || EASING_FUNCTIONS['ease-in-out'];
  const t = easingFn(progress);

  return {
    lng: from.lng + (to.lng - from.lng) * t,
    lat: from.lat + (to.lat - from.lat) * t,
    zoom: from.zoom + (to.zoom - from.zoom) * t,
    pitch: (from.pitch ?? 0) + ((to.pitch ?? 0) - (from.pitch ?? 0)) * t,
    bearing: (from.bearing ?? 0) + ((to.bearing ?? 0) - (from.bearing ?? 0)) * t,
  };
}

// Get the interpolated location based on playhead position and keyframes
function getInterpolatedLocation(
  keyframes: MapLocationKeyframe[],
  playheadMs: number
): { lng: number; lat: number; zoom: number; pitch: number; bearing: number } | null {
  if (!keyframes || keyframes.length === 0) return null;

  // Sort keyframes by time
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // If before first keyframe, return first keyframe position
  if (playheadMs <= sorted[0].time) {
    const kf = sorted[0];
    return { lng: kf.lng, lat: kf.lat, zoom: kf.zoom, pitch: kf.pitch ?? 0, bearing: kf.bearing ?? 0 };
  }

  // If after last keyframe, return last keyframe position
  if (playheadMs >= sorted[sorted.length - 1].time) {
    const kf = sorted[sorted.length - 1];
    return { lng: kf.lng, lat: kf.lat, zoom: kf.zoom, pitch: kf.pitch ?? 0, bearing: kf.bearing ?? 0 };
  }

  // Find the two keyframes we're between
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];

    if (playheadMs >= from.time && playheadMs <= to.time) {
      const duration = to.time - from.time;
      const progress = duration > 0 ? (playheadMs - from.time) / duration : 0;
      return interpolateLocation(from, to, progress, to.easing || 'ease-in-out');
    }
  }

  return null;
}

// Helper to create marker element from template
function createMarkerElement(
  marker: MapMarker,
  template: MapMarkerTemplate | undefined
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'map-marker-custom';

  if (!template) {
    // Simple marker fallback
    el.style.cssText = `
      width: 24px;
      height: 24px;
      background-color: ${marker.color || '#8B5CF6'};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
    `;
    return el;
  }

  // Template-based marker
  el.style.cssText = `
    width: ${template.width}px;
    height: ${template.height}px;
    position: relative;
    pointer-events: auto;
  `;

  // Render template elements
  template.elements.forEach((templateEl) => {
    const childEl = document.createElement('div');
    childEl.style.cssText = `
      position: absolute;
      left: ${templateEl.offsetX}px;
      top: ${templateEl.offsetY}px;
      ${templateEl.width ? `width: ${templateEl.width}px;` : ''}
      ${templateEl.height ? `height: ${templateEl.height}px;` : ''}
      ${templateEl.opacity !== undefined ? `opacity: ${templateEl.opacity};` : ''}
      ${templateEl.zIndex !== undefined ? `z-index: ${templateEl.zIndex};` : ''}
    `;

    switch (templateEl.type) {
      case 'shape':
        childEl.style.cssText += `
          background-color: ${templateEl.fill || 'transparent'};
          ${templateEl.cornerRadius ? `border-radius: ${templateEl.cornerRadius}px;` : ''}
          ${templateEl.stroke ? `border: ${templateEl.strokeWidth || 1}px solid ${templateEl.stroke};` : ''}
        `;
        break;

      case 'text':
        // Replace placeholders with data
        let text = templateEl.text || '';
        if (marker.data) {
          Object.entries(marker.data).forEach(([key, value]) => {
            text = text.replace(`{{${key}}}`, String(value));
          });
        }
        childEl.textContent = text;
        childEl.style.cssText += `
          color: ${templateEl.textColor || '#FFFFFF'};
          font-size: ${templateEl.fontSize || 12}px;
          font-family: ${templateEl.fontFamily || 'Inter, sans-serif'};
          font-weight: ${templateEl.fontWeight || 400};
          text-align: ${templateEl.textAlign || 'left'};
          white-space: nowrap;
        `;
        break;

      case 'icon':
        // For simplicity, render icons as colored circles or use font icons
        if (templateEl.iconLibrary === 'lucide') {
          // Use SVG icon
          childEl.innerHTML = `
            <svg width="${templateEl.iconSize || 24}" height="${templateEl.iconSize || 24}" viewBox="0 0 24 24" fill="none" stroke="${templateEl.iconColor || '#FFFFFF'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
            </svg>
          `;
        } else if (templateEl.iconLibrary === 'weather') {
          // Use weather icon placeholder
          childEl.innerHTML = `
            <svg width="${templateEl.iconSize || 24}" height="${templateEl.iconSize || 24}" viewBox="0 0 24 24" fill="${templateEl.iconColor || '#FFD700'}">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3" stroke="${templateEl.iconColor || '#FFD700'}" stroke-width="2"/>
              <line x1="12" y1="21" x2="12" y2="23" stroke="${templateEl.iconColor || '#FFD700'}" stroke-width="2"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="${templateEl.iconColor || '#FFD700'}" stroke-width="2"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="${templateEl.iconColor || '#FFD700'}" stroke-width="2"/>
              <line x1="1" y1="12" x2="3" y2="12" stroke="${templateEl.iconColor || '#FFD700'}" stroke-width="2"/>
              <line x1="21" y1="12" x2="23" y2="12" stroke="${templateEl.iconColor || '#FFD700'}" stroke-width="2"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="${templateEl.iconColor || '#FFD700'}" stroke-width="2"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="${templateEl.iconColor || '#FFD700'}" stroke-width="2"/>
            </svg>
          `;
        } else {
          childEl.style.cssText += `
            background-color: ${templateEl.iconColor || '#8B5CF6'};
            border-radius: 50%;
          `;
        }
        break;

      case 'image':
        if (templateEl.imageSrc) {
          const img = document.createElement('img');
          img.src = templateEl.imageSrc;
          img.style.cssText = `width: 100%; height: 100%; object-fit: contain;`;
          childEl.appendChild(img);
        }
        break;
    }

    el.appendChild(childEl);
  });

  return el;
}

export function MapElement({
  content,
  width,
  height,
  elementId,
  interactive = false,
  isPlaying = false,
  isAnimated = false,
  playheadPosition = 0,
  currentPhase,
}: MapElementProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get Mapbox key from settings (falls back to dev key)
  const mapboxKey = useDesignerStore((state) => 
    state.project?.settings?.mapboxApiKey || DEV_MAPBOX_KEY
  );
  const updateElement = useDesignerStore((state) => state.updateElement);
  
  // Helper to update marker position
  const updateMarker = useCallback((markerId: string, updates: { lng?: number; lat?: number }) => {
    if (!elementId) return;
    const currentMarkers = content.markers || [];
    const updatedMarkers = currentMarkers.map(m => 
      m.id === markerId ? { ...m, ...updates } : m
    );
    updateElement(elementId, {
      content: {
        ...content,
        markers: updatedMarkers,
      },
    });
  }, [elementId, content, updateElement]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      mapboxgl.accessToken = mapboxKey;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLES[content.mapStyle || 'dark'],
        center: content.center,
        zoom: content.zoom,
        pitch: content.pitch || 0,
        bearing: content.bearing || 0,
        projection: content.projection || 'mercator',
        interactive: interactive,
        attributionControl: false,
        // Enable drawing buffer preservation for screenshot capture
        preserveDrawingBuffer: true,
      });

      map.on('load', () => {
        setMapLoaded(true);
        setError(null);
        // Ensure map is properly sized after load
        setTimeout(() => map.resize(), 0);
      });

      // Listen for style.load events (when style changes)
      // This is handled in the style update useEffect

      map.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError('Failed to load map');
      });

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.error('Map initialization error:', err);
      setError('Failed to initialize map');
    }
  }, [mapboxKey]);

  // Update map style
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const styleUrl = MAP_STYLES[content.mapStyle || 'dark'];
    
    // setStyle triggers a reload, markers will be re-added by the markers useEffect
    // when it detects the style has loaded via the style.load event
    mapRef.current.setStyle(styleUrl);
  }, [content.mapStyle, mapLoaded]);

  // Update map projection
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const projection = content.projection || 'mercator';
    try {
      mapRef.current.setProjection(projection);
    } catch (err) {
      console.error('Failed to set projection:', err);
    }
  }, [content.projection, mapLoaded]);

  // Update map position when content changes
  // Track the last values we applied to the map to detect external changes vs our own updates
  const lastAppliedCenterRef = useRef<[number, number] | null>(null);
  const lastAppliedZoomRef = useRef<number | null>(null);
  const lastAppliedPitchRef = useRef<number | null>(null);
  const lastAppliedBearingRef = useRef<number | null>(null);

  // Handle user interactions with the map - save to store when user drags/zooms
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !interactive || !elementId) return;

    const handleMoveEnd = () => {
      if (!mapRef.current) return;

      const center = mapRef.current.getCenter();
      const zoom = mapRef.current.getZoom();
      const pitch = mapRef.current.getPitch();
      const bearing = mapRef.current.getBearing();

      // Update our refs to match what the map shows now
      // This prevents the content update effect from re-applying the same values
      lastAppliedCenterRef.current = [center.lng, center.lat];
      lastAppliedZoomRef.current = zoom;
      lastAppliedPitchRef.current = pitch;
      lastAppliedBearingRef.current = bearing;

      // Save to store
      updateElement(elementId, {
        content: {
          ...content,
          center: [center.lng, center.lat],
          zoom,
          pitch,
          bearing,
        },
      });
    };

    mapRef.current.on('moveend', handleMoveEnd);

    return () => {
      mapRef.current?.off('moveend', handleMoveEnd);
    };
  }, [mapLoaded, interactive, elementId, content, updateElement]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Check if content values differ from what we last applied
    // This detects changes from properties panel, quick links, etc.
    const centerChanged = !lastAppliedCenterRef.current ||
      Math.abs(lastAppliedCenterRef.current[0] - content.center[0]) > 0.0001 ||
      Math.abs(lastAppliedCenterRef.current[1] - content.center[1]) > 0.0001;

    const zoomChanged = lastAppliedZoomRef.current === null ||
      Math.abs(lastAppliedZoomRef.current - content.zoom) > 0.01;

    const pitchChanged = lastAppliedPitchRef.current === null ||
      Math.abs((lastAppliedPitchRef.current ?? 0) - (content.pitch ?? 0)) > 0.1;

    const bearingChanged = lastAppliedBearingRef.current === null ||
      Math.abs((lastAppliedBearingRef.current ?? 0) - (content.bearing ?? 0)) > 0.1;

    const anyChanged = centerChanged || zoomChanged || pitchChanged || bearingChanged;

    if (!anyChanged) return;

    // Only animate when:
    // 1. Center actually changed (not first render)
    // 2. Not playing or scrubbing timeline (isAnimated handles both)
    // 3. Animation is enabled
    const shouldAnimate = centerChanged &&
      lastAppliedCenterRef.current !== null &&
      !isPlaying &&
      !isAnimated;

    if (shouldAnimate && content.animateLocation !== false) {
      // Use flyTo for smooth animation when location changes manually (quick links, search)
      mapRef.current.flyTo({
        center: content.center,
        zoom: content.zoom,
        pitch: content.pitch ?? 0,
        bearing: content.bearing ?? 0,
        duration: content.animationDuration || 2000,
        essential: true,
      });
    } else {
      // Instant update for:
      // - Initial load
      // - Property panel changes
      // - Timeline playback (isPlaying)
      // - Timeline scrubbing (isAnimated)
      // - Animation disabled
      mapRef.current.jumpTo({
        center: content.center,
        zoom: content.zoom,
        pitch: content.pitch ?? 0,
        bearing: content.bearing ?? 0,
      });
    }

    // Track what we applied so we can detect future external changes
    lastAppliedCenterRef.current = content.center;
    lastAppliedZoomRef.current = content.zoom;
    lastAppliedPitchRef.current = content.pitch ?? 0;
    lastAppliedBearingRef.current = content.bearing ?? 0;
  }, [content.center, content.zoom, content.pitch, content.bearing, content.animateLocation, content.animationDuration, mapLoaded, isPlaying, isAnimated]);

  // Handle location keyframe animation during playback
  // This provides smooth interpolation between keyframe locations based on playhead position
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Only apply during playback or scrubbing (not when editing)
    if (!isPlaying && !isAnimated) return;

    // Filter keyframes by current phase - only use keyframes that match the current animation phase
    const phaseKeyframes = content.locationKeyframes?.filter(
      kf => (kf.phase || 'in') === currentPhase
    );

    // Only interpolate if we have at least 2 keyframes for this phase
    const hasKeyframes = phaseKeyframes && phaseKeyframes.length >= 2;
    if (!hasKeyframes) return;

    // Get interpolated location based on playhead position (using phase-filtered keyframes)
    const interpolated = getInterpolatedLocation(phaseKeyframes, playheadPosition);
    if (!interpolated) return;

    // Check if we actually need to update (avoid jitter)
    const needsUpdate =
      !lastAppliedCenterRef.current ||
      Math.abs(lastAppliedCenterRef.current[0] - interpolated.lng) > 0.00001 ||
      Math.abs(lastAppliedCenterRef.current[1] - interpolated.lat) > 0.00001 ||
      Math.abs((lastAppliedZoomRef.current ?? 0) - interpolated.zoom) > 0.001 ||
      Math.abs((lastAppliedPitchRef.current ?? 0) - interpolated.pitch) > 0.01 ||
      Math.abs((lastAppliedBearingRef.current ?? 0) - interpolated.bearing) > 0.01;

    if (!needsUpdate) return;

    // Use jumpTo for instant updates during timeline (no animation during scrub/play)
    mapRef.current.jumpTo({
      center: [interpolated.lng, interpolated.lat],
      zoom: interpolated.zoom,
      pitch: interpolated.pitch,
      bearing: interpolated.bearing,
    });

    // Track what we applied
    lastAppliedCenterRef.current = [interpolated.lng, interpolated.lat];
    lastAppliedZoomRef.current = interpolated.zoom;
    lastAppliedPitchRef.current = interpolated.pitch;
    lastAppliedBearingRef.current = interpolated.bearing;
  }, [content.locationKeyframes, playheadPosition, isPlaying, isAnimated, mapLoaded, currentPhase]);

  // Resize map when container size changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    
    // Trigger resize after a short delay to ensure DOM has updated
    const timeoutId = setTimeout(() => {
      mapRef.current?.resize();
    }, 10);

    return () => clearTimeout(timeoutId);
  }, [width, height, mapLoaded]);

  // Use ResizeObserver for reliable resize detection
  useEffect(() => {
    if (!mapContainerRef.current || !mapRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize calls
      requestAnimationFrame(() => {
        mapRef.current?.resize();
      });
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [mapLoaded]);

  // Create a map of templates by ID for quick lookup (includes default + custom templates)
  const templateMap = useMemo(() => {
    const map = new Map<string, MapMarkerTemplate>();
    // Add default templates first
    DEFAULT_MARKER_TEMPLATES.forEach((t) => map.set(t.id, t));
    // Add custom templates (will override defaults if same ID)
    if (content.markerTemplates) {
      content.markerTemplates.forEach((t) => map.set(t.id, t));
    }
    return map;
  }, [content.markerTemplates]);

  // Update markers - re-add after style changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Helper function to add markers
    const addMarkers = () => {
      // Remove existing markers first
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Add new markers
      if (content.markers && content.markers.length > 0) {
        content.markers.forEach((markerData) => {
          // Skip hidden markers
          if (markerData.visible === false) return;

          // Find template if specified
          const template = markerData.templateId
            ? templateMap.get(markerData.templateId)
            : undefined;

          // Create marker element using template or simple style
          const el = createMarkerElement(markerData, template);

          // Calculate anchor offset based on template
          const anchor = template
            ? { x: template.anchorX, y: template.anchorY }
            : { x: 0.5, y: 0.5 };

          const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'center',
            offset: [
              (0.5 - anchor.x) * (template?.width || 24),
              (0.5 - anchor.y) * (template?.height || 24),
            ],
            draggable: interactive && elementId ? true : false,
          })
            .setLngLat([markerData.lng, markerData.lat])
            .addTo(mapRef.current!);

          // Handle marker drag end to update position
          if (interactive && elementId) {
            marker.on('dragend', () => {
              const lngLat = marker.getLngLat();
              updateMarker(markerData.id, {
                lng: lngLat.lng,
                lat: lngLat.lat,
              });
            });
          }

          // Add popup if provided (for simple markers or label)
          if (markerData.popup || markerData.label) {
            const popupContent = markerData.popup || markerData.label || '';
            const popup = new mapboxgl.Popup({ offset: 25 })
              .setHTML(`<div style="padding: 8px; font-size: 14px;">${popupContent}</div>`);
            marker.setPopup(popup);
          }

          markersRef.current.push(marker);
        });
      }
    };

    // If map is loaded, add markers immediately
    if (mapRef.current.isStyleLoaded()) {
      addMarkers();
    } else {
      // Wait for style to load (e.g., after style change)
      mapRef.current.once('style.load', () => {
        addMarkers();
      });
    }
  }, [content.markers, content.markerTemplates, templateMap, mapLoaded, interactive, elementId, updateMarker, content.mapStyle]);

  if (error) {
    return (
      <div 
        className="flex items-center justify-center bg-neutral-800 text-neutral-400"
        style={{ width: width || 400, height: height || 300 }}
      >
        <div className="text-center p-4">
          <svg className="w-8 h-8 mx-auto mb-2 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-1">Check Mapbox API key in settings</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hide Mapbox logo and attribution with CSS */}
      <style>{`
        .mapbox-container .mapboxgl-ctrl-logo,
        .mapbox-container .mapboxgl-ctrl-attrib,
        .mapbox-container .mapboxgl-ctrl-bottom-left,
        .mapbox-container .mapboxgl-ctrl-bottom-right {
          display: none !important;
        }
      `}</style>
      <div
        ref={mapContainerRef}
        className="mapbox-container"
        style={{
          width: width || '100%',
          height: height || '100%',
          borderRadius: 'inherit',
          overflow: 'hidden',
          position: 'relative',
        }}
      />
    </>
  );
}

// Map style options for UI
export const MAP_STYLE_OPTIONS: { value: MapStyle; label: string }[] = [
  { value: 'streets', label: 'Streets' },
  { value: 'outdoors', label: 'Outdoors' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'satellite', label: 'Satellite' },
  { value: 'satellite-streets', label: 'Satellite + Streets' },
  { value: 'navigation-day', label: 'Navigation (Day)' },
  { value: 'navigation-night', label: 'Navigation (Night)' },
];

// Helper to create default map content
export function createDefaultMapContent(): MapElementProps['content'] {
  return {
    type: 'map',
    mapStyle: 'dark',
    center: [-74.006, 40.7128], // New York City
    zoom: 12,
    pitch: 0,
    bearing: 0,
    markers: [],
  };
}


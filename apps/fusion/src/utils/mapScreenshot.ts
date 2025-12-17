// @ts-ignore
import html2canvas from 'html2canvas';
import type mapboxgl from 'mapbox-gl';

type Options = {
  frameEl?: HTMLElement;             // wrapper containing map + overlays
  backdropSelector?: string;         // modal curtain to hide during capture
  excludeSelector?: string;          // things to hide (toolbars, etc.)
  overlayWhitelistSelector?: string; // OPTIONAL: limit overlays to these
  maxWidth?: number;                 // optional export width cap (e.g. 1024)
};

/**
 * Sanitizes UI elements that html2canvas cannot clone properly
 */
export function sanitizeUI(doc: Document) {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);

  while (walker.nextNode()) {
    const el = walker.currentNode as HTMLElement;
    const style = el.style;
    const computed = doc.defaultView?.getComputedStyle(el);

    // 1. Disable animations
    style.animation = "none";
    style.transition = "none";

    // 2. Disable filters
    style.filter = "none";
    style.backdropFilter = "none";

    // 3. Disable masks/clipping
    style.mask = "none";
    style.webkitMask = "none";
    style.clipPath = "none";
    style.overflow = "visible";

    // 4. Flatten blend modes
    style.mixBlendMode = "normal";
    style.backgroundBlendMode = "normal";

    // 5. Convert unsupported OKLAB / OKLCH
    const fixColor = (v: string) =>
      v.replace(/oklch\([^)]*\)/g, "rgba(255,255,255,1)")
       .replace(/oklab\([^)]*\)/g, "rgba(255,255,255,1)");

    const props = [
      "color",
      "background",
      "backgroundColor",
      "borderColor",
      "outlineColor",
      "fill",
      "stroke"
    ];

    for (const prop of props) {
      const value = (style as any)[prop] || (computed as any)?.[prop];
      if (value && (value.includes("oklch") || value.includes("oklab"))) {
        (style as any)[prop] = fixColor(value);
      }
    }

    // 6. Inline transforms
    if (computed) {
      style.transform = computed.transform;
      style.transformOrigin = computed.transformOrigin;
    }

    // 7. Strip external IMG URLs
    if (el.tagName === 'IMG') {
      const src = (el as HTMLImageElement).src;
      if (src.startsWith("http") && !src.includes(location.origin)) {
        (el as HTMLImageElement).src = "";
      }
    }

    // 8. Remove SVG defs/filters/gradients
    if (el.tagName.toLowerCase() === 'svg') {
      el.querySelectorAll(
        "filter, mask, linearGradient, radialGradient, pattern, clipPath"
      ).forEach(n => n.remove());

      el.querySelectorAll("image").forEach(img => img.remove());
    }

    // 9. Remove background-image URLs
    if (computed?.backgroundImage && computed.backgroundImage.includes("url(")) {
      style.backgroundImage = "none";
    }

    // 10. Remove ALL mask images
    if (computed?.maskImage && computed.maskImage.includes("url(")) {
      style.maskImage = "none";
      style.webkitMaskImage = "none";
    }

    // 11. Remove content:url()
    if (computed?.content && computed.content.includes("url(")) {
      style.content = "''";
    }

    // 12. Remove CSS variables containing URLs
    if (computed) {
      for (const key of Array.from(computed)) {
        if (key.startsWith("--")) {
          const val = computed.getPropertyValue(key);
          if (val.includes("url(")) {
            el.style.setProperty(key, "none");
          }
        }
      }
    }

    // 13. Remove Figma "meta-image" attributes (CRITICAL)
    const attrs = ["data-fm-image", "data-fm-mask", "data-fm-fill", "data-fm-bg"];
    attrs.forEach(attr => {
      if (el.getAttribute(attr)?.includes("url(")) {
        el.removeAttribute(attr);
      }
    });

    // 14. Remove any "style.background" inline URL() declarations
    if (style.background.includes("url(")) {
      style.background = "none";
    }
  }
}

export async function captureMapScreenshot(map: mapboxgl.Map, opts: Options = {}) {
  console.log('📸 captureMapScreenshot: Starting...');
  
  const frameEl =
    opts.frameEl ?? (document.getElementById('map-frame') as HTMLElement);
  if (!frameEl) {
    console.error('❌ Missing #map-frame element');
    throw new Error('Missing #map-frame');
  }

  console.log('✅ Frame element found:', frameEl);

  // 1) ensure map is ready (with quick timeout fallback)
  console.log('⏳ Checking map state...');
  await new Promise<void>((resolve) => {
    if ((map as any)._idle) {
      console.log('✅ Map already idle');
      return resolve();
    }
    
    let resolved = false;
    
    // Quick timeout - don't wait too long (300ms is enough for most renders)
    const timeout = setTimeout(() => {
      if (!resolved) {
        console.log('⚡ Proceeding with capture (300ms elapsed)');
        resolved = true;
        resolve();
      }
    }, 300);
    
    map.once('idle', () => {
      if (!resolved) {
        console.log('✅ Map is now idle');
        resolved = true;
        clearTimeout(timeout);
        resolve();
      }
    });
  });

  // 2) compute pixel sizes consistently
  const dpr = window.devicePixelRatio || 1;
  const cssW = frameEl.clientWidth;
  const cssH = frameEl.clientHeight;
  let exportW = cssW * dpr;
  let exportH = cssH * dpr;

  console.log('📐 CSS dimensions:', cssW, 'x', cssH);
  console.log('📐 DPR:', dpr);
  console.log('📐 Initial export dimensions:', exportW, 'x', exportH);

  if (opts.maxWidth && exportW > opts.maxWidth) {
    const k = opts.maxWidth / exportW;
    exportW = Math.round(exportW * k);
    exportH = Math.round(exportH * k);
    console.log('📐 Scaled to fit maxWidth:', exportW, 'x', exportH);
  }

  // 3) Hide elements we don't want in the shot
  const hidden: Array<{ el: HTMLElement; prev: string }> = [];
  const hide = (selector?: string) => {
    if (!selector) return;
    const elements = document.querySelectorAll<HTMLElement>(selector);
    console.log(`🙈 Hiding ${elements.length} elements matching "${selector}"`);
    elements.forEach((el) => {
      hidden.push({ el, prev: el.style.visibility });
      el.style.visibility = 'hidden';
    });
  };
  hide(opts.backdropSelector);
  hide(opts.excludeSelector);

  // Get map canvas bitmap FIRST (before html2canvas)
  console.log('🗺️ Extracting map canvas...');
  const mapCanvas = map.getCanvas();
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  const mapBitmap = mapCanvas.toDataURL('image/png');
  console.log('✅ Map bitmap extracted:', (mapBitmap.length / 1024).toFixed(2), 'KB');

  // 6) COMPOSITE CAPTURE: WebGL map + html2canvas overlays
  let overlayCanvas: HTMLCanvasElement;
  try {
    // Use html2canvas to capture DOM overlays
    overlayCanvas = await html2canvas(frameEl, {
      backgroundColor: null, // Transparent background
      scale: exportW / cssW, // Match our export dimensions
      logging: true, // ✅ Enable logging to see errors
      useCORS: true,
      allowTaint: true,
      onclone: (clonedDoc) => {
        // Sanitize the cloned document
        sanitizeUI(clonedDoc);
      },
      ignoreElements: (element) => {
        // Skip Mapbox controls to avoid SVG errors
        if (element.classList) {
          if (element.classList.contains('mapboxgl-ctrl-logo') || 
              element.classList.contains('mapboxgl-ctrl-attrib') ||
              element.classList.contains('mapboxgl-ctrl-bottom-left') ||
              element.classList.contains('mapboxgl-ctrl-bottom-right') ||
              element.classList.contains('mapboxgl-canvas')) {
            return true;
          }
        }
        
        return false;
      }
    });
    console.log('✅ html2canvas overlay complete');
  } catch (error) {
    console.error('❌ html2canvas failed:', error);
    throw error;
  }

  // restore
  console.log('🔄 Restoring visibility...');
  for (const { el, prev } of hidden) el.style.visibility = prev;

  // 7) composite both passes
  console.log('🎬 Compositing both passes...');
  const out = document.createElement('canvas');
  out.width = exportW;
  out.height = exportH;
  const ctx = out.getContext('2d')!;

  // draw helper
  const drawDataUrl = (url: string, label: string) =>
    new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { 
        ctx.drawImage(img, 0, 0, exportW, exportH); 
        console.log(`✅ Drew ${label} to composite canvas`);
        resolve(); 
      };
      img.onerror = (err) => {
        console.error(`❌ Failed to draw ${label}:`, err);
        reject(err);
      };
      img.src = url;
    });

  // Draw map bitmap first
  await drawDataUrl(mapBitmap, 'map bitmap');
  
  // Draw overlay canvas on top
  ctx.drawImage(overlayCanvas, 0, 0, exportW, exportH);
  console.log('✅ Drew overlay canvas to composite');

  const finalImage = out.toDataURL('image/png');
  console.log('✅ Final composite image:', (finalImage.length / 1024).toFixed(2), 'KB');
  console.log('🎉 Screenshot capture complete!');
  
  return finalImage;
}
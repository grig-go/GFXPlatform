// @ts-ignore
import html2canvas from 'html2canvas';
import type mapboxgl from 'mapbox-gl';

type Options = {
  backdropSelector?: string;
  excludeSelector?: string;
  maxWidth?: number;
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

/**
 * Captures both MapView and MapContainer, plus all election panels using html2canvas.
 * html2canvas properly handles absolutely positioned elements.
 */
export async function captureDualMapScreenshot(
  mapViewRef: mapboxgl.Map | null,
  mapContainerRef: mapboxgl.Map | null,
  opts: Options = {}
) {
  console.log('📸 captureDualMapScreenshot: Starting...');
  console.log('  MapView ref:', !!mapViewRef);
  console.log('  MapContainer ref:', !!mapContainerRef);

  if (!mapViewRef && !mapContainerRef) {
    throw new Error('No map instances available for screenshot');
  }

  // Wait for both maps to be idle
  console.log('⏳ Checking map state...');
  const waitForMapIdle = (map: mapboxgl.Map | null): Promise<void> => {
    if (!map) return Promise.resolve();
    return new Promise<void>((resolve) => {
      if ((map as any)._idle) {
        console.log('  ✅ Map already idle');
        return resolve();
      }
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          console.log('  ⚡ Proceeding (300ms elapsed)');
          resolved = true;
          resolve();
        }
      }, 300);
      map.once('idle', () => {
        if (!resolved) {
          console.log('  ✅ Map is now idle');
          resolved = true;
          clearTimeout(timeout);
          resolve();
        }
      });
    });
  };

  await Promise.all([
    waitForMapIdle(mapViewRef),
    waitForMapIdle(mapContainerRef)
  ]);

  // Find the main element
  const mainEl = document.querySelector('main') as HTMLElement;
  if (!mainEl) {
    console.error('❌ Missing main element');
    throw new Error('Missing main element');
  }

  console.log('✅ Main element found:', mainEl);

  // Hide UI elements we don't want
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

  // Add screenshot-capture-mode class to strip oklch colors
  console.log('🎨 Adding screenshot-capture-mode class to body');
  document.body.classList.add('screenshot-capture-mode');

  try {
    console.log('🎨 Using html2canvas to capture entire scene...');

    // Use html2canvas which properly handles absolutely positioned elements
    const canvas = await html2canvas(mainEl, {
      backgroundColor: null, // Transparent background
      scale: 1, // Use device pixel ratio
      logging: true, // ✅ Enable logging to see errors
      useCORS: true,
      allowTaint: true,
      onclone: (clonedDoc) => {
        // Sanitize the cloned document to remove unsupported CSS
        sanitizeUI(clonedDoc);
      },
      ignoreElements: (element) => {
        // Skip Mapbox controls
        if (element.classList?.contains('mapboxgl-ctrl-logo') ||
            element.classList?.contains('mapboxgl-ctrl-attrib') ||
            element.classList?.contains('mapboxgl-ctrl-bottom-left') ||
            element.classList?.contains('mapboxgl-ctrl-bottom-right')) {
          return true;
        }
        return false;
      }
    });

    console.log('✅ html2canvas complete');

    // Apply maxWidth scaling if needed
    let finalCanvas = canvas;
    if (opts.maxWidth && canvas.width > opts.maxWidth) {
      console.log(`📐 Scaling from ${canvas.width}px to ${opts.maxWidth}px`);
      const scale = opts.maxWidth / canvas.width;
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = opts.maxWidth;
      scaledCanvas.height = Math.round(canvas.height * scale);
      const ctx = scaledCanvas.getContext('2d')!;
      ctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
      finalCanvas = scaledCanvas;
    }

    const finalImage = finalCanvas.toDataURL('image/png');
    console.log('✅ Final image:', (finalImage.length / 1024).toFixed(2), 'KB');
    console.log('🎉 Screenshot capture complete!');

    return finalImage;

  } finally {
    // Restore hidden elements
    console.log('🔄 Restoring visibility...');
    for (const { el, prev } of hidden) {
      el.style.visibility = prev;
    }

    // Remove screenshot-capture-mode class
    console.log('🎨 Removing screenshot-capture-mode class from body');
    document.body.classList.remove('screenshot-capture-mode');
  }
}
import domtoimage from 'dom-to-image-more';
import type mapboxgl from 'mapbox-gl';

type Options = {
  frameEl?: HTMLElement;             // wrapper containing map + overlays
  backdropSelector?: string;         // modal curtain to hide during capture
  excludeSelector?: string;          // things to hide (toolbars, etc.)
  overlayWhitelistSelector?: string; // OPTIONAL: limit overlays to these
  maxWidth?: number;                 // optional export width cap (e.g. 1024)
};

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

  // 3) hide backdrops / UI you don't want in the shot
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
  hide(opts.backdropSelector);          // e.g. '.modal-backdrop'
  hide(opts.excludeSelector);           // e.g. '.sidebar, .header'

  // 4) pass A: map canvas bitmap
  //    (Map must be created with preserveDrawingBuffer: true)
  console.log('🎨 Pass A: Capturing WebGL map canvas...');
  const mapCanvas = map.getCanvas();
  const mapBitmap = mapCanvas.toDataURL('image/png');
  console.log('✅ Pass A complete:', (mapBitmap.length / 1024).toFixed(2), 'KB');

  // 5) pass B: DOM overlays bitmap
  //    Hide the map canvas so DOM shot is overlays-only.
  console.log('🎨 Pass B: Capturing DOM overlays...');
  const prevMapVis = mapCanvas.style.visibility;
  mapCanvas.style.visibility = 'hidden';

  // Optional: narrow to only certain overlays
  let toHide: Array<{ el: HTMLElement; prev: string }> = [];
  if (opts.overlayWhitelistSelector) {
    console.log('🔍 Using overlay whitelist:', opts.overlayWhitelistSelector);
    const all = Array.from(frameEl.querySelectorAll<HTMLElement>('*'));
    const keep = new Set(
      Array.from(
        frameEl.querySelectorAll<HTMLElement>(opts.overlayWhitelistSelector)
      )
    );
    console.log(`📋 Found ${keep.size} elements to keep out of ${all.length} total`);
    toHide = all
      .filter((el) => el !== frameEl && el !== mapCanvas && !keep.has(el))
      .map((el) => {
        const prev = el.style.visibility;
        el.style.visibility = 'hidden';
        return { el, prev };
      });
    console.log(`🙈 Temporarily hiding ${toHide.length} non-whitelisted elements`);
  } else {
    console.log('📋 No whitelist - capturing all overlays in #map-overlays');
  }

  let overlayPng: string;
  try {
    overlayPng = await domtoimage.toPng(frameEl, {
      quality: 0.92, // Slightly reduce quality for faster processing
      width: exportW,
      height: exportH,
      style: {
        transform: `scale(${(exportW / cssW) || 1})`,
        transformOrigin: 'top left',
      },
      // Filter to skip cross-origin images and Mapbox controls
      filter: (node: any) => {
        // Skip Mapbox attribution/logo controls to avoid SVG errors
        if (node.classList) {
          if (node.classList.contains('mapboxgl-ctrl-logo') || 
              node.classList.contains('mapboxgl-ctrl-attrib') ||
              node.classList.contains('mapboxgl-ctrl-bottom-left') ||
              node.classList.contains('mapboxgl-ctrl-bottom-right')) {
            return false;
          }
        }
        
        // Skip images from external domains to avoid CORS errors
        if (node.tagName === 'IMG' && node.src && !node.src.startsWith(window.location.origin)) {
          return false;
        }
        
        return true;
      },
      // Skip font embedding for speed (system fonts will be used)
      skipFonts: true,
    });
    console.log('✅ Pass B complete:', (overlayPng.length / 1024).toFixed(2), 'KB');
  } catch (error) {
    console.error('❌ Pass B failed:', error);
    throw error;
  }

  // restore
  console.log('🔄 Restoring visibility...');
  mapCanvas.style.visibility = prevMapVis;
  for (const { el, prev } of toHide) el.style.visibility = prev;
  for (const { el, prev } of hidden) el.style.visibility = prev;

  // 6) composite
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

  await drawDataUrl(mapBitmap, 'map bitmap');
  await drawDataUrl(overlayPng, 'overlay bitmap');

  // 7) pass C: telestrator canvas (if present)
  //    Capture telestrator canvas which is positioned fixed covering entire viewport
  console.log('🎨 Pass C: Capturing telestrator canvas...');
  const telestratorCanvas = document.querySelector('canvas.fixed.inset-0.cursor-crosshair') as HTMLCanvasElement;
  
  if (telestratorCanvas && telestratorCanvas.width > 0 && telestratorCanvas.height > 0) {
    try {
      console.log('📐 Telestrator canvas size:', telestratorCanvas.width, 'x', telestratorCanvas.height);
      console.log('📐 Frame element position:', frameEl.getBoundingClientRect());
      
      // The telestrator canvas is full viewport size
      // We need to crop the portion that overlaps with the map frame
      const frameRect = frameEl.getBoundingClientRect();
      
      // Calculate the source rectangle from the telestrator canvas that matches the frame area
      const srcX = frameRect.left;
      const srcY = frameRect.top;
      const srcW = frameRect.width;
      const srcH = frameRect.height;
      
      console.log('📐 Cropping telestrator from:', { srcX, srcY, srcW, srcH });
      console.log('📐 Export dimensions:', { exportW, exportH });
      
      // Create a temporary canvas to crop the telestrator
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = exportW;
      tempCanvas.height = exportH;
      const tempCtx = tempCanvas.getContext('2d')!;
      
      // Draw the cropped portion of the telestrator to the temp canvas
      tempCtx.drawImage(
        telestratorCanvas,
        srcX, srcY, srcW, srcH,  // source rectangle (crop from telestrator)
        0, 0, exportW, exportH    // destination rectangle (temp canvas)
      );
      
      // Now draw the temp canvas onto our composite
      ctx.drawImage(tempCanvas, 0, 0);
      
      console.log('✅ Drew telestrator canvas to composite');
      console.log('✅ Pass C complete');
    } catch (error) {
      console.warn('⚠️ Failed to capture telestrator canvas:', error);
    }
  } else {
    console.log('ℹ️ No telestrator canvas found or canvas is empty');
  }

  const finalImage = out.toDataURL('image/png');
  console.log('✅ Final composite image:', (finalImage.length / 1024).toFixed(2), 'KB');
  console.log('🎉 Screenshot capture complete!');
  
  return finalImage;
}
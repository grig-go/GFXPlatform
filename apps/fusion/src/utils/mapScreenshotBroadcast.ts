import html2canvas from 'html2canvas';
import type mapboxgl from 'mapbox-gl';
import { fixMarkersInsideClone, fixMapboxCanvasForClone } from './fixMarkersForScreenshot';

type Options = {
  frameEl?: HTMLElement;
  backdropSelector?: string;
  excludeSelector?: string;
  maxWidth?: number;
};

/**
 * BROADCAST-GRADE MAP SCREENSHOT
 * 
 * Uses html2canvas with computed transform parsing to convert
 * Mapbox's transform matrices to absolute pixel positions in the clone.
 * 
 * This is the industry-standard approach for production map screenshots.
 */
export async function captureMapScreenshotBroadcast(map: mapboxgl.Map, opts: Options = {}) {
  console.log('📸 captureMapScreenshotBroadcast: Starting...');
  
  if (!map) {
    console.error('❌ No map instance provided');
    throw new Error('No map instance');
  }

  console.log('⏳ Checking map state...');
  
  // Ensure map is ready
  await new Promise<void>((resolve) => {
    if ((map as any)._idle) {
      console.log('✅ Map already idle');
      return resolve();
    }
    
    let resolved = false;
    
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

  try {
    console.log('🎨 Preparing for html2canvas capture...');
    
    const canvas = map.getCanvas();
    const mapContainer = canvas.parentElement;
    
    if (!mapContainer) {
      throw new Error('Map container not found');
    }

    console.log('📐 Map container found');
    
    // Wait for any animations to complete
    await new Promise(requestAnimationFrame);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Use html2canvas with computed transform parsing
    const screenshotCanvas = await html2canvas(mapContainer, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      scale: 1,
      logging: false,
      ignoreElements: (element) => {
        // Ignore elements matching exclude selector
        if (opts.excludeSelector && element.matches(opts.excludeSelector)) {
          return true;
        }
        return false;
      },
      onclone: (cloneDoc) => {
        console.log('🔄 onclone: Fixing marker visibility for screenshot...');
        fixMarkersInsideClone(cloneDoc);
        console.log('✅ All markers fixed for capture');

        // Apply backdrop styling if specified
        if (opts.backdropSelector) {
          const backdrop = cloneDoc.querySelector(opts.backdropSelector);
          if (backdrop instanceof HTMLElement) {
            backdrop.style.backgroundColor = '#ffffff';
          }
        }
      }
    });

    console.log('✅ html2canvas capture complete');

    // Scale down if needed
    const maxWidth = opts.maxWidth || 2048;
    let finalCanvas = screenshotCanvas;

    if (screenshotCanvas.width > maxWidth) {
      const scale = maxWidth / screenshotCanvas.width;
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = maxWidth;
      scaledCanvas.height = Math.floor(screenshotCanvas.height * scale);
      
      const ctx = scaledCanvas.getContext('2d')!;
      ctx.drawImage(screenshotCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
      
      finalCanvas = scaledCanvas;
      console.log(`📏 Scaled down to ${maxWidth}px width`);
    }

    const finalImage = finalCanvas.toDataURL('image/png');

    console.log('✅ Screenshot captured:', (finalImage.length / 1024).toFixed(2), 'KB');
    console.log('🎉 Broadcast-grade screenshot complete!');

    return finalImage;

  } catch (error) {
    console.error('❌ Screenshot capture failed:', error);
    throw error;
  }
}
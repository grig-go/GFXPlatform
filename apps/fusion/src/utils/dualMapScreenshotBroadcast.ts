import html2canvas from 'html2canvas';
import type mapboxgl from 'mapbox-gl';
import { fixMarkersInsideClone, fixMapboxCanvasForClone } from './fixMarkersForScreenshot';

/**
 * BROADCAST-GRADE DUAL MAP SCREENSHOT
 * 
 * Captures two side-by-side maps using html2canvas with computed transform parsing.
 */
export async function captureDualMapScreenshotBroadcast(
  leftMap: mapboxgl.Map | null,
  rightMap: mapboxgl.Map | null,
  maxWidth: number = 2048
): Promise<string> {
  console.log('📸 captureDualMapScreenshotBroadcast: Starting...');

  if (!leftMap || !rightMap) {
    console.error('❌ Both maps must be provided');
    throw new Error('Both maps required for dual screenshot');
  }

  try {
    // Wait for both maps to be idle
    console.log('⏳ Waiting for both maps to be ready...');
    await Promise.all([
      new Promise<void>((resolve) => {
        if ((leftMap as any)._idle) {
          resolve();
        } else {
          leftMap.once('idle', () => resolve());
        }
      }),
      new Promise<void>((resolve) => {
        if ((rightMap as any)._idle) {
          resolve();
        } else {
          rightMap.once('idle', () => resolve());
        }
      })
    ]);

    console.log('✅ Both maps ready');

    // Get both map containers
    const leftCanvas = leftMap.getCanvas();
    const rightCanvas = rightMap.getCanvas();
    const leftContainer = leftCanvas.parentElement;
    const rightContainer = rightCanvas.parentElement;

    if (!leftContainer || !rightContainer) {
      throw new Error('Map containers not found');
    }

    // Wait for animations
    await new Promise(requestAnimationFrame);
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('📸 Capturing left map...');
    
    // Capture left map with pixel positioning
    const leftScreenshot = await html2canvas(leftContainer, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      scale: 1,
      logging: false,
      onclone: (cloneDoc) => {
        console.log('🔄 onclone (LEFT): Fixing marker visibility for screenshot...');
        fixMarkersInsideClone(cloneDoc);
      }
    });

    console.log('✅ Left map captured');
    console.log('📸 Capturing right map...');

    // Capture right map with pixel positioning
    const rightScreenshot = await html2canvas(rightContainer, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      scale: 1,
      logging: false,
      onclone: (cloneDoc) => {
        console.log('🔄 onclone (RIGHT): Fixing marker visibility for screenshot...');
        fixMarkersInsideClone(cloneDoc);
      }
    });

    console.log('✅ Right map captured');
    console.log('🎨 Combining maps side-by-side...');

    // Combine the two screenshots side by side
    const combinedCanvas = document.createElement('canvas');
    const totalWidth = leftScreenshot.width + rightScreenshot.width;
    const maxHeight = Math.max(leftScreenshot.height, rightScreenshot.height);
    
    combinedCanvas.width = totalWidth;
    combinedCanvas.height = maxHeight;

    const ctx = combinedCanvas.getContext('2d')!;

    // Draw left map
    ctx.drawImage(leftScreenshot, 0, 0);

    // Draw right map
    ctx.drawImage(rightScreenshot, leftScreenshot.width, 0);

    console.log('✅ Maps combined');

    // Scale down if needed
    let finalCanvas = combinedCanvas;

    if (combinedCanvas.width > maxWidth) {
      const scale = maxWidth / combinedCanvas.width;
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = maxWidth;
      scaledCanvas.height = Math.floor(combinedCanvas.height * scale);
      
      const scaledCtx = scaledCanvas.getContext('2d')!;
      scaledCtx.drawImage(combinedCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
      
      finalCanvas = scaledCanvas;
      console.log(`📏 Scaled down to ${maxWidth}px width`);
    }

    const finalImage = finalCanvas.toDataURL('image/png');

    console.log('✅ Dual screenshot captured:', (finalImage.length / 1024).toFixed(2), 'KB');
    console.log('🎉 Broadcast-grade dual screenshot complete!');

    return finalImage;

  } catch (error) {
    console.error('❌ Dual screenshot capture failed:', error);
    throw error;
  }
}
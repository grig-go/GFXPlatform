import html2canvas from 'html2canvas';

/**
 * Pre-capture all canvas elements as images for cloning
 * Canvas elements lose their content when cloned, so we need to capture them first
 */
function captureAllCanvases(container: HTMLElement): Map<HTMLCanvasElement, string> {
  const canvasImages = new Map<HTMLCanvasElement, string>();
  const allCanvases = container.querySelectorAll('canvas');

  allCanvases.forEach((canvas) => {
    try {
      const dataUrl = canvas.toDataURL('image/png');
      // Only store if we got real content (not just a blank canvas header)
      if (dataUrl && dataUrl.length > 1000) {
        canvasImages.set(canvas, dataUrl);
        console.log('📷 Pre-captured canvas:', canvas.className, dataUrl.length, 'chars');
      }
    } catch (e) {
      console.warn('Could not capture canvas:', canvas.className, e);
    }
  });

  return canvasImages;
}

/**
 * Capture a snapshot of the canvas stage and return it as a base64 data URL
 * @param quality - JPEG quality from 0 to 1 (default 0.7)
 * @param maxWidth - Maximum width of thumbnail (default 480)
 * @returns Base64 data URL of the snapshot
 */
export async function captureCanvasSnapshot(
  quality: number = 0.7,
  maxWidth: number = 480
): Promise<string | null> {
  try {
    // Find the stage element
    const stageElement = document.querySelector('[data-stage="true"]') as HTMLElement;

    if (!stageElement) {
      console.warn('Could not find stage element for snapshot');
      return null;
    }

    // Get the zoom/pan transform container (parent of stage)
    const transformContainer = stageElement.parentElement;

    // Save original transform
    const originalTransform = transformContainer?.style.transform || '';

    // Wait for all images to load
    await waitForImages(stageElement);

    // Wait for maps to render
    await waitForMaps(stageElement);

    // Pre-capture ALL canvas elements (charts, maps, etc.)
    const canvasImages = captureAllCanvases(stageElement);

    // Get dimensions from inline style (set explicitly in Stage.tsx)
    const stageWidth = parseInt(stageElement.style.width) || stageElement.offsetWidth || 1920;
    const stageHeight = parseInt(stageElement.style.height) || stageElement.offsetHeight || 1080;

    console.log('📸 Capturing stage:', { stageWidth, stageHeight, canvasCount: canvasImages.size });

    // Temporarily reset the transform for capture
    if (transformContainer) {
      transformContainer.style.transform = 'translate(0px, 0px) scale(1)';
    }

    // Give browser time to apply the transform reset
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Calculate scale for thumbnail
    const scale = Math.min(1, maxWidth / stageWidth);

    // Capture using html2canvas with onclone to fix transforms
    const canvas = await html2canvas(stageElement, {
      backgroundColor: '#1a1a2e',
      scale: scale,
      logging: false,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: false,
      width: stageWidth,
      height: stageHeight,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      ignoreElements: (element) => {
        const classList = element.classList;
        if (classList) {
          return classList.contains('resize-handle') ||
                 classList.contains('selection-box') ||
                 classList.contains('transform-controls') ||
                 classList.contains('mapboxgl-ctrl');
        }
        return false;
      },
      onclone: (clonedDoc: Document, clonedElement: HTMLElement) => {
        // Reset any remaining transforms on the cloned element
        clonedElement.style.transform = 'none';

        // Find parent transform container in clone and reset it
        const clonedParent = clonedElement.parentElement;
        if (clonedParent) {
          clonedParent.style.transform = 'none';
          clonedParent.style.position = 'static';
        }

        // Replace all canvas elements with images in the clone
        const clonedCanvases = clonedElement.querySelectorAll('canvas');
        const originalCanvases = Array.from(stageElement.querySelectorAll('canvas'));

        clonedCanvases.forEach((clonedCanvas, index) => {
          const originalCanvas = originalCanvases[index];
          if (!originalCanvas) return;

          const imageDataUrl = canvasImages.get(originalCanvas);
          if (imageDataUrl && clonedCanvas.parentNode) {
            // Create an image element to replace the canvas
            const img = clonedDoc.createElement('img');
            img.src = imageDataUrl;
            img.style.cssText = `
              width: ${clonedCanvas.offsetWidth || clonedCanvas.width}px;
              height: ${clonedCanvas.offsetHeight || clonedCanvas.height}px;
              position: absolute;
              top: 0;
              left: 0;
            `;
            // Copy any class names for styling
            img.className = clonedCanvas.className;
            clonedCanvas.parentNode.replaceChild(img, clonedCanvas);
          }
        });

        // Ensure all images have crossOrigin set
        const images = clonedDoc.querySelectorAll('img');
        images.forEach((img) => {
          if (img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:')) {
            img.crossOrigin = 'anonymous';
          }
        });
      },
    });

    // Restore original transform
    if (transformContainer) {
      transformContainer.style.transform = originalTransform;
    }

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/jpeg', quality);

    console.log('✅ Canvas snapshot captured', {
      originalSize: `${stageWidth}x${stageHeight}`,
      thumbnailSize: `${canvas.width}x${canvas.height}`,
      dataUrlLength: dataUrl.length,
    });

    return dataUrl;
  } catch (error) {
    console.error('Failed to capture canvas snapshot:', error);
    return null;
  }
}

/**
 * Wait for all images within an element to load
 */
async function waitForImages(container: HTMLElement): Promise<void> {
  const images = container.querySelectorAll('img');
  const imagePromises: Promise<void>[] = [];

  images.forEach((img) => {
    if (!img.complete) {
      imagePromises.push(
        new Promise((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Continue even if image fails
          // Set a timeout in case image never loads
          setTimeout(resolve, 2000);
        })
      );
    }
  });

  // Also wait for background images in divs
  const bgElements = container.querySelectorAll('[style*="background-image"]');
  bgElements.forEach((el) => {
    const style = getComputedStyle(el);
    const bgImage = style.backgroundImage;
    if (bgImage && bgImage !== 'none') {
      const urlMatch = bgImage.match(/url\(['"]?(.+?)['"]?\)/);
      if (urlMatch && urlMatch[1]) {
        imagePromises.push(
          new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = urlMatch[1];
            setTimeout(resolve, 2000);
          })
        );
      }
    }
  });

  if (imagePromises.length > 0) {
    await Promise.all(imagePromises);
    // Small delay to ensure rendering is complete
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Wait for Mapbox maps to render and trigger a redraw
 */
async function waitForMaps(container: HTMLElement): Promise<void> {
  const mapContainers = container.querySelectorAll('.mapbox-container, .mapboxgl-map');

  if (mapContainers.length === 0) return;

  // Wait for initial map load
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Trigger resize on all maps to force a redraw
  // This ensures the WebGL buffer has the latest content
  const mapCanvases = container.querySelectorAll('.mapboxgl-canvas');
  if (mapCanvases.length > 0) {
    // Trigger window resize to make Mapbox redraw
    window.dispatchEvent(new Event('resize'));

    // Wait for resize to be processed
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Trigger another frame render by requesting animation frame
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  }

  // Final wait for tiles to finish loading
  await new Promise((resolve) => setTimeout(resolve, 300));
}

/**
 * Get a simple placeholder thumbnail as a data URL
 * Used when no elements exist or capture fails
 */
export function getPlaceholderThumbnail(
  width: number = 480,
  height: number = 270,
  text: string = ''
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';

  // Draw checkerboard background
  const squareSize = 10;
  for (let y = 0; y < height; y += squareSize) {
    for (let x = 0; x < width; x += squareSize) {
      const isEven = ((x / squareSize) + (y / squareSize)) % 2 === 0;
      ctx.fillStyle = isEven ? '#1a1a1a' : '#252525';
      ctx.fillRect(x, y, squareSize, squareSize);
    }
  }

  // Draw text if provided
  if (text) {
    ctx.fillStyle = '#666';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
  }

  return canvas.toDataURL('image/jpeg', 0.6);
}

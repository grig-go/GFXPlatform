import html2canvas from 'html2canvas';

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

    // Wait for all images to load
    await waitForImages(stageElement);
    
    // Wait for maps to render (Mapbox GL uses canvas)
    await waitForMaps(stageElement);

    // Calculate scale factor for thumbnail
    const stageWidth = stageElement.offsetWidth;
    const stageHeight = stageElement.offsetHeight;
    const scale = Math.min(1, maxWidth / stageWidth);

    // Capture the stage using html2canvas with enhanced settings
    const canvas = await html2canvas(stageElement, {
      backgroundColor: '#1a1a2e', // Dark background for transparent areas
      scale: scale,
      logging: false,
      useCORS: true,
      allowTaint: true,
      // Proxy for cross-origin images (if available)
      proxy: undefined,
      // Handle foreign objects (SVG, etc.)
      foreignObjectRendering: true,
      // Remove browser scrollbars from capture
      scrollX: 0,
      scrollY: 0,
      // Capture at actual size
      width: stageWidth,
      height: stageHeight,
      // Don't capture elements with these classes (like selection handles)
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
      // Callback before rendering each element
      onclone: (clonedDoc: Document) => {
        // Find all Mapbox canvases in the cloned document and copy their content
        const originalMaps = stageElement.querySelectorAll('.mapboxgl-canvas');
        const clonedMaps = clonedDoc.querySelectorAll('.mapboxgl-canvas');
        
        originalMaps.forEach((originalCanvas, index) => {
          const clonedCanvas = clonedMaps[index] as HTMLCanvasElement;
          const originalCtx = (originalCanvas as HTMLCanvasElement).getContext('webgl') || 
                             (originalCanvas as HTMLCanvasElement).getContext('webgl2');
          
          if (clonedCanvas && originalCtx) {
            try {
              // Create a 2D canvas to copy the WebGL content
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = (originalCanvas as HTMLCanvasElement).width;
              tempCanvas.height = (originalCanvas as HTMLCanvasElement).height;
              const tempCtx = tempCanvas.getContext('2d');
              
              if (tempCtx) {
                tempCtx.drawImage(originalCanvas as HTMLCanvasElement, 0, 0);
                
                // Replace the cloned canvas with an image of the map
                const img = clonedDoc.createElement('img');
                img.src = tempCanvas.toDataURL('image/png');
                img.style.width = clonedCanvas.style.width;
                img.style.height = clonedCanvas.style.height;
                img.style.position = 'absolute';
                img.style.top = '0';
                img.style.left = '0';
                clonedCanvas.parentNode?.replaceChild(img, clonedCanvas);
              }
            } catch (e) {
              console.warn('Could not capture map canvas:', e);
            }
          }
        });

        // Ensure images have crossOrigin set
        const images = clonedDoc.querySelectorAll('img');
        images.forEach((img) => {
          if (img.src && !img.src.startsWith('data:')) {
            img.crossOrigin = 'anonymous';
          }
        });
      },
    });

    // Convert to data URL (JPEG for smaller file size)
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
 * Wait for Mapbox maps to render
 */
async function waitForMaps(container: HTMLElement): Promise<void> {
  const mapContainers = container.querySelectorAll('.mapbox-container, .mapboxgl-map');
  
  if (mapContainers.length === 0) return;

  // Wait for maps to be fully rendered
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Check if map canvases have content
  const mapCanvases = container.querySelectorAll('.mapboxgl-canvas');
  mapCanvases.forEach((canvas) => {
    const htmlCanvas = canvas as HTMLCanvasElement;
    // Force a re-render by triggering resize
    const event = new Event('resize');
    window.dispatchEvent(event);
  });

  // Additional wait for map tiles to load
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

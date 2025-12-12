/**
 * Image utility functions for Nova GFX
 */

/**
 * Remove white/light background from an image and make it transparent
 * Uses canvas to analyze each pixel and make light pixels transparent
 *
 * @param imageUrl - URL of the image to process
 * @param threshold - Brightness threshold (0-255). Pixels above this are considered "white". Default 240.
 * @param tolerance - How much variation from pure white to allow. Default 15.
 * @returns Promise<string> - Data URL of the processed image with transparent background
 */
export async function removeWhiteBackground(
  imageUrl: string,
  threshold: number = 240,
  tolerance: number = 15
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw the image
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Process each pixel
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Check if pixel is "white-ish" (all channels are high and similar)
        const isLight = r >= threshold && g >= threshold && b >= threshold;
        const isUniform = Math.abs(r - g) <= tolerance &&
                          Math.abs(g - b) <= tolerance &&
                          Math.abs(r - b) <= tolerance;

        if (isLight && isUniform) {
          // Make this pixel transparent
          data[i + 3] = 0; // Set alpha to 0
        }
      }

      // Put the modified image data back
      ctx.putImageData(imageData, 0, 0);

      // Return as PNG data URL (PNG supports transparency)
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for background removal'));
    };

    img.src = imageUrl;
  });
}

/**
 * Remove background with edge feathering for smoother results
 * More sophisticated version that creates smooth edges
 *
 * @param imageUrl - URL of the image to process
 * @param threshold - Brightness threshold (0-255). Default 235.
 * @param feather - Edge feathering amount in pixels. Default 2.
 * @returns Promise<string> - Data URL of the processed image
 */
export async function removeBackgroundWithFeather(
  imageUrl: string,
  threshold: number = 235,
  feather: number = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      const height = canvas.height;

      // First pass: identify white pixels
      const isWhite: boolean[] = new Array(width * height);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Check if pixel is white-ish
          const brightness = (r + g + b) / 3;
          const isUniform = Math.abs(r - g) <= 20 &&
                            Math.abs(g - b) <= 20 &&
                            Math.abs(r - b) <= 20;

          isWhite[y * width + x] = brightness >= threshold && isUniform;
        }
      }

      // Second pass: apply transparency with feathering
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const i = idx * 4;

          if (isWhite[idx]) {
            // Check distance to nearest non-white pixel for feathering
            let minDist = feather + 1;

            for (let dy = -feather; dy <= feather; dy++) {
              for (let dx = -feather; dx <= feather; dx++) {
                const nx = x + dx;
                const ny = y + dy;

                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const nidx = ny * width + nx;
                  if (!isWhite[nidx]) {
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    minDist = Math.min(minDist, dist);
                  }
                }
              }
            }

            // Apply graduated transparency based on distance
            if (minDist <= feather) {
              // Near edge - partial transparency
              const alpha = Math.floor(255 * (1 - minDist / feather) * 0.3);
              data[i + 3] = alpha;
            } else {
              // Fully white area - fully transparent
              data[i + 3] = 0;
            }
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for background removal'));
    };

    img.src = imageUrl;
  });
}

/**
 * Check if an image likely has a white background that can be removed
 * Analyzes the corners and edges of the image
 *
 * @param imageUrl - URL of the image to check
 * @returns Promise<boolean> - True if image likely has a removable white background
 */
export async function hasWhiteBackground(imageUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 50; // Sample size from corners
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(false);
        return;
      }

      ctx.drawImage(img, 0, 0);

      // Sample corners
      const corners = [
        ctx.getImageData(0, 0, size, size), // Top-left
        ctx.getImageData(canvas.width - size, 0, size, size), // Top-right
        ctx.getImageData(0, canvas.height - size, size, size), // Bottom-left
        ctx.getImageData(canvas.width - size, canvas.height - size, size, size), // Bottom-right
      ];

      let whitePixels = 0;
      let totalPixels = 0;

      for (const cornerData of corners) {
        const data = cornerData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Check if pixel is white-ish
          if (r >= 240 && g >= 240 && b >= 240) {
            whitePixels++;
          }
          totalPixels++;
        }
      }

      // If more than 70% of corner pixels are white, likely has white background
      resolve(whitePixels / totalPixels > 0.7);
    };

    img.onerror = () => {
      resolve(false);
    };

    img.src = imageUrl;
  });
}

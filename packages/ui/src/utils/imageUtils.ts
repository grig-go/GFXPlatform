/**
 * Image utility functions for media processing
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

import { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Link, AlertCircle } from 'lucide-react';
import { Button, Input } from '@emergent-platform/ui';
import { useDesignerStore } from '@/stores/designerStore';
import { MediaPickerDialog } from '@/components/dialogs/MediaPickerDialog';

// Generate initials from element name
function getInitials(name: string): string {
  return name
    .split(/[\s_-]+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

// Generate a consistent color from string
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 45%)`;
}

// Check if URL is explicitly a placeholder (only empty or obvious placeholders)
function isPlaceholderUrl(url: string): boolean {
  if (!url || url.trim() === '') return true;
  // Only treat these as placeholders - actual placeholder services
  const placeholderPatterns = [
    'via.placeholder.com',
    'placehold.it',
    'placeholder.com',
    'dummyimage.com',
    'fakeimg.pl',
  ];
  return placeholderPatterns.some((pattern) => url.toLowerCase().includes(pattern));
}

interface ImageElementProps {
  content: {
    type: 'image';
    src?: string;
    fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
    border?: {
      enabled: boolean;
      width?: number;
      color?: string;
    };
    cornerRadius?: number;
    blur?: {
      enabled: boolean;
      amount?: number;
    };
    opacity?: number;
    blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion';
    removeBackground?: {
      enabled: boolean;
      color?: string;
      threshold?: number;
      feather?: number;
    };
  };
  width: number | null;
  height: number | null;
  elementId?: string;
  elementName: string;
  isSelected?: boolean;
  isPreview?: boolean;
  style?: React.CSSProperties;
}

export function ImageElement({
  content,
  width,
  height,
  elementId,
  elementName,
  isSelected = false,
  isPreview = false,
  style,
}: ImageElementProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState(content.src || '');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const updateElement = useDesignerStore((state) => state.updateElement);

  const elementWidth = width || 400;
  const elementHeight = height || 300;

  // Parse hex color to RGB values
  const hexToRgb = useCallback((hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 255, b: 255 }; // Default to white
  }, []);

  // Process image to remove specified background color
  const processBackgroundRemoval = useCallback(async (imageSrc: string) => {
    if (!content.removeBackground?.enabled) {
      setProcessedSrc(null);
      return;
    }

    setIsProcessing(true);

    try {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageSrc;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Get the target color to remove (default white)
      const targetColor = hexToRgb(content.removeBackground?.color || '#FFFFFF');
      const threshold = content.removeBackground?.threshold ?? 240;
      const feather = content.removeBackground?.feather ?? 0;

      // Calculate tolerance based on threshold (255 - threshold gives us the tolerance range)
      const colorTolerance = 255 - threshold;

      // Check if a pixel matches the target color within tolerance
      const matchesTargetColor = (r: number, g: number, b: number): boolean => {
        const diffR = Math.abs(r - targetColor.r);
        const diffG = Math.abs(g - targetColor.g);
        const diffB = Math.abs(b - targetColor.b);
        return diffR <= colorTolerance && diffG <= colorTolerance && diffB <= colorTolerance;
      };

      if (feather > 0) {
        // With feathering: two-pass approach for smooth edges
        const width = canvas.width;
        const height = canvas.height;
        const isTarget: boolean[] = new Array(width * height);

        // First pass: identify matching pixels
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            isTarget[y * width + x] = matchesTargetColor(r, g, b);
          }
        }

        // Second pass: apply transparency with feathering
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const i = idx * 4;

            if (isTarget[idx]) {
              let minDist = feather + 1;

              for (let dy = -feather; dy <= feather; dy++) {
                for (let dx = -feather; dx <= feather; dx++) {
                  const nx = x + dx;
                  const ny = y + dy;

                  if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nidx = ny * width + nx;
                    if (!isTarget[nidx]) {
                      const dist = Math.sqrt(dx * dx + dy * dy);
                      minDist = Math.min(minDist, dist);
                    }
                  }
                }
              }

              if (minDist <= feather) {
                data[i + 3] = Math.floor(255 * (1 - minDist / feather) * 0.3);
              } else {
                data[i + 3] = 0;
              }
            }
          }
        }
      } else {
        // Simple removal without feathering
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          if (matchesTargetColor(r, g, b)) {
            data[i + 3] = 0;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setProcessedSrc(canvas.toDataURL('image/png'));
    } catch (err) {
      console.error('Failed to remove background:', err);
      setProcessedSrc(null);
    } finally {
      setIsProcessing(false);
    }
  }, [content.removeBackground?.enabled, content.removeBackground?.color, content.removeBackground?.threshold, content.removeBackground?.feather, hexToRgb]);

  // Reset error state when src changes
  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    setUrlInput(content.src || '');
    setProcessedSrc(null);
  }, [content.src]);

  // Process background removal when settings change
  useEffect(() => {
    if (content.src && !isPlaceholderUrl(content.src)) {
      processBackgroundRemoval(content.src);
    }
  }, [content.src, processBackgroundRemoval]);

  // Determine if we should show placeholder
  const showPlaceholder = !content.src || hasError || isPlaceholderUrl(content.src || '');
  const initials = getInitials(elementName);
  const bgColor = stringToColor(elementName);

  // Handle URL update
  const handleUrlSubmit = () => {
    if (elementId && urlInput !== content.src) {
      updateElement(elementId, {
        content: {
          ...content,
          src: urlInput,
        },
      });
    }
    setShowUrlInput(false);
  };

  // Handle media picker selection
  const handleMediaSelect = (url: string) => {
    if (elementId) {
      updateElement(elementId, {
        content: {
          ...content,
          src: url,
        },
      });
    }
    setShowMediaPicker(false);
  };

  // Build image styles
  // Note: mixBlendMode is applied at the container level (StageElement) to blend with other elements
  const blurAmount = content.blur?.enabled ? (content.blur.amount || 0) : 0;
  // Scale up slightly when blur is applied to hide the soft edges
  const blurScale = blurAmount > 0 ? 1 + (blurAmount * 0.04) : 1;

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: content.fit || 'cover',
    borderRadius: content.cornerRadius ? `${content.cornerRadius}px` : undefined,
    border: content.border?.enabled
      ? `${content.border.width || 2}px solid ${content.border.color || '#FFFFFF'}`
      : undefined,
    filter: blurAmount > 0 ? `blur(${blurAmount}px)` : undefined,
    transform: blurAmount > 0 ? `scale(${blurScale})` : undefined,
    opacity: content.opacity ?? 1,
    // mixBlendMode is handled at StageElement container level for proper blending with other elements
    ...style,
  };

  // Show URL input overlay when selected and no image or error
  if (showUrlInput) {
    return (
      <div
        className="relative flex flex-col items-center justify-center bg-neutral-900 rounded-lg overflow-hidden"
        style={{ width: elementWidth, height: elementHeight }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10" />
        <div className="relative z-10 p-6 max-w-md w-full">
          <div className="flex items-center gap-2 mb-4">
            <Link className="w-5 h-5 text-violet-400" />
            <span className="text-white font-medium">Enter Image URL</span>
          </div>
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://example.com/image.png"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              className="flex-1 bg-neutral-800 border-neutral-700 text-white"
              autoFocus
            />
            <Button onClick={handleUrlSubmit} size="sm">
              Apply
            </Button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                setShowUrlInput(false);
                setShowMediaPicker(true);
              }}
            >
              Browse Media
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUrlInput(false)}
            >
              Cancel
            </Button>
          </div>
        </div>

        <MediaPickerDialog
          open={showMediaPicker}
          onOpenChange={setShowMediaPicker}
          onSelect={handleMediaSelect}
          mediaType="image"
          title="Select Image"
        />
      </div>
    );
  }

  // Show placeholder when no valid image
  if (showPlaceholder) {
    return (
      <div
        className="relative overflow-hidden"
        style={{ width: elementWidth, height: elementHeight }}
      >
        <div
          className="w-full h-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-neutral-600"
          style={{
            backgroundColor: bgColor + '20',
            borderRadius: content.cornerRadius ? `${content.cornerRadius}px` : undefined,
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg"
            style={{ backgroundColor: bgColor }}
          >
            {initials || <ImageIcon className="w-8 h-8" />}
          </div>
          <span className="text-xs text-neutral-400 text-center px-2 truncate max-w-full">
            {elementName}
          </span>
          {!isPreview && (
            <span className="text-[10px] text-neutral-500">Click to add image</span>
          )}
        </div>

        {/* Change image button - only show when selected in designer */}
        {isSelected && !isPreview && elementId && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute bottom-2 right-2 h-7 text-xs bg-black/50 hover:bg-black/70 text-white z-50"
            onClick={() => setShowMediaPicker(true)}
          >
            <ImageIcon className="w-3 h-3 mr-1" />
            Add Image
          </Button>
        )}

        <MediaPickerDialog
          open={showMediaPicker}
          onOpenChange={setShowMediaPicker}
          onSelect={handleMediaSelect}
          mediaType="image"
          title="Select Image"
        />
      </div>
    );
  }

  // Determine which source to use (processed or original)
  const displaySrc = content.removeBackground?.enabled && processedSrc ? processedSrc : content.src;

  // Render actual image
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: elementWidth, height: elementHeight }}
    >
      {(isLoading || isProcessing) && (
        <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center z-10">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          {isProcessing && (
            <span className="absolute bottom-2 text-[10px] text-neutral-400">
              Removing background...
            </span>
          )}
        </div>
      )}

      <img
        src={displaySrc}
        alt={elementName}
        style={{
          ...imageStyle,
          display: isLoading ? 'none' : 'block',
        }}
        draggable={false}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />


      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-white">Failed to load image</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-white"
              onClick={() => setShowUrlInput(true)}
            >
              Try another URL
            </Button>
          </div>
        </div>
      )}

      <MediaPickerDialog
        open={showMediaPicker}
        onOpenChange={setShowMediaPicker}
        onSelect={handleMediaSelect}
        mediaType="image"
        title="Select Image"
      />
    </div>
  );
}

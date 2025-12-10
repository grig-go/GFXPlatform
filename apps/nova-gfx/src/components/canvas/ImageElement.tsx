import { useState, useEffect } from 'react';
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

  const updateElement = useDesignerStore((state) => state.updateElement);

  const elementWidth = width || 400;
  const elementHeight = height || 300;

  // Reset error state when src changes
  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    setUrlInput(content.src || '');
  }, [content.src]);

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
  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: content.fit || 'cover',
    borderRadius: content.cornerRadius ? `${content.cornerRadius}px` : undefined,
    border: content.border?.enabled
      ? `${content.border.width || 2}px solid ${content.border.color || '#FFFFFF'}`
      : undefined,
    filter: content.blur?.enabled ? `blur(${content.blur.amount || 0}px)` : undefined,
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

  // Render actual image
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: elementWidth, height: elementHeight }}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center z-10">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <img
        src={content.src}
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

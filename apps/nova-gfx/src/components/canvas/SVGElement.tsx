import { useState, useEffect, useRef } from 'react';
import { AlertCircle, Upload } from 'lucide-react';
import { Button, Input } from '@emergent-platform/ui';
import { useDesignerStore } from '@/stores/designerStore';
import { SVGPickerDialog } from '@/components/dialogs/SVGPickerDialog';

interface SVGElementProps {
  content: {
    type: 'svg';
    src?: string;
    svgContent?: string;
    width?: number;
    height?: number;
    preserveAspectRatio?: string;
    pattern?: {
      type: 'hero-pattern' | 'custom';
      patternName?: string;
      customPattern?: string;
      color?: string;
      opacity?: number;
    };
  };
  width: number | null;
  height: number | null;
  elementId?: string;
  isSelected?: boolean;
  isPreview?: boolean;
}

export function SVGElement({
  content,
  width,
  height,
  elementId,
  isSelected = false,
  isPreview = false,
}: SVGElementProps) {
  const [showSvgPicker, setShowSvgPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [svgData, setSvgData] = useState<string | null>(content.svgContent || null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  
  const updateElement = useDesignerStore((state) => state.updateElement);

  // Load SVG from URL if src is provided
  useEffect(() => {
    if (content.src && !content.svgContent) {
      fetch(content.src)
        .then((res) => res.text())
        .then((text) => {
          setSvgData(text);
          if (elementId) {
            updateElement(elementId, {
              content: {
                ...content,
                svgContent: text,
              },
            });
          }
        })
        .catch((err) => {
          console.error('Failed to load SVG:', err);
          setError('Failed to load SVG from URL');
        });
    } else if (content.svgContent) {
      setSvgData(content.svgContent);
    }
  }, [content.src, content.svgContent, elementId, updateElement]);

  // Handle SVG selection from picker
  const handleSvgSelect = (svgContent: string, src?: string, pattern?: { type: 'hero-pattern' | 'custom'; patternName?: string; customPattern?: string; color?: string; opacity?: number }) => {
    if (!elementId) return;
    
    setSvgData(svgContent);
    setError(null);
    updateElement(elementId, {
      content: {
        ...content,
        svgContent: svgContent,
        src: src,
        pattern: pattern,
      },
    });
  };

  const elementWidth = width || 200;
  const elementHeight = height || 200;

  // Show empty state when no SVG
  if (!svgData && !content.src) {
    return (
      <>
        <div 
          className="relative flex flex-col items-center justify-center bg-neutral-900 rounded-lg overflow-hidden border-2 border-dashed border-neutral-700"
          style={{ width: elementWidth, height: elementHeight }}
        >
          <div className="text-center p-4">
            <Upload className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
            <p className="text-xs text-neutral-400">No SVG loaded</p>
            {isSelected && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => setShowSvgPicker(true)}
              >
                Import SVG
              </Button>
            )}
          </div>
        </div>
        <SVGPickerDialog
          open={showSvgPicker}
          onOpenChange={setShowSvgPicker}
          onSelect={handleSvgSelect}
          currentPattern={content.pattern}
        />
      </>
    );
  }

  // Render SVG
  if (svgData) {
    // Parse and update SVG attributes
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgData, 'image/svg+xml');
    const svgElement = svgDoc.querySelector('svg');
    
    if (svgElement) {
      // Update SVG attributes for proper sizing
      svgElement.setAttribute('width', '100%');
      svgElement.setAttribute('height', '100%');
      svgElement.setAttribute('preserveAspectRatio', content.preserveAspectRatio || 'xMidYMid meet');
      
      // Apply pattern if specified
      if (content.pattern) {
        // Ensure defs element exists
        let defs = svgDoc.querySelector('defs');
        if (!defs) {
          defs = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'defs');
          svgElement.insertBefore(defs, svgElement.firstChild);
        }
        
        // Remove existing pattern if any
        const existingPattern = defs.querySelector('pattern[id="svg-pattern"]');
        if (existingPattern) {
          existingPattern.remove();
        }
        
        // Create new pattern
        const pattern = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pattern.setAttribute('id', 'svg-pattern');
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');
        pattern.setAttribute('width', '100');
        pattern.setAttribute('height', '100');
        
        if (content.pattern.type === 'hero-pattern' && content.pattern.patternName) {
          // For hero-patterns, the svgContent already contains the pattern SVG
          // We'll use it directly
          const patternSvg = svgData;
          // Extract just the pattern content from the SVG
          const patternParser = new DOMParser();
          const patternDoc = patternParser.parseFromString(patternSvg, 'image/svg+xml');
          const patternSvgElement = patternDoc.querySelector('svg');
          if (patternSvgElement) {
            // Copy all children of the pattern SVG into our pattern element
            Array.from(patternSvgElement.children).forEach(child => {
              pattern.appendChild(child.cloneNode(true));
            });
          }
        } else if (content.pattern.type === 'custom' && content.pattern.customPattern) {
          // Parse custom pattern and add to pattern element
          const patternParser = new DOMParser();
          const patternDoc = patternParser.parseFromString(content.pattern.customPattern, 'image/svg+xml');
          const customPattern = patternDoc.querySelector('pattern');
          if (customPattern) {
            // Copy attributes and children
            Array.from(customPattern.attributes).forEach(attr => {
              if (attr.name !== 'id') {
                pattern.setAttribute(attr.name, attr.value);
              }
            });
            Array.from(customPattern.children).forEach(child => {
              pattern.appendChild(child.cloneNode(true));
            });
          } else {
            // If no pattern element, wrap the content
            pattern.innerHTML = content.pattern.customPattern;
          }
        }
        
        defs.appendChild(pattern);
        
        // Apply pattern as fill to the main SVG or create a rect with pattern fill
        const rect = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '100%');
        rect.setAttribute('height', '100%');
        rect.setAttribute('fill', 'url(#svg-pattern)');
        svgElement.insertBefore(rect, svgElement.firstChild);
      }
    }
    
    const updatedSvg = svgDoc.documentElement.outerHTML;
    
    return (
      <div 
        className="relative overflow-hidden"
        style={{ width: elementWidth, height: elementHeight }}
      >
        <div
          ref={svgContainerRef}
          dangerouslySetInnerHTML={{ __html: updatedSvg }}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
        
        {/* Controls overlay (only in designer, not preview) */}
        {isSelected && !isPreview && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/70 rounded-lg px-3 py-2">
            <span className="text-xs text-white/70">SVG</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-white hover:bg-white/20"
              onClick={() => setShowSvgPicker(true)}
            >
              <Upload className="w-3 h-3 mr-1" />
              Change SVG
            </Button>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-white">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-white"
                onClick={() => setShowSvgPicker(true)}
              >
                Try again
              </Button>
            </div>
          </div>
        )}
        <SVGPickerDialog
          open={showSvgPicker}
          onOpenChange={setShowSvgPicker}
          onSelect={handleSvgSelect}
          currentSrc={content.src}
          currentSvgContent={content.svgContent}
        />
      </div>
    );
  }
}


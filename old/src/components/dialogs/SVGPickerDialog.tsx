import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Link, FileCode, AlertCircle, Check, Loader2, Grid3x3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as heroPatterns from 'hero-patterns';

interface SVGPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (svgContent: string, src?: string, pattern?: { type: 'hero-pattern' | 'custom'; patternName?: string; customPattern?: string; color?: string; opacity?: number }) => void;
  currentSrc?: string;
  currentSvgContent?: string;
  currentPattern?: { type: 'hero-pattern' | 'custom'; patternName?: string; customPattern?: string; color?: string; opacity?: number };
}

// Get available hero patterns
const getHeroPatterns = () => {
  const patterns: Array<{ name: string; displayName: string; fn: (color?: string, opacity?: number) => string }> = [];
  const patternNames = [
    'ticTacToe', 'circuitBoard', 'iLikeFood', 'deathStar', 'anchorsAway', 'architect',
    'autumn', 'aztec', 'bankNote', 'bathroomFloor', 'bevelCircle', 'boxes', 'brickWall',
    'bubbles', 'cage', 'charlieBrown', 'churchOnSunday', 'circlesAndSquares', 'circuitBoard',
    'connections', 'corkScrew', 'current', 'curtain', 'diagonalLines', 'diagonalStripes',
    'dominos', 'endlessClouds', 'eyes', 'fallingTriangles', 'floatingCogs', 'formalInvitation',
    'fourPointStars', 'glamorous', 'graphPaper', 'groovy', 'happyIntersection', 'heavyRain',
    'hexagons', 'hideout', 'houndstooth', 'iLikeFood', 'intersectingCircles', 'jigsaw',
    'jupiter', 'leaves', 'linesInMotion', 'lips', 'melt', 'morphingDiamonds', 'mosaicSquares',
    'overcast', 'overlappingCircles', 'overlappingDiamonds', 'overlappingHexagons', 'parkayFloor',
    'pianoMan', 'pieFactory', 'plus', 'polkaDots', 'rails', 'rain', 'randomShapes', 'roundedPlusConnected',
    'signal', 'skulls', 'squares', 'squaresInSquares', 'stampCollection', 'steelBeams', 'stripes',
    'temple', 'texture', 'tictactoe', 'topography', 'volcanoLamp', 'wallpaper', 'wiggle', 'xEquals',
    'yoshimura', 'zebraStripes'
  ];
  
  patternNames.forEach(name => {
    const fn = (heroPatterns as any)[name];
    if (fn && typeof fn === 'function') {
      const displayName = name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
      patterns.push({ name, displayName, fn });
    }
  });
  
  return patterns.sort((a, b) => a.displayName.localeCompare(b.displayName));
};

export function SVGPickerDialog({
  open,
  onOpenChange,
  onSelect,
  currentSrc,
  currentSvgContent,
  currentPattern,
}: SVGPickerDialogProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'paste' | 'pattern'>('upload');
  const [urlInput, setUrlInput] = useState(currentSrc || '');
  const [pasteInput, setPasteInput] = useState(currentSvgContent || '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Pattern state
  const [patternType, setPatternType] = useState<'hero-pattern' | 'custom'>(currentPattern?.type || 'hero-pattern');
  const [selectedPattern, setSelectedPattern] = useState<string>(currentPattern?.patternName || '');
  const [patternColor, setPatternColor] = useState<string>(currentPattern?.color || '#a3a3a3');
  const [patternOpacity, setPatternOpacity] = useState<number>(currentPattern?.opacity ?? 0.7);
  const [customPatternInput, setCustomPatternInput] = useState<string>(currentPattern?.customPattern || '');
  
  const heroPatternsList = getHeroPatterns();

  const handleFileSelect = (file: File) => {
    if (!file.type.includes('svg') && !file.name.endsWith('.svg')) {
      setError('Please select a valid SVG file');
      return;
    }

    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const svgContent = event.target?.result as string;
      setIsLoading(false);
      onSelect(svgContent, undefined, undefined);
      onOpenChange(false);
    };
    reader.onerror = () => {
      setError('Failed to read SVG file');
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = ''; // Reset input
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(urlInput);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const svgContent = await response.text();
      
      // Basic validation - check if it's valid SVG
      if (!svgContent.trim().startsWith('<svg') && !svgContent.includes('<svg')) {
        throw new Error('URL does not point to a valid SVG file');
      }

      setIsLoading(false);
      onSelect(svgContent, urlInput, undefined);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SVG from URL');
      setIsLoading(false);
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteInput.trim()) {
      setError('Please paste SVG code');
      return;
    }

    // Basic validation
    if (!pasteInput.trim().startsWith('<svg') && !pasteInput.includes('<svg')) {
      setError('Invalid SVG code. Please paste valid SVG markup.');
      return;
    }

    setError(null);
    onSelect(pasteInput, undefined, undefined);
    onOpenChange(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select SVG</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="url">
              <Link className="w-4 h-4 mr-2" />
              From URL
            </TabsTrigger>
            <TabsTrigger value="paste">
              <FileCode className="w-4 h-4 mr-2" />
              Paste Code
            </TabsTrigger>
            <TabsTrigger value="pattern">
              <Grid3x3 className="w-4 h-4 mr-2" />
              Pattern
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="mt-4">
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                dragActive
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-border hover:border-violet-500/50'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={(e) => {
                // Only trigger file input if clicking on the drop zone itself, not on the button
                if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.drop-zone')) {
                  fileInputRef.current?.click();
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,image/svg+xml"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="drop-zone">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-foreground mb-2">
                  Drag and drop an SVG file here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Supports .svg files
                </p>
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={isLoading}
                  type="button"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Browse Files
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* URL Tab */}
          <TabsContent value="url" className="mt-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">SVG URL</label>
                <Input
                  type="url"
                  placeholder="https://example.com/image.svg"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Enter a URL pointing to an SVG file
                </p>
              </div>
              <Button
                onClick={handleUrlSubmit}
                disabled={isLoading || !urlInput.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4 mr-2" />
                    Load from URL
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Paste Tab */}
          <TabsContent value="paste" className="mt-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">SVG Code</label>
                <textarea
                  placeholder="Paste your SVG code here...&#10;&#10;&lt;svg&gt;&#10;  ...&#10;&lt;/svg&gt;"
                  value={pasteInput}
                  onChange={(e) => {
                    setPasteInput(e.target.value);
                    setError(null);
                  }}
                  className="w-full h-48 p-3 text-xs bg-muted border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Paste the complete SVG markup including &lt;svg&gt; tags
                </p>
              </div>
              <Button
                onClick={handlePasteSubmit}
                disabled={!pasteInput.trim()}
                className="w-full"
              >
                <FileCode className="w-4 h-4 mr-2" />
                Use Pasted SVG
              </Button>
            </div>
          </TabsContent>

          {/* Pattern Tab */}
          <TabsContent value="pattern" className="mt-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Pattern Type</label>
                <select
                  value={patternType}
                  onChange={(e) => setPatternType(e.target.value as 'hero-pattern' | 'custom')}
                  className="w-full h-8 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
                >
                  <option value="hero-pattern">Hero Pattern (Library)</option>
                  <option value="custom">Custom Pattern</option>
                </select>
              </div>

              {patternType === 'hero-pattern' && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Select Pattern</label>
                    <ScrollArea className="h-64 border border-input rounded-md">
                      <div className="grid grid-cols-2 gap-2 p-2">
                        {heroPatternsList.map((pattern) => {
                          const patternBg = pattern.fn(patternColor, patternOpacity);
                          return (
                            <button
                              key={pattern.name}
                              onClick={() => setSelectedPattern(pattern.name)}
                              className={cn(
                                'p-3 border rounded-lg text-left transition-colors',
                                selectedPattern === pattern.name
                                  ? 'border-violet-500 bg-violet-500/10'
                                  : 'border-border hover:border-violet-500/50'
                              )}
                            >
                              <div
                                className="w-full h-16 mb-2 rounded"
                                style={{ backgroundImage: patternBg }}
                              />
                              <div className="text-xs font-medium">{pattern.displayName}</div>
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={patternColor}
                          onChange={(e) => setPatternColor(e.target.value)}
                          className="h-8 w-16 rounded border border-input cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={patternColor}
                          onChange={(e) => setPatternColor(e.target.value)}
                          placeholder="#FFFFFF"
                          className="flex-1 h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Opacity: {Math.round(patternOpacity * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={patternOpacity}
                        onChange={(e) => setPatternOpacity(parseFloat(e.target.value))}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      if (selectedPattern) {
                        const patternFn = heroPatternsList.find(p => p.name === selectedPattern)?.fn;
                        if (patternFn) {
                          try {
                            setIsLoading(true);
                            setError(null);
                            
                            // Convert hero-pattern CSS background-image to SVG
                            const bgImage = patternFn(patternColor, patternOpacity);
                            
                            // Try multiple extraction methods
                            let svgContent: string | null = null;
                            
                            // Method 1: Base64 encoded (most common)
                            const base64Match = bgImage.match(/url\(["']?data:image\/svg\+xml(?:;charset=utf-8)?;base64,([^"')]+)["']?\)/);
                            if (base64Match && base64Match[1]) {
                              try {
                                svgContent = atob(base64Match[1]);
                              } catch (e) {
                                console.warn('Base64 decode failed:', e);
                              }
                            }
                            
                            // Method 2: URL encoded with charset=utf-8
                            if (!svgContent) {
                              const urlMatch = bgImage.match(/url\(["']?data:image\/svg\+xml;charset=utf-8,([^"')]+)["']?\)/);
                              if (urlMatch && urlMatch[1]) {
                                try {
                                  svgContent = decodeURIComponent(urlMatch[1]);
                                } catch (e) {
                                  console.warn('URL decode failed:', e);
                                }
                              }
                            }
                            
                            // Method 3: Direct URL encoded (no charset)
                            if (!svgContent) {
                              const directMatch = bgImage.match(/url\(["']?data:image\/svg\+xml,([^"')]+)["']?\)/);
                              if (directMatch && directMatch[1]) {
                                try {
                                  svgContent = decodeURIComponent(directMatch[1]);
                                } catch (e) {
                                  console.warn('Direct URL decode failed:', e);
                                }
                              }
                            }
                            
                            // Method 4: Try using a temporary DOM element to extract from computed style
                            if (!svgContent) {
                              try {
                                const tempDiv = document.createElement('div');
                                tempDiv.style.backgroundImage = bgImage;
                                document.body.appendChild(tempDiv);
                                const computedBg = window.getComputedStyle(tempDiv).backgroundImage;
                                document.body.removeChild(tempDiv);
                                
                                // Try to extract from computed style
                                const computedMatch = computedBg.match(/url\(["']?data:image\/svg\+xml(?:;charset=utf-8)?(?:;base64)?,([^"')]+)["']?\)/);
                                if (computedMatch && computedMatch[1]) {
                                  try {
                                    if (computedBg.includes('base64')) {
                                      svgContent = atob(computedMatch[1]);
                                    } else {
                                      svgContent = decodeURIComponent(computedMatch[1]);
                                    }
                                  } catch (e) {
                                    console.warn('Computed style decode failed:', e);
                                  }
                                }
                              } catch (e) {
                                console.warn('DOM extraction failed:', e);
                              }
                            }
                            
                            // Method 5: Try to extract from the raw string if it contains SVG
                            if (!svgContent && bgImage.includes('<svg')) {
                              const svgMatch = bgImage.match(/<svg[\s\S]*?<\/svg>/);
                              if (svgMatch) {
                                svgContent = svgMatch[0];
                              }
                            }
                            
                            if (svgContent) {
                              // Validate it's actually SVG
                              const trimmed = svgContent.trim();
                              if (trimmed.startsWith('<svg') || trimmed.includes('<svg')) {
                                setIsLoading(false);
                                onSelect(svgContent, undefined, {
                                  type: 'hero-pattern',
                                  patternName: selectedPattern,
                                  color: patternColor,
                                  opacity: patternOpacity,
                                });
                                onOpenChange(false);
                                setError(null);
                                return;
                              } else {
                                setError('Extracted content is not valid SVG');
                              }
                            } else {
                              // If all methods fail, log the actual format for debugging
                              console.error('Pattern output format:', bgImage);
                              console.error('Pattern function:', patternFn.toString().substring(0, 200));
                              setError(`Failed to extract SVG from pattern. Format: ${bgImage.substring(0, 50)}...`);
                            }
                          } catch (err) {
                            console.error('Pattern extraction error:', err);
                            setError(err instanceof Error ? err.message : 'Failed to extract SVG from pattern');
                          } finally {
                            setIsLoading(false);
                          }
                        } else {
                          setError('Pattern function not found');
                        }
                      } else {
                        setError('Please select a pattern');
                      }
                    }}
                    disabled={!selectedPattern || isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Grid3x3 className="w-4 h-4 mr-2" />
                        Use Pattern
                      </>
                    )}
                  </Button>
                </>
              )}

              {patternType === 'custom' && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Custom Pattern SVG</label>
                    <textarea
                      placeholder="Paste your SVG pattern code here...&#10;&#10;&lt;pattern id=&quot;myPattern&quot;&gt;&#10;  ...&#10;&lt;/pattern&gt;"
                      value={customPatternInput}
                      onChange={(e) => {
                        setCustomPatternInput(e.target.value);
                        setError(null);
                      }}
                      className="w-full h-48 p-3 text-xs bg-muted border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Paste SVG pattern markup (should include &lt;pattern&gt; element)
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={patternColor}
                          onChange={(e) => setPatternColor(e.target.value)}
                          className="h-8 w-16 rounded border border-input cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={patternColor}
                          onChange={(e) => setPatternColor(e.target.value)}
                          placeholder="#FFFFFF"
                          className="flex-1 h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Opacity: {Math.round(patternOpacity * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={patternOpacity}
                        onChange={(e) => setPatternOpacity(parseFloat(e.target.value))}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      if (customPatternInput.trim()) {
                        // Wrap custom pattern in SVG if needed
                        let svgContent = customPatternInput.trim();
                        if (!svgContent.includes('<svg')) {
                          svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><defs>${svgContent}</defs></svg>`;
                        }
                        onSelect(svgContent, undefined, {
                          type: 'custom',
                          customPattern: customPatternInput,
                          color: patternColor,
                          opacity: patternOpacity,
                        });
                        onOpenChange(false);
                      } else {
                        setError('Please enter custom pattern code');
                      }
                    }}
                    disabled={!customPatternInput.trim()}
                    className="w-full"
                  >
                    <Grid3x3 className="w-4 h-4 mr-2" />
                    Use Custom Pattern
                  </Button>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {(currentSrc || currentSvgContent) && (
          <div className="mt-4 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg flex items-center gap-2">
            <Check className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <p className="text-xs text-violet-400">
              {currentSrc ? `Current: ${currentSrc}` : 'Current: SVG code loaded'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


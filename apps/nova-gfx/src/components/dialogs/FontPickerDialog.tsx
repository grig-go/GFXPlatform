import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  ScrollArea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@emergent-platform/ui';
import { Search, Check, Loader2, Rabbit } from 'lucide-react';
import {
  POPULAR_FONTS,
  SYSTEM_FONTS,
  type Font,
  loadFont,
  fetchAllFonts,
} from '@/lib/fonts';
import { cn } from '@emergent-platform/ui';

interface FontPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (fontFamily: string) => void;
  currentFontFamily?: string;
}

export function FontPickerDialog({
  open,
  onOpenChange,
  onSelect,
  currentFontFamily = 'Inter',
}: FontPickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [allFonts, setAllFonts] = useState<Font[]>([...SYSTEM_FONTS, ...POPULAR_FONTS]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedFontPreviews, setLoadedFontPreviews] = useState<Set<string>>(new Set());

  // Fetch all fonts when dialog opens
  useEffect(() => {
    if (open && allFonts.length <= SYSTEM_FONTS.length + POPULAR_FONTS.length) {
      setIsLoading(true);
      fetchAllFonts()
        .then((fonts) => {
          // Combine system fonts with fetched web fonts
          setAllFonts([...SYSTEM_FONTS, ...fonts]);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [open]);

  // Filter fonts by search query and category
  const filteredFonts = useMemo(() => {
    let fonts = allFonts;

    // Filter by category
    if (activeCategory !== 'all') {
      fonts = fonts.filter((f) => f.category === activeCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      fonts = fonts.filter(
        (f) =>
          f.family.toLowerCase().includes(query) ||
          f.label.toLowerCase().includes(query)
      );
    }

    return fonts;
  }, [searchQuery, activeCategory, allFonts]);

  // Calculate category counts dynamically
  const categories = useMemo(() => {
    return [
      { id: 'all', label: 'All', count: allFonts.length },
      {
        id: 'sans-serif',
        label: 'Sans Serif',
        count: allFonts.filter((f) => f.category === 'sans-serif').length,
      },
      {
        id: 'display',
        label: 'Display',
        count: allFonts.filter((f) => f.category === 'display').length,
      },
      {
        id: 'serif',
        label: 'Serif',
        count: allFonts.filter((f) => f.category === 'serif').length,
      },
      {
        id: 'monospace',
        label: 'Monospace',
        count: allFonts.filter((f) => f.category === 'monospace').length,
      },
      {
        id: 'handwriting',
        label: 'Handwriting',
        count: allFonts.filter((f) => f.category === 'handwriting').length,
      },
    ];
  }, [allFonts]);

  // Load font preview when it comes into view
  const loadFontPreview = (fontFamily: string) => {
    if (loadedFontPreviews.has(fontFamily)) return;

    const isSystemFont = SYSTEM_FONTS.some((sf) => sf.family === fontFamily);
    if (!isSystemFont) {
      loadFont(fontFamily);
    }
    setLoadedFontPreviews((prev) => new Set(prev).add(fontFamily));
  };

  const handleFontSelect = (fontFamily: string) => {
    // Load font if needed
    loadFont(fontFamily);

    onSelect(fontFamily);
    onOpenChange(false);
  };

  // Visible fonts for virtualization (limit to 100 at a time for performance)
  const visibleFonts = filteredFonts.slice(0, 100);
  const hasMoreFonts = filteredFonts.length > 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            Select Font
            {isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
            <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <Rabbit className="w-3.5 h-3.5" />
              Powered by Bunny Fonts
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col space-y-4 flex-1 min-h-0 overflow-hidden">
          {/* Search */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={`Search ${allFonts.length.toLocaleString()} fonts...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Category Tabs */}
          <Tabs
            value={activeCategory}
            onValueChange={setActiveCategory}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <TabsList className="grid w-full grid-cols-6 flex-shrink-0">
              {categories.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                  {cat.label}
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    {cat.count > 999 ? '1k+' : cat.count}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Font List */}
            <TabsContent value={activeCategory} className="flex-1 min-h-0 mt-4 overflow-hidden">
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-1 gap-1 p-2">
                  {filteredFonts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 text-sm">
                      No fonts found
                    </div>
                  ) : (
                    <>
                      {visibleFonts.map((font) => {
                        const isSelected = currentFontFamily === font.family;
                        const isSystemFont = font.source === 'system';

                        // Trigger font preview load
                        if (!loadedFontPreviews.has(font.family)) {
                          loadFontPreview(font.family);
                        }

                        return (
                          <button
                            key={font.family}
                            onClick={() => handleFontSelect(font.family)}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-lg border-2 transition-colors text-left',
                              'hover:bg-violet-500/20 hover:border-violet-500',
                              isSelected
                                ? 'bg-violet-500/30 border-violet-500'
                                : 'border-border bg-muted/50'
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-lg font-medium truncate"
                                  style={{
                                    fontFamily: `"${font.family}", ${font.category === 'serif' ? 'serif' : font.category === 'monospace' ? 'monospace' : 'sans-serif'}`,
                                  }}
                                >
                                  {font.label}
                                </span>
                                {isSystemFont && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-gray-500/20 text-gray-400 rounded">
                                    System
                                  </span>
                                )}
                                {font.variable && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-violet-500/20 text-violet-400 rounded">
                                    Variable
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Weights: {font.weights.join(', ')}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-violet-400 flex-shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                      {hasMoreFonts && (
                        <div className="text-center text-muted-foreground py-4 text-sm">
                          Showing 100 of {filteredFonts.length.toLocaleString()}{' '}
                          fonts. Search to narrow down results.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

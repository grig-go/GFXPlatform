import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ScrollArea,
  Label,
} from '@emergent-platform/ui';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, ChevronUp, X, Plus, RotateCcw, Pencil } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { library, findIconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
// @ts-ignore - lottie-web doesn't have proper TypeScript types
import lottie from 'lottie-web';
// @ts-ignore - react-animated-weather types
import ReactAnimatedWeather from 'react-animated-weather';
import {
  WEATHER_ICONS,
  getWeatherIconsByCategory,
  getWeatherIconCategories,
  getWeatherIconsByLibrary,
  getWeatherIconLibraries,
  getMappingsForIcon,
  getWeatherMappings,
  setWeatherMapping,
  addWeatherMapping,
  removeWeatherMapping,
  resetWeatherMappings,
  type WeatherIconLibrary,
  type WeatherIcon
} from '@/lib/weatherIcons';

library.add(fas, far, fab);

// Common Lucide icons (subset for performance)
const COMMON_LUCIDE_ICONS = [
  'Sparkles', 'Star', 'Heart', 'Home', 'User', 'Settings', 'Search', 'Menu', 'X', 'Check',
  'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Play', 'Pause', 'Stop', 'Volume2',
  'Image', 'Video', 'Music', 'File', 'Folder', 'Download', 'Upload', 'Share', 'Copy',
  'Edit', 'Trash', 'Save', 'Plus', 'Minus', 'Eye', 'EyeOff', 'Lock', 'Unlock',
  'Mail', 'Phone', 'MessageCircle', 'Bell', 'Calendar', 'Clock', 'MapPin', 'Globe',
  'Zap', 'Sun', 'Moon', 'Cloud', 'CloudRain', 'CloudSnow', 'Wind', 'Thermometer',
  'ShoppingCart', 'CreditCard', 'DollarSign', 'TrendingUp', 'TrendingDown', 'BarChart',
  'Users', 'UserPlus', 'UserMinus', 'Shield', 'ShieldCheck', 'AlertCircle', 'Info',
  'CheckCircle', 'XCircle', 'AlertTriangle', 'HelpCircle', 'ThumbsUp', 'ThumbsDown',
];

// Common FontAwesome icons
const COMMON_FONT_AWESOME_ICONS = {
  solid: [
    'home', 'user', 'cog', 'search', 'heart', 'star', 'bell', 'envelope', 'phone',
    'image', 'video', 'music', 'file', 'folder', 'download', 'upload', 'share',
    'edit', 'trash', 'save', 'plus', 'minus', 'eye', 'lock', 'unlock',
    'calendar', 'clock', 'map-marker', 'globe', 'bolt', 'sun', 'moon', 'cloud',
    'shopping-cart', 'credit-card', 'dollar-sign', 'chart-line', 'users', 'shield',
    'check-circle', 'times-circle', 'exclamation-circle', 'info-circle', 'thumbs-up',
  ],
  regular: [
    'heart', 'star', 'bell', 'envelope', 'calendar', 'clock', 'user', 'image',
    'file', 'folder', 'edit', 'trash', 'save', 'eye', 'lock', 'unlock',
  ],
  brands: [
    'facebook', 'twitter', 'instagram', 'youtube', 'github', 'linkedin', 'google',
    'apple', 'microsoft', 'amazon', 'spotify', 'discord', 'twitch',
  ],
};

interface IconPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (
    library: 'lucide' | 'fontawesome' | 'lottie' | 'weather', 
    iconName: string, 
    weight?: 'solid' | 'regular' | 'brands',
    lottieUrl?: string,
    lottieJson?: string
  ) => void;
  currentLibrary?: 'lucide' | 'fontawesome' | 'lottie' | 'weather';
  currentIconName?: string;
  currentWeight?: 'solid' | 'regular' | 'brands';
  currentLottieUrl?: string;
}

// Popular Lottie animations from LottieFiles
// These are reliable, free animations from LottieFiles public library
const LOTTIE_ANIMATIONS = [
  // Weather animations
  { name: 'Sunny Day', url: 'https://lottie.host/8b9b8b9e-0e3e-4e3e-8e3e-0e3e4e3e8e3e/sunny.json', category: 'Weather', fallbackUrl: 'https://assets2.lottiefiles.com/packages/lf20_xlky4kvh.json' },
  { name: 'Cloudy', url: 'https://assets2.lottiefiles.com/packages/lf20_kyu7xb1v.json', category: 'Weather' },
  { name: 'Rainy', url: 'https://assets2.lottiefiles.com/packages/lf20_bknbhfne.json', category: 'Weather' },
  // UI Elements
  { name: 'Loading Spinner', url: 'https://assets2.lottiefiles.com/packages/lf20_x62chJ.json', category: 'Loading' },
  { name: 'Success Check', url: 'https://assets2.lottiefiles.com/packages/lf20_lk80fpsm.json', category: 'Status' },
  { name: 'Error X', url: 'https://assets2.lottiefiles.com/packages/lf20_qpwbiyxf.json', category: 'Status' },
  { name: 'Bell Notification', url: 'https://assets2.lottiefiles.com/packages/lf20_4jlpfo8u.json', category: 'UI' },
  { name: 'Heart Like', url: 'https://assets2.lottiefiles.com/packages/lf20_0sv5tkbh.json', category: 'UI' },
  // Arrows & Navigation
  { name: 'Arrow Down', url: 'https://assets2.lottiefiles.com/packages/lf20_klswe5pu.json', category: 'Arrows' },
  { name: 'Scroll Down', url: 'https://assets2.lottiefiles.com/packages/lf20_rwlhxb6f.json', category: 'Arrows' },
];

// Lottie Preview Component
function LottiePreview({ url, json, size = 60 }: { url?: string; json?: string; size?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<any>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous animation
    if (animRef.current) {
      animRef.current.destroy();
      animRef.current = null;
    }

    setLoading(true);
    setError(false);

    const animationData = json ? (() => {
      try {
        return JSON.parse(json);
      } catch {
        setError(true);
        setLoading(false);
        return null;
      }
    })() : null;

    if (!animationData && !url) {
      setLoading(false);
      return;
    }

    try {
      const anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: animationData,
        path: animationData ? undefined : url,
      });

      anim.addEventListener('DOMLoaded', () => {
        setLoading(false);
      });

      anim.addEventListener('data_failed', () => {
        setError(true);
        setLoading(false);
      });

      anim.addEventListener('error', () => {
        setError(true);
        setLoading(false);
      });

      animRef.current = anim;
    } catch (e) {
      console.error('Lottie load error:', e);
      setError(true);
      setLoading(false);
    }

    return () => {
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, [url, json]);

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-muted/50 rounded text-xs text-muted-foreground"
        style={{ width: size, height: size }}
      >
        Failed
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          ...
        </div>
      )}
      <div ref={containerRef} style={{ width: size, height: size }} />
    </div>
  );
}

export function IconPickerDialog({
  open,
  onOpenChange,
  onSelect,
  currentLibrary = 'lucide',
  currentIconName = 'Sparkles',
  currentWeight = 'solid',
  currentLottieUrl,
}: IconPickerDialogProps) {
  // Main section: 'display' (Lucide, FontAwesome, Lottie) or 'weather'
  const [mainSection, setMainSection] = useState<'display' | 'weather'>(
    currentLibrary === 'weather' ? 'weather' : 'display'
  );
  const [searchQuery, setSearchQuery] = useState('');
  // Display icon library (lucide, fontawesome, lottie)
  const [displayLibrary, setDisplayLibrary] = useState<'lucide' | 'fontawesome' | 'lottie'>(
    currentLibrary === 'weather' ? 'lucide' : (currentLibrary as 'lucide' | 'fontawesome' | 'lottie')
  );
  // Weather icon library filter
  const [weatherLibrary, setWeatherLibrary] = useState<WeatherIconLibrary | 'all'>('all');
  const [selectedWeight, setSelectedWeight] = useState<'solid' | 'regular' | 'brands'>(currentWeight);
  const [lottieUrl, setLottieUrl] = useState(currentLottieUrl || '');
  const [lottieJson, setLottieJson] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Weather icon mapping editing state
  const [editingMappingIcon, setEditingMappingIcon] = useState<string | null>(null);
  const [newMappingInput, setNewMappingInput] = useState('');
  const [mappingsVersion, setMappingsVersion] = useState(0); // Force re-render when mappings change

  // Filter Lucide icons
  const filteredLucideIcons = useMemo(() => {
    if (!searchQuery) return COMMON_LUCIDE_ICONS;
    const query = searchQuery.toLowerCase();
    return COMMON_LUCIDE_ICONS.filter(name => 
      name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Filter FontAwesome icons
  const filteredFontAwesomeIcons = useMemo(() => {
    if (!searchQuery) return COMMON_FONT_AWESOME_ICONS[selectedWeight] || [];
    const query = searchQuery.toLowerCase();
    return (COMMON_FONT_AWESOME_ICONS[selectedWeight] || []).filter(name =>
      name.toLowerCase().includes(query)
    );
  }, [searchQuery, selectedWeight]);

  const handleIconSelect = (library: 'lucide' | 'fontawesome' | 'weather', iconName: string, weight?: 'solid' | 'regular' | 'brands') => {
    onSelect(library, iconName, weight);
    onOpenChange(false);
  };

  // Filter weather icons by library, category, and search
  const filteredWeatherIcons = useMemo(() => {
    // Start with all icons or filtered by library
    let icons = weatherLibrary === 'all'
      ? WEATHER_ICONS
      : getWeatherIconsByLibrary(weatherLibrary);

    // Filter by category
    if (selectedCategory !== 'All') {
      icons = icons.filter(icon => icon.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      icons = icons.filter(icon =>
        icon.name.toLowerCase().includes(query) ||
        icon.displayName.toLowerCase().includes(query) ||
        icon.category.toLowerCase().includes(query) ||
        icon.library.toLowerCase().includes(query)
      );
    }

    return icons;
  }, [searchQuery, selectedCategory, weatherLibrary]);

  const weatherCategories = useMemo(() => ['All', ...getWeatherIconCategories()], []);
  const weatherLibraries = useMemo(() => getWeatherIconLibraries(), []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Select Icon</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden">
          {/* Main Section Toggle: Display Icons vs Weather Icons */}
          <div className="flex gap-2">
            <Button
              variant={mainSection === 'display' ? 'default' : 'outline'}
              onClick={() => setMainSection('display')}
              className="flex-1"
            >
              Display Icons
            </Button>
            <Button
              variant={mainSection === 'weather' ? 'default' : 'outline'}
              onClick={() => setMainSection('weather')}
              className="flex-1"
            >
              Weather Icons
            </Button>
          </div>

          {/* Search */}
          <Input
            placeholder={mainSection === 'display' ? "Search display icons..." : "Search weather icons..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />

          {/* DISPLAY ICONS SECTION */}
          {mainSection === 'display' && (
            <Tabs value={displayLibrary} onValueChange={(v) => setDisplayLibrary(v as 'lucide' | 'fontawesome' | 'lottie')} className="flex-1 min-h-0 flex flex-col">
              <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                <TabsTrigger value="lucide">Lucide</TabsTrigger>
                <TabsTrigger value="fontawesome">FontAwesome</TabsTrigger>
                <TabsTrigger value="lottie">Lottie</TabsTrigger>
              </TabsList>

            {/* Lucide Icons */}
            <TabsContent value="lucide" className="mt-4 flex-1 min-h-0 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-8 gap-2 p-2">
                  {filteredLucideIcons.map((iconName) => {
                    const IconComponent = (LucideIcons as any)[iconName];
                    if (!IconComponent) return null;
                    
                    return (
                      <button
                        key={iconName}
                        onClick={() => handleIconSelect('lucide', iconName)}
                        className={`
                          flex items-center justify-center p-3 rounded-lg border-2 transition-colors
                          hover:bg-violet-500/20 hover:border-violet-500
                          ${currentLibrary === 'lucide' && currentIconName === iconName 
                            ? 'bg-violet-500/30 border-violet-500' 
                            : 'border-border bg-muted'
                          }
                        `}
                        title={iconName}
                      >
                        <IconComponent className="w-6 h-6" />
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* FontAwesome Icons */}
            <TabsContent value="fontawesome" className="mt-4 flex-1 min-h-0 flex flex-col">
              <div className="mb-4 flex-shrink-0">
                <div className="flex gap-2">
                  <Button
                    variant={selectedWeight === 'solid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedWeight('solid')}
                  >
                    Solid
                  </Button>
                  <Button
                    variant={selectedWeight === 'regular' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedWeight('regular')}
                  >
                    Regular
                  </Button>
                  <Button
                    variant={selectedWeight === 'brands' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedWeight('brands')}
                  >
                    Brands
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-8 gap-2 p-2">
                  {filteredFontAwesomeIcons.map((iconName) => {
                    // Try to get the icon using findIconDefinition
                    let iconDef: IconDefinition | null = null;
                    if (selectedWeight === 'solid') {
                      iconDef = findIconDefinition({ prefix: 'fas', iconName: iconName as any });
                    } else if (selectedWeight === 'regular') {
                      iconDef = findIconDefinition({ prefix: 'far', iconName: iconName as any });
                    } else if (selectedWeight === 'brands') {
                      iconDef = findIconDefinition({ prefix: 'fab', iconName: iconName as any });
                    }
                    if (!iconDef) return null;

                    const isSelected = currentLibrary === 'fontawesome' && 
                                     currentIconName === iconName && 
                                     currentWeight === selectedWeight;

                    return (
                      <button
                        key={`${selectedWeight}-${iconName}`}
                        onClick={() => handleIconSelect('fontawesome', iconName, selectedWeight)}
                        className={`
                          flex items-center justify-center p-3 rounded-lg border-2 transition-colors
                          hover:bg-violet-500/20 hover:border-violet-500
                          ${isSelected 
                            ? 'bg-violet-500/30 border-violet-500' 
                            : 'border-border bg-muted'
                          }
                        `}
                        title={iconName}
                      >
                        <FontAwesomeIcon 
                          icon={iconDef as IconDefinition}
                          className="w-5 h-5"
                        />
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Lottie Animations */}
            <TabsContent value="lottie" className="mt-4 flex-1 min-h-0 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="space-y-4 pr-4">
                  {/* Popular Animations - Main Section */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Popular Animations</Label>
                    <div className="border border-input rounded-md">
                      <div className="grid grid-cols-2 gap-3 p-3 max-h-[300px] overflow-y-auto">
                      {LOTTIE_ANIMATIONS.map((anim, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setLottieUrl(anim.url);
                            onSelect('lottie', anim.name, undefined, anim.url);
                            onOpenChange(false);
                          }}
                          className={`
                            flex items-center gap-3 p-3 border-2 rounded-lg text-left transition-colors
                            hover:bg-violet-500/20 hover:border-violet-500
                            ${currentLibrary === 'lottie' && currentLottieUrl === anim.url
                              ? 'bg-violet-500/30 border-violet-500'
                              : 'border-border bg-muted'
                            }
                          `}
                          title={anim.name}
                        >
                          <LottiePreview url={anim.url} size={48} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{anim.name}</div>
                            <div className="text-xs text-muted-foreground">{anim.category}</div>
                          </div>
                        </button>
                      ))}
                      </div>
                    </div>
                  </div>

                  {/* Custom Input - Collapsible */}
                  <div className="border-t border-border pt-3">
                    <button
                      onClick={() => setShowCustomInput(!showCustomInput)}
                      className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
                    >
                      <span>Use Custom Lottie Animation</span>
                      {showCustomInput ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {showCustomInput && (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="text-xs font-medium mb-1.5 block">Lottie JSON URL</label>
                          <Input
                            placeholder="https://example.com/animation.json"
                            value={lottieUrl}
                            onChange={(e) => setLottieUrl(e.target.value)}
                            className="w-full text-xs h-8"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium mb-1.5 block">Or Paste Lottie JSON</label>
                          <textarea
                            placeholder='{"v":"5.7.4","fr":60,"ip":0,"op":120,"w":100,"h":100,"nm":"Animation","ddd":0,"assets":[],"layers":[]}'
                            value={lottieJson}
                            onChange={(e) => setLottieJson(e.target.value)}
                            className="w-full h-24 p-2 text-xs bg-muted border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                          />
                        </div>

                        {/* Lottie Preview */}
                        {(lottieUrl || lottieJson) && (
                          <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg border">
                            <LottiePreview url={lottieUrl || undefined} json={lottieJson || undefined} size={48} />
                            <div className="flex-1">
                              <p className="text-xs font-medium">Preview</p>
                              <p className="text-[10px] text-muted-foreground">Animation will play in preview</p>
                            </div>
                          </div>
                        )}

                        <Button
                          onClick={() => {
                            if (lottieUrl || lottieJson) {
                              onSelect('lottie', 'Custom Lottie', undefined, lottieUrl || undefined, lottieJson || undefined);
                              onOpenChange(false);
                            }
                          }}
                          disabled={!lottieUrl && !lottieJson}
                          className="w-full h-8 text-xs"
                          size="sm"
                        >
                          Use Custom Animation
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
          )}

          {/* WEATHER ICONS SECTION */}
          {mainSection === 'weather' && (
            <div className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden">
              {/* Library Filter */}
              <div className="flex-shrink-0">
                <Label className="text-sm font-medium mb-2 block">Icon Library</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={weatherLibrary === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setWeatherLibrary('all')}
                  >
                    All Libraries
                  </Button>
                  {weatherLibraries.map((lib) => (
                    <Button
                      key={lib}
                      variant={weatherLibrary === lib ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setWeatherLibrary(lib)}
                    >
                      {lib === 'animated' ? 'Animated' : lib === 'meteocons' ? 'Meteocons' : lib === 'weather-icons' ? 'Weather Icons' : lib === 'qweather' ? 'QWeather' : lib === 'weather-iconic' ? 'Weather Iconic' : 'Basicons'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex-shrink-0">
                <Label className="text-sm font-medium mb-2 block">Category</Label>
                <div className="flex flex-wrap gap-2">
                  {weatherCategories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Icon count and reset button */}
              <div className="flex items-center justify-between flex-shrink-0">
                <p className="text-xs text-muted-foreground">
                  Showing {filteredWeatherIcons.length} icons
                </p>
                {weatherLibrary === 'animated' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      resetWeatherMappings();
                      setMappingsVersion(v => v + 1);
                    }}
                    title="Reset all mappings to defaults"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset Mappings
                  </Button>
                )}
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="grid grid-cols-6 gap-2 p-2">
                  {filteredWeatherIcons.map((icon) => {
                    const isSelected = currentLibrary === 'weather' && currentIconName === icon.name;
                    const isAnimated = icon.animated && icon.animatedIcon;
                    // Get mappings for this animated icon (re-calculate when mappingsVersion changes)
                    const iconMappings = isAnimated ? getMappingsForIcon(icon.name) : [];
                    const isEditing = editingMappingIcon === icon.name;

                    return (
                      <div
                        key={icon.name}
                        className={`
                          flex flex-col items-center p-2 rounded-lg border-2 transition-colors cursor-pointer
                          hover:bg-violet-500/20 hover:border-violet-500
                          ${isSelected
                            ? 'bg-violet-500/30 border-violet-500'
                            : 'border-border bg-neutral-800'
                          }
                        `}
                        title={`${icon.displayName} (${icon.library})${isAnimated ? '\nDouble-click to edit mappings' : ''}`}
                        onClick={() => handleIconSelect('weather', icon.name)}
                        onDoubleClick={(e) => {
                          if (isAnimated) {
                            e.stopPropagation();
                            setEditingMappingIcon(isEditing ? null : icon.name);
                            setNewMappingInput('');
                          }
                        }}
                      >
                        {icon.animated && icon.animatedIcon ? (
                          <div className="w-8 h-8 flex items-center justify-center">
                            <ReactAnimatedWeather
                              icon={icon.animatedIcon}
                              color="#FFFFFF"
                              size={32}
                              animate={true}
                            />
                          </div>
                        ) : (
                          <img
                            src={icon.svgUrl}
                            alt={icon.displayName}
                            className="w-8 h-8 object-contain"
                            style={{ filter: 'brightness(0) invert(1)' }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const fallback = document.createElement('span');
                                fallback.className = 'text-lg';
                                fallback.textContent = '?';
                                parent.insertBefore(fallback, target.nextSibling);
                              }
                            }}
                          />
                        )}
                        <span className="text-[9px] mt-1 text-center line-clamp-1 text-white">{icon.displayName}</span>

                        {/* Show mappings for animated icons instead of "Animated" label */}
                        {isAnimated ? (
                          <div className="w-full mt-0.5">
                            {isEditing ? (
                              // Editing mode - show editable list
                              <div
                                className="bg-neutral-900 rounded p-1.5 mt-1 space-y-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="text-[8px] text-violet-400 font-medium">API Mappings:</span>
                                  <button
                                    className="ml-auto p-0.5 hover:bg-neutral-700 rounded"
                                    onClick={() => setEditingMappingIcon(null)}
                                    title="Close"
                                  >
                                    <X className="w-2.5 h-2.5 text-neutral-400" />
                                  </button>
                                </div>
                                {iconMappings.map((mapping) => (
                                  <div key={mapping} className="flex items-center gap-1 text-[8px]">
                                    <span className="flex-1 text-neutral-300 truncate">{mapping}</span>
                                    <button
                                      className="p-0.5 hover:bg-red-500/20 rounded"
                                      onClick={() => {
                                        removeWeatherMapping(mapping);
                                        setMappingsVersion(v => v + 1);
                                      }}
                                      title="Remove mapping"
                                    >
                                      <X className="w-2 h-2 text-red-400" />
                                    </button>
                                  </div>
                                ))}
                                {/* Add new mapping input */}
                                <div className="flex items-center gap-1 mt-1">
                                  <input
                                    type="text"
                                    value={newMappingInput}
                                    onChange={(e) => setNewMappingInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && newMappingInput.trim()) {
                                        addWeatherMapping(newMappingInput.trim(), icon.name);
                                        setNewMappingInput('');
                                        setMappingsVersion(v => v + 1);
                                      }
                                    }}
                                    placeholder="Add mapping..."
                                    className="flex-1 text-[8px] bg-neutral-800 border border-neutral-600 rounded px-1 py-0.5 text-white placeholder:text-neutral-500 focus:outline-none focus:border-violet-500"
                                  />
                                  <button
                                    className="p-0.5 hover:bg-green-500/20 rounded"
                                    onClick={() => {
                                      if (newMappingInput.trim()) {
                                        addWeatherMapping(newMappingInput.trim(), icon.name);
                                        setNewMappingInput('');
                                        setMappingsVersion(v => v + 1);
                                      }
                                    }}
                                    title="Add mapping"
                                  >
                                    <Plus className="w-2.5 h-2.5 text-green-400" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Display mode - show mappings as tags with edit hint
                              <div className="flex flex-col items-center">
                                <div className="flex flex-wrap justify-center gap-0.5 max-w-full">
                                  {iconMappings.slice(0, 3).map((mapping) => (
                                    <span
                                      key={mapping}
                                      className="text-[7px] bg-neutral-700 text-neutral-300 px-1 rounded truncate max-w-[50px]"
                                      title={mapping}
                                    >
                                      {mapping}
                                    </span>
                                  ))}
                                  {iconMappings.length > 3 && (
                                    <span className="text-[7px] text-neutral-500">+{iconMappings.length - 3}</span>
                                  )}
                                </div>
                                <span className="text-[7px] text-neutral-500 mt-0.5 flex items-center gap-0.5">
                                  <Pencil className="w-2 h-2" /> double-click
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[8px] text-neutral-400">
                            {icon.library}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


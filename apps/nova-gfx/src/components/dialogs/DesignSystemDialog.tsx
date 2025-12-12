import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  Input,
  Label,
  Slider,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  cn,
} from '@emergent-platform/ui';
import {
  Palette,
  Type,
  Grid3X3,
  Zap,
  Shield,
  Check,
  RotateCcw,
  Settings,
} from 'lucide-react';
import { useDesignerStore } from '@/stores/designerStore';
import { COLOR_PALETTES, FONT_PAIRINGS, EASING_PRESETS, TEXT_TREATMENT_PRESETS } from '@/data/designPresets';
import { DEFAULT_DESIGN_SYSTEM, type ProjectDesignSystem, type DesignColors, type DesignSystemSections } from '@emergent-platform/types';

interface DesignSystemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DesignSystemDialog({ open, onOpenChange }: DesignSystemDialogProps) {
  const { project, designSystem, updateDesignSystem } = useDesignerStore();
  const [localDesignSystem, setLocalDesignSystem] = useState<ProjectDesignSystem>(
    designSystem || DEFAULT_DESIGN_SYSTEM
  );
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (designSystem) {
      setLocalDesignSystem({
        ...designSystem,
        enabledSections: designSystem.enabledSections || DEFAULT_DESIGN_SYSTEM.enabledSections!,
      });
    }
  }, [designSystem]);

  const updateLocal = (updates: Partial<ProjectDesignSystem>) => {
    setLocalDesignSystem(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateDesignSystem(localDesignSystem);
    setHasChanges(false);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalDesignSystem(DEFAULT_DESIGN_SYSTEM);
    setHasChanges(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 flex items-center justify-center shadow-sm">
              <Palette className="w-4 h-4 text-white" />
            </div>
            Design Guidelines
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="options" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="options" className="gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Options</span>
            </TabsTrigger>
            <TabsTrigger value="colors" className="gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Colors</span>
            </TabsTrigger>
            <TabsTrigger value="typography" className="gap-1.5">
              <Type className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Typography</span>
            </TabsTrigger>
            <TabsTrigger value="spacing" className="gap-1.5">
              <Grid3X3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Spacing</span>
            </TabsTrigger>
            <TabsTrigger value="animation" className="gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Animation</span>
            </TabsTrigger>
            <TabsTrigger value="constraints" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Rules</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Options Tab */}
            <TabsContent value="options" className="space-y-6 px-1">
              <OptionsTab
                enabledSections={localDesignSystem.enabledSections || DEFAULT_DESIGN_SYSTEM.enabledSections!}
                onEnabledSectionsChange={(enabledSections) => updateLocal({ enabledSections })}
              />
            </TabsContent>

            {/* Colors Tab */}
            <TabsContent value="colors" className="space-y-6 px-1">
              <ColorsTab
                colors={localDesignSystem.colors}
                onColorsChange={(colors) => updateLocal({ colors })}
              />
            </TabsContent>

            {/* Typography Tab */}
            <TabsContent value="typography" className="space-y-6 px-1">
              <TypographyTab
                fonts={localDesignSystem.fonts}
                typeScale={localDesignSystem.typeScale}
                textTreatment={localDesignSystem.textTreatment}
                onFontsChange={(fonts) => updateLocal({ fonts })}
                onTypeScaleChange={(typeScale) => updateLocal({ typeScale })}
                onTextTreatmentChange={(textTreatment) => updateLocal({ textTreatment })}
              />
            </TabsContent>

            {/* Spacing Tab */}
            <TabsContent value="spacing" className="space-y-6 px-1">
              <SpacingTab
                spacing={localDesignSystem.spacing}
                radii={localDesignSystem.radii}
                shadows={localDesignSystem.shadows}
                onSpacingChange={(spacing) => updateLocal({ spacing })}
                onRadiiChange={(radii) => updateLocal({ radii })}
                onShadowsChange={(shadows) => updateLocal({ shadows })}
              />
            </TabsContent>

            {/* Animation Tab */}
            <TabsContent value="animation" className="space-y-6 px-1">
              <AnimationTab
                animationDefaults={localDesignSystem.animationDefaults}
                onAnimationDefaultsChange={(animationDefaults) => updateLocal({ animationDefaults })}
              />
            </TabsContent>

            {/* AI Constraints Tab */}
            <TabsContent value="constraints" className="space-y-6 px-1">
              <ConstraintsTab
                constraints={localDesignSystem.constraints}
                safeAreas={localDesignSystem.safeAreas}
                onConstraintsChange={(constraints) => updateLocal({ constraints })}
                onSafeAreasChange={(safeAreas) => updateLocal({ safeAreas })}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges}>
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Colors Tab Component
function ColorsTab({
  colors,
  onColorsChange,
}: {
  colors: DesignColors;
  onColorsChange: (colors: DesignColors) => void;
}) {
  const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null);

  const applyPalette = (palette: typeof COLOR_PALETTES[0]) => {
    onColorsChange(palette.colors);
    setSelectedPaletteId(palette.id);
  };

  const updateColor = (key: keyof DesignColors, value: string) => {
    onColorsChange({ ...colors, [key]: value });
    setSelectedPaletteId(null);
  };

  return (
    <>
      {/* Preset Palettes */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Choose a Palette</Label>
        <div className="grid grid-cols-2 gap-3">
          {COLOR_PALETTES.map((palette) => (
            <button
              key={palette.id}
              onClick={() => applyPalette(palette)}
              className={cn(
                'p-3 rounded-lg border-2 text-left transition-all',
                selectedPaletteId === palette.id || JSON.stringify(colors) === JSON.stringify(palette.colors)
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-border hover:border-muted-foreground/50'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{palette.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {palette.category}
                </span>
              </div>
              <div className="flex gap-1">
                {[palette.colors.primary, palette.colors.secondary, palette.colors.accent, palette.colors.background, palette.colors.text].map((color, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded border border-white/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Colors */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Customize Colors</Label>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(colors).map(([key, value]) => (
            <div key={key} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
              <input
                type="color"
                value={value}
                onChange={(e) => updateColor(key as keyof DesignColors, e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                <div className="text-xs text-muted-foreground font-mono">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// Typography Tab Component
function TypographyTab({
  fonts,
  typeScale,
  textTreatment,
  onFontsChange,
  onTypeScaleChange,
  onTextTreatmentChange,
}: {
  fonts: ProjectDesignSystem['fonts'];
  typeScale: ProjectDesignSystem['typeScale'];
  textTreatment: ProjectDesignSystem['textTreatment'];
  onFontsChange: (fonts: ProjectDesignSystem['fonts']) => void;
  onTypeScaleChange: (typeScale: ProjectDesignSystem['typeScale']) => void;
  onTextTreatmentChange: (textTreatment: ProjectDesignSystem['textTreatment']) => void;
}) {
  return (
    <>
      {/* Font Pairings */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Font Pairing</Label>
        <div className="grid grid-cols-2 gap-3">
          {FONT_PAIRINGS.map((pairing) => (
            <button
              key={pairing.id}
              onClick={() => onFontsChange({
                heading: { family: pairing.headingFamily, weights: pairing.headingWeights, fallback: 'system-ui, sans-serif' },
                body: { family: pairing.bodyFamily, weights: pairing.bodyWeights, fallback: 'system-ui, sans-serif' },
              })}
              className={cn(
                'p-3 rounded-lg border-2 text-left transition-all',
                fonts.heading.family === pairing.headingFamily
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-border hover:border-muted-foreground/50'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{pairing.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {pairing.category}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {pairing.headingFamily} + {pairing.bodyFamily}
              </div>
              <div className="mt-2 text-lg font-bold" style={{ fontFamily: pairing.headingFamily }}>
                Heading
              </div>
              <div className="text-sm" style={{ fontFamily: pairing.bodyFamily }}>
                Body text example
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Type Scale */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Type Scale (px)</Label>
        <div className="space-y-2">
          {Object.entries(typeScale).map(([key, value]) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-20 text-sm font-medium capitalize">{key}</div>
              <Input
                type="number"
                value={value.size}
                onChange={(e) => onTypeScaleChange({
                  ...typeScale,
                  [key]: { ...value, size: parseInt(e.target.value) || 16 },
                })}
                className="w-20 h-8"
              />
              <span className="text-xs text-muted-foreground">px</span>
              <div
                className="flex-1 truncate text-muted-foreground"
                style={{ fontSize: Math.min(value.size * 0.4, 24), fontWeight: value.weight }}
              >
                The quick brown fox
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Text Treatment */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Text Treatment (for video overlay)</Label>
        <div className="grid grid-cols-3 gap-2">
          {TEXT_TREATMENT_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onTextTreatmentChange({
                type: preset.type,
                shadow: preset.shadow,
                outline: preset.outline,
                backgroundColor: preset.backgroundColor,
              })}
              className={cn(
                'p-3 rounded-lg border-2 text-center transition-all',
                textTreatment.type === preset.type
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-border hover:border-muted-foreground/50'
              )}
            >
              <div
                className="text-lg font-bold mb-1"
                style={{
                  textShadow: preset.shadow,
                  WebkitTextStroke: preset.outline,
                  backgroundColor: preset.backgroundColor,
                  padding: preset.backgroundColor ? '4px 8px' : undefined,
                  borderRadius: preset.backgroundColor ? '4px' : undefined,
                }}
              >
                Abc
              </div>
              <div className="text-xs text-muted-foreground">{preset.name}</div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// Spacing Tab Component
function SpacingTab({
  spacing,
  radii,
  shadows,
  onSpacingChange,
  onRadiiChange,
  onShadowsChange,
}: {
  spacing: number[];
  radii: number[];
  shadows: ProjectDesignSystem['shadows'];
  onSpacingChange: (spacing: number[]) => void;
  onRadiiChange: (radii: number[]) => void;
  onShadowsChange: (shadows: ProjectDesignSystem['shadows']) => void;
}) {
  return (
    <>
      {/* Spacing Scale */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Spacing Scale</Label>
        <p className="text-xs text-muted-foreground mb-3">
          All spacing in your templates will snap to these values.
        </p>
        <div className="flex flex-wrap gap-2">
          {spacing.map((value, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted rounded px-3 py-2">
              <div
                className="bg-violet-500 rounded-sm"
                style={{ width: Math.min(value * 0.5, 40), height: 16 }}
              />
              <span className="text-sm font-mono">{value}px</span>
            </div>
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Border Radius</Label>
        <div className="flex flex-wrap gap-2">
          {radii.map((value, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted rounded px-3 py-2">
              <div
                className="w-8 h-8 bg-violet-500"
                style={{ borderRadius: value === 9999 ? '50%' : value }}
              />
              <span className="text-sm font-mono">{value === 9999 ? 'full' : `${value}px`}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shadows */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Shadow Presets</Label>
        <div className="grid grid-cols-3 gap-3">
          {(['sm', 'md', 'lg'] as const).map((key) => (
            <div key={key} className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase">{key}</div>
              <div
                className="w-full h-16 bg-card rounded-lg flex items-center justify-center"
                style={{ boxShadow: shadows[key] }}
              >
                <span className="text-xs">Preview</span>
              </div>
              <Input
                value={shadows[key]}
                onChange={(e) => onShadowsChange({ ...shadows, [key]: e.target.value })}
                className="text-xs h-7"
                placeholder="box-shadow value"
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// Animation Tab Component
function AnimationTab({
  animationDefaults,
  onAnimationDefaultsChange,
}: {
  animationDefaults: ProjectDesignSystem['animationDefaults'];
  onAnimationDefaultsChange: (defaults: ProjectDesignSystem['animationDefaults']) => void;
}) {
  return (
    <>
      <div>
        <Label className="text-sm font-medium mb-3 block">Default Animation Timing</Label>
        <p className="text-xs text-muted-foreground mb-4">
          These values will be used as defaults when AI creates new animations.
        </p>

        <div className="space-y-6">
          {/* IN Duration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">IN Duration</Label>
              <span className="text-sm font-mono text-muted-foreground">{animationDefaults.in.duration}ms</span>
            </div>
            <Slider
              value={[animationDefaults.in.duration]}
              min={100}
              max={1500}
              step={50}
              onValueChange={([v]) => onAnimationDefaultsChange({
                ...animationDefaults,
                in: { ...animationDefaults.in, duration: v },
              })}
            />
          </div>

          {/* IN Easing */}
          <div className="space-y-2">
            <Label className="text-sm">IN Easing</Label>
            <Select
              value={animationDefaults.in.easing}
              onValueChange={(v) => onAnimationDefaultsChange({
                ...animationDefaults,
                in: { ...animationDefaults.in, easing: v },
              })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EASING_PRESETS.presets.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.name} - {preset.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* OUT Duration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">OUT Duration</Label>
              <span className="text-sm font-mono text-muted-foreground">{animationDefaults.out.duration}ms</span>
            </div>
            <Slider
              value={[animationDefaults.out.duration]}
              min={100}
              max={1000}
              step={50}
              onValueChange={([v]) => onAnimationDefaultsChange({
                ...animationDefaults,
                out: { ...animationDefaults.out, duration: v },
              })}
            />
          </div>

          {/* OUT Easing */}
          <div className="space-y-2">
            <Label className="text-sm">OUT Easing</Label>
            <Select
              value={animationDefaults.out.easing}
              onValueChange={(v) => onAnimationDefaultsChange({
                ...animationDefaults,
                out: { ...animationDefaults.out, easing: v },
              })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EASING_PRESETS.presets.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.name} - {preset.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stagger Delay */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Stagger Delay</Label>
              <span className="text-sm font-mono text-muted-foreground">{animationDefaults.stagger}ms</span>
            </div>
            <Slider
              value={[animationDefaults.stagger]}
              min={0}
              max={500}
              step={25}
              onValueChange={([v]) => onAnimationDefaultsChange({
                ...animationDefaults,
                stagger: v,
              })}
            />
            <p className="text-xs text-muted-foreground">
              Delay between sequential element animations
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// AI Constraints Tab Component
function ConstraintsTab({
  constraints,
  safeAreas,
  onConstraintsChange,
  onSafeAreasChange,
}: {
  constraints: ProjectDesignSystem['constraints'];
  safeAreas: ProjectDesignSystem['safeAreas'];
  onConstraintsChange: (constraints: ProjectDesignSystem['constraints']) => void;
  onSafeAreasChange: (safeAreas: ProjectDesignSystem['safeAreas']) => void;
}) {
  return (
    <>
      <div>
        <Label className="text-sm font-medium mb-1 block">AI Generation Rules</Label>
        <p className="text-xs text-muted-foreground mb-4">
          These rules ensure AI-generated graphics meet broadcast quality standards.
        </p>

        <div className="space-y-6">
          {/* Min Font Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Minimum Font Size</Label>
              <span className="text-sm font-mono text-muted-foreground">{constraints.minFontSize}px</span>
            </div>
            <Slider
              value={[constraints.minFontSize]}
              min={12}
              max={32}
              step={2}
              onValueChange={([v]) => onConstraintsChange({ ...constraints, minFontSize: v })}
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 18px minimum for broadcast readability
            </p>
          </div>

          {/* Max Font Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Maximum Font Size</Label>
              <span className="text-sm font-mono text-muted-foreground">{constraints.maxFontSize}px</span>
            </div>
            <Slider
              value={[constraints.maxFontSize]}
              min={48}
              max={150}
              step={6}
              onValueChange={([v]) => onConstraintsChange({ ...constraints, maxFontSize: v })}
            />
          </div>

          {/* Min Contrast */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Minimum Contrast Ratio</Label>
              <span className="text-sm font-mono text-muted-foreground">{constraints.minContrast}:1</span>
            </div>
            <Slider
              value={[constraints.minContrast]}
              min={3}
              max={7}
              step={0.5}
              onValueChange={([v]) => onConstraintsChange({ ...constraints, minContrast: v })}
            />
            <p className="text-xs text-muted-foreground">
              WCAG AA requires 4.5:1 for normal text, 3:1 for large text
            </p>
          </div>

          {/* Max Animation Duration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Max Animation Duration</Label>
              <span className="text-sm font-mono text-muted-foreground">{constraints.maxAnimationDuration}ms</span>
            </div>
            <Slider
              value={[constraints.maxAnimationDuration]}
              min={500}
              max={2000}
              step={100}
              onValueChange={([v]) => onConstraintsChange({ ...constraints, maxAnimationDuration: v })}
            />
            <p className="text-xs text-muted-foreground">
              Keep animations snappy for broadcast
            </p>
          </div>
        </div>
      </div>

      {/* Safe Areas */}
      <div className="mt-6">
        <Label className="text-sm font-medium mb-1 block">Safe Areas</Label>
        <p className="text-xs text-muted-foreground mb-4">
          Margins for title-safe and action-safe zones (based on 1920×1080).
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Title Safe Margin</Label>
              <span className="text-sm font-mono text-muted-foreground">{safeAreas.titleSafe.margin}px</span>
            </div>
            <Slider
              value={[safeAreas.titleSafe.margin]}
              min={100}
              max={300}
              step={10}
              onValueChange={([v]) => onSafeAreasChange({
                ...safeAreas,
                titleSafe: { margin: v },
              })}
            />
            <p className="text-xs text-muted-foreground">
              ~{Math.round((safeAreas.titleSafe.margin / 1920) * 100)}% of width
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Action Safe Margin</Label>
              <span className="text-sm font-mono text-muted-foreground">{safeAreas.actionSafe.margin}px</span>
            </div>
            <Slider
              value={[safeAreas.actionSafe.margin]}
              min={50}
              max={200}
              step={10}
              onValueChange={([v]) => onSafeAreasChange({
                ...safeAreas,
                actionSafe: { margin: v },
              })}
            />
            <p className="text-xs text-muted-foreground">
              ~{Math.round((safeAreas.actionSafe.margin / 1920) * 100)}% of width
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// Options Tab Component
function OptionsTab({
  enabledSections,
  onEnabledSectionsChange,
}: {
  enabledSections: DesignSystemSections;
  onEnabledSectionsChange: (sections: DesignSystemSections) => void;
}) {
  const updateSection = (section: keyof DesignSystemSections, enabled: boolean) => {
    onEnabledSectionsChange({
      ...enabledSections,
      [section]: enabled,
    });
  };

  return (
    <>
      <div>
        <Label className="text-sm font-medium mb-1 block">AI Guidelines Sections</Label>
        <p className="text-xs text-muted-foreground mb-4">
          Control which sections of the design guidelines are sent to AI when creating graphics.
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <Checkbox
              id="section-colors"
              checked={enabledSections.colors}
              onCheckedChange={(checked) => updateSection('colors', checked === true)}
            />
            <div className="flex-1">
              <label htmlFor="section-colors" className="text-sm font-medium cursor-pointer">
                Colors
              </label>
              <p className="text-xs text-muted-foreground">
                Color palette and color usage guidelines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <Checkbox
              id="section-typography"
              checked={enabledSections.typography}
              onCheckedChange={(checked) => updateSection('typography', checked === true)}
            />
            <div className="flex-1">
              <label htmlFor="section-typography" className="text-sm font-medium cursor-pointer">
                Typography
              </label>
              <p className="text-xs text-muted-foreground">
                Font families, type scale, and text treatment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <Checkbox
              id="section-spacing"
              checked={enabledSections.spacing}
              onCheckedChange={(checked) => updateSection('spacing', checked === true)}
            />
            <div className="flex-1">
              <label htmlFor="section-spacing" className="text-sm font-medium cursor-pointer">
                Spacing
              </label>
              <p className="text-xs text-muted-foreground">
                Spacing scale, border radius, and shadows
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <Checkbox
              id="section-animation"
              checked={enabledSections.animation}
              onCheckedChange={(checked) => updateSection('animation', checked === true)}
            />
            <div className="flex-1">
              <label htmlFor="section-animation" className="text-sm font-medium cursor-pointer">
                Animation
              </label>
              <p className="text-xs text-muted-foreground">
                Default animation timing and easing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <Checkbox
              id="section-constraints"
              checked={enabledSections.constraints}
              onCheckedChange={(checked) => updateSection('constraints', checked === true)}
            />
            <div className="flex-1">
              <label htmlFor="section-constraints" className="text-sm font-medium cursor-pointer">
                AI Rules & Constraints
              </label>
              <p className="text-xs text-muted-foreground">
                Font size limits, contrast requirements, and safe areas
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}





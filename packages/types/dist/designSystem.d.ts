export interface DesignColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    success: string;
    warning: string;
    error: string;
}
export interface FontConfigExtended {
    family: string;
    weights: number[];
    fallback: string;
}
export interface DesignFonts {
    heading: FontConfigExtended;
    body: FontConfigExtended;
}
export interface TypeScaleEntry {
    size: number;
    lineHeight: number;
    weight: number;
}
export interface DesignTypeScale {
    display: TypeScaleEntry;
    h1: TypeScaleEntry;
    h2: TypeScaleEntry;
    h3: TypeScaleEntry;
    h4: TypeScaleEntry;
    body: TypeScaleEntry;
    caption: TypeScaleEntry;
}
export interface AnimationTiming {
    duration: number;
    easing: string;
}
export interface DesignAnimationDefaults {
    in: AnimationTiming;
    out: AnimationTiming;
    stagger: number;
}
export interface TextTreatment {
    type: 'shadow' | 'outline' | 'background' | 'none';
    shadow?: string;
    outline?: string;
    backgroundColor?: string;
}
export interface SafeAreaConfig {
    margin: number;
}
export interface DesignSafeAreas {
    titleSafe: SafeAreaConfig;
    actionSafe: SafeAreaConfig;
}
export interface DesignConstraints {
    minFontSize: number;
    maxFontSize: number;
    minContrast: number;
    maxAnimationDuration: number;
}
export interface DesignShadows {
    sm: string;
    md: string;
    lg: string;
}
export interface DesignSystemSections {
    colors: boolean;
    typography: boolean;
    spacing: boolean;
    animation: boolean;
    constraints: boolean;
}
export interface ProjectDesignSystem {
    colors: DesignColors;
    fonts: DesignFonts;
    typeScale: DesignTypeScale;
    spacing: number[];
    radii: number[];
    shadows: DesignShadows;
    animationDefaults: DesignAnimationDefaults;
    textTreatment: TextTreatment;
    safeAreas: DesignSafeAreas;
    constraints: DesignConstraints;
    enabledSections?: DesignSystemSections;
}
export interface ColorPalettePreset {
    id: string;
    name: string;
    description?: string;
    category: 'news' | 'sports' | 'entertainment' | 'corporate' | 'custom';
    colors: DesignColors;
    isSystem: boolean;
    previewUrl?: string;
}
export interface FontPairing {
    id: string;
    name: string;
    description?: string;
    category: 'modern' | 'classic' | 'sports' | 'elegant';
    headingFamily: string;
    headingWeights: number[];
    bodyFamily: string;
    bodyWeights: number[];
    googleFontsUrl?: string;
    isSystem: boolean;
    previewUrl?: string;
}
export declare const DEFAULT_DESIGN_SYSTEM: ProjectDesignSystem;
//# sourceMappingURL=designSystem.d.ts.map
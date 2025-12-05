// Re-export all types from @emergent-platform/types

// Core database types
export * from './database';

// Designer types
export * from './designer';

// AI types
export * from './ai';

// Ticker types
export * from './ticker';

// Design system types (excluding ProjectDesignSystem which is already in database.ts)
export type {
  DesignColors,
  FontConfigExtended,
  DesignFonts,
  TypeScaleEntry,
  DesignTypeScale,
  AnimationTiming,
  DesignAnimationDefaults,
  TextTreatment,
  SafeAreaConfig,
  DesignSafeAreas,
  DesignConstraints,
  DesignShadows,
  DesignSystemSections,
  ColorPalettePreset,
  FontPairing,
} from './designSystem';
export { DEFAULT_DESIGN_SYSTEM } from './designSystem';

// Pulsar GFX types (future)
export * from './page';
export * from './channel';
export * from './playout';

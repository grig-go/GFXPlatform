// @emergent-platform/gfx-renderer
// Shared graphics rendering components for Nova GFX and Pulsar GFX

// Animation Engine
export {
  FRAME_RATE,
  FRAME_DURATION,
  msToFrames,
  framesToMs,
  formatTime,
  formatTimeShort,
  easings,
  applyEasing,
  interpolate,
  parseCSSValue,
  parseColor,
  interpolateColor,
  interpolateTransform,
  getAnimatedProperties,
  createDefaultAnimation,
  createChartAnimation,
  CHART_ANIMATION_TYPES,
} from './lib/animation';

export type { AnimationPhase, ChartAnimationType } from './lib/animation';

// Element Components
export { TextElement } from './components/TextElement';

// TODO: These components will be migrated from Nova GFX
// export { ImageElement } from './components/ImageElement';
// export { ShapeElement } from './components/ShapeElement';
// export { IconElement } from './components/IconElement';
// export { ChartElement } from './components/ChartElement';
// export { MapElement } from './components/MapElement';
// export { VideoElement } from './components/VideoElement';
// export { TickerElement } from './components/TickerElement';
// export { TableElement } from './components/TableElement';
// export { LineElement } from './components/LineElement';
// export { SVGElement } from './components/SVGElement';
// export { TopicBadgeElement } from './components/TopicBadgeElement';

// Preview Components
// export { PreviewRenderer } from './components/PreviewRenderer';
// export { Stage } from './components/Stage';
// export { StageElement } from './components/StageElement';

// Hooks
// export { useOnAirAnimation } from './hooks/useOnAirAnimation';
// export { usePlayback } from './hooks/usePlayback';

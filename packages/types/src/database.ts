// Organization & Users (Phase 2)
export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  max_projects: number;
  max_storage_mb: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  organization_id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  preferences: Record<string, unknown>;
  created_at: string;
}

// Projects
export interface Project {
  id: string;
  organization_id: string;
  created_by: string | null;
  name: string;
  description: string | null;
  slug: string;
  custom_url_slug: string | null;
  canvas_width: number;
  canvas_height: number;
  frame_rate: number;
  background_color: string;
  api_key: string;
  api_enabled: boolean;
  is_live: boolean;
  archived: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
  settings?: ProjectSettings;
  thumbnail_url?: string; // Base64 data URL of project thumbnail
}

// Project Settings (API keys, integrations, etc.)
export interface ProjectSettings {
  // API Keys
  mapboxApiKey?: string;
  weatherApiKey?: string;
  sportsDataApiKey?: string;

  // AI Settings (synced across team, but can be overridden locally)
  aiModel?: 'sonnet-fast' | 'opus-advanced' | 'haiku-instant';

  // Default animation settings
  defaultInDuration?: number;
  defaultOutDuration?: number;
  defaultEasing?: string;

  // Design System
  designSystem?: ProjectDesignSystem;

  // System Template reference (if project was created from a system template)
  systemTemplateSlug?: string;
  systemTemplateId?: string;

  // Data source settings
  dataSources?: {
    id: string;
    name: string;
    type: 'rest' | 'websocket' | 'supabase' | 'sheets';
    config: Record<string, unknown>;
  }[];

  // Future: other settings
}

export interface ProjectDesignSystem {
  id: string;
  project_id: string;
  colors: ColorPalette;
  fonts: FontConfig;
  spacing: SpacingScale;
  animation_defaults: AnimationDefaults;
  updated_at: string;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  [key: string]: string;
}

export interface FontConfig {
  heading: { family: string; weight: number };
  body: { family: string; weight: number };
  accent?: { family: string; weight: number };
}

export interface SpacingScale {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface AnimationDefaults {
  inDuration: number;
  outDuration: number;
  easing: string;
}

// Layer Types
export type LayerType =
  | 'fullscreen'
  | 'background'
  | 'video-background'
  | 'lower-third'
  | 'side-panel'
  | 'ticker'
  | 'bug'
  | 'alert'
  | 'overlay'
  | 'custom';

export interface Layer {
  id: string;
  project_id: string;
  name: string;
  layer_type: LayerType;
  z_index: number;
  sort_order: number;
  position_anchor: PositionAnchor;
  position_offset_x: number;
  position_offset_y: number;
  width: number | null;
  height: number | null;
  auto_out: boolean;
  allow_multiple: boolean;
  transition_in: string;
  transition_in_duration: number;
  transition_out: string;
  transition_out_duration: number;
  enabled: boolean; // Visibility toggle
  locked: boolean;  // Prevent editing
  always_on: boolean; // Always visible in preview mode
  created_at: string;
}

export type PositionAnchor =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

// Folders
export interface Folder {
  id: string;
  project_id: string;
  layer_id: string | null;
  parent_folder_id: string | null;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  expanded: boolean;
  created_at: string;
}

// Templates
export interface Template {
  id: string;
  project_id: string;
  layer_id: string;
  folder_id: string | null;
  name: string;
  description: string | null;
  tags: string[];
  thumbnail_url: string | null;
  html_template: string;
  css_styles: string;
  width: number | null;
  height: number | null;
  in_duration: number;
  loop_duration: number | null;
  loop_iterations: number;
  out_duration: number;
  libraries: string[];
  custom_script: string | null;
  enabled: boolean;  // Visibility toggle
  locked: boolean;   // Prevent editing
  archived: boolean;
  version: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Elements
export type ElementType =
  | 'div'
  | 'text'
  | 'line'
  | 'image'
  | 'shape'
  | 'group'
  | 'video'
  | 'lottie'
  | 'd3-chart'
  | 'map'
  | 'ticker'
  | 'topic-badge'
  | 'svg'
  | 'icon'
  | 'table'
  | 'countdown';

export interface Element {
  id: string;
  template_id: string;
  name: string;
  element_id: string; // DOM id
  element_type: ElementType;
  parent_element_id: string | null;
  sort_order: number;
  z_index: number; // Z-order for layering on canvas (higher = in front)
  position_x: number;
  position_y: number;
  width: number | null;
  height: number | null;
  rotation: number;
  scale_x: number;
  scale_y: number;
  anchor_x: number;
  anchor_y: number;
  opacity: number;
  content: ElementContent;
  styles: Record<string, string | number>;
  classes: string[];
  visible: boolean;
  locked: boolean;
}

// Table types
export interface TableColumn {
  id: string;
  header: string;
  accessorKey?: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: 'text' | 'number' | 'currency' | 'percentage' | 'date';
}

export interface TableRow {
  id: string;
  [key: string]: string | number | null | undefined;
}

export type ElementContent =
  | { type: 'div' }
  | {
      type: 'text';
      text: string;
      animation?: {
        enabled: boolean;
        type?: 'fade' | 'slide' | 'scale' | 'blur' | 'glow' | 'typewriter' | 'wave' | 'bounce' | 'custom';
        duration?: number; // in seconds
        delay?: number; // in seconds
        easing?: string; // CSS easing function
        direction?: 'in' | 'out' | 'in-out';
        keyframes?: Array<{
          offset: number; // 0-1
          properties: Record<string, string | number>; // CSS properties
        }>;
        customProperties?: Record<string, string | number>; // For custom animations
      };
    }
  | {
      type: 'line';
      // Line points (multi-point support)
      points: Array<{ x: number; y: number }>; // At least 2 points required
      // Styling
      stroke?: string; // Line color
      strokeWidth?: number; // Thickness in pixels
      strokeLinecap?: 'butt' | 'round' | 'square'; // End caps
      strokeLinejoin?: 'miter' | 'round' | 'bevel'; // Line joins
      strokeDasharray?: string; // Dash pattern (e.g., "5,5" for dashed)
      strokeDashoffset?: number; // Dash offset
      // Arrows
      arrowStart?: {
        enabled: boolean;
        type?: 'none' | 'arrow' | 'triangle' | 'circle' | 'square';
        size?: number; // Arrow size in pixels
        color?: string; // Arrow color (defaults to stroke color)
      };
      arrowEnd?: {
        enabled: boolean;
        type?: 'none' | 'arrow' | 'triangle' | 'circle' | 'square';
        size?: number; // Arrow size in pixels
        color?: string; // Arrow color (defaults to stroke color)
      };
      // Opacity
      opacity?: number; // 0-1
    }
  | {
      type: 'image';
      src: string;
      fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
      nativeWidth?: number;
      nativeHeight?: number;
      nativeAspectRatio?: number;
      aspectRatioLocked?: boolean;
      border?: {
        enabled: boolean;
        width?: number;
        color?: string;
      };
      cornerRadius?: number;
      blur?: {
        enabled: boolean;
        amount?: number; // Blur amount in pixels (0-50)
      };
    }
  | {
      type: 'shape';
      shape: 'rectangle' | 'rhombus' | 'trapezoid' | 'parallelogram';
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      cornerRadius?: number;
      gradient?: {
        enabled: boolean;
        type: 'linear' | 'radial' | 'conic';
        direction?: number; // For linear: angle in degrees (0 = to right, 90 = to bottom)
        colors: Array<{ color: string; stop: number }>; // stop is 0-100
        radialPosition?: { x: number; y: number }; // For radial: center position (0-100)
      };
      glass?: {
        enabled: boolean;
        blur?: number; // Blur amount in pixels (0-50)
        opacity?: number; // Background opacity (0-1)
        borderWidth?: number; // Border width in pixels
        borderColor?: string; // Border color (rgba)
        saturation?: number; // Backdrop saturation (0-200%)
      };
      glow?: {
        enabled: boolean;
        color?: string; // Glow color (defaults to fill color)
        blur?: number; // Blur radius in pixels (0-100)
        spread?: number; // Spread radius in pixels (-50 to 50)
        intensity?: number; // Opacity/intensity (0-1)
      };
    }
  | { type: 'group' }
  | { type: 'video'; src: string; loop?: boolean; muted?: boolean; autoplay?: boolean; poster?: string; videoType?: 'file' | 'youtube' | 'vimeo' | 'stream' }
  | { type: 'lottie'; src: string; loop?: boolean }
  | { type: 'chart'; chartType: ChartType; data: ChartData; options?: ChartOptions }
  | {
      type: 'map';
      // Location data (can be keyframed)
      center: [number, number]; // [lng, lat]
      zoom: number;
      pitch?: number;
      bearing?: number;
      // Styling (separate from location)
      styling?: MapStyling;
      // Legacy fallback for backwards compatibility
      mapStyle?: MapStyle;
      projection?: MapProjection;
      // Markers on the map
      markers?: MapMarker[];
      // Marker templates (reusable marker designs)
      markerTemplates?: MapMarkerTemplate[];
      // Location keyframes for animation
      locationKeyframes?: MapLocationKeyframe[];
      // Saved locations for quick access
      savedLocations?: MapSavedLocation[];
      // Animation settings
      animateLocation?: boolean;
      animationDuration?: number; // ms
      animationEasing?: string;
    }
  | { type: 'ticker'; items: TickerItemData[]; config: TickerConfigData }
  | { type: 'topic-badge'; linkedTickerId?: string; defaultTopic?: TickerTopicType; customLabel?: string; customStyle?: TopicBadgeStyleData; showIcon?: boolean; animated?: boolean }
  | {
      type: 'svg';
      src?: string;
      svgContent?: string;
      width?: number;
      height?: number;
      preserveAspectRatio?: string;
      pattern?: {
        type: 'hero-pattern' | 'custom';
        patternName?: string; // For hero-patterns
        customPattern?: string; // Custom SVG pattern content
        color?: string;
        opacity?: number;
      };
    }
  | {
      type: 'icon';
      library: 'lucide' | 'fontawesome' | 'lottie' | 'weather';
      iconName: string;
      size?: number;
      color?: string;
      weight?: 'solid' | 'regular' | 'brands';
      lottieUrl?: string; // URL to Lottie JSON file
      lottieJson?: string; // Direct Lottie JSON content
      lottieLoop?: boolean; // Whether to loop the animation
      lottieAutoplay?: boolean; // Whether to autoplay
    }
  | {
      type: 'table';
      columns: TableColumn[];
      data: TableRow[];
      showHeader?: boolean;
      striped?: boolean;
      bordered?: boolean;
      compact?: boolean;
      // Styling options
      headerBackgroundColor?: string;
      headerTextColor?: string;
      rowBackgroundColor?: string;
      rowTextColor?: string;
      stripedRowBackgroundColor?: string;
      borderColor?: string;
      showRowBorders?: boolean;
      showColumnBorders?: boolean;
      showOuterBorder?: boolean;
      solidBackgroundColor?: string;
    }
  | {
      type: 'countdown';
      mode: 'duration' | 'datetime' | 'clock';
      durationSeconds?: number;
      targetDatetime?: string | null;
      showDays?: boolean;
      showHours?: boolean;
      showMinutes?: boolean;
      showSeconds?: boolean;
      showMilliseconds?: boolean;
      showLabels?: boolean;
      separator?: string;
      padZeros?: boolean;
      onComplete?: 'stop' | 'loop' | 'hide';
      clockFormat?: '12h' | '24h';
      showDate?: boolean;
      timezone?: string;
    };

// Topic Badge types
export type TickerTopicType =
  | 'news' | 'breaking' | 'sports' | 'finance' | 'weather'
  | 'entertainment' | 'politics' | 'tech' | 'health'
  | 'world' | 'local' | 'alert' | 'live' | 'custom';

export interface TopicBadgeStyleData {
  label?: string;
  backgroundColor?: string;
  textColor?: string;
  icon?: string;
  borderColor?: string;
  animation?: 'none' | 'pulse' | 'flash' | 'glow';
  fontSize?: number; // Font size in pixels
  fontFamily?: string; // Font family name
  // Background options (like rectangle)
  fill?: string; // Solid fill color
  gradient?: {
    enabled: boolean;
    type?: 'linear' | 'radial' | 'conic';
    direction?: number; // For linear: angle in degrees
    colors: Array<{ color: string; stop: number }>; // stop is 0-100
    radialPosition?: { x: number; y: number }; // For radial: center position (0-100)
  };
  glass?: {
    enabled: boolean;
    blur?: number; // Blur amount in pixels (0-50)
    opacity?: number; // Background opacity (0-1)
    borderWidth?: number; // Border width in pixels
    borderColor?: string; // Border color (rgba)
    saturation?: number; // Backdrop saturation (0-200%)
  };
}

// Ticker types (for element content)
export interface TickerItemData {
  id: string;
  content: string;
  topic?: TickerTopicType; // Category/topic for topic badge sync
  customTopicStyle?: TopicBadgeStyleData;
  icon?: string;
  label?: string;
  value?: string;
  color?: string;
  backgroundColor?: string;
  change?: 'up' | 'down' | 'neutral';
  changeValue?: string;
}

export interface TickerConfigData {
  mode: 'scroll' | 'flip' | 'fade' | 'slide';
  direction: 'left' | 'right' | 'up' | 'down';
  speed: number;
  pauseOnHover: boolean;
  delay: number;
  gap: number;
  loop: boolean;
  gradient?: boolean;
  gradientWidth?: number;
  gradientColor?: string;
}

// Map types
export type MapStyle =
  | 'streets'
  | 'outdoors'
  | 'light'
  | 'dark'
  | 'satellite'
  | 'satellite-streets'
  | 'navigation-day'
  | 'navigation-night';

export type MapProjection =
  | 'mercator'
  | 'globe'
  | 'albers'
  | 'equalEarth'
  | 'equirectangular'
  | 'lambertConformalConic'
  | 'naturalEarth'
  | 'winkelTripel';

// Saved location for quick access
export interface MapSavedLocation {
  id: string;
  name: string;
  lng: number;
  lat: number;
  zoom?: number;
  pitch?: number;
  bearing?: number;
}

// Map marker template - user-designed marker that can be reused
export interface MapMarkerTemplate {
  id: string;
  name: string;
  // Template can be a group of elements (icon, text, shape, etc.)
  elements: Array<{
    type: 'icon' | 'text' | 'shape' | 'image';
    // Relative position from marker anchor point
    offsetX: number;
    offsetY: number;
    // Element-specific properties
    width?: number;
    height?: number;
    // For icon
    iconLibrary?: 'lucide' | 'fontawesome' | 'weather';
    iconName?: string;
    iconColor?: string;
    iconSize?: number;
    // For text
    text?: string;
    textColor?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    textAlign?: 'left' | 'center' | 'right';
    // For shape
    shapeType?: 'rectangle' | 'rhombus' | 'trapezoid' | 'parallelogram';
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    cornerRadius?: number;
    // For image
    imageSrc?: string;
    // Common
    opacity?: number;
    zIndex?: number;
  }>;
  // Anchor point for the marker
  anchorX: number; // 0-1, 0.5 = center
  anchorY: number; // 0-1, 0.5 = center
  // Total dimensions
  width: number;
  height: number;
}

// Map marker instance using a template
export interface MapMarker {
  id: string;
  lng: number;
  lat: number;
  // Use template or simple marker
  templateId?: string; // References MapMarkerTemplate
  // Simple marker fallback (if no template)
  color?: string;
  label?: string;
  popup?: string;
  // Data bindings for template placeholders
  data?: Record<string, string | number>;
  // Visibility
  visible?: boolean;
}

// Location keyframe for map animations
export interface MapLocationKeyframe {
  id: string;
  time: number; // Position in timeline (ms or percentage)
  lng: number;
  lat: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
  easing?: string; // CSS easing function
  phase?: 'in' | 'loop' | 'out'; // Animation phase this keyframe belongs to (default: 'in')
  locationName?: string; // Optional friendly name for this location
}

// Map styling options (separate from content/location data)
export interface MapStyling {
  // Map style/theme
  mapStyle: MapStyle;
  projection: MapProjection;
  // Visual enhancements
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  // Overlay effects
  overlayColor?: string;
  overlayOpacity?: number;
  // Attribution visibility
  showAttribution?: boolean;
}

// Chart types
export type ChartType = 'bar' | 'line' | 'pie' | 'donut' | 'gauge' | 'area' | 'horizontal-bar';

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label?: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

export interface ChartOptions {
  title?: string;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  showLabels?: boolean;
  showValues?: boolean;
  animated?: boolean;
  colors?: string[]; // Global color palette
  // Per-bar/dataset colors (array index matches data index)
  barColors?: string[]; // Individual bar colors for bar charts
  datasetColors?: Array<{ // Per-dataset colors
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }>;
  gaugeValue?: number;
  gaugeMax?: number;
  // Font styling
  fontFamily?: string;
  titleFontSize?: number;
  titleFontWeight?: string | number;
  titleColor?: string;
  labelFontSize?: number;
  labelColor?: string;
  valueFontSize?: number;
  valueColor?: string;
  legendFontSize?: number;
  legendFontWeight?: string | number;
  legendColor?: string;
  axisFontSize?: number;
  axisColor?: string;
  // Axis and grid styling
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGrid?: boolean;
  gridColor?: string;
  gridLineWidth?: number;
  axisLineColor?: string;
  axisLineWidth?: number;
  // Bar/line styling
  barBorderWidth?: number;
  barBorderRadius?: number;
  barSpacing?: number; // Gap between bars
  lineWidth?: number;
  lineTension?: number; // 0-1, curve smoothness
  pointRadius?: number;
  pointHoverRadius?: number;
  // Pie/Donut specific
  donutCutout?: number; // Percentage (0-100)
  // Area chart
  areaOpacity?: number;
  // Background
  backgroundColor?: string;
  // Padding
  padding?: number;
  // Animation
  animationDuration?: number;
  animationEasing?: string;
}

// Animations
export type AnimationPhase = 'in' | 'loop' | 'out';

export interface Animation {
  id: string;
  template_id: string;
  element_id: string;
  phase: AnimationPhase;
  delay: number;
  duration: number;
  iterations: number;
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  easing: string;
  preset_id: string | null;
  created_at: string;
}

export interface Keyframe {
  id: string;
  animation_id: string;
  position: number; // 0-100 percentage through animation
  easing?: string;
  // Individual typed properties for common animations
  position_x?: number | null;
  position_y?: number | null;
  rotation?: number | null;
  scale_x?: number | null;
  scale_y?: number | null;
  opacity?: number | null;
  clip_path?: string | null;
  filter_blur?: number | null;
  filter_brightness?: number | null;
  color?: string | null;
  background_color?: string | null;
  // Flexible properties object for any CSS property
  properties: Record<string, string | number>;
  sort_order?: number;
}

// Bindings
export type BindingType = 'text' | 'image' | 'number' | 'color' | 'boolean';

export interface Binding {
  id: string;
  template_id: string;
  element_id: string;
  binding_key: string;
  target_property: string;
  binding_type: BindingType;
  default_value: string | null;
  formatter: string | null;
  formatter_options: Record<string, unknown> | null;
  required: boolean;
}

// Chat
export interface ChatMessage {
  id: string;
  project_id: string;
  user_id: string | null;
  context_template_id: string | null;
  context_element_ids: string[] | null;
  role: 'user' | 'assistant';
  content: string;
  attachments: ChatAttachment[] | null;
  changes_applied: AIChanges | null;
  created_at: string;
}

export interface ChatAttachment {
  type: 'image' | 'figma' | 'template';
  url?: string;
  data?: unknown;
  name?: string;
}

// Playback
export type PlaybackStateType = 'empty' | 'in' | 'hold' | 'loop' | 'out';

export interface PlaybackState {
  id: string;
  project_id: string;
  layer_id: string;
  template_id: string | null;
  state: PlaybackStateType;
  data_override: Record<string, unknown> | null;
  started_at: string | null;
  updated_at: string;
}

export type PlaybackCommandType = 'play_in' | 'play_out' | 'update' | 'clear' | 'clear_all';

export interface PlaybackCommand {
  id: string;
  project_id: string;
  layer_id: string | null;
  template_id: string | null;
  command: PlaybackCommandType;
  data: Record<string, unknown> | null;
  transition: string | null;
  transition_duration: number | null;
  executed: boolean;
  executed_at: string | null;
  created_at: string;
}

// Presets
export interface AnimationPreset {
  id: string;
  name: string;
  description: string | null;
  category: 'entrance' | 'exit' | 'emphasis' | 'motion';
  definition: PresetDefinition;
  preview_url: string | null;
  is_system: boolean;
  organization_id: string | null;
  created_at: string;
}

export interface PresetDefinition {
  duration: number;
  easing?: string;
  keyframes: Partial<Keyframe>[];
}

// Versions
export interface TemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  label: string | null;
  snapshot: TemplateSnapshot;
  created_at: string;
  created_by: string | null;
}

export interface TemplateSnapshot {
  template: Template;
  elements: Element[];
  animations: Animation[];
  keyframes: Keyframe[];
  bindings: Binding[];
}

// Validation hint for user feedback
export interface ValidationHint {
  type: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  suggestion?: string;
}

// AI Changes type (imported by ChatMessage)
export interface AIChanges {
  type: 'create' | 'update' | 'delete' | 'mixed';
  layerType?: LayerType;
  elements?: Partial<Element>[];
  animations?: Partial<Animation>[];
  keyframes?: Partial<Keyframe>[];
  bindings?: Partial<Binding>[];
  css?: string;
  elementsToDelete?: string[];
  validationHints?: ValidationHint[];
}

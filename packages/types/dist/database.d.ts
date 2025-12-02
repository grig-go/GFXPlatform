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
    thumbnail_url?: string;
}
export interface ProjectSettings {
    mapboxApiKey?: string;
    weatherApiKey?: string;
    sportsDataApiKey?: string;
    aiModel?: 'sonnet-fast' | 'opus-advanced' | 'haiku-instant';
    defaultInDuration?: number;
    defaultOutDuration?: number;
    defaultEasing?: string;
    designSystem?: ProjectDesignSystem;
    systemTemplateSlug?: string;
    systemTemplateId?: string;
    dataSources?: {
        id: string;
        name: string;
        type: 'rest' | 'websocket' | 'supabase' | 'sheets';
        config: Record<string, unknown>;
    }[];
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
    heading: {
        family: string;
        weight: number;
    };
    body: {
        family: string;
        weight: number;
    };
    accent?: {
        family: string;
        weight: number;
    };
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
export type LayerType = 'fullscreen' | 'background' | 'video-background' | 'lower-third' | 'side-panel' | 'ticker' | 'bug' | 'alert' | 'overlay' | 'custom';
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
    enabled: boolean;
    locked: boolean;
    always_on: boolean;
    created_at: string;
}
export type PositionAnchor = 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
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
    enabled: boolean;
    locked: boolean;
    archived: boolean;
    version: number;
    sort_order: number;
    created_at: string;
    updated_at: string;
    created_by: string | null;
}
export type ElementType = 'div' | 'text' | 'image' | 'shape' | 'group' | 'video' | 'lottie' | 'd3-chart' | 'map' | 'ticker' | 'topic-badge' | 'svg' | 'icon' | 'table';
export interface Element {
    id: string;
    template_id: string;
    name: string;
    element_id: string;
    element_type: ElementType;
    parent_element_id: string | null;
    sort_order: number;
    z_index: number;
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
export type ElementContent = {
    type: 'div';
} | {
    type: 'text';
    text: string;
    animation?: {
        enabled: boolean;
        type?: 'fade' | 'slide' | 'scale' | 'blur' | 'glow' | 'typewriter' | 'wave' | 'bounce' | 'custom';
        duration?: number;
        delay?: number;
        easing?: string;
        direction?: 'in' | 'out' | 'in-out';
        keyframes?: Array<{
            offset: number;
            properties: Record<string, string | number>;
        }>;
        customProperties?: Record<string, string | number>;
    };
} | {
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
        amount?: number;
    };
} | {
    type: 'shape';
    shape: 'rectangle' | 'ellipse';
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    cornerRadius?: number;
    gradient?: {
        enabled: boolean;
        type: 'linear' | 'radial' | 'conic';
        direction?: number;
        colors: Array<{
            color: string;
            stop: number;
        }>;
        radialPosition?: {
            x: number;
            y: number;
        };
    };
    glass?: {
        enabled: boolean;
        blur?: number;
        opacity?: number;
        borderWidth?: number;
        borderColor?: string;
        saturation?: number;
    };
} | {
    type: 'group';
} | {
    type: 'video';
    src: string;
    loop?: boolean;
    muted?: boolean;
    autoplay?: boolean;
    poster?: string;
    videoType?: 'file' | 'youtube' | 'vimeo' | 'stream';
} | {
    type: 'lottie';
    src: string;
    loop?: boolean;
} | {
    type: 'chart';
    chartType: ChartType;
    data: ChartData;
    options?: ChartOptions;
} | {
    type: 'map';
    center: [number, number];
    zoom: number;
    pitch?: number;
    bearing?: number;
    styling?: MapStyling;
    mapStyle?: MapStyle;
    projection?: MapProjection;
    markers?: MapMarker[];
    markerTemplates?: MapMarkerTemplate[];
    locationKeyframes?: MapLocationKeyframe[];
    savedLocations?: MapSavedLocation[];
    animateLocation?: boolean;
    animationDuration?: number;
    animationEasing?: string;
} | {
    type: 'ticker';
    items: TickerItemData[];
    config: TickerConfigData;
} | {
    type: 'topic-badge';
    linkedTickerId?: string;
    defaultTopic?: TickerTopicType;
    customLabel?: string;
    customStyle?: TopicBadgeStyleData;
    showIcon?: boolean;
    animated?: boolean;
} | {
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
} | {
    type: 'icon';
    library: 'lucide' | 'fontawesome' | 'lottie' | 'weather';
    iconName: string;
    size?: number;
    color?: string;
    weight?: 'solid' | 'regular' | 'brands';
    lottieUrl?: string;
    lottieJson?: string;
    lottieLoop?: boolean;
    lottieAutoplay?: boolean;
} | {
    type: 'table';
    columns: TableColumn[];
    data: TableRow[];
    showHeader?: boolean;
    striped?: boolean;
    bordered?: boolean;
    compact?: boolean;
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
};
export type TickerTopicType = 'news' | 'breaking' | 'sports' | 'finance' | 'weather' | 'entertainment' | 'politics' | 'tech' | 'health' | 'world' | 'local' | 'alert' | 'live' | 'custom';
export interface TopicBadgeStyleData {
    label?: string;
    backgroundColor?: string;
    textColor?: string;
    icon?: string;
    borderColor?: string;
    animation?: 'none' | 'pulse' | 'flash' | 'glow';
    fontSize?: number;
    fontFamily?: string;
    fill?: string;
    gradient?: {
        enabled: boolean;
        type?: 'linear' | 'radial' | 'conic';
        direction?: number;
        colors: Array<{
            color: string;
            stop: number;
        }>;
        radialPosition?: {
            x: number;
            y: number;
        };
    };
    glass?: {
        enabled: boolean;
        blur?: number;
        opacity?: number;
        borderWidth?: number;
        borderColor?: string;
        saturation?: number;
    };
}
export interface TickerItemData {
    id: string;
    content: string;
    topic?: TickerTopicType;
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
export type MapStyle = 'streets' | 'outdoors' | 'light' | 'dark' | 'satellite' | 'satellite-streets' | 'navigation-day' | 'navigation-night';
export type MapProjection = 'mercator' | 'globe' | 'albers' | 'equalEarth' | 'equirectangular' | 'lambertConformalConic' | 'naturalEarth' | 'winkelTripel';
export interface MapSavedLocation {
    id: string;
    name: string;
    lng: number;
    lat: number;
    zoom?: number;
    pitch?: number;
    bearing?: number;
}
export interface MapMarkerTemplate {
    id: string;
    name: string;
    elements: Array<{
        type: 'icon' | 'text' | 'shape' | 'image';
        offsetX: number;
        offsetY: number;
        width?: number;
        height?: number;
        iconLibrary?: 'lucide' | 'fontawesome' | 'weather';
        iconName?: string;
        iconColor?: string;
        iconSize?: number;
        text?: string;
        textColor?: string;
        fontSize?: number;
        fontFamily?: string;
        fontWeight?: string | number;
        textAlign?: 'left' | 'center' | 'right';
        shapeType?: 'rectangle' | 'ellipse';
        fill?: string;
        stroke?: string;
        strokeWidth?: number;
        cornerRadius?: number;
        imageSrc?: string;
        opacity?: number;
        zIndex?: number;
    }>;
    anchorX: number;
    anchorY: number;
    width: number;
    height: number;
}
export interface MapMarker {
    id: string;
    lng: number;
    lat: number;
    templateId?: string;
    color?: string;
    label?: string;
    popup?: string;
    data?: Record<string, string | number>;
    visible?: boolean;
}
export interface MapLocationKeyframe {
    id: string;
    time: number;
    lng: number;
    lat: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
    easing?: string;
}
export interface MapStyling {
    mapStyle: MapStyle;
    projection: MapProjection;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    overlayColor?: string;
    overlayOpacity?: number;
    showAttribution?: boolean;
}
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
    colors?: string[];
    barColors?: string[];
    datasetColors?: Array<{
        backgroundColor?: string | string[];
        borderColor?: string | string[];
    }>;
    gaugeValue?: number;
    gaugeMax?: number;
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
    showXAxis?: boolean;
    showYAxis?: boolean;
    showGrid?: boolean;
    gridColor?: string;
    gridLineWidth?: number;
    axisLineColor?: string;
    axisLineWidth?: number;
    barBorderWidth?: number;
    barBorderRadius?: number;
    barSpacing?: number;
    lineWidth?: number;
    lineTension?: number;
    pointRadius?: number;
    pointHoverRadius?: number;
    donutCutout?: number;
    areaOpacity?: number;
    backgroundColor?: string;
    padding?: number;
    animationDuration?: number;
    animationEasing?: string;
}
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
    position: number;
    easing?: string;
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
    properties: Record<string, string | number>;
    sort_order?: number;
}
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
export interface ValidationHint {
    type: 'element' | 'animation' | 'keyframe' | 'binding' | 'general';
    field: string;
    message: string;
    suggestion?: string;
}
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
//# sourceMappingURL=database.d.ts.map
// Chart Types and Configurations

export type ChartType = 
  | 'bar' 
  | 'horizontal-bar' 
  | 'stacked-bar'
  | 'pie' 
  | 'donut' 
  | 'line' 
  | 'area'
  | 'gauge' 
  | 'progress'
  | 'radial'
  | 'sparkline';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  icon?: string;
}

export interface ChartConfig {
  type: ChartType;
  data: ChartDataPoint[];
  
  // Appearance
  colors?: string[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  
  // Animation
  animate?: boolean;
  animationDuration?: number;
  animationEasing?: string;
  
  // Labels
  showLabels?: boolean;
  showValues?: boolean;
  showLegend?: boolean;
  labelColor?: string;
  labelFont?: string;
  labelSize?: number;
  valueFormat?: 'number' | 'percent' | 'currency' | 'custom';
  valuePrefix?: string;
  valueSuffix?: string;
  
  // Axes (for bar/line charts)
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGrid?: boolean;
  gridColor?: string;
  
  // Specific options
  donutWidth?: number; // For donut/gauge
  gaugeMin?: number;
  gaugeMax?: number;
  startAngle?: number;
  endAngle?: number;
  
  // Layout
  padding?: number;
  gap?: number;
  orientation?: 'horizontal' | 'vertical';
}

// Default color palettes for broadcast graphics
export const CHART_PALETTES = {
  sports: ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6'],
  news: ['#1E40AF', '#DC2626', '#059669', '#D97706', '#7C3AED'],
  corporate: ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
  vibrant: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
  monochrome: ['#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF'],
  neon: ['#00FF87', '#FF00FF', '#00BFFF', '#FFD700', '#FF4500'],
};

// Preset configurations for common broadcast use cases
export const CHART_PRESETS: Record<string, Partial<ChartConfig>> = {
  scoreComparison: {
    type: 'horizontal-bar',
    colors: CHART_PALETTES.sports,
    showValues: true,
    showLabels: true,
    animate: true,
    animationDuration: 800,
    borderRadius: 4,
    gap: 8,
  },
  pollResults: {
    type: 'horizontal-bar',
    colors: CHART_PALETTES.news,
    showValues: true,
    showLabels: true,
    valueFormat: 'percent',
    animate: true,
    animationDuration: 1000,
    borderRadius: 0,
  },
  voteShare: {
    type: 'pie',
    colors: CHART_PALETTES.news,
    showLabels: true,
    showValues: true,
    valueFormat: 'percent',
    animate: true,
    animationDuration: 1200,
  },
  stockTicker: {
    type: 'sparkline',
    colors: ['#22C55E'],
    animate: false,
    showLabels: false,
  },
  gameStats: {
    type: 'bar',
    colors: CHART_PALETTES.sports,
    showValues: true,
    showLabels: true,
    animate: true,
    borderRadius: 4,
  },
  progressMeter: {
    type: 'progress',
    colors: ['#8B5CF6'],
    animate: true,
    animationDuration: 1000,
    borderRadius: 999,
  },
  speedometer: {
    type: 'gauge',
    colors: ['#EF4444', '#F59E0B', '#22C55E'],
    gaugeMin: 0,
    gaugeMax: 100,
    animate: true,
    animationDuration: 800,
  },
};


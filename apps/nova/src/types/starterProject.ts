// Starter Project Types for System Templates

export interface StarterKeyframe {
  position: number;
  properties: Record<string, any>;
}

export interface StarterAnimation {
  element_name: string; // Reference by name
  phase: 'in' | 'loop' | 'out';
  delay: number;
  duration: number;
  easing: string;
  keyframes: StarterKeyframe[];
}

export interface StarterElement {
  name: string;
  element_type: string;
  position_x: number;
  position_y: number;
  width: number | null;
  height: number | null;
  rotation?: number;
  opacity?: number;
  z_index?: number;
  styles?: Record<string, any>;
  content: Record<string, any>;
  children?: StarterElement[];
}

export interface StarterTemplate {
  name: string;
  description?: string;
  layer_type: string;
  width?: number;
  height?: number;
  in_duration: number;
  out_duration: number;
  elements: StarterElement[];
  animations: StarterAnimation[];
  css?: string;
}

export interface StarterLayer {
  name: string;
  layer_type: string;
  z_index: number;
  position_anchor: string;
  position_offset_x: number;
  position_offset_y: number;
  width: number | null;
  height: number | null;
  templates: StarterTemplate[];
}

export interface StarterProject {
  name: string;
  description: string;
  slug: string;
  style: 'glass' | 'flat' | 'sports' | 'news';
  canvas_width: number;
  canvas_height: number;
  frame_rate: number;
  background_color: string;
  layers: StarterLayer[];
  design_system: {
    colors: Record<string, string>;
    fonts: string[] | Record<string, string>;
  };
}

import type { Element } from './database';

// Designer Tool
export type DesignTool =
  | 'select'
  | 'rotate'
  | 'text'
  | 'line'
  | 'rectangle'
  | 'ellipse'
  | 'image'
  | 'chart'
  | 'map'
  | 'video'
  | 'ticker'
  | 'topic-badge'
  | 'svg'
  | 'icon'
  | 'table'
  | 'countdown'
  | 'hand'
  | 'zoom';

// Selection
export interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

// Transform
export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

// History
export interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  state: DesignerSnapshot;
}

export interface DesignerSnapshot {
  elements: Element[];
  animations: unknown[];
  keyframes: unknown[];
  bindings: unknown[];
}

// Drag & Drop
export interface DragItem {
  type: 'element' | 'layer' | 'folder' | 'template';
  id: string;
  data: unknown;
}

// Clipboard
export interface ClipboardData {
  type: 'elements';
  elements: Element[];
  animations: unknown[];
}

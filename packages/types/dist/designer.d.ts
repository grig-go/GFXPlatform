import type { Element } from './database';
export type DesignTool = 'select' | 'text' | 'rectangle' | 'ellipse' | 'image' | 'chart' | 'map' | 'video' | 'ticker' | 'topic-badge' | 'svg' | 'icon' | 'table' | 'hand' | 'zoom';
export interface SelectionBounds {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
}
export interface Transform {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
}
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
export interface DragItem {
    type: 'element' | 'layer' | 'folder' | 'template';
    id: string;
    data: unknown;
}
export interface ClipboardData {
    type: 'elements';
    elements: Element[];
    animations: unknown[];
}
//# sourceMappingURL=designer.d.ts.map
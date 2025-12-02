import type { Element, Animation, Binding, AIChanges, ProjectDesignSystem as DbDesignSystem } from './database';
import type { ProjectDesignSystem as FullDesignSystem } from './designSystem';
export type AIDesignSystem = FullDesignSystem | DbDesignSystem | Record<string, unknown> | null;
export interface AIContext {
    project: {
        name: string;
        canvasWidth: number;
        canvasHeight: number;
    };
    designSystem: AIDesignSystem;
    currentTemplate: {
        id: string;
        name: string;
        elements: Element[];
        animations: Animation[];
        bindings: Binding[];
    } | null;
    selectedElements: Element[];
    availableLayers?: {
        name: string;
        type: string;
        hasTemplates: boolean;
    }[];
    availablePresets: string[];
    availableLibraries: string[];
}
export interface AIRequest {
    message: string;
    context: AIContext;
    attachments?: AIAttachment[];
}
export interface AIAttachment {
    type: 'image' | 'figma' | 'template';
    content: string;
}
export interface AIResponse {
    message: string;
    changes?: AIChanges;
    preview?: {
        before?: string;
        after?: string;
    };
    suggestions?: string[];
    clarification?: {
        question: string;
        options?: string[];
    };
}
export interface AIChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    attachments?: AIAttachment[];
    changes?: AIChanges;
    timestamp: Date;
    status?: 'sending' | 'sent' | 'error';
}
export type { AIChanges };
//# sourceMappingURL=ai.d.ts.map
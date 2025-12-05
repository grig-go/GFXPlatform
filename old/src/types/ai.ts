import type { Element, Animation, Binding, AIChanges, ProjectDesignSystem as DbDesignSystem } from './database';
import type { ProjectDesignSystem as FullDesignSystem } from './designSystem';

// The design system can be the full version from designSystem.ts, 
// the database version, or any compatible object
export type AIDesignSystem = FullDesignSystem | DbDesignSystem | Record<string, unknown> | null;

// AI Context
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

// AI Request
export interface AIRequest {
  message: string;
  context: AIContext;
  attachments?: AIAttachment[];
}

export interface AIAttachment {
  type: 'image' | 'figma' | 'template';
  content: string; // base64 or URL or JSON
}

// AI Response
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

// AI Message (for chat history display)
export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: AIAttachment[];
  changes?: AIChanges;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

// Re-export AIChanges for convenience
export type { AIChanges };


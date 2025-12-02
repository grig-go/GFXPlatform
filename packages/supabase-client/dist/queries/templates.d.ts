import type { Template, Element, Animation, Keyframe, Binding } from '@emergent-platform/types';
/**
 * Get a single template by ID
 */
export declare function getTemplate(templateId: string): Promise<Template | null>;
/**
 * Create a new template
 */
export declare function createTemplate(template: Partial<Template>): Promise<Template | null>;
/**
 * Update a template
 */
export declare function updateTemplate(templateId: string, updates: Partial<Template>): Promise<Template | null>;
/**
 * Archive a template (soft delete)
 */
export declare function archiveTemplate(templateId: string): Promise<boolean>;
/**
 * Delete a template permanently
 */
export declare function deleteTemplate(templateId: string): Promise<boolean>;
/**
 * Get all elements for a template
 */
export declare function getTemplateElements(templateId: string): Promise<Element[]>;
/**
 * Get all animations for a template
 */
export declare function getTemplateAnimations(templateId: string): Promise<Animation[]>;
/**
 * Get all keyframes for animations in a template
 */
export declare function getTemplateKeyframes(templateId: string): Promise<Keyframe[]>;
/**
 * Get all bindings for a template
 */
export declare function getTemplateBindings(templateId: string): Promise<Binding[]>;
/**
 * Get complete template data (template + elements + animations + keyframes + bindings)
 */
export declare function getFullTemplate(templateId: string): Promise<{
    template: Template;
    elements: Element[];
    animations: Animation[];
    keyframes: Keyframe[];
    bindings: Binding[];
} | null>;
//# sourceMappingURL=templates.d.ts.map
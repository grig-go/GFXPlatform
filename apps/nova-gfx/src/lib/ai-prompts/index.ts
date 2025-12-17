/**
 * Modular AI Prompt System
 *
 * This system provides dynamic, context-aware prompts to the AI based on:
 * 1. User intent detection (what they're asking for)
 * 2. Current context (what elements exist, what's selected)
 * 3. Available tools (sports logos, weather data, etc.)
 *
 * Instead of sending everything every time, we:
 * - Send a lean core prompt with essential instructions
 * - Dynamically inject relevant element documentation
 * - Provide tools the AI can "call" for additional information
 */

import { CORE_SYSTEM_PROMPT } from './core-prompt';
import { detectIntent, type UserIntent } from './intent-detector';
import { getElementDocs } from './elements';
import { SPORTS_TOOLS_PROMPT, getSportsLogoUrl } from './tools/sports-logos';
import { STYLING_REFERENCE } from './styling-reference';
import { ANIMATION_REFERENCE } from './animation-reference';
import { BROADCAST_DESIGN_GUIDELINES } from './broadcast-guidelines';
import type { AIContext } from '@emergent-platform/types';

export interface PromptModule {
  id: string;
  name: string;
  content: string;
  priority: number; // Lower = included first
}

/**
 * Build a dynamic system prompt based on user intent and context
 */
export function buildDynamicSystemPrompt(
  userMessage: string,
  context: AIContext
): string {
  const intent = detectIntent(userMessage, context);
  const modules: PromptModule[] = [];

  // Always include core prompt
  modules.push({
    id: 'core',
    name: 'Core Instructions',
    content: CORE_SYSTEM_PROMPT,
    priority: 0,
  });

  // Add element documentation based on intent and context
  const elementDocs = selectElementDocs(intent, context);
  if (elementDocs.length > 0) {
    modules.push({
      id: 'elements',
      name: 'Element Documentation',
      content: `## Element Types\n\n${elementDocs.join('\n\n')}`,
      priority: 10,
    });
  }

  // Sports tools disabled - all images now use {{GENERATE:...}} placeholders
  // Team logos are generated via AI like all other images

  // Add broadcast design guidelines for creating/styling (this is essential)
  if (intent.isCreating || intent.needsStyling) {
    modules.push({
      id: 'broadcast-guidelines',
      name: 'Broadcast Design Guidelines',
      content: BROADCAST_DESIGN_GUIDELINES,
      priority: 5, // High priority - right after core
    });
  }

  // Add styling reference if creating/styling elements
  if (intent.needsStyling) {
    modules.push({
      id: 'styling',
      name: 'Styling Reference',
      content: STYLING_REFERENCE,
      priority: 30,
    });
  }

  // Add animation reference if creating new elements or asking about animations
  if (intent.needsAnimation) {
    modules.push({
      id: 'animation',
      name: 'Animation Reference',
      content: ANIMATION_REFERENCE,
      priority: 40,
    });
  }

  // Sort by priority and combine
  modules.sort((a, b) => a.priority - b.priority);

  return modules.map(m => m.content).join('\n\n---\n\n');
}

/**
 * Select which element documentation to include based on intent
 */
function selectElementDocs(intent: UserIntent, context: AIContext): string[] {
  const docs: string[] = [];

  // Always include docs for element types that exist in the current template
  const existingTypes = new Set<string>();
  if (context.currentTemplate?.elements) {
    for (const el of context.currentTemplate.elements) {
      existingTypes.add(el.element_type);
    }
  }

  // Include docs for existing element types
  for (const type of existingTypes) {
    const doc = getElementDocs(type);
    if (doc) docs.push(doc);
  }

  // Include docs for element types mentioned in the user's message
  for (const type of intent.mentionedElementTypes) {
    if (!existingTypes.has(type)) {
      const doc = getElementDocs(type);
      if (doc) docs.push(doc);
    }
  }

  // Include docs for element types likely needed based on intent
  for (const type of intent.suggestedElementTypes) {
    if (!existingTypes.has(type) && !intent.mentionedElementTypes.includes(type)) {
      const doc = getElementDocs(type);
      if (doc) docs.push(doc);
    }
  }

  // If creating something new and no specific types detected, include common ones
  if (intent.isCreating && docs.length === 0) {
    docs.push(getElementDocs('shape')!);
    docs.push(getElementDocs('text')!);
  }

  return docs;
}

/**
 * Build context message (dynamic part sent with each request)
 */
export function buildContextMessage(context: AIContext): string {
  const parts: string[] = [];

  if (context.project) {
    parts.push(`Canvas: ${context.project.canvasWidth}x${context.project.canvasHeight}`);
  }

  // Include design system if available (condensed)
  if (context.designSystem && typeof context.designSystem === 'object') {
    const ds = context.designSystem as any;
    const guidelines: string[] = [];

    if (ds.colors) {
      guidelines.push(`Colors: ${ds.colors.primary}, ${ds.colors.secondary}, ${ds.colors.accent}`);
    }
    if (ds.fonts?.heading) {
      guidelines.push(`Fonts: "${ds.fonts.heading.family}" / "${ds.fonts.body?.family || 'Inter'}"`);
    }

    if (guidelines.length > 0) {
      parts.push(`Design System: ${guidelines.join(' | ')}`);
    }
  }

  // Current template and elements
  if (context.currentTemplate) {
    parts.push(`CURRENT TEMPLATE: "${context.currentTemplate.name}"`);

    if (context.currentTemplate.elements.length > 0) {
      const elementList = context.currentTemplate.elements.map((e) => {
        const details: string[] = [`id:${e.id.slice(0,8)}`];
        if (e.content) {
          const content = e.content as Record<string, any>;
          if (content.text) details.push(`"${String(content.text).slice(0, 20)}"`);
          if (content.shape) details.push(content.shape);
        }
        return `• ${e.name} (${e.element_type}) [${details.join(', ')}]`;
      }).join('\n');

      parts.push(`EXISTING ELEMENTS (${context.currentTemplate.elements.length}) - Use "action": "update" to modify these:\n${elementList}`);
      parts.push(`⚠️ IMPORTANT: When user says "update", "modify", "change", "improve", or "add to" - use "action": "update" with the element IDs above. Do NOT create a new template!`);
    } else {
      parts.push(`No elements yet - use "action": "create" to make new ones.`);
    }
  }

  if (context.selectedElements?.length > 0) {
    const selected = context.selectedElements.map(e => `"${e.name}" (${e.id.slice(0,8)})`).join(', ');
    parts.push(`SELECTED: ${selected}`);
  }

  return parts.join('\n\n');
}

// Re-export utilities
export { detectIntent } from './intent-detector';
export { getSportsLogoUrl } from './tools/sports-logos';
export { getElementDocs } from './elements';

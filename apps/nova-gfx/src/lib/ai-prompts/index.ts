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
import { INTERACTIVE_REFERENCE } from './interactive-reference';
import type { AIContext } from '@emergent-platform/types';

/**
 * Data-driven design prompt - tells AI how to create templates with data bindings
 */
const DATA_DRIVEN_DESIGN_PROMPT = `## DATA-DRIVEN DESIGN MODE

⚠️ **CRITICAL REQUIREMENTS:**
1. You MUST include a "binding" object in EVERY element that displays data!
2. You MUST use ALL relevant data fields from the schema - DO NOT cherry-pick or omit available data!

### USE ALL AVAILABLE DATA
When given a data schema, create elements for EVERY field that would be useful in the graphic:
- For weather data: Include temperature (high AND low), precipitation/rain chance, conditions, humidity, wind, UV index, dates, etc.
- For sports data: Include all scores, player names, team names, stats, times, etc.
- For any data: If a field exists in the schema, it's there for a reason - USE IT!

**DO NOT** skip fields just because they seem secondary. The user connected this data source because they want ALL the data displayed.

### Required Binding Object
Every text element that shows data from the schema MUST have a "binding" property:

\`\`\`json
{
  "name": "Location Name",
  "element_type": "text",
  "content": { "text": "{{location.name}}", "type": "text" },
  "binding": {
    "field": "location.name",
    "type": "text"
  }
}
\`\`\`

### Complete Example Element with Binding
\`\`\`json
{
  "name": "Temperature High",
  "element_type": "text",
  "position_x": 100,
  "position_y": 200,
  "width": 150,
  "height": 60,
  "content": { "text": "{{weather.items[0].temperatureMax.valueAndUnit[0]}}", "type": "text" },
  "styles": { "fontSize": 48, "fontWeight": "bold", "color": "#FFFFFF" },
  "binding": {
    "field": "weather.items[0].temperatureMax.valueAndUnit[0]",
    "type": "text"
  }
}
\`\`\`

### Binding Types
- \`text\`: For string values (names, titles, locations, temperatures with units)
- \`number\`: For numeric values (raw numbers, percentages, scores)
- \`boolean\`: For true/false values
- \`image\`: For image URLs

### Rules:
1. The "binding.field" value MUST exactly match a field path from the schema
2. Use the same field path in both "content.text" (as {{field}}) and "binding.field"
3. Static elements (backgrounds, decorative shapes) do NOT need bindings
4. Elements displaying data MUST have the binding object - this is NOT optional!
5. **USE ALL DATA FIELDS** - Don't leave out precipitation, humidity, wind, or any other available fields!

### 🌤️ Weather Icons - CRITICAL!
**For weather data, use ICON elements with library="weather", NOT {{GENERATE:...}} placeholders!**

Weather icon codes (like "01d", "sunny", etc.) should be mapped to animated weather icons:
\`\`\`json
{
  "element_type": "icon",
  "name": "Weather Icon Day 1",
  "content": {
    "type": "icon",
    "library": "weather",
    "iconName": "animated-clear-day",
    "size": 64,
    "color": "#FFD700"
  }
}
\`\`\`

**Icon name mapping (use the appropriate one based on condition):**
- Clear/Sunny → "animated-clear-day" or "animated-clear-night"
- Partly Cloudy → "animated-partly-cloudy-day" or "animated-partly-cloudy-night"
- Cloudy/Overcast → "animated-cloudy"
- Rain/Showers → "animated-rain"
- Snow → "animated-snow"
- Fog/Mist → "animated-fog"
- Wind → "animated-wind"

**❌ NEVER DO THIS for weather icons:**
\`\`\`json
{"src": "{{GENERATE:{{weather.items[0].icon}}}}"}  // WRONG - data binding alone!
\`\`\`

**✅ ALWAYS use icon elements for weather conditions!**
`;

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

  // Add interactive scripting reference when project is interactive or user mentions interactivity
  if (intent.needsInteractive || context.isInteractive) {
    modules.push({
      id: 'interactive',
      name: 'Interactive Scripting Reference',
      content: INTERACTIVE_REFERENCE,
      priority: 15, // After broadcast guidelines, before styling
    });
  }

  // Add data-driven design instructions when data context is provided
  if (context.dataContext) {
    modules.push({
      id: 'data-driven',
      name: 'Data-Driven Design',
      content: DATA_DRIVEN_DESIGN_PROMPT,
      priority: 3, // High priority - right after core, before broadcast guidelines
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
        // Show if element is interactive (clickable)
        if ((e as any).interactive) {
          details.push('🎮 interactive');
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

  // Include data context for data-driven design
  if (context.dataContext) {
    const { dataSourceName, schema, sampleData } = context.dataContext;

    parts.push(`\n## DATA-DRIVEN DESIGN ACTIVE\nData Source: "${dataSourceName}"`);

    // Show schema (field name -> type)
    const schemaLines = Object.entries(schema).map(([field, type]) => `  • ${field}: ${type}`).join('\n');
    parts.push(`Data Schema:\n${schemaLines}`);

    // Show sample data (first record)
    parts.push(`Sample Data (first record):\n\`\`\`json\n${JSON.stringify(sampleData, null, 2)}\n\`\`\``);

    parts.push(`⚠️ IMPORTANT: Create elements for ALL data fields shown above with "binding" configuration. Do NOT skip any fields - use every piece of available data!`);
  }

  // Include interactive mode context
  if (context.isInteractive) {
    // List interactive elements for scripts
    const interactiveElements = context.currentTemplate?.elements
      .filter(e => (e as any).interactive)
      .map(e => `• "${e.name}" (${e.element_type})`)
      .join('\n') || 'None yet';

    parts.push(`\n## 🎮 INTERACTIVE MODE ACTIVE
This project is in Interactive Mode. You can create clickable buttons, navigation, and data-switching interactions.

**Key capabilities:**
- Use \`"interactive": true\` on elements that should respond to clicks
- Address elements with \`@ElementName.property\` syntax
- Switch template data with \`actions.setState('@template.{{CURRENT_TEMPLATE}}.data', 'Value')\`
- Create JavaScript handler functions in the \`script\` field

**⚠️ CRITICAL: Use \`{{CURRENT_TEMPLATE}}\` placeholder in template addresses!**
It will be resolved to the actual template name at runtime. Do NOT hard-code template names.

**⚠️ REQUIRED: Include \`script\` field with handler functions when creating interactive buttons!**
Handler function pattern: \`on{ElementName}On{EventType}\` (spaces become underscores)
Example: "Btn Alabama" → \`function onBtn_AlabamaOnClick(event) { actions.setState(...) }\`

**Interactive Elements on Canvas:**
${interactiveElements}

When creating scripts for buttons, use their EXACT names (with spaces → underscores) in handler function names.`);
  }

  return parts.join('\n\n');
}

// Re-export utilities
export { detectIntent } from './intent-detector';
export { getSportsLogoUrl } from './tools/sports-logos';
export { getElementDocs } from './elements';

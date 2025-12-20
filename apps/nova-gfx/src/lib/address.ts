/**
 * Universal Address System for Scripting
 *
 * Allows users to reference any property, element, or function from anywhere in the app.
 * Address format uses @ prefix for names: @elementName.property
 */

import { useDesignerStore } from '@/stores/designerStore';

// Address types
export type AddressType =
  | 'element'
  | 'template'
  | 'layer'
  | 'data'
  | 'state'
  | 'animation'
  | 'action';

export interface ParsedAddress {
  type: AddressType;
  name: string;
  path: string[];
  raw: string;
}

/**
 * Build an address string for an element property
 * @param elementName - The element's display name
 * @param property - The property path (e.g., 'position.x', 'content.text', 'styles.backgroundColor')
 */
export function buildElementAddress(elementName: string, property?: string): string {
  const safeName = sanitizeName(elementName);
  return property ? `@${safeName}.${property}` : `@${safeName}`;
}

/**
 * Build an address string for a template
 * @param templateName - The template's display name
 * @param property - Optional property (e.g., 'visible', 'name')
 */
export function buildTemplateAddress(templateName: string, property?: string): string {
  const safeName = sanitizeName(templateName);
  return property ? `@template.${safeName}.${property}` : `@template.${safeName}`;
}

/**
 * Build an address string for a layer
 * @param layerName - The layer's display name
 * @param property - Optional property (e.g., 'visible', 'name')
 */
export function buildLayerAddress(layerName: string, property?: string): string {
  const safeName = sanitizeName(layerName);
  return property ? `@layer.${safeName}.${property}` : `@layer.${safeName}`;
}

/**
 * Build an address string for a data field
 * @param fieldName - The data field name
 * @param source - Optional data source name (defaults to 'current')
 */
export function buildDataAddress(fieldName: string, source: string = 'current'): string {
  return `@data.${source}.${fieldName}`;
}

/**
 * Build an address string for state
 * @param stateName - The state variable name
 */
export function buildStateAddress(stateName: string): string {
  return `@state.${stateName}`;
}

/**
 * Build an action address (for documentation/autocomplete)
 * @param actionName - The action name
 * @param params - Optional parameter hints
 */
export function buildActionAddress(actionName: string, params?: string[]): string {
  if (params && params.length > 0) {
    return `actions.${actionName}(${params.join(', ')})`;
  }
  return `actions.${actionName}()`;
}

/**
 * Build an address string for a keyframe
 * @param elementName - The element's display name
 * @param phase - Animation phase ('in' or 'out')
 * @param keyframeName - The keyframe's name
 * @param property - Optional property path
 */
export function buildKeyframeAddress(
  elementName: string,
  phase: string,
  keyframeName: string,
  property?: string
): string {
  const safeElementName = sanitizeName(elementName);
  const safeKeyframeName = sanitizeName(keyframeName);
  const base = `@${safeElementName}.animation.${phase}.${safeKeyframeName}`;
  return property ? `${base}.${property}` : base;
}

/**
 * Build an address string for an animation
 * @param elementName - The element's display name
 * @param phase - Animation phase ('in' or 'out')
 * @param property - Optional property path
 */
export function buildAnimationAddress(
  elementName: string,
  phase: string,
  property?: string
): string {
  const safeElementName = sanitizeName(elementName);
  const base = `@${safeElementName}.animation.${phase}`;
  return property ? `${base}.${property}` : base;
}

/**
 * Sanitize a name for use in addresses
 * Replaces spaces with underscores, removes special characters
 */
export function sanitizeName(name: string): string {
  return name
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Parse an address string into components
 */
export function parseAddress(address: string): ParsedAddress | null {
  if (!address.startsWith('@')) {
    return null;
  }

  const parts = address.slice(1).split('.');
  if (parts.length === 0) {
    return null;
  }

  // Determine type based on prefix
  const firstPart = parts[0].toLowerCase();

  if (firstPart === 'template') {
    return {
      type: 'template',
      name: parts[1] || '',
      path: parts.slice(2),
      raw: address,
    };
  }

  if (firstPart === 'layer') {
    return {
      type: 'layer',
      name: parts[1] || '',
      path: parts.slice(2),
      raw: address,
    };
  }

  if (firstPart === 'data') {
    return {
      type: 'data',
      name: parts[1] || 'current',
      path: parts.slice(2),
      raw: address,
    };
  }

  if (firstPart === 'state') {
    return {
      type: 'state',
      name: parts[1] || '',
      path: parts.slice(2),
      raw: address,
    };
  }

  // Default: element address
  return {
    type: 'element',
    name: parts[0],
    path: parts.slice(1),
    raw: address,
  };
}

/**
 * Resolve an address to get the actual value from the store
 */
export function resolveAddress(address: string): unknown {
  const parsed = parseAddress(address);
  if (!parsed) {
    console.warn(`[Address] Invalid address format: ${address}`);
    return undefined;
  }

  const store = useDesignerStore.getState();

  switch (parsed.type) {
    case 'element': {
      // Find element by name (case-insensitive, with sanitization)
      const normalizedName = parsed.name.toLowerCase().replace(/_/g, ' ');
      const element = store.elements.find(
        e => e.name.toLowerCase() === normalizedName ||
             sanitizeName(e.name).toLowerCase() === parsed.name.toLowerCase()
      );
      if (!element) {
        console.warn(`[Address] Element not found: ${parsed.name}`);
        return undefined;
      }
      return getNestedValue(element, parsed.path);
    }

    case 'template': {
      const normalizedName = parsed.name.toLowerCase().replace(/_/g, ' ');
      const template = store.templates.find(
        t => t.name.toLowerCase() === normalizedName ||
             sanitizeName(t.name).toLowerCase() === parsed.name.toLowerCase()
      );
      if (!template) {
        console.warn(`[Address] Template not found: ${parsed.name}`);
        return undefined;
      }
      return getNestedValue(template, parsed.path);
    }

    case 'layer': {
      const normalizedName = parsed.name.toLowerCase().replace(/_/g, ' ');
      const layer = store.layers.find(
        l => l.name.toLowerCase() === normalizedName ||
             sanitizeName(l.name).toLowerCase() === parsed.name.toLowerCase()
      );
      if (!layer) {
        console.warn(`[Address] Layer not found: ${parsed.name}`);
        return undefined;
      }
      return getNestedValue(layer, parsed.path);
    }

    case 'data': {
      const dataPayload = store.dataPayload;
      const currentIndex = store.currentRecordIndex;

      if (!dataPayload || dataPayload.length === 0) {
        return undefined;
      }

      if (parsed.name === 'current' || parsed.name === '') {
        const currentRecord = dataPayload[currentIndex];
        if (parsed.path.length === 0) {
          return currentRecord;
        }
        return getNestedValue(currentRecord, parsed.path);
      }

      // Named data source - look up from cache
      const cached = store.templateDataCache[parsed.name];
      if (cached) {
        const record = cached.dataPayload[cached.currentRecordIndex];
        return getNestedValue(record, parsed.path);
      }

      return undefined;
    }

    case 'state': {
      // State is handled by the interactive runtime
      // Return a placeholder that indicates this is a state reference
      return `{{state.${parsed.name}}}`;
    }

    default:
      return undefined;
  }
}

/**
 * Set a value at an address
 */
export function setAddressValue(address: string, value: unknown): boolean {
  console.log('[Address] setAddressValue called:', { address, value });

  const parsed = parseAddress(address);
  console.log('[Address] Parsed address:', parsed);

  if (!parsed) {
    console.warn(`[Address] Invalid address format: ${address}`);
    return false;
  }

  const store = useDesignerStore.getState();

  switch (parsed.type) {
    case 'element': {
      const normalizedName = parsed.name.toLowerCase().replace(/_/g, ' ');
      const element = store.elements.find(
        e => e.name.toLowerCase() === normalizedName ||
             sanitizeName(e.name).toLowerCase() === parsed.name.toLowerCase()
      );
      if (!element) {
        console.warn(`[Address] Element not found: ${parsed.name}`);
        return false;
      }

      // Build the update object from the path
      const update = buildNestedUpdate(parsed.path, value);
      store.updateElement(element.id, update);
      return true;
    }

    case 'template': {
      // Handle setting template data index
      // @template.TemplateName.dataIndex = 5 (set to specific index)
      // @template.TemplateName.data = "RecordName" (find by display field value)
      console.log('[Address] Template case - parsed:', {
        name: parsed.name,
        path: parsed.path,
        pathLength: parsed.path.length
      });

      if (parsed.path.length > 0 && (parsed.path[0] === 'dataIndex' || parsed.path[0] === 'data')) {
        const normalizedName = parsed.name.toLowerCase().replace(/_/g, ' ');
        console.log('[Address] Looking for template:', {
          normalizedName,
          sanitizedParsedName: parsed.name.toLowerCase(),
          availableTemplates: store.templates.map(t => ({ id: t.id, name: t.name }))
        });

        const template = store.templates.find(
          t => t.name?.toLowerCase() === normalizedName ||
               sanitizeName(t.name || '').toLowerCase() === parsed.name.toLowerCase()
        );

        if (!template) {
          console.warn(`[Address] Template not found: ${parsed.name}`);
          return false;
        }

        console.log('[Address] Found template:', {
          templateId: template.id,
          currentTemplateId: store.currentTemplateId,
          isCurrentTemplate: template.id === store.currentTemplateId
        });

        // Get the data for this template (either current or from cache)
        const isCurrentTemplate = template.id === store.currentTemplateId;
        let dataPayload: Record<string, unknown>[] | null = null;
        let displayField: string | null = null;

        if (isCurrentTemplate) {
          dataPayload = store.dataPayload;
          displayField = store.dataDisplayField;
        } else {
          // Look up from template data cache for non-current templates
          const cached = store.templateDataCache?.[template.id];
          if (cached) {
            dataPayload = cached.dataPayload;
            displayField = cached.dataDisplayField;
          }
        }

        console.log('[Address] Data context:', {
          isCurrentTemplate,
          hasDataPayload: !!dataPayload,
          displayField,
          dataPayloadLength: dataPayload?.length
        });

        // Helper to set record index
        const setRecordIndex = (index: number) => {
          if (isCurrentTemplate) {
            store.setCurrentRecordIndex(index);
          } else {
            // Update the cache for non-current templates
            const cached = store.templateDataCache?.[template.id];
            if (cached) {
              useDesignerStore.setState({
                templateDataCache: {
                  ...store.templateDataCache,
                  [template.id]: {
                    ...cached,
                    currentRecordIndex: index
                  }
                }
              });
            }
          }
        };

        if (parsed.path[0] === 'dataIndex' && typeof value === 'number') {
          // Direct index setting
          if (dataPayload) {
            setRecordIndex(value);
            console.log(`[Address] Set data index to ${value}`);
            return true;
          }
        } else if (parsed.path[0] === 'data') {
          // Find record by display field value
          console.log('[Address] Finding record by display field:', {
            displayField,
            value,
            dataPayloadLength: dataPayload?.length,
            dataPayload: dataPayload?.slice(0, 3) // First 3 for debugging
          });

          if (dataPayload && displayField) {
            const targetIndex = dataPayload.findIndex(record => {
              const fieldValue = getNestedValue(record, displayField.split('.'));
              console.log('[Address] Comparing:', { fieldValue, value, match: String(fieldValue).toLowerCase() === String(value).toLowerCase() });
              return String(fieldValue).toLowerCase() === String(value).toLowerCase();
            });

            if (targetIndex >= 0) {
              setRecordIndex(targetIndex);
              console.log(`[Address] Set data to record "${value}" (index ${targetIndex})`);
              return true;
            } else {
              console.warn(`[Address] Record not found with value: ${value}`);
              return false;
            }
          } else {
            console.warn('[Address] No dataPayload or displayField available');
            return false;
          }
        }
      }

      console.warn(`[Address] Setting template property "${parsed.path.join('.')}" not supported`);
      return false;
    }

    // Add more setters as needed for layers, etc.
    default:
      console.warn(`[Address] Setting ${parsed.type} values not yet supported`);
      return false;
  }
}

/**
 * Get a nested value from an object using a path array
 */
function getNestedValue(obj: unknown, path: string[]): unknown {
  if (path.length === 0) {
    return obj;
  }

  let current = obj as Record<string, unknown>;
  for (const key of path) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key] as Record<string, unknown>;
  }
  return current;
}

/**
 * Build a nested update object from a path and value
 * e.g., ['content', 'text'], 'Hello' => { content: { text: 'Hello' } }
 */
function buildNestedUpdate(path: string[], value: unknown): Record<string, unknown> {
  if (path.length === 0) {
    return value as Record<string, unknown>;
  }

  if (path.length === 1) {
    return { [path[0]]: value };
  }

  const result: Record<string, unknown> = {};
  let current = result;

  for (let i = 0; i < path.length - 1; i++) {
    current[path[i]] = {};
    current = current[path[i]] as Record<string, unknown>;
  }

  current[path[path.length - 1]] = value;
  return result;
}

/**
 * Common element properties that can be addressed
 */
export const ELEMENT_PROPERTIES = [
  // Position & Size
  { path: 'position_x', label: 'X Position', type: 'number' },
  { path: 'position_y', label: 'Y Position', type: 'number' },
  { path: 'width', label: 'Width', type: 'number' },
  { path: 'height', label: 'Height', type: 'number' },
  { path: 'rotation', label: 'Rotation', type: 'number' },
  { path: 'scale_x', label: 'Scale X', type: 'number' },
  { path: 'scale_y', label: 'Scale Y', type: 'number' },

  // Appearance
  { path: 'opacity', label: 'Opacity', type: 'number' },
  { path: 'visible', label: 'Visible', type: 'boolean' },

  // Content (varies by element type)
  { path: 'content.text', label: 'Text Content', type: 'string' },
  { path: 'content.src', label: 'Image Source', type: 'string' },
  { path: 'content.url', label: 'Video URL', type: 'string' },

  // Styles
  { path: 'styles.backgroundColor', label: 'Background Color', type: 'color' },
  { path: 'styles.color', label: 'Text Color', type: 'color' },
  { path: 'styles.borderColor', label: 'Border Color', type: 'color' },
  { path: 'styles.borderWidth', label: 'Border Width', type: 'string' },
  { path: 'styles.borderRadius', label: 'Border Radius', type: 'string' },
  { path: 'styles.fontSize', label: 'Font Size', type: 'string' },
  { path: 'styles.fontWeight', label: 'Font Weight', type: 'string' },
  { path: 'styles.fontFamily', label: 'Font Family', type: 'string' },
];

/**
 * Available actions for scripting
 */
export const AVAILABLE_ACTIONS = [
  { name: 'playIn', params: ['templateName', 'layerName'], description: 'Play template IN animation' },
  { name: 'playOut', params: ['layerName'], description: 'Play layer OUT animation' },
  { name: 'setState', params: ['key', 'value'], description: 'Set a state variable' },
  { name: 'navigate', params: ['templateName'], description: 'Navigate to a template' },
  { name: 'showElement', params: ['elementName'], description: 'Show an element' },
  { name: 'hideElement', params: ['elementName'], description: 'Hide an element' },
  { name: 'toggleElement', params: ['elementName'], description: 'Toggle element visibility' },
  { name: 'log', params: ['message'], description: 'Log a message to console' },
  { name: 'delay', params: ['ms'], description: 'Wait for specified milliseconds' },
];

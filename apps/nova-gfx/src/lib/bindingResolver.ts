/**
 * Binding Resolution Utilities
 * Applies data bindings to element content at runtime
 */

import type { Element, Binding } from '@emergent-platform/types';
import { getNestedValue } from '@/data/sampleDataSources';

/**
 * Check if an element should be hidden based on binding options and current data
 */
export function shouldHideElement(
  elementId: string,
  bindings: Binding[],
  currentRecord: Record<string, unknown> | null
): boolean {
  // Find binding for this element
  const binding = bindings.find((b) => b.element_id === elementId);
  if (!binding) return false;

  const options = binding.formatter_options as { hideOnZero?: boolean; hideOnNull?: boolean } | null;
  if (!options) return false;

  // Get raw value from data
  const rawValue = currentRecord ? getNestedValue(currentRecord, binding.binding_key) : undefined;

  // Check hideOnNull - hides when value is null, undefined, or empty string
  if (options.hideOnNull) {
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return true;
    }
  }

  // Check hideOnZero - hides when value is exactly 0
  if (options.hideOnZero) {
    if (rawValue === 0) {
      return true;
    }
  }

  return false;
}

/**
 * Apply bindings to an element's content based on the current data record
 */
export function resolveElementBindings(
  element: Element,
  bindings: Binding[],
  currentRecord: Record<string, unknown> | null
): Element {
  if (!currentRecord) return element;

  // Find binding for this element
  const binding = bindings.find((b) => b.element_id === element.id);
  if (!binding) return element;

  // Get value from data using binding key (supports dot notation)
  const rawValue = getNestedValue(currentRecord, binding.binding_key);
  if (rawValue === undefined) return element;

  // Apply formatter if specified
  const formattedValue = applyFormatter(rawValue, binding.formatter, binding.formatter_options);

  // Apply to target property
  const updatedElement = applyToProperty(element, binding.target_property, formattedValue);

  return updatedElement;
}

/**
 * Apply formatter to a value
 */
function applyFormatter(
  value: unknown,
  formatter: string | null,
  options: Record<string, unknown> | null
): unknown {
  let result = value;

  // Apply specific formatter first
  if (formatter) {
    switch (formatter) {
      case 'number':
        if (typeof value === 'number') {
          const locale = (options?.locale as string) || 'en-US';
          result = value.toLocaleString(locale);
        }
        break;

      case 'currency':
        if (typeof value === 'number') {
          const locale = (options?.locale as string) || 'en-US';
          const currency = (options?.currency as string) || 'USD';
          result = value.toLocaleString(locale, { style: 'currency', currency });
        }
        break;

      case 'percentage':
        if (typeof value === 'number') {
          const decimals = (options?.decimals as number) || 1;
          result = `${value.toFixed(decimals)}%`;
        }
        break;

      case 'uppercase':
        result = typeof value === 'string' ? value.toUpperCase() : value;
        break;

      case 'lowercase':
        result = typeof value === 'string' ? value.toLowerCase() : value;
        break;

      case 'capitalize':
        if (typeof value === 'string') {
          result = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        }
        break;

      case 'truncate':
        if (typeof value === 'string') {
          const maxLength = (options?.maxLength as number) || 50;
          const truncateSuffix = (options?.truncateSuffix as string) || '...';
          if (value.length > maxLength) {
            result = value.slice(0, maxLength - truncateSuffix.length) + truncateSuffix;
          }
        }
        break;
    }
  }

  // Apply prefix/suffix from formatter_options (always, regardless of formatter)
  if (options) {
    const prefix = options.prefix as string | undefined;
    const suffix = options.suffix as string | undefined;

    if (prefix || suffix) {
      result = `${prefix || ''}${result}${suffix || ''}`;
    }
  }

  return result;
}

/**
 * Apply a value to a nested property path on an element
 */
function applyToProperty(
  element: Element,
  propertyPath: string,
  value: unknown
): Element {
  // Deep clone the element
  const newElement = JSON.parse(JSON.stringify(element)) as Element;

  // Parse the property path (e.g., "content.text", "styles.color")
  const parts = propertyPath.split('.');

  // Navigate to the parent of the target property
  let current: Record<string, unknown> = newElement as unknown as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  // Set the final property
  const finalKey = parts[parts.length - 1];
  current[finalKey] = value;

  return newElement;
}

/**
 * Get the bound value for display purposes (without modifying the element)
 */
export function getBoundValue(
  binding: Binding,
  currentRecord: Record<string, unknown> | null
): unknown {
  if (!currentRecord) return binding.default_value;

  const rawValue = getNestedValue(currentRecord, binding.binding_key);
  if (rawValue === undefined) return binding.default_value;

  return applyFormatter(rawValue, binding.formatter, binding.formatter_options);
}

/**
 * Determine the target property based on element type
 */
export function getDefaultTargetProperty(elementType: string): string {
  switch (elementType) {
    case 'text':
      return 'content.text';
    case 'image':
      return 'content.src';
    default:
      return 'content.text';
  }
}

/**
 * Infer binding type from field value
 */
export function inferBindingType(value: unknown): 'text' | 'number' | 'boolean' | 'image' | 'color' {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') {
    // Check if it looks like a URL (for images)
    if (value.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)/i)) {
      return 'image';
    }
    // Check if it looks like a color
    if (value.match(/^#[0-9A-Fa-f]{3,8}$/) || value.match(/^(rgb|hsl)a?\(/)) {
      return 'color';
    }
  }
  return 'text';
}

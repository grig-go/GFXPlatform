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

  // Fix: For icon elements, automatically correct wrong target_property
  // Old bindings may have 'content.text' or 'content.src' instead of 'content.iconName'
  let targetProperty = binding.target_property;
  if (element.content?.type === 'icon' &&
      (targetProperty === 'content.text' || targetProperty === 'content.src')) {
    targetProperty = 'content.iconName';
  }

  // Apply to target property
  const updatedElement = applyToProperty(element, targetProperty, formattedValue);

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

  // Apply specific formatter first (legacy formatter field)
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

  // Apply new formatter_options from settings modal
  if (options) {
    // Number formatting
    if (typeof result === 'number') {
      result = formatNumber(result, options);
    }

    // Date formatting
    if (options.dateFormat && options.dateFormat !== 'none') {
      result = formatDate(result, options);
    }

    // Text case formatting
    if (typeof result === 'string' && options.textCase && options.textCase !== 'none') {
      result = formatTextCase(result, options.textCase as string);
    }

    // Apply character trimming (works on strings, converts numbers to string first)
    const trimStart = options.trimStart as number | undefined;
    const trimEnd = options.trimEnd as number | undefined;
    if ((trimStart && trimStart > 0) || (trimEnd && trimEnd > 0)) {
      const str = String(result);
      const startIdx = trimStart && trimStart > 0 ? trimStart : 0;
      const endIdx = trimEnd && trimEnd > 0 ? str.length - trimEnd : str.length;
      result = str.slice(startIdx, Math.max(startIdx, endIdx));
    }

    // Apply prefix/suffix (always last)
    const prefix = options.prefix as string | undefined;
    const suffix = options.suffix as string | undefined;

    if (prefix || suffix) {
      result = `${prefix || ''}${result}${suffix || ''}`;
    }
  }

  return result;
}

/**
 * Format a number with the specified options
 */
function formatNumber(value: number, options: Record<string, unknown>): string | number {
  let num = value;

  // Apply rounding first
  const roundTo = options.roundTo as string | undefined;
  if (roundTo && roundTo !== 'none') {
    const roundValue = parseInt(roundTo, 10);
    if (!isNaN(roundValue) && roundValue > 0) {
      num = Math.round(num / roundValue) * roundValue;
    }
  }

  // Handle decimals
  const decimals = options.decimals as number | undefined;
  const decimalSeparator = (options.decimalSeparator as '.' | ',') || '.';

  // Format the number
  const numberFormat = options.numberFormat as string | undefined;
  let formatted: string;

  if (numberFormat === 'compact') {
    // Compact format (1K, 1M, etc.)
    formatted = formatCompactNumber(num);
  } else {
    // Apply decimal places
    // decimals: -1 = whole/trim (just remove decimals), 0 = round to whole, >0 = specific decimal places
    if (decimals === -1) {
      // Trim: just take the integer part without rounding
      num = Math.trunc(num);
    } else if (decimals !== undefined && decimals >= 0) {
      num = Number(num.toFixed(decimals));
    }

    // Format with thousands separator
    const parts = num.toString().split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1] || '';

    if (numberFormat === 'comma') {
      integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } else if (numberFormat === 'space') {
      integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    // Rebuild number with correct decimal separator
    if (decimals === -1) {
      // Whole/trim: no decimals
      formatted = integerPart;
    } else if (decimals !== undefined && decimals > 0) {
      const paddedDecimal = decimalPart.padEnd(decimals, '0');
      formatted = `${integerPart}${decimalSeparator}${paddedDecimal}`;
    } else if (decimalPart) {
      formatted = `${integerPart}${decimalSeparator}${decimalPart}`;
    } else {
      formatted = integerPart;
    }
  }

  // Pad with zeros
  const padZeros = options.padZeros as number | undefined;
  if (padZeros && padZeros > 0) {
    const parts = formatted.split(decimalSeparator);
    parts[0] = parts[0].padStart(padZeros, '0');
    formatted = parts.join(decimalSeparator);
  }

  // Show + sign for positive numbers
  if (options.showSign && num > 0) {
    formatted = '+' + formatted;
  }

  return formatted;
}

/**
 * Format a number in compact notation (1K, 1M, etc.)
 */
function formatCompactNumber(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1e9) {
    return sign + (absValue / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (absValue >= 1e6) {
    return sign + (absValue / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (absValue >= 1e3) {
    return sign + (absValue / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return sign + absValue.toString();
}

/**
 * Format a date with the specified options
 */
function formatDate(value: unknown, options: Record<string, unknown>): string {
  // Try to parse as date
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string' || typeof value === 'number') {
    date = new Date(value);
    if (isNaN(date.getTime())) {
      return String(value); // Return original if not a valid date
    }
  } else {
    return String(value);
  }

  const dateFormat = options.dateFormat as string;
  const timeFormat = options.timeFormat as string | undefined;
  const showSeconds = options.showSeconds as boolean | undefined;

  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const dayOfWeek = date.getDay();

  const pad = (n: number) => n.toString().padStart(2, '0');

  let formatted: string;

  switch (dateFormat) {
    case 'dd-mm-yyyy':
      formatted = `${pad(day)}-${pad(month + 1)}-${year}`;
      break;
    case 'mm-dd-yyyy':
      formatted = `${pad(month + 1)}-${pad(day)}-${year}`;
      break;
    case 'yyyy-mm-dd':
      formatted = `${year}-${pad(month + 1)}-${pad(day)}`;
      break;
    case 'written-full':
      formatted = `${months[month]} ${day}, ${year}`;
      break;
    case 'written-short':
      formatted = `${monthsShort[month]} ${day}, ${year}`;
      break;
    case 'day-month-year':
      formatted = `${day} ${months[month]} ${year}`;
      break;
    case 'month-day-year':
      formatted = `${months[month]} ${day}, ${year}`;
      break;
    case 'day-month':
      formatted = `${day} ${months[month]}`;
      break;
    case 'month-year':
      formatted = `${months[month]} ${year}`;
      break;
    case 'weekday-only':
      formatted = weekdays[dayOfWeek];
      break;
    case 'day-only':
      formatted = day.toString();
      break;
    case 'month-only':
      formatted = months[month];
      break;
    case 'year-only':
      formatted = year.toString();
      break;
    case 'relative':
      formatted = getRelativeTime(date);
      break;
    default:
      formatted = date.toLocaleDateString();
  }

  // Add time if specified
  if (timeFormat && timeFormat !== 'none') {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    let timeStr: string;
    if (timeFormat === '12h') {
      const h = hours % 12 || 12;
      const ampm = hours < 12 ? 'AM' : 'PM';
      timeStr = showSeconds
        ? `${h}:${pad(minutes)}:${pad(seconds)} ${ampm}`
        : `${h}:${pad(minutes)} ${ampm}`;
    } else {
      timeStr = showSeconds
        ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
        : `${pad(hours)}:${pad(minutes)}`;
    }

    formatted = `${formatted} ${timeStr}`;
  }

  return formatted;
}

/**
 * Get relative time string (e.g., "2 days ago")
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  if (diffWeek < 4) return `${diffWeek} week${diffWeek !== 1 ? 's' : ''} ago`;
  if (diffMonth < 12) return `${diffMonth} month${diffMonth !== 1 ? 's' : ''} ago`;
  return `${diffYear} year${diffYear !== 1 ? 's' : ''} ago`;
}

/**
 * Format text case
 */
function formatTextCase(value: string, textCase: string): string {
  switch (textCase) {
    case 'uppercase':
      return value.toUpperCase();
    case 'lowercase':
      return value.toLowerCase();
    case 'capitalize':
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    case 'titlecase':
      return value.replace(/\w\S*/g, (txt) =>
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    default:
      return value;
  }
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
    case 'icon':
      return 'content.iconName';
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

/**
 * Data binding utility functions
 *
 * These utilities are used for extracting fields from dynamic data
 * and resolving nested values using dot notation paths.
 *
 * NOTE: Data sources are now fetched dynamically from Nova endpoints.
 * See services/novaEndpointService.ts for endpoint fetching.
 */

// Helper to get nested value from object using dot notation and array index access
// Supports paths like "location.name", "forecast[0].day", "weather.temperature.value"
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  // Parse path to handle both dot notation and array indices
  // e.g., "forecast[0].day" becomes ["forecast", "0", "day"]
  const parts = path.split(/\.|\[|\]/).filter(Boolean);

  return parts.reduce((acc: unknown, part) => {
    if (acc === null || acc === undefined) return undefined;

    // Check if part is a numeric index
    const index = parseInt(part, 10);
    if (!isNaN(index) && Array.isArray(acc)) {
      return acc[index];
    }

    if (typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }

    return undefined;
  }, obj);
}

// Only exclude exact 'id' field names (case variations)
function shouldExcludeField(fieldName: string): boolean {
  // Only exclude exact matches for 'id' - not fields that contain 'id' as part of the name
  const exactIdMatches = ['id', 'Id', 'ID', '_id'];
  return exactIdMatches.includes(fieldName);
}

// Extract field names from first record of data
// Dynamically handles any JSON structure including deeply nested objects and arrays
export function extractFieldsFromData(data: Record<string, unknown>[]): { path: string; type: string; sample: unknown }[] {
  if (!data || data.length === 0) return [];

  const fields: { path: string; type: string; sample: unknown }[] = [];
  const seenPaths = new Set<string>();

  function extractFields(obj: unknown, prefix = '', arrayDepth = 0, maxArrayItems = 3, maxArrayDepth = 3): void {
    if (obj === null || obj === undefined) return;

    // Prevent infinite recursion on deeply nested arrays
    if (arrayDepth > maxArrayDepth) return;

    if (Array.isArray(obj)) {
      // For arrays, extract fields from the first few items with indexed access
      const arrayLength = Math.min(obj.length, maxArrayItems);
      for (let i = 0; i < arrayLength; i++) {
        const item = obj[i];
        const indexedPath = `${prefix}[${i}]`;

        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          // Object inside array - extract its fields
          for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
            if (shouldExcludeField(key)) continue;

            const fieldPath = `${indexedPath}.${key}`;

            if (value !== null && typeof value === 'object') {
              // Recurse into nested objects/arrays
              extractFields(value, fieldPath, Array.isArray(value) ? arrayDepth + 1 : arrayDepth, maxArrayItems, maxArrayDepth);
            } else {
              // Primitive value
              if (!seenPaths.has(fieldPath)) {
                seenPaths.add(fieldPath);
                fields.push({
                  path: fieldPath,
                  type: value === null ? 'null' : typeof value,
                  sample: value,
                });
              }
            }
          }
        } else if (Array.isArray(item)) {
          // Array of arrays - recurse
          extractFields(item, indexedPath, arrayDepth + 1, maxArrayItems, maxArrayDepth);
        } else if (item !== null && typeof item !== 'object') {
          // Primitive array items (like string[] or number[])
          if (!seenPaths.has(indexedPath)) {
            seenPaths.add(indexedPath);
            fields.push({
              path: indexedPath,
              type: typeof item,
              sample: item,
            });
          }
        }
      }
    } else if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (shouldExcludeField(key)) continue;

        const path = prefix ? `${prefix}.${key}` : key;

        if (value !== null && typeof value === 'object') {
          // Recurse into nested objects/arrays
          extractFields(value, path, Array.isArray(value) ? arrayDepth + 1 : arrayDepth, maxArrayItems, maxArrayDepth);
        } else {
          // Primitive value
          if (!seenPaths.has(path)) {
            seenPaths.add(path);
            fields.push({
              path,
              type: value === null ? 'null' : typeof value,
              sample: value,
            });
          }
        }
      }
    }
  }

  extractFields(data[0]);
  return fields;
}

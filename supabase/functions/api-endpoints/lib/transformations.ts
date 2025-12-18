// Transformation pipeline logic
import type { TransformConfig } from "../types.ts";
import { aiTransform } from "./ai-transform.ts";

export async function applyTransformationPipeline(
  data: any,
  transformConfig: TransformConfig,
  supabase: any
): Promise<any> {
  if (!transformConfig?.transformations || transformConfig.transformations.length === 0) {
    return data;
  }

  let result = data;
  
  for (const transformation of transformConfig.transformations) {
    try {
      console.log(`Applying transformation: ${transformation.type}`);
      result = await applyTransformation(result, transformation, supabase);
    } catch (error) {
      console.error(`Transformation ${transformation.type} failed:`, error);
      console.warn("Continuing with partial transformation result");
    }
  }
  
  return result;
}

async function applyTransformation(
  data: any,
  transformation: any,
  supabase: any
): Promise<any> {
  const { type, config = {} } = transformation;
  
  switch (type) {
    case "ai-transform":
      return await aiTransform(data, config, transformation, supabase);
      
    case "filter":
      if (!Array.isArray(data)) return data;
      return data.filter((item) => {
        const value = getValueFromPath(item, config.field);
        return evaluateCondition(value, config.operator, config.value);
      });
      
    case "sort":
      if (!Array.isArray(data)) return data;
      return [...data].sort((a, b) => {
        const aVal = getValueFromPath(a, config.field);
        const bVal = getValueFromPath(b, config.field);
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return config.order === "desc" ? -comparison : comparison;
      });
      
    case "map":
      if (!Array.isArray(data)) return data;
      return data.map((item) => {
        let result = {};
        for (const [targetField, sourceField] of Object.entries(config.mappings || {})) {
          result = setValueAtPath(result, targetField, getValueFromPath(item, sourceField));
        }
        return result;
      });
      
    case "limit":
      if (!Array.isArray(data)) return data;
      return data.slice(0, config.limit || 10);
      
    case "uppercase":
    case "lowercase":
    case "capitalize":
    case "trim":
      return applyStringTransformation(data, type, config);

    case "substring":
      return applySubstring(data, config);

    case "replace":
      return applyReplace(data, config);

    case "regex-extract":
      return applyRegexExtract(data, config);

    case "string-format":
      return applyStringFormat(data, config);

    case "split":
      return applySplit(data, config);

    case "join":
      return applyJoin(data, config);

    case "parse-number":
      return applyParseNumber(data, config);

    case "length":
      return applyLength(data, config);

    case "round":
    case "floor":
    case "ceil":
    case "abs":
      return applyMathTransform(data, type, config);

    case "math-operation":
      return applyMathOperation(data, config);

    case "to-string":
      return applyToString(data, config);

    case "format-number":
      return applyFormatNumber(data, config);

    case "currency":
      return applyCurrency(data, config);

    case "date-format":
      return applyDateFormat(data, config);

    case "relative-time":
      return applyRelativeTime(data, config);

    case "timestamp":
      return applyTimestamp(data, config);

    case "day-of-week":
    case "month":
    case "year":
      return applyDateExtraction(data, type, config);

    case "invert":
      return applyInvert(data, config);

    case "yes-no":
      return applyYesNo(data, config);

    case "custom-boolean":
      return applyCustomBoolean(data, config);

    case "to-number":
      return applyToNumber(data, config);

    case "first":
      return applyFirst(data, config);

    case "last":
      return applyLast(data, config);

    case "count":
      return applyCount(data, config);

    case "sum":
      return applySum(data, config);

    case "average":
      return applyAverage(data, config);

    case "min":
      return applyMin(data, config);

    case "max":
      return applyMax(data, config);

    case "unique":
      return applyUnique(data, config);

    case "is-empty":
      return applyIsEmpty(data, config);

    case "contains":
      return applyContains(data, config);

    case "is-positive":
      return applyIsPositive(data, config);

    case "is-zero":
      return applyIsZero(data, config);

    case "direct":
      // Direct copy - return as-is
      return data;

    case "custom-aggregate":
      return applyCustomAggregate(data, config);

    case "script":
      return applyScriptTransform(data, config);

    default:
      console.warn(`Unknown transformation type: ${type}`);
      return data;
  }
}

/**
 * Apply a custom JavaScript script transformation
 * Scripts run in a restricted environment using Function constructor
 */
function applyScriptTransform(data: any, config: any): any {
  const { script, applyTo = 'item', timeout = 5000 } = config;

  if (!script) {
    console.warn("No script provided for script transformation");
    return data;
  }

  console.log(`Applying script transformation (applyTo: ${applyTo})`);

  try {
    if (applyTo === 'array') {
      // Apply script to entire array
      const fn = new Function('data', script);
      const result = fn(data);
      console.log("Script transformation (array mode) completed");
      return result;
    } else {
      // Apply script to each item in array
      if (!Array.isArray(data)) {
        // Single item - wrap and unwrap
        const fn = new Function('item', script);
        const result = fn(data);
        console.log("Script transformation (single item) completed");
        return result;
      }

      // Map over array items
      const fn = new Function('item', script);
      const result = data.map((item, index) => {
        try {
          return fn(item);
        } catch (itemError: any) {
          console.error(`Script error on item ${index}:`, itemError.message);
          return item; // Return original item on error
        }
      });

      console.log(`Script transformation completed for ${result.length} items`);
      return result;
    }
  } catch (error: any) {
    console.error("Script transformation failed:", error.message);
    // Return original data on script error
    return data;
  }
}

/**
 * Custom aggregate transformations for complex data operations
 */
function applyCustomAggregate(data: any, config: any): any {
  const { aggregateType } = config;

  switch (aggregateType) {
    case "election-chart":
      return aggregateElectionData(data, config);

    case "custom-script":
      // For security, custom scripts are disabled in edge functions
      console.warn("Custom scripts are not supported in edge functions");
      return data;

    default:
      console.warn(`Unknown aggregate type: ${aggregateType}`);
      return data;
  }
}

/**
 * Transform election data into chart-friendly format
 */
function aggregateElectionData(data: any, options: any): any {
  try {
    if (Array.isArray(data)) {
      return data.map(race => aggregateSingleRace(race, options));
    }
    return aggregateSingleRace(data, options);
  } catch (error) {
    console.error("Election data aggregation error:", error);
    return data;
  }
}

/**
 * Process a single election race
 */
function aggregateSingleRace(race: any, options: any): any {
  const {
    candidatesPath = "candidates",
    resultsPath = "results.candidateResults",
    labelField = "lastName",
    valueField = "pctVotes",
    sortBy = "percentage",
    sortOrder = "desc",
    includeVotes = false,
    includeWinner = false,
    includeRawData = false,
    roundPercentages = false
  } = options;

  // Extract candidates and results using the helper function
  const candidates = getValueFromPath(race, candidatesPath);
  const results = getValueFromPath(race, resultsPath);

  if (!Array.isArray(candidates) || !Array.isArray(results)) {
    console.warn("Candidates or results not found as arrays");
    return race;
  }

  // Create a map of candidateId to candidate info
  const candidateMap = new Map();
  candidates.forEach((candidate: any) => {
    const id = candidate._id || candidate.id || candidate.apId;
    candidateMap.set(id, candidate);
  });

  // Join results with candidate info
  const combined = results.map((result: any) => {
    const candidateId = result.candidateId || result.candidate_id;
    const candidate = candidateMap.get(candidateId);

    return {
      label: candidate ? getNestedValue(candidate, labelField) : "Unknown",
      percentage: getNestedValue(result, valueField) || 0,
      votes: result.votes || 0,
      isWinner: result.isWinner || false,
      candidate: candidate,
      result: result
    };
  });

  // Sort the data
  if (sortBy === "percentage" || sortBy === "votes") {
    combined.sort((a: any, b: any) => {
      const aVal = sortBy === "percentage" ? a.percentage : a.votes;
      const bVal = sortBy === "percentage" ? b.percentage : b.votes;
      return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
    });
  }

  // Extract parallel arrays
  const output: any = {
    label: combined.map((item: any) => item.label),
    percentage: combined.map((item: any) =>
      roundPercentages ? Math.round(item.percentage) : item.percentage
    )
  };

  // Optional fields
  if (includeVotes) {
    output.votes = combined.map((item: any) => item.votes);
  }
  if (includeWinner) {
    output.isWinner = combined.map((item: any) => item.isWinner);
  }
  if (includeRawData) {
    output._raw = combined;
  }

  return output;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((current: any, key: string) => {
    return current?.[key];
  }, obj);
}

// ============================================
// String Transformations
// ============================================

function applySubstring(data: any, config: any): any {
  const { start = 0, length } = config;
  const transform = (str: string) => {
    if (length !== undefined) {
      return str.substring(start, start + length);
    }
    return str.substring(start);
  };
  return applyToField(data, config, transform, "string");
}

function applyReplace(data: any, config: any): any {
  const { find = "", replace = "", replaceAll = true } = config;
  const transform = (str: string) => {
    if (replaceAll) {
      return str.split(find).join(replace);
    }
    return str.replace(find, replace);
  };
  return applyToField(data, config, transform, "string");
}

function applyRegexExtract(data: any, config: any): any {
  const { pattern = "", group = 0, flags = "" } = config;
  const transform = (str: string) => {
    try {
      const regex = new RegExp(pattern, flags);
      const match = str.match(regex);
      if (match) {
        return group > 0 && match[group] ? match[group] : match[0];
      }
      return "";
    } catch {
      return str;
    }
  };
  return applyToField(data, config, transform, "string");
}

function applyStringFormat(data: any, config: any): any {
  const { template = "{{value}}" } = config;
  const transform = (value: any) => {
    return template.replace(/\{\{value\}\}/g, String(value));
  };
  return applyToField(data, config, transform, "any");
}

function applySplit(data: any, config: any): any {
  const { delimiter = ",", limit } = config;
  const transform = (str: string) => {
    if (limit !== undefined) {
      return str.split(delimiter, limit);
    }
    return str.split(delimiter);
  };
  return applyToField(data, config, transform, "string");
}

function applyJoin(data: any, config: any): any {
  const { delimiter = "," } = config;
  const transform = (arr: any[]) => {
    if (Array.isArray(arr)) {
      return arr.join(delimiter);
    }
    return String(arr);
  };
  return applyToField(data, config, transform, "array");
}

// ============================================
// Number Transformations
// ============================================

function applyParseNumber(data: any, config: any): any {
  const transform = (str: string) => {
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };
  return applyToField(data, config, transform, "string");
}

function applyLength(data: any, config: any): any {
  const transform = (str: string) => {
    return String(str).length;
  };
  return applyToField(data, config, transform, "string");
}

function applyMathTransform(data: any, type: string, config: any): any {
  const { precision = 0 } = config;
  const transform = (num: number) => {
    const n = Number(num);
    if (isNaN(n)) return num;
    switch (type) {
      case "round":
        const factor = Math.pow(10, precision);
        return Math.round(n * factor) / factor;
      case "floor":
        return Math.floor(n);
      case "ceil":
        return Math.ceil(n);
      case "abs":
        return Math.abs(n);
      default:
        return n;
    }
  };
  return applyToField(data, config, transform, "number");
}

function applyMathOperation(data: any, config: any): any {
  const { operation = "add", operand = 0 } = config;
  const transform = (num: number) => {
    const n = Number(num);
    const op = Number(operand);
    if (isNaN(n)) return num;
    switch (operation) {
      case "add":
        return n + op;
      case "subtract":
        return n - op;
      case "multiply":
        return n * op;
      case "divide":
        return op !== 0 ? n / op : n;
      default:
        return n;
    }
  };
  return applyToField(data, config, transform, "number");
}

function applyToString(data: any, config: any): any {
  const transform = (value: any) => String(value);
  return applyToField(data, config, transform, "any");
}

function applyFormatNumber(data: any, config: any): any {
  const { locale = "en-US", minimumFractionDigits, maximumFractionDigits } = config;
  const transform = (num: number) => {
    const n = Number(num);
    if (isNaN(n)) return String(num);
    const options: Intl.NumberFormatOptions = {};
    if (minimumFractionDigits !== undefined) options.minimumFractionDigits = minimumFractionDigits;
    if (maximumFractionDigits !== undefined) options.maximumFractionDigits = maximumFractionDigits;
    return n.toLocaleString(locale, options);
  };
  return applyToField(data, config, transform, "number");
}

function applyCurrency(data: any, config: any): any {
  const { locale = "en-US", currency = "USD" } = config;
  const transform = (num: number) => {
    const n = Number(num);
    if (isNaN(n)) return String(num);
    return n.toLocaleString(locale, { style: "currency", currency });
  };
  return applyToField(data, config, transform, "number");
}

// ============================================
// Date Transformations
// ============================================

function applyDateFormat(data: any, config: any): any {
  const { outputFormat = "YYYY-MM-DD", timezone } = config;
  const transform = (dateValue: any) => {
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return dateValue;

      // Simple format replacements
      let result = outputFormat;
      result = result.replace("YYYY", String(date.getFullYear()));
      result = result.replace("MM", String(date.getMonth() + 1).padStart(2, "0"));
      result = result.replace("DD", String(date.getDate()).padStart(2, "0"));
      result = result.replace("HH", String(date.getHours()).padStart(2, "0"));
      result = result.replace("mm", String(date.getMinutes()).padStart(2, "0"));
      result = result.replace("ss", String(date.getSeconds()).padStart(2, "0"));
      return result;
    } catch {
      return dateValue;
    }
  };
  return applyToField(data, config, transform, "any");
}

function applyRelativeTime(data: any, config: any): any {
  const transform = (dateValue: any) => {
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return dateValue;

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
      if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
      return "just now";
    } catch {
      return dateValue;
    }
  };
  return applyToField(data, config, transform, "any");
}

function applyTimestamp(data: any, config: any): any {
  const transform = (dateValue: any) => {
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 0;
      return Math.floor(date.getTime() / 1000);
    } catch {
      return 0;
    }
  };
  return applyToField(data, config, transform, "any");
}

function applyDateExtraction(data: any, type: string, config: any): any {
  const transform = (dateValue: any) => {
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 0;
      switch (type) {
        case "day-of-week":
          return date.getDay();
        case "month":
          return date.getMonth() + 1;
        case "year":
          return date.getFullYear();
        default:
          return 0;
      }
    } catch {
      return 0;
    }
  };
  return applyToField(data, config, transform, "any");
}

// ============================================
// Boolean Transformations
// ============================================

function applyInvert(data: any, config: any): any {
  const transform = (value: any) => !value;
  return applyToField(data, config, transform, "any");
}

function applyYesNo(data: any, config: any): any {
  const transform = (value: any) => value ? "Yes" : "No";
  return applyToField(data, config, transform, "any");
}

function applyCustomBoolean(data: any, config: any): any {
  const { trueValue = "True", falseValue = "False" } = config;
  const transform = (value: any) => value ? trueValue : falseValue;
  return applyToField(data, config, transform, "any");
}

function applyToNumber(data: any, config: any): any {
  const transform = (value: any) => value ? 1 : 0;
  return applyToField(data, config, transform, "any");
}

function applyIsEmpty(data: any, config: any): any {
  const transform = (value: any) => {
    if (value === null || value === undefined || value === "") return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return Object.keys(value).length === 0;
    return false;
  };
  return applyToField(data, config, transform, "any");
}

function applyContains(data: any, config: any): any {
  const { searchValue = "" } = config;
  const transform = (value: any) => String(value).includes(String(searchValue));
  return applyToField(data, config, transform, "string");
}

function applyIsPositive(data: any, config: any): any {
  const transform = (value: any) => Number(value) > 0;
  return applyToField(data, config, transform, "number");
}

function applyIsZero(data: any, config: any): any {
  const transform = (value: any) => Number(value) === 0;
  return applyToField(data, config, transform, "number");
}

// ============================================
// Array Transformations
// ============================================

function applyFirst(data: any, config: any): any {
  const transform = (arr: any[]) => {
    if (Array.isArray(arr) && arr.length > 0) return arr[0];
    return null;
  };
  return applyToField(data, config, transform, "array");
}

function applyLast(data: any, config: any): any {
  const transform = (arr: any[]) => {
    if (Array.isArray(arr) && arr.length > 0) return arr[arr.length - 1];
    return null;
  };
  return applyToField(data, config, transform, "array");
}

function applyCount(data: any, config: any): any {
  const transform = (arr: any[]) => {
    if (Array.isArray(arr)) return arr.length;
    return 0;
  };
  return applyToField(data, config, transform, "array");
}

function applySum(data: any, config: any): any {
  const { field } = config;
  const transform = (arr: any[]) => {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((sum, item) => {
      const value = field ? getValueFromPath(item, field) : item;
      return sum + (Number(value) || 0);
    }, 0);
  };
  return applyToField(data, config, transform, "array");
}

function applyAverage(data: any, config: any): any {
  const { field } = config;
  const transform = (arr: any[]) => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const sum = arr.reduce((acc, item) => {
      const value = field ? getValueFromPath(item, field) : item;
      return acc + (Number(value) || 0);
    }, 0);
    return sum / arr.length;
  };
  return applyToField(data, config, transform, "array");
}

function applyMin(data: any, config: any): any {
  const { field } = config;
  const transform = (arr: any[]) => {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.reduce((min, item) => {
      const value = field ? getValueFromPath(item, field) : item;
      const num = Number(value);
      return !isNaN(num) && num < min ? num : min;
    }, Infinity);
  };
  return applyToField(data, config, transform, "array");
}

function applyMax(data: any, config: any): any {
  const { field } = config;
  const transform = (arr: any[]) => {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.reduce((max, item) => {
      const value = field ? getValueFromPath(item, field) : item;
      const num = Number(value);
      return !isNaN(num) && num > max ? num : max;
    }, -Infinity);
  };
  return applyToField(data, config, transform, "array");
}

function applyUnique(data: any, config: any): any {
  const { field } = config;
  if (!Array.isArray(data)) return data;

  if (field) {
    const seen = new Set();
    return data.filter(item => {
      const value = getValueFromPath(item, field);
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  return [...new Set(data)];
}

// ============================================
// Helper function to apply transformation to field
// ============================================

function applyToField(
  data: any,
  config: any,
  transform: (value: any) => any,
  expectedType: string
): any {
  const { field, source_field } = config;
  const targetField = field || source_field;

  // If no field specified, transform the data directly
  if (!targetField) {
    if (Array.isArray(data)) {
      return data.map(item => transform(item));
    }
    return transform(data);
  }

  // Transform specific field in data
  if (Array.isArray(data)) {
    return data.map(item => {
      if (typeof item !== "object" || item === null) return item;
      const value = getValueFromPath(item, targetField);
      if (value === undefined || value === null) return item;
      const newValue = transform(value);
      return setValueAtPath({ ...item }, targetField, newValue);
    });
  }

  if (typeof data === "object" && data !== null) {
    const value = getValueFromPath(data, targetField);
    if (value === undefined || value === null) return data;
    const newValue = transform(value);
    return setValueAtPath({ ...data }, targetField, newValue);
  }

  return data;
}

export function applyStringTransformation(data: any, type: string, config: any): any {
  const transform = (str: string) => {
    switch (type) {
      case "uppercase":
        return str.toUpperCase();
      case "lowercase":
        return str.toLowerCase();
      case "capitalize":
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      case "trim":
        return str.trim();
      default:
        return str;
    }
  };

  if (typeof data === "string") {
    return transform(data);
  } else if (Array.isArray(data)) {
    return data.map(item => {
      if (typeof item === "string") {
        return transform(item);
      } else if (config.field && typeof item === "object") {
        const value = getValueFromPath(item, config.field);
        if (typeof value === "string") {
          let newItem = { ...item };
          newItem = setValueAtPath(newItem, config.field, transform(value));
          return newItem;
        }
      }
      return item;
    });
  }
  
  return data;
}

export function getValueFromPath(obj: any, path: string): any {
  if (!obj || !path) return null;

  // Check if path contains wildcards - if so, use special handling
  if (path.includes('[*]')) {
    return getValueWithWildcard(obj, path);
  }

  // Handle paths with array indices like "competitions[0].competitors[1].score"
  const segments = path.split(/[\.\[\]]+/).filter(Boolean);
  let current = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Check if segment is a number (array index)
    if (/^\d+$/.test(segment)) {
      const index = parseInt(segment, 10);
      if (Array.isArray(current)) {
        current = current[index];
      } else {
        return undefined;
      }
    }
    // Regular property access
    else {
      if (typeof current === 'object' && current !== null) {
        current = current[segment];
      } else {
        return undefined;
      }
    }
  }

  return current;
}

/**
 * Get values from path with wildcard support
 * Returns an array of values when wildcards are present
 */
function getValueWithWildcard(obj: any, path: string): any[] {
  const segments = path.split(/[\.\[\]]+/).filter(Boolean);
  let results: any[] = [obj];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const newResults: any[] = [];

    if (segment === '*') {
      // Wildcard: collect from all array items
      for (const current of results) {
        if (Array.isArray(current)) {
          newResults.push(...current);
        }
      }
      results = newResults;
    } else if (/^\d+$/.test(segment)) {
      // Numeric index
      const index = parseInt(segment, 10);
      for (const current of results) {
        if (Array.isArray(current) && index < current.length) {
          newResults.push(current[index]);
        }
      }
      results = newResults;
    } else {
      // Property access
      for (const current of results) {
        if (current && typeof current === 'object' && segment in current) {
          newResults.push(current[segment]);
        }
      }
      results = newResults;
    }
  }

  return results;
}

export function setValueAtPath(obj: any, path: string, value: any): any {
  if (!path) return value;
  
  const segments = path.split(/[\.\[\]]+/).filter(Boolean);
  const result = obj ? JSON.parse(JSON.stringify(obj)) : {};
  
  let current = result;

  if (segments.length === 1) {
    console.log(`Setting value at path ${segments[0]} to ${value}`);
    result[segments[0]] = value;
    return result;
  }
  
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const nextSegment = segments[i + 1];
    
    // Check if segment is a number (array index)
    if (/^\d+$/.test(segment)) {
      const index = parseInt(segment, 10);
      
      // Ensure current is an array
      if (!Array.isArray(current)) {
        console.warn(`Expected array at path segment ${segment}, got ${typeof current}`);
        return result;
      }
      
      // Ensure array has this index
      while (current.length <= index) {
        current.push(null);
      }
      
      // Create next level if needed
      if (current[index] === null || current[index] === undefined) {
        current[index] = /^\d+$/.test(nextSegment) ? [] : {};
      }
      
      current = current[index];
    } else {
      // Regular property access
      if (!current[segment]) {
        current[segment] = /^\d+$/.test(nextSegment) ? [] : {};
      }
      current = current[segment];
    }
  }
  
  // Set the final value
  const lastSegment = segments[segments.length - 1];
  if (/^\d+$/.test(lastSegment)) {
    const index = parseInt(lastSegment, 10);
    if (Array.isArray(current)) {
      while (current.length <= index) {
        current.push(null);
      }
      current[index] = value;
    }
  } else {
    current[lastSegment] = value;
  }
  
  return result;
}

// Also export the evaluateCondition function since it's used by other modules
export function evaluateCondition(value: any, operator: string, compareValue: any): boolean {
  switch (operator) {
    case "equals":
      return value === compareValue;
    case "not_equals":
      return value !== compareValue;
    case "contains":
      return String(value).includes(String(compareValue));
    case "starts_with":
      return String(value).startsWith(String(compareValue));
    case "ends_with":
      return String(value).endsWith(String(compareValue));
    case "greater_than":
      return Number(value) > Number(compareValue);
    case "less_than":
      return Number(value) < Number(compareValue);
    case "greater_than_or_equal":
      return Number(value) >= Number(compareValue);
    case "less_than_or_equal":
      return Number(value) <= Number(compareValue);
    case "in":
      return Array.isArray(compareValue) && compareValue.includes(value);
    case "not_in":
      return Array.isArray(compareValue) && !compareValue.includes(value);
    case "regex":
      try {
        const regex = new RegExp(compareValue);
        return regex.test(String(value));
      } catch {
        return false;
      }
    case "is_empty":
      return value === null || value === undefined || value === "" || 
             (Array.isArray(value) && value.length === 0);
    case "is_not_empty":
      return value !== null && value !== undefined && value !== "" &&
             (!Array.isArray(value) || value.length > 0);
    default:
      return false;
  }
}
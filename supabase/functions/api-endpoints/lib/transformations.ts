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

    case "custom-aggregate":
      return applyCustomAggregate(data, config);

    default:
      console.warn(`Unknown transformation type: ${type}`);
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
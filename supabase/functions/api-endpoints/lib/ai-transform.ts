// AI transformation handler with navigation context awareness
import { getValueFromPath, setValueAtPath } from "./transformations.ts";

export async function aiTransform(
  data: any,
  config: any,
  transformation: any,
  supabase: any
): Promise<any> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  
  try {
    // Check if we have a source_field specified
    if (transformation.source_field) {
      console.log(`AI Transform - source_field: "${transformation.source_field}", data type: ${Array.isArray(data) ? 'array' : typeof data}`);

      // Check if the source_field contains array notation like [*]
      const sourceField = transformation.source_field;

      if (sourceField.includes('[*]')) {
        // Parse the path to find the array and the field within array items
        // e.g., "races[*].title" -> arrayPath = "races", fieldInItem = "title"
        const wildcardIndex = sourceField.indexOf('[*]');
        const arrayPath = sourceField.substring(0, wildcardIndex);
        const afterWildcard = sourceField.substring(wildcardIndex + 3); // Skip "[*]"
        const fieldInItem = afterWildcard.startsWith('.') ? afterWildcard.substring(1) : afterWildcard;

        console.log(`Parsed array path: "${arrayPath}", field in item: "${fieldInItem}"`);

        // Get the array from the data
        let arrayData: any[];
        if (arrayPath) {
          arrayData = getValueFromPath(data, arrayPath);
        } else {
          // If no array path prefix (e.g., "[*].title"), the data itself should be an array
          arrayData = data;
        }

        if (!Array.isArray(arrayData)) {
          console.warn(`Expected array at path "${arrayPath}", got ${typeof arrayData}`);
          return data;
        }

        console.log(`Found array with ${arrayData.length} items at path "${arrayPath}"`);

        // Process the array
        const transformedArray = await processArrayFieldTransformation(
          arrayData,
          fieldInItem || '', // Empty string means transform entire item
          config,
          supabase
        );

        // Put the transformed array back into the data structure
        if (arrayPath) {
          let result = JSON.parse(JSON.stringify(data)); // Deep clone
          result = setValueAtPath(result, arrayPath, transformedArray);
          return result;
        } else {
          return transformedArray;
        }
      }

      // Handle direct array data (no wildcard in path)
      if (Array.isArray(data)) {
        // Check if source_field is a field within array items
        let fieldPath = sourceField;

        // If we still have a path that doesn't match the current context
        // try to extract just the field name
        if (fieldPath.includes('.')) {
          const parts = fieldPath.split('.');
          // Use the last part as the field name
          fieldPath = parts[parts.length - 1];
        }

        console.log(`Adjusted field path for array items: "${fieldPath}"`);

        return await processArrayFieldTransformation(
          data,
          fieldPath,
          config,
          supabase
        );
      }

      // For non-array data, try to extract the field value
      const fieldValue = getValueFromPath(data, sourceField);
      if (fieldValue !== undefined && fieldValue !== null) {
        const transformedValue = await transformSingleValue(fieldValue, config, supabase);

        // Create a copy and set the transformed value back
        let result = JSON.parse(JSON.stringify(data)); // Deep clone
        result = setValueAtPath(result, sourceField, transformedValue);
        return result;
      }
    }

    // No source_field or couldn't find it, transform the entire data
    console.log("Transforming entire data object");
    return await transformSingleValue(data, config, supabase);
    
  } catch (error) {
    console.error("AI transformation failed:", error);
    return data;
  }
}

async function transformSingleValue(
  value: any,
  config: any,
  supabase: any
): Promise<any> {
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  
  let prompt = config.prompt || "Transform this value";
  prompt = `Value: ${JSON.stringify(value)}\n\nTask: ${prompt}`;
  
  if (config.outputFormat === "json") {
    prompt += "\n\nRespond with valid JSON only.";
  }

  const response = await supabase.functions.invoke("claude", {
    body: {
      prompt,
      systemPrompt: config.systemPrompt || "You are a data transformation assistant. Transform the input according to the instructions provided.",
      maxTokens: config.maxTokens || 500,
      temperature: config.temperature || 0.7,
      outputFormat: config.outputFormat
    },
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`
    }
  });

  if (response.error) {
    console.error("AI transformation error:", response.error);
    return value;
  }

  let result = response.data?.response || response.data;
  
  // Extract the actual value from the AI response
  result = extractValueFromAIResponse(result, config);
  
  return result;
}

async function processArrayFieldTransformation(
  arrayData: any[],
  fieldName: string,
  config: any,
  supabase: any
): Promise<any[]> {
  console.log(`Processing ${arrayData.length} items for field: "${fieldName}"`);

  const maxItems = config.maxItems || 100; // Increased default since we batch
  const batchSize = config.batchSize || 25; // Process up to 25 items per API call
  const useBatching = config.useBatching !== false; // Default to batching

  const itemsToProcess = arrayData.slice(0, Math.min(arrayData.length, maxItems));
  const skippedCount = arrayData.length - itemsToProcess.length;

  if (skippedCount > 0) {
    console.warn(`Processing only first ${maxItems} items, skipping ${skippedCount} items`);
  }

  // Use batched processing by default for better performance
  if (useBatching && itemsToProcess.length > 1) {
    console.log(`Using BATCHED processing: ${itemsToProcess.length} items in batches of ${batchSize}`);
    return await processBatchedTransformation(arrayData, itemsToProcess, fieldName, config, supabase, batchSize, skippedCount);
  }

  // Fall back to sequential processing if batching is disabled or single item
  console.log(`Using SEQUENTIAL processing for ${itemsToProcess.length} items`);
  return await processSequentialTransformation(arrayData, itemsToProcess, fieldName, config, supabase, skippedCount);
}

/**
 * Process items in batches - sends multiple items in a single AI request
 * Much faster than sequential processing (1 API call per batch instead of per item)
 */
async function processBatchedTransformation(
  arrayData: any[],
  itemsToProcess: any[],
  fieldName: string,
  config: any,
  supabase: any,
  batchSize: number,
  skippedCount: number
): Promise<any[]> {
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const results: any[] = [];

  // Split items into batches
  const batches: any[][] = [];
  for (let i = 0; i < itemsToProcess.length; i += batchSize) {
    batches.push(itemsToProcess.slice(i, i + batchSize));
  }

  console.log(`Split into ${batches.length} batches of up to ${batchSize} items each`);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} items`);

    // Extract field values from batch items
    const batchValues: { index: number; value: any }[] = [];
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      let fieldValue;
      if (item.hasOwnProperty(fieldName)) {
        fieldValue = item[fieldName];
      } else {
        fieldValue = getValueFromPath(item, fieldName);
      }

      if (fieldValue !== null && fieldValue !== undefined) {
        batchValues.push({ index: i, value: fieldValue });
      }
    }

    if (batchValues.length === 0) {
      console.warn(`No valid values found in batch ${batchIndex + 1}`);
      results.push(...batch);
      continue;
    }

    // Build batched prompt
    const basePrompt = config.prompt || "Transform this value";
    const batchPrompt = buildBatchPrompt(batchValues, basePrompt, config);

    if (batchIndex === 0) {
      console.log("Sample batch prompt (first 500 chars):", batchPrompt.substring(0, 500));
    }

    try {
      let retries = 0;
      const maxRetries = 3;

      while (retries <= maxRetries) {
        try {
          const response = await supabase.functions.invoke("claude", {
            body: {
              prompt: batchPrompt,
              systemPrompt: config.systemPrompt || "You are a data transformation assistant. Process each item in the batch and return results in the exact JSON format specified.",
              outputFormat: "json",
              maxTokens: Math.min(config.maxTokens || 500, 4000) * batch.length, // Scale tokens with batch size
              temperature: config.temperature || 0.3 // Lower temp for more consistent batch output
            },
            headers: {
              Authorization: `Bearer ${supabaseServiceKey}`
            }
          });

          if (response.error) {
            const errorMessage = response.error.message || '';
            if ((errorMessage.includes('429') || errorMessage.includes('529') ||
                 errorMessage.includes('rate') || errorMessage.includes('Too many requests'))
                && retries < maxRetries) {
              retries++;
              const backoffMs = 2000 * Math.pow(2, retries - 1);
              console.log(`Rate limit hit on batch ${batchIndex + 1}. Waiting ${backoffMs}ms before retry ${retries}/${maxRetries}`);
              await new Promise(resolve => setTimeout(resolve, backoffMs));
              continue;
            }

            console.error(`AI batch transformation error:`, response.error);
            // Fall back to returning original items
            results.push(...batch);
            break;
          }

          // Parse batch response
          let batchResponse = response.data?.response || response.data;

          if (batchIndex === 0) {
            console.log("Sample batch response (first 500 chars):",
              typeof batchResponse === 'string' ? batchResponse.substring(0, 500) : JSON.stringify(batchResponse).substring(0, 500));
          }

          const transformedValues = parseBatchResponse(batchResponse, batchValues.length, config);

          console.log(`Parsed ${transformedValues.length} transformed values from batch response`);

          // Apply transformed values back to items
          const transformedBatch = applyBatchTransformations(batch, batchValues, transformedValues, fieldName);
          results.push(...transformedBatch);
          break;

        } catch (error: any) {
          console.error(`Error processing batch ${batchIndex + 1}:`, error);

          if (retries < maxRetries) {
            retries++;
            const backoffMs = 2000 * Math.pow(2, retries - 1);
            console.log(`Batch error. Waiting ${backoffMs}ms before retry ${retries}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue;
          }

          console.error(`Failed batch ${batchIndex + 1} after ${maxRetries} retries`);
          results.push(...batch);
          break;
        }
      }
    } catch (error) {
      console.error(`Unexpected error for batch ${batchIndex + 1}:`, error);
      results.push(...batch);
    }

    // Small delay between batches to be respectful of rate limits
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Add unprocessed items if any
  if (skippedCount > 0) {
    results.push(...arrayData.slice(itemsToProcess.length));
  }

  return results;
}

/**
 * Build a prompt for batch transformation
 */
function buildBatchPrompt(batchValues: { index: number; value: any }[], basePrompt: string, config: any): string {
  const itemsList = batchValues.map((item, i) =>
    `[${i}]: ${JSON.stringify(item.value)}`
  ).join('\n');

  return `You are processing a batch of ${batchValues.length} items. Apply the following transformation to EACH item:

TRANSFORMATION TASK: ${basePrompt}

INPUT ITEMS (indexed 0 to ${batchValues.length - 1}):
${itemsList}

IMPORTANT: You MUST respond with a valid JSON array containing exactly ${batchValues.length} transformed values, in the same order as the input.
Each element in the array should be the transformed result for the corresponding input item.

Example response format:
["transformed value 0", "transformed value 1", "transformed value 2", ...]

If a transformation fails for any item, use null for that position.

Respond with ONLY the JSON array, no explanation or markdown:`;
}

/**
 * Parse the batch response into individual transformed values
 */
function parseBatchResponse(response: any, expectedCount: number, config: any): any[] {
  let cleaned = response;

  // If string, clean it up
  if (typeof response === 'string') {
    cleaned = response.trim();

    // Remove markdown code blocks
    if (cleaned.includes('```')) {
      const match = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (match && match[1]) {
        cleaned = match[1].trim();
      } else {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      }
    }

    // Try to parse as JSON
    try {
      cleaned = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse batch response as JSON:", e);
      // Return array of nulls to indicate failure
      return new Array(expectedCount).fill(null);
    }
  }

  // Validate we got an array
  if (!Array.isArray(cleaned)) {
    // If it's an object with a results/data/items field, try to extract it
    if (typeof cleaned === 'object' && cleaned !== null) {
      const possibleArrayFields = ['results', 'data', 'items', 'values', 'output', 'transformed'];
      for (const field of possibleArrayFields) {
        if (Array.isArray(cleaned[field])) {
          cleaned = cleaned[field];
          break;
        }
      }
    }

    if (!Array.isArray(cleaned)) {
      console.error("Batch response is not an array:", typeof cleaned);
      return new Array(expectedCount).fill(null);
    }
  }

  // Ensure we have the right number of results
  if (cleaned.length !== expectedCount) {
    console.warn(`Batch response has ${cleaned.length} items, expected ${expectedCount}`);
    // Pad with nulls if too few, truncate if too many
    if (cleaned.length < expectedCount) {
      cleaned = [...cleaned, ...new Array(expectedCount - cleaned.length).fill(null)];
    } else {
      cleaned = cleaned.slice(0, expectedCount);
    }
  }

  // Process each value through the existing extraction logic
  return cleaned.map((value: any) => {
    if (value === null || value === undefined) return null;
    return extractValueFromAIResponse(value, config);
  });
}

/**
 * Apply transformed values back to the original items
 */
function applyBatchTransformations(
  batch: any[],
  batchValues: { index: number; value: any }[],
  transformedValues: any[],
  fieldName: string
): any[] {
  // Create a map of index -> transformed value
  const transformMap = new Map<number, any>();
  batchValues.forEach((item, i) => {
    if (transformedValues[i] !== null && transformedValues[i] !== undefined) {
      transformMap.set(item.index, transformedValues[i]);
    }
  });

  // Apply transformations to batch items
  return batch.map((item, index) => {
    if (!transformMap.has(index)) {
      return item; // No transformation for this item
    }

    const transformedValue = transformMap.get(index);
    let newItem = { ...item };

    if (item.hasOwnProperty(fieldName)) {
      newItem[fieldName] = transformedValue;
    } else {
      newItem = setValueAtPath(newItem, fieldName, transformedValue);
    }

    return newItem;
  });
}

/**
 * Sequential processing - fallback for single items or when batching is disabled
 */
async function processSequentialTransformation(
  arrayData: any[],
  itemsToProcess: any[],
  fieldName: string,
  config: any,
  supabase: any,
  skippedCount: number
): Promise<any[]> {
  const delayBetweenRequests = 1200; // 1.2 seconds between requests
  const results: any[] = [];
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  console.log(`Sequential processing config:
    - Items to process: ${itemsToProcess.length}
    - Delay between requests: ${delayBetweenRequests}ms
    - Estimated time: ${(itemsToProcess.length * delayBetweenRequests) / 1000}s`);

  for (let i = 0; i < itemsToProcess.length; i++) {
    const item = itemsToProcess[i];
    console.log(`Processing item ${i + 1} of ${itemsToProcess.length}`);

    let fieldValue;
    if (item.hasOwnProperty(fieldName)) {
      fieldValue = item[fieldName];
    } else {
      fieldValue = getValueFromPath(item, fieldName);
    }

    if (fieldValue === null || fieldValue === undefined) {
      console.warn(`No value found for field "${fieldName}" in item ${i}`);
      results.push(item);
      continue;
    }

    let prompt = config.prompt || "Transform this value";
    prompt = `Value: ${JSON.stringify(fieldValue)}\n\nTask: ${prompt}`;

    if (config.outputFormat === "json") {
      prompt += "\n\nRespond with valid JSON only.";
    }

    try {
      let retries = 0;
      const maxRetries = 3;

      while (retries <= maxRetries) {
        try {
          const response = await supabase.functions.invoke("claude", {
            body: {
              prompt,
              systemPrompt: config.systemPrompt || "You are a data transformation assistant.",
              outputFormat: config.outputFormat,
              maxTokens: config.maxTokens || 500,
              temperature: config.temperature || 0.7
            },
            headers: {
              Authorization: `Bearer ${supabaseServiceKey}`
            }
          });

          if (response.error) {
            const errorMessage = response.error.message || '';
            if ((errorMessage.includes('429') || errorMessage.includes('529') ||
                 errorMessage.includes('rate') || errorMessage.includes('Too many requests'))
                && retries < maxRetries) {
              retries++;
              const backoffMs = 2000 * Math.pow(2, retries - 1);
              console.log(`Rate limit hit on item ${i + 1}. Waiting ${backoffMs}ms before retry ${retries}/${maxRetries}`);
              await new Promise(resolve => setTimeout(resolve, backoffMs));
              continue;
            }

            console.error(`AI transformation error for item ${i + 1}:`, response.error);
            results.push(item);
            break;
          }

          let transformedValue = response.data?.response || response.data;
          transformedValue = extractValueFromAIResponse(transformedValue, config);

          let newItem = { ...item };
          if (item.hasOwnProperty(fieldName)) {
            newItem[fieldName] = transformedValue;
          } else {
            newItem = setValueAtPath(newItem, fieldName, transformedValue);
          }

          results.push(newItem);
          break;

        } catch (error: any) {
          console.error(`Error processing item ${i + 1}:`, error);

          if (retries < maxRetries) {
            retries++;
            const backoffMs = 2000 * Math.pow(2, retries - 1);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue;
          }

          results.push(item);
          break;
        }
      }
    } catch (error) {
      console.error(`Unexpected error for item ${i + 1}:`, error);
      results.push(item);
    }

    if (i < itemsToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
    }
  }

  if (skippedCount > 0) {
    results.push(...arrayData.slice(itemsToProcess.length));
  }

  return results;
}

/**
 * Extracts the actual value from an AI response
 * Handles both JSON objects and plain text responses
 */
function extractValueFromAIResponse(response: any, config: any): any {
  console.log("Extracting from AI response, type:", typeof response);
  
  // Handle null/undefined
  if (response === null || response === undefined) {
    return "";
  }
  
  // If it's already an object (not string), handle it directly
  if (typeof response === "object" && !Array.isArray(response)) {
    return extractFromObject(response, config);
  }
  
  // If it's not a string, return as-is
  if (typeof response !== "string") {
    return response;
  }
  
  // Now we have a string response - clean it up
  let cleaned = response.trim();
  
  // Remove markdown code blocks if present
  if (cleaned.includes('```')) {
    // Extract content between code blocks
    const match = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (match && match[1]) {
      cleaned = match[1].trim();
    } else {
      // Fallback: just remove the markers
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "");
      cleaned = cleaned.replace(/\n?```\s*$/i, "");
      cleaned = cleaned.trim();
    }
  }
  
  // Try to parse as JSON, regardless of outputFormat
  // Claude often returns JSON even when asked for plain text
  if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
    try {
      const parsed = JSON.parse(cleaned);
      console.log("Successfully parsed JSON from response");
      
      // If it's an object, extract the value
      if (typeof parsed === "object" && !Array.isArray(parsed)) {
        const extracted = extractFromObject(parsed, config);
        console.log("Extracted value:", typeof extracted === 'string' ? 
          extracted.substring(0, 100) : extracted);
        return extracted;
      }
      
      return parsed;
      
    } catch (e) {
      console.log("Failed to parse as JSON, returning as text");
      // If parsing fails, return the cleaned string
      return cleaned;
    }
  }
  
  // Not JSON, return the cleaned string
  return cleaned;
}

/**
 * Extract value from a parsed JSON object
 */
function extractFromObject(obj: any, config: any): any {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return obj;
  }
  
  const keys = Object.keys(obj);
  
  // If config specifies an expected field name, use it
  if (config.expectedField && obj[config.expectedField] !== undefined) {
    return obj[config.expectedField];
  }
  
  // If the object has only one property, return its value
  if (keys.length === 1) {
    const singleKey = keys[0];
    const value = obj[singleKey];
    console.log(`Extracting single field '${singleKey}'`);
    return value;
  }
  
  // Priority list of common field names
  const priorityFields = [
    'result', 'output', 'value', 'text', 'content',
    'summary', 'condensedText', 'condensed', 'summarized',
    'category', 'classification', 'label',
    'translation', 'translated',
    'extracted', 'data', 'response', 'answer'
  ];
  
  // Check priority fields in order
  for (const field of priorityFields) {
    if (obj[field] !== undefined && obj[field] !== null) {
      console.log(`Found value in field '${field}'`);
      return obj[field];
    }
  }
  
  // For small objects, return as-is
  if (keys.length <= 3) {
    return obj;
  }
  
  // Find the longest string value
  let bestValue = null;
  let bestLength = 0;
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" && value.length > bestLength) {
      bestLength = value.length;
      bestValue = value;
    }
  }
  
  if (bestValue) {
    return bestValue;
  }
  
  return obj;
}
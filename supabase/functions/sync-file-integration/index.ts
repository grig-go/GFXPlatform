// supabase/functions/sync-file-integration/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as path from 'https://deno.land/std@0.168.0/path/mod.ts';
import { corsHeaders } from '../_shared/cors.ts'

// Sanitize values for PostgreSQL to avoid Unicode errors
function sanitizeForPostgres(value) {
  if (value === null || value === undefined) {
    return '';
  }
  // Convert to string
  let str = String(value);
  // Remove null bytes (PostgreSQL doesn't support these)
  str = str.replace(/\u0000/g, '');
  // Remove other problematic control characters but keep tabs, newlines, carriage returns
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // Optionally normalize whitespace
  // str = str.replace(/\s+/g, ' ');
  return str.trim();
}
// Helper function to parse CSV/TSV files
function parseCSV(content, options) {
  const { delimiter, hasHeaders, customHeaders, headerRowNumber = 1 } = options;
  // Parse CSV manually to handle edge cases
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  for(let i = 0; i < content.length; i++){
    const char = content[i];
    const nextChar = content[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && char === delimiter) {
      currentRow.push(currentField);
      currentField = '';
    } else if (!inQuotes && (char === '\n' || char === '\r' && nextChar === '\n')) {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      if (char === '\r') i++; // Skip \n in \r\n
    } else {
      currentField += char;
    }
  }
  // Don't forget last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  // Process headers with skip support
  let headers = [];
  let dataRows = rows;
  
  // Skip rows before the header row (if headerRowNumber > 1)
  const skipRows = headerRowNumber - 1;
  
  if (hasHeaders && rows.length > skipRows) {
    // Get headers from the specified row
    headers = rows[skipRows].map((h) => h.trim());
    // Data starts after the header row
    dataRows = rows.slice(skipRows + 1);
  } else if (!hasHeaders) {
    // Skip the specified rows and treat remaining as data
    dataRows = rows.slice(skipRows);
  }
  
  // Use custom headers if provided
  if (customHeaders && customHeaders.length > 0) {
    headers = customHeaders;
  } else if (!hasHeaders) {
    headers = rows[0] ? rows[0].map((_, i) => `column${i}`) : [];
  }
  console.log('CSV Parser - Headers:', headers);
  console.log('CSV Parser - Total rows:', dataRows.length);
  // Convert to objects
  return dataRows.map((row, rowIndex)=>{
    const obj = {};
    // Store by header name
    headers.forEach((header, i)=>{
      obj[header] = row[i] || '';
    });
    // Also add numeric indices
    row.forEach((value, i)=>{
      obj[i] = value || '';
    });
    return obj;
  });
}
// Process a single data source
async function processSingleDataSource(supabaseClient, dataSourceId, queueId, debug = false) {
  const SYNC_TIMEOUT_MS = 120000; // 2 minutes
  const controller = new AbortController();
  const timeoutId = setTimeout(()=>controller.abort(), SYNC_TIMEOUT_MS);
  try {
    console.log(`Processing data source: ${dataSourceId}, debug: ${debug}`);
    // Get the data source configuration
    const { data: dataSource, error: dsError } = await supabaseClient.from('data_sources').select('*').eq('id', dataSourceId).single();
    if (dsError || !dataSource) {
      throw new Error('Data source not found');
    }
    // Check if it's a file type
    if (dataSource.type !== 'file') {
      throw new Error('Invalid data source type: ' + dataSource.type);
    }
    // Check if already running (skip in debug mode)
    if (dataSource.sync_status === 'running' && !debug) {
      const lastSyncTime = dataSource.last_sync_at ? new Date(dataSource.last_sync_at) : null;
      const timeSinceSync = lastSyncTime ? Date.now() - lastSyncTime.getTime() : Infinity;
      if (timeSinceSync < 300000) {
        throw new Error(`Sync already in progress (started ${Math.floor(timeSinceSync / 1000)}s ago)`);
      } else {
        // Reset if stuck for more than 5 minutes
        console.log('Resetting stuck sync for:', dataSource.name);
        await supabaseClient.from('data_sources').update({
          sync_status: 'idle',
          last_sync_error: 'Previous sync was stuck, starting fresh'
        }).eq('id', dataSourceId);
      }
    }
    // Debug mode - return parsed data without syncing
    if (debug) {
      const response = await fetch(dataSource.file_config.url, {
        signal: controller.signal
      });
      const fileContent = await response.text();
      const delimiter = dataSource.file_config.format === 'tsv' ? '\t' : ',';
      const parsedData = parseCSV(fileContent, {
        delimiter,
        hasHeaders: dataSource.file_config.hasHeaders ?? true,
        customHeaders: dataSource.file_config.customHeaders,
        headerRowNumber: dataSource.file_config.headerRowNumber ?? 1
      });
      return {
        fileConfig: dataSource.file_config,
        templateMapping: dataSource.template_mapping,
        sampleData: parsedData.slice(0, 3),
        totalRows: parsedData.length,
        headers: dataSource.file_config.customHeaders || dataSource.file_config.headers,
        availableKeys: parsedData[0] ? Object.keys(parsedData[0]) : []
      };
    }
    // Normal sync mode
    if (!dataSource.sync_config?.enabled) {
      throw new Error('Sync not enabled for this data source');
    }
    // Update data source status
    await supabaseClient.from('data_sources').update({
      sync_status: 'running',
      last_sync_at: new Date().toISOString()
    }).eq('id', dataSourceId);
    // Fetch and process the file
    console.log('Fetching file from:', dataSource.file_config.url);
    let fileContent = '';
    if (dataSource.file_config.source === 'url') {
      const response = await fetch(dataSource.file_config.url, {
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      fileContent = await response.text();
      console.log('File fetched, size:', fileContent.length);
    } else if (dataSource.file_config.source === 'path') {
      console.log('Reading file from server path:', dataSource.file_config.path);
      fileContent = await readServerFile(dataSource.file_config.path);
      console.log('File read from server, size:', fileContent.length);
      
    } else if (dataSource.file_config.source === 'upload') {
      // Handle uploaded file content if stored in file_config
      if (dataSource.file_config.fileContent) {
        fileContent = dataSource.file_config.fileContent;
        console.log('Using uploaded file content, size:', fileContent.length);
      } else {
        throw new Error('Uploaded file content not found in configuration');
      }
    } else {
      throw new Error('Only URL source is currently supported');
    }
    // Parse the file based on format
    let parsedData = [];
    if (dataSource.file_config.format === 'csv' || dataSource.file_config.format === 'tsv') {
      const delimiter = dataSource.file_config.format === 'tsv' ? '\t' : ',';
      parsedData = parseCSV(fileContent, {
        delimiter,
        hasHeaders: dataSource.file_config.hasHeaders ?? true,
        customHeaders: dataSource.file_config.customHeaders,
        headerRowNumber: dataSource.file_config.headerRowNumber ?? 1
      });
      console.log(`Parsed ${parsedData.length} rows`);
    } else if (dataSource.file_config.format === 'json') {
      parsedData = JSON.parse(fileContent);
      if (!Array.isArray(parsedData)) {
        parsedData = [
          parsedData
        ];
      }
      console.log(`Parsed JSON with ${parsedData.length} items`);
    } else {
      throw new Error(`Unsupported file format: ${dataSource.file_config.format}`);
    }

    console.log('Checking filter settings:', {
      filterEnabled: dataSource.file_config?.filterEnabled,
      filters: dataSource.file_config?.filters,
      filterLogic: dataSource.file_config?.filterLogic,
      // Legacy single filter
      filterField: dataSource.file_config?.filterField,
      filterOperator: dataSource.file_config?.filterOperator,
      filterValue: dataSource.file_config?.filterValue
    });
    
    if (dataSource.file_config?.filterEnabled) {
      const originalCount = parsedData.length;
      
      // Check if using multi-filter format
      if (dataSource.file_config?.filters && dataSource.file_config.filters.length > 0) {
        const filterLogic = dataSource.file_config.filterLogic || 'AND';
        
        console.log(`Applying ${dataSource.file_config.filters.length} filter(s) with ${filterLogic} logic`);
        
        parsedData = parsedData.filter(row => {
          const results = dataSource.file_config.filters.map(filter => {
            // IMPORTANT: Trim both values for consistent comparison
            const rowValue = String(row[filter.field] || '').trim();
            const compareValue = String(filter.value || '').trim();
            
            switch (filter.operator) {
              case '==':
                return rowValue === compareValue;
                
              case '!=':
                return rowValue !== compareValue;
                
              case 'contains':
                return rowValue.toLowerCase().includes(compareValue.toLowerCase());
                
              case 'startsWith':
                return rowValue.toLowerCase().startsWith(compareValue.toLowerCase());
                
              case 'endsWith':
                return rowValue.toLowerCase().endsWith(compareValue.toLowerCase());
                
              case 'in': {
                // Split by comma, trim whitespace, and check if row value is in the list
                const values = compareValue.split(',').map(v => v.trim().toLowerCase());
                return values.includes(rowValue.toLowerCase());
              }
                
              case 'notIn': {
                // Split by comma, trim whitespace, and check if row value is NOT in the list
                const values = compareValue.split(',').map(v => v.trim().toLowerCase());
                return !values.includes(rowValue.toLowerCase());
              }
                
              default:
                console.warn(`Unknown filter operator: ${filter.operator}`);
                return true;
            }
          });
          
          // Combine results based on filter logic
          if (filterLogic === 'OR') {
            return results.some(r => r); // At least one filter must match
          } else {
            return results.every(r => r); // All filters must match (AND)
          }
        });
        
        console.log(`Filtered from ${originalCount} to ${parsedData.length} rows using multi-filter`);
      }
      // BACKWARD COMPATIBILITY: Support old single filter format
      else if (dataSource.file_config?.filterField && 
               dataSource.file_config?.filterValue !== undefined) {
        
        const filterField = dataSource.file_config.filterField;
        const filterOperator = dataSource.file_config.filterOperator || '==';
        const filterValue = dataSource.file_config.filterValue;
        
        console.log(`Filtering rows where ${filterField} ${filterOperator} "${filterValue}" (legacy single filter)`);
        
        parsedData = parsedData.filter(row => {
          // IMPORTANT: Trim both values for consistent comparison
          const rowValue = String(row[filterField] || '').trim();
          const compareValue = String(filterValue).trim();
          
          switch (filterOperator) {
            case '==':
              return rowValue === compareValue;
              
            case '!=':
              return rowValue !== compareValue;
              
            case 'contains':
              return rowValue.toLowerCase().includes(compareValue.toLowerCase());
              
            case 'startsWith':
              return rowValue.toLowerCase().startsWith(compareValue.toLowerCase());
              
            case 'endsWith':
              return rowValue.toLowerCase().endsWith(compareValue.toLowerCase());
              
            case 'in': {
              // Split by comma, trim whitespace, and check if row value is in the list
              const values = compareValue.split(',').map(v => v.trim().toLowerCase());
              return values.includes(rowValue.toLowerCase());
            }
              
            case 'notIn': {
              // Split by comma, trim whitespace, and check if row value is NOT in the list
              const values = compareValue.split(',').map(v => v.trim().toLowerCase());
              return !values.includes(rowValue.toLowerCase());
            }
              
            default:
              console.warn(`Unknown filter operator: ${filterOperator}`);
              return true;
          }
        });
        
        console.log(`Filtered from ${originalCount} to ${parsedData.length} rows using legacy single filter`);
      }
    }
    
    // Get template fields
    let templateFieldNames = [];
    if (dataSource.template_mapping?.templateId) {
      console.log('Loading template fields for:', dataSource.template_mapping.templateId);
      const { data: formSchema } = await supabaseClient.from('template_forms').select('schema').eq('template_id', dataSource.template_mapping.templateId).maybeSingle();
      if (formSchema && formSchema.schema?.components) {
        templateFieldNames = formSchema.schema.components.filter((comp)=>comp.key && comp.input).map((comp)=>comp.key);
        console.log('Template fields from Form.io:', templateFieldNames);
      } else {
        const { data: templateFields } = await supabaseClient.from('tabfields').select('name').eq('template_id', dataSource.template_mapping.templateId);
        if (templateFields) {
          templateFieldNames = templateFields.map((f)=>f.name);
          console.log('Template fields from tabfields:', templateFieldNames);
        }
      }
    }
    // Create mapping map
    const mappingMap = new Map();
    if (dataSource.template_mapping?.fieldMappings) {
      for (const mapping of dataSource.template_mapping.fieldMappings){
        if (mapping.templateField && mapping.sourceColumn !== undefined) {
          const key = mapping.templateField;
          mappingMap.set(key, {
            sourceColumn: mapping.sourceColumn,
            rowIndex: mapping.rowIndex ?? 0  // Default to row 0 if not specified
          });
        }
      }
      console.log('Field mappings:', Array.from(mappingMap.entries()));
    }
    // Chunk mode handling
    let chunkedData = [];
    const chunkMode = dataSource.file_config?.chunkMode || false;
    const chunkSize = dataSource.file_config?.chunkSize || 1;

    if (chunkMode && chunkSize > 1) {
      console.log(`Chunk mode enabled: ${chunkSize} rows per item`);
      
      // Split data into chunks
      for (let i = 0; i < parsedData.length; i += chunkSize) {
        const chunk = parsedData.slice(i, i + chunkSize);
        chunkedData.push(chunk);
      }
      
      console.log(`Created ${chunkedData.length} chunks from ${parsedData.length} rows`);
      console.log(`First chunk has ${chunkedData[0]?.length || 0} rows`);
    } else {
      // Regular mode: each row is its own chunk
      console.log('Regular mode: one item per row');
      chunkedData = parsedData.map(row => [row]);
    }
    // Get existing items in the target bucket for sync mode handling
    let existingItems = [];
    const syncMode = dataSource.sync_config?.syncMode || 'replace';
    if (syncMode === 'update' || syncMode === 'replace') {
      const { data: currentItems } = await supabaseClient.from('content').select('id, name, order').eq('parent_id', dataSource.sync_config.targetBucketId).eq('type', 'item').order('order');
      existingItems = currentItems || [];
      console.log(`Found ${existingItems.length} existing items in target bucket`);
    }
    // Track which items we've seen in this sync
    const processedItemIds = new Set();

    // ===== PROCESS EACH CHUNK =====
    let itemsCreated = 0;
    let itemsUpdated = 0;
    let itemsProcessed = 0;
    const errors = [];

    console.log(`Starting to process ${chunkedData.length} ${chunkMode ? 'chunks' : 'rows'}...`);

    for (let chunkIdx = 0; chunkIdx < chunkedData.length; chunkIdx++) {
      const chunk = chunkedData[chunkIdx];
      
      try {
        console.log(`Processing ${chunkMode ? 'chunk' : 'row'} ${chunkIdx + 1}/${chunkedData.length}`);
        
        const itemData: any = {};
        
        // Apply field mappings with detailed logging
        for (const [templateField, mappingInfo] of mappingMap.entries()) {
          const mapping = dataSource.template_mapping.fieldMappings.find(m => m.templateField === templateField);

          if (!mapping) {
            console.warn(`No mapping found for template field: ${templateField}`);
            continue;
          }
          
          const rowIndex = mapping.rowIndex ?? 0;
          const row = chunk[rowIndex];
          
          if (!row) {
            console.warn(`Row index ${rowIndex} not found in chunk ${chunkIdx} (chunk has ${chunk.length} rows)`);
            itemData[templateField] = '';
            continue;
          }
          
          // DEBUG: Log row data for first chunk
          if (chunkIdx === 0 && templateField === 'CITY01') {
            console.log(`DEBUG - Row ${rowIndex} keys:`, Object.keys(row));
            console.log(`DEBUG - Row ${rowIndex} sample:`, {
              LocationName: row['LocationName'],
              Temp: row['Temp'],
              ForecastName: row['ForecastName']
            });
          }
          
          // Get value from the row
          let value;
          if (mapping.combinedFields && mapping.combinedFields.fields && mapping.combinedFields.fields.length > 0) {
            // Combine multiple fields using template
            let combinedValue = mapping.combinedFields.template || '';
            
            if (chunkIdx === 0) {
              console.log(`DEBUG - Combining for ${templateField}:`, {
                template: combinedValue,
                fields: mapping.combinedFields.fields,
                rowIndex: rowIndex
              });
            }
            
            mapping.combinedFields.fields.forEach((field, idx) => {
              const fieldValue = row[field] || '';
              if (chunkIdx === 0) {
                console.log(`  Field {${idx}} = ${field}: "${fieldValue}"`);
              }
              combinedValue = combinedValue.replace(`{${idx}}`, String(fieldValue));
            });
            
            value = combinedValue;
            console.log(`Combined result for ${templateField}: "${value}"`);
            
          } else if (mapping.sourceColumn) {
            // Single field mapping
            if (typeof mapping.sourceColumn === 'number') {
              value = row[mapping.sourceColumn];
            } else if (mapping.sourceColumn in row) {
              value = row[mapping.sourceColumn];
            } else {
              console.warn(`Column '${mapping.sourceColumn}' not found in row`);
              value = '';
            }
            console.log(`Direct mapping ${templateField} = "${value}"`);
          } else {
            value = '';
            console.log(`No source configured for ${templateField}`);
          }
          
          // Sanitize and convert to string
          const sanitized = sanitizeForPostgres(String(value));
          itemData[templateField] = sanitized;
          
          if (chunkIdx === 0) {
            console.log(`Final value for ${templateField}: "${sanitized}"`);
          }
        }

        // Log complete item data
        console.log(`Chunk ${chunkIdx} itemData:`, JSON.stringify(itemData, null, 2));
        
        // Debug: Log the first item's data
        if (chunkIdx === 0) {
          console.log('First item data sample:', JSON.stringify(itemData).substring(0, 200));
        }
        
        // Generate unique name for the item
        let itemName;
        if (chunkMode) {
          itemName = `${dataSource.name} - Chunk ${chunkIdx + 1}`;
        } else {
          const firstMappedValue = Object.values(itemData)[0];
          itemName = firstMappedValue 
            ? `${dataSource.name} - ${String(firstMappedValue).substring(0, 50)}`
            : `${dataSource.name} - Row ${chunkIdx + 1}`;
        }

        // Check if item exists (for update mode)
        const existingItem = existingItems.find(item => item.name === itemName);
        let itemId;

        if (existingItem) {
          // Update existing item
          itemId = existingItem.id;
          
          const { error: updateError } = await supabaseClient
            .from('content')
            .update({
              updated_at: new Date().toISOString()
            })
            .eq('id', itemId);
          
          if (updateError) {
            console.error(`Error updating item ${itemId}:`, updateError);
            errors.push({ chunk: chunkIdx, error: updateError.message });
            continue;
          }
          
          // Delete old fields before creating new ones
          await supabaseClient
            .from('item_tabfields')
            .delete()
            .eq('item_id', itemId);
          
          itemsUpdated++;
          processedItemIds.add(itemId);
          console.log(`Updated item: ${itemName}`);
          
        } else {
          // Create new item
          const { data: newItem, error: insertError } = await supabaseClient
            .from('content')
            .insert({
              name: itemName,
              type: 'item',
              parent_id: dataSource.sync_config.targetBucketId,
              template_id: dataSource.template_mapping.templateId,
              active: true,
              user_id: dataSource.user_id,
              order: chunkIdx,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (insertError) {
            console.error(`Error creating item:`, insertError);
            errors.push({ chunk: chunkIdx, error: insertError.message });
            continue;
          }
          
          itemId = newItem.id;
          itemsCreated++;
          processedItemIds.add(itemId);
          console.log(`Created item: ${itemName}`);
        }

        // Create item_tabfields rows for each field
        if (Object.keys(itemData).length > 0 && itemId) {
          const fieldInserts = Object.entries(itemData).map(([fieldName, value]) => ({
            item_id: itemId,
            name: fieldName,
            value: String(value || '')
          }));
          
          const { error: fieldsError } = await supabaseClient
            .from('item_tabfields')
            .insert(fieldInserts);
          
          if (fieldsError) {
            console.error(`Error creating fields for item ${itemId}:`, fieldsError);
            errors.push({ 
              chunk: chunkIdx, 
              error: `Fields: ${fieldsError.message}` 
            });
            
            // Rollback - delete the item if fields failed and it was newly created
            if (!existingItem) {
              await supabaseClient
                .from('content')
                .delete()
                .eq('id', itemId);
              itemsCreated--;
              processedItemIds.delete(itemId);
            }
            continue;
          }
          
          console.log(`Created ${fieldInserts.length} fields for item ${itemId}`);
        }

        itemsProcessed++;
        
      } catch (error) {
        console.error(`Error processing ${chunkMode ? 'chunk' : 'row'} ${chunkIdx}:`, error);
        errors.push({ 
          chunk: chunkIdx, 
          error: error.message,
          chunkData: chunk.map(r => Object.keys(r).slice(0, 3)) // Log just the keys for debugging
        });
      }
    }

    // If replace mode, delete all existing items first
    if (syncMode === 'replace') {
      console.log('Replace mode: Deleting existing items and their fields...');
      const deleteIds = existingItems.map((item)=>item.id);
      // First delete all item_tabfields for these items
      await supabaseClient.from('item_tabfields').delete().in('item_id', deleteIds);
      // Then delete the items themselves in batches
      const batchSize = 100;
      for(let i = 0; i < deleteIds.length; i += batchSize){
        const batch = deleteIds.slice(i, i + batchSize);
        const { error: deleteError } = await supabaseClient.from('content').delete().in('id', batch);
        if (deleteError) {
          console.error('Error deleting existing items:', deleteError);
          throw deleteError;
        }
      }
      console.log(`Deleted ${deleteIds.length} existing items`);
    }
    // Update sync result
    const syncResult = {
      itemsProcessed: itemsProcessed,
      itemsCreated: itemsCreated,
      itemsUpdated: itemsUpdated,
      totalRows: parsedData.length,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : null,
      timestamp: new Date().toISOString()
    };
    // Calculate next sync time
    let nextSyncAt = null;
    if (dataSource.sync_config.interval) {
      nextSyncAt = new Date();
      const intervalUnit = dataSource.sync_config.intervalUnit || 'minutes';
      switch(intervalUnit){
        case 'hours':
          nextSyncAt.setHours(nextSyncAt.getHours() + dataSource.sync_config.interval);
          break;
        case 'days':
          nextSyncAt.setDate(nextSyncAt.getDate() + dataSource.sync_config.interval);
          break;
        default:
          nextSyncAt.setMinutes(nextSyncAt.getMinutes() + dataSource.sync_config.interval);
      }
    }
    // Update data source status
    await supabaseClient.from('data_sources').update({
      sync_status: errors.length === 0 ? 'success' : 'error',
      last_sync_at: new Date().toISOString(),
      last_sync_result: syncResult,
      last_sync_count: itemsProcessed,
      last_sync_error: errors.length > 0 ? `${errors.length} errors occurred` : null,
      next_sync_at: nextSyncAt?.toISOString() || null
    }).eq('id', dataSourceId);
    return {
      success: errors.length === 0,
      itemsProcessed: itemsProcessed,
      itemsCreated: itemsCreated,
      itemsUpdated: itemsUpdated,
      totalRows: parsedData.length,
      totalChunks: chunkedData.length,
      chunkSize: chunkMode ? chunkSize : 1,
      errors: errors.length,
      errorDetails: errors.slice(0, 10),
      message: `Sync completed. ${itemsCreated} items created, ${itemsUpdated} items updated.`
    };
  } catch (error) {
    console.error('Sync error:', error);
    // Update data source with error
    await supabaseClient.from('data_sources').update({
      sync_status: 'error',
      last_sync_error: error.message,
      last_sync_at: new Date().toISOString()
    }).eq('id', dataSourceId);
    throw error;
  } finally{
    clearTimeout(timeoutId);
  }
}
async function readServerFile(filePath: string): Promise<string> {
  // Get the file-server URL from environment
  const FILE_SERVER_URL = Deno.env.get('FILE_SERVER_URL') || 'http://localhost:8001';
  
  console.log(`Reading file from server: ${filePath}`);
  console.log(`File server URL: ${FILE_SERVER_URL}`);
  
  try {
    // Call the file-server API
    const response = await fetch(FILE_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'read',
        relativePath: filePath
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('File server error response:', errorText);
      throw new Error(`File server returned ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to read file from server');
    }
    
    console.log(`Successfully read file: ${filePath} (${data.content.length} bytes)`);
    return data.content;
    
  } catch (error) {
    console.error('Error reading file from server:', error);
    throw new Error(`Failed to read file from server: ${error.message}`);
  }
}
function sanitizeFilePath(inputPath: string): string {
  // Remove any leading/trailing whitespace
  let sanitized = inputPath.trim();
  
  // Remove any leading slashes
  sanitized = sanitized.replace(/^\/+/, '');
  
  // Split and filter path segments
  const segments = sanitized.split('/').filter(segment => {
    // Remove empty segments and dangerous patterns
    return segment && 
           segment !== '.' && 
           segment !== '..' &&
           !segment.includes('\\') &&
           !segment.includes('\0');
  });
  
  return segments.join('/');
}
serve(async (req)=>{
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    const { dataSourceId, queueId, debug } = await req.json();
    if (!dataSourceId) {
      throw new Error('dataSourceId is required');
    }
    const result = await processSingleDataSource(supabaseClient, dataSourceId, queueId, debug);
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});

// File: supabase/functions/vizrt-ticker/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { processSchoolClosingsComponent } from './processors/school-closings.ts';
import { processElectionComponent } from './processors/election.ts';
import { processWeatherCitiesComponent, processWeatherForecastComponent } from './processors/weather.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Get CACHE_PATH from environment - when set, image URLs will be replaced with local file paths
const CACHE_PATH = Deno.env.get('CACHE_PATH');

/**
 * Transforms a Supabase storage URL to a local cache path if CACHE_PATH is set.
 * Example: https://xxx.supabase.co/storage/v1/object/public/images/uploads/123-abc.jpg
 * becomes: D:\temp\nova_cache\123-abc.jpg
 */
function transformImageUrl(url: string): string {
  if (!CACHE_PATH || !url) {
    return url;
  }

  // Check if this is a Supabase storage URL (or any URL that looks like an image)
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const lowerUrl = url.toLowerCase();
  const isImageUrl = imageExtensions.some(ext => lowerUrl.includes(ext));

  if (!isImageUrl) {
    return url;
  }

  // Extract filename from URL
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];

    if (filename) {
      // Combine CACHE_PATH with filename using backslash for Windows paths
      const separator = CACHE_PATH.includes('\\') ? '\\' : '/';
      const cachePath = CACHE_PATH.endsWith(separator) ? CACHE_PATH : CACHE_PATH + separator;
      return cachePath + filename;
    }
  } catch (e) {
    // If URL parsing fails, return original
    console.warn('Failed to parse URL for cache path transformation:', url, e);
  }

  return url;
}

serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Get timezone from environment variable
    const timezone = Deno.env.get('TIMEZONE') || Deno.env.get('TICKER_TIMEZONE') || 'America/New_York';
    console.log('Using timezone:', timezone);
    if (CACHE_PATH) {
      console.log('Using CACHE_PATH for images:', CACHE_PATH);
    }
    // Parse the URL to get channel name and check for /images endpoint
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p);

    // Check if this is an /images request (e.g., /vizrt-ticker/New Jersey/images)
    const isImagesRequest = pathParts[pathParts.length - 1] === 'images';

    // Get channel name - if /images request, it's the second-to-last segment
    let channelName = '';
    if (isImagesRequest) {
      // Remove 'images' and 'vizrt-ticker' to get channel name
      const relevantParts = pathParts.filter(p => p !== 'vizrt-ticker' && p !== 'images');
      channelName = relevantParts.join('/') || '';
    } else {
      // Normal request - channel name is the last segment after vizrt-ticker
      const relevantParts = pathParts.filter(p => p !== 'vizrt-ticker');
      channelName = relevantParts.join('/') || '';
    }

    if (!channelName) {
      return new Response(JSON.stringify({
        error: 'Channel name is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get query parameters
    const includeInactive = url.searchParams.get('include_inactive') === 'true';
    const includeIds = url.searchParams.get('includeIds') === 'true';
    // Passthrough parameters for school closings
    const passthroughRegionId = url.searchParams.get('region_id') || '';
    const passthroughZoneId = url.searchParams.get('zone_id') || '';
    // Create Supabase client
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    // 1. Find the channel entry in channel_playlists (the hierarchy root with type='channel')
    // This is the parent node that contains playlists as children via parent_id
    const decodedChannelName = decodeURIComponent(channelName);
    console.log(`[VIZRT-TICKER] Looking up channel: "${decodedChannelName}"`);
    const { data: channelEntry, error: channelError } = await supabaseClient
      .from('channel_playlists')
      .select('*')
      .eq('name', decodedChannelName)
      .eq('type', 'channel')
      .single();
    if (channelError || !channelEntry) {
      console.log(`[VIZRT-TICKER] Channel not found: "${channelName}", error:`, channelError);
      return new Response(JSON.stringify({
        error: `Channel "${channelName}" not found`
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`[VIZRT-TICKER] Found channel: id=${channelEntry.id}, name=${channelEntry.name}`);
    // 2. Get playlists for this channel from channel_playlists (stores hierarchy)
    // Use parent_id to find playlists that are children of this channel
    const playlistQuery = supabaseClient.from('channel_playlists').select('*').eq('parent_id', channelEntry.id).eq('type', 'playlist').order('order');
    if (!includeInactive) {
      playlistQuery.eq('active', true);
    }
    const { data: playlists } = await playlistQuery;
    console.log(`[VIZRT-TICKER] Found ${playlists?.length || 0} playlists for channel ${channelEntry.name}`);

    // Handle /images endpoint - return list of image URLs for caching
    if (isImagesRequest) {
      console.log(`[VIZRT-TICKER] GET images for channel: ${channelName}`);
      const imageUrls = await collectImageUrls(playlists || [], supabaseClient, includeInactive, timezone);

      return new Response(JSON.stringify(imageUrls), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    // 3. Build XML structure
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<tickerfeed version="2.4">\n';
    // Track bucket instance counts across all playlists for unique IDs
    const bucketInstanceCounts: Map<string, number> = new Map();

    // 4. Process each playlist
    for (const playlist of playlists || []){
      const playlistXml = await buildPlaylistXml(playlist, supabaseClient, includeInactive, timezone, includeIds, bucketInstanceCounts, { passthroughRegionId, passthroughZoneId });
      if (playlistXml) {
        xml += playlistXml;
      }
    }
    xml += '</tickerfeed>';
    // Return XML response
    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
async function buildPlaylistXml(playlist, supabase, includeInactive, timezone, includeIds = false, bucketInstanceCounts: Map<string, number> = new Map(), passthroughParams: { passthroughRegionId?: string; passthroughZoneId?: string } = {}) {
  console.log(`[VIZRT-TICKER] Building playlist: ${playlist.name} (id=${playlist.id})`);
  // Check if playlist is currently active based on its schedule
  if (!isCurrentlyActive(playlist.schedule, timezone)) {
    console.log(`[VIZRT-TICKER] Playlist ${playlist.name} skipped - not currently active (schedule)`);
    return null; // Skip this entire playlist if it's not scheduled to be active
  }
  // Get buckets for this playlist
  const bucketQuery = supabase.from('channel_playlists').select('*').eq('parent_id', playlist.id).eq('type', 'bucket').order('order');
  if (!includeInactive) {
    bucketQuery.eq('active', true);
  }
  const { data: buckets } = await bucketQuery;
  console.log(`[VIZRT-TICKER] Playlist ${playlist.name} has ${buckets?.length || 0} buckets`);
  if (!buckets || buckets.length === 0) return null;
  // Filter buckets that are currently active
  const activeBuckets = [];
  for (const bucket of buckets){
    if (isCurrentlyActive(bucket.schedule, timezone)) {
      activeBuckets.push(bucket);
    }
  }
  if (activeBuckets.length === 0) return null;

  // Build groups for each active bucket FIRST to check if there's any content
  const groupXmls: string[] = [];
  for (const bucket of activeBuckets){
    const groupXml = await buildGroupXml(bucket, supabase, includeInactive, timezone, includeIds, bucketInstanceCounts, passthroughParams);
    if (groupXml) groupXmls.push(groupXml);
  }

  // Skip playlist entirely if no groups have content
  if (groupXmls.length === 0) {
    console.log(`[VIZRT-TICKER] Playlist ${playlist.name} skipped - no content in any bucket`);
    return null;
  }

  // Use playlist properties for XML attributes
  const playlistType = playlist.carousel_type || determinePlaylistType(playlist);
  const carouselName = playlist.carousel_name || playlist.name;
  const target = playlist.target || 'carousel';

  let xml = `  <playlist type="${playlistType}" name="${escapeXml(carouselName)}" target="${escapeXml(target)}">\n`;
  // Add all groups with content
  for (const groupXml of groupXmls){
    xml += groupXml;
  }
  xml += '  </playlist>\n';
  return xml;
}
async function buildGroupXml(bucket, supabase, includeInactive, timezone, includeIds = false, bucketInstanceCounts: Map<string, number> = new Map(), passthroughParams: { passthroughRegionId?: string; passthroughZoneId?: string } = {}) {
  console.log(`[VIZRT-TICKER] Building group for bucket: ${bucket.name} (id=${bucket.id}, content_id=${bucket.content_id})`);
  const elements = await getElementsForBucket(bucket, supabase, includeInactive, timezone, bucketInstanceCounts, passthroughParams);
  console.log(`[VIZRT-TICKER] Bucket ${bucket.name} has ${elements.length} elements`);
  if (elements.length === 0) return null;
  let xml = `    <group use_existing="${bucket.content_id || ''}">\n`;
  xml += `      <description>${escapeXml(bucket.name)}</description>\n`;
  xml += `      <gui-color>${generateDistinctColorForBucket(bucket)}</gui-color>\n`;
  xml += '      <elements>\n';
  for (const element of elements){
    xml += buildElementXml(element, 4, includeIds);
  }
  xml += '      </elements>\n';
  xml += '    </group>\n';
  return xml;
}
async function getElementsForBucket(bucket, supabase, includeInactive, timezone, bucketInstanceCounts: Map<string, number> = new Map(), passthroughParams: { passthroughRegionId?: string; passthroughZoneId?: string } = {}) {
  const items = await getItemsForBucket(bucket, supabase, includeInactive, timezone);
  const elements = [];
  for (const item of items){
    const itemElements = await createElement(item, supabase, passthroughParams);
    // createElement can now return either a single element or an array of elements
    if (Array.isArray(itemElements)) {
      elements.push(...itemElements);
    } else {
      elements.push(itemElements);
    }
  }

  // Only add generateItem if there are actual content items in the bucket
  // Skip generateItem for empty buckets
  if (elements.length > 0 && bucket.content_id) {
    const { data: bucketContent } = await supabase
      .from('content')
      .select('bucket_config')
      .eq('id', bucket.content_id)
      .single();

    const generateItemConfig = bucketContent?.bucket_config?.generateItem;
    if (generateItemConfig?.enabled && generateItemConfig?.templateId) {
      // Fetch template name from templates table
      const { data: template } = await supabase
        .from('templates')
        .select('name')
        .eq('id', generateItemConfig.templateId)
        .single();

      if (template) {
        // Get and increment the instance count for this bucket
        const instanceIndex = bucketInstanceCounts.get(bucket.id) || 0;
        bucketInstanceCounts.set(bucket.id, instanceIndex + 1);

        const generatedElement: {
          id: string;
          template: string;
          fields: { name: string; value: string }[];
          duration?: string;
        } = {
          id: `${bucket.id}_${instanceIndex}`,  // Bucket-based ID with dynamic instance index
          template: template.name,
          fields: []
        };

        // Add field if configured
        if (generateItemConfig.fieldName && generateItemConfig.fieldValue) {
          generatedElement.fields.push({
            name: generateItemConfig.fieldName,
            value: generateItemConfig.fieldValue
          });
        }

        // Add duration if configured
        if (generateItemConfig.duration) {
          generatedElement.duration = generateItemConfig.duration.toString();
        }

        // Prepend as first element
        elements.unshift(generatedElement);
        console.log(`Generated item with template ${template.name} as first child (instance ${instanceIndex})`);
      }
    }
  }

  return elements;
}
async function getItemsForBucket(bucket, supabase, includeInactive, timezone) {
  if (!bucket.content_id) return [];

  // This function recursively gets all items from a container (bucket or itemFolder)
  async function getAllItemsRecursive(containerId) {
    const allItems = [];
    // Get all direct children of this container
    const query = supabase.from('content').select('*').eq('parent_id', containerId).order('order');
    if (!includeInactive) {
      query.eq('active', true);
    }
    const { data: children } = await query;
    for (const child of children || []){
      if (child.type === 'item') {
        // Check if this item is currently active based on its schedule
        if (isCurrentlyActive(child.schedule, timezone)) {
          allItems.push(child);
        }
      } else if (child.type === 'itemFolder') {
        // Check if this itemFolder is currently active based on its schedule
        if (isCurrentlyActive(child.schedule, timezone)) {
          // ItemFolder is active - recursively get all items from within it
          const itemsFromFolder = await getAllItemsRecursive(child.id);
          allItems.push(...itemsFromFolder);
        }
      // If itemFolder is not active, skip all its contents
      }
    // Note: We ignore other types that might be in the content tree
    }
    return allItems;
  }

  // Get regular items from the bucket
  const items = await getAllItemsRecursive(bucket.content_id);


  return items;
}
async function createElement(item, supabase, passthroughParams: { passthroughRegionId?: string; passthroughZoneId?: string } = {}) {
  // Get item fields
  const { data: fields } = await supabase.from('item_tabfields').select('*').eq('item_id', item.id);
  const element: {
    id: string;
    fields: { name: string; value: string }[];
    template?: string;
    duration?: string;
    ttl?: { action: string; value: string };
  } = {
    id: item.id,  // Include item ID for optional XML output
    fields: []
  };
  // Get template info including form schema for custom components
  let templateName = null;
  let formSchema = null;
  if (item.template_id) {
    // Get template name
    const { data: template, error: templateError } = await supabase.from('templates').select('name').eq('id', item.template_id).single();
    console.log(`Template lookup for item ${item.id}: template_id=${item.template_id}, found=${!!template}, error=${templateError?.message || 'none'}`);
    if (template) {
      templateName = template.name;
      element.template = template.name;
    }

    // Get form schema from template_forms table (separate from templates table)
    const { data: templateForm, error: formError } = await supabase.from('template_forms').select('schema').eq('template_id', item.template_id).single();
    console.log(`Template form lookup: found=${!!templateForm}, error=${formError?.message || 'none'}`);
    if (templateForm?.schema) {
      formSchema = templateForm.schema;
      console.log(`Form schema type: ${typeof formSchema}, has components: ${!!formSchema?.components}`);
      if (formSchema?.components) {
        console.log(`Form schema components: ${JSON.stringify(formSchema.components.map(c => ({ key: c.key, type: c.type })))}`);
      }
    }
  } else {
    console.log(`Item ${item.id} has no template_id`);
  }

  // Check if this item contains a school closings or election component that should generate multiple elements
  console.log(`Checking ${(fields || []).length} fields for custom components`);
  let hasSchoolClosingsComponent = false;
  for (const field of fields || []) {
    console.log(`Field: ${field.name}, starts with __: ${field.name.startsWith('__')}`);
    if (!field.name.startsWith('__')) {
      const componentConfig = formSchema ? findComponentInSchema(formSchema, field.name) : null;
      console.log(`Field ${field.name} component config:`, componentConfig ? { type: componentConfig.type } : 'not found');
      if (componentConfig?.type === 'schoolClosings') {
        hasSchoolClosingsComponent = true;
        // Process school closings and return multiple elements
        console.log(`Found schoolClosings component, processing...`);
        return await processSchoolClosingsComponent(field, componentConfig, supabase, item, passthroughParams);
      }
      if (componentConfig?.type === 'election') {
        // Process election and return multiple elements
        console.log(`Found election component, processing...`);
        return await processElectionComponent(field, componentConfig, supabase, item);
      }
    }
  }

  // Add all fields, handling custom components
  for (const field of fields || []) {
    // Skip internal metadata fields
    if (field.name.startsWith('__')) {
      continue;
    }
    // Check if this field is a custom component that needs special handling
    const componentConfig = formSchema ? findComponentInSchema(formSchema, field.name) : null;

    console.log(`Processing field: ${field.name}, componentConfig type: ${componentConfig?.type}, formSchema exists: ${!!formSchema}`);

    if (componentConfig?.type === 'weatherCities' || componentConfig?.type === 'weatherLocations') {
      // Handle Weather Cities component - fetch fresh data
      // Support both 'weatherCities' (new) and 'weatherLocations' (legacy) types
      console.log(`Found ${componentConfig.type} component, processing...`);
      const weatherResult = await processWeatherCitiesComponent(field, componentConfig, supabase);
      element.fields.push(...weatherResult.fields);

      // Override template name if specified in component config
      if (weatherResult.templateName) {
        element.template = weatherResult.templateName;
      }
    } else if (componentConfig?.type === 'weatherForecast') {
      // Handle Weather Forecast component - fetch multi-day forecast
      console.log(`Found weatherForecast component, processing...`);
      const forecastResult = await processWeatherForecastComponent(field, componentConfig, supabase);
      element.fields.push(...forecastResult.fields);

      // Override template name if specified in component config
      if (forecastResult.templateName) {
        element.template = forecastResult.templateName;
      }
    } else if (componentConfig?.type === 'image') {
      // Handle Image Upload component - transform URL to cache path if CACHE_PATH is set
      element.fields.push({
        name: field.name,
        value: transformImageUrl(field.value)
      });
    } else {
      // Regular field - also check if the value looks like an image URL
      element.fields.push({
        name: field.name,
        value: transformImageUrl(field.value)
      });
    }
  }
  // Only add duration if explicitly set on the item
  if (item.duration && item.duration > 0) {
    element.duration = item.duration.toString();
  }
  // Add TTL for time-sensitive content
  if (hasTimeSensitiveField(fields || [])) {
    element.ttl = {
      action: 'remove',
      value: '3600'
    };
  }
  return element;
}

// Find a component in the form schema by its key
function findComponentInSchema(schema, key) {
  if (!schema?.components) {
    console.log('findComponentInSchema: No components in schema');
    return null;
  }

  console.log(`findComponentInSchema: Looking for key "${key}" in schema with ${schema.components.length} top-level components`);

  function searchComponents(components) {
    for (const component of components) {
      console.log(`  Checking component: key="${component.key}", type="${component.type}"`);
      if (component.key === key) {
        console.log(`  Found matching component!`);
        return component;
      }
      if (component.components) {
        const found = searchComponents(component.components);
        if (found) return found;
      }
      if (component.columns) {
        for (const col of component.columns) {
          if (col.components) {
            const found = searchComponents(col.components);
            if (found) return found;
          }
        }
      }
      // Handle tabs structure
      if (component.type === 'tabs' && Array.isArray(component.components)) {
        for (const tab of component.components) {
          if (tab.components) {
            const found = searchComponents(tab.components);
            if (found) return found;
          }
        }
      }
    }
    return null;
  }

  return searchComponents(schema.components);
}
function buildElementXml(element, indent, includeIds = false) {
  const spaces = '  '.repeat(indent);
  let xml = `${spaces}<element>\n`;
  // Add id if includeIds is enabled and element has an id
  if (includeIds && element.id) {
    xml += `${spaces}  <id>${escapeXml(element.id)}</id>\n`;
  }
  // Add template first if specified
  if (element.template) {
    xml += `${spaces}  <template>${escapeXml(element.template)}</template>\n`;
  }
  // Add fields
  for (const field of element.fields){
    xml += `${spaces}  <field name="${escapeXml(field.name)}">${escapeXml(convertBooleanValue(field.value))}</field>\n`;
  }
  // Add optional properties
  if (element.duration) {
    xml += `${spaces}  <duration>${element.duration}</duration>\n`;
  }
  if (element.ttl) {
    xml += `${spaces}  <ttl action="${element.ttl.action}">${element.ttl.value}</ttl>\n`;
  }
  xml += `${spaces}</element>\n`;
  return xml;
}
// Schedule filtering functions with timezone support
function isCurrentlyActive(scheduleData, timezone = 'UTC') {
  // If no schedule, always active
  if (!scheduleData) {
    return true;
  }
  let schedule;
  // Handle both object (new JSON column) and string (legacy) formats
  if (typeof scheduleData === 'object' && scheduleData !== null) {
    // Already an object (JSON column format)
    schedule = scheduleData;
  } else if (typeof scheduleData === 'string') {
    const trimmedValue = scheduleData.trim();
    // Handle empty strings
    if (!trimmedValue || trimmedValue === 'null' || trimmedValue === 'undefined') {
      return true;
    }
    // Handle legacy text schedules (for backward compatibility)
    if (!trimmedValue.startsWith('{')) {
      // Legacy schedules like "Hourly", "Daily" etc. are always active
      return true;
    }
    // Try to parse JSON string
    try {
      schedule = JSON.parse(trimmedValue);
    } catch (error) {
      // If JSON parsing fails, treat as always active
      console.warn('Error parsing schedule JSON:', error);
      return true;
    }
  } else {
    // Invalid schedule format, always active
    return true;
  }
  // If not a valid object, always active
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
    return true;
  }
  const now = new Date();
  console.log('Current UTC time:', now.toISOString());
  console.log('Checking schedule in timezone:', timezone);
  // Check start/end datetime filters
  if (!isWithinDateTimeRange(now, schedule.startDate, schedule.endDate, timezone)) {
    return false;
  }
  // Check days of week filter
  if (!isActiveOnCurrentDay(now, schedule.daysOfWeek, timezone)) {
    return false;
  }
  // Check time ranges filter
  if (!isWithinTimeRanges(now, schedule.timeRanges, timezone)) {
    return false;
  }
  return true;
}
function isWithinDateTimeRange(currentTime, startDate, endDate, timezone) {
  // If no start/end dates defined, active indefinitely
  if (!startDate && !endDate) {
    return true;
  }
  try {
    // Get current time in timezone
    const nowInTimezone = new Date(currentTime.toLocaleString("en-US", {
      timeZone: timezone
    }));
    // Check start date
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime()) && nowInTimezone < start) {
        return false;
      }
    }
    // Check end date
    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime()) && nowInTimezone > end) {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.warn('Error checking date range:', error);
    return true; // If error, don't filter out
  }
}
function isActiveOnCurrentDay(currentTime, daysOfWeek, timezone) {
  // If no days specified or invalid, active all days
  if (!daysOfWeek || typeof daysOfWeek !== 'object' || Array.isArray(daysOfWeek)) {
    return true;
  }
  // Check if any day is selected
  const hasSelectedDays = Object.values(daysOfWeek).some((selected)=>selected === true);
  // If no days selected, active all days
  if (!hasSelectedDays) {
    return true;
  }
  // Get the day in the specified timezone
  const localTime = new Date(currentTime.toLocaleString("en-US", {
    timeZone: timezone
  }));
  // Map current day to schedule format
  const dayNames = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ];
  const currentDayName = dayNames[localTime.getDay()];
  // Check if current day is selected
  return daysOfWeek[currentDayName] === true;
}
function isWithinTimeRanges(currentTime, timeRanges, timezone) {
  // If no time ranges specified or invalid, active all day
  if (!Array.isArray(timeRanges) || timeRanges.length === 0) {
    return true;
  }
  // Check if there are any valid time ranges
  const validTimeRanges = timeRanges.filter((range)=>range && typeof range === 'object' && range.start && range.end);
  // If no valid time ranges, active all day
  if (validTimeRanges.length === 0) {
    return true;
  }
  // Get current time in the specified timezone
  const options = {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const currentTimeString = formatter.format(currentTime);
  console.log('Current time in', timezone, ':', currentTimeString);
  // Check if current time falls within any of the time ranges
  for (const range of validTimeRanges){
    if (isTimeWithinRange(currentTimeString, range.start, range.end)) {
      return true;
    }
  }
  return false; // Not within any time range
}
function isTimeWithinRange(currentTime, startTime, endTime) {
  try {
    // Convert times to minutes since midnight for easier comparison
    const toMinutes = (timeStr)=>{
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const current = toMinutes(currentTime);
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    // Handle ranges that span midnight (e.g., 22:00 to 06:00)
    if (start > end) {
      // Range spans midnight
      return current >= start || current <= end;
    } else {
      // Normal range within same day
      return current >= start && current <= end;
    }
  } catch (error) {
    console.warn('Error comparing times:', error);
    return true; // If error, don't filter out
  }
}
// Helper functions
function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Convert boolean values to 0/1 for Vizrt compatibility
function convertBooleanValue(value: string): string {
  if (value === 'true') return '1';
  if (value === 'false') return '0';
  return value;
}
function determinePlaylistType(playlist) {
  if (playlist.name.toLowerCase().includes('breaking') || playlist.name.toLowerCase().includes('urgent')) {
    return 'flipping_carousel';
  }
  return 'scrolling_carousel';
}
function generateColorForPlaylist(name) {
  const colors = [
    '#FF5733',
    '#33FF57',
    '#3357FF',
    '#FF33F5',
    '#F5FF33',
    '#33FFF5'
  ];
  let hash = 0;
  for(let i = 0; i < name.length; i++){
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
function generateDistinctColorForBucket(bucket) {
  // Extended color palette with distinct, vibrant colors
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#F7DC6F',
    '#BB8FCE',
    '#52C234',
    '#FF8C42',
    '#6C5CE7',
    '#A8E6CF',
    '#FFD93D',
    '#F8B195',
    '#C7CEEA',
    '#FF6B9D',
    '#2ECC71',
    '#E74C3C',
    '#3498DB',
    '#F39C12',
    '#9B59B6',
    '#1ABC9C',
    '#34495E'
  ];
  // Use bucket ID for more consistent coloring
  let hash = 0;
  const str = bucket.id || bucket.name;
  for(let i = 0; i < str.length; i++){
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
function hasTimeSensitiveField(fields) {
  const timeSensitiveKeywords = [
    'breaking',
    'urgent',
    'live',
    'now',
    'alert'
  ];
  return fields.some((field)=>timeSensitiveKeywords.some((keyword)=>field.name.toLowerCase().includes(keyword) || field.value.toLowerCase().includes(keyword)));
}

/**
 * Collects all image URLs from the ticker content for a channel.
 * Used by the /images endpoint to provide a list of images for caching.
 */
async function collectImageUrls(playlists: any[], supabase: any, includeInactive: boolean, timezone: string): Promise<string[]> {
  const imageUrls = new Set<string>();
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];

  // Helper to check if a value is an image URL
  const isImageUrl = (value: string): boolean => {
    if (!value || typeof value !== 'string') return false;
    const lowerValue = value.toLowerCase();
    return imageExtensions.some(ext => lowerValue.includes(ext)) &&
           (value.startsWith('http://') || value.startsWith('https://'));
  };

  // Process each playlist
  for (const playlist of playlists) {
    // Check if playlist is currently active
    if (!isCurrentlyActive(playlist.schedule, timezone)) {
      continue;
    }

    // Get buckets for this playlist
    const bucketQuery = supabase.from('channel_playlists').select('*').eq('parent_id', playlist.id).eq('type', 'bucket').order('order');
    if (!includeInactive) {
      bucketQuery.eq('active', true);
    }
    const { data: buckets } = await bucketQuery;

    if (!buckets || buckets.length === 0) continue;

    // Process each bucket
    for (const bucket of buckets) {
      // Check if bucket is currently active
      if (!isCurrentlyActive(bucket.schedule, timezone)) {
        continue;
      }

      if (!bucket.content_id) continue;

      // Get all items recursively from the bucket
      const items = await getItemsForBucketImages(bucket.content_id, supabase, includeInactive, timezone);

      // Get fields for each item and extract image URLs
      for (const item of items) {
        const { data: fields } = await supabase.from('item_tabfields').select('*').eq('item_id', item.id);

        for (const field of fields || []) {
          if (field.name.startsWith('__')) continue;

          if (isImageUrl(field.value)) {
            imageUrls.add(field.value);
          }
        }
      }
    }
  }

  return Array.from(imageUrls);
}

/**
 * Recursively gets all items from a container for image collection.
 * Similar to getItemsForBucket but simplified for image URL extraction.
 */
async function getItemsForBucketImages(containerId: string, supabase: any, includeInactive: boolean, timezone: string): Promise<any[]> {
  const allItems: any[] = [];

  const query = supabase.from('content').select('*').eq('parent_id', containerId).order('order');
  if (!includeInactive) {
    query.eq('active', true);
  }
  const { data: children } = await query;

  for (const child of children || []) {
    if (child.type === 'item') {
      if (isCurrentlyActive(child.schedule, timezone)) {
        allItems.push(child);
      }
    } else if (child.type === 'itemFolder') {
      if (isCurrentlyActive(child.schedule, timezone)) {
        const itemsFromFolder = await getItemsForBucketImages(child.id, supabase, includeInactive, timezone);
        allItems.push(...itemsFromFolder);
      }
    }
  }

  return allItems;
}
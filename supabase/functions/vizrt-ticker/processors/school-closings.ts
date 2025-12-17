/**
 * School Closings Component Processor
 * Generates multiple elements for school closings display
 */

/**
 * Process School Closings component - generates multiple elements
 */
export async function processSchoolClosingsComponent(
  field: any,
  config: any,
  supabase: any,
  item: any,
  passthroughParams: { passthroughRegionId?: string; passthroughZoneId?: string } = {}
): Promise<any[]> {
  const elements = [];

  console.log('🏫 processSchoolClosingsComponent called');

  // Get component settings
  const templateName = config.templateName || '';
  const field1 = config.field1 || '01';
  const field2 = config.field2 || '02';
  const format1 = config.format1 || '{{organization}}';
  const format2 = config.format2 || '{{status}}';

  // Parse field value to check for passthrough mode
  let fieldData: { passthrough?: boolean; regionId?: string; zoneId?: string } = {};
  try {
    if (field.value) {
      fieldData = JSON.parse(field.value);
    }
  } catch (e) {
    console.log('🏫 Could not parse field value');
  }

  // Check if passthrough mode is enabled (now stored in field value)
  const isPassthrough = fieldData.passthrough === true;

  // Get filters - either from passthrough params or from field value
  let regionId = '';
  let zoneId = '';

  if (isPassthrough) {
    // In passthrough mode, use query params from the URL
    regionId = passthroughParams.passthroughRegionId || '';
    zoneId = passthroughParams.passthroughZoneId || '';
    console.log(`🏫 Passthrough mode enabled - using URL params`);
  } else {
    // Normal mode - use field values or config defaults
    regionId = fieldData.regionId || config.defaultRegionId || '';
    zoneId = fieldData.zoneId || config.defaultZoneId || '';
  }

  console.log(`🏫 Config: templateName=${templateName}, field1=${field1}, field2=${field2}, passthrough=${isPassthrough}`);
  console.log(`🏫 Filters: regionId=${regionId}, zoneId=${zoneId}`);

  try {
    // Build query with optional filters
    let query = supabase
      .from('school_closings')
      .select('*');

    // Apply filters if provided
    if (regionId) {
      query = query.eq('region_id', regionId);
    }

    if (zoneId) {
      query = query.eq('zone_id', zoneId);
    }

    // Execute query with ordering
    const { data: closings, error } = await query.order('fetched_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching school closings:', error);
      return [];
    }

    console.log(`🏫 Found ${(closings || []).length} school closings`);

    // Generate one element per closing
    for (let i = 0; i < (closings || []).length; i++) {
      const closing = closings[i];

      // Build template variables
      const vars = {
        organization: closing.organization_name || 'N/A',
        region: closing.region_name || closing.region_id || 'N/A',
        zone: closing.zone_name || closing.zone_id || 'N/A',
        status: closing.status_description || 'Closed',
        statusDay: closing.status_day || 'N/A',
        city: closing.city || '',
        county: closing.county_name || '',
        state: closing.state || ''
      };

      // Replace template variables in format strings
      let formatted1 = format1;
      let formatted2 = format2;
      for (const [key, value] of Object.entries(vars)) {
        formatted1 = formatted1.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
        formatted2 = formatted2.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
      }

      // Create element for this closing with unique ID
      const element: {
        id: string;
        fields: { name: string; value: string }[];
        template?: string;
        duration?: string;
      } = {
        id: `${item.id}_closing_${i}`,
        fields: [
          { name: field1, value: formatted1 },
          { name: field2, value: formatted2 }
        ]
      };

      // Add template name if specified
      if (templateName) {
        element.template = templateName;
      }

      // Add duration from item if specified
      if (item.duration && item.duration > 0) {
        element.duration = item.duration.toString();
      }

      elements.push(element);
    }
  } catch (error) {
    console.error('❌ Error processing school closings:', error);
  }

  console.log(`🏫 Returning ${elements.length} elements`);
  return elements;
}

import { supabase } from '../../lib/supabase';
import { DataSource, NewDataSource } from '../../hooks/useDataSources';

/**
 * Fetch all data sources
 */
export const getDataSources = async (): Promise<DataSource[]> => {
  const { data, error } = await supabase
    .from('data_sources')
    .select('*')
    .order('name');
  
  if (error) {
    throw error;
  }
  
  return data || [];
};

/**
 * Get a single data source by ID
 */
export const getDataSource = async (id: string): Promise<DataSource> => {
  const { data, error } = await supabase
    .from('data_sources')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    throw error;
  }
  
  return data;
};

/**
 * Create a new data source
 */
export const createDataSource = async (source: NewDataSource): Promise<DataSource> => {
  const { data, error } = await supabase
    .from('data_sources')
    .insert({
      name: source.name,
      url: source.url,
      method: source.method,
      headers: source.headers || {},
      auth_required: source.auth_required || false,
      auth_type: source.auth_type,
      auth_config: source.auth_config,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    throw error;
  }
  
  return data;
};

/**
 * Update an existing data source
 */
export const updateDataSource = async (id: string, updates: Partial<DataSource>): Promise<DataSource> => {
  // Remove fields that shouldn't be updated directly
  const { id: _, created_at, updated_at, ...validUpdates } = updates;
  
  const { data, error } = await supabase
    .from('data_sources')
    .update({
      ...validUpdates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    throw error;
  }
  
  return data;
};

/**
 * Delete a data source
 */
export const deleteDataSource = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('data_sources')
    .delete()
    .eq('id', id);
  
  if (error) {
    throw error;
  }
};

/**
 * Get all data sources used by a template
 */
export const getTemplateDataSources = async (templateId: string): Promise<DataSource[]> => {
  // First, get the form schema to find data source references
  const { data: formData, error: formError } = await supabase
    .from('template_forms')
    .select('schema')
    .eq('template_id', templateId)
    .single();
  
  if (formError && formError.code !== 'PGRST116') {
    throw formError;
  }
  
  if (!formData || !formData.schema) {
    return [];
  }
  
  // Extract data source IDs from the form schema
  const schema = formData.schema;
  const dataSourceIds = new Set<string>();
  
  // Helper function to recursively search for data source references
  const findDataSourceIds = (components: any[]) => {
    if (!components || !Array.isArray(components)) return;
    
    components.forEach(component => {
      // Check common Form.io patterns for data sources
      if (component.dataSrc === 'url' && component.data?.url) {
        // Try to extract ID from data source URL patterns
        const urlMatch = component.data.url.match(/\/api\/datasource\/([a-f0-9-]+)/i);
        if (urlMatch && urlMatch[1]) {
          dataSourceIds.add(urlMatch[1]);
        }
      }
      
      // Check explicit data source ID references
      if (component.dataSourceId) {
        dataSourceIds.add(component.dataSourceId);
      }
      
      // Recursively check child components
      if (component.components) {
        findDataSourceIds(component.components);
      }
      
      // Check columns in table components
      if (component.columns && Array.isArray(component.columns)) {
        component.columns.forEach((column: any) => {
          if (column.components) {
            findDataSourceIds(column.components);
          }
        });
      }
      
      // Check rows in datatables
      if (component.rows && Array.isArray(component.rows)) {
        component.rows.forEach((row: any) => {
          if (Array.isArray(row)) {
            row.forEach((cell: any) => {
              if (cell.components) {
                findDataSourceIds(cell.components);
              }
            });
          }
        });
      }
    });
  };
  
  // Start the search with top-level components
  if (schema.components) {
    findDataSourceIds(schema.components);
  }
  
  // If no data sources are found, return empty array
  if (dataSourceIds.size === 0) {
    return [];
  }
  
  // Fetch the actual data sources
  const { data, error } = await supabase
    .from('data_sources')
    .select('*')
    .in('id', Array.from(dataSourceIds));
  
  if (error) {
    throw error;
  }
  
  return data || [];
};

/**
 * Get a Form.io compatible data source entry
 * This format is used by Form.io components to populate select options
 */
export const getFormioDataSourceEntry = (dataSource: DataSource) => {
  return {
    type: 'url',
    data: {
      url: dataSource.url,
      method: dataSource.method,
      headers: dataSource.headers || {},
      authRequired: dataSource.auth_required,
      authType: dataSource.auth_type,
      authConfig: dataSource.auth_config
    },
    valueProperty: 'value',
    labelProperty: 'label',
    dataSourceId: dataSource.id
  };
};
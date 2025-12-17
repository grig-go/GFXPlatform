import { useState, useCallback, useEffect } from 'react';
import { 
  getDataSources, 
  createDataSource, 
  updateDataSource, 
  deleteDataSource 
} from '../services/supabase/dataSources';

export interface DataSource {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  auth_required: boolean;
  auth_type?: string;
  auth_config?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface NewDataSource {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  auth_required?: boolean;
  auth_type?: string;
  auth_config?: Record<string, any>;
}

/**
 * Custom hook for managing data sources for Form.io
 */
export const useDataSources = () => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data sources
  const fetchDataSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const sources = await getDataSources();
      setDataSources(sources);
    } catch (err) {
      console.error('Error fetching data sources:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data sources');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new data source
  const addDataSource = useCallback(async (source: NewDataSource) => {
    setLoading(true);
    setError(null);
    
    try {
      const newSource = await createDataSource(source);
      setDataSources(prev => [...prev, newSource]);
      return newSource;
    } catch (err) {
      console.error('Error creating data source:', err);
      setError(err instanceof Error ? err.message : 'Failed to create data source');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update an existing data source
  const editDataSource = useCallback(async (id: string, updates: Partial<DataSource>) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedSource = await updateDataSource(id, updates);
      
      setDataSources(prev => 
        prev.map(source => 
          source.id === id ? { ...source, ...updatedSource } : source
        )
      );
      
      return updatedSource;
    } catch (err) {
      console.error('Error updating data source:', err);
      setError(err instanceof Error ? err.message : 'Failed to update data source');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a data source
  const removeDataSource = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await deleteDataSource(id);
      setDataSources(prev => prev.filter(source => source.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting data source:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete data source');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Test a data source connection
  const testDataSource = useCallback(async (source: DataSource | NewDataSource) => {
    setLoading(true);
    setError(null);
    
    try {
      // Create headers for the request
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...source.headers
      };

      // Add authorization if required
      if (source.auth_required && source.auth_type && source.auth_config) {
        if (source.auth_type === 'bearer') {
          headers['Authorization'] = `Bearer ${source.auth_config.token}`;
        } else if (source.auth_type === 'basic') {
          const { username, password } = source.auth_config;
          const basicAuth = btoa(`${username}:${password}`);
          headers['Authorization'] = `Basic ${basicAuth}`;
        }
      }

      // Make test request
      const response = await fetch(source.url, {
        method: source.method,
        headers,
        // For non-GET requests, add an empty body
        ...(source.method !== 'GET' && { body: JSON.stringify({}) })
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      // Parse response
      const data = await response.json();
      
      return {
        success: true,
        status: response.status,
        data: data
      };
    } catch (err) {
      console.error('Error testing data source:', err);
      setError(err instanceof Error ? err.message : 'Failed to test data source');
      
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data sources on mount
  useEffect(() => {
    fetchDataSources();
  }, [fetchDataSources]);

  return {
    dataSources,
    loading,
    error,
    fetchDataSources,
    addDataSource,
    editDataSource,
    removeDataSource,
    testDataSource
  };
};
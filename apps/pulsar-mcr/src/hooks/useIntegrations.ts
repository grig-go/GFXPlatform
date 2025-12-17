import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Integration
} from '../types/api';

// Get the current user's ID
const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
};

// Type guard for parent-child queries
const isParentChildQuery = (query: any): boolean => {
  return query?.mode === 'parent-child';
};

export const useIntegrations = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('data_sources')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // DEBUG: Check if data has last_sync_at
      console.log('Raw data from Supabase:', data?.[0]);
      console.log('Has last_sync_at?', data?.[0]?.last_sync_at);
      
      setIntegrations(data || []);
      
      // DEBUG: Check if state lost the field
      setTimeout(() => {
        console.log('State after setIntegrations:', integrations[0]);
        console.log('State has last_sync_at?', integrations[0]?.last_sync_at);
      }, 100);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };  

  const createIntegration = async (integration: Omit<Integration, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User must be authenticated to create integrations');
      }
      
      const integrationData = {
        ...integration,
        user_id: userId
      };
      
      const { data, error } = await supabase
        .from('data_sources')
        .insert([integrationData])
        .select()
        .single();
      
      if (error) throw error;
      setIntegrations(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const updateIntegration = async (id: string, updates: Partial<Integration>) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User must be authenticated to update integrations');
      }
      
      const updateData = {
        ...updates,
        user_id: userId,
        updated_at: new Date().toISOString()
      };
      
      // Just pass the data through - don't try to map to old columns
      const { data, error } = await supabase
        .from('data_sources')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local state
      setIntegrations(prev => prev.map(integration => 
        integration.id === id ? { ...integration, ...data } : integration
      ));
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const deleteIntegration = async (id: string) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User must be authenticated to delete integrations');
      }
      
      const { error } = await supabase
        .from('data_sources')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting integration:', error);
        throw error;
      }
      
      setIntegrations(prev => prev.filter(integration => integration.id !== id));
      return { success: true };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const refreshIntegrations = async () => {
    return fetchIntegrations();
  };

  const triggerManualSync = async (integrationId: string, force: boolean = false) => {
    try {
      // First try to find in local state
      let integration = integrations.find(i => i.id === integrationId);

      // If not found in local state, fetch from database
      if (!integration) {
        console.log('Integration not found in state, fetching from database...');
        const { data, error } = await supabase
          .from('data_sources')
          .select('*')
          .eq('id', integrationId)
          .single();

        if (error || !data) {
          throw new Error('Integration not found in database');
        }

        integration = data;
      }

      // At this point integration is guaranteed to be defined
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Update local state to show running
      setIntegrations(prev => prev.map(i =>
        i.id === integrationId
          ? { ...i, sync_status: 'running' as const }
          : i
      ));

      // Determine which sync function to call
      let functionName = 'sync-file-integration';

      if (integration.type === 'database') {
        functionName = 'sync-database-integration';
      } else if (integration.type === 'api') {
        functionName = 'sync-api-integration';
      } else if (integration.type === 'rss') {
        functionName = 'sync-rss-integration';
      }
  
      console.log(`Triggering ${functionName} for integration ${integration.name}`);
  
      // Call the appropriate edge function
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          dataSourceId: integrationId,
          force: force
        }
      });
      
      if (error) throw error;
  
      // Calculate next sync time if applicable
      let nextSyncAt = null;
      if (integration.sync_config?.enabled && integration.sync_config?.interval) {
        nextSyncAt = new Date();
        nextSyncAt.setMinutes(nextSyncAt.getMinutes() + (integration.sync_config.interval || 60));
      }
  
      // IMPORTANT: Fetch the latest status from database after sync completes
      const { data: updatedIntegration, error: fetchError } = await supabase
        .from('data_sources')
        .select('*')
        .eq('id', integrationId)
        .single();
  
      if (!fetchError && updatedIntegration) {
        // Update local state with the actual database state
        setIntegrations(prev => prev.map(i => 
          i.id === integrationId ? updatedIntegration : i
        ));
      } else {
        // Fallback: Update with what we think the status should be
        await updateIntegration(integrationId, {
          sync_status: 'success',
          last_sync_at: new Date().toISOString(),
          next_sync_at: nextSyncAt?.toISOString() || undefined
        } as any);
      }
  
      console.log('Sync completed:', data);
      
      return {
        success: true,
        itemsProcessed: data?.itemsProcessed || 0,
        message: data?.message || 'Sync completed successfully'
      };
  
    } catch (err) {
      console.error('Sync failed:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown sync error';
      
      // Always try to update status to error
      try {
        await updateIntegration(integrationId, {
          sync_status: 'error',
          last_sync_error: errorMessage
        });
      } catch (updateErr) {
        console.error('Failed to update error status:', updateErr);
      }
      
      // Update local state to show error
      setIntegrations(prev => prev.map(i => 
        i.id === integrationId 
          ? { 
              ...i, 
              sync_status: 'error' as const,
              last_sync_error: errorMessage 
            } 
          : i
      ));
  
      throw err;
    }
  };
  
  // Helper function to reset stuck syncs
  const resetStuckSync = async (integrationId: string) => {
    try {
      await updateIntegration(integrationId, {
        sync_status: 'idle',
        last_sync_error: 'Manually reset from stuck state'
      });
      
      return { success: true };
    } catch (err) {
      console.error('Failed to reset sync status:', err);
      throw err;
    }
  };

  // Helper function to get sync status for an integration
  const getSyncStatus = (integrationId: string) => {
    const integration = integrations.find(i => i.id === integrationId);
    return {
      status: integration?.sync_status || 'idle',
      lastSync: integration?.last_sync_at,
      nextSync: integration?.next_sync_at,
      lastError: integration?.last_sync_error,
      isStuck: integration?.sync_status === 'running' && 
               integration?.last_sync_at &&
               (Date.now() - new Date(integration.last_sync_at).getTime()) > 300000 // 5 minutes
    };
  };

  // Test sync configuration without saving
  const testSyncConfiguration = async (config: any) => {
    try {
      // Determine function based on config
      let functionName = 'test-sync-configuration';
      
      if (config.type === 'database' && config.database_config) {
        const queries = Object.values(config.database_config.queries || {});
        const hasParentChildQueries = queries.some(isParentChildQuery);
        functionName = hasParentChildQueries 
          ? 'test-database-parent-child' 
          : 'test-database-simple';
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { config }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Test sync failed:', err);
      throw err;
    }
  };

  return {
    integrations,
    loading,
    error,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    refreshIntegrations,
    triggerManualSync,
    resetStuckSync,
    getSyncStatus,
    testSyncConfiguration
  };
};
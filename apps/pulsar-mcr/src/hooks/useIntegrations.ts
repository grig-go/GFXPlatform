import { useState, useEffect, useCallback } from 'react';
import { supabase, sessionReady } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Integration
} from '../types/api';

// Type guard for parent-child queries
const isParentChildQuery = (query: any): boolean => {
  return query?.mode === 'parent-child';
};

export const useIntegrations = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get effective organization for impersonation support
  const { effectiveOrganization, isSuperuser, user } = useAuth();

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Wait for session to be restored from cookies before checking
      await sessionReady;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No active session - user needs to log in');
        setIntegrations([]);
        setError('Please log in to view integrations');
        return;
      }

      // Get the effective organization ID for impersonation support
      const effectiveOrgId = effectiveOrganization?.id;
      console.log('[useIntegrations] Fetching with effectiveOrgId:', effectiveOrgId);

      // Build query with organization filter for superusers
      let query = supabase
        .from('data_sources')
        .select('*')
        .order('created_at', { ascending: false });

      // For superusers, filter by effective org to support impersonation
      if (isSuperuser && effectiveOrgId) {
        query = query.eq('organization_id', effectiveOrgId);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log('[useIntegrations] Fetched integrations:', data?.length || 0, 'for org:', effectiveOrgId);
      setIntegrations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [effectiveOrganization?.id, isSuperuser]);

  useEffect(() => {
    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchIntegrations();
      } else if (event === 'SIGNED_OUT') {
        setIntegrations([]);
        setError('You must be logged in to view integrations');
      }
    });

    // Initial fetch
    fetchIntegrations();

    // Cleanup
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchIntegrations]);  

  const createIntegration = useCallback(async (integration: Omit<Integration, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      // Use user from auth context
      if (!user?.auth_user_id) {
        throw new Error('User must be authenticated to create integrations');
      }

      // Use effective organization for new integrations
      const effectiveOrgId = effectiveOrganization?.id;

      const integrationData = {
        ...integration,
        user_id: user.auth_user_id,
        organization_id: effectiveOrgId
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
  }, [user?.auth_user_id, effectiveOrganization?.id]);

  const updateIntegration = useCallback(async (id: string, updates: Partial<Integration>) => {
    try {
      // Use user from auth context
      if (!user?.auth_user_id) {
        throw new Error('User must be authenticated to update integrations');
      }

      const updateData = {
        ...updates,
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
  }, [user?.auth_user_id]);

  const deleteIntegration = useCallback(async (id: string) => {
    try {
      // Use user from auth context
      if (!user?.auth_user_id) {
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
  }, [user?.auth_user_id]);

  const refreshIntegrations = useCallback(async () => {
    return fetchIntegrations();
  }, [fetchIntegrations]);

  const triggerManualSync = useCallback(async (integrationId: string, force: boolean = false) => {
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
  }, [integrations]);

  // Helper function to reset stuck syncs
  const resetStuckSync = useCallback(async (integrationId: string) => {
    try {
      const { error } = await supabase
        .from('data_sources')
        .update({
          sync_status: 'idle',
          last_sync_error: 'Manually reset from stuck state'
        })
        .eq('id', integrationId);

      if (error) throw error;

      // Update local state
      setIntegrations(prev => prev.map(i =>
        i.id === integrationId
          ? { ...i, sync_status: 'idle' as const, last_sync_error: 'Manually reset from stuck state' }
          : i
      ));

      return { success: true };
    } catch (err) {
      console.error('Failed to reset sync status:', err);
      throw err;
    }
  }, []);

  // Helper function to get sync status for an integration
  const getSyncStatus = useCallback((integrationId: string) => {
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
  }, [integrations]);

  // Test sync configuration without saving
  const testSyncConfiguration = useCallback(async (config: any) => {
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
  }, []);

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
import { useState, useEffect } from "react";
import { APIEndpoint, Agent } from "../types/agents";
import { Feed } from "../types/feeds";
import { AgentWizard } from "./AgentWizard";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Plus,
  Search,
  Pencil,
  Copy,
  Trash2,
  ExternalLink,
  MoreVertical,
  Bot,
  RefreshCw,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import * as agentWizardApi from "../utils/agentWizardApi";
import { useToast } from "./ui/use-toast";
import { isDevelopment, SKIP_AUTH_IN_DEV, DEV_USER_ID } from "../utils/constants";
import { refreshAgentsData } from "../data/agentsData";

const novaBaseUrl = import.meta.env.VITE_NOVA_URL || '';

interface AgentsDashboardWithSupabaseProps {
  feeds?: Feed[];
}

// Helper function to convert APIEndpoint to Agent for UI compatibility
function convertAPIEndpointToAgent(endpoint: APIEndpoint): Agent {
  // Extract data sources from api_endpoint_sources relationship
  const connectedDataSources = (endpoint as any).api_endpoint_sources?.map((eps: any) => ({
    id: eps.data_source_id,
    name: eps.data_source?.name || 'Unknown Source',
    feedId: eps.data_source_id,
    category: eps.data_source?.category,
    type: eps.data_source?.type,
    // Include configuration fields so test function can access them
    api_config: eps.data_source?.api_config,
    rss_config: eps.data_source?.rss_config,
    database_config: eps.data_source?.database_config,
    file_config: eps.data_source?.file_config
  })) || [];

  // Extract all unique categories from the data sources
  const uniqueCategories = [...new Set(connectedDataSources.map((ds: any) => ds.category).filter(Boolean))];
  const dataType = uniqueCategories.length > 0 ? uniqueCategories : [];

  // Extract format options from schema_config
  // In nova-old, RSS config is stored at schema_config.schema.metadata
  const schemaConfig = endpoint.schema_config || {};
  const metadata = schemaConfig.schema?.metadata || {};

  // For RSS format, update sourceMappings based on actually connected sources
  let sourceMappings = metadata.sourceMappings || [];
  if (endpoint.output_format === 'rss' && connectedDataSources.length > 0) {
    // Get the set of connected data source IDs (database UUIDs)
    const connectedSourceIds = new Set(connectedDataSources.map((ds: any) => ds.feedId));

    // Update sourceMappings to mark sources as enabled if they're in api_endpoint_sources
    // Now that we use database UUIDs directly, mapping.sourceId will match the feedId
    sourceMappings = sourceMappings.map((mapping: any) => ({
      ...mapping,
      enabled: connectedSourceIds.has(mapping.sourceId)
    }));

    console.log('[LOAD] Connected source IDs:', Array.from(connectedSourceIds));
    console.log('[LOAD] Updated sourceMappings:', sourceMappings.map((m: any) => ({ sourceId: m.sourceId, enabled: m.enabled })));
  }

  // Merge all format-specific options from metadata
  const formatOptions = {
    // Preserve environment/deployment settings at root
    environment: schemaConfig.environment,
    autoStart: schemaConfig.autoStart,
    generateDocs: schemaConfig.generateDocs,
    // Merge all metadata (RSS, JSON, XML, CSV options)
    ...metadata,
    // Explicitly include key RSS fields for clarity
    channelTitle: metadata.channelTitle,
    channelDescription: metadata.channelDescription,
    channelLink: metadata.channelLink,
    sourceMappings: sourceMappings,
    mergeStrategy: metadata.mergeStrategy,
    maxItemsPerSource: metadata.maxItemsPerSource,
    maxTotalItems: metadata.maxTotalItems
  };

  return {
    id: endpoint.id,
    name: endpoint.name,
    description: endpoint.description,
    icon: '📡', // Default icon
    slug: endpoint.slug, // Include slug from database
    environment: schemaConfig.environment || 'production',
    autoStart: schemaConfig.autoStart !== undefined ? schemaConfig.autoStart : true,
    generateDocs: schemaConfig.generateDocs !== undefined ? schemaConfig.generateDocs : true,
    format: endpoint.output_format?.toUpperCase() as 'JSON' | 'RSS' | 'ATOM' || 'JSON',
    formatOptions: formatOptions, // Map schema_config.schema.metadata to formatOptions
    auth: endpoint.auth_config?.type || 'none',
    requiresAuth: endpoint.auth_config?.required || false,
    authConfig: endpoint.auth_config?.config || undefined, // Include auth credentials
    status: endpoint.active ? 'ACTIVE' : 'PAUSED',
    cache: endpoint.cache_config?.enabled
      ? (endpoint.cache_config.ttl === 300 ? '5M' :
         endpoint.cache_config.ttl === 900 ? '15M' :
         endpoint.cache_config.ttl === 1800 ? '30M' :
         endpoint.cache_config.ttl === 3600 ? '1H' : 'OFF')
      : 'OFF',
    url: `/api/${endpoint.slug}`,
    created: endpoint.created_at,
    // Extract data type and sources from the endpoint's relationships
    dataType: dataType as any,
    dataSources: connectedDataSources,
    relationships: [],
    fieldMappings: [],
    transforms: endpoint.transform_config?.transformations || []
  };
}

// Helper function to convert Agent back to APIEndpoint for database operations
function convertAgentToAPIEndpoint(agent: Agent): Partial<APIEndpoint> {
  const ttlMap = {
    'OFF': 0,
    '5M': 300,
    '15M': 900,
    '30M': 1800,
    '1H': 3600
  };

  // Extract environment settings from formatOptions
  const formatOptions = agent.formatOptions || {};
  const { environment, autoStart, generateDocs, ...metadata } = formatOptions;

  return {
    name: agent.name,
    slug: agent.slug || agent.url?.replace('/api/', '') || agent.name.toLowerCase().replace(/\s+/g, '-'),
    description: agent.description,
    output_format: agent.format.toLowerCase() as 'json' | 'rss' | 'xml' | 'csv' | 'custom',
    schema_config: {
      environment: agent.environment || environment || 'production',
      autoStart: agent.autoStart !== undefined ? agent.autoStart : (autoStart !== undefined ? autoStart : true),
      generateDocs: agent.generateDocs !== undefined ? agent.generateDocs : (generateDocs !== undefined ? generateDocs : true),
      // Store all format-specific options in schema.metadata (matching nova-old structure)
      schema: {
        metadata: {
          ...metadata,
          // Explicitly preserve RSS-specific fields (matching nova-old structure)
          channelTitle: metadata.channelTitle,
          channelDescription: metadata.channelDescription,
          channelLink: metadata.channelLink,
          titleField: metadata.titleField,
          descriptionField: metadata.descriptionField,
          linkField: metadata.linkField,
          pubDateField: metadata.pubDateField,
          guidField: metadata.guidField,
          mergeStrategy: metadata.mergeStrategy,
          maxItemsPerSource: metadata.maxItemsPerSource,
          maxTotalItems: metadata.maxTotalItems,
          sourceMappings: metadata.sourceMappings || []
        }
      },
      mapping: [] // Preserve mapping array structure from nova-old
    },
    transform_config: {
      transformations: agent.transforms || [],
      pipeline: []
    },
    relationship_config: {},
    cache_config: {
      enabled: agent.cache !== 'OFF',
      ttl: ttlMap[agent.cache] || 0
    },
    auth_config: {
      required: agent.requiresAuth || false,
      type: agent.auth as 'none' | 'api-key' | 'bearer' | 'basic' | 'oauth2' | 'custom',
      config: (agent as any).authConfig || {}
    },
    rate_limit_config: {
      enabled: false,
      requests_per_minute: 60
    },
    active: agent.status === 'ACTIVE'
  };
}

export function AgentsDashboardWithSupabase({
  feeds = []
}: AgentsDashboardWithSupabaseProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardKey, setWizardKey] = useState(0); // Used to force remount of wizard
  const [editingAgent, setEditingAgent] = useState<Agent | undefined>(undefined);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const { toast } = useToast();

  // Transform feeds to format expected by AgentWizard
  const availableFeeds = feeds.map(feed => ({
    id: feed.id,
    name: feed.name,
    category: feed.category
  }));

  // Cleanup unused Nova Weather, Nova Election, Nova Finance, and Nova Sports data sources
  // Uses edge function API to avoid Supabase client hangs
  const cleanupUnusedNovaSources = async () => {
    try {
      const result = await agentWizardApi.cleanupNovaSources();
      if (result.error) {
        console.error('Failed to cleanup Nova sources:', result.error);
      } else if (result.cleaned > 0) {
        console.log(result.message);
      }
    } catch (error) {
      console.error('Error during Nova sources cleanup:', error);
    }
  };

  // Load agents from database via edge function API
  const loadAgents = async (isMounted: { current: boolean } = { current: true }) => {
    const startTime = performance.now();
    console.log('[loadAgents] 🚀 Starting agents load...');

    try {
      setLoading(true);

      const queryStart = performance.now();
      // Use edge function API instead of direct Supabase client
      const result = await agentWizardApi.listAgents();

      const queryDuration = performance.now() - queryStart;
      console.log(`[loadAgents] 📥 API call completed in ${queryDuration.toFixed(0)}ms`);

      // Check if component is still mounted before updating state
      if (!isMounted.current) {
        console.log('[loadAgents] ⚠️ Component unmounted, skipping state update');
        return;
      }

      if (result.error) {
        console.error(`[loadAgents] ❌ Query failed after ${queryDuration.toFixed(0)}ms:`, result.error);
        toast({
          title: "Error",
          description: "Failed to load agents from database",
          variant: "destructive"
        });
        return;
      }

      const data = result.data;
      console.log(`[loadAgents] 📊 Received ${data?.length || 0} agents from database`);

      // Convert APIEndpoint to Agent format for UI
      const convertStart = performance.now();
      const convertedAgents = (data || []).map(convertAPIEndpointToAgent);
      const convertDuration = performance.now() - convertStart;
      console.log(`[loadAgents] 🔄 Converted agents in ${convertDuration.toFixed(0)}ms`);

      if (!isMounted.current) return;
      setAgents(convertedAgents);

      // Clean up unused Nova Weather sources after loading agents
      const cleanupStart = performance.now();
      await cleanupUnusedNovaSources();
      const cleanupDuration = performance.now() - cleanupStart;
      console.log(`[loadAgents] 🧹 Cleanup completed in ${cleanupDuration.toFixed(0)}ms`);

      const totalDuration = performance.now() - startTime;
      console.log(`[loadAgents] ✅ Agents loaded successfully in ${totalDuration.toFixed(0)}ms`, {
        count: convertedAgents.length,
      });
    } catch (error) {
      const errorDuration = performance.now() - startTime;
      console.error(`[loadAgents] ❌ Failed after ${errorDuration.toFixed(0)}ms:`, error);
      if (isMounted.current) {
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive"
        });
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Load agents on component mount
  useEffect(() => {
    const isMounted = { current: true };
    loadAgents(isMounted);
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Refresh agents
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAgents();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Agents list has been updated"
    });
  };

  const filteredAgents = agents.filter(agent => {
    const searchLower = searchTerm.toLowerCase();
    return (
      agent.name.toLowerCase().includes(searchLower) ||
      (agent.url && agent.url.toLowerCase().includes(searchLower)) ||
      agent.format.toLowerCase().includes(searchLower)
    );
  });

  // Edit agent - uses edge function API to avoid Supabase client hangs
  const handleEdit = async (agent: Agent) => {
    try {
      // Fetch the complete endpoint data with all relationships via edge function
      const result = await agentWizardApi.getAgent(agent.id);

      if (result.error) throw new Error(result.error);

      const fullEndpoint = result.data;
      console.log('Full endpoint data from API:', fullEndpoint);
      console.log('api_endpoint_sources:', fullEndpoint?.api_endpoint_sources);

      // Convert back to Agent format with full data
      const fullAgent = convertAPIEndpointToAgent(fullEndpoint);
      console.log('Converted agent:', fullAgent);
      console.log('Agent dataType:', fullAgent.dataType);
      console.log('Agent dataSources:', fullAgent.dataSources);

      setEditingAgent(fullAgent);
      setWizardOpen(true);
    } catch (error) {
      console.error('Failed to load agent details:', error);
      toast({
        title: "Error",
        description: "Failed to load agent details",
        variant: "destructive"
      });
    }
  };

  // Duplicate agent - uses edge function API to avoid Supabase client hangs
  const handleDuplicate = async (agent: Agent) => {
    try {
      const result = await agentWizardApi.duplicateAgent(agent.id);

      if (result.error) throw new Error(result.error);

      // Reload agents list
      await loadAgents();

      // Refresh agents count in App.tsx
      refreshAgentsData().catch(err => {
        console.error('Failed to refresh agents count:', err);
      });

      toast({
        title: "Success",
        description: "Agent duplicated successfully"
      });
    } catch (error) {
      console.error('Failed to duplicate agent:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate agent",
        variant: "destructive"
      });
    }
  };

  const handleWizardClose = () => {
    setWizardOpen(false);
    setEditingAgent(undefined);
    // Increment key to force fresh wizard state next time
    setWizardKey(prev => prev + 1);
  };

  // Save agent using edge function API to avoid Supabase client lock issues
  const handleWizardSave = async (agent: Agent, closeDialog: boolean = true) => {
    console.log('[DashboardSave] Starting handleWizardSave, closeDialog:', closeDialog);
    const saveStartTime = Date.now();

    try {
      // Determine data source IDs to save
      let dataSourceIds: string[] = [];

      if (agent.dataSources && agent.dataSources.length > 0) {
        // For RSS format with sourceMappings, only save enabled sources
        let sourcesToSave = agent.dataSources;

        if (agent.format === 'RSS' && agent.formatOptions?.sourceMappings) {
          const enabledSourceIds = new Set(
            agent.formatOptions.sourceMappings
              .filter((m: any) => m.enabled)
              .map((m: any) => m.sourceId)
          );

          sourcesToSave = agent.dataSources.filter((source: any) =>
            enabledSourceIds.has(source.id)
          );

          console.log('[DashboardSave] RSS enabled source IDs:', Array.from(enabledSourceIds));
        }

        dataSourceIds = sourcesToSave.map((source: any) => source.feedId || source.id).filter(Boolean);
        console.log('[DashboardSave] Data source IDs to save:', dataSourceIds);
      }

      // Use edge function API to save agent
      console.log('[DashboardSave] Calling edge function API...');
      const result = await agentWizardApi.saveAgent({
        id: editingAgent ? agent.id : undefined,
        isEdit: !!editingAgent,
        name: agent.name,
        slug: agent.slug,
        description: agent.description,
        format: agent.format || 'JSON',
        formatOptions: agent.formatOptions,
        environment: agent.environment,
        autoStart: agent.autoStart,
        generateDocs: agent.generateDocs,
        transforms: agent.transforms,
        relationships: agent.relationships,
        cache: agent.cache,
        auth: agent.auth,
        requiresAuth: agent.requiresAuth,
        authConfig: agent.authConfig,
        status: agent.status,
        dataSourceIds
      });

      console.log('[DashboardSave] API call took:', Date.now() - saveStartTime, 'ms');

      if (result.error) {
        throw new Error(result.error);
      }

      console.log('[DashboardSave] Agent saved successfully:', result.data?.id);

      // Show success toast
      toast({
        title: "Success",
        description: editingAgent ? "Agent updated successfully" : "Agent created successfully"
      });

      // Only close wizard if requested - do this BEFORE reloading to ensure clean state
      console.log('[DashboardSave] Save successful, closeDialog:', closeDialog);
      if (closeDialog) {
        console.log('[DashboardSave] Closing wizard...');
        handleWizardClose();
      }

      // Reload agents list (don't await - do in background so wizard closes immediately)
      console.log('[DashboardSave] Triggering background reload...');
      loadAgents().catch(err => {
        console.error('[DashboardSave] Failed to reload agents list:', err);
      });

      // Refresh agents count in App.tsx
      refreshAgentsData().catch(err => {
        console.error('[DashboardSave] Failed to refresh agents count:', err);
      });

      console.log('[DashboardSave] Total save time:', Date.now() - saveStartTime, 'ms');
    } catch (error) {
      console.error('[DashboardSave] Failed to save agent:', error);
      console.error('[DashboardSave] Time before error:', Date.now() - saveStartTime, 'ms');
      toast({
        title: "Error",
        description: editingAgent ? "Failed to update agent" : "Failed to create agent",
        variant: "destructive"
      });
      // Re-throw the error so the wizard knows the save failed and keeps the dialog open
      throw error;
    }
  };

  const handleDeleteAgent = async () => {
    if (!selectedAgent) return;

    try {
      // Use edge function API to delete agent
      const result = await agentWizardApi.deleteAgent(selectedAgent.id);

      if (result.error) throw new Error(result.error);

      // Reload agents list
      await loadAgents();

      // Refresh agents count in App.tsx
      refreshAgentsData().catch(err => {
        console.error('Failed to refresh agents count:', err);
      });

      toast({
        title: "Success",
        description: "Agent deleted successfully"
      });
    } catch (error) {
      console.error('Failed to delete agent:', error);
      toast({
        title: "Error",
        description: "Failed to delete agent",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedAgent(null);
    }
  };

  const openDeleteDialog = (agent: Agent) => {
    setSelectedAgent(agent);
    setDeleteDialogOpen(true);
  };

  // Toggle agent status - uses edge function API to avoid Supabase client hangs
  const toggleAgentStatus = async (agent: Agent) => {
    try {
      const newStatus = agent.status !== 'ACTIVE';
      const result = await agentWizardApi.toggleAgentStatus(agent.id, newStatus);

      if (result.error) throw new Error(result.error);

      // Update the agent in the local state without reloading the entire list
      setAgents(prevAgents =>
        prevAgents.map(a =>
          a.id === agent.id
            ? { ...a, status: (newStatus ? 'ACTIVE' : 'PAUSED') as Agent['status'] }
            : a
        )
      );

      // Refresh agents count in App.tsx
      refreshAgentsData().catch(err => {
        console.error('Failed to refresh agents count:', err);
      });

      toast({
        title: "Success",
        description: `Agent ${agent.status === 'ACTIVE' ? 'deactivated' : 'activated'}`
      });
    } catch (error) {
      console.error('Failed to toggle agent status:', error);
      toast({
        title: "Error",
        description: "Failed to update agent status",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500';
      case 'PAUSED':
        return 'bg-yellow-500';
      case 'ERROR':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEndpointUrl = (agent: Agent) => {
    return `${novaBaseUrl}${agent.url}`;
  };

  const copyEndpointUrl = (agent: Agent) => {
    const url = getEndpointUrl(agent);
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied",
      description: "URL copied to clipboard"
    });
  };

  const testEndpoint = (agent: Agent) => {
    const url = getEndpointUrl(agent);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 mb-1 text-[24px]">
            <Bot className="w-6 h-6 text-purple-600" />
            Agents
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure and manage AI-powered data agents (Connected to Supabase)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
          <Button onClick={() => setWizardOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create New Agent
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredAgents.length} of {agents.length} agents
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Agent URL</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cache</TableHead>
                <TableHead>Auth</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No agents found matching your search.' : 'No agents found. Create your first agent to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgents.map((agent) => (
                  <TableRow key={agent.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{agent.icon || '📡'}</span>
                        <span className="font-medium">{agent.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {agent.dataType && (Array.isArray(agent.dataType) ? agent.dataType.length > 0 : agent.dataType) ? (
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(agent.dataType) ? agent.dataType : [agent.dataType]).map((category, idx) => (
                            <Badge key={idx} variant="secondary">{category}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm text-muted-foreground max-w-[300px] truncate block">
                          {agent.url || 'Not configured'}
                        </code>
                        {agent.url && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => copyEndpointUrl(agent)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => testEndpoint(agent)}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{agent.format}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${getStatusColor(agent.status)} text-white cursor-pointer`}
                        onClick={() => toggleAgentStatus(agent)}
                      >
                        {agent.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{agent.cache}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{agent.auth}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(agent.created), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8"
                          onClick={() => handleEdit(agent)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8"
                          onClick={() => handleDuplicate(agent)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-destructive"
                          onClick={() => openDeleteDialog(agent)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Wizard Dialog */}
      <AgentWizard
        key={editingAgent?.id || `new-${wizardKey}`}
        open={wizardOpen}
        onClose={handleWizardClose}
        onSave={handleWizardSave}
        editAgent={editingAgent}
        availableFeeds={availableFeeds}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription className="pt-3">
              Are you sure you want to delete the agent <strong>{selectedAgent?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 text-destructive py-2">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-sm">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAgent}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
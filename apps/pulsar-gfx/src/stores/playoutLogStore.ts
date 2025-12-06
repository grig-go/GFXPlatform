import { create } from 'zustand';
import { supabase } from '@emergent-platform/supabase-client';

export interface PlayoutLogEntry {
  id: string;
  organizationId: string;

  // Channel info
  channelId: string | null;
  channelCode: string;
  channelName: string;

  // Layer info
  layerIndex: number;
  layerName?: string;

  // Page info
  pageId: string | null;
  pageName: string;

  // Template info
  templateId: string | null;
  templateName?: string;

  // Project info
  projectId: string | null;
  projectName?: string;

  // Payload snapshot
  payloadSnapshot: Record<string, any>;

  // Timing
  startedAt: Date;
  endedAt?: Date;
  durationMs?: number;

  // End reason
  endReason?: 'manual' | 'replaced' | 'cleared' | 'channel_offline';

  // Operator info
  operatorId?: string;
  operatorName?: string;

  // Trigger source
  triggerSource: 'manual' | 'playlist' | 'api' | 'scheduled';

  // Additional metadata
  metadata: Record<string, any>;

  createdAt: Date;
}

export interface PlayoutLogFilter {
  channelId?: string;
  pageId?: string;
  templateId?: string;
  operatorId?: string;
  triggerSource?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

interface PlayoutLogStore {
  logs: PlayoutLogEntry[];
  isLoading: boolean;
  error: string | null;
  filter: PlayoutLogFilter;
  totalCount: number;
  page: number;
  pageSize: number;

  // Actions
  loadLogs: () => Promise<void>;
  setFilter: (filter: Partial<PlayoutLogFilter>) => void;
  clearFilter: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Log creation (called from channelStore)
  logPlay: (params: {
    organizationId: string;
    channelId: string;
    channelCode: string;
    channelName: string;
    layerIndex: number;
    layerName?: string;
    pageId: string;
    pageName: string;
    templateId?: string;
    templateName?: string;
    projectId?: string;
    projectName?: string;
    payload?: Record<string, any>;
    operatorId?: string;
    operatorName?: string;
    triggerSource?: 'manual' | 'playlist' | 'api' | 'scheduled';
  }) => Promise<string | null>;

  logStop: (params: {
    channelId: string;
    layerIndex: number;
    endReason?: 'manual' | 'replaced' | 'cleared' | 'channel_offline';
  }) => Promise<void>;

  // Export
  exportToCsv: () => string;
}

// Helper to convert DB row to PlayoutLogEntry
function dbToEntry(row: any): PlayoutLogEntry {
  return {
    id: row.id,
    organizationId: row.organization_id,
    channelId: row.channel_id,
    channelCode: row.channel_code,
    channelName: row.channel_name,
    layerIndex: row.layer_index,
    layerName: row.layer_name,
    pageId: row.page_id,
    pageName: row.page_name,
    templateId: row.template_id,
    templateName: row.template_name,
    projectId: row.project_id,
    projectName: row.project_name,
    payloadSnapshot: row.payload_snapshot || {},
    startedAt: new Date(row.started_at),
    endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
    durationMs: row.duration_ms,
    endReason: row.end_reason,
    operatorId: row.operator_id,
    operatorName: row.operator_name,
    triggerSource: row.trigger_source,
    metadata: row.metadata || {},
    createdAt: new Date(row.created_at),
  };
}

export const usePlayoutLogStore = create<PlayoutLogStore>((set, get) => ({
  logs: [],
  isLoading: false,
  error: null,
  filter: {},
  totalCount: 0,
  page: 0,
  pageSize: 50,

  loadLogs: async () => {
    set({ isLoading: true, error: null });

    try {
      const { filter, page, pageSize } = get();

      // Build query
      let query = supabase
        .from('pulsar_playout_log')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filter.channelId) {
        query = query.eq('channel_id', filter.channelId);
      }
      if (filter.pageId) {
        query = query.eq('page_id', filter.pageId);
      }
      if (filter.templateId) {
        query = query.eq('template_id', filter.templateId);
      }
      if (filter.operatorId) {
        query = query.eq('operator_id', filter.operatorId);
      }
      if (filter.triggerSource) {
        query = query.eq('trigger_source', filter.triggerSource);
      }
      if (filter.startDate) {
        query = query.gte('started_at', filter.startDate.toISOString());
      }
      if (filter.endDate) {
        query = query.lte('started_at', filter.endDate.toISOString());
      }
      if (filter.search) {
        query = query.or(
          `page_name.ilike.%${filter.search}%,template_name.ilike.%${filter.search}%,channel_name.ilike.%${filter.search}%`
        );
      }

      // Order and paginate
      query = query
        .order('started_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const logs = (data || []).map(dbToEntry);

      set({
        logs,
        totalCount: count || 0,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load playout logs:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load logs',
        isLoading: false,
      });
    }
  },

  setFilter: (filter) => {
    set({
      filter: { ...get().filter, ...filter },
      page: 0, // Reset to first page on filter change
    });
    get().loadLogs();
  },

  clearFilter: () => {
    set({ filter: {}, page: 0 });
    get().loadLogs();
  },

  setPage: (page) => {
    set({ page });
    get().loadLogs();
  },

  setPageSize: (pageSize) => {
    set({ pageSize, page: 0 });
    get().loadLogs();
  },

  logPlay: async (params) => {
    console.log('[PlayoutLog] logPlay called with:', params);
    try {
      const insertData = {
        organization_id: params.organizationId,
        channel_id: params.channelId,
        channel_code: params.channelCode,
        channel_name: params.channelName,
        layer_index: params.layerIndex,
        layer_name: params.layerName,
        page_id: params.pageId,
        page_name: params.pageName,
        template_id: params.templateId,
        template_name: params.templateName,
        project_id: params.projectId,
        project_name: params.projectName,
        payload_snapshot: params.payload || {},
        operator_id: params.operatorId,
        operator_name: params.operatorName,
        trigger_source: params.triggerSource || 'manual',
      };
      console.log('[PlayoutLog] Inserting:', insertData);

      const { data, error } = await supabase
        .from('pulsar_playout_log')
        .insert(insertData)
        .select('id')
        .single();

      if (error) {
        console.error('[PlayoutLog] Failed to log play event:', error);
        return null;
      }

      console.log('[PlayoutLog] Successfully logged play event:', data?.id);
      return data?.id || null;
    } catch (error) {
      console.error('[PlayoutLog] Failed to log play event:', error);
      return null;
    }
  },

  logStop: async (params) => {
    try {
      // Use RPC to end active playout entries for this layer
      const { error } = await supabase.rpc('end_active_playout', {
        p_channel_id: params.channelId,
        p_layer_index: params.layerIndex,
        p_end_reason: params.endReason || 'manual',
      });

      if (error) {
        console.error('Failed to log stop event:', error);
      }
    } catch (error) {
      console.error('Failed to log stop event:', error);
    }
  },

  exportToCsv: () => {
    const { logs } = get();

    if (logs.length === 0) {
      return '';
    }

    // CSV headers
    const headers = [
      'Started At',
      'Ended At',
      'Duration (s)',
      'Channel',
      'Layer',
      'Page',
      'Template',
      'Project',
      'End Reason',
      'Trigger',
      'Operator',
    ];

    // Convert logs to CSV rows
    const rows = logs.map((log) => {
      const duration = log.durationMs ? (log.durationMs / 1000).toFixed(1) : '';
      return [
        log.startedAt.toISOString(),
        log.endedAt?.toISOString() || '',
        duration,
        `${log.channelName} (${log.channelCode})`,
        log.layerName || `Layer ${log.layerIndex + 1}`,
        log.pageName,
        log.templateName || '',
        log.projectName || '',
        log.endReason || 'active',
        log.triggerSource,
        log.operatorName || '',
      ];
    });

    // Escape CSV values
    const escapeValue = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Build CSV string
    const csvLines = [
      headers.map(escapeValue).join(','),
      ...rows.map((row) => row.map(escapeValue).join(',')),
    ];

    return csvLines.join('\n');
  },
}));

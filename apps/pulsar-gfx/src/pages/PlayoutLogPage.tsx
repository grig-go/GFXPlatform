import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Square,
  Clock,
  Radio,
  RefreshCw,
} from 'lucide-react';
import {
  Button,
  cn,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ScrollArea,
  Badge,
} from '@emergent-platform/ui';
import { usePlayoutLogStore, PlayoutLogEntry } from '@/stores/playoutLogStore';
import { useChannelStore } from '@/stores/channelStore';
import { format } from 'date-fns';

function formatDuration(ms: number | undefined): string {
  if (!ms) return '-';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function EndReasonBadge({ reason }: { reason?: string }) {
  if (!reason) {
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
        <Play className="w-3 h-3 mr-1" />
        Active
      </Badge>
    );
  }

  const variants: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    manual: {
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      icon: <Square className="w-3 h-3 mr-1" />,
      label: 'Manual',
    },
    replaced: {
      color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      icon: <RefreshCw className="w-3 h-3 mr-1" />,
      label: 'Replaced',
    },
    cleared: {
      color: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
      icon: <X className="w-3 h-3 mr-1" />,
      label: 'Cleared',
    },
    channel_offline: {
      color: 'bg-red-500/10 text-red-400 border-red-500/30',
      icon: <Radio className="w-3 h-3 mr-1" />,
      label: 'Offline',
    },
  };

  const variant = variants[reason] || variants.manual;

  return (
    <Badge variant="outline" className={variant.color}>
      {variant.icon}
      {variant.label}
    </Badge>
  );
}

function TriggerSourceBadge({ source }: { source: string }) {
  const variants: Record<string, { color: string; label: string }> = {
    manual: { color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', label: 'Manual' },
    playlist: { color: 'bg-purple-500/10 text-purple-400 border-purple-500/30', label: 'Playlist' },
    api: { color: 'bg-orange-500/10 text-orange-400 border-orange-500/30', label: 'API' },
    scheduled: { color: 'bg-pink-500/10 text-pink-400 border-pink-500/30', label: 'Scheduled' },
  };

  const variant = variants[source] || variants.manual;

  return (
    <Badge variant="outline" className={variant.color}>
      {variant.label}
    </Badge>
  );
}

export function PlayoutLogPage() {
  const navigate = useNavigate();
  const { channels } = useChannelStore();
  const {
    logs,
    isLoading,
    error,
    filter,
    totalCount,
    page,
    pageSize,
    loadLogs,
    setFilter,
    clearFilter,
    setPage,
    exportToCsv,
  } = usePlayoutLogStore();

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedTrigger, setSelectedTrigger] = useState<string>('');

  // Load logs on mount
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Apply search with debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery !== (filter.search || '')) {
        setFilter({ search: searchQuery || undefined });
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, filter.search, setFilter]);

  const handleApplyFilters = () => {
    setFilter({
      channelId: selectedChannelId || undefined,
      triggerSource: selectedTrigger || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedChannelId('');
    setStartDate('');
    setEndDate('');
    setSelectedTrigger('');
    clearFilter();
  };

  const handleExport = () => {
    const csv = exportToCsv();
    if (!csv) {
      alert('No logs to export');
      return;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `playout-log-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasActiveFilters = filter.channelId || filter.triggerSource || filter.startDate || filter.endDate || filter.search;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-14 px-4 border-b border-border flex items-center justify-between bg-card/50 shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => navigate('/workspace')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-500" />
            <h1 className="text-lg font-semibold">Playout Log</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadLogs()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={logs.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="px-4 py-3 border-b border-border bg-card/30 shrink-0">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search pages, templates, channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Filter Toggle */}
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <Badge className="ml-2 bg-cyan-500/20 text-cyan-400 border-0">
                Active
              </Badge>
            )}
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-muted-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Channel</Label>
              <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All channels</SelectItem>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name} ({channel.channelCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Trigger Source</Label>
              <Select value={selectedTrigger} onValueChange={setSelectedTrigger}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All sources</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="playlist">Playlist</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">End Date</Label>
              <div className="flex gap-2">
                <Input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 flex-1"
                />
                <Button
                  size="sm"
                  className="h-9 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                  onClick={handleApplyFilters}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading && logs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-4" />
              <p className="text-muted-foreground">Loading playout logs...</p>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-red-400">
              <p className="font-medium">Error loading logs</p>
              <p className="text-sm opacity-70">{error}</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Radio className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No playout logs found</p>
              <p className="text-sm opacity-70">
                {hasActiveFilters
                  ? 'Try adjusting your filters'
                  : 'Logs will appear here when pages are played'}
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <table className="w-full">
              <thead className="sticky top-0 bg-card/95 backdrop-blur-sm z-10">
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Layer</th>
                  <th className="px-4 py-3 font-medium">Page</th>
                  <th className="px-4 py-3 font-medium">Template</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Trigger</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <LogRow key={log.id} log={log} />
                ))}
              </tbody>
            </table>
          </ScrollArea>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="px-4 py-3 border-t border-border bg-card/50 flex items-center justify-between shrink-0">
          <div className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LogRow({ log }: { log: PlayoutLogEntry }) {
  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {format(log.startedAt, 'HH:mm:ss')}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(log.startedAt, 'MMM d, yyyy')}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="text-sm">{log.channelName}</span>
          <span className="text-xs text-muted-foreground">{log.channelCode}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm">{log.layerName || `Layer ${log.layerIndex + 1}`}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-medium">{log.pageName}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-muted-foreground">{log.templateName || '-'}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          {formatDuration(log.durationMs)}
        </div>
      </td>
      <td className="px-4 py-3">
        <EndReasonBadge reason={log.endReason} />
      </td>
      <td className="px-4 py-3">
        <TriggerSourceBadge source={log.triggerSource} />
      </td>
    </tr>
  );
}

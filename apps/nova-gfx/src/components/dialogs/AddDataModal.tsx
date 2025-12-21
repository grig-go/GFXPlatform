import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  ScrollArea,
  cn,
} from '@emergent-platform/ui';
import { Database, Check, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useDesignerStore } from '@/stores/designerStore';
import { listNovaEndpoints, fetchEndpointData } from '@/services/novaEndpointService';
import type { NovaEndpoint } from '@/types/dataEndpoint';

interface AddDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDataModal({ open, onOpenChange }: AddDataModalProps) {
  const [endpoints, setEndpoints] = useState<NovaEndpoint[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<NovaEndpoint | null>(null);
  const [fetchedData, setFetchedData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setDataSource, dataSourceId } = useDesignerStore();

  // Fetch endpoints when modal opens
  useEffect(() => {
    if (open) {
      loadEndpoints();
    } else {
      // Reset state when modal closes
      setSelectedEndpoint(null);
      setFetchedData(null);
      setError(null);
    }
  }, [open]);

  const loadEndpoints = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listNovaEndpoints(forceRefresh);
      setEndpoints(data);
    } catch (err) {
      setError('Failed to load endpoints. Please try again.');
      console.error('[AddDataModal] Failed to load endpoints:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when an endpoint is selected
  const handleSelectEndpoint = async (endpoint: NovaEndpoint) => {
    setSelectedEndpoint(endpoint);
    setFetchedData(null);
    setLoadingData(true);
    setError(null);

    try {
      const data = await fetchEndpointData(endpoint.slug);
      setFetchedData(data);
    } catch (err) {
      setError(`Failed to fetch data from ${endpoint.name}`);
      console.error('[AddDataModal] Failed to fetch endpoint data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Determine display field from data
  const getDisplayField = (data: Record<string, unknown>[]): string => {
    if (!data || data.length === 0) return '';

    const firstRecord = data[0];
    // Look for common display field patterns
    const candidates = ['name', 'title', 'label', 'State', 'Title'];

    // Check top-level fields first
    for (const candidate of candidates) {
      if (firstRecord[candidate] && typeof firstRecord[candidate] === 'string') {
        return candidate;
      }
    }

    // Check nested paths
    const nestedCandidates = ['location.name', 'game.home'];
    for (const candidate of nestedCandidates) {
      const parts = candidate.split('.');
      let val: unknown = firstRecord;
      for (const part of parts) {
        val = (val as Record<string, unknown>)?.[part];
      }
      if (val && typeof val === 'string') {
        return candidate;
      }
    }

    return '';
  };

  const handleApply = () => {
    if (selectedEndpoint && fetchedData) {
      const displayField = getDisplayField(fetchedData);
      setDataSource(
        selectedEndpoint.id,
        selectedEndpoint.name,
        fetchedData,
        displayField,
        selectedEndpoint.slug // Pass slug for refresh capability
      );
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Add Data Source
          </DialogTitle>
          <DialogDescription>
            Connect a data source from Nova to bind template elements to dynamic data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Header with refresh button */}
          <div className="flex items-center justify-between">
            <Label>Available Nova GFX Endpoints</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadEndpoints(true)}
              disabled={loading}
              className="h-7 px-2"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Endpoints List */}
          {!loading && endpoints.length > 0 && (
            <ScrollArea className="h-[200px] rounded-md border">
              <div className="p-2 space-y-1">
                {endpoints.map((endpoint) => (
                  <button
                    key={endpoint.id}
                    onClick={() => handleSelectEndpoint(endpoint)}
                    disabled={loadingData}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-md text-left transition-colors",
                      "hover:bg-accent disabled:opacity-50",
                      selectedEndpoint?.id === endpoint.id
                        ? "bg-accent border border-primary"
                        : "bg-muted/50"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{endpoint.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {endpoint.endpoint_url} • {endpoint.output_format.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {selectedEndpoint?.id === endpoint.id && loadingData && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {selectedEndpoint?.id === endpoint.id && !loadingData && fetchedData && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                      {dataSourceId === endpoint.id && selectedEndpoint?.id !== endpoint.id && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Connected</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Empty state */}
          {!loading && endpoints.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Database className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No endpoints available for Nova GFX</p>
              <p className="text-xs">Create endpoints in Nova with target_app="nova-gfx"</p>
            </div>
          )}

          {/* Preview of fetched data */}
          {selectedEndpoint && fetchedData && (
            <div className="grid gap-2">
              <Label className="flex items-center justify-between">
                <span>Preview (First Record)</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {fetchedData.length} records
                </span>
              </Label>
              <ScrollArea className="h-[120px] rounded-md border bg-muted/30">
                <pre className="p-3 text-xs font-mono">
                  {JSON.stringify(fetchedData[0], null, 2)}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedEndpoint || !fetchedData || loadingData}
          >
            {loadingData ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Apply'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

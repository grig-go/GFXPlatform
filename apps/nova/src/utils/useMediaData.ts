import { useState, useEffect, useCallback, useRef } from "react";
import { getEdgeFunctionUrl, getSupabaseAnonKey } from "./supabase/config";
import { MediaAsset, MediaType, MediaSource, SyncStatus } from "../types/media";

interface MediaFilters {
  limit?: number;
  offset?: number;
  type?: MediaType;
  source?: string;
  model?: string;
  status?: SyncStatus;
  search?: string;
}

interface MediaResponse {
  data: MediaAsset[];
  count: number;
}

interface BulkOperationResult {
  success: number;
  failed: number;
  errors: string[];
}

interface UseMediaDataReturn {
  assets: MediaAsset[];
  loading: boolean;
  error: string | null;
  count: number;
  refresh: () => Promise<void>;
  uploadAsset: (formData: FormData) => Promise<{ success: boolean; data?: any; error?: string }>;
  updateAsset: (id: string, data: Partial<MediaAsset>) => Promise<{ success: boolean; data?: any; error?: string }>;
  deleteAsset: (id: string) => Promise<{ success: boolean; error?: string }>;
  bulkDelete: (ids: string[]) => Promise<BulkOperationResult>;
  bulkAddTags: (ids: string[], tags: string[]) => Promise<BulkOperationResult>;
  bulkArchive: (ids: string[]) => Promise<BulkOperationResult>;
}

export function useMediaData(filters?: MediaFilters): UseMediaDataReturn {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const hasInitialFetch = useRef(false);

  const baseUrl = getEdgeFunctionUrl('media-library');
  const anonKey = getSupabaseAnonKey();

  console.log("📡 Media library base URL:", baseUrl);
  console.log("📡 Public Anon Key (first 20 chars):", anonKey.substring(0, 20) + "...");

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (filters?.limit) params.append("limit", filters.limit.toString());
      if (filters?.offset) params.append("offset", filters.offset.toString());
      if (filters?.type) params.append("type", filters.type);
      if (filters?.source) params.append("source", filters.source);
      if (filters?.model) params.append("model", filters.model);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.search) params.append("search", filters.search);

      const url = params.toString() ? `${baseUrl}?${params}` : baseUrl;

      console.log("📁 Fetching media assets from:", url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Check if error is related to missing table (expected on fresh database)
        if (errorData.details && (
          errorData.details.includes('relation "media_assets" does not exist') ||
          errorData.details.includes('table "media_assets" does not exist')
        )) {
          console.warn("⚠️ Media assets table does not exist yet - this is expected on a fresh database");
          setAssets([]);
          setCount(0);
          setError(null); // Don't show as error, it's expected
          setLoading(false);
          return;
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: MediaResponse = await response.json();
      
      // Transform backend data to match frontend MediaAsset type
      const transformedAssets = (result.data || []).map((asset: any) => ({
        id: asset.id,
        name: asset.name,
        description: asset.description || '',
        file_url: asset.file_url,
        thumbnail_url: asset.thumbnail_url || asset.file_url,
        file_type: asset.media_type as MediaType,
        file_size: asset.size || 0,
        dimensions: asset.dimensions,
        source: (asset.created_by?.startsWith('ai:') || asset.created_by === 'AI') ? 'ai-generated' as MediaSource : 'user-uploaded' as MediaSource,
        ai_model_used: asset.ai_model_used,
        created_by: asset.created_by,
        created_at: asset.created_at,
        tags: asset.tags || [],
        usage_count: 0,
        sync_status: (asset.media_distribution && asset.media_distribution.length > 0
          ? asset.media_distribution[0].status
          : 'synced') as SyncStatus,
        last_synced: asset.media_distribution?.[0]?.last_sync,
        distribution: asset.media_distribution || [],
        latitude: asset.latitude,
        longitude: asset.longitude,
      }));

      setAssets(transformedAssets);
      setCount(result.count || transformedAssets.length);
      
      console.log(`📁 Loaded ${transformedAssets.length} media assets`);
    } catch (err) {
      console.error("Error fetching media assets:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch media assets");
      setAssets([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, JSON.stringify(filters)]);

  const refresh = useCallback(async () => {
    await fetchAssets();
  }, [fetchAssets]);

  const uploadAsset = useCallback(async (formData: FormData): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      console.log("📤 Uploading media asset...");

      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Backend error response:", errorData);
        const errorMsg = errorData.details 
          ? `${errorData.error}: ${errorData.details}` 
          : errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      const result = await response.json();
      console.log("✅ Media asset uploaded successfully");

      // Refresh the list after upload
      await fetchAssets();

      return { success: true, data: result.data };
    } catch (err) {
      console.error("❌ Error uploading media asset:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to upload media asset",
      };
    }
  }, [baseUrl, fetchAssets]);

  const updateAsset = useCallback(async (id: string, data: Partial<MediaAsset>): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      console.log(`🔄 Updating media asset: ${id}`);

      const formData = new FormData();
      formData.append("id", id);
      if (data.name) formData.append("name", data.name);
      if (data.description !== undefined) formData.append("description", data.description);
      if (data.tags) formData.append("tags", JSON.stringify(data.tags));
      if (data.file_type) formData.append("media_type", data.file_type);
      if (data.created_by) formData.append("created_by", data.created_by);
      if (data.ai_model_used) formData.append("ai_model_used", data.ai_model_used);
      // Handle latitude and longitude - can be null to clear values
      if ('latitude' in data) formData.append("latitude", data.latitude !== null && data.latitude !== undefined ? data.latitude.toString() : '');
      if ('longitude' in data) formData.append("longitude", data.longitude !== null && data.longitude !== undefined ? data.longitude.toString() : '');

      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Update Backend error response (JSON):", JSON.stringify(errorData, null, 2));
        console.error("❌ Update Full error object:", errorData);
        const errorMsg = errorData.details 
          ? `${errorData.error}: ${errorData.details}` 
          : errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      const result = await response.json();
      console.log("✅ Media asset updated successfully");

      // Refresh the list after update
      await fetchAssets();

      return { success: true, data: result.data };
    } catch (err) {
      console.error("❌ Error updating media asset:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to update media asset",
      };
    }
  }, [baseUrl, fetchAssets]);

  const deleteAsset = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log(`🗑️ Deleting media asset: ${id}`);

      const response = await fetch(`${baseUrl}/media/${id}`, {
        method: "DELETE",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Backend error response:", errorData);
        const errorMsg = errorData.details 
          ? `${errorData.error}: ${errorData.details}` 
          : errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      console.log("✅ Media asset deleted successfully");

      // Refresh the list after deletion
      await fetchAssets();

      return { success: true };
    } catch (err) {
      console.error("❌ Error deleting media asset:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to delete media asset",
      };
    }
  }, [baseUrl, fetchAssets]);

  // Bulk operations
  const bulkDelete = useCallback(async (ids: string[]): Promise<BulkOperationResult> => {
    try {
      console.log(`🗑️ Bulk deleting ${ids.length} assets`);

      const response = await fetch(baseUrl, {
        method: "PATCH",
        mode: "cors",
        headers: {
          "Authorization": `Bearer ${anonKey}`,
          "Content-Type": "application/json",
          "apikey": anonKey,
        },
        body: JSON.stringify({
          operation: "delete",
          ids,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Could not read error");
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Bulk delete complete: ${result.success} succeeded, ${result.failed} failed`);

      // Refresh the list after bulk operation
      await fetchAssets();

      return result;
    } catch (err) {
      console.error("❌ Error in bulk delete:", err);
      return {
        success: 0,
        failed: ids.length,
        errors: [err instanceof Error ? err.message : "Failed to bulk delete"],
      };
    }
  }, [baseUrl, fetchAssets]);

  const bulkAddTags = useCallback(async (ids: string[], tags: string[]): Promise<BulkOperationResult> => {
    try {
      console.log(`🏷️ Bulk adding tags to ${ids.length} assets:`, tags);
      console.log(`🏷️ Request URL: ${baseUrl}`);
      
      const requestBody = {
        operation: "addTags",
        ids,
        data: { tags },
      };
      
      console.log(`🏷️ Request body:`, JSON.stringify(requestBody, null, 2));

      let response;
      try {
        response = await fetch(baseUrl, {
          method: "PATCH",
          mode: "cors",
          headers: {
            "Authorization": `Bearer ${anonKey}`,
            "Content-Type": "application/json",
            "apikey": anonKey,
          },
          body: JSON.stringify(requestBody),
        });
      } catch (fetchError) {
        console.error("❌ Fetch failed:", fetchError);
        throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      }

      console.log(`🏷️ Response received - status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
        } catch {
          errorText = "Could not read error response";
        }
        console.error(`❌ Response error (${response.status}):`, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Bulk tag update complete:`, result);

      // Refresh the list after bulk operation
      await fetchAssets();

      return result;
    } catch (err) {
      console.error("❌ Error in bulk tag update:", err);
      console.error("❌ Error type:", err instanceof TypeError ? "TypeError" : err instanceof Error ? err.constructor.name : typeof err);
      console.error("❌ Error details:", {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      return {
        success: 0,
        failed: ids.length,
        errors: [err instanceof Error ? err.message : "Failed to bulk update tags"],
      };
    }
  }, [baseUrl, fetchAssets]);

  const bulkArchive = useCallback(async (ids: string[]): Promise<BulkOperationResult> => {
    try {
      console.log(`📦 Bulk archiving ${ids.length} assets`);

      const response = await fetch(baseUrl, {
        method: "PATCH",
        mode: "cors",
        headers: {
          "Authorization": `Bearer ${anonKey}`,
          "Content-Type": "application/json",
          "apikey": anonKey,
        },
        body: JSON.stringify({
          operation: "archive",
          ids,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Could not read error");
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Bulk archive complete: ${result.success} succeeded, ${result.failed} failed`);

      // Refresh the list after bulk operation
      await fetchAssets();

      return result;
    } catch (err) {
      console.error("❌ Error in bulk archive:", err);
      return {
        success: 0,
        failed: ids.length,
        errors: [err instanceof Error ? err.message : "Failed to bulk archive"],
      };
    }
  }, [baseUrl, fetchAssets]);

  // Only fetch on initial mount
  useEffect(() => {
    if (!hasInitialFetch.current) {
      hasInitialFetch.current = true;
      fetchAssets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount

  return {
    assets,
    loading,
    error,
    count,
    refresh,
    uploadAsset,
    updateAsset,
    deleteAsset,
    bulkDelete,
    bulkAddTags,
    bulkArchive,
  };
}
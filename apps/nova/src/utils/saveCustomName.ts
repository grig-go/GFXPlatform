import { getEdgeFunctionUrl, getSupabaseHeaders } from './supabase/config';

/**
 * Save custom name with optimistic update and rollback support
 * Drop-in pattern from user requirements
 */
export async function saveCustomName(
  row: any,
  newName: string
): Promise<string> {
  const url = getEdgeFunctionUrl('finance_dashboard/stocks/custom-name');

  // Optimistic UI update
  const prev = row.custom_name;
  row.custom_name = newName;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: getSupabaseHeaders(),
      body: JSON.stringify({
        id: row.id ?? null,            // use UUID if you have it (not used by backend)
        symbol: row.symbol ?? null,    // fallback if you don't
        custom_name: newName ?? null,  // send null to clear
      }),
    });

    const json = await res.json().catch(() => ({}));
    
    if (!res.ok || !json.ok) {
      // Rollback UI and surface the real error
      row.custom_name = prev;
      const msg = json?.error || `HTTP ${res.status}`;
      throw new Error(`Failed to save custom name: ${msg}`);
    }

    // Normalize back to server value
    row.custom_name = json.updated?.updated_custom_name ?? newName;
    return row.custom_name;
  } catch (error) {
    // Rollback on any error
    row.custom_name = prev;
    throw error;
  }
}

/**
 * Debounced handler for display name edits
 * Call this on blur/enter events
 */
let saveTimer: any = null;

export function onDisplayNameEdit(
  row: any, 
  value: string,
  onSuccess?: (customName: string) => void,
  onError?: (error: Error) => void
) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const savedName = await saveCustomName(row, value);
      console.log("✅ Saved custom name", { symbol: row.symbol, value: savedName });
      onSuccess?.(savedName);
    } catch (e) {
      console.error("❌ Failed to save custom name:", e);
      onError?.(e as Error);
    }
  }, 300);
}
/**
 * Edge Function Entry Point for make-server-cbef71cf
 * 
 * This file imports and serves the actual server implementation from ../server/
 * Supabase Edge Functions must be deployed from /supabase/functions/<function-name>/
 * but we keep the actual implementation in /server/ for clarity.
 */

// Import everything from the actual server implementation
import "../server/index.tsx";

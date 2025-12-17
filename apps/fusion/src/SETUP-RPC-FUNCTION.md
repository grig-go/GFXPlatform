# 🔧 Action Required: Setup Supabase RPC Function

## What Changed

The Fusion app now uses a **Supabase RPC function** instead of REST API endpoints to fetch AI providers. This is more efficient and follows Supabase best practices.

## ⚠️ Action Required

You need to create the RPC function in your Supabase database. Without this, the AI provider functionality will not work.

**Note:** The app uses `get_text_providers_for_dashboard` (v1) which fetches provider information, then checks API key status separately via the backend API.

## Quick Setup (2 minutes)

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/yoxindkcapdnimcrwhux/sql/new
2. Or navigate: **Supabase Dashboard** → **SQL Editor** → **New Query**

### Step 2: Copy & Paste This SQL

```sql
CREATE OR REPLACE FUNCTION public.get_text_providers_for_dashboard(dash text)
RETURNS TABLE (
  id uuid,
  name text,
  provider_name text,
  type text,
  enabled boolean,
  model text,
  api_key text,
  dashboard_assignments jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.provider_name,
    p.type,
    p.enabled,
    p.model,
    p.api_key,
    p.dashboard_assignments,
    p.created_at,
    p.updated_at
  FROM ai_providers p
  WHERE 
    p.enabled = true
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p.dashboard_assignments) AS assignment
      WHERE 
        LOWER(assignment->>'dashboard') = LOWER(dash)
        AND (assignment->>'textProvider')::boolean = true
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_text_providers_for_dashboard(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_text_providers_for_dashboard(text) TO anon;
```

### Step 3: Run It

Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

### Step 4: Test It

Run this to verify:

```sql
SELECT * FROM public.get_text_providers_for_dashboard('fusion');
```

## ✅ Done!

Once the RPC function is created, the app will automatically use it. You'll see:
- AI provider information in the sidebar
- Proper provider configuration in the AI Settings dialog
- Working Outliers & Anomalies functionality

## Files Updated

1. **`/utils/aiProviderApi.ts`** - Now calls the RPC function
2. **`/supabase/functions/server/rpc_functions.sql`** - SQL definition
3. **`/guidelines/RPC-Setup-Instructions.md`** - Detailed guide

## Test Parameters

When calling from code:
```json
{"dash": "fusion"}
```

## Need Help?

See the full guide: `/guidelines/RPC-Setup-Instructions.md`

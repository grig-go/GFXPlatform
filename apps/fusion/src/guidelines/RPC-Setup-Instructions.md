# Supabase RPC Function Setup Instructions

This guide explains how to set up the required Supabase RPC function for the Fusion dashboard.

## Overview

The Fusion app uses a Supabase RPC (Remote Procedure Call) function to efficiently query AI providers. This function filters providers by dashboard assignment and returns only text providers.

## Setup Steps

### 1. Access Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `yoxindkcapdnimcrwhux`
3. Navigate to: **SQL Editor** (in the left sidebar)
4. Click: **New Query**

### 2. Create the RPC Function

Copy and paste the following SQL into the SQL Editor:

```sql
-- Function to get text providers for a specific dashboard
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

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.get_text_providers_for_dashboard(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_text_providers_for_dashboard(text) TO anon;
```

### 3. Execute the Query

1. Click the **Run** button (or press `Ctrl+Enter` / `Cmd+Enter`)
2. Verify you see: **Success. No rows returned**

### 4. Test the Function

Run this test query to verify it works:

```sql
SELECT * FROM public.get_text_providers_for_dashboard('fusion');
```

You should see any providers configured for the "fusion" dashboard.

## How It Works

### Function Parameters

- **dash** (text): The dashboard name to filter by (e.g., "fusion")

### Return Value

Returns a table with all matching AI providers that:
1. Are enabled (`enabled = true`)
2. Have the specified dashboard in their `dashboard_assignments`
3. Are configured as text providers (`textProvider = true`)

### Security

- `SECURITY DEFINER`: Runs with the permissions of the function creator
- Grants execute permission to both `authenticated` and `anon` roles
- This allows the frontend to call the function without additional authentication

## Frontend Integration

The frontend automatically calls this RPC function via:

```typescript
// In utils/aiProviderApi.ts
const { data, error } = await supabase.rpc('get_text_providers_for_dashboard', {
  dash: 'fusion'
});
```

## Troubleshooting

### Error: relation "ai_providers" does not exist

The `ai_providers` table hasn't been created yet. You need to create it first or seed it using the app's initialization:

1. Run the app
2. The initialization process will seed the necessary data

### Error: function does not exist

Make sure you:
1. Copied the entire SQL including the GRANT statements
2. Ran the query successfully
3. Are using the correct function name: `get_text_providers_for_dashboard`

### No results returned

This means no providers are configured for the dashboard. To fix:

1. Check if providers exist: `SELECT * FROM ai_providers;`
2. If empty, use the app's "Test AI Provider" feature to seed data
3. Or manually call the seed endpoint from the initialization

## Reference

- SQL File: `/supabase/functions/server/rpc_functions.sql`
- Frontend Usage: `/utils/aiProviderApi.ts` → `fetchAIProviders()`
- Test Parameters: `{"dash": "fusion"}`

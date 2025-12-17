# AI Provider Setup & Diagnostics Guide

## Overview

The Fusion app uses a comprehensive AI provider infrastructure with proper logging, diagnostics, and error handling based on GPT best practices for debugging multi-app Supabase deployments.

## Architecture

```
Frontend (Fusion App)
    ↓
AI Provider API (/utils/aiProviderApi.ts)
    ↓
Backend Edge Functions (/supabase/functions/server/index.tsx)
    ↓
KV Store (API Keys) + Supabase Tables (Provider Configs)
```

## Key Components

### 1. **Backend Endpoints**

- **`/ai-providers/_diag`** - Comprehensive diagnostics
  - Tests database connection
  - Tests KV store
  - Lists all providers
  - Checks Fusion provider configuration
  
- **`/ai-providers/debug`** - Provider listing with key info
  - Shows all providers
  - Checks KV store for keys
  - Masks sensitive data
  
- **`/ai-providers/fusion`** - Get Fusion-assigned provider
  - Case-insensitive dashboard matching
  - Returns enabled provider for Fusion
  
- **`/ai-providers/reveal-key`** - Retrieve unmasked API key
  - Fetches from KV store
  - Validates key format
  - Provides detailed error messages
  
- **`/ai-providers/set-key`** - Store API key
  - Saves to KV store
  - Format: `ai_provider_key:{providerId}`

### 2. **Frontend Utilities**

#### `/utils/aiProviderApi.ts`

Comprehensive API client with:
- **`logAIProviderConfig()`** - Log configuration for debugging
- **`testAIProviderConnection()`** - Test backend connectivity
- **`fetchAIProviders(dashboard)`** - Get providers for a dashboard
- **`revealAPIKey(providerId)`** - Get unmasked API key
- **`validateAPIKeyFormat(key, type)`** - Validate key format
- **`getProviderWithKey(providerId?)`** - Get provider + key in one call
- **`storeAPIKey(providerId, key)`** - Store API key

#### `/utils/geminiApi.ts`

Gemini-specific functions:
- **`getGeminiAPIKey(providerId?)`** - Auto-detects Gemini provider
- **`testGeminiAPIKey(key)`** - Validates key with Google API
- **`generateWithGemini(prompt, key?)`** - Generate text
- **`analyzeImageWithGemini(image, prompt, key?)`** - Analyze images

### 3. **Diagnostics UI**

#### `/components/AIProviderDiagnostics.tsx`

Interactive diagnostics panel that:
- Tests backend connection
- Checks database and KV store
- Fetches and validates providers
- Reveals and validates API keys
- Shows detailed test results

**Access via**: Backend Data Viewer → AI Provider Test tab

## Setup Instructions

### 1. Configure Provider in Database

```sql
-- Example: Add Gemini provider for Fusion
INSERT INTO ai_providers (
  id,
  name,
  provider_name,
  enabled,
  dashboard_assignments,
  api_key
) VALUES (
  'gemini-fusion-001',
  'Gemini for Fusion',
  'gemini',
  true,
  '[{"dashboard": "Fusion", "textProvider": true}]'::jsonb,
  NULL  -- Key stored in KV, not DB
);
```

### 2. Store API Key

```typescript
import { storeAPIKey } from '../utils/aiProviderApi';

await storeAPIKey('gemini-fusion-001', 'AIzaSyC...');
```

Or via backend:
```bash
curl -X POST "https://${PROJECT_ID}.supabase.co/functions/v1/map_data/ai-providers/set-key" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "gemini-fusion-001",
    "apiKey": "AIzaSyC..."
  }'
```

### 3. Verify Setup

Use the diagnostics tool:
```typescript
import { testAIProviderConnection } from '../utils/aiProviderApi';

const results = await testAIProviderConnection();
console.log(results);
```

Or visit: **Backend Data Viewer → AI Provider Test** tab

## Troubleshooting

### Issue: "No AI providers configured"

**Cause**: Database has no enabled providers

**Fix**:
1. Check database: `SELECT * FROM ai_providers WHERE enabled = true`
2. Add provider (see setup instructions)
3. Ensure `enabled = true`

### Issue: "No AI provider configured for Fusion dashboard"

**Cause**: Provider exists but not assigned to Fusion

**Fix**:
```sql
UPDATE ai_providers
SET dashboard_assignments = '[{"dashboard": "Fusion", "textProvider": true}]'::jsonb
WHERE id = 'your-provider-id';
```

### Issue: "No API key found for provider"

**Cause**: API key not stored in KV store

**Expected Behavior**: 
- The app will show "❌ Not configured" badge in red
- This is normal if you haven't set up an API key yet
- The check may timeout if the backend is slow (5 second timeout)
- "Failed to fetch" errors are handled gracefully

**Fix**:
```typescript
await storeAPIKey('provider-id', 'your-api-key');
```

Or use the "Test AI Provider" dialog in the sidebar to set the key.

### Issue: "Key does not match Google/Gemini format"

**Cause**: Wrong API key format

**Fix**:
- Google/Gemini keys start with `AIza`
- OpenAI keys start with `sk-`
- Anthropic keys start with `sk-ant-`

### Issue: Cross-app provider confusion

**Symptoms**: One app sees providers, another doesn't

**Causes**:
1. Different `projectId` / `publicAnonKey` pairs
2. RLS policies filtering rows
3. Case-sensitive dashboard matching

**Debugging**:
1. Check config: `logAIProviderConfig()`
2. Test backend: Hit `/_diag` endpoint
3. Verify credentials match Supabase project
4. Check dashboard name case: "Fusion" vs "fusion"

## Best Practices

### 1. **Always Use Case-Insensitive Matching**
```typescript
// Good ✅
const dashboard = 'fusion'.toLowerCase();

// Bad ❌
const dashboard = 'Fusion'; // Might not match "fusion" in DB
```

### 2. **Add Logging to All API Calls**
```typescript
console.log('[myFunction] Starting...', { params });
// ... do work
console.log('[myFunction] Success', { result });
```

### 3. **Validate API Keys**
```typescript
import { validateAPIKeyFormat } from '../utils/aiProviderApi';

if (!validateAPIKeyFormat(apiKey, 'gemini')) {
  console.warn('Key format invalid');
}
```

### 4. **Handle Errors Gracefully**
```typescript
try {
  const apiKey = await revealAPIKey(providerId);
} catch (error) {
  console.error('[revealAPIKey] Failed:', error);
  // Show user-friendly message
}
```

### 5. **Use Diagnostics First**
Before debugging in code, run diagnostics:
- Visit Backend Data Viewer
- Go to AI Provider Test tab
- Click "Run Diagnostics"
- Check all test results

## API Key Storage Format

Keys are stored in KV store with format:
```
Key: ai_provider_key:{providerId}
Value: {actual-api-key-string}
```

Example:
```
Key: ai_provider_key:gemini-fusion-001
Value: AIzaSyC1234567890abcdefghij
```

## Environment Variables (Fallback)

If KV store fails, backend checks environment:
- `GEMINI_API_KEY` or `GOOGLE_API_KEY` for Gemini
- `OPENAI_API_KEY` for OpenAI
- `ANTHROPIC_API_KEY` for Anthropic/Claude

## Security Notes

1. **Never log full API keys** - Use prefix only:
   ```typescript
   console.log('Key:', apiKey.slice(0, 10) + '...');
   ```

2. **Use KV store for keys** - Don't store in database `api_key` column

3. **Mask keys in debug endpoints** - Backend already does this

4. **RLS policies** - Ensure anon role can read providers table

## Testing Checklist

- [ ] Run diagnostics via UI
- [ ] Check backend connection (`/_diag`)
- [ ] Verify provider exists in database
- [ ] Confirm provider assigned to "Fusion" dashboard
- [ ] Verify API key in KV store
- [ ] Test key format validation
- [ ] Test actual API call (Gemini/OpenAI/etc)
- [ ] Check logs for errors
- [ ] Verify projectId/anonKey match

## Support

If issues persist:
1. Run full diagnostics
2. Check backend logs in Supabase dashboard
3. Verify database schema matches expected format
4. Test with curl to isolate frontend vs backend issues
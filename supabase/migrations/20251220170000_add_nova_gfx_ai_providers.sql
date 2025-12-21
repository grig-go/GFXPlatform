-- Add Nova-GFX AI providers for text and image generation
-- These providers are used by the Nova-GFX chat assistant

-- Nova-GFX Text Provider (Gemini-based)
INSERT INTO ai_providers (
  id,
  name,
  provider_name,
  type,
  description,
  api_key,
  endpoint,
  model,
  available_models,
  enabled,
  dashboard_assignments,
  created_at,
  updated_at
) VALUES (
  'nova-gfx-text',
  'Nova GFX Text (Gemini)',
  'gemini',
  'text',
  'Google Gemini for Nova GFX chat assistant - broadcast graphics design',
  '',  -- API key to be configured via Nova dashboard
  'https://generativelanguage.googleapis.com/v1beta',
  'gemini-2.5-flash',
  '[
    {"id": "gemini-3.0-pro", "name": "Gemini 3.0 Pro", "description": "Most intelligent Gemini model, advanced reasoning", "provider": "gemini"},
    {"id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro", "description": "Advanced reasoning model, best for complex designs", "provider": "gemini"},
    {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash", "description": "Best price-performance ratio, great balance", "provider": "gemini"},
    {"id": "gemini-2.5-flash-lite", "name": "Gemini 2.5 Flash Lite", "description": "Cost-optimized, ultra-fast for simple tasks", "provider": "gemini"}
  ]'::jsonb,
  true,
  '["nova-gfx-text"]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  available_models = EXCLUDED.available_models,
  dashboard_assignments = EXCLUDED.dashboard_assignments,
  updated_at = NOW();

-- Nova-GFX Claude Text Provider
INSERT INTO ai_providers (
  id,
  name,
  provider_name,
  type,
  description,
  api_key,
  endpoint,
  model,
  available_models,
  enabled,
  dashboard_assignments,
  created_at,
  updated_at
) VALUES (
  'nova-gfx-claude',
  'Nova GFX Text (Claude)',
  'claude',
  'text',
  'Anthropic Claude for Nova GFX chat assistant - broadcast graphics design',
  '',  -- API key to be configured via Nova dashboard
  'https://api.anthropic.com/v1',
  'claude-sonnet-4-20250514',
  '[
    {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet", "description": "Fast Claude responses, great for most tasks", "provider": "claude"},
    {"id": "claude-opus-4-20250514", "name": "Claude Opus 4.5", "description": "Most capable Claude, best for complex designs", "provider": "claude"},
    {"id": "claude-3-5-haiku-20241022", "name": "Claude Haiku", "description": "Fastest Claude responses, simple tasks", "provider": "claude"}
  ]'::jsonb,
  true,
  '["nova-gfx-text"]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  available_models = EXCLUDED.available_models,
  dashboard_assignments = EXCLUDED.dashboard_assignments,
  updated_at = NOW();

-- Nova-GFX Image Generation Provider (Gemini native image generation)
INSERT INTO ai_providers (
  id,
  name,
  provider_name,
  type,
  description,
  api_key,
  endpoint,
  model,
  available_models,
  enabled,
  dashboard_assignments,
  created_at,
  updated_at
) VALUES (
  'nova-gfx-image',
  'Nova GFX Image (Gemini)',
  'gemini',
  'image-generation',
  'Google Gemini for Nova GFX AI image generation',
  '',  -- API key to be configured via Nova dashboard
  'https://generativelanguage.googleapis.com/v1beta',
  'gemini-2.5-flash-image',
  '[
    {"id": "gemini-3-pro-image-preview", "name": "Gemini 3 Pro Image (Nano Banana Pro)", "description": "Professional asset production, up to 4K, advanced reasoning", "provider": "gemini"},
    {"id": "gemini-2.5-flash-image", "name": "Gemini 2.5 Flash Image (Nano Banana)", "description": "Fast image generation, 1024px, optimized for speed", "provider": "gemini"},
    {"id": "imagen-3.0-generate-002", "name": "Imagen 3", "description": "High quality image generation ($0.03/image)", "provider": "gemini"}
  ]'::jsonb,
  true,
  '["nova-gfx-image"]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  available_models = EXCLUDED.available_models,
  dashboard_assignments = EXCLUDED.dashboard_assignments,
  updated_at = NOW();

-- Add comments for documentation
COMMENT ON TABLE ai_providers IS 'AI provider configurations for all apps (Nova, Nova-GFX, Pulsar-VS, etc.)';

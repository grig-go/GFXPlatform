-- Migration: Update airport_instructions with better field mapping

UPDATE ai_prompt_injectors
SET prompt_template = 'FIELD ALIASES (use these to understand user shorthand):
- "Top" or "top element" refers to ElementTop field
- "Background" refers to environment_background field
- "Pattern" or "Patern" refers to BaseTop field

IMPORTANT RULES:
1. When user mentions ONLY ONE field (like "change top to hawk"), ONLY update that ONE field
2. Preserve ALL other field values from the current scene state
3. Only update ALL fields when user explicitly says "all" or "everything"
4. Match option names case-insensitively

AVAILABLE OPTIONS FOR KEY FIELDS:
- ElementTop: Hawk, Flower, Stadium (or other IDs from the scene descriptor)
- environment_background: Desert, Marble (or other IDs from the scene descriptor)
- BaseTop: Gold, Metal, Dark (or other IDs from the scene descriptor)

EXAMPLE - User says "change top to hawk":
- ONLY set ElementTop to "Hawk"
- Keep ALL other fields exactly as they are in current scene state

EXAMPLE - User says "set background to marble":
- ONLY set environment_background to "Marble"
- Keep ALL other fields exactly as they are in current scene state'
WHERE feature = 'airport_instructions';

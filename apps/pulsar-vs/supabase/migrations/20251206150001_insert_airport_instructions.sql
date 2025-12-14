-- Migration: Insert airport_instructions default data
-- This must run in a separate transaction after the enum value is added

INSERT INTO ai_prompt_injectors (feature, prompt_template, is_enabled)
VALUES
    ('airport_instructions', 'When updating scene configuration for Airport projects:

FIELD ALIASES:
- "Top" refers to ElementTop (options: Hawk, Flower, Stadium)
- "Background" refers to environment_background (options: Desert, Marble)
- "Pattern" or "Patern" refers to BaseTop (options: Gold, Metal, Dark)

IMPORTANT RULES:
- Only update the specific field mentioned, not all fields
- Only update ALL fields when the user explicitly says "all"
- Match option names case-insensitively (e.g., "hawk" = "Hawk")

EXAMPLE COMMANDS:
- "Set top to hawk" → Only update ElementTop to hawk
- "Change background to desert" → Only update environment_background to desert
- "Use gold pattern" → Only update BaseTop to gold
- "Set all to default" → Update all fields', true)
ON CONFLICT (feature) DO NOTHING;

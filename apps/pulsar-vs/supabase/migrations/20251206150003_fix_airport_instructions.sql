-- Migration: Fix airport_instructions with correct option ID mappings

UPDATE ai_prompt_injectors
SET prompt_template = 'FIELD ALIASES (shortcuts users may say):
- "Top" or "top element" → ElementTop field
- "Background" → environment_background field
- "Pattern" → BaseTop field

OPTION ID MAPPINGS (you must return the option ID, not the name):
- ElementTop: "option1"=Camel Up, "option2"=Hawk, "option3"=Camel Down, "option4"=Tea Pot, "option5"=Stadium, "option6"=Aspire Tower, "option7"=Tornado Tower, "option8"=Flower
- environment_background: "option1"=Desert, "option2"=Marble
- BaseTop: "option1"=Metal, "option2"=Dark, "option3"=Gold

IMPORTANT RULES:
1. When user mentions ONE field, ONLY update that field - keep all others unchanged
2. Return option IDs like "option1", "option2" - NOT names like "Hawk" or "Marble"
3. Only update ALL fields when user says "all" or "everything"

EXAMPLES:
- "change top to hawk" → Set ElementTop to "option2", keep everything else
- "set background to marble" → Set environment_background to "option2", keep everything else
- "use gold pattern" → Set BaseTop to "option3", keep everything else
- "stadium on top" → Set ElementTop to "option5", keep everything else'
WHERE feature = 'airport_instructions';

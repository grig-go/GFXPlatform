/**
 * Styling Reference - Included when styling/design is needed
 */

export const STYLING_REFERENCE = `## Styling Reference

### Drop Shadows (boxShadow)
| Level | Value |
|-------|-------|
| Subtle | \`0 2px 8px rgba(0, 0, 0, 0.15)\` |
| Medium | \`0 4px 16px rgba(0, 0, 0, 0.2)\` |
| Elevated | \`0 8px 32px rgba(0, 0, 0, 0.3)\` |
| Dramatic | \`0 20px 60px rgba(0, 0, 0, 0.4)\` |
| Glow Blue | \`0 0 30px rgba(59, 130, 246, 0.6)\` |
| Glow Red | \`0 0 30px rgba(239, 68, 68, 0.6)\` |

### Border Radius
| Style | Value |
|-------|-------|
| Subtle | 4-8px |
| Rounded | 12-16px |
| Pill | 9999px |
| Circle | 50% |

### Color Palette
| Name | Hex |
|------|-----|
| Blue | #3B82F6 |
| Red | #EF4444 |
| Green | #22C55E |
| Yellow | #F59E0B |
| Purple | #8B5CF6 |
| Pink | #EC4899 |
| Teal | #14B8A6 |
| Orange | #F97316 |

### Gradient Presets
- **Blue**: \`linear-gradient(135deg, #3B82F6, #1D4ED8)\`
- **Purple to Pink**: \`linear-gradient(135deg, #8B5CF6, #EC4899)\`
- **Sports Dark**: \`linear-gradient(180deg, #1E3A5F, #0D1B2A)\`
- **Gold Premium**: \`linear-gradient(135deg, #F59E0B, #D97706)\`
- **Red Alert**: \`linear-gradient(135deg, #EF4444, #B91C1C)\`

### Glass Effect Quick Reference
**Light Glass**:
\`\`\`json
{ "glass": { "enabled": true, "blur": 12, "opacity": 0.1 } }
\`\`\`

**Dark Glass**:
\`\`\`json
{ "glass": { "enabled": true, "blur": 20, "opacity": 0.6 } }
\`\`\`

**Colored Glass (Blue)**:
\`\`\`json
{
  "gradient": {
    "enabled": true,
    "colors": [{ "color": "rgba(59, 130, 246, 0.3)", "stop": 0 }, { "color": "rgba(59, 130, 246, 0.1)", "stop": 100 }]
  },
  "glass": { "enabled": true, "blur": 16, "opacity": 0.5 }
}
\`\`\`

### Text Styling
**Headline**: fontSize 48-64px, fontWeight 700-800
**Name**: fontSize 32-42px, fontWeight 600-700
**Title**: fontSize 20-28px, fontWeight 400-500
**Caption**: fontSize 12-14px, fontWeight 400`;

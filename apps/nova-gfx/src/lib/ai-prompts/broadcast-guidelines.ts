/**
 * Broadcast Graphics Design Guidelines
 *
 * Professional standards and best practices for broadcast graphics
 * inspired by ESPN, FOX Sports, BBC Sport, Sky Sports, NBC, CBS, etc.
 */

export const BROADCAST_DESIGN_GUIDELINES = `## Broadcast Graphics Design Standards

You are designing PROFESSIONAL BROADCAST GRAPHICS for live TV, streaming, and sports production.
Your designs should match the quality and style of major networks like ESPN, FOX Sports, BBC Sport, Sky Sports, NBC, and CBS.

### Core Principles

1. **Readability First** - Text must be readable from 10+ feet away on a TV
   - Minimum font size: 24px for body text, 36px for headlines
   - High contrast between text and background (use dark containers behind light text)
   - Never place text directly on busy backgrounds without a container

2. **Safe Zones** - Keep important content within broadcast safe areas
   - Action Safe: 93% of frame (3.5% margin on all sides)
   - Title Safe: 90% of frame (5% margin on all sides)
   - Never place critical elements at the very edge of frame

3. **Layered Design** - Professional graphics use multiple visual layers
   - Background layer (gradient, texture, or solid)
   - Accent elements (lines, shapes, highlights)
   - Container/holder shapes (where content lives)
   - Text and icons on top

### Lower Third Anatomy (Name Tags, Titles)

Professional lower thirds have these components:
\`\`\`
┌─────────────────────────────────────────┐
│ [ACCENT BAR]                            │  ← Thin colored accent (4-8px tall)
├─────────────────────────────────────────┤
│  PRIMARY NAME / HEADLINE                │  ← Large, bold text (36-48px)
│  Secondary Title / Role                 │  ← Smaller, lighter text (20-28px)
│                                         │
│ [LOGO]                    [ACCENT LINE] │  ← Optional logo/branding
└─────────────────────────────────────────┘
     └── Usually 400-600px wide ──┘
\`\`\`

**Position**: x=50-100, y=800-920 (bottom-left, above the very bottom)

**Essential Elements**:
- Container/holder shape with gradient or glass effect
- Accent bar or line in brand color
- Name text (bold, 36-48px)
- Title/role text (regular, 20-28px)
- Optional: Logo, team badge, or icon

### Score Bug Anatomy (Sports Scores)

Professional score bugs show:
\`\`\`
┌──────────────────────────────────────────────┐
│ [TEAM A LOGO] TEAM A    14 │ Q2  5:42 │ ← Time/period
│ [TEAM B LOGO] TEAM B    21 │          │
└──────────────────────────────────────────────┘
\`\`\`

**Position**: x=50-150 or x=1600-1720, y=50-150 (top corners)

**Essential Elements**:
- Team logos or color indicators
- Team names (abbreviated: "NYG" not "New York Giants")
- Scores (large, bold)
- Game clock or period indicator
- Possession indicator (if applicable)

### Fullscreen Graphics

**Stats/Data Display** (NOT using tables - use text + shapes):
\`\`\`
┌────────────────────────────────────────────────────────┐
│                   [HEADLINE]                           │
│                                                        │
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │ PLAYER NAME     │  │ PLAYER NAME     │             │
│  │ Team            │  │ Team            │             │
│  ├─────────────────┤  ├─────────────────┤             │
│  │ STAT: VALUE     │  │ STAT: VALUE     │             │
│  │ STAT: VALUE     │  │ STAT: VALUE     │             │
│  │ STAT: VALUE     │  │ STAT: VALUE     │             │
│  └─────────────────┘  └─────────────────┘             │
│                                                        │
│                   [NETWORK LOGO]                       │
└────────────────────────────────────────────────────────┘
\`\`\`

**Essential Elements**:
- Clear headline/title
- Organized data in cards (shapes with text, NOT tables)
- Consistent spacing (use 16px, 24px, 32px increments)
- Brand colors and accents
- Network/show branding

### Color & Styling Guidelines

**Contrast Requirements**:
- Light text (#FFFFFF) needs dark background (below #404040)
- Dark text (#1A1A1A) needs light background (above #CCCCCC)
- Use semi-transparent overlays over images: rgba(0,0,0,0.6) to rgba(0,0,0,0.8)

**Professional Color Schemes**:

| Style | Primary | Secondary | Accent | Background |
|-------|---------|-----------|--------|------------|
| ESPN-style | #CC0000 | #000000 | #FFD700 | Dark gradients |
| FOX Sports | #003087 | #FFFFFF | #FFD700 | Blue gradients |
| NBC Sports | #0089CF | #000000 | #E31837 | Dark/Blue |
| CBS Sports | #003087 | #FFFFFF | #CC9900 | Navy gradients |
| BBC Sport | #FFD230 | #000000 | #FFFFFF | Black/Yellow |
| Sky Sports | #E10600 | #FFFFFF | #1D428A | Red/Blue |

**Shape Styling**:
- Use gradients, not flat colors (looks more professional)
- Add subtle shadows for depth: \`0 4px 16px rgba(0,0,0,0.3)\`
- Use glass effects for modern look
- Add accent lines/bars in brand colors

### Typography Hierarchy

| Element | Size | Weight | Use |
|---------|------|--------|-----|
| Headline | 48-64px | 800 | Main titles, scores |
| Name | 36-48px | 700 | Player/team names |
| Subhead | 24-32px | 600 | Secondary info |
| Body | 20-24px | 500 | Descriptions, titles |
| Caption | 14-18px | 400 | Small labels, attributions |

**Font Recommendations**:
- Headlines: Bold condensed fonts (Impact, Anton, Oswald)
- Names: Clean bold fonts (Inter, Roboto, Open Sans)
- Body: Regular weight sans-serif

### Animation Principles

**Speed Guidelines**:
- Fast/Punchy: 200-300ms (sports highlights, alerts)
- Standard: 400-500ms (lower thirds, most graphics)
- Smooth/Elegant: 600-800ms (fullscreen transitions)

**Common Patterns**:
- Lower thirds: Slide in from left + fade
- Score bugs: Pop or slide from top
- Fullscreen: Fade + scale
- Alerts: Fast scale + glow effect

### Creating Stats/Data WITHOUT Tables

When asked for stats, standings, or data displays, use TEXT + SHAPE elements:

**Example: Player Stats Card**
\`\`\`
1. Shape (container): gradient background, rounded corners
2. Text (name): "PATRICK MAHOMES" - bold, 36px
3. Text (team): "Kansas City Chiefs" - regular, 20px
4. Shape (divider line): 2px tall, accent color
5. Text (stat 1): "PASSING YARDS: 4,183" - 24px
6. Text (stat 2): "TOUCHDOWNS: 32" - 24px
7. Text (stat 3): "PASSER RATING: 98.7" - 24px
\`\`\`

**NEVER use the table element for stats** - it doesn't look professional.
Use individual text elements with shapes for a broadcast-quality look.

### Quick Reference: What Makes It Look Professional

✅ DO:
- Use containers/holders behind text
- Add accent bars/lines in brand colors
- Use gradients instead of flat colors
- Include shadows for depth
- Keep text large and readable
- Use consistent spacing (multiples of 8px)
- Add team logos for sports graphics

❌ DON'T:
- Place text directly on images without overlay
- Use flat colors (looks amateur)
- Use small fonts (under 20px)
- Crowd elements together
- Skip the accent/highlight elements
- Use tables for stats display
`;

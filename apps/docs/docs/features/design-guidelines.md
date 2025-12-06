---
sidebar_position: 6
---

# Design Guidelines

The Design Guidelines system defines your brand identity, ensuring consistency across all graphics. Configure colors, typography, spacing, and animations that the AI assistant and your team will use.

## Overview

Design Guidelines provide:

- **Brand Consistency**: Enforced color palettes and typography
- **AI Context**: AI uses guidelines for suggestions
- **Team Alignment**: Shared design language
- **Quick Styling**: Pre-configured design tokens

## Accessing Design Guidelines

1. Click **Settings** in the top bar
2. Select **Design Guidelines**
3. Or use keyboard shortcut

## Settings Tabs

### Options Tab

```
┌─────────────────────────────────────────────────────┐
│  Design System Options                              │
├─────────────────────────────────────────────────────┤
│  Enabled Sections                                   │
│  ☑️  Colors                                         │
│  ☑️  Typography                                     │
│  ☑️  Spacing                                        │
│  ☑️  Animation                                      │
│  ☑️  Text Treatments                               │
├─────────────────────────────────────────────────────┤
│  Import/Export                                      │
│  [Import Design System]  [Export Design System]     │
└─────────────────────────────────────────────────────┘
```

Enable or disable sections as needed. Export to share with team members.

### Colors Tab

Configure your brand color palette:

```
┌─────────────────────────────────────────────────────┐
│  Color Palette                                      │
├─────────────────────────────────────────────────────┤
│  Primary Colors                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│  │ 50  │ │ 100 │ │ 500 │ │ 700 │ │ 900 │          │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │
│                                                     │
│  Secondary Colors                                   │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│  │ 50  │ │ 100 │ │ 500 │ │ 700 │ │ 900 │          │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │
│                                                     │
│  Accent Colors                                      │
│  [+ Add Color]                                      │
│                                                     │
│  Preset Palettes                                    │
│  [News Blue] [Sports Red] [Corporate] [Custom]      │
└─────────────────────────────────────────────────────┘
```

#### Color Properties

| Property | Description |
|----------|-------------|
| **Primary** | Main brand color (headlines, buttons) |
| **Secondary** | Supporting color (backgrounds, accents) |
| **Accent** | Highlight color (CTAs, alerts) |
| **Neutral** | Gray scale (text, borders) |

#### Preset Palettes

Pre-configured color schemes:

| Palette | Primary | Secondary | Use Case |
|---------|---------|-----------|----------|
| News Blue | #1E40AF | #3B82F6 | News broadcasts |
| Sports Red | #DC2626 | #F97316 | Sports coverage |
| Corporate | #0F172A | #64748B | Business/corporate |
| Emerald | #059669 | #10B981 | Nature/environment |

### Typography Tab

Configure fonts and text styles:

```
┌─────────────────────────────────────────────────────┐
│  Typography                                         │
├─────────────────────────────────────────────────────┤
│  Font Pairing                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │ (●) Inter + Inter                            │   │
│  │ ( ) Montserrat + Open Sans                   │   │
│  │ ( ) Roboto + Roboto                          │   │
│  │ ( ) Playfair Display + Source Sans Pro       │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Heading Font: Inter                                │
│  Body Font: Inter                                   │
│                                                     │
│  Font Weights                                       │
│  ☑️ Regular (400)  ☑️ Medium (500)                  │
│  ☑️ Semibold (600) ☑️ Bold (700)                    │
│                                                     │
│  Base Font Size: [16] px                           │
└─────────────────────────────────────────────────────┘
```

#### Font Pairings

| Pairing | Heading | Body | Style |
|---------|---------|------|-------|
| Modern Sans | Inter | Inter | Clean, professional |
| Classic | Montserrat | Open Sans | Friendly, readable |
| Tech | Roboto | Roboto Mono | Technical, precise |
| Editorial | Playfair Display | Source Sans | Elegant, editorial |

### Spacing Tab

Configure grid and spacing tokens:

```
┌─────────────────────────────────────────────────────┐
│  Spacing Grid                                       │
├─────────────────────────────────────────────────────┤
│  Base Unit: [8] px                                  │
│                                                     │
│  Spacing Scale                                      │
│  xs:  [4] px   (0.5x)                              │
│  sm:  [8] px   (1x)                                │
│  md:  [16] px  (2x)                                │
│  lg:  [24] px  (3x)                                │
│  xl:  [32] px  (4x)                                │
│  2xl: [48] px  (6x)                                │
│                                                     │
│  Safe Margins                                       │
│  Top: [60] px    Bottom: [60] px                   │
│  Left: [80] px   Right: [80] px                    │
└─────────────────────────────────────────────────────┘
```

#### Spacing Tokens

| Token | Default | Use Case |
|-------|---------|----------|
| `xs` | 4px | Tight spacing, inline elements |
| `sm` | 8px | Standard spacing |
| `md` | 16px | Component padding |
| `lg` | 24px | Section spacing |
| `xl` | 32px | Large gaps |
| `2xl` | 48px | Hero spacing |

### Animation Tab

Configure animation presets:

```
┌─────────────────────────────────────────────────────┐
│  Animation Presets                                  │
├─────────────────────────────────────────────────────┤
│  Default Easing                                     │
│  (●) ease-out      ( ) ease-in                     │
│  ( ) ease-in-out   ( ) linear                      │
│  ( ) custom cubic-bezier                           │
│                                                     │
│  Custom Bezier: [0.4, 0, 0.2, 1]                   │
│                                                     │
│  Duration Presets                                   │
│  Fast:    [200] ms                                 │
│  Normal:  [300] ms                                 │
│  Slow:    [500] ms                                 │
│                                                     │
│  IN Animation Duration:  [400] ms                  │
│  OUT Animation Duration: [300] ms                  │
└─────────────────────────────────────────────────────┘
```

#### Easing Presets

| Easing | Cubic-Bezier | Feel |
|--------|--------------|------|
| `ease-out` | (0, 0, 0.2, 1) | Natural deceleration |
| `ease-in` | (0.4, 0, 1, 1) | Accelerating |
| `ease-in-out` | (0.4, 0, 0.2, 1) | Smooth both ends |
| `linear` | (0, 0, 1, 1) | Constant speed |
| `bounce` | (0.68, -0.55, 0.27, 1.55) | Bouncy |

### Text Treatments Tab

Pre-configured text style combinations:

```
┌─────────────────────────────────────────────────────┐
│  Text Treatments                                    │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐   │
│  │ Headline Primary                             │   │
│  │ Font: Inter Bold, 48px                       │   │
│  │ Color: Primary 900                           │   │
│  │ Shadow: 2px 2px 4px rgba(0,0,0,0.3)         │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ Body Text                                    │   │
│  │ Font: Inter Regular, 24px                    │   │
│  │ Color: Neutral 700                           │   │
│  │ Line Height: 1.5                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [+ Add Treatment]                                  │
└─────────────────────────────────────────────────────┘
```

#### Default Treatments

| Treatment | Size | Weight | Use Case |
|-----------|------|--------|----------|
| Headline Primary | 48px | Bold | Main titles |
| Headline Secondary | 36px | Semibold | Subtitles |
| Body | 24px | Regular | General text |
| Caption | 18px | Regular | Small labels |
| Lower Third Name | 32px | Bold | Name straps |
| Lower Third Title | 24px | Regular | Title/role |

## AI Integration

Design Guidelines are automatically passed to the AI:

### AI Respects Guidelines

When you ask AI to create graphics:

```
User: "Create a lower third"

AI uses:
- Primary color for background
- Heading font for name
- Body font for title
- Standard spacing
- Configured IN animation duration
```

### Override in Prompts

You can override guidelines in specific requests:

```
"Create a lower third but use red instead of our brand color"
```

## Import/Export

### Export Design System

1. Click **Export Design System**
2. Save the JSON file
3. Share with team members

### Import Design System

1. Click **Import Design System**
2. Select a JSON file
3. Guidelines are applied

### JSON Structure

```json
{
  "colors": {
    "primary": { "50": "#eff6ff", "500": "#3b82f6", "900": "#1e3a8a" },
    "secondary": { "50": "#f8fafc", "500": "#64748b", "900": "#0f172a" },
    "accent": { "500": "#f97316" }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "baseSize": 16
  },
  "spacing": {
    "baseUnit": 8,
    "scale": { "xs": 4, "sm": 8, "md": 16, "lg": 24, "xl": 32 }
  },
  "animation": {
    "defaultEasing": "ease-out",
    "inDuration": 400,
    "outDuration": 300
  }
}
```

## Best Practices

### Initial Setup

1. **Start with Preset**: Choose closest preset palette
2. **Customize Colors**: Adjust to match brand exactly
3. **Select Fonts**: Pick appropriate font pairing
4. **Test**: Create sample graphics to verify

### Team Workflow

1. **Design Lead**: Configures design system
2. **Export**: Share JSON with team
3. **Import**: Team members import settings
4. **Consistency**: Everyone uses same guidelines

### AI Workflow

1. **Configure First**: Set up guidelines before using AI
2. **Trust AI**: Let AI apply guidelines automatically
3. **Override When Needed**: Specify exceptions in prompts
4. **Iterate**: Refine guidelines based on results

## Related Features

- [AI Assistant](/docs/features/ai-assistant) - AI uses design guidelines
- [AI Configuration](/docs/features/ai-configuration) - AI model settings
- [Project Settings](/docs/features/project-settings) - Project configuration

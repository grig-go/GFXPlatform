---
sidebar_position: 14
---

# Topic Badge Element

The Topic Badge element displays category labels for news topics, typically used alongside ticker elements to indicate content categories like "Breaking", "Sports", "Finance", etc.

## Overview

Topic Badge elements support:

- **Pre-configured Topics**: News, Sports, Finance, Weather, and more
- **Ticker Integration**: Auto-sync with ticker element topics
- **Custom Styling**: Override colors, icons, and animations
- **Animations**: Pulse, flash, and glow effects

## Creating a Topic Badge

1. Click **Topic Badge** in the Elements menu
2. A default "News" badge appears
3. Configure topic and styling in Properties panel

## Properties

### Basic Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `defaultTopic` | string | `news` | Pre-configured topic type |
| `customLabel` | string | - | Override label text |
| `showIcon` | boolean | true | Display topic icon |
| `animated` | boolean | true | Enable badge animation |

### Ticker Integration

| Property | Type | Description |
|----------|------|-------------|
| `linkedTickerId` | string | ID of ticker to sync with |

When linked, badge automatically updates to show the current ticker item's topic.

### Custom Styling

```typescript
customStyle: {
  label: string;              // Custom label text
  backgroundColor: string;    // Background color
  textColor: string;          // Text color
  icon: string;               // Icon name
  borderColor: string;        // Border color
  animation: string;          // Animation type
  fontSize: string;           // Font size
  fontFamily: string;         // Font family
  fill: string;               // Alternative fill color
  gradient: GradientConfig;   // Gradient settings
  glass: GlassConfig;         // Glassmorphism effect
}
```

## Topic Types

### Pre-configured Topics

| Type | Label | Color | Icon |
|------|-------|-------|------|
| `news` | NEWS | Blue | Newspaper |
| `breaking` | BREAKING | Red | AlertTriangle |
| `sports` | SPORTS | Green | Trophy |
| `finance` | FINANCE | Emerald | TrendingUp |
| `weather` | WEATHER | Cyan | Cloud |
| `entertainment` | ENTERTAINMENT | Pink | Star |
| `politics` | POLITICS | Purple | Landmark |
| `tech` | TECH | Indigo | Cpu |
| `health` | HEALTH | Rose | Heart |
| `world` | WORLD | Slate | Globe |
| `local` | LOCAL | Amber | MapPin |
| `alert` | ALERT | Red (pulse) | Bell |
| `live` | LIVE | Red (pulse) | Radio |
| `custom` | Custom | Configurable | Configurable |

### Topic Configuration

Each topic has default styling:

```typescript
// Example: Breaking topic
{
  label: 'BREAKING',
  backgroundColor: '#DC2626',
  textColor: '#FFFFFF',
  icon: 'AlertTriangle',
  animation: 'pulse'
}
```

## Animations

### Available Animations

| Animation | Description |
|-----------|-------------|
| `none` | Static badge |
| `pulse` | Gentle scaling pulse |
| `flash` | Opacity flash effect |
| `glow` | Glowing border effect |

### Animated Topics

Some topics have default animations:
- **Alert**: Pulse animation
- **Live**: Pulse animation
- **Breaking**: Flash animation

## Ticker Integration

### Linking to Ticker

1. Create a ticker element
2. Create a topic badge
3. Set `linkedTickerId` to the ticker's ID

```typescript
{
  type: 'topic-badge',
  linkedTickerId: 'ticker-element-id'
}
```

### Auto-Sync Behavior

When linked:
- Badge updates when ticker item changes
- Shows current item's topic
- Inherits topic styling automatically

## Animation Properties

| Property | Description |
|----------|-------------|
| `opacity` | Fade badge in/out |
| `scale_x` | Scale horizontally |
| `scale_y` | Scale vertically |
| `rotation` | Rotate badge |
| `background_color` | Animate background |

## Use Cases

### News Lower Third

Badge above ticker:

```
┌──────────────┐
│  BREAKING    │  ← Topic Badge
└──────────────┘
│ Breaking news content scrolling... │  ← Ticker
```

### Category Indicator

Static category label:

```typescript
{
  type: 'topic-badge',
  defaultTopic: 'sports',
  animated: false
}
```

### Live Indicator

Pulsing live badge:

```typescript
{
  type: 'topic-badge',
  defaultTopic: 'live',
  animated: true
}
```

### Custom Topic

Brand-specific category:

```typescript
{
  type: 'topic-badge',
  defaultTopic: 'custom',
  customStyle: {
    label: 'EXCLUSIVE',
    backgroundColor: '#7C3AED',
    textColor: '#FFFFFF',
    icon: 'Sparkles',
    animation: 'glow'
  }
}
```

## Styling Examples

### Breaking News

```typescript
{
  defaultTopic: 'breaking',
  customStyle: {
    animation: 'pulse'
  }
}
```

### Finance with Gradient

```typescript
{
  defaultTopic: 'finance',
  customStyle: {
    gradient: {
      enabled: true,
      type: 'linear',
      direction: 90,
      colors: [
        { color: '#059669', stop: 0 },
        { color: '#10B981', stop: 100 }
      ]
    }
  }
}
```

### Glassmorphism Badge

```typescript
{
  defaultTopic: 'news',
  customStyle: {
    glass: {
      enabled: true,
      blur: 10,
      opacity: 0.8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)'
    }
  }
}
```

## Layout with Ticker

### Above Ticker

```
Position Badge: x=0, y=0
Position Ticker: x=0, y=40

┌─────────────┐
│  BREAKING   │
└─────────────┘
│ Ticker content scrolling...
```

### Inline with Ticker

```
Position Badge: x=0, y=0
Position Ticker: x=120, y=0

┌──────────┐ │ Ticker content scrolling...
│ BREAKING │ │
└──────────┘ │
```

## Best Practices

### Visual Design

- Ensure badge is readable at broadcast resolution
- Use contrasting colors for visibility
- Keep animations subtle (not distracting)

### Integration

- Link to ticker for automatic updates
- Match badge styling with ticker styling
- Position badge logically near related content

### Animation

- Use animation sparingly
- Reserve pulse/flash for urgent content
- Disable animation for regular topics

### Accessibility

- Maintain sufficient color contrast
- Don't rely solely on color for meaning
- Include text labels, not just icons

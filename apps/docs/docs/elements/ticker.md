---
sidebar_position: 7
---

# Ticker Element

Ticker elements display scrolling text for news crawls, alerts, and continuous information display.

## Creating Tickers

1. Click the Ticker button in the toolbar
2. Click on canvas to place
3. Configure items and scroll settings

## Content Structure

```typescript
{
  items: TickerItem[];
  config: TickerConfig;
}
```

### Ticker Items

Each item in the ticker:

```typescript
interface TickerItem {
  id: string;
  text: string;           // Display text
  topic?: TickerTopic;    // Category/topic type
  priority?: number;      // Sort priority
  timestamp?: string;     // When added
  expiresAt?: string;     // Auto-remove time
}
```

### Ticker Topics

Categorize items with topics:

| Topic | Typical Use |
|-------|-------------|
| `breaking` | Breaking news (red styling) |
| `sports` | Sports updates |
| `weather` | Weather information |
| `traffic` | Traffic alerts |
| `general` | General news |
| `alert` | Important alerts |

## Configuration

### Scroll Settings

```typescript
interface TickerConfig {
  speed: number;              // Pixels per second
  direction: 'left' | 'right';
  gap: number;                // Space between items
  pauseOnHover: boolean;
  loop: boolean;              // Continuous loop
}
```

### Visual Style

```typescript
{
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  padding: number;
  height: number;
}
```

### Topic Colors

Define colors per topic type:

```typescript
{
  topicColors: {
    breaking: { bg: '#DC2626', text: '#FFFFFF' },
    sports: { bg: '#2563EB', text: '#FFFFFF' },
    weather: { bg: '#0891B2', text: '#FFFFFF' },
    traffic: { bg: '#D97706', text: '#FFFFFF' },
    general: { bg: '#6B7280', text: '#FFFFFF' }
  }
}
```

## Ticker Styles

### News Crawl

Classic bottom-of-screen news ticker:

```typescript
{
  config: {
    speed: 100,
    direction: 'left',
    gap: 80,
    loop: true
  },
  style: {
    height: 40,
    backgroundColor: '#1E1E1E',
    textColor: '#FFFFFF',
    fontSize: 18
  }
}
```

### Alert Banner

Prominent alert-style ticker:

```typescript
{
  config: {
    speed: 80,
    direction: 'left',
    gap: 100
  },
  style: {
    height: 60,
    backgroundColor: '#DC2626',
    textColor: '#FFFFFF',
    fontSize: 24,
    fontWeight: 700
  }
}
```

### Sports Score Ticker

Compact sports information:

```typescript
{
  config: {
    speed: 60,
    direction: 'left',
    gap: 50
  },
  style: {
    height: 32,
    backgroundColor: 'rgba(0,0,0,0.8)',
    fontSize: 14
  }
}
```

## Item Separators

Add visual separators between items:

```typescript
{
  separator: {
    type: 'text' | 'icon' | 'custom',
    content: '•',            // For text type
    icon: 'circle',          // For icon type
    color: '#6B7280',
    spacing: 20
  }
}
```

## Topic Badges

Display topic labels before items:

```typescript
{
  showTopicBadge: true,
  topicBadgeStyle: {
    padding: '4px 8px',
    borderRadius: 4,
    marginRight: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    fontSize: 12
  }
}
```

## Dynamic Content

### Adding Items

Add items programmatically:

```typescript
// Via API
POST /api/ticker/{elementId}/items
{
  text: "Breaking: Major announcement",
  topic: "breaking",
  priority: 1
}
```

### Removing Items

```typescript
// Remove specific item
DELETE /api/ticker/{elementId}/items/{itemId}

// Clear all items
DELETE /api/ticker/{elementId}/items
```

### Item Expiration

Auto-remove items after time:

```typescript
{
  text: "Flash sale ends soon!",
  expiresAt: "2024-12-31T23:59:59Z"
}
```

## Animation

### Entrance Animation

Animate the ticker element in:

```typescript
// IN phase
{ y: 50, opacity: 0 }  // Start below, invisible
{ y: 0, opacity: 1 }   // Slide up, visible
```

### Exit Animation

```typescript
// OUT phase
{ y: 0, opacity: 1 }   // Current position
{ y: 50, opacity: 0 }  // Slide down, fade out
```

### Speed Changes

Animate scroll speed for emphasis:

```typescript
// Normal speed
{ speed: 100 }
// Slow for breaking news
{ speed: 50 }
```

## Linked Topic Badge

Display a companion topic badge element:

```typescript
// Topic Badge Element
{
  type: 'topic-badge',
  linkedTickerId: 'ticker-1',
  defaultTopic: 'breaking'
}
```

The badge automatically updates based on the current ticker item's topic.

## Best Practices

### Readability
- Use appropriate scroll speed (60-120 px/s)
- Ensure sufficient font size (16px minimum)
- Maintain good contrast

### Content
- Keep items concise
- Use consistent formatting
- Include timestamps when relevant

### Performance
- Limit active items (< 20)
- Remove expired items promptly
- Avoid complex separators

### Design
- Match ticker style to overall design
- Use topic colors consistently
- Consider safe areas for text

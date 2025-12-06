---
sidebar_position: 13
---

# Countdown Element

The Countdown element displays timers that count down to a target time, count down from a duration, or show the current time as a clock.

## Overview

Countdown elements support:

- **Duration Mode**: Count down from a specified number of seconds
- **DateTime Mode**: Count down to a specific date and time
- **Clock Mode**: Display current time with optional date
- **Flexible Display**: Show/hide days, hours, minutes, seconds, milliseconds

## Creating a Countdown

1. Click **Countdown** in the Elements menu
2. A 60-second countdown appears by default
3. Configure mode and options in Properties panel

## Properties

### Mode Selection

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `mode` | string | `duration` | Timer mode |

Available modes:
- `duration` - Count down from seconds
- `datetime` - Count down to specific time
- `clock` - Display current time

### Duration Mode Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `durationSeconds` | number | 60 | Seconds to count down from |

### DateTime Mode Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `targetDatetime` | string | null | ISO date string target |

### Clock Mode Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `clockFormat` | string | `24h` | 12-hour or 24-hour format |
| `showDate` | boolean | false | Show current date |
| `timezone` | string | `local` | IANA timezone or 'local' |

### Display Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `showDays` | boolean | true | Show days unit |
| `showHours` | boolean | true | Show hours unit |
| `showMinutes` | boolean | true | Show minutes unit |
| `showSeconds` | boolean | true | Show seconds unit |
| `showMilliseconds` | boolean | false | Show milliseconds |
| `showLabels` | boolean | false | Show unit labels |
| `separator` | string | `:` | Character between units |
| `padZeros` | boolean | true | Pad with leading zeros |

### Completion Behavior

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `onComplete` | string | `stop` | Action when countdown ends |

Options:
- `stop` - Stop at 00:00:00
- `loop` - Restart countdown
- `hide` - Hide element when complete

## Default Styling

```typescript
styles: {
  fontSize: '48px',
  fontFamily: 'Inter',
  fontWeight: 700,
  color: '#FFFFFF'
}
```

## Modes

### Duration Mode

Counts down from a specified number of seconds:

```typescript
{
  type: 'countdown',
  mode: 'duration',
  durationSeconds: 300,  // 5 minutes
  showDays: false,
  showHours: false,
  showMinutes: true,
  showSeconds: true
}
```

Display: `05:00` → `04:59` → ... → `00:00`

### DateTime Mode

Counts down to a specific date and time:

```typescript
{
  type: 'countdown',
  mode: 'datetime',
  targetDatetime: '2024-12-31T23:59:59Z',
  showDays: true,
  showHours: true,
  showMinutes: true,
  showSeconds: true,
  showLabels: true
}
```

Display: `45 days 12:30:15`

### Clock Mode

Displays current time:

```typescript
{
  type: 'countdown',
  mode: 'clock',
  clockFormat: '12h',
  showDate: true,
  timezone: 'America/New_York'
}
```

Display: `Dec 15, 2024 3:45:30 PM`

## Display Formats

### With Labels

```typescript
{
  showLabels: true
}
```

Output: `2 days 05 hours 30 minutes 15 seconds`

### Without Labels

```typescript
{
  showLabels: false,
  separator: ':'
}
```

Output: `2:05:30:15`

### Custom Separator

```typescript
{
  separator: ' | '
}
```

Output: `2 | 05 | 30 | 15`

### Milliseconds

```typescript
{
  showMilliseconds: true
}
```

Output: `05:30:15.250`

## Timezone Support

### Local Time

```typescript
{
  timezone: 'local'  // Uses viewer's timezone
}
```

### Specific Timezone

```typescript
{
  timezone: 'America/New_York'     // Eastern Time
  timezone: 'Europe/London'        // GMT/BST
  timezone: 'Asia/Tokyo'           // Japan Time
  timezone: 'UTC'                  // Coordinated Universal Time
}
```

## Animation Properties

| Property | Description |
|----------|-------------|
| `opacity` | Fade countdown in/out |
| `scale_x` | Scale horizontally |
| `scale_y` | Scale vertically |
| `rotation` | Rotate countdown |
| `color` | Animate text color |

## Use Cases

### Event Countdown

Count down to show start:

```typescript
{
  type: 'countdown',
  mode: 'datetime',
  targetDatetime: '2024-06-15T19:00:00-04:00',
  showDays: true,
  showHours: true,
  showMinutes: true,
  showSeconds: true,
  showLabels: true,
  onComplete: 'hide'
}
```

### Segment Timer

Time remaining in segment:

```typescript
{
  type: 'countdown',
  mode: 'duration',
  durationSeconds: 120,  // 2 minutes
  showDays: false,
  showHours: false,
  showMinutes: true,
  showSeconds: true,
  onComplete: 'stop'
}
```

### Live Clock

Current time display:

```typescript
{
  type: 'countdown',
  mode: 'clock',
  clockFormat: '24h',
  showDate: false,
  showSeconds: true,
  timezone: 'local'
}
```

### Breaking News Timer

Time since event:

```typescript
{
  type: 'countdown',
  mode: 'datetime',
  targetDatetime: '2024-01-15T14:30:00Z',  // Past time
  showLabels: true
}
```

When target is in the past, displays elapsed time.

### Loop Timer

Repeating countdown:

```typescript
{
  type: 'countdown',
  mode: 'duration',
  durationSeconds: 30,
  onComplete: 'loop'
}
```

Restarts from 30 when reaching 0.

## Styling Examples

### Large Timer

```typescript
styles: {
  fontSize: '96px',
  fontFamily: 'Inter',
  fontWeight: 700,
  color: '#FFFFFF',
  textShadow: '0 4px 20px rgba(0,0,0,0.5)'
}
```

### Minimal Clock

```typescript
styles: {
  fontSize: '24px',
  fontFamily: 'monospace',
  fontWeight: 400,
  color: '#9CA3AF'
}
```

### Urgent Timer

```typescript
styles: {
  fontSize: '64px',
  fontWeight: 700,
  color: '#EF4444'  // Red
}
```

## Best Practices

### Duration Selection

- **Short timers** (< 1 hour): Hide days and hours
- **Long countdowns** (days): Show all units with labels
- **Clocks**: Choose appropriate format for audience

### Visual Hierarchy

- Size appropriately for importance
- Use monospace fonts for stable width
- Consider color coding (urgent = red)

### Performance

- Avoid milliseconds unless necessary
- Limit countdown elements per template
- Use appropriate update intervals

### Accuracy

- For critical timing, use server-synced time
- Account for timezone differences
- Test countdown completion behavior

---
sidebar_position: 12
---

# Table Element

The Table element displays structured data in rows and columns with customizable styling for headers, rows, borders, and formatting.

## Overview

Table elements support:

- **Column Configuration**: Define columns with headers and formatting
- **Data Binding**: Display dynamic data arrays
- **Styling Options**: Headers, striping, borders, colors
- **Format Types**: Text, numbers, currency, percentages, dates

## Creating a Table

1. Click **Table** in the Elements menu
2. A sample table appears with default data
3. Configure columns and data in Properties panel

## Properties

### Column Configuration

| Property | Type | Description |
|----------|------|-------------|
| `columns` | Column[] | Array of column definitions |

Each column has:

```typescript
interface Column {
  id: string;           // Unique identifier
  header: string;       // Column header text
  accessorKey: string;  // Key to access row data
  width: number;        // Column width in pixels
  align: 'left' | 'center' | 'right';
  format: 'text' | 'number' | 'currency' | 'percentage' | 'date';
}
```

### Data

| Property | Type | Description |
|----------|------|-------------|
| `data` | Row[] | Array of row objects |

Each row is a key-value object:

```typescript
{
  team: 'Lakers',
  wins: 45,
  losses: 20,
  pct: 0.692
}
```

### Display Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `showHeader` | boolean | true | Show column headers |
| `striped` | boolean | false | Alternate row colors |
| `bordered` | boolean | true | Show borders |
| `compact` | boolean | false | Reduced padding |

### Styling

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `headerBackgroundColor` | string | `#1F2937` | Header background |
| `headerTextColor` | string | `#FFFFFF` | Header text color |
| `rowBackgroundColor` | string | `#111827` | Row background |
| `rowTextColor` | string | `#E5E7EB` | Row text color |
| `stripedRowBackgroundColor` | string | `#1F2937` | Striped row color |
| `borderColor` | string | `#374151` | Border color |

### Border Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `showRowBorders` | boolean | true | Horizontal borders |
| `showColumnBorders` | boolean | false | Vertical borders |
| `showOuterBorder` | boolean | true | Table outline |
| `solidBackgroundColor` | string | - | Solid background color |

## Column Formats

### Text

Default format, displays value as-is:

```typescript
{ format: 'text' }  // "John Smith"
```

### Number

Formats numbers with locale separators:

```typescript
{ format: 'number' }  // 1,234,567
```

### Currency

Formats as currency:

```typescript
{ format: 'currency' }  // $1,234.56
```

### Percentage

Formats decimals as percentages:

```typescript
{ format: 'percentage' }  // 0.692 → 69.2%
```

### Date

Formats date strings:

```typescript
{ format: 'date' }  // 2024-01-15 → Jan 15, 2024
```

## Animation Properties

| Property | Description |
|----------|-------------|
| `opacity` | Fade table in/out |
| `scale_x` | Scale horizontally |
| `scale_y` | Scale vertically |
| `rotation` | Rotate table |

## Use Cases

### Sports Standings

```typescript
{
  type: 'table',
  columns: [
    { id: 'team', header: 'Team', accessorKey: 'team', align: 'left', format: 'text' },
    { id: 'w', header: 'W', accessorKey: 'wins', align: 'center', format: 'number' },
    { id: 'l', header: 'L', accessorKey: 'losses', align: 'center', format: 'number' },
    { id: 'pct', header: 'PCT', accessorKey: 'pct', align: 'right', format: 'percentage' }
  ],
  data: [
    { team: 'Lakers', wins: 45, losses: 20, pct: 0.692 },
    { team: 'Celtics', wins: 42, losses: 23, pct: 0.646 },
    { team: 'Warriors', wins: 40, losses: 25, pct: 0.615 }
  ]
}
```

### Leaderboard

```typescript
{
  type: 'table',
  columns: [
    { id: 'rank', header: '#', accessorKey: 'rank', width: 40, align: 'center' },
    { id: 'player', header: 'Player', accessorKey: 'player', align: 'left' },
    { id: 'score', header: 'Score', accessorKey: 'score', align: 'right', format: 'number' }
  ],
  data: [
    { rank: 1, player: 'Player One', score: 15000 },
    { rank: 2, player: 'Player Two', score: 12500 },
    { rank: 3, player: 'Player Three', score: 10000 }
  ],
  striped: true
}
```

### Financial Data

```typescript
{
  type: 'table',
  columns: [
    { id: 'symbol', header: 'Symbol', accessorKey: 'symbol', align: 'left' },
    { id: 'price', header: 'Price', accessorKey: 'price', align: 'right', format: 'currency' },
    { id: 'change', header: 'Change', accessorKey: 'change', align: 'right', format: 'percentage' }
  ],
  data: [
    { symbol: 'AAPL', price: 185.50, change: 0.025 },
    { symbol: 'GOOGL', price: 142.30, change: -0.012 },
    { symbol: 'MSFT', price: 378.90, change: 0.018 }
  ]
}
```

## Styling Examples

### Dark Theme (Default)

```typescript
{
  headerBackgroundColor: '#1F2937',
  headerTextColor: '#FFFFFF',
  rowBackgroundColor: '#111827',
  rowTextColor: '#E5E7EB',
  borderColor: '#374151'
}
```

### Light Theme

```typescript
{
  headerBackgroundColor: '#F3F4F6',
  headerTextColor: '#111827',
  rowBackgroundColor: '#FFFFFF',
  rowTextColor: '#374151',
  borderColor: '#E5E7EB'
}
```

### Brand Colors

```typescript
{
  headerBackgroundColor: '#1E40AF',  // Brand blue
  headerTextColor: '#FFFFFF',
  rowBackgroundColor: '#EFF6FF',
  stripedRowBackgroundColor: '#DBEAFE',
  rowTextColor: '#1E3A8A',
  borderColor: '#93C5FD'
}
```

### Minimal (No Borders)

```typescript
{
  showRowBorders: false,
  showColumnBorders: false,
  showOuterBorder: false,
  striped: true
}
```

## Column Alignment

| Align | Use For |
|-------|---------|
| `left` | Text, names |
| `center` | Status, short values |
| `right` | Numbers, currency |

## Responsive Considerations

### Column Widths

Set explicit widths for predictable layout:

```typescript
columns: [
  { ..., width: 200 },  // Fixed width
  { ..., width: 80 },   // Narrow column
  { ... }               // Flexible (fills remaining)
]
```

### Compact Mode

Enable for dense data display:

```typescript
{
  compact: true  // Reduced padding
}
```

## Best Practices

### Data

- Limit rows for readability (5-10 visible)
- Use appropriate formats for data types
- Keep column count reasonable

### Styling

- Ensure sufficient contrast
- Use striping for many rows
- Keep styling consistent with template

### Performance

- Avoid excessive rows
- Use simple styling
- Minimize column count

### Accessibility

- Include meaningful headers
- Use adequate font sizes
- Maintain color contrast ratios

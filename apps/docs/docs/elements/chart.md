---
sidebar_position: 6
---

# Chart Element

Chart elements display data visualizations using Chart.js.

## Creating Charts

1. Press `C` or click the Chart button
2. Click on canvas to place
3. Select chart type and configure data

## Chart Types

### Bar Chart

```typescript
{
  type: 'bar',
  data: {
    labels: ['Team A', 'Team B', 'Team C'],
    datasets: [{
      data: [45, 38, 62],
      backgroundColor: ['#3B82F6', '#EF4444', '#10B981']
    }]
  }
}
```

### Horizontal Bar Chart

```typescript
{
  type: 'bar',
  indexAxis: 'y',  // Makes it horizontal
  data: { /* same as bar */ }
}
```

### Line Chart

```typescript
{
  type: 'line',
  data: {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [{
      data: [10, 25, 18, 35],
      borderColor: '#3B82F6',
      fill: false,
      tension: 0.4  // Curve smoothing
    }]
  }
}
```

### Pie Chart

```typescript
{
  type: 'pie',
  data: {
    labels: ['Yes', 'No', 'Undecided'],
    datasets: [{
      data: [55, 30, 15],
      backgroundColor: ['#10B981', '#EF4444', '#6B7280']
    }]
  }
}
```

### Doughnut Chart

```typescript
{
  type: 'doughnut',
  data: { /* same as pie */ },
  options: {
    cutout: '60%'  // Inner radius
  }
}
```

### Gauge Chart

Display a single value on a semi-circular gauge:

```typescript
{
  type: 'gauge',
  data: {
    value: 75,          // Current value (0-100 by default)
    min: 0,             // Minimum value
    max: 100,           // Maximum value
    label: 'Progress'   // Optional label
  },
  options: {
    gaugeColors: ['#EF4444', '#F59E0B', '#10B981'],  // Red to green gradient
    needleColor: '#FFFFFF',
    showValue: true,
    valueFormat: '{value}%'
  }
}
```

## Finance Charts

Nova GFX includes specialized charts for financial and market data visualization.

### Candlestick Chart

Display OHLC (Open, High, Low, Close) financial data:

```typescript
{
  type: 'candlestick',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [{
      data: [
        { open: 100, high: 115, low: 95, close: 110 },
        { open: 110, high: 125, low: 105, close: 120 },
        { open: 120, high: 130, low: 110, close: 115 },
        { open: 115, high: 128, low: 108, close: 125 },
        { open: 125, high: 140, low: 118, close: 135 }
      ]
    }]
  },
  options: {
    upColor: '#22C55E',      // Green for price increase
    downColor: '#EF4444',    // Red for price decrease
    wickColor: '#9CA3AF',    // Color for high/low wicks
    showGrid: true,
    axisColor: '#9CA3AF'
  }
}
```

#### Candlestick Options

| Option | Type | Description |
|--------|------|-------------|
| `upColor` | string | Color when close > open (default: green) |
| `downColor` | string | Color when close < open (default: red) |
| `wickColor` | string | Color for high/low lines |
| `showGrid` | boolean | Show background grid lines |

### Index Chart

Compare multiple data series normalized to a base value (useful for comparing stock performance):

```typescript
{
  type: 'index-chart',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      { label: 'Stock A', data: [100, 105, 102, 110, 115, 120] },
      { label: 'Stock B', data: [100, 98, 103, 108, 105, 112] },
      { label: 'S&P 500', data: [100, 102, 104, 106, 108, 110] }
    ]
  },
  options: {
    indexBaseValue: 100,    // Normalize all series to this value
    axisColor: '#9CA3AF',
    colors: ['#3B82F6', '#EF4444', '#10B981']
  }
}
```

All series are normalized so their first value equals the base value (default 100), making it easy to compare relative performance regardless of actual values.

## Election Charts

Specialized charts for election coverage and political data visualization.

### Parliament Chart

Display seat distribution in a semicircular parliament layout:

```typescript
{
  type: 'parliament',
  data: {
    labels: ['Democrats', 'Republicans', 'Independent'],
    datasets: [{
      data: [51, 48, 1]  // Seat counts per party
    }]
  },
  options: {
    partyColors: ['#3B82F6', '#EF4444', '#9CA3AF'],
    seatRadius: 8,
    rowHeight: 20,
    showLegend: true
  }
}
```

#### Parliament Display Options

| Option | Type | Description |
|--------|------|-------------|
| `partyColors` | string[] | Colors for each party |
| `seatRadius` | number | Size of each seat circle (default: 8) |
| `rowHeight` | number | Spacing between seat rows |
| `flipped` | boolean | Flip semicircle (seats at top) |
| `showLegend` | boolean | Show party legend |

#### Party Breakdown Display

Show large party seat counts prominently:

```typescript
{
  options: {
    showPartyBreakdown: true,    // Show large numbers
    breakdownFontSize: 48,       // Size of seat count numbers
    breakdownLabelSize: 14       // Size of party name labels
  }
}
```

This displays party names and seat counts in large text above the semicircle, ideal for broadcast graphics.

#### Balance of Power Bar

Add a horizontal bar showing seat distribution relative to majority:

```typescript
{
  options: {
    showBalanceOfPower: true,
    balanceBarHeight: 28,
    balanceBarY: 350,           // Y position of bar
    balanceBarPadding: 20,      // Left/right padding
    balanceTitle: 'Senate Balance of Power'
  }
}
```

The balance bar shows:
- Each party's seats as colored segments
- A majority line marker
- Seat counts inside each segment (if wide enough)

:::tip Election Night Graphics
Combine `showPartyBreakdown` and `showBalanceOfPower` for comprehensive election coverage. Animate `chartProgress` from 0 to 1 to reveal seats progressively as results come in.
:::

## Sports Charts

Specialized visualizations for sports broadcasting.

### Soccer Field

Display a soccer/football pitch with player positions, formations, or tactical data:

```typescript
{
  type: 'soccer-field',
  data: {
    datasets: [{
      data: [
        { x: 5, y: 50, label: 'GK', number: 1 },
        { x: 25, y: 20, label: 'LB', number: 3 },
        { x: 25, y: 40, label: 'CB', number: 4 },
        { x: 25, y: 60, label: 'CB', number: 5 },
        { x: 25, y: 80, label: 'RB', number: 2 },
        { x: 50, y: 30, label: 'CM', number: 6 },
        { x: 50, y: 50, label: 'CM', number: 8 },
        { x: 50, y: 70, label: 'CM', number: 10 },
        { x: 75, y: 25, label: 'LW', number: 11 },
        { x: 75, y: 50, label: 'ST', number: 9 },
        { x: 75, y: 75, label: 'RW', number: 7 }
      ]
    }]
  },
  options: {
    theme: 'dark',              // 'dark' or 'light'
    fieldColor: '#1a472a',      // Pitch color
    lineColor: '#FFFFFF',       // Field markings color
    pointStyle: 'jersey',       // 'circle', 'jersey', or 'dot'
    pointColor: '#3B82F6',      // Default player color
    goalieColor: '#FFD700',     // Goalkeeper highlight color
    pointSize: 12,
    showPointLabels: true,      // Show position labels
    showPointNumbers: true,     // Show jersey numbers
    showLegend: true
  }
}
```

#### Position Coordinates

Positions use a 0-100 coordinate system:
- `x: 0` = Left goal line, `x: 100` = Right goal line
- `y: 0` = Top touchline, `y: 100` = Bottom touchline

#### Point Styles

| Style | Description |
|-------|-------------|
| `circle` | Circle with optional number inside |
| `jersey` | Jersey/shirt shape with number |
| `dot` | Small dot marker |

#### Special Position Colors

The goalkeeper position (labeled 'GK', 'Goalie', or 'Goalkeeper') automatically uses the `goalieColor` for visual distinction.

### Basketball Court

Display a half-court basketball diagram:

```typescript
{
  type: 'basketball-court',
  data: {
    datasets: [{
      data: [
        { x: 15, y: 50, label: 'PG', number: 1 },
        { x: 30, y: 25, label: 'SG', number: 2 },
        { x: 30, y: 75, label: 'SF', number: 3 },
        { x: 45, y: 35, label: 'PF', number: 4 },
        { x: 45, y: 65, label: 'C', number: 5 }
      ]
    }]
  },
  options: {
    theme: 'dark',
    fieldColor: '#2a1810',      // Court color (wood tone)
    lineColor: '#FFFFFF',
    pointStyle: 'jersey',
    pointColor: '#EF4444',      // Team color
    centerColor: '#FFD700',     // Center position highlight
    pointSize: 14,
    showPointLabels: true,
    showPointNumbers: true
  }
}
```

The court includes:
- Three-point line and arc
- Paint/key area
- Free throw circle
- Restricted area
- Basket and backboard
- Center court line (half-court)

#### Basketball Position Colors

The center position (labeled 'C' or 'Center') automatically uses the `centerColor` for visual distinction, similar to goalkeepers in soccer.

### Common Sports Chart Options

Both soccer and basketball charts share these options:

| Option | Type | Description |
|--------|------|-------------|
| `theme` | 'dark' \| 'light' | Field/court color scheme |
| `fieldColor` | string | Override default field color |
| `lineColor` | string | Field/court markings color |
| `pointStyle` | string | Player marker style |
| `pointColor` | string | Default player color |
| `pointSize` | number | Player marker size |
| `showPointLabels` | boolean | Show position labels |
| `showPointNumbers` | boolean | Show jersey numbers |
| `showLegend` | boolean | Show position legend |
| `legendPosition` | 'top' \| 'bottom' | Legend placement |

:::tip Formation Graphics
Use sports charts to display team formations, tactical setups, or player statistics. Combine with text elements for player names and additional stats.
:::

### Area Chart

Line chart with filled area below:

```typescript
{
  type: 'line',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [{
      data: [10, 25, 18, 35],
      borderColor: '#3B82F6',
      fill: true,
      backgroundColor: 'rgba(59, 130, 246, 0.3)'
    }]
  },
  options: {
    areaOpacity: 0.3  // 0-1, controls fill transparency
  }
}
```

## Data Configuration

### Static Data

Define data directly in the element:

```typescript
{
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  datasets: [{
    label: 'Sales',
    data: [12, 19, 3, 5, 2],
    backgroundColor: '#3B82F6'
  }]
}
```

### Multiple Datasets

```typescript
{
  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
  datasets: [
    {
      label: '2023',
      data: [65, 59, 80, 81],
      borderColor: '#3B82F6'
    },
    {
      label: '2024',
      data: [78, 72, 92, 95],
      borderColor: '#10B981'
    }
  ]
}
```

### Dynamic Data

Bind chart data to external sources:

```typescript
{
  dataBinding: {
    source: 'api',
    path: 'stats.scores',
    refreshInterval: 5000  // Update every 5 seconds
  }
}
```

## Styling Options

### Colors

```typescript
{
  colors: {
    backgroundColor: ['#3B82F6', '#EF4444', '#10B981'],
    borderColor: '#FFFFFF',
    gridColor: 'rgba(255,255,255,0.1)',
    textColor: '#FFFFFF'
  }
}
```

### Legend

```typescript
{
  legend: {
    display: true,
    position: 'bottom',  // 'top', 'bottom', 'left', 'right'
    labels: {
      color: '#FFFFFF',
      fontSize: 14,
      fontFamily: 'Inter'
    }
  }
}
```

### Axes

```typescript
{
  scales: {
    x: {
      display: true,
      grid: { display: false },
      ticks: { color: '#FFFFFF' }
    },
    y: {
      display: true,
      beginAtZero: true,
      max: 100,
      ticks: { color: '#FFFFFF' }
    }
  }
}
```

### Title

```typescript
{
  title: {
    display: true,
    text: 'Quarterly Results',
    color: '#FFFFFF',
    fontSize: 18
  }
}
```

## Animation

### Built-in Animations

Chart.js provides built-in animations:

```typescript
{
  animation: {
    duration: 1000,
    easing: 'easeOutQuart'
  }
}
```

### Animation Types

| Type | Effect |
|------|--------|
| `easeOutQuart` | Smooth deceleration |
| `easeOutBounce` | Bouncy finish |
| `easeInOutCubic` | Smooth both ends |
| `linear` | Constant speed |

### Delayed Animation

Stagger element animations:

```typescript
{
  animation: {
    delay: (context) => context.dataIndex * 100
  }
}
```

### Element Animations

Combine chart animation with element animations:
- Fade the chart element in during IN phase
- Chart data animates after element appears
- Fade out during OUT phase

## Common Use Cases

### Poll Results

```typescript
{
  type: 'bar',
  indexAxis: 'y',
  data: {
    labels: ['Option A', 'Option B', 'Option C'],
    datasets: [{
      data: [45, 30, 25],
      backgroundColor: ['#3B82F6', '#6B7280', '#6B7280']
    }]
  },
  options: {
    scales: {
      x: { max: 100, display: false }
    }
  }
}
```

### Score Comparison

```typescript
{
  type: 'bar',
  data: {
    labels: ['Home', 'Away'],
    datasets: [{
      data: [3, 1],
      backgroundColor: ['#3B82F6', '#EF4444']
    }]
  }
}
```

### Trend Line

```typescript
{
  type: 'line',
  data: {
    labels: Array.from({length: 10}, (_, i) => i + 1),
    datasets: [{
      data: [10, 12, 8, 15, 14, 18, 20, 19, 22, 25],
      borderColor: '#10B981',
      fill: true,
      backgroundColor: 'rgba(16, 185, 129, 0.2)'
    }]
  }
}
```

## Keyframeable Chart Properties

Chart values can be animated using keyframes for dynamic data reveals:

### Animating Bar Values

```typescript
// In keyframe at position 0%:
{
  properties: {
    'chart_value_0': 0,   // First bar starts at 0
    'chart_value_1': 0,   // Second bar starts at 0
    'chart_value_2': 0    // Third bar starts at 0
  }
}

// In keyframe at position 100%:
{
  properties: {
    'chart_value_0': 45,  // First bar animates to 45
    'chart_value_1': 38,  // Second bar animates to 38
    'chart_value_2': 62   // Third bar animates to 62
  }
}
```

### Keyframeable Properties

| Property | Description |
|----------|-------------|
| `chart_value_0` to `chart_value_N` | Individual data point values |
| `chart_opacity` | Overall chart opacity |
| `chart_scale` | Chart scale factor |

:::tip Data Reveal Effect
Combine bar value animation with staggered timing to create a "growing bars" effect where each bar animates in sequence.
:::

## Best Practices

### Data Clarity
- Limit data points for readability
- Use clear labels
- Choose appropriate chart type for data

### Visual Design
- Match colors to design system
- Ensure sufficient contrast
- Keep legends readable

### Performance
- Limit animation complexity
- Update data efficiently
- Avoid excessive refresh rates

### Accessibility
- Include text alternatives
- Use patterns in addition to colors
- Provide data tables when needed

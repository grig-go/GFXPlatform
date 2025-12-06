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

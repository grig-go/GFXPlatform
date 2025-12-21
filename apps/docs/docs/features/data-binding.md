---
sidebar_position: 13
---

# Data Binding

Data binding connects elements to data sources, automatically updating displayed values when data changes.

## Overview

Data binding enables:

- **Dynamic content** - Text, images, and values update from data sources
- **Data-driven templates** - Create once, use with different data
- **Live updates** - Graphics update when data changes
- **Interactive switching** - Change displayed record with buttons

## Binding Syntax

### Template Syntax

Use double curly braces in element content:

```json
{
  "name": "City Name",
  "element_type": "text",
  "content": {
    "text": "{{location.name}}"
  }
}
```

### Binding Object

For data-driven design, include a `binding` object:

```json
{
  "name": "Temperature",
  "element_type": "text",
  "content": {
    "text": "{{weather.temperature}}"
  },
  "binding": {
    "field": "weather.temperature",
    "type": "text"
  }
}
```

## Binding Types

| Type | Description | Example Field |
|------|-------------|---------------|
| `text` | String values | `location.name`, `team.title` |
| `number` | Numeric values | `score`, `temperature` |
| `boolean` | True/false values | `isLive`, `hasOvertime` |
| `image` | Image URLs | `logo.url`, `player.photo` |

## Creating Data-Bound Elements

### Text Elements

```json
{
  "name": "Score Display",
  "element_type": "text",
  "position_x": 100,
  "position_y": 200,
  "width": 80,
  "height": 50,
  "content": {
    "type": "text",
    "text": "{{scores.home}}"
  },
  "styles": {
    "fontSize": 48,
    "fontWeight": "bold",
    "color": "#FFFFFF"
  },
  "binding": {
    "field": "scores.home",
    "type": "number"
  }
}
```

### Image Elements

```json
{
  "name": "Team Logo",
  "element_type": "image",
  "position_x": 50,
  "position_y": 100,
  "width": 120,
  "height": 120,
  "content": {
    "type": "image",
    "src": "{{team.logo}}"
  },
  "binding": {
    "field": "team.logo",
    "type": "image"
  }
}
```

### Nested Field Access

Access nested data using dot notation:

```json
{
  "binding": {
    "field": "weather.items[0].temperatureMax.value",
    "type": "number"
  }
}
```

Array access uses bracket notation: `items[0]`, `forecast[2]`

## Data Schema

When the AI creates data-bound templates, it receives a schema showing available fields:

```json
{
  "location.name": "string",
  "location.region": "string",
  "weather.temperature": "number",
  "weather.conditions": "string",
  "weather.humidity": "number",
  "weather.icon": "string"
}
```

The AI creates elements for each relevant field with proper bindings.

## Data Sources

### Configuring Data Sources

1. Open **Data Sources** panel
2. Click **Add Data Source**
3. Configure connection type and URL
4. Map fields to template bindings

### Supported Types

| Type | Description |
|------|-------------|
| REST API | HTTP endpoints with JSON response |
| WebSocket | Real-time streaming data |
| Google Sheets | Spreadsheet data |
| Supabase | PostgreSQL database |
| Static JSON | Hardcoded data for testing |

### REST API Example

```typescript
{
  type: 'rest',
  url: 'https://api.weather.com/current',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ${API_KEY}'
  },
  refreshInterval: 60000  // Refresh every minute
}
```

### Display Field

The **display field** determines which field is used to identify records:

```typescript
{
  displayField: 'location.name'  // Values: "Arizona", "Texas", etc.
}
```

This is used when switching data with interactive buttons.

## Switching Data Records

In Interactive Mode, buttons can switch which data record is displayed.

### Using Display Field Value

```javascript
// Switch to Arizona's data
actions.setState('@template.Weather.data', 'Arizona');

// Switch to Texas's data
actions.setState('@template.Weather.data', 'Texas');
```

### Using Index

```javascript
// Switch to first record
actions.setState('@template.Weather.dataIndex', 0);

// Switch to second record
actions.setState('@template.Weather.dataIndex', 1);
```

### Complete Button Example

```json
{
  "elements": [
    {
      "name": "Btn Arizona",
      "element_type": "shape",
      "interactive": true,
      "content": { "shape": "rectangle", "fill": "#3b82f6" }
    }
  ],
  "script": "function onBtn_ArizonaOnClick(event) {\n  actions.setState('@template.{{CURRENT_TEMPLATE}}.data', 'Arizona');\n}"
}
```

## Sample Data

When creating templates, the AI receives sample data:

```json
{
  "location": {
    "name": "Phoenix",
    "region": "Arizona"
  },
  "weather": {
    "temperature": 95,
    "conditions": "Sunny",
    "humidity": 15,
    "icon": "https://..."
  }
}
```

This helps the AI understand the data structure and create appropriate elements.

## Data Context for AI

When the AI creates data-bound graphics, it receives:

1. **Data Source Name** - Identifier for the source
2. **Schema** - Field paths and types
3. **Sample Data** - First record for reference

The AI then:
- Creates elements for all relevant fields
- Adds `binding` objects with correct field paths
- Uses template syntax in content: `{{field.path}}`

## Best Practices

### Use All Available Data

When given a data source, use all relevant fields:

```
// Good - uses all weather fields
Temperature High: {{weather.temperatureMax}}
Temperature Low: {{weather.temperatureMin}}
Conditions: {{weather.conditions}}
Humidity: {{weather.humidity}}%
Wind: {{weather.windSpeed}} mph
```

```
// Bad - only uses some fields
Temperature: {{weather.temperatureMax}}
```

### Match Field Paths Exactly

The `binding.field` must match the actual data path:

```json
// Correct
"binding": {
  "field": "location.name",
  "type": "text"
}

// Incorrect - mismatched casing
"binding": {
  "field": "Location.Name",
  "type": "text"
}
```

### Static Elements Don't Need Bindings

Only add bindings to elements displaying dynamic data:

```json
// Dynamic - needs binding
{
  "name": "City Name",
  "content": { "text": "{{location.name}}" },
  "binding": { "field": "location.name", "type": "text" }
}

// Static - no binding needed
{
  "name": "Background",
  "content": { "shape": "rectangle", "fill": "#1a1a2e" }
  // No binding object
}
```

### Handle Missing Data

Consider fallback values in your design:

```json
{
  "content": {
    "text": "{{team.score || '0'}}"
  }
}
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Shows `{{field}}` literally | Binding not resolved | Check field path exists in data |
| Empty value | Field missing in data | Verify data source has the field |
| Wrong data shown | Incorrect field path | Check for typos in binding.field |
| Data not updating | Refresh not configured | Set refreshInterval on data source |
| Switch not working | Wrong display field | Ensure value matches display field |

## Related Features

- [Interactive Mode](./interactive-mode) - Enable data switching
- [Scripting](./scripting) - Control data with scripts
- [Visual Nodes](./visual-nodes) - Data nodes for no-code

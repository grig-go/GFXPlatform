# Data Binding in Nova GFX

Data binding allows you to connect graphic elements to data sources, making your templates dynamic and data-driven. This document covers all aspects of data binding in Nova GFX.

---

## Table of Contents

1. [Binding Syntax](#binding-syntax)
2. [Creating Bindings](#creating-bindings)
3. [Binding Settings (Formatters)](#binding-settings-formatters)
4. [Live Data Binding](#live-data-binding)
5. [Data Sources](#data-sources)
6. [Examples](#examples)

---

## Binding Syntax

Nova GFX uses double curly braces `{{...}}` for data binding expressions.

### Basic Field Binding
```
{{fieldName}}
```

### Nested Object Access
```
{{candidate.name}}
{{weather.current.temperature}}
```

### Array Index Access
```
{{candidates[0].name}}
{{forecast[2].high}}
```

### Special Placeholders
```
{{CURRENT_TEMPLATE}}  - Replaced with the current template name
```

---

## Creating Bindings

### Method 1: Drag and Drop
1. Open the **Data** tab in the right panel
2. Select a data source from the dropdown
3. Drag a field from the data preview onto any text element
4. The binding expression will be automatically inserted

### Method 2: Manual Entry
1. Select a text element
2. In the Properties panel, find the **Content** field
3. Type your binding expression: `{{fieldName}}`
4. You can mix static text with bindings: `Score: {{score}} points`

### Method 3: Data Binding Panel
1. Select an element
2. Open the **Data Binding** tab
3. Click "Add Binding" to create a new binding
4. Select the property to bind (e.g., `content`, `fill`, `visible`)
5. Enter the field path

---

## Binding Settings (Formatters)

Each binding can have formatting options applied. Click the **settings icon** (gear) next to a binding to open the Binding Settings modal.

### Text Formatting

| Option | Description | Example |
|--------|-------------|---------|
| **Text Case** | Transform text case | `UPPERCASE`, `lowercase`, `Capitalize`, `Title Case` |
| **Trim from Start** | Remove characters from beginning | Remove first 3 chars |
| **Trim from End** | Remove characters from end | Remove last 2 chars |

### Number Formatting

| Option | Description | Example |
|--------|-------------|---------|
| **Thousands Separator** | Add separators to large numbers | `1,000,000` or `1 000 000` |
| **Compact** | Shorten large numbers | `1.5M`, `2.3K` |
| **Decimal Places** | Control precision | `0`, `1`, `2` decimals |
| **Decimal Separator** | Period or comma | `1.50` or `1,50` |
| **Round To** | Round to nearest value | Nearest 10, 100, 1000 |
| **Pad with Zeros** | Left-pad numbers | `007`, `0042` |
| **Show + for Positive** | Display plus sign | `+15%` |

### Date Formatting

| Option | Description | Example |
|--------|-------------|---------|
| **DD-MM-YYYY** | Day first | `21-12-2025` |
| **MM-DD-YYYY** | Month first | `12-21-2025` |
| **YYYY-MM-DD** | ISO format | `2025-12-21` |
| **Written Full** | Full month name | `December 21, 2025` |
| **Written Short** | Abbreviated month | `Dec 21, 2025` |
| **Day-Month** | Day and month only | `21 December` |
| **Month-Year** | Month and year only | `December 2025` |
| **Weekday Only** | Day name | `Sunday` |
| **Relative** | Human-readable | `2 days ago` |

### Time Formatting

| Option | Description | Example |
|--------|-------------|---------|
| **12-hour** | AM/PM format | `3:30 PM` |
| **24-hour** | Military time | `15:30` |
| **Show Seconds** | Include seconds | `3:30:45 PM` |

### Common Options

| Option | Description |
|--------|-------------|
| **Prefix** | Text to add before value (e.g., `$`, `#`, `Position: `) |
| **Suffix** | Text to add after value (e.g., `%`, `pts`, `mph`) |
| **Hide on Zero** | Hide element when value is `0` |
| **Hide on Null** | Hide element when value is empty or null |

---

## Live Data Binding

Live data binding allows templates to automatically update from a remote API endpoint.

### Configuration

In the Template settings, configure live data:

```json
{
  "enabled": true,
  "endpoint": "https://api.example.com/data",
  "refreshInterval": 10000,
  "dataPath": "results.items",
  "headers": {
    "Authorization": "Bearer your-token"
  }
}
```

### Options

| Field | Description | Default |
|-------|-------------|---------|
| `enabled` | Enable/disable live polling | `false` |
| `endpoint` | URL to fetch JSON from | Required |
| `refreshInterval` | Polling interval in milliseconds | `10000` (10s) |
| `dataPath` | JSON path to data array | Root |
| `headers` | Custom HTTP headers | `{}` |
| `method` | HTTP method | `GET` |
| `body` | Request body for POST | `null` |
| `errorRetryInterval` | Retry interval on error | `30000` |
| `maxRetries` | Max consecutive retries | `3` |

### Live Data Indicators

When live data is active:
- A pulsing indicator appears in Preview/Player
- Last update timestamp is displayed
- Error states show with retry countdown

---

## Data Sources

### Built-in Data Sources

Nova GFX includes several sample data sources for testing:

- **Election Results** - Candidate names, votes, percentages
- **Weather Data** - Temperature, conditions, forecasts
- **Sports Scores** - Teams, scores, standings
- **Stock Prices** - Symbols, prices, changes

### Custom Data Sources

You can add custom data sources:

1. Go to **Project Settings** > **Data Sources**
2. Click **Add Data Source**
3. Configure:
   - **Name**: Display name
   - **Type**: `json`, `csv`, or `api`
   - **URL/Content**: Data location or inline content

### Data Provider Integration

For enterprise deployments, configure data providers in the database:

```sql
INSERT INTO data_providers (name, type, endpoint, refresh_interval)
VALUES ('Live Elections', 'api', 'https://api.elections.com/results', 30000);
```

---

## Examples

### Election Lower Third
```
Candidate: {{candidate.name}}
Party: {{candidate.party}}
Votes: {{candidate.votes}}  (formatter: comma separator, suffix: " votes")
Percentage: {{candidate.percentage}}  (formatter: 1 decimal, suffix: "%")
```

### Weather Forecast
```
{{location.city}} Weather
Current: {{current.temp}}°F  (formatter: round to whole)
High: {{forecast.high}}° / Low: {{forecast.low}}°
Conditions: {{current.conditions}}  (formatter: Title Case)
```

### Sports Score Bug
```
{{home.team}}  {{home.score}}
{{away.team}}  {{away.score}}
Quarter: {{game.quarter}}  (formatter: prefix: "Q")
Time: {{game.clock}}
```

### Stock Ticker
```
{{symbol}}  (formatter: UPPERCASE)
{{price}}  (formatter: 2 decimals, prefix: "$")
{{change}}  (formatter: show +, suffix: "%", hideOnZero: true)
```

---

## Troubleshooting

### Binding Not Updating
1. Verify the field path matches your data structure
2. Check that the data source is selected for the template
3. Ensure the record index is correct (0 = first record)

### Formatter Not Applied
1. Open Binding Settings and verify options are saved
2. Check the browser console for formatting errors
3. Ensure the value type matches the formatter (e.g., number formatters need numeric values)

### Live Data Not Refreshing
1. Check the endpoint URL is accessible (CORS)
2. Verify the `refreshInterval` is reasonable (min 1000ms)
3. Check browser network tab for failed requests
4. Review console for error messages

---

## Best Practices

1. **Use descriptive field paths**: `{{candidate.fullName}}` not `{{c.n}}`
2. **Handle missing data**: Use `hideOnNull` for optional fields
3. **Format numbers appropriately**: Vote counts need comma separators
4. **Test with real data**: Preview with actual data sources before publishing
5. **Consider refresh rates**: Balance freshness vs. API limits

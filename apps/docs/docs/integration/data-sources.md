---
sidebar_position: 4
---

# Data Sources

Connect Nova GFX to external data sources for dynamic content.

## Supported Data Sources

| Type | Description | Use Case |
|------|-------------|----------|
| REST API | HTTP endpoints | Sports scores, weather |
| WebSocket | Real-time streams | Live data feeds |
| Supabase | Database | Persistent data |
| Google Sheets | Spreadsheets | Manual data entry |

## REST API Integration

### Configuration

```typescript
{
  type: 'rest',
  url: 'https://api.example.com/scores',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ${API_KEY}'
  },
  refreshInterval: 5000  // 5 seconds
}
```

### Data Mapping

Map API response to template fields:

```typescript
{
  mapping: {
    'homeScore': 'data.home.score',
    'awayScore': 'data.away.score',
    'homeTeam': 'data.home.name'
  }
}
```

## WebSocket Integration

### Real-time Updates

```typescript
{
  type: 'websocket',
  url: 'wss://live.example.com/scores',
  reconnect: true,
  mapping: {
    'score': 'payload.currentScore'
  }
}
```

## Google Sheets

### Setup

1. Create a Google Sheet with your data
2. Publish sheet to web (Share → Publish)
3. Configure data source with sheet URL

### Example

| Name | Title | Score |
|------|-------|-------|
| John | Forward | 12 |
| Jane | Guard | 8 |

Fields automatically map to column headers.

## Data Binding

### Element Binding

Bind element content to data:

```typescript
// Text element
{
  content: {
    text: '{{homeScore}}'  // Updates from data source
  }
}
```

### Conditional Display

Show/hide based on data:

```typescript
{
  visible: '{{isLive}}'  // Show only when live
}
```

## Best Practices

- Cache data to reduce API calls
- Handle errors gracefully
- Provide fallback values
- Test with various data scenarios

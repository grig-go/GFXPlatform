---
sidebar_position: 5
---

# AI Agents

AI Agents automate data collection and transformation, connecting external data sources to the Nova platform.

## Overview

Agents provide:
- Automated data fetching from APIs
- JSON/XML/RSS feed parsing
- Data transformation and mapping
- Scheduled execution
- Error handling and retry logic

## Agent Wizard

Create agents with the multi-step wizard:

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1      Step 2      Step 3      Step 4      Step 5    │
│  Source  →  Mapping  →  Transform →  Security →  Test      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Configure your data source connection                     │
│                                                             │
│   URL: https://api.example.com/data                        │
│   Method: GET                                               │
│   Headers: Authorization: Bearer [token]                    │
│                                                             │
│   [Test Connection]                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 1: Source Configuration

Configure the data source:

#### Source Types
| Type | Description |
|------|-------------|
| REST API | HTTP/HTTPS endpoints |
| JSON Feed | Static JSON files |
| XML Feed | XML data sources |
| RSS Feed | RSS/Atom feeds |
| Database | Direct database queries |

#### Connection Settings
- URL or connection string
- HTTP method (GET, POST, etc.)
- Headers (authentication, content-type)
- Request body (for POST/PUT)
- Query parameters

### Step 2: Field Mapping

Map source fields to Nova data structure:

#### Visual Mapper
- Drag-and-drop field connections
- Nested object support
- Array handling
- Path expressions (JSONPath, XPath)

#### Mapping Example
```json
{
  "sourceField": "data.results[*].name",
  "targetField": "candidate_name",
  "transform": "uppercase"
}
```

### Step 3: Transformations

Apply data transformations:

#### Available Transformations
| Transform | Description |
|-----------|-------------|
| `uppercase` | Convert to uppercase |
| `lowercase` | Convert to lowercase |
| `trim` | Remove whitespace |
| `number` | Parse as number |
| `date` | Parse as date |
| `split` | Split string into array |
| `join` | Join array into string |
| `replace` | Find and replace |
| `format` | Format with template |
| `calculate` | Mathematical operations |

#### Custom Transformations
Write JavaScript expressions:
```javascript
// Example: Format currency
(value) => `$${parseFloat(value).toFixed(2)}`
```

### Step 4: Security

Configure authentication and security:

#### Authentication Methods
| Method | Description |
|--------|-------------|
| None | No authentication |
| API Key | Header or query param |
| Bearer Token | OAuth bearer token |
| Basic Auth | Username/password |
| OAuth 2.0 | Full OAuth flow |

#### Security Settings
- API key storage (encrypted)
- Token refresh configuration
- Rate limiting
- IP allowlisting

### Step 5: Testing

Test the agent before deployment:

#### Test Features
- Execute single fetch
- Preview transformed data
- Validate mappings
- Check error handling
- Measure response time

## Agent Management

### Agent Dashboard

View and manage all agents:
- Status indicators (active, paused, error)
- Last execution time
- Success/failure counts
- Quick actions (run, pause, edit, delete)

### Scheduling

Configure execution schedule:

#### Schedule Options
| Option | Description |
|--------|-------------|
| Interval | Every X minutes/hours |
| Cron | Cron expression |
| Event | Triggered by events |
| Manual | On-demand only |

#### Example Schedules
```
*/15 * * * *    # Every 15 minutes
0 * * * *       # Every hour
0 6 * * *       # Daily at 6 AM
0 0 * * 1       # Weekly on Monday
```

### Execution History

View past executions:
- Execution timestamp
- Duration
- Status (success/failure)
- Records processed
- Error messages

## Output Formats

### Nova Data Types
Map agent output to Nova data:
- Elections
- Finance
- Sports
- Weather
- News
- School Closings
- Custom

### Output Templates

Define output structure:
```json
{
  "type": "election_results",
  "fields": {
    "race_id": "{source.id}",
    "candidate_name": "{source.name}",
    "votes": "{source.vote_count}",
    "percentage": "{calculated.pct}"
  }
}
```

## Error Handling

### Retry Configuration
- Maximum retry attempts
- Retry delay (exponential backoff)
- Failure notifications

### Error Types
| Error | Handling |
|-------|----------|
| Network | Retry with backoff |
| Authentication | Pause and alert |
| Rate Limit | Delay and retry |
| Parse Error | Log and skip record |
| Validation | Log and continue |

### Alerts
Configure notifications for:
- Agent failures
- Data anomalies
- Rate limit warnings
- Authentication expiry

## OpenAPI Import

Import agent configuration from OpenAPI specs:

1. Upload OpenAPI/Swagger file
2. Select endpoints to import
3. Auto-configure mappings
4. Review and customize

## Best Practices

### Performance
- Set appropriate polling intervals
- Use pagination for large datasets
- Cache unchanged data
- Batch database writes

### Reliability
- Configure retry logic
- Set up failure alerts
- Monitor execution history
- Test after changes

### Security
- Store credentials securely
- Use least-privilege access
- Rotate API keys regularly
- Audit agent access

### Maintenance
- Document agent purpose
- Name agents descriptively
- Archive unused agents
- Review logs periodically

## Examples

### Weather Data Agent
```yaml
name: Weather API Agent
source:
  type: REST API
  url: https://api.weather.com/v3/forecast
  method: GET
  headers:
    apikey: ${WEATHER_API_KEY}
schedule: "*/30 * * * *"  # Every 30 minutes
mapping:
  - source: forecast.daily[*].temp
    target: temperature
  - source: forecast.daily[*].condition
    target: conditions
```

### Election Results Agent
```yaml
name: AP Election Feed
source:
  type: JSON Feed
  url: https://ap.example.com/elections/results
  auth: bearer_token
schedule: "*/5 * * * *"  # Every 5 minutes during elections
mapping:
  - source: races[*].candidates[*].votes
    target: vote_count
  - source: races[*].precincts_reporting
    target: precincts_pct
```

## Next Steps

- [Media Library](/nova/media) - Asset management
- [Data Sources](/nova/data-sources) - Configure providers
- [Field Overrides](/nova/overrides) - Data correction system

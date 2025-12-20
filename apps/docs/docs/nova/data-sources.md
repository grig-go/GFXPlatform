---
sidebar_position: 7
---

# Data Sources

Configure external data providers that feed into Nova dashboards.

## Overview

Data sources connect Nova to external data:
- Real-time data feeds
- API integrations
- File-based imports
- Database connections
- Webhook receivers

## Data Provider Types

### REST API
Connect to HTTP/HTTPS endpoints:
- GET, POST, PUT, DELETE methods
- Header configuration
- Query parameters
- Request body templates

### Database
Direct database connections:
- PostgreSQL
- MySQL
- SQL Server
- Custom ODBC

### File
Import from files:
- JSON
- CSV
- XML
- Excel

### Webhook
Receive pushed data:
- Webhook URL generation
- Payload validation
- Event filtering

## Provider Categories

| Category | Data Types |
|----------|------------|
| Elections | AP, Reuters, State feeds |
| Weather | NWS, OpenWeather, WeatherAPI |
| Sports | ESPN, Sports Reference, League APIs |
| Finance | Market data providers |
| News | RSS feeds, News APIs |
| School Closings | District feeds, State systems |

## Configuration

### Basic Settings

| Setting | Description |
|---------|-------------|
| Name | Provider display name |
| Category | Data category |
| Type | API, Database, File, Webhook |
| URL/Connection | Endpoint or connection string |
| Active | Enable/disable provider |

### Authentication

#### API Key
```yaml
auth:
  type: api_key
  location: header  # or query
  key_name: X-API-Key
  value: ${encrypted_key}
```

#### Bearer Token
```yaml
auth:
  type: bearer
  token: ${encrypted_token}
```

#### OAuth 2.0
```yaml
auth:
  type: oauth2
  client_id: ${client_id}
  client_secret: ${encrypted_secret}
  token_url: https://auth.provider.com/token
  scope: read:data
```

#### Basic Auth
```yaml
auth:
  type: basic
  username: ${username}
  password: ${encrypted_password}
```

### Refresh Settings

| Setting | Description |
|---------|-------------|
| Interval | Polling frequency (seconds/minutes) |
| Retry Attempts | Max retries on failure |
| Retry Delay | Wait between retries |
| Timeout | Request timeout |

### Data Mapping

Map provider fields to Nova schema:
```json
{
  "mappings": [
    {
      "source": "results.races[*]",
      "target": "election_races",
      "fields": {
        "id": "race_id",
        "name": "race_name",
        "candidates": "race_candidates"
      }
    }
  ]
}
```

## Provider Management

### Dashboard

View all providers:
- Status indicators
- Last update time
- Error counts
- Quick actions

### Health Monitoring

Track provider health:
- Response times
- Success rates
- Error logs
- Data freshness

### Testing

Test provider configuration:
1. Click "Test Connection"
2. View sample response
3. Validate data mapping
4. Check authentication

## Built-in Providers

### Election Providers

#### Associated Press (AP)
- Real-time election results
- National and state races
- County-level data
- Historical results

#### Reuters
- Election coverage
- Candidate information
- Race projections

### Weather Providers

#### National Weather Service
- US weather forecasts
- Severe weather alerts
- Radar data
- Historical data

#### OpenWeatherMap
- Global coverage
- Current conditions
- Forecasts
- Weather maps

### Sports Providers

#### ESPN
- Live scores
- Standings
- Team/player data
- News feeds

#### Sports Reference
- Historical statistics
- Player careers
- Team records

### Finance Providers

#### Market Data Providers
- Real-time quotes
- Historical prices
- Market indices
- Cryptocurrency

## Custom Providers

Create custom data providers:

### Step 1: Define Provider
```typescript
{
  name: "Custom Provider",
  category: "custom",
  type: "rest_api",
  config: {
    base_url: "https://api.example.com",
    endpoints: [
      {
        path: "/data",
        method: "GET",
        schedule: "*/5 * * * *"
      }
    ]
  }
}
```

### Step 2: Configure Authentication
Set up credentials in secure storage.

### Step 3: Define Mappings
Map source data to Nova schema.

### Step 4: Test and Deploy
Validate and enable the provider.

## Error Handling

### Error Types

| Error | Action |
|-------|--------|
| Connection Failed | Retry with backoff |
| Authentication Error | Alert and pause |
| Rate Limited | Delay requests |
| Invalid Data | Log and skip |
| Timeout | Retry |

### Alerts

Configure notifications:
- Provider down
- Authentication expiry
- Rate limit warnings
- Data quality issues

## Best Practices

### Reliability
- Configure appropriate retry logic
- Set up redundant providers
- Monitor health continuously
- Document provider dependencies

### Performance
- Optimize refresh intervals
- Use incremental updates
- Cache unchanged data
- Batch requests when possible

### Security
- Encrypt all credentials
- Rotate API keys regularly
- Use least-privilege access
- Audit provider access

### Maintenance
- Review inactive providers
- Update deprecated endpoints
- Test after provider changes
- Document configuration changes

## Troubleshooting

### Common Issues

**Connection Refused**
- Check URL/endpoint
- Verify network access
- Check firewall rules

**Authentication Failed**
- Verify credentials
- Check token expiry
- Validate OAuth flow

**Data Mismatch**
- Review field mappings
- Check data format changes
- Validate transformations

**Rate Limited**
- Increase polling interval
- Implement backoff
- Contact provider for limits

## Next Steps

- [AI Agents](/nova/agents) - Automated data collection
- [Field Overrides](/nova/overrides) - Data correction system
- [Permissions](/nova/permissions) - User access control

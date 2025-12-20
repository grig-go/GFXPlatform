---
sidebar_position: 1
---

# Elections Dashboard

The Elections Dashboard provides real-time election results tracking with comprehensive county-level data, AI-powered insights, and synthetic scenario generation.

## Overview

Track election results from federal to local races with:
- Real-time vote counting and percentage updates
- County-level granular results
- Candidate and party management
- Historical data comparison
- AI-powered predictions and analysis

## Interface

```
┌─────────────────────────────────────────────────────────────┐
│  Filters (Year, Race Type, State)         Search | AI      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────────────┐  ┌──────────────────────┐       │
│   │    Race Card         │  │    Race Card         │       │
│   │  ┌─────┐ ┌─────┐    │  │  ┌─────┐ ┌─────┐    │       │
│   │  │ Dem │ │ Rep │    │  │  │ Dem │ │ Rep │    │       │
│   │  │ 52% │ │ 48% │    │  │  │ 49% │ │ 51% │    │       │
│   │  └─────┘ └─────┘    │  │  └─────┘ └─────┘    │       │
│   └──────────────────────┘  └──────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Features

### Race Management

#### Race Types
- **Presidential** - National and state-level presidential races
- **Senate** - U.S. Senate races by state
- **House** - U.S. House of Representatives by district
- **Governor** - Gubernatorial races
- **State Legislature** - State-level legislative races
- **Local** - Municipal and county races

#### Filtering Options
| Filter | Description |
|--------|-------------|
| Year | Election year (e.g., 2024, 2020) |
| Race Type | Presidential, Senate, House, Governor, etc. |
| State | Filter by state or "All States" |
| Status | Called, Reporting, Not Started |

### Candidate Management

Edit candidate information:
- Name and display name
- Party affiliation
- Incumbent status
- Photo/headshot
- Vote counts (via override system)

### Party Management

Manage political parties:
- Party name and abbreviation
- Display color (hex)
- Custom display name

### County-Level Data

View granular results by county:
- Vote totals per candidate per county
- Percentage of vote share
- Precincts reporting percentage
- FIPS code identification
- Geographic division mapping

## AI Insights

The AI Insights panel provides:

### Race Analysis
- Trend predictions based on historical data
- Key county swings
- Margin analysis
- Turnout comparisons

### Data Summaries
- Automated race call predictions
- Statistical confidence levels
- Comparative performance metrics

## Synthetic Scenarios

Create hypothetical election scenarios using AI:

### Scenario Configuration
1. **Select Base Race** - Choose a real race as the baseline
2. **Adjust Parameters**:
   - Turnout adjustment (percentage change)
   - Party shift (swing toward party)
   - County-level strategies
3. **Generate Scenario** - AI creates realistic synthetic results
4. **Review & Save** - Save scenarios for comparison

### County-Level Strategy
Apply adjustments to specific counties:
- Urban/suburban/rural targeting
- Historical swing county adjustments
- Custom percentage modifications

### Scenario Groups
Organize scenarios:
- Create scenario groups
- Compare multiple scenarios
- Export for analysis

## Field Override System

Correct data without modifying the source:

### How It Works
1. Original AP/Reuters data stored in base tables
2. Override values stored in `election_race_overrides` and `election_candidate_overrides`
3. `getFieldValue()` returns override if present, otherwise original
4. UI badges indicate overridden fields

### Overridable Fields
- Candidate votes
- Vote percentages
- Winner status
- Precincts reporting
- Candidate names and photos
- Race metadata

### Override Example
```typescript
// Check if field has override
if (isFieldOverridden(candidate, 'votes')) {
  // Display override indicator
}

// Get effective value (override or original)
const votes = getFieldValue(candidate.votes);
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `R` | Refresh data |
| `F` | Open filters |
| `/` | Focus search |
| `Esc` | Close dialogs |

## Best Practices

### Data Accuracy
- Verify override values before saving
- Use AI insights for anomaly detection
- Cross-reference with multiple sources

### Performance
- Use filters to limit displayed races
- Paginate large result sets
- Cache AI insight results

### Organization
- Create scenario groups by theme
- Name scenarios descriptively
- Archive completed election cycles

## Integration

### Data Sources
Election data is aggregated from:
- Associated Press (AP)
- Reuters
- State election offices
- Custom data providers

### Export Options
- JSON export of race data
- CSV export for analysis
- API access for external systems

## Next Steps

- [Finance Dashboard](/nova/finance) - Market data tracking
- [AI Agents](/nova/agents) - Automated data collection
- [Field Overrides](/nova/overrides) - Data correction system

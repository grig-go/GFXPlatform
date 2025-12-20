---
sidebar_position: 11
---

# Field Overrides

The field override system allows manual data corrections without modifying source data.

## Overview

Field overrides enable:
- Correct inaccurate data from feeds
- Update stale information
- Add missing values
- Preserve original data for reference

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Data Flow                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Data Source → Base Table → Override Check → Display       │
│        ↓            ↓              ↓            ↓          │
│     AP/API     Original      Override?      Effective      │
│     Feeds       Values        Table          Value         │
│                                                             │
│   If override exists → Use override value                   │
│   If no override    → Use original value                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Storage Structure

**Base Tables**
- Store original data from sources
- Updated by data providers
- Read-only for users

**Override Tables**
- Store user corrections
- Reference base table records
- Track override metadata

## Override Tables

| Base Table | Override Table |
|------------|----------------|
| `election_races` | `election_race_overrides` |
| `election_candidates` | `election_candidate_overrides` |
| `finance_securities` | `finance_security_overrides` |
| `sports_games` | `sports_game_overrides` |
| `weather_locations` | `weather_location_overrides` |
| `news_articles` | `news_article_overrides` |

## Overridable Fields

### Election Data

**Race Fields**
- Race name
- Precincts reporting
- Total votes
- Race status (called/not called)
- Winner

**Candidate Fields**
- Display name
- Votes
- Vote percentage
- Photo URL
- Incumbent status

### Financial Data

**Security Fields**
- Display name
- Current price
- Price change
- Volume
- Market cap

### Sports Data

**Game Fields**
- Scores
- Game status
- Time/period
- Venue

**Team Fields**
- Team name
- Abbreviation
- Logo

### Weather Data

**Location Fields**
- Temperature
- Conditions
- Forecast data

### News Data

**Article Fields**
- Headline
- Summary
- Category
- Image URL

## Using Overrides

### Creating an Override

1. Navigate to the data item
2. Click the edit icon
3. Modify the field value
4. Save changes

The override is stored separately; original data remains intact.

### Viewing Overrides

Overridden fields display:
- Visual indicator (badge/icon)
- Original value on hover
- Override timestamp
- Override author

### Removing Overrides

1. Navigate to the overridden item
2. Click the override indicator
3. Select "Remove Override"
4. Original value is restored

## API Usage

### Check for Override
```typescript
import { isFieldOverridden } from '@/data/overrideFieldMappings';

if (isFieldOverridden(candidate, 'votes')) {
  // Field has been overridden
  console.log('Votes have been manually corrected');
}
```

### Get Effective Value
```typescript
import { getFieldValue } from '@/data/overrideFieldMappings';

// Returns override value if exists, otherwise original
const displayName = getFieldValue(candidate.name);
const votes = getFieldValue(candidate.votes);
```

### FieldOverride Type
```typescript
interface FieldOverride<T> {
  value: T;           // Current effective value
  original?: T;       // Original value (if overridden)
  isOverridden: boolean;
  overriddenAt?: Date;
  overriddenBy?: string;
}
```

### Creating Override (API)
```typescript
const override = await supabase
  .from('election_candidate_overrides')
  .upsert({
    candidate_id: candidate.id,
    field_name: 'votes',
    override_value: 12500,
    original_value: candidate.votes,
    created_by: userId
  });
```

### Removing Override (API)
```typescript
const result = await supabase
  .from('election_candidate_overrides')
  .delete()
  .eq('candidate_id', candidate.id)
  .eq('field_name', 'votes');
```

## Override Metadata

Each override records:

| Field | Description |
|-------|-------------|
| `id` | Override record ID |
| `entity_id` | Reference to base record |
| `field_name` | Name of overridden field |
| `override_value` | New value |
| `original_value` | Original value at time of override |
| `created_at` | Override creation time |
| `created_by` | User who created override |
| `notes` | Optional explanation |

## UI Indicators

### Visual Markers
- **Badge**: Small indicator next to field
- **Color**: Different background color
- **Icon**: Override icon (pencil, etc.)
- **Tooltip**: Shows original value

### Override Panel
Dedicated panel showing:
- All overridden fields
- Original vs override values
- Override history
- Quick actions

## Best Practices

### When to Override
- Source data is clearly incorrect
- Information is outdated
- Formatting needs correction
- Missing critical data

### When NOT to Override
- Temporary data (will be updated)
- Preference-based changes
- Data you're unsure about
- Large-scale corrections (use agents)

### Documentation
- Add notes explaining the override
- Reference source of correct data
- Track approval if required

### Review Process
1. Identify incorrect data
2. Verify correct value
3. Create override with notes
4. Review periodically
5. Remove when source corrected

## Override History

Track override changes:
- Creation date/time
- Creating user
- Previous values
- Modification history

## Permissions

Override permissions:
- `{app}.{resource}.write` - Create/modify overrides
- `{app}.{resource}.admin` - Delete overrides, view history

## Troubleshooting

### Override Not Displaying
1. Verify override was saved
2. Check field name matches
3. Refresh the page
4. Check permissions

### Original Value Returned
1. Override may have been removed
2. Check override table for record
3. Verify entity ID matches

### Conflicting Values
1. Check for multiple overrides
2. Review override history
3. Clear and recreate if needed

## Migration

When migrating data:
- Export overrides separately
- Apply overrides after base data
- Verify override references
- Test effective values

## Next Steps

- [Permissions](/nova/permissions) - Access control
- [Data Sources](/nova/data-sources) - Provider configuration
- [AI Agents](/nova/agents) - Automated corrections

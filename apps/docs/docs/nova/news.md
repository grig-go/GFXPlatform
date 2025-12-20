---
sidebar_position: 8
---

# News Dashboard

The News Dashboard aggregates news articles from multiple sources with AI-powered categorization and summarization.

## Overview

Manage news content with:
- Multi-source aggregation
- Category organization
- AI summarization
- Breaking news alerts
- Content curation

## Interface

```
┌─────────────────────────────────────────────────────────────┐
│  All | Breaking | Local | National | World     Search | AI  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────────────────────────────────────────┐     │
│   │  BREAKING: Major Story Headline                   │     │
│   │  Source: AP | 5 minutes ago                       │     │
│   │  Brief summary of the news article...             │     │
│   └──────────────────────────────────────────────────┘     │
│                                                             │
│   ┌──────────────────────┐  ┌──────────────────────┐       │
│   │  Story Headline      │  │  Story Headline      │       │
│   │  Source | Time       │  │  Source | Time       │       │
│   │  Summary text...     │  │  Summary text...     │       │
│   └──────────────────────┘  └──────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Features

### News Sources

#### Supported Source Types
| Type | Description |
|------|-------------|
| RSS Feeds | Standard RSS/Atom feeds |
| News APIs | NewsAPI, AP, Reuters |
| Custom APIs | Custom news endpoints |
| Scrapers | Web scraping agents |

#### Source Configuration
- Feed URL or API endpoint
- Update frequency
- Category assignment
- Priority level

### Categories

Organize news by category:
- Breaking News
- Local
- National
- World
- Politics
- Business
- Sports
- Entertainment
- Technology
- Health
- Custom categories

### Article Information

| Field | Description |
|-------|-------------|
| Headline | Article title |
| Summary | Brief description |
| Source | News source name |
| Published | Publication date/time |
| Author | Article author |
| Category | Content category |
| Tags | Topic tags |
| Image | Featured image |
| URL | Original article link |

### Breaking News

Highlight important stories:
- Mark as breaking
- Priority display
- Alert notifications
- Auto-expire after duration

## AI Insights

### Summarization
- Automatic article summaries
- Key points extraction
- TL;DR generation

### Categorization
- Auto-categorize articles
- Topic detection
- Sentiment analysis

### Related Stories
- Find similar articles
- Track story developments
- Link related coverage

### Trend Detection
- Trending topics
- Story velocity
- Geographic spread

## Filtering and Search

### Filters
| Filter | Options |
|--------|---------|
| Category | All categories |
| Source | Select sources |
| Date | Today, This Week, Custom |
| Priority | Breaking, Normal |
| Has Image | Yes/No |

### Search
- Full-text search
- Headline search
- Author search
- Tag search

### Sorting
- Most Recent
- Most Relevant
- Most Read
- Source

## Curation

### Manual Curation
- Feature stories
- Hide/remove stories
- Edit display order
- Add editorial notes

### Auto-Curation
Configure rules for:
- Promoting stories
- Filtering content
- Category assignment
- Breaking news detection

## Data Management

### Article Storage
- Automatic archiving
- Retention policies
- Duplicate detection
- Image caching

### Field Overrides
Correct article data:
- Fix headlines
- Update summaries
- Correct categories
- Add missing metadata

## Integration

### Broadcast Graphics
Use news in graphics:
1. Select articles
2. Map to ticker/lower third
3. Configure rotation
4. Set update interval

### Rundown Integration
- Add stories to rundown
- Auto-update content
- Track usage

### Export
- JSON export
- CSV export
- API access

## Source Management

### Adding Sources

1. Click "Add Source"
2. Enter feed URL or API details
3. Configure authentication
4. Set update frequency
5. Assign categories
6. Test and save

### Source Health
Monitor source status:
- Last update time
- Article count
- Error rate
- Latency

### Source Priority
Set priority levels:
- **High**: Check frequently, prominent display
- **Normal**: Standard updates
- **Low**: Less frequent checks

## Notifications

Configure alerts for:
- Breaking news
- Keywords/topics
- Source errors
- Content spikes

## Best Practices

### Content Quality
- Vet sources for accuracy
- Configure duplicate detection
- Review AI categorization
- Curate featured content

### Performance
- Limit active sources
- Set appropriate refresh rates
- Archive old content
- Optimize image loading

### Organization
- Create clear category structure
- Use consistent tagging
- Document source priorities
- Review regularly

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `B` | Toggle breaking news filter |
| `R` | Refresh |
| `/` | Focus search |
| `Enter` | Open article |
| `F` | Feature article |
| `H` | Hide article |

## Next Steps

- [School Closings](/nova/school-closings) - Closure tracking
- [AI Agents](/nova/agents) - Automated data collection
- [Data Sources](/nova/data-sources) - Configure providers

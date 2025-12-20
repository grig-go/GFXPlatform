---
sidebar_position: 3
---

# Nova (Data Dashboard)

Nova is the data management and command center for the Emergent Platform. It provides real-time data aggregation, AI-powered automation, and centralized control for broadcast operations.

## Overview

Nova serves as the mission control for:
- **Real-time Data Aggregation** - Elections, finance, sports, weather, news, and school closings
- **Graphics Project Management** - Integration with Nova GFX and Pulsar GFX
- **AI-Powered Automation** - Data collection agents and transformations
- **Media Library** - Asset management and distribution

## Interface Overview

### Home Dashboard

The home page displays configurable category cards:

```
┌─────────────────────────────────────────────────────────────┐
│  Header (App Switcher, User Menu, Settings)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│   │   Data   │  │ Graphics │  │  Agents  │  │  Media   │   │
│   │          │  │          │  │          │  │ Library  │   │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Navigation

- **Data Dashboards** - Access 6 real-time data dashboards
- **Graphics** - Manage broadcast graphics projects
- **Agents** - Configure AI data collection agents
- **Media Library** - Upload and organize media assets

## Data Dashboards

Nova provides six specialized data dashboards:

| Dashboard | Description |
|-----------|-------------|
| Elections | Real-time election results tracking with county-level data |
| Finance | Stock and cryptocurrency monitoring |
| Sports | Sports scores, standings, and tournaments |
| Weather | Weather forecasts and conditions by location |
| News | News article aggregation and categorization |
| School Closings | School closure tracking and announcements |

Each dashboard includes:
- Real-time data updates
- AI-powered insights
- Field override system for data corrections
- Export and sharing capabilities

## Key Features

### Field Override System

Manually correct data without modifying source:

1. Original data stored in base tables
2. Override values stored separately
3. UI indicates overridden fields with badges
4. Toggle between original and override values

### AI Insights

Each dashboard includes AI-powered analysis:

- **Elections** - Race predictions and trend analysis
- **Finance** - Market analysis and recommendations
- **Sports** - Game predictions and team analysis
- **Weather** - Severe weather alerts and summaries
- **News** - Article summarization and topic extraction

### Dashboard Configuration

Customize your workspace:

- Toggle dashboard visibility
- Reorder dashboards via drag-and-drop
- Set default dashboard
- Keyboard shortcut: `Ctrl+Shift+G+M`

## User Management

### Permission System

Nova uses a granular permission model:

| Role | Description |
|------|-------------|
| Superuser | Full system access |
| Admin | User and permission management |
| Active User | Access based on assigned permissions |
| Pending User | Read-only access |

Permissions follow the pattern: `{app}.{resource}.{action}`

Examples:
- `nova.election.read` - View election data
- `nova.finance.write` - Edit financial data
- `system.users.admin` - Manage users

### First-Time Setup

1. Create superuser via CLI: `npm run create-superuser`
2. Login as superuser
3. Create users and groups
4. Assign permissions

## Getting Started

### Requirements

- Node.js 18+
- pnpm
- Supabase account

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Create first superuser
npm run create-superuser
```

### Environment Variables

```bash
# Nova Supabase Database
VITE_NOVA_SUPABASE_URL=https://[project].supabase.co
VITE_NOVA_SUPABASE_ANON_KEY=[key]

# GFX Supabase Database (for graphics integration)
VITE_GFX_SUPABASE_URL=https://[project].supabase.co
VITE_GFX_SUPABASE_ANON_KEY=[key]
```

## Next Steps

- [Elections Dashboard](/nova/elections) - Real-time election tracking
- [Finance Dashboard](/nova/finance) - Market data management
- [AI Agents](/nova/agents) - Automated data collection
- [Media Library](/nova/media) - Asset management

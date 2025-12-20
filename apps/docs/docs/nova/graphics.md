---
sidebar_position: 9
---

# Graphics Projects

Manage broadcast graphics projects with integration to Nova GFX designer and Pulsar GFX playout.

## Overview

Graphics project management provides:
- Project creation and organization
- Template management
- Layer configuration
- Integration with Nova GFX and Pulsar GFX

## Interface

```
┌─────────────────────────────────────────────────────────────┐
│  Graphics Projects                    New Project | Import  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────────────┐  ┌──────────────────────┐       │
│   │  Election Graphics   │  │  Weather Package     │       │
│   │  12 templates        │  │  8 templates         │       │
│   │  Modified: Today     │  │  Modified: Yesterday │       │
│   │  [Edit] [Preview]    │  │  [Edit] [Preview]    │       │
│   └──────────────────────┘  └──────────────────────┘       │
│                                                             │
│   ┌──────────────────────┐  ┌──────────────────────┐       │
│   │  Sports Lower Thirds │  │  Breaking News       │       │
│   │  6 templates         │  │  4 templates         │       │
│   │  Modified: 2 days    │  │  Modified: 1 week    │       │
│   │  [Edit] [Preview]    │  │  [Edit] [Preview]    │       │
│   └──────────────────────┘  └──────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Features

### Project Management

#### Creating Projects

1. Click "New Project"
2. Enter project details:
   - Name
   - Description
   - Resolution (1920x1080, 3840x2160, etc.)
   - Frame rate
3. Choose starting option:
   - Blank project
   - From system template
   - Import existing

#### Project Information
| Field | Description |
|-------|-------------|
| Name | Project display name |
| Description | Project description |
| Resolution | Canvas dimensions |
| Frame Rate | Animation frame rate |
| Templates | Number of templates |
| Created | Creation date |
| Modified | Last modified date |
| Owner | Project owner |

### Templates

Templates are individual graphic designs within a project:
- Lower thirds
- Full screens
- Tickers
- Maps
- Charts
- Custom graphics

#### Template Properties
- Name and description
- Layer assignment (z-order)
- Animation phases (IN, LOOP, OUT)
- Content fields
- Design tokens

### Layers

Organize templates by layer:
- **Layer 1**: Background elements
- **Layer 2**: Lower thirds
- **Layer 3**: Tickers
- **Layer 4**: Full screens
- **Layer 5**: Alerts/breaking news

Layers determine z-order in playout.

## System Templates

Pre-built templates to accelerate development:

| Template | Description |
|----------|-------------|
| Election Results | Vote totals, percentages, maps |
| Weather Forecast | Current, hourly, daily forecasts |
| Sports Scores | Game scores, standings |
| News Lower Third | Headline, summary |
| Financial Ticker | Stock prices, changes |

### Using System Templates

1. Create new project
2. Select "From System Template"
3. Choose template category
4. Customize for your brand
5. Add to project

## Integration

### Nova GFX (Designer)

Open projects in the designer:
1. Click "Edit" on a project
2. Nova GFX opens in new tab
3. Design and animate templates
4. Save changes automatically

### Pulsar GFX (Playout)

Use projects in playout:
1. Projects appear in Pulsar project list
2. Templates available for playlist
3. Data binding to Nova dashboards
4. Real-time updates

### Data Binding

Connect graphics to Nova data:

```typescript
// Bind election data to template
{
  template: "election-results",
  bindings: {
    "candidate-name": "election.race.candidates[0].name",
    "vote-count": "election.race.candidates[0].votes",
    "percentage": "election.race.candidates[0].percentage"
  }
}
```

## Project Actions

### Edit
Open in Nova GFX designer.

### Preview
View templates with sample data.

### Duplicate
Create a copy of the project.

### Export
Export project as:
- JSON package
- ZIP archive
- Template bundle

### Import
Import projects from:
- JSON files
- ZIP archives
- Other Nova instances

### Delete
Remove project (with confirmation).

## Collaboration

### Sharing
Share projects with team members:
- View access
- Edit access
- Admin access

### Version History
Track project changes:
- Automatic versioning
- Restore previous versions
- Compare versions

### Comments
Add notes to projects:
- Project-level comments
- Template-level comments
- Element-level comments

## Organization

### Folders
Organize projects into folders:
- Create nested folders
- Move projects between folders
- Folder permissions

### Tags
Categorize with tags:
- Brand tags
- Show tags
- Content type tags

### Search
Find projects by:
- Name
- Description
- Tags
- Date range

## Best Practices

### Organization
- Use consistent naming conventions
- Organize by show/brand
- Tag appropriately
- Document project purpose

### Performance
- Limit templates per project
- Optimize animations
- Use appropriate resolutions
- Test on target hardware

### Collaboration
- Assign clear ownership
- Use comments for context
- Review before publishing
- Track version history

## Quick Actions

| Action | Description |
|--------|-------------|
| Double-click | Open in designer |
| Right-click | Context menu |
| Drag | Move to folder |
| `Ctrl+D` | Duplicate |
| `Delete` | Delete project |

## Next Steps

- [Nova GFX Designer](/apps/nova-gfx) - Design graphics
- [Pulsar GFX Playout](/apps/pulsar-gfx) - Play out graphics
- [Templates](/templates/overview) - Template documentation

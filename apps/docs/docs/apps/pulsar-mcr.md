---
sidebar_position: 5
---

# Pulsar MCR (Master Control Room)

Pulsar MCR is a professional broadcast media management and control application designed for television and media production environments. It serves as a centralized hub for managing television channels, content scheduling, graphics templates, virtual sets, sponsor scheduling, and data integrations.

## Overview

Pulsar MCR provides:
- **Channel Management** - Create and manage broadcast channels (Unreal, Vizrt, Pixera, Web)
- **Content Scheduling** - Organize playlists and schedule content for playback
- **Template System** - Form.io powered templates with dynamic data binding
- **Widget Control** - Real-time Unreal Engine parameter control via RCP
- **Virtual Set Design** - AI-powered background generation and UE integration
- **Data Integrations** - Connect to APIs, databases, files, and RSS feeds
- **Sponsor & Banner Scheduling** - Time-based and trigger-based scheduling

## Interface Overview

### Main Workspace

```
┌─────────────────────────────────────────────────────────────┐
│  Header (Theme Toggle, User Menu)                           │
├─────────────────────────────────────────────────────────────┤
│  Tab Bar (Channels, Schedules, Content, Templates, etc.)    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    Active Page Content                      │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Available Pages

| Page | Description |
|------|-------------|
| **Channels** | Create and manage broadcast channels |
| **Channel Schedules** | Organize content playlists for channels |
| **Content** | Manage your content library with templates and buckets |
| **Templates** | Create reusable form-based templates |
| **Widgets** | View and manage Unreal Engine widgets |
| **Widget Builder** | Create and configure widgets with preview |
| **Virtual Set** | AI-powered virtual set designer |
| **Integrations** | Manage data source connections |
| **Sponsors** | Schedule sponsor media |
| **Banners** | Manage banner schedules |

## Core Concepts

### Content Hierarchy

Content is organized in a three-level hierarchy:

```
Folders (Organizational)
└── Buckets (Collections)
    └── Items (Individual content pieces)
```

| Level | Purpose |
|-------|---------|
| **Folder** | Organize buckets by category, show, or project |
| **Bucket** | Group related content items together |
| **Item** | Individual content piece with template data |

### Channel Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Unreal** | Unreal Engine integration | Real-time graphics and virtual sets |
| **Vizrt** | Vizrt graphics system | Traditional broadcast graphics |
| **Pixera** | Pixera media server | LED walls and projection mapping |
| **Web** | Web-based output | Digital signage and web displays |

### Templates

Templates define the structure of content items using Form.io:
- Define form fields (text, numbers, dropdowns, files, etc.)
- Support dynamic data from integrations
- Organize with carousels and tab fields
- Preview forms before deployment

## Getting Started

### 1. Log In

Enter your email and password to access the application. Contact your system administrator if you need an account.

### 2. Create a Channel

1. Navigate to the **Channels** page
2. Click **Add Channel**
3. Enter name, select type, add description
4. Click **Save**

### 3. Set Up Content

1. Go to the **Content** page
2. Create a **Folder** for organization
3. Create a **Bucket** with a template
4. Add **Items** to the bucket

### 4. Create a Playlist

1. Navigate to **Channel Schedules**
2. Select your channel
3. Click **Add Playlist**
4. Add content from buckets
5. Configure scheduling

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Save current item |
| `Delete` | Delete selected items |
| `Ctrl + A` | Select all items in grid |
| `Escape` | Cancel current operation |
| `F5` | Refresh current view |

## Integration

### With Nova GFX

Templates created in Nova GFX can be used in Pulsar MCR:
- Access shared template library
- Content fields remain editable
- Real-time preview of changes

### With Unreal Engine

Direct control via Remote Control Protocol (RCP):
- Scan for available presets
- Create widgets from presets
- Real-time property updates
- Virtual set control

### With External Data

Connect to various data sources:
- REST APIs (weather, sports, stocks)
- Databases (MySQL, PostgreSQL, SQL Server)
- Files (CSV, Excel, JSON)
- RSS/Atom feeds

## Next Steps

- [Channels](/pulsar-mcr/channels) - Channel configuration
- [Content Management](/pulsar-mcr/content) - Content hierarchy and management
- [Templates](/pulsar-mcr/templates) - Form.io template system
- [Widgets](/pulsar-mcr/widgets) - Unreal Engine widget control
- [Virtual Set](/pulsar-mcr/virtual-set) - AI-powered virtual sets
- [Integrations](/pulsar-mcr/integrations) - Data source connections
- [Scheduling](/pulsar-mcr/scheduling) - Sponsors and banners

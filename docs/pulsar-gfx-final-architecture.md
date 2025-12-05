# Pulsar GFX - Complete Architecture & Implementation Guide

**Version:** 2.0 (Final)
**Platform:** Emergent Platform
**Status:** Ready for Implementation

---

## 1. Overview

### 1.1 What is Pulsar GFX?

Pulsar GFX is the **graphics control application** for the Emergent Platform. It works alongside Nova GFX (the AI design tool) and Nova Player (the renderer), all connected through Nova (the central data platform).

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           EMERGENT PLATFORM                                          │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│                                      NOVA                                            │
│                           (Data Platform & Media Store)                              │
│                                                                                      │
│                    ┌──────────────────────────────────────────┐                      │
│                    │  • Supabase Database (PostgreSQL)        │                      │
│                    │  • Media Library (Supabase Storage)      │                      │
│                    │  • Edge Functions                        │                      │
│                    │  • Realtime Sync                         │                      │
│                    └──────────────────────────────────────────┘                      │
│                                        ▲                                             │
│                                        │                                             │
│          ┌─────────────────────────────┼─────────────────────────────┐              │
│          │                             │                             │              │
│          ▼                             ▼                             ▼              │
│   ┌─────────────┐              ┌─────────────┐              ┌─────────────┐         │
│   │  NOVA GFX   │              │ PULSAR GFX  │              │ NOVA PLAYER │         │
│   │             │              │             │              │             │         │
│   │ AI HTML     │              │ Graphics    │  Commands    │ Render      │         │
│   │ graphic     │              │ control &   │─────────────►│ engine for  │         │
│   │ design tool │              │ playout app │              │ HTML graphics│        │
│   │             │              │             │              │             │         │
│   │ • Templates │              │ • Pages     │              │ • Render    │         │
│   │ • Animations│              │ • Playlists │              │ • Animate   │         │
│   │ • Fields    │              │ • Channels  │              │ • Output    │         │
│   │ • Publish   │              │ • Custom UI │              │             │         │
│   └─────────────┘              └─────────────┘              └─────────────┘         │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Core Concepts

| Concept | Definition |
|---------|------------|
| **Project** | Published project stored in Nova (created by Nova GFX) |
| **Template** | Graphic blueprint with editable fields and animations |
| **Page** | Template instance with specific content (payload) |
| **Payload** | Content data that fills template fields |
| **Page Group** | Optional organizational grouping of pages |
| **Playlist** | Container for pages with Manual/Timed playback modes |
| **Channel** | Output destination connected to a Nova Player |
| **Nova Player** | Render engine for HTML graphics |
| **Custom UI** | User-built control panel for live operations |
| **Initialize** | Process of loading/updating project on Nova Player |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              PULSAR GFX SYSTEM                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                           PULSAR GFX APPLICATION                                │ │
│  │                                                                                  │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │ │
│  │  │   Project    │ │   Template   │ │    Page      │ │   Playlist   │           │ │
│  │  │   Loader     │ │   Browser    │ │   Editor     │ │   Manager    │           │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘           │ │
│  │                                                                                  │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │ │
│  │  │   Preview    │ │   Channel    │ │   Custom     │ │   Playout    │           │ │
│  │  │   Engine     │ │   Manager    │ │   UI Builder │ │   Controls   │           │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘           │ │
│  │                                                                                  │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                            │
│                                         ▼                                            │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                         NOVA (Data Platform)                                    │ │
│  │                                                                                  │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │ │
│  │  │  Projects   │ │  Playlists  │ │  Channels   │ │  Realtime   │              │ │
│  │  │  Templates  │ │  Pages      │ │  State      │ │  Commands   │              │ │
│  │  │  Media      │ │  Custom UIs │ │  Logs       │ │  Sync       │              │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘              │ │
│  │                                                                                  │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                            │
│              ┌──────────────────────────┼──────────────────────────┐                │
│              ▼                          ▼                          ▼                │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐      │
│  │    NOVA PLAYER       │  │    NOVA PLAYER       │  │    NOVA PLAYER       │      │
│  │    Channel 1         │  │    Channel 2         │  │    Ticker            │      │
│  │    (Render PC #1)    │  │    (Render PC #2)    │  │    (Render PC #3)    │      │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────┘      │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript |
| **State** | Zustand |
| **UI Components** | @emergent-platform/ui (shadcn/ui) |
| **Styling** | TailwindCSS |
| **Backend** | Nova (Supabase: PostgreSQL + Realtime + Storage) |
| **Types** | @emergent-platform/types |
| **Preview/Playout** | HTML5 + Web Animations API |

---

## 3. Data Model

### 3.1 Database Schema

```sql
-- =====================================================
-- PULSAR GFX DATABASE SCHEMA
-- =====================================================

-- -------------------------------------------------
-- PLAYLISTS
-- -------------------------------------------------
CREATE TABLE pulsar_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  project_id UUID REFERENCES nova_projects(id),
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Playback mode
  mode TEXT DEFAULT 'manual' CHECK (mode IN ('manual', 'timed')),
  
  -- Timed mode settings
  default_duration INTEGER DEFAULT 5000,  -- Default page duration (ms)
  end_behavior TEXT DEFAULT 'stop' CHECK (end_behavior IN ('stop', 'hold', 'loop')),
  
  -- State
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'playing', 'paused')),
  current_page_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- -------------------------------------------------
-- PAGE GROUPS (Optional organization within playlist)
-- -------------------------------------------------
CREATE TABLE pulsar_page_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES pulsar_playlists(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  color TEXT,  -- Hex color for visual identification
  sort_order INTEGER NOT NULL,
  is_collapsed BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------
-- PAGES (Template instances with payload)
-- -------------------------------------------------
CREATE TABLE pulsar_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  playlist_id UUID REFERENCES pulsar_playlists(id) ON DELETE CASCADE,
  template_id UUID REFERENCES nova_templates(id),
  page_group_id UUID REFERENCES pulsar_page_groups(id) ON DELETE SET NULL,  -- Optional
  
  name TEXT NOT NULL,
  
  -- Content payload: simple key-value
  -- Structure: { "element_id": "content_value", ... }
  -- Example: { "text_name": "John Smith", "img_photo": "https://..." }
  payload JSONB NOT NULL DEFAULT '{}',
  
  -- Data bindings (optional)
  data_bindings JSONB DEFAULT '[]',
  
  -- Timing (for timed mode)
  duration INTEGER,  -- Override default duration (ms)
  
  -- Organization
  sort_order INTEGER NOT NULL,
  tags TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------
-- CHANNELS (Output destinations)
-- -------------------------------------------------
CREATE TABLE pulsar_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  
  name TEXT NOT NULL,
  channel_code TEXT NOT NULL,  -- "CH1", "CH2", "TICKER"
  channel_type TEXT DEFAULT 'graphics' CHECK (channel_type IN (
    'graphics', 'ticker', 'fullscreen', 'preview'
  )),
  
  -- Nova Player connection
  player_url TEXT,
  player_status TEXT DEFAULT 'disconnected' CHECK (player_status IN (
    'disconnected', 'connecting', 'connected', 'error'
  )),
  last_heartbeat TIMESTAMPTZ,
  
  -- Currently loaded project
  loaded_project_id UUID REFERENCES nova_projects(id),
  last_initialized TIMESTAMPTZ,
  
  -- Layer configuration
  layer_count INTEGER DEFAULT 4,
  layer_config JSONB DEFAULT '[
    {"index": 0, "name": "Layer 1", "allowedTypes": []},
    {"index": 1, "name": "Layer 2", "allowedTypes": []},
    {"index": 2, "name": "Layer 3", "allowedTypes": []},
    {"index": 3, "name": "Layer 4", "allowedTypes": []}
  ]',
  
  -- Access control
  assigned_operators UUID[],
  is_locked BOOLEAN DEFAULT FALSE,
  locked_by UUID REFERENCES auth.users(id),
  
  -- Initialize settings
  auto_initialize_on_connect BOOLEAN DEFAULT TRUE,
  auto_initialize_on_publish BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, channel_code)
);

-- -------------------------------------------------
-- CHANNEL STATE (Real-time layer state)
-- -------------------------------------------------
CREATE TABLE pulsar_channel_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES pulsar_channels(id) ON DELETE CASCADE UNIQUE,
  
  -- Layer states
  layers JSONB DEFAULT '[
    {"index": 0, "state": "empty", "pageId": null, "onAirSince": null},
    {"index": 1, "state": "empty", "pageId": null, "onAirSince": null},
    {"index": 2, "state": "empty", "pageId": null, "onAirSince": null},
    {"index": 3, "state": "empty", "pageId": null, "onAirSince": null}
  ]',
  
  -- Pending command (Pulsar writes, Nova Player reads)
  pending_command JSONB,
  command_sequence INTEGER DEFAULT 0,
  
  -- Last executed
  last_command JSONB,
  last_command_at TIMESTAMPTZ,
  last_acknowledged_at TIMESTAMPTZ,
  
  -- Control lock
  controlled_by UUID REFERENCES auth.users(id),
  control_locked_at TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------
-- CUSTOM UIs
-- -------------------------------------------------
CREATE TABLE pulsar_custom_uis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Scope (what this UI controls)
  scope_type TEXT DEFAULT 'template' CHECK (scope_type IN (
    'template',   -- Controls all pages of a template type
    'page',       -- Controls a specific page
    'standalone'  -- Generic, targets any template/layer
  )),
  template_id UUID REFERENCES nova_templates(id),  -- For template scope
  page_id UUID REFERENCES pulsar_pages(id),        -- For page scope
  
  -- Layout
  layout JSONB DEFAULT '{"width": 400, "height": 300, "columns": 2}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- -------------------------------------------------
-- CUSTOM UI CONTROLS
-- -------------------------------------------------
CREATE TABLE pulsar_custom_ui_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_ui_id UUID REFERENCES pulsar_custom_uis(id) ON DELETE CASCADE,
  
  -- Control type
  control_type TEXT NOT NULL CHECK (control_type IN (
    'button', 'number', 'text', 'dropdown', 'toggle', 'timer', 'label', 'spacer'
  )),
  
  label TEXT,
  
  -- Position & size
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  width INTEGER DEFAULT 1,
  height INTEGER DEFAULT 1,
  
  -- Styling
  color TEXT,
  size TEXT DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large')),
  
  -- Action configuration
  action JSONB NOT NULL,
  -- Examples:
  -- {"type": "update_field", "fieldId": "score_home", "value": null}
  -- {"type": "increment", "fieldId": "score_home", "by": 1}
  -- {"type": "decrement", "fieldId": "score_home", "by": 1}
  -- {"type": "play", "layerIndex": 0}
  -- {"type": "stop", "layerIndex": 0}
  -- {"type": "trigger_animation", "animationId": "goal_celebration"}
  
  -- For dropdown/select controls
  options JSONB,  -- [{"label": "Q1", "value": "1"}, ...]
  
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------
-- COMMAND LOG (Audit trail)
-- -------------------------------------------------
CREATE TABLE pulsar_command_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  channel_id UUID REFERENCES pulsar_channels(id),
  
  -- Command details
  command_type TEXT NOT NULL,
  layer_index INTEGER,
  page_id UUID REFERENCES pulsar_pages(id),
  payload JSONB,
  
  -- Execution
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  
  -- Who/what triggered
  triggered_by UUID REFERENCES auth.users(id),
  trigger_source TEXT CHECK (trigger_source IN (
    'manual', 'playlist_auto', 'custom_ui', 'api', 'scheduled'
  ))
);

-- -------------------------------------------------
-- INDEXES
-- -------------------------------------------------
CREATE INDEX idx_pages_playlist ON pulsar_pages(playlist_id);
CREATE INDEX idx_pages_template ON pulsar_pages(template_id);
CREATE INDEX idx_pages_group ON pulsar_pages(page_group_id);
CREATE INDEX idx_page_groups_playlist ON pulsar_page_groups(playlist_id);
CREATE INDEX idx_channel_state_channel ON pulsar_channel_state(channel_id);
CREATE INDEX idx_custom_ui_controls_ui ON pulsar_custom_ui_controls(custom_ui_id);
CREATE INDEX idx_command_log_channel ON pulsar_command_log(channel_id, executed_at DESC);

-- -------------------------------------------------
-- REALTIME
-- -------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE pulsar_playlists;
ALTER PUBLICATION supabase_realtime ADD TABLE pulsar_pages;
ALTER PUBLICATION supabase_realtime ADD TABLE pulsar_channel_state;
ALTER PUBLICATION supabase_realtime ADD TABLE pulsar_channels;

-- -------------------------------------------------
-- ROW LEVEL SECURITY
-- -------------------------------------------------
ALTER TABLE pulsar_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulsar_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulsar_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulsar_channel_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulsar_custom_uis ENABLE ROW LEVEL SECURITY;

-- Policies based on organization_id (similar to Nova GFX patterns)
```

### 3.2 TypeScript Types

```typescript
// =====================================================
// PULSAR GFX TYPES
// Located in: packages/types/src/pulsar/
// =====================================================

// -------------------------------------------------
// TEMPLATE (from Nova GFX)
// -------------------------------------------------

// Only each element's Content tab is controllable
// Style, Layout, Animation stay as designed in Nova GFX

export interface Template {
  id: string;
  projectId: string;
  name: string;
  category: string;
  layerType: 'fullscreen' | 'lower_third' | 'bug' | 'ticker' | 'custom';
  
  // Elements with content - from Nova GFX Content tab
  elements: TemplateElement[];
  
  animations: {
    in: AnimationSequence;
    loop: AnimationSequence;
    out: AnimationSequence;
  };
  
  thumbnailUrl: string;
  renderedHtml: string;
  renderedCss: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Element with controllable content (Content tab only)
export interface TemplateElement {
  id: string;                    // Element ID from Nova GFX canvas
  name: string;                  // Element name from layers panel
  type: 'text' | 'image' | 'video';
  content: string | null;        // Default content value
}

// -------------------------------------------------
// PLAYLIST
// -------------------------------------------------
export interface Playlist {
  id: string;
  organizationId: string;
  projectId: string;
  
  name: string;
  description?: string;
  
  mode: 'manual' | 'timed';
  defaultDuration: number;
  endBehavior: 'stop' | 'hold' | 'loop';
  
  status: 'idle' | 'playing' | 'paused';
  currentPageId?: string;
  
  // Populated relations
  pageGroups?: PageGroup[];
  pages?: Page[];
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// -------------------------------------------------
// PAGE GROUP
// -------------------------------------------------
export interface PageGroup {
  id: string;
  playlistId: string;
  
  name: string;
  color?: string;
  sortOrder: number;
  isCollapsed: boolean;
  
  // Populated
  pages?: Page[];
}

// -------------------------------------------------
// PAGE
// -------------------------------------------------
export interface Page {
  id: string;
  organizationId: string;
  playlistId: string;
  templateId: string;
  pageGroupId?: string;  // Optional - can be ungrouped
  
  name: string;
  
  // Payload: element ID → content value
  // Simple key-value: { "text_name": "John Smith", "img_photo": "https://..." }
  payload: Record<string, string | null>;
  
  dataBindings: DataBinding[];
  
  duration?: number;  // Override for timed mode
  sortOrder: number;
  tags: string[];
  
  // Populated
  template?: Template;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface DataBinding {
  id: string;
  elementId: string;             // Which element to bind
  sourceType: 'api' | 'websocket' | 'manual';
  sourceConfig: Record<string, any>;
  refreshMode: 'realtime' | 'on_play' | 'interval';
  refreshInterval?: number;
}

// -------------------------------------------------
// CHANNEL
// -------------------------------------------------
export interface Channel {
  id: string;
  organizationId: string;
  
  name: string;
  channelCode: string;
  channelType: 'graphics' | 'ticker' | 'fullscreen' | 'preview';
  
  playerUrl?: string;
  playerStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastHeartbeat?: Date;
  
  loadedProjectId?: string;
  lastInitialized?: Date;
  
  layerCount: number;
  layerConfig: LayerConfig[];
  
  assignedOperators: string[];
  isLocked: boolean;
  lockedBy?: string;
  
  autoInitializeOnConnect: boolean;
  autoInitializeOnPublish: boolean;
  
  // Populated
  state?: ChannelState;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface LayerConfig {
  index: number;
  name: string;
  allowedTypes: string[];  // Template layer types allowed
}

// -------------------------------------------------
// CHANNEL STATE
// -------------------------------------------------
export interface ChannelState {
  id: string;
  channelId: string;
  
  layers: LayerState[];
  
  pendingCommand?: PlayerCommand;
  commandSequence: number;
  
  lastCommand?: PlayerCommand;
  lastCommandAt?: Date;
  lastAcknowledgedAt?: Date;
  
  controlledBy?: string;
  controlLockedAt?: Date;
  
  updatedAt: Date;
}

export interface LayerState {
  index: number;
  state: 'empty' | 'loading' | 'ready' | 'on_air';
  pageId?: string;
  pageName?: string;
  templateName?: string;
  onAirSince?: Date;
}

// -------------------------------------------------
// PLAYER COMMANDS
// -------------------------------------------------
export type PlayerCommandType = 
  | 'initialize'
  | 'load'
  | 'play'
  | 'update'
  | 'stop'
  | 'clear'
  | 'clear_all';

export interface PlayerCommand {
  id: string;
  type: PlayerCommandType;
  channelId: string;
  
  // For layer operations
  layerIndex?: number;
  pageId?: string;
  
  // For initialize
  projectId?: string;
  forceReload?: boolean;
  
  // For load/play
  page?: Page;
  template?: Template;
  
  // For update
  payload?: Record<string, FieldValue>;
  
  timestamp: string;
  operatorId: string;
}

// -------------------------------------------------
// CUSTOM UI
// -------------------------------------------------
export interface CustomUI {
  id: string;
  organizationId: string;
  
  name: string;
  description?: string;
  
  scopeType: 'template' | 'page' | 'standalone';
  templateId?: string;
  pageId?: string;
  
  layout: CustomUILayout;
  controls: CustomUIControl[];
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CustomUILayout {
  width: number;
  height: number;
  columns: number;
  rows?: number;
  gap?: number;
}

export interface CustomUIControl {
  id: string;
  customUiId: string;
  
  controlType: 'button' | 'number' | 'text' | 'dropdown' | 'toggle' | 'timer' | 'label' | 'spacer';
  label?: string;
  
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  
  color?: string;
  size: 'small' | 'medium' | 'large';
  
  action: CustomUIAction;
  options?: SelectOption[];  // For dropdown
  
  sortOrder: number;
}

export type CustomUIAction = 
  | { type: 'update_field'; fieldId: string; value?: any }
  | { type: 'increment'; fieldId: string; by: number }
  | { type: 'decrement'; fieldId: string; by: number }
  | { type: 'play'; layerIndex?: number }
  | { type: 'stop'; layerIndex?: number }
  | { type: 'clear'; layerIndex?: number }
  | { type: 'trigger_animation'; animationId: string };

export interface SelectOption {
  label: string;
  value: string | number;
}

// -------------------------------------------------
// PREVIEW
// -------------------------------------------------
export type PreviewMode = 'isolated' | 'composite';
export type AnimationPhase = 'idle' | 'in' | 'looping' | 'out';

// Animation Flow: IN → LOOP (auto) → OUT
// When IN completes, LOOP starts automatically and continues until OUT is triggered

export interface PreviewState {
  mode: PreviewMode;
  
  // Isolated mode
  selectedTemplateId?: string;
  selectedPageId?: string;
  previewPayload?: Record<string, FieldValue>;
  animationPhase: AnimationPhase;
  
  // Composite mode
  compositeLayers: CompositeLayer[];
}

export interface CompositeLayer {
  layerIndex: number;
  pageId?: string;
  templateId?: string;
  isVisible: boolean;
}

// -------------------------------------------------
// TIMING
// -------------------------------------------------
export interface PageTiming {
  inDuration: number;    // From template (fixed)
  outDuration: number;   // From template (fixed)
  totalDuration: number; // From page or playlist default
  loopDuration: number;  // Calculated: total - in - out
}
```

---

## 4. Application Structure

### 4.1 File Structure

```
apps/pulsar-gfx/
├── public/
│   └── favicon.ico
│
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── Router.tsx
│   │   └── providers/
│   │       ├── index.tsx
│   │       └── SupabaseProvider.tsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatusBar.tsx
│   │   │
│   │   ├── project/
│   │   │   ├── ProjectSelector.tsx
│   │   │   └── ProjectInfo.tsx
│   │   │
│   │   ├── templates/
│   │   │   ├── TemplateBrowser.tsx
│   │   │   ├── TemplateCard.tsx
│   │   │   ├── TemplateFilters.tsx
│   │   │   └── TemplatePreview.tsx
│   │   │
│   │   ├── pages/
│   │   │   ├── PageList.tsx
│   │   │   ├── PageItem.tsx
│   │   │   ├── PageEditor.tsx
│   │   │   ├── PageFieldEditor.tsx
│   │   │   ├── PageGroupHeader.tsx
│   │   │   └── CreatePageDialog.tsx
│   │   │
│   │   ├── playlist/
│   │   │   ├── PlaylistPanel.tsx
│   │   │   ├── PlaylistHeader.tsx
│   │   │   ├── PlaylistTimeline.tsx
│   │   │   ├── PlaylistControls.tsx
│   │   │   ├── PlaylistSettings.tsx
│   │   │   └── TimedModeIndicator.tsx
│   │   │
│   │   ├── preview/
│   │   │   ├── PreviewWindow.tsx
│   │   │   ├── PreviewControls.tsx
│   │   │   ├── AnimationControls.tsx
│   │   │   ├── CompositeLayerPanel.tsx
│   │   │   └── PreviewModeToggle.tsx
│   │   │
│   │   ├── channels/
│   │   │   ├── ChannelPanel.tsx
│   │   │   ├── ChannelSelector.tsx
│   │   │   ├── ChannelStatus.tsx
│   │   │   ├── LayerStatus.tsx
│   │   │   └── InitializeButton.tsx
│   │   │
│   │   ├── playout/
│   │   │   ├── PlayoutControls.tsx
│   │   │   ├── TakeButton.tsx
│   │   │   ├── LayerBar.tsx
│   │   │   └── KeyboardShortcuts.tsx
│   │   │
│   │   ├── custom-ui/
│   │   │   ├── CustomUIBuilder.tsx
│   │   │   ├── CustomUIRunner.tsx
│   │   │   ├── ControlPalette.tsx
│   │   │   ├── ControlRenderer.tsx
│   │   │   └── controls/
│   │   │       ├── ButtonControl.tsx
│   │   │       ├── NumberControl.tsx
│   │   │       ├── TextControl.tsx
│   │   │       ├── DropdownControl.tsx
│   │   │       ├── ToggleControl.tsx
│   │   │       └── TimerControl.tsx
│   │   │
│   │   └── media/
│   │       ├── MediaBrowser.tsx
│   │       └── MediaPicker.tsx
│   │
│   ├── stores/
│   │   ├── projectStore.ts
│   │   ├── playlistStore.ts
│   │   ├── pageStore.ts
│   │   ├── channelStore.ts
│   │   ├── previewStore.ts
│   │   ├── playoutStore.ts
│   │   └── customUIStore.ts
│   │
│   ├── services/
│   │   ├── playlistService.ts
│   │   ├── pageService.ts
│   │   ├── channelService.ts
│   │   ├── commandService.ts
│   │   └── mediaService.ts
│   │
│   ├── hooks/
│   │   ├── useProject.ts
│   │   ├── usePlaylist.ts
│   │   ├── useChannel.ts
│   │   ├── usePreview.ts
│   │   ├── usePlayout.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   └── useTimedPlayback.ts
│   │
│   ├── engine/
│   │   ├── PreviewEngine.ts
│   │   ├── AnimationController.ts
│   │   └── ContentInjector.ts
│   │
│   └── main.tsx
│
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

### 4.2 Main Layout

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  🎬 Pulsar GFX    Project: [Evening News ▼]    Channel: [CH1 - Program ▼]    ⚙️ 👤 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│        │                                                    │                       │
│ SIDEBAR│              MAIN WORKSPACE                        │   PREVIEW / PROGRAM   │
│        │                                                    │                       │
│┌──────┐│  ┌─────────────────────────────────────────────┐  │  ┌─────────────────┐  │
││Templa││  │                                             │  │  │                 │  │
││tes   ││  │  [Tab: Pages] [Tab: Custom UI]              │  │  │    PREVIEW      │  │
│├──────┤│  │                                             │  │  │                 │  │
││Pages ││  │  ┌─────────────────────────────────────────┐│  │  │  ○ Isolated     │  │
│├──────┤│  │  │                                         ││  │  │  ● Composite    │  │
││Playli││  │  │  Page List / Editor / Custom UI         ││  │  │                 │  │
││st    ││  │  │                                         ││  │  └─────────────────┘  │
│├──────┤│  │  │                                         ││  │  [▶ IN]  [◀ OUT]     │
││Custom││  │  │                                         ││  │                       │
││ UI   ││  │  └─────────────────────────────────────────┘│  │  ┌─────────────────┐  │
│└──────┘│  │                                             │  │  │    PROGRAM      │  │
│        │  └─────────────────────────────────────────────┘  │  │    (Channel)    │  │
│┌──────┐│                                                    │  │                 │  │
││Quick ││  ┌─────────────────────────────────────────────┐  │  │  🔴 ON AIR      │  │
││Access││  │ PLAYLIST: Main Show          ▶ PLAY  ⏸ ⏹   │  │  │                 │  │
││      ││  │ Mode: [Manual ▼]  Duration: 5s              │  │  └─────────────────┘  │
│└──────┘│  │─────────────────────────────────────────────│  │                       │
│        │  │ ▼ Opening Segment                           │  │  ┌─────────────────┐  │
│        │  │   📄 Welcome Title           5s      Ready  │  │  │ PLAYOUT CONTROL │  │
│        │  │   📄 Host Introduction       8s      Ready  │  │  │                 │  │
│        │  │ ▼ Interview                                 │  │  │ [TAKE]  [STOP]  │  │
│        │  │   📄 Guest: John Smith       -       Ready  │  │  │ Layer: [1 ▼]    │  │
│        │  │   📄 Topic Card              10s     Ready  │  │  │                 │  │
│        │  └─────────────────────────────────────────────┘  │  └─────────────────┘  │
│        │                                                    │                       │
├────────┴────────────────────────────────────────────────────┴───────────────────────┤
│  L1: Lower Third [▶ John Smith]  │  L2: Bug [● Logo]  │  L3: Empty  │  L4: Empty   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Core Features

### 5.1 Project Loading

```typescript
// stores/projectStore.ts
interface ProjectStore {
  // State
  projects: Project[];
  currentProject: Project | null;
  templates: Template[];
  isLoading: boolean;
  
  // Actions
  loadProjects: () => Promise<void>;
  selectProject: (projectId: string) => Promise<void>;
  getTemplate: (templateId: string) => Template | undefined;
}

// Load project and its templates from Nova GFX
async function selectProject(projectId: string): Promise<void> {
  const { data: project } = await supabase
    .from('nova_projects')
    .select(`
      *,
      templates:nova_templates(*)
    `)
    .eq('id', projectId)
    .eq('status', 'published')
    .single();
  
  set({ 
    currentProject: project, 
    templates: project.templates 
  });
}
```

### 5.2 Page Management

```typescript
// stores/pageStore.ts
interface PageStore {
  pages: Page[];
  pageGroups: PageGroup[];
  selectedPage: Page | null;
  
  // CRUD
  createPage: (templateId: string, name: string, payload?: Record<string, FieldValue>) => Promise<Page>;
  updatePage: (pageId: string, updates: Partial<Page>) => Promise<void>;
  updatePayload: (pageId: string, fieldId: string, value: FieldValue) => Promise<void>;
  deletePage: (pageId: string) => Promise<void>;
  duplicatePage: (pageId: string) => Promise<Page>;
  
  // Groups
  createPageGroup: (name: string) => Promise<PageGroup>;
  movePageToGroup: (pageId: string, groupId: string | null) => Promise<void>;
  
  // Selection
  selectPage: (pageId: string) => void;
}
```

### 5.3 Playlist Controls

```typescript
// stores/playlistStore.ts
interface PlaylistStore {
  playlists: Playlist[];
  currentPlaylist: Playlist | null;
  isPlaying: boolean;
  currentIndex: number;
  
  // Playlist CRUD
  createPlaylist: (name: string, projectId: string) => Promise<Playlist>;
  updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  
  // Playback (Timed Mode)
  play: () => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  goToPage: (pageId: string) => void;
  
  // Settings
  setMode: (mode: 'manual' | 'timed') => void;
  setEndBehavior: (behavior: 'stop' | 'hold' | 'loop') => void;
  setDefaultDuration: (duration: number) => void;
}

// Timed playback hook
function useTimedPlayback(playlist: Playlist) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  
  const playNextPage = useCallback(async () => {
    const pages = playlist.pages;
    const currentIndex = pages.findIndex(p => p.id === currentPageId);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= pages.length) {
      // End of playlist
      switch (playlist.endBehavior) {
        case 'stop':
          await stopCurrentPage();
          setIsPlaying(false);
          break;
        case 'hold':
          setIsPlaying(false);
          break;
        case 'loop':
          await playPage(pages[0]);
          break;
      }
      return;
    }
    
    await playPage(pages[nextIndex]);
  }, [playlist, currentPageId]);
  
  const playPage = async (page: Page) => {
    setCurrentPageId(page.id);
    
    // Send PLAY command to channel
    await sendCommand({
      type: 'play',
      pageId: page.id,
      // ...
    });
    
    // Calculate timing
    const template = getTemplate(page.templateId);
    const totalDuration = page.duration || playlist.defaultDuration;
    const inDuration = template.animations.in.duration;
    const outDuration = template.animations.out.duration;
    const loopDuration = totalDuration - inDuration - outDuration;
    
    // Schedule OUT animation
    const outTime = inDuration + loopDuration;
    timerRef.current = setTimeout(() => {
      sendCommand({ type: 'stop', pageId: page.id });
      
      // Schedule next page
      setTimeout(playNextPage, outDuration);
    }, outTime);
  };
  
  return { isPlaying, currentPageId, play, pause, stop };
}
```

### 5.4 Channel & Playout

```typescript
// stores/channelStore.ts
interface ChannelStore {
  channels: Channel[];
  selectedChannel: Channel | null;
  channelStates: Map<string, ChannelState>;
  
  // Channel management
  loadChannels: () => Promise<void>;
  selectChannel: (channelId: string) => void;
  
  // Initialization
  initializeChannel: (channelId: string, projectId: string, force?: boolean) => Promise<void>;
  
  // Commands
  sendCommand: (command: Omit<PlayerCommand, 'id' | 'timestamp' | 'operatorId'>) => Promise<void>;
  
  // Playout shortcuts
  play: (pageId: string, layerIndex: number) => Promise<void>;
  stop: (layerIndex: number) => Promise<void>;
  update: (layerIndex: number, payload: Record<string, FieldValue>) => Promise<void>;
  clear: (layerIndex: number) => Promise<void>;
  clearAll: () => Promise<void>;
}

// Send command to channel
async function sendCommand(command: Partial<PlayerCommand>): Promise<void> {
  const channel = get().selectedChannel;
  if (!channel) throw new Error('No channel selected');
  
  const fullCommand: PlayerCommand = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    operatorId: getCurrentUserId(),
    channelId: channel.id,
    ...command,
  };
  
  // Write to channel state (Nova Player will pick up via realtime)
  await supabase
    .from('pulsar_channel_state')
    .update({
      pending_command: fullCommand,
      command_sequence: supabase.sql`command_sequence + 1`,
    })
    .eq('channel_id', channel.id);
  
  // Log command
  await supabase
    .from('pulsar_command_log')
    .insert({
      organization_id: channel.organizationId,
      channel_id: channel.id,
      command_type: command.type,
      layer_index: command.layerIndex,
      page_id: command.pageId,
      payload: command.payload,
      trigger_source: 'manual',
    });
}
```

### 5.5 Preview System

```typescript
// stores/previewStore.ts
interface PreviewStore {
  mode: PreviewMode;
  selectedTemplateId: string | null;
  selectedPageId: string | null;
  previewPayload: Record<string, FieldValue>;
  animationPhase: AnimationPhase;
  compositeLayers: CompositeLayer[];
  
  // Mode
  setMode: (mode: PreviewMode) => void;
  
  // Selection
  selectTemplate: (templateId: string) => void;
  selectPage: (pageId: string) => void;
  
  // Preview payload
  updatePreviewField: (fieldId: string, value: FieldValue) => void;
  
  // Animation (IN auto-transitions to LOOP)
  playIn: () => Promise<void>;      // Play IN, then auto-loop
  playOut: () => Promise<void>;     // Play OUT animation
  playFull: () => Promise<void>;    // IN → LOOP for X seconds → OUT
  stopAnimation: () => void;
  resetPreview: () => void;
  
  // Composite mode
  setCompositeLayerPage: (layerIndex: number, pageId: string | null) => void;
  setCompositeLayerVisibility: (layerIndex: number, visible: boolean) => void;
}
```

### 5.6 Custom UI System

```typescript
// stores/customUIStore.ts
interface CustomUIStore {
  customUIs: CustomUI[];
  activeUI: CustomUI | null;
  
  // CRUD
  createCustomUI: (data: Partial<CustomUI>) => Promise<CustomUI>;
  updateCustomUI: (id: string, updates: Partial<CustomUI>) => Promise<void>;
  deleteCustomUI: (id: string) => Promise<void>;
  
  // Controls
  addControl: (control: Partial<CustomUIControl>) => Promise<CustomUIControl>;
  updateControl: (id: string, updates: Partial<CustomUIControl>) => Promise<void>;
  removeControl: (id: string) => Promise<void>;
  
  // Execution
  executeAction: (action: CustomUIAction, targetPageId?: string, targetLayerIndex?: number) => Promise<void>;
}

// Execute a custom UI action
async function executeAction(
  action: CustomUIAction, 
  targetPageId?: string, 
  targetLayerIndex?: number
): Promise<void> {
  const channel = useChannelStore.getState().selectedChannel;
  
  switch (action.type) {
    case 'update_field':
      await useChannelStore.getState().update(
        targetLayerIndex ?? 0,
        { [action.fieldId]: { fieldId: action.fieldId, value: action.value, type: 'text' } }
      );
      break;
      
    case 'increment':
    case 'decrement':
      const currentState = useChannelStore.getState().channelStates.get(channel.id);
      const layer = currentState?.layers[targetLayerIndex ?? 0];
      // Get current value and increment/decrement
      // Send update command
      break;
      
    case 'play':
      await useChannelStore.getState().play(targetPageId!, action.layerIndex ?? 0);
      break;
      
    case 'stop':
      await useChannelStore.getState().stop(action.layerIndex ?? 0);
      break;
      
    case 'trigger_animation':
      // Send animation trigger to Nova Player
      await useChannelStore.getState().sendCommand({
        type: 'trigger_animation',
        animationId: action.animationId,
        layerIndex: targetLayerIndex ?? 0,
      });
      break;
  }
}
```

---

## 6. Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `F1` | Play/Take | Global |
| `F2` | Stop | Global |
| `F3` | Clear Layer | Global |
| `F4` | Clear All | Global |
| `Space` | Play/Pause Playlist | Playlist (Timed Mode) |
| `→` | Next Page | Playlist |
| `←` | Previous Page | Playlist |
| `1-4` | Select Layer 1-4 | Global |
| `Ctrl+N` | New Page | Pages |
| `Ctrl+S` | Save Page | Page Editor |
| `Delete` | Delete Selected | Pages |
| `Ctrl+D` | Duplicate Page | Pages |
| `P` | Toggle Preview Mode | Preview |
| `I` | Play IN Animation | Preview |
| `O` | Play OUT Animation | Preview |

---

## 7. Implementation Order

### Phase 1: Foundation (Week 1)
1. Set up app structure in monorepo
2. Create basic layout components
3. Set up Zustand stores (project, playlist, page)
4. Implement Supabase queries
5. Build Project selector and loader

### Phase 2: Templates & Pages (Week 2)
1. Template Browser component
2. Page List with drag-drop
3. Page Editor with field inputs
4. Page CRUD operations
5. Page Groups (optional grouping)

### Phase 3: Preview System (Week 3)
1. Preview Engine (iframe-based rendering)
2. Isolated mode with animation controls
3. Composite mode with layer visibility
4. Live preview updates while editing

### Phase 4: Playlist (Week 4)
1. Playlist panel with Manual mode
2. Timed mode with duration settings
3. Playlist controls (play/pause/stop)
4. End behavior options

### Phase 5: Channels & Playout (Week 5)
1. Channel management
2. Channel state subscriptions (Realtime)
3. Command sending system
4. Initialize functionality
5. Layer status display

### Phase 6: Playout Controls (Week 6)
1. Take/Stop/Clear buttons
2. Layer selection
3. Keyboard shortcuts
4. Layer bar status

### Phase 7: Custom UI (Week 7-8)
1. Custom UI builder (drag-drop controls)
2. Control types implementation
3. Action configuration
4. Custom UI runner (live execution)

### Phase 8: Polish (Week 9)
1. Error handling
2. Loading states
3. Permissions/access control
4. Performance optimization

---

## 8. Key Implementation Notes

1. **Page is Data, Not State:** A Page is just a payload definition. It can be played on any Channel at any time. The actual "on air" state lives in ChannelState.

2. **Commands are Async:** When you send a command, it goes to Nova (Supabase). Nova Player picks it up via Realtime subscription. Acknowledge comes back the same way.

3. **Preview is Separate:** Preview Engine runs locally in Pulsar. It doesn't affect Channels or Nova Players. It's purely for previewing content.

4. **Animation Flow:**
   ```
   PLAY Command → IN Animation → LOOP (auto-starts) → OUT Command → OUT Animation
   ```
   - IN animation plays first
   - LOOP starts automatically when IN completes (no separate trigger)
   - LOOP continues until OUT command is received
   - For timed playlists, OUT is triggered based on page duration

5. **Timing Calculation (Timed Mode):**
   ```
   Total Duration = IN + LOOP Phase + OUT
   LOOP Phase = Total Duration - IN Duration - OUT Duration
   ```
   The LOOP animation repeats to fill the calculated LOOP Phase.

6. **Initialize Flow:**
   - Pulsar sends INITIALIZE command via Nova
   - Nova Player downloads project data from Nova
   - Caches templates, animations, assets
   - Confirms ready
   - Now can receive PLAY commands

7. **Multi-Channel:** Same Page can play on multiple Channels. Each Channel has its own state. Pulsar shows all Channels, operator switches between them.

8. **Custom UI Scope:**
   - Template scope: Works with any Page of that template
   - Page scope: Works with specific Page only
   - Standalone: Targets layer directly, works with any content

---

## 9. Integration Points

### With Nova (Data Platform)
- All data stored in Nova's Supabase instance
- PostgreSQL for structured data (projects, templates, pages, channels)
- Supabase Storage for media files
- Realtime for command/state sync between Pulsar GFX and Nova Player
- Edge Functions for media library API

### With Nova GFX
- Read published Projects from Nova
- Read Templates with fields and animations
- Access Media Library
- "Edit Template" button opens Nova GFX for design changes

### With Nova Player
- Commands sent via Nova Realtime (pulsar_channel_state table)
- Status updates via heartbeat and state sync
- Initialize command loads project data to player
- Render commands: PLAY, STOP, UPDATE, CLEAR

---

**Ready for Implementation!**

This document provides the complete specification for building Pulsar GFX. Follow the implementation order, use the types and schemas provided, and reference the UI layout for component design.

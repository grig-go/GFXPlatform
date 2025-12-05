# Pulsar GFX - Naming Conventions & Concepts

## Overview

This document establishes the official terminology and concepts for Pulsar GFX. All architecture documents and code should follow these naming conventions.

---

## Emergent Platform Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           EMERGENT PLATFORM                                          │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   NOVA                          Data platform & media store                          │
│   (Backend/Infrastructure)      • Supabase database (Nova's own instance)            │
│                                 • Media library (Supabase Storage)                   │
│                                 • Edge functions                                     │
│                                 • Realtime sync                                      │
│                                 • Shared across all Emergent apps                    │
│                                                                                      │
│   ────────────────────────────────────────────────────────────────────────────────  │
│                                                                                      │
│   NOVA GFX                      AI-powered HTML graphic design tool                  │
│   (Design App)                  • Create templates with AI assistance                │
│                                 • Design animations (IN, LOOP, OUT)                  │
│                                 • Define editable fields                             │
│                                 • Publish projects to Nova                           │
│                                                                                      │
│   ────────────────────────────────────────────────────────────────────────────────  │
│                                                                                      │
│   PULSAR GFX                    Graphics control & playout application               │
│   (Control App)                 • Load projects from Nova                            │
│                                 • Create pages (template instances)                  │
│                                 • Build playlists                                    │
│                                 • Send commands to Nova Player                       │
│                                 • Custom UI for live ops                             │
│                                                                                      │
│   ────────────────────────────────────────────────────────────────────────────────  │
│                                                                                      │
│   NOVA PLAYER                   Render engine for HTML graphics                      │
│   (Renderer)                    • Receives commands from Pulsar GFX                  │
│                                 • Renders HTML/CSS graphics                          │
│                                 • Executes animations                                │
│                                 • Outputs video signal                               │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Pulsar GFX Concept Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           PULSAR GFX CONCEPTS                                        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  PROJECT (from Nova GFX, stored in Nova)                                            │
│  └── Contains: Templates, Layer Logic, Animations, Default Content                  │
│                                                                                      │
│  PLAYLIST                                                                           │
│  └── PAGE GROUPS (optional)                                                         │
│      └── PAGES (instances of Templates with content payload)                        │
│                                                                                      │
│  CHANNEL                                                                            │
│  └── Connected Nova Player (receives commands & renders graphics)                   │
│                                                                                      │
│  CUSTOM UI                                                                          │
│  └── User-built control panels for live operations                                  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Definitions

### 1. PROJECT

**Source:** Nova GFX

**Definition:** A Nova GFX project that has been published and made available to Pulsar GFX. Contains everything needed to render graphics.

**Contains:**
- Templates (graphic definitions)
- Layer logic (z-index, layer types)
- Animations (IN, LOOP, OUT sequences)
- Default content (placeholder values in template fields)
- Design system (colors, fonts, styles)

**In Pulsar:**
- User opens/loads a Project to work with its templates
- Project is read-only in Pulsar (design changes require Nova GFX)
- Multiple Playlists can reference the same Project

```typescript
interface Project {
  id: string;
  name: string;
  publishedAt: Date;
  templates: Template[];
  layerConfig: LayerConfig[];
  designSystem: DesignSystem;
  mediaLibraryId: string;  // Reference to Nova's media storage
}
```

---

### 2. TEMPLATE

**Source:** Nova GFX (via Project, stored in Nova)

**Definition:** A graphic design definition with elements, animations, and layer assignment. Templates are the "blueprint" that Pages are created from.

**Properties:**
- Visual design (HTML/CSS)
- Elements with content (text, images, videos)
- Animations (IN, LOOP, OUT)
- Layer type assignment

**In Pulsar:**
- Displayed in Template Browser
- User creates Pages from Templates
- Only Content tab is exposed (text content, image src, video src)
- Click "Edit" opens Nova GFX to modify the template

```typescript
interface Template {
  id: string;
  projectId: string;
  name: string;
  category: string;
  layerType: 'fullscreen' | 'lower_third' | 'bug' | 'ticker' | 'custom';
  
  // Elements with content (Content tab only)
  elements: TemplateElement[];
  
  animations: {
    in: AnimationSequence;
    loop: AnimationSequence;
    out: AnimationSequence;
  };
  thumbnailUrl: string;
}

// Only content is controllable
interface TemplateElement {
  id: string;              // Element ID from Nova GFX
  name: string;            // Element name from layers panel
  type: 'text' | 'image' | 'video';
  content: string | null;  // Default content value
}
```

---

### 3. PAGE

**Definition:** An instance of a Template with specific content filled in. Pages are what actually get played out to the Nova Player.

**Key Characteristics:**
- Created from a Template
- Contains a "payload" (content values for elements)
- Only Content tab values can be overridden (text, image src, video src)
- Lives in a Playlist (optionally within a Page Group)
- When played: payload transfers to Nova Player → animation executes

**Lifecycle:**
1. User creates Page from Template
2. User fills in content (payload)
3. Page added to Playlist
4. On PLAY command → payload sent to Channel → Nova Player renders

```typescript
interface Page {
  id: string;
  templateId: string;
  playlistId: string;
  pageGroupId?: string;  // Optional
  
  name: string;
  
  // Payload: simple key-value
  // element ID → content value
  payload: Record<string, string | null>;
  
  duration?: number;  // For timed mode
  dataBindings?: DataBinding[];
  
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Example Payload:**
```json
{
  "text_name": "John Smith",
  "text_title": "CEO, Acme Corp",
  "img_photo": "https://storage.nova.../photo.jpg"
}
```

---

### 4. PAGE GROUP

**Definition:** A logical grouping of Pages within a Playlist. Used for organization and potentially grouped operations.

**Use Cases:**
- Group pages by segment (e.g., "Opening", "Interview", "Closing")
- Group pages by type (e.g., "Lower Thirds", "Fullscreens")
- Group for bulk operations (hide/show group, reorder group)

```typescript
interface PageGroup {
  id: string;
  playlistId: string;
  name: string;
  color?: string;  // Visual identifier
  sortOrder: number;
  isCollapsed?: boolean;  // UI state
}
```

---

### 5. PLAYLIST

**Definition:** A container that holds Pages (and Page Groups) for a show or segment. Provides the operational structure for playing graphics.

**Contains:**
- Reference to Project (source of templates)
- Page Groups (optional organization)
- Pages (the actual content)

**Modes:**
- **Manual Mode:** Operator triggers each page manually
- **Timed Mode:** Pages auto-advance based on duration

**Properties:**
```typescript
interface Playlist {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  
  // Mode
  mode: 'manual' | 'timed';
  
  // Timed mode settings
  defaultDuration?: number;  // Default page duration in ms
  loopPlaylist?: boolean;    // Loop back to start when finished
  
  // Contents
  pageGroups: PageGroup[];
  pages: Page[];
  
  // State
  status: 'idle' | 'playing' | 'paused';
  currentPageId?: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 6. PLAYLIST TIMING MODEL

**Definition:** How duration works in Timed Mode.

```
Animation Flow:
PLAY → IN Animation → LOOP (auto-starts) → [duration elapsed] → OUT Animation

Page Duration = IN Animation + LOOP Phase + OUT Animation
                (fixed)        (auto/dynamic)  (fixed)

Example:
- IN Animation:  500ms (fixed, from template)
- OUT Animation: 300ms (fixed, from template)  
- Page Duration: 5000ms (set by user)
- LOOP Phase:    5000 - 500 - 300 = 4200ms (calculated)

LOOP starts automatically after IN completes - no manual trigger needed.
LOOP continues until OUT is triggered (manually or by timer in timed mode).
```

```typescript
interface PageTiming {
  // From Template (fixed)
  inDuration: number;   // e.g., 500ms
  outDuration: number;  // e.g., 300ms
  
  // From Page (user-defined)
  totalDuration: number;  // e.g., 5000ms
  
  // Calculated
  loopDuration: number;  // totalDuration - inDuration - outDuration
}
```

**Timed Playlist Controls:**
- **Play:** Start auto-advancing through pages
- **Pause:** Stop at current page (stays on air)
- **Stop:** Stop and take current page off air
- **Skip:** Jump to next page immediately

---

### 7. PREVIEW WINDOW

**Definition:** The preview area in Pulsar GFX UI that shows graphics before they go on air.

**Two Modes:**

| Mode | Description | Use Case |
|------|-------------|----------|
| **Isolated** | Shows single Template/Page only | Editing content, testing animations |
| **Composite** | Shows all layers stacked together | See full output, check layer conflicts |

**Behavior:**
- Click Template → Preview shows template with default content
- Click Page → Preview shows page payload in template
- Edit field → Preview updates in real-time
- Animation controls: [IN] starts animation and auto-loops, [OUT] plays out animation

```typescript
interface PreviewState {
  mode: 'isolated' | 'composite';
  
  // Isolated mode
  selectedTemplateId?: string;
  selectedPageId?: string;
  previewPayload?: Record<string, FieldValue>;
  
  // Composite mode
  layers: PreviewLayer[];
  
  // Animation state
  animationPhase: 'idle' | 'in' | 'loop' | 'out';
}

interface PreviewLayer {
  layerIndex: number;
  pageId?: string;
  isVisible: boolean;
}
```

---

### 8. CHANNEL

**Definition:** A destination output that connects to a Nova Player instance. Represents one graphics output in the broadcast chain.

**Characteristics:**
- Each Channel connects to one Nova Player
- Nova Player runs on a dedicated render PC
- Channel receives commands (PLAY, STOP, UPDATE, etc.)
- Multiple Channels can exist for multi-output setups

**Channel Types:**
- **Graphics:** Standard graphics output (lower thirds, fullscreen, etc.)
- **Ticker:** Dedicated ticker/crawl output
- **Fullscreen:** Dedicated fullscreen graphics
- **Preview:** Preview-only, no broadcast output

```typescript
interface Channel {
  id: string;
  name: string;              // "Program A", "Ticker", "Studio B"
  channelCode: string;       // "CH1", "CH2", "TICKER"
  channelType: 'graphics' | 'ticker' | 'fullscreen' | 'preview';
  
  // Nova Player connection
  playerUrl: string;         // URL where Nova Player is running
  playerStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastHeartbeat?: Date;
  
  // Layer configuration
  layerCount: number;
  layers: ChannelLayer[];
  
  // Current project loaded
  loadedProjectId?: string;
  
  // Access control
  assignedOperators: string[];
  isLocked: boolean;
  lockedBy?: string;
}

interface ChannelLayer {
  layerIndex: number;
  name: string;
  state: 'empty' | 'ready' | 'on_air';
  currentPageId?: string;
  onAirSince?: Date;
}
```

---

### 9. NOVA PLAYER

**Definition:** The browser-based rendering application that receives commands from Pulsar GFX and renders graphics.

**Characteristics:**
- Runs in browser on dedicated render PC
- Connects to specific Channel
- Receives commands via Supabase Realtime
- Renders HTML/CSS graphics with animations
- Output captured via OBS, vMix, NDI, etc.

**Commands Nova Player Receives:**

| Command | Description |
|---------|-------------|
| `INITIALIZE` | Load/reload project templates |
| `LOAD` | Load a page into a layer (ready state) |
| `PLAY` | Execute IN animation, go on air |
| `UPDATE` | Update content while on air |
| `STOP` | Execute OUT animation, go off air |
| `CLEAR` | Immediately remove from layer |
| `CLEAR_ALL` | Clear all layers |

```typescript
interface PlayerCommand {
  id: string;
  channelId: string;
  type: 'initialize' | 'load' | 'play' | 'update' | 'stop' | 'clear' | 'clear_all';
  
  // For load/play/update/stop
  layerIndex?: number;
  pageId?: string;
  payload?: Record<string, FieldValue>;
  
  // For initialize
  projectId?: string;
  forceReload?: boolean;
  
  timestamp: Date;
  operatorId: string;
}
```

---

### 10. INITIALIZE

**Definition:** The process of loading or updating project data on a Nova Player.

**When Needed:**
- First time connecting Channel to Nova Player
- Templates have been updated in Nova GFX
- Project has been republished
- Nova Player restarted

**Process:**
1. Pulsar sends INITIALIZE command to Channel
2. Nova Player downloads latest project data
3. Templates, animations, assets are cached locally
4. Nova Player confirms ready status
5. Channel shows "Initialized" / "Ready"

```typescript
interface InitializeCommand {
  type: 'initialize';
  channelId: string;
  projectId: string;
  forceReload: boolean;  // true = clear cache and reload everything
}

interface InitializeStatus {
  channelId: string;
  status: 'initializing' | 'downloading' | 'ready' | 'error';
  progress?: number;      // 0-100
  templatesLoaded: number;
  totalTemplates: number;
  lastInitialized?: Date;
  error?: string;
}
```

---

### 11. CUSTOM UI

**Definition:** User-built control panels with buttons, inputs, and controls for live graphic operations. Designed for specific use cases like sports scoring.

**Use Cases:**
- Score bug control (increment score, start/stop clock)
- Election results (update numbers, change states)
- Live polls (update percentages)
- Any graphic needing rapid, repeated updates

**Components Available:**
- Buttons (trigger actions)
- Number inputs (with +/- controls)
- Text inputs
- Dropdowns
- Toggle switches
- Timer controls

**How It Works:**
1. User creates Custom UI layout in Pulsar
2. Maps UI controls to Template fields or actions
3. During live show, operator uses Custom UI
4. Changes push directly to on-air graphic via UPDATE command

```typescript
interface CustomUI {
  id: string;
  name: string;
  description?: string;
  templateId: string;  // Which template this controls
  channelId?: string;  // Optional: lock to specific channel
  
  layout: CustomUILayout;
  controls: CustomUIControl[];
  
  createdAt: Date;
  updatedAt: Date;
}

interface CustomUIControl {
  id: string;
  type: 'button' | 'number' | 'text' | 'dropdown' | 'toggle' | 'timer';
  label: string;
  position: { x: number; y: number; width: number; height: number };
  
  // What this control does
  action: CustomUIAction;
}

interface CustomUIAction {
  type: 'update_field' | 'increment' | 'decrement' | 'play' | 'stop' | 'trigger_animation';
  targetFieldId?: string;
  value?: any;
  incrementBy?: number;
}

// Example: Score Bug Custom UI
const scoreBugUI: CustomUI = {
  id: 'score-bug-control',
  name: 'Score Bug Controller',
  templateId: 'score-bug-template',
  controls: [
    {
      id: 'home-score-up',
      type: 'button',
      label: 'Home +1',
      action: { type: 'increment', targetFieldId: 'home_score', incrementBy: 1 }
    },
    {
      id: 'away-score-up', 
      type: 'button',
      label: 'Away +1',
      action: { type: 'increment', targetFieldId: 'away_score', incrementBy: 1 }
    },
    {
      id: 'clock-toggle',
      type: 'button',
      label: 'Start/Stop Clock',
      action: { type: 'trigger_animation', value: 'clock_toggle' }
    },
    {
      id: 'period',
      type: 'dropdown',
      label: 'Period',
      action: { type: 'update_field', targetFieldId: 'period' }
    }
  ]
};
```

---

### 12. MEDIA LIBRARY

**Definition:** Media assets (images, videos) are stored in Nova GFX's media library and accessed via Supabase storage.

**How It Works:**
- Media uploaded/managed in Nova GFX
- Stored in Supabase Storage
- Accessed via `media_library` edge function
- Pulsar GFX browses and selects media for Page content
- Nova Player downloads media when rendering

```typescript
interface MediaReference {
  id: string;
  type: 'image' | 'video';
  url: string;              // Supabase storage URL
  thumbnailUrl?: string;
  filename: string;
  mimeType: string;
  size: number;
}

// In Page payload
interface PagePayload {
  fields: {
    'guest_photo': {
      fieldId: 'guest_photo',
      type: 'image',
      value: {
        id: 'media-123',
        type: 'image',
        url: 'https://xxx.supabase.co/storage/v1/object/public/media/photo.jpg'
      }
    }
  }
}
```

---

## Command Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              COMMAND FLOW                                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   PULSAR GFX                    SUPABASE                      NOVA PLAYER           │
│   (Operator)                    (Realtime)                    (Renderer)            │
│                                                                                      │
│   ┌─────────────┐              ┌─────────────┐              ┌─────────────┐         │
│   │             │              │             │              │             │         │
│   │  1. Click   │──────────────►  Channel    │──────────────►  Receive    │         │
│   │     PLAY    │   Command    │  playout:   │   Subscribe  │  Command    │         │
│   │             │              │  {channel}  │              │             │         │
│   │             │              │             │              │             │         │
│   │  2. See     │◄─────────────┤  State      │◄─────────────┤  Execute &  │         │
│   │     Status  │   Update     │  Update     │   Confirm    │  Render     │         │
│   │             │              │             │              │             │         │
│   └─────────────┘              └─────────────┘              └─────────────┘         │
│                                                                                      │
│   Commands:                                                                          │
│   • INITIALIZE - Load/reload project on Nova Player                                 │
│   • LOAD - Prepare page in layer (ready state)                                      │
│   • PLAY - Execute IN animation, show graphic                                       │
│   • UPDATE - Change content while on air                                            │
│   • STOP - Execute OUT animation, remove graphic                                    │
│   • CLEAR - Immediately remove (no animation)                                       │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Naming Conventions Summary

| Term | Definition | Source |
|------|------------|--------|
| **Project** | Nova GFX project with templates & assets | Nova GFX |
| **Template** | Graphic blueprint with fields & animations | Nova GFX |
| **Page** | Template instance with content payload | Pulsar GFX |
| **Page Group** | Organizational grouping of pages | Pulsar GFX |
| **Playlist** | Container for pages with playback modes | Pulsar GFX |
| **Channel** | Output destination connected to Nova Player | Pulsar GFX |
| **Nova Player** | Browser renderer that displays graphics | Nova Player App |
| **Payload** | Content values that fill template fields | Pulsar GFX |
| **Initialize** | Load/update project data on Nova Player | Command |
| **Custom UI** | User-built control panel for live ops | Pulsar GFX |
| **Media Library** | Storage for images/videos | Nova GFX + Supabase |

---

## Confirmed Decisions

1. **Payload:** ✅ Confirmed - "payload" is the term for content data in a Page

2. **Page Groups:** ✅ Optional - Pages can exist in a flat list OR within Page Groups

3. **Custom UI:** ✅ Flexible - Can be:
   - Per-template (one UI controls all pages of that template type)
   - Per-page (customize for specific page)
   - Standalone (generic control panels targeting any template/layer)

4. **Initialize:** ✅ Both manual and automatic options:
   - Manual: Operator clicks "Initialize" button
   - Auto: When Channel connects or Project is republished
   - User can configure auto-initialize behavior

5. **Timed Mode End Behavior:** ✅ Configurable per playlist:
   - Stop (last page animates OUT)
   - Hold (last page stays ON AIR)
   - Loop (restart from first page)

6. **Multi-Channel:** ✅ Yes - Page is just data, can render on multiple Channels simultaneously

---

## Nova GFX Requirements (for Pulsar Integration)

Nova GFX must expose each element's **Content** data so Pulsar can control it.

### What Nova GFX Needs to Provide

When a template is saved/published, include an `elements` array with content data only:

```typescript
// In nova_templates table
{
  id: "template-123",
  name: "Lower Third",
  // ... other fields
  
  elements: [
    {
      id: "text_name",           // Canvas element ID
      name: "Guest Name",        // From layers panel
      type: "text",
      content: "Guest Name"      // Default content value
    },
    {
      id: "text_title",
      name: "Title",
      type: "text", 
      content: "Title goes here"
    },
    {
      id: "img_photo",
      name: "Guest Photo",
      type: "image",
      content: null              // Image src
    },
    {
      id: "video_clip",
      name: "Background Video",
      type: "video",
      content: null              // Video src
    }
  ]
}
```

### Content by Element Type

| Element Type | Content Value |
|--------------|---------------|
| **text** | Text string |
| **image** | Image source URL |
| **video** | Video source URL |

Style, Layout, and Animation properties are NOT exposed to Pulsar - only what's in the Content tab.

### Page Payload Structure (Simplified)

```json
{
  "text_name": "John Smith",
  "text_title": "CEO, Acme Corp",
  "img_photo": "https://storage.nova.../photo.jpg"
}
```

### Future: Option A (Explicit Fields)

Later, Nova GFX can add a "Mark as Field" toggle in the Content tab to limit what Pulsar shows. For now, all elements with content are exposed.

---

## Database Tables Overview

Based on these concepts, the Pulsar GFX database will need:

```
pulsar_playlists          - Playlist definitions
pulsar_page_groups        - Page groupings within playlists
pulsar_pages              - Page instances with payloads
pulsar_channels           - Channel configurations
pulsar_channel_state      - Real-time channel/layer state
pulsar_custom_uis         - Custom UI definitions
pulsar_custom_ui_controls - Controls within Custom UIs
pulsar_command_log        - Audit log of all commands
```

These extend the existing Nova GFX tables:
```
nova_projects             - Projects (read by Pulsar)
nova_templates            - Templates (read by Pulsar)
nova_media                - Media library (read by Pulsar)
```

# OGraf Export Plan for Nova GFX

## Overview

This plan outlines implementing OGraf export capability in Nova GFX, allowing templates to be exported as EBU OGraf-compliant packages compatible with broadcast graphics renderers.

---

## Phase 1: Core Export Infrastructure

### 1.1 Create OGraf Types Package
**Location:** `packages/types/src/ograf.ts`

Define TypeScript interfaces matching the OGraf specification:
- `OGrafManifest` - The `.ograf.json` structure
- `OGrafSchema` - JSON Schema for data bindings
- `OGrafCustomAction` - Custom action definitions
- `OGrafRenderRequirements` - Resolution/framerate constraints
- `OGrafReturnPayload` - Method return types

### 1.2 Manifest Generator Service
**Location:** `apps/nova-gfx/src/services/ografExport/manifestGenerator.ts`

Maps Nova template metadata → `.ograf.json`:

| Nova Field | OGraf Field |
|------------|-------------|
| `template.id` | `id` (with reverse-domain prefix) |
| `template.name` | `name` |
| `template.description` | `description` |
| `template.version` | `version` |
| `project.created_by` | `author.name` |
| `template.width/height` | `renderRequirements.resolution` |
| `bindings[]` | `schema.properties` |
| `in_duration > 0` | `stepCount: 1` |
| Always | `supportsRealTime: true` |
| Has timeline | `supportsNonRealTime: true` |

---

## Phase 2: Schema Mapping (Data Bindings)

### 2.1 Binding → JSON Schema Converter
**Location:** `apps/nova-gfx/src/services/ografExport/schemaMapper.ts`

Convert Nova's `Binding[]` to OGraf JSON Schema:

```
Nova Binding:
{
  binding_key: "player.name",
  binding_type: "text",
  default_value: "John Doe",
  required: true
}

→ OGraf Schema:
{
  "type": "object",
  "properties": {
    "player": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "title": "Player Name",
          "default": "John Doe"
        }
      },
      "required": ["name"]
    }
  }
}
```

**Binding Type Mapping:**
| Nova `binding_type` | JSON Schema `type` |
|---------------------|-------------------|
| `text` | `string` |
| `number` | `number` |
| `boolean` | `boolean` |
| `image` | `string` (format: `uri`) |
| `color` | `string` (format: `color`) |

### 2.2 Handle Nested Paths
Parse dot-notation paths (e.g., `location.weather.temp`) into nested JSON Schema objects.

---

## Phase 3: Web Component Wrapper

### 3.1 Component Generator
**Location:** `apps/nova-gfx/src/services/ografExport/componentGenerator.ts`

Generate a Web Component class that:
1. Extends `HTMLElement`
2. Embeds Nova's HTML/CSS as shadow DOM
3. Implements all required OGraf methods
4. Handles data binding resolution at runtime

**Generated Structure:**
```javascript
class NovaGraphic extends HTMLElement {
  #data = {};
  #currentStep = undefined;
  #shadowRoot;

  constructor() {
    super();
    this.#shadowRoot = this.attachShadow({ mode: 'open' });
  }

  async load({ data, renderType, renderCharacteristics }) {
    this.#data = data;
    this.#shadowRoot.innerHTML = `
      <style>${CSS_CONTENT}</style>
      ${HTML_CONTENT}
    `;
    this.#resolveBindings();
    return { statusCode: 200 };
  }

  async playAction({ delta, goto, skipAnimation }) {
    // Trigger IN animations
    await this.#playPhase('in', skipAnimation);
    this.#currentStep = 0;
    return { statusCode: 200, currentStep: this.#currentStep };
  }

  async stopAction({ skipAnimation }) {
    // Trigger OUT animations
    await this.#playPhase('out', skipAnimation);
    this.#currentStep = undefined;
    return { statusCode: 200 };
  }

  async updateAction({ data, skipAnimation }) {
    Object.assign(this.#data, data);
    this.#resolveBindings();
    return { statusCode: 200 };
  }

  // ... more methods
}

export default NovaGraphic;
```

### 3.2 Binding Resolution Runtime
Include a minified binding resolver that:
- Parses `{{field.path}}` placeholders in HTML
- Applies formatters (number, date, text transforms)
- Handles conditional visibility (`hideOnZero`, `hideOnNull`)

---

## Phase 4: Animation Mapping

### 4.1 Animation Converter
**Location:** `apps/nova-gfx/src/services/ografExport/animationMapper.ts`

Convert Nova's three-phase animation model to OGraf lifecycle:

| Nova Phase | OGraf Method |
|------------|--------------|
| `in` | `playAction()` |
| `loop` | Internal loop (while at step) |
| `out` | `stopAction()` |

### 4.2 Keyframe → CSS Animation
Convert Nova keyframes to CSS `@keyframes`:

```css
@keyframes nova_element1_in {
  0% { opacity: 0; transform: translateX(-100px); }
  100% { opacity: 1; transform: translateX(0); }
}

.element1 {
  animation: nova_element1_in 500ms ease-out forwards;
  animation-play-state: paused;
}
```

### 4.3 Animation Controller
Generate JavaScript that:
- Plays animations by setting `animation-play-state: running`
- Respects `skipAnimation` flag (jumps to end state)
- Handles animation sequencing via `delay` values
- Supports character-by-character animations

### 4.4 Non-Real-Time Support
For `supportsNonRealTime: true`:
- Implement `goToTime()` - seek to millisecond position
- Implement `setActionsSchedule()` - queue timed actions
- Calculate total duration from all animation phases

---

## Phase 5: Asset Bundling

### 5.1 Asset Collector
**Location:** `apps/nova-gfx/src/services/ografExport/assetBundler.ts`

Collect all referenced assets:
- Images from `ElementContent.image.src`
- Videos from `ElementContent.video.src`
- Fonts from CSS `@font-face` declarations
- Lottie JSON files
- SVG files

### 5.2 Path Rewriting
Rewrite absolute URLs to relative paths:
- `https://storage.../image.png` → `assets/image.png`
- Update HTML/CSS references accordingly

### 5.3 Font Embedding
Options:
1. **Embed as base64** - Inline in CSS (larger file, self-contained)
2. **Bundle as files** - Separate font files in `assets/fonts/`
3. **Use system fonts** - For standard fonts (Arial, etc.)

---

## Phase 6: Export UI & Packaging

### 6.1 Export Dialog Component
**Location:** `apps/nova-gfx/src/components/designer/ExportOGrafDialog.tsx`

UI for configuring export:
- Package name/ID customization
- Author information
- Export format: ZIP or folder
- Asset handling options
- Preview of generated manifest

### 6.2 Package Builder
**Location:** `apps/nova-gfx/src/services/ografExport/packageBuilder.ts`

Assemble final OGraf package:
```
template-name.ograf/
├── manifest.ograf.json    # Generated manifest
├── graphic.mjs            # Web Component
├── assets/
│   ├── images/
│   ├── fonts/
│   └── videos/
└── README.md              # Optional documentation
```

### 6.3 ZIP Download
Use JSZip or similar to create downloadable `.zip` archive.

---

## Phase 7: Advanced Features

### 7.1 Interactive Mode → Custom Actions
Map Nova's interactive events to OGraf `customActions`:

```json
{
  "customActions": [
    {
      "id": "next-slide",
      "name": "Next Slide",
      "description": "Navigate to next content slide"
    },
    {
      "id": "highlight-player",
      "name": "Highlight Player",
      "schema": {
        "type": "object",
        "properties": {
          "playerId": { "type": "string" }
        }
      }
    }
  ]
}
```

### 7.2 Multi-Step Graphics
For templates with multiple "states" or slides:
- Set `stepCount` to number of states
- Map `playAction({ delta, goto })` to state navigation
- Track `currentStep` in component

### 7.3 Data Source Integration
For templates with data sources:
- Include data source schema in manifest
- Document expected data structure
- Optionally include sample data

---

## File Structure Summary

```
apps/nova-gfx/src/
├── services/
│   └── ografExport/
│       ├── index.ts              # Main export orchestrator
│       ├── manifestGenerator.ts  # .ograf.json generation
│       ├── schemaMapper.ts       # Binding → JSON Schema
│       ├── componentGenerator.ts # Web Component generation
│       ├── animationMapper.ts    # Animation conversion
│       ├── assetBundler.ts       # Asset collection/rewriting
│       └── packageBuilder.ts     # ZIP packaging
├── components/
│   └── designer/
│       └── ExportOGrafDialog.tsx # Export UI
└── templates/
    └── ograf-component.template.mjs  # Component template

packages/types/src/
└── ograf.ts                      # OGraf TypeScript interfaces
```

---

## Implementation Order

1. **Types first** - Define OGraf interfaces in `packages/types`
2. **Manifest generator** - Core metadata mapping
3. **Schema mapper** - Data binding conversion
4. **Basic component generator** - Static HTML/CSS export
5. **Animation mapper** - CSS animation generation
6. **Asset bundler** - Resource collection
7. **Package builder** - ZIP creation
8. **Export UI** - User-facing dialog
9. **Advanced features** - Interactive mode, multi-step

---

## Testing Strategy

1. **Unit tests** for each mapper/generator
2. **Integration test** - Full export pipeline
3. **Validation** - Test exports against OGraf JSON Schema
4. **Compatibility** - Test in OGraf-compatible renderers:
   - StreamShapers Ferryman
   - EBU OGraf Devtool preview
   - CasparCG (if OGraf adapter available)

---

## References

- [EBU OGraf Specification](https://ograf.ebu.io/v1/specification/docs/Specification.html)
- [OGraf GitHub Repository](https://github.com/ebu/ograf)
- [OGraf JSON Schema](https://ograf.ebu.io/v1/specification/json-schemas/graphics/schema.json)
- [EBU Tech Article on OGraf](https://tech.ebu.ch/news/2025/04/ograf-the-ebu's-open-spec-for-cross-platform-graphics-integration)
- [StreamShapers OGraf Docs](https://streamshapers.com/docs/documentation/ograf/)

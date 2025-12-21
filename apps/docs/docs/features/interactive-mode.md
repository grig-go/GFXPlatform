---
sidebar_position: 10
---

# Interactive Mode

Nova GFX supports **Interactive Mode** for creating dynamic, responsive graphics that respond to user input, change data on-the-fly, and include button-driven navigation.

## Overview

Interactive Mode transforms static broadcast graphics into dynamic applications that can:

- **Respond to clicks and events** - Buttons, clickable regions, hover effects
- **Switch data dynamically** - Change displayed data without reloading
- **Navigate between screens** - Multi-template navigation flows
- **Control animations** - Trigger IN/OUT animations programmatically
- **Manage state** - Track variables and user selections

## Enabling Interactive Mode

1. Open **Project Settings** (gear icon in the header)
2. Toggle **Interactive Mode** to ON
3. Save your project

When enabled, you'll see:
- Interactive element properties in the panel
- Script Editor tab in the designer
- Runtime controls in preview mode

## Interactive Elements

Any element can be made interactive by enabling the `interactive` property.

### Making Elements Clickable

1. Select an element on the canvas
2. In the Properties panel, find the **Interactive** section
3. Toggle **Clickable** to ON
4. The element will now respond to click events

```json
{
  "name": "My Button",
  "element_type": "shape",
  "interactive": true,
  "content": {
    "type": "shape",
    "shape": "rectangle",
    "fill": "#3b82f6"
  }
}
```

### Interactive Element Types

| Element Type | Common Uses |
|--------------|-------------|
| **Shape** | Buttons, clickable regions, tab backgrounds |
| **Text** | Clickable labels, navigation links |
| **Image** | Logo buttons, icon buttons |
| **Group** | Complex button with multiple elements |

## Event Types

Interactive elements can respond to various events:

| Event | Description | Trigger |
|-------|-------------|---------|
| `click` | User clicks the element | Mouse click / tap |
| `hover` | Mouse enters the element | Mouse over |
| `hoverEnd` | Mouse leaves the element | Mouse out |
| `load` | Template loads | Page/template render |
| `dataChange` | Data record changes | Data source update |

## Universal Address System

The Address System lets you reference any element, template, or data using `@` syntax.

### Element Addresses

Reference elements by name:

```
@ElementName                   - The entire element
@ElementName.position_x        - X position
@ElementName.position_y        - Y position
@ElementName.width            - Width
@ElementName.height           - Height
@ElementName.opacity          - Opacity (0-1)
@ElementName.visible          - Visibility (boolean)
@ElementName.rotation         - Rotation in degrees
@ElementName.content.text     - Text content
@ElementName.content.src      - Image source
@ElementName.styles.color     - Text color
@ElementName.styles.fontSize  - Font size
```

**Note:** Element names with spaces use underscores: `"My Button"` becomes `@My_Button`

### Template Addresses

Control which data record a template displays:

```
@template.TemplateName.data       - Set by display field value
@template.TemplateName.dataIndex  - Set by numeric index (0, 1, 2...)
```

### Data Addresses

Access current record fields:

```
@data.current.fieldName           - Field from current record
@data.current.location.name       - Nested field access
```

### State Addresses

Read/write runtime state:

```
@state.variableName               - Get/set state value
```

## Actions API

Actions are methods you can call to perform operations:

| Method | Description | Example |
|--------|-------------|---------|
| `actions.setState(address, value)` | Set a value | `actions.setState('@template.Weather.data', 'Arizona')` |
| `actions.navigate(templateName)` | Navigate to template | `actions.navigate('Results Screen')` |
| `actions.showElement(name)` | Show an element | `actions.showElement('Details Panel')` |
| `actions.hideElement(name)` | Hide an element | `actions.hideElement('Details Panel')` |
| `actions.toggleElement(name)` | Toggle visibility | `actions.toggleElement('Details Panel')` |
| `actions.playIn(template, layer)` | Play IN animation | `actions.playIn('Card', 'Main')` |
| `actions.playOut(layer)` | Play OUT animation | `actions.playOut('Main')` |
| `actions.log(message)` | Debug logging | `actions.log('Clicked!')` |

## Common Interactive Patterns

### Data Switching Buttons

Buttons that switch which data record is displayed:

```javascript
// Handler for Alabama button
function onBtn_AlabamaOnClick(event) {
  actions.setState('@template.Weather.data', 'Alabama');
}

// Handler for Texas button
function onBtn_TexasOnClick(event) {
  actions.setState('@template.Weather.data', 'Texas');
}
```

### Tab Navigation

Toggle between different content views:

```javascript
function onTab1OnClick(event) {
  actions.showElement('Panel1');
  actions.hideElement('Panel2');
  actions.setState('@state.activeTab', 'tab1');
}

function onTab2OnClick(event) {
  actions.hideElement('Panel1');
  actions.showElement('Panel2');
  actions.setState('@state.activeTab', 'tab2');
}
```

### Expandable Panels

Toggle visibility of detail panels:

```javascript
function onToggle_ButtonOnClick(event) {
  actions.toggleElement('Details Panel');
}
```

### Multi-Template Navigation

Navigate between different templates:

```javascript
function onNextOnClick(event) {
  actions.navigate('Results Screen');
}

function onBackOnClick(event) {
  actions.navigate('Main Menu');
}
```

## Template Placeholder

Use `{{CURRENT_TEMPLATE}}` placeholder in addresses to reference the current template:

```javascript
// This works regardless of template name
actions.setState('@template.{{CURRENT_TEMPLATE}}.data', 'Arizona');
```

The placeholder is automatically replaced with the actual template name at runtime, ensuring scripts work even if the template is renamed.

## Best Practices

### Naming Conventions

- **Use descriptive names**: `Btn Alabama`, `Tab Weather`, `Panel Details`
- **Prefix by type**: `Btn_`, `Tab_`, `Nav_` for easy identification
- **Keep names short**: They become function names

### Handler Function Pattern

Handler functions follow the naming pattern: `on{ElementName}On{EventType}`

| Element Name | Event | Function Name |
|--------------|-------|---------------|
| `Btn Alabama` | click | `onBtn_AlabamaOnClick` |
| `Nav Button` | click | `onNav_ButtonOnClick` |
| `Tab1` | hover | `onTab1OnHover` |

### One Action Per Handler

Keep handlers simple and focused:

```javascript
// Good - one clear action
function onBtnAlaskaOnClick(event) {
  actions.setState('@template.Weather.data', 'Alaska');
}

// Avoid - too complex
function onBtnAlaskaOnClick(event) {
  actions.setState('@template.Weather.data', 'Alaska');
  actions.navigate('Details');
  actions.showElement('Panel');
  actions.playIn('Card', 'Main');
}
```

### Use Display Field Values

When switching data, use the display field value rather than indexes:

```javascript
// Good - uses display field value
actions.setState('@template.Weather.data', 'Arizona');

// Avoid - fragile index
actions.setState('@template.Weather.dataIndex', 2);
```

## Preview Mode

In Preview Mode (F5), interactive graphics work like they would in production:

1. Click elements to trigger events
2. Watch data switch in real-time
3. See navigation between templates
4. Debug using console logs

## Related Features

- [Scripting](./scripting) - Code and visual scripting
- [Visual Nodes](./visual-nodes) - No-code logic builder
- [Data Binding](./data-binding) - Connect data to elements
- [AI Hints](./ai-hints) - Guide AI for interactive graphics

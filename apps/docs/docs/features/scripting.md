---
sidebar_position: 11
---

# Scripting

Nova GFX provides a powerful scripting system for creating interactive graphics. You can write scripts using **JavaScript code** or the **Visual Node Editor** (no-code).

## Script Editor

Access the Script Editor from the designer toolbar when Interactive Mode is enabled.

```
┌─────────────────────────────────────────────────────────────┐
│  Script Editor                              [Visual] [Code] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  // Handler for click on Btn_Alabama               │   │
│  │  function onBtn_AlabamaOnClick(event) {            │   │
│  │    actions.setState('@template.Weather.data',      │   │
│  │                     'Alabama');                    │   │
│  │  }                                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [▶ Run] [💾 Save] [🗑️ Clear]                              │
└─────────────────────────────────────────────────────────────┘
```

## Two Editing Modes

### Code Mode

Write JavaScript directly with full syntax highlighting and autocomplete:

```javascript
// Interactive Script for Nova GFX
// Available: state, data, event, actions

function onButtonOnClick(event) {
  const count = state.count || 0;
  actions.setState('count', count + 1);
  actions.log('Button clicked', { newCount: count + 1 });
}
```

### Visual Mode

Build logic by connecting nodes without writing code. See [Visual Nodes](./visual-nodes) for details.

## Available Global Objects

Scripts have access to these global objects:

| Object | Type | Description |
|--------|------|-------------|
| `state` | Object | Runtime state variables |
| `data` | Object | Current data record fields |
| `event` | Object | Information about the triggering event |
| `actions` | Object | Methods to perform actions |

### state

Read and write runtime state variables:

```javascript
// Read state
const count = state.count;
const selectedTab = state.activeTab;

// State is also accessible via actions.getState()
const value = actions.getState('count');
```

### data

Access fields from the current data record:

```javascript
// Access data fields
const city = data.location.name;
const temp = data.weather.temperature;
const items = data.forecast.items;
```

### event

Information about the event that triggered the script:

```javascript
// Event properties
event.type       // 'click', 'hover', 'load', etc.
event.elementId  // ID of the triggering element
event.data       // Additional event data
```

### actions

Methods for performing operations:

```javascript
// State management
actions.setState('variableName', value);
actions.getState('variableName');

// Navigation
actions.navigate('templateName', { params });

// Element visibility
actions.showElement('elementName');
actions.hideElement('elementName');
actions.toggleElement('elementName');

// Animation control
actions.playAnimation('elementId');
actions.playIn('templateId', 'layerId');
actions.playOut('layerId');

// Data fetching
await actions.fetchData('https://api.example.com/data');

// Logging
actions.log('message', { optionalData });
```

## Handler Functions

Each interactive element needs a handler function. The naming pattern is:

```
on{ElementName}On{EventType}
```

### Naming Rules

| Element Name | Converted To |
|--------------|--------------|
| `Btn Alabama` | `Btn_Alabama` |
| `My Button` | `My_Button` |
| `Nav-Button` | `Nav_Button` |

### Event Types

| Event Type | Function Suffix |
|------------|-----------------|
| click | `OnClick` |
| hover | `OnHover` |
| hoverEnd | `OnHoverEnd` |
| load | `OnLoad` |
| dataChange | `OnDataChange` |

### Examples

```javascript
// Click handler for "Btn Alabama"
function onBtn_AlabamaOnClick(event) {
  actions.setState('@template.Weather.data', 'Alabama');
}

// Hover handler for "Card 1"
function onCard_1OnHover(event) {
  actions.showElement('Tooltip');
}

// Hover end handler
function onCard_1OnHoverEnd(event) {
  actions.hideElement('Tooltip');
}

// Load handler for "Main Screen"
function onMain_ScreenOnLoad(event) {
  actions.setState('@state.initialized', true);
}
```

## Address System in Scripts

Use the `@` address syntax to reference elements and data:

```javascript
// Set element visibility
actions.setState('@ElementName.visible', true);

// Set element position
actions.setState('@Card.position_x', 100);

// Change template data
actions.setState('@template.Weather.data', 'Texas');

// Set state variable
actions.setState('@state.activeTab', 'tab1');
```

## Common Patterns

### State-Based Data Switching

```javascript
// Create button handlers for each data option
function onBtn_AlaskaOnClick(event) {
  actions.setState('@template.Weather.data', 'Alaska');
}

function onBtn_FloridaOnClick(event) {
  actions.setState('@template.Weather.data', 'Florida');
}

function onBtn_TexasOnClick(event) {
  actions.setState('@template.Weather.data', 'Texas');
}
```

### Counter Pattern

```javascript
function onIncrementOnClick(event) {
  const count = state.count || 0;
  actions.setState('count', count + 1);
}

function onDecrementOnClick(event) {
  const count = state.count || 0;
  actions.setState('count', Math.max(0, count - 1));
}

function onResetOnClick(event) {
  actions.setState('count', 0);
}
```

### Toggle Pattern

```javascript
function onToggle_ButtonOnClick(event) {
  const isOpen = state.panelOpen || false;
  actions.setState('panelOpen', !isOpen);

  if (!isOpen) {
    actions.showElement('DetailPanel');
  } else {
    actions.hideElement('DetailPanel');
  }
}
```

### Tab Navigation

```javascript
function onTab1OnClick(event) {
  actions.setState('@state.activeTab', 'tab1');
  actions.showElement('Content1');
  actions.hideElement('Content2');
  actions.hideElement('Content3');
}

function onTab2OnClick(event) {
  actions.setState('@state.activeTab', 'tab2');
  actions.hideElement('Content1');
  actions.showElement('Content2');
  actions.hideElement('Content3');
}

function onTab3OnClick(event) {
  actions.setState('@state.activeTab', 'tab3');
  actions.hideElement('Content1');
  actions.hideElement('Content2');
  actions.showElement('Content3');
}
```

### Conditional Logic

```javascript
function onSubmitOnClick(event) {
  const score = data.current.score;

  if (score >= 90) {
    actions.showElement('GradeA');
  } else if (score >= 80) {
    actions.showElement('GradeB');
  } else if (score >= 70) {
    actions.showElement('GradeC');
  } else {
    actions.showElement('GradeF');
  }
}
```

### Animation Control

```javascript
function onShowCardOnClick(event) {
  actions.playIn('WeatherCard', 'MainLayer');
}

function onHideCardOnClick(event) {
  actions.playOut('MainLayer');
}
```

## Template Placeholder

Use `{{CURRENT_TEMPLATE}}` to reference the current template dynamically:

```javascript
// Works regardless of template name
function onStateButtonOnClick(event) {
  actions.setState('@template.{{CURRENT_TEMPLATE}}.data', 'Arizona');
}
```

This ensures your scripts work even if the template is renamed.

## Debugging

### Console Logging

Use `actions.log()` to debug your scripts:

```javascript
function onButtonOnClick(event) {
  actions.log('Button clicked!');
  actions.log('Current state:', state);
  actions.log('Event data:', event);
}
```

### Browser Console

Scripts log to the browser developer console. Open DevTools (F12) to see:

- Script execution logs
- State changes
- Error messages

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `TypeError: actions is undefined` | Script context not set | Ensure script is in handler function |
| `Cannot read property of undefined` | Missing state/data | Check if value exists first |
| `Handler not found` | Function name mismatch | Check element name conversion |

## Performance Tips

1. **Keep handlers small** - Do one thing per handler
2. **Avoid expensive operations** - Don't compute in hot paths
3. **Use state sparingly** - Only store what's needed
4. **Debounce hover events** - Prevent rapid state changes

## Related Features

- [Interactive Mode](./interactive-mode) - Enable interactivity
- [Visual Nodes](./visual-nodes) - No-code scripting
- [Data Binding](./data-binding) - Connect data sources

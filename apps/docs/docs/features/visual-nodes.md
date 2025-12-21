---
sidebar_position: 12
---

# Visual Nodes

The Visual Node Editor provides a no-code way to create interactive logic by connecting nodes in a visual graph.

## Overview

Visual nodes let you build interactive behaviors without writing JavaScript:

- **Drag and drop** nodes onto the canvas
- **Connect nodes** with edges to define flow
- **Configure properties** in the node inspector
- **Test in preview** to see results

```
┌──────────────────────────────────────────────────────────────┐
│  Visual Script Editor                                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐      ┌─────────────┐      ┌──────────────┐    │
│  │  Event  │─────▶│  Condition  │─────▶│   Action     │    │
│  │  click  │      │  if score>10│      │  setState    │    │
│  └─────────┘      └─────────────┘      └──────────────┘    │
│                          │                                   │
│                          ▼                                   │
│                   ┌──────────────┐                          │
│                   │   Action     │                          │
│                   │  showElement │                          │
│                   └──────────────┘                          │
│                                                              │
│  Node Palette                                                │
│  [Event] [Condition] [Action] [Data] [Animation]            │
└──────────────────────────────────────────────────────────────┘
```

## Node Types

### Event Nodes

Event nodes are entry points that trigger when something happens:

| Event Type | Description |
|------------|-------------|
| `click` | User clicks an element |
| `hover` | Mouse enters element |
| `hoverEnd` | Mouse leaves element |
| `load` | Template/screen loads |
| `dataChange` | Data source updates |

**Configuration:**
- **Element**: Which element triggers the event (or "Any" for all)
- **Event Type**: The type of event to listen for

### Condition Nodes

Condition nodes branch the flow based on a comparison:

| Operator | Description |
|----------|-------------|
| `equals` | Value equals comparison |
| `notEquals` | Value does not equal |
| `greaterThan` | Value is greater than |
| `lessThan` | Value is less than |
| `greaterOrEqual` | Value is greater than or equal |
| `lessOrEqual` | Value is less than or equal |
| `contains` | String contains substring |
| `startsWith` | String starts with |
| `endsWith` | String ends with |
| `isEmpty` | Value is empty/null |
| `isNotEmpty` | Value exists and not empty |
| `isTrue` | Boolean is true |
| `isFalse` | Boolean is false |

**Configuration:**
- **Condition**: Address or value to check (e.g., `@state.count`, `@data.score`)
- **Operator**: Comparison operator
- **Value**: Value to compare against

### Action Nodes

Action nodes perform operations:

| Action Type | Description |
|-------------|-------------|
| `setState` | Set a state variable or address |
| `toggleState` | Toggle a boolean value |
| `navigate` | Navigate to another template |
| `showElement` | Make an element visible |
| `hideElement` | Hide an element |
| `toggleElement` | Toggle element visibility |
| `playTemplate` | Play template animation |
| `toggleTemplate` | Toggle IN/OUT animation |
| `playAnimation` | Play element animation |
| `stopAnimation` | Stop element animation |
| `log` | Log a debug message |
| `delay` | Wait before continuing |
| `callFunction` | Call a custom function |

**Configuration varies by action type:**

#### setState
- **Target**: Address to set (e.g., `@template.Weather.data`, `@state.count`)
- **Value**: New value to assign

#### navigate
- **Target**: Template name to navigate to

#### showElement / hideElement / toggleElement
- **Element**: Element name or ID

#### playTemplate
- **Template**: Template to animate
- **Layer**: Layer containing the template
- **Phase**: `in`, `loop`, or `out`

#### delay
- **Duration**: Milliseconds to wait

### Data Nodes

Data nodes read and write data:

| Operation | Description |
|-----------|-------------|
| `get` | Read a value from an address |
| `set` | Write a value to an address |
| `filter` | Filter an array |
| `sort` | Sort an array |
| `aggregate` | Calculate sum, avg, count, etc. |

**Configuration:**
- **Path**: Address path (e.g., `@data.items`, `@state.selectedId`)
- **Value**: For set operations, the value to write

### Animation Nodes

Animation nodes control template and element animations:

**Configuration:**
- **Template**: Template to animate
- **Layer**: Target layer
- **Phase**: `in`, `loop`, or `out`
- **Data**: Optional data to pass

## Creating a Visual Script

### 1. Open the Script Editor

With Interactive Mode enabled, click the **Script** tab in the designer.

### 2. Switch to Visual Mode

Click the **Visual** toggle at the top of the panel.

### 3. Add Nodes

Click a node type button to add it to the canvas:
- **Event** (trigger point)
- **Condition** (if/else logic)
- **Action** (do something)
- **Data** (read/write data)
- **Animation** (control animations)

### 4. Connect Nodes

1. Hover over a node's output handle (right side)
2. Drag to another node's input handle (left side)
3. Release to create the connection

### 5. Configure Nodes

1. Click a node to select it
2. Use the Node Inspector panel to configure properties
3. Enter values for target, operator, value, etc.

### 6. Test in Preview

Press F5 or click Preview to test your logic.

## Example Flows

### Simple Button Click

Switch data when a button is clicked:

```
┌─────────────┐      ┌──────────────────┐
│   Event     │─────▶│     Action       │
│   click     │      │   setState       │
│ Btn_Alabama │      │ @template...data │
└─────────────┘      │     Alabama      │
                     └──────────────────┘
```

### Conditional Display

Show different elements based on score:

```
┌─────────┐      ┌─────────────┐      ┌───────────────┐
│  Event  │─────▶│  Condition  │─────▶│    Action     │
│  load   │      │ @data.score │      │  showElement  │
└─────────┘      │   >= 90     │      │    GradeA     │
                 └─────────────┘      └───────────────┘
                        │
                        ▼ (false)
                 ┌─────────────┐      ┌───────────────┐
                 │  Condition  │─────▶│    Action     │
                 │ @data.score │      │  showElement  │
                 │   >= 80     │      │    GradeB     │
                 └─────────────┘      └───────────────┘
```

### Tab Navigation with State

```
┌─────────────┐      ┌───────────────┐      ┌───────────────┐
│   Event     │─────▶│    Action     │─────▶│    Action     │
│   click     │      │   setState    │      │  showElement  │
│   Tab1      │      │ @state.tab=1  │      │   Content1    │
└─────────────┘      └───────────────┘      └───────────────┘
                                                    │
                                                    ▼
                                            ┌───────────────┐
                                            │    Action     │
                                            │  hideElement  │
                                            │   Content2    │
                                            └───────────────┘
```

### Toggle Pattern

```
┌─────────────┐      ┌─────────────────┐
│   Event     │─────▶│     Action      │
│   click     │      │  toggleElement  │
│ Toggle_Btn  │      │   DetailPanel   │
└─────────────┘      └─────────────────┘
```

### Animation Trigger

```
┌─────────────┐      ┌───────────────┐      ┌───────────────┐
│   Event     │─────▶│    Action     │─────▶│   Animation   │
│   click     │      │   setState    │      │ playTemplate  │
│  ShowCard   │      │ @...data=TX   │      │  phase: in    │
└─────────────┘      └───────────────┘      └───────────────┘
```

### Delayed Action

```
┌─────────────┐      ┌───────────────┐      ┌───────────────┐
│   Event     │─────▶│    Action     │─────▶│    Action     │
│   click     │      │  showElement  │      │    delay      │
│   Button    │      │   Loading     │      │   2000ms      │
└─────────────┘      └───────────────┘      └───────────────┘
                                                    │
                                                    ▼
                                            ┌───────────────┐
                                            │    Action     │
                                            │  hideElement  │
                                            │    Loading    │
                                            └───────────────┘
```

## Using Addresses in Nodes

The `@` address syntax works in node configuration:

### Element Addresses
```
@ElementName.visible      - Element visibility
@ElementName.position_x   - X position
@ElementName.opacity      - Opacity
```

### Template Data Addresses
```
@template.Weather.data        - Set by display field value
@template.Weather.dataIndex   - Set by index
```

### State Addresses
```
@state.activeTab     - Custom state variable
@state.count         - Counter value
```

### Data Addresses
```
@data.current.score       - Current record field
@data.current.team.name   - Nested field
```

## Template Placeholder

Use `{{CURRENT_TEMPLATE}}` in addresses to reference the current template:

```
@template.{{CURRENT_TEMPLATE}}.data
```

This gets replaced with the actual template name at runtime.

## Converting to Code

The visual node graph generates JavaScript code. Click **Code** mode to see the generated script:

```javascript
// Generated from Visual Script Editor
// Available: state, data, event, actions

// Handler for click on Btn_Alabama
function onBtn_AlabamaOnClick(event) {
  actions.setState('@template.Weather.data', 'Alabama');
}
```

You can edit the code directly and switch back to visual mode.

## Best Practices

### Keep Flows Simple
- Each event should lead to a focused chain
- Avoid complex branching when possible
- Split complex logic into multiple event handlers

### Name Elements Clearly
- Use descriptive names: `Btn_ShowDetails`, `Panel_Weather`
- Consistent naming makes configuration easier

### Test Frequently
- Use Preview mode to test as you build
- Check the console for log output

### Use State for Coordination
- Store shared values in state
- Multiple handlers can read/write state

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Node not triggering | Wrong element selected | Check event node element config |
| Condition always false | Wrong operator | Verify operator and value |
| Action not working | Invalid address | Check address syntax |
| Flow stops | Missing connection | Ensure nodes are connected |

## Related Features

- [Interactive Mode](./interactive-mode) - Enable interactivity
- [Scripting](./scripting) - Code-based scripting
- [Data Binding](./data-binding) - Connect data sources

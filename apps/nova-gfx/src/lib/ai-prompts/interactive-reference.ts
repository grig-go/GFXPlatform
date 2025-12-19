/**
 * Interactive Scripting Reference
 *
 * Provides documentation for the AI about:
 * - Universal Address System for referencing elements and data
 * - Visual Node Scripting for creating interactive graphics
 * - Event handling and state management
 * - Data binding with addresses
 */

export const INTERACTIVE_REFERENCE = `## INTERACTIVE PROJECT MODE

This project is set to **Interactive Mode**, meaning the graphics can respond to user input,
change data dynamically, and include button-driven navigation.

### Universal Address System

The Address System allows referencing any element, template, layer, or data field using a simple @ syntax.

**Address Format:** \`@name.property\` or \`@type.name.property\`

#### Element Addresses
Reference any element by its name:
- \`@ElementName\` - Reference the entire element
- \`@ElementName.position_x\` - Element's X position
- \`@ElementName.position_y\` - Element's Y position
- \`@ElementName.width\` - Element width
- \`@ElementName.height\` - Element height
- \`@ElementName.opacity\` - Element opacity (0-1)
- \`@ElementName.visible\` - Element visibility (boolean)
- \`@ElementName.rotation\` - Rotation in degrees
- \`@ElementName.content.text\` - Text content (for text elements)
- \`@ElementName.content.src\` - Image source (for image elements)
- \`@ElementName.styles.backgroundColor\` - Background color
- \`@ElementName.styles.color\` - Text color
- \`@ElementName.styles.fontSize\` - Font size

**Note:** Element names with spaces use underscores: "My Button" → \`@My_Button\`

#### Template Data Addresses
Control which data record a template displays:
- \`@template.TemplateName.data\` - Set by display field value (e.g., "Arizona")
- \`@template.TemplateName.dataIndex\` - Set by numeric index (0, 1, 2...)

**Example:** To show Arizona's weather when Button 1 is clicked:
\`\`\`
Set @template.Weather_Card.data = "Arizona"
\`\`\`

#### Data Addresses
Reference current data record fields:
- \`@data.current.fieldName\` - Field from current record
- \`@data.current.location.name\` - Nested field access

#### State Addresses
Reference runtime state variables:
- \`@state.variableName\` - Get/set state value

### Visual Node Scripting

Interactive graphics use a visual node graph to define behavior. The graph consists of:

1. **Event Nodes** - Triggers (onClick, onHover, etc.)
2. **Action Nodes** - What happens (setState, playAnimation, etc.)
3. **Condition Nodes** - If/else logic
4. **Data Nodes** - Read/write data

#### Event Types
| Event | Description | Use Case |
|-------|-------------|----------|
| onClick | User clicks element | Buttons, navigation |
| onHover | Mouse enters element | Highlight effects |
| onHoverEnd | Mouse leaves element | Reset highlights |
| onLoad | Template loads | Initial setup |
| onDataChange | Data record changes | Update dependent elements |

#### Setting Up Element Events

Each interactive element (especially buttons) needs:
1. An **Event Node** configured with:
   - \`eventType\`: "onClick", "onHover", etc.
   - \`elementId\`: The specific element's ID (CRITICAL!)

2. **Action Node(s)** connected to the event

**CRITICAL:** Each button must have its own Event Node with its specific \`elementId\`.
If elementId is missing or set to "__any__", the action runs for ALL clicks!

#### Action Types

**setState** - Set a value at an address
\`\`\`json
{
  "type": "action",
  "actionType": "setState",
  "data": {
    "address": "@template.Weather_Card.data",
    "value": "Arizona"
  }
}
\`\`\`

**playIn** - Play template's IN animation
\`\`\`json
{
  "type": "action",
  "actionType": "playIn",
  "data": {
    "templateName": "Weather Card",
    "layerName": "Main Layer"
  }
}
\`\`\`

**playOut** - Play layer's OUT animation
\`\`\`json
{
  "type": "action",
  "actionType": "playOut",
  "data": {
    "layerName": "Main Layer"
  }
}
\`\`\`

**showElement / hideElement / toggleElement**
\`\`\`json
{
  "type": "action",
  "actionType": "showElement",
  "data": {
    "elementName": "Details Panel"
  }
}
\`\`\`

**navigate** - Switch to another template
\`\`\`json
{
  "type": "action",
  "actionType": "navigate",
  "data": {
    "templateName": "Results Screen"
  }
}
\`\`\`

### Creating Interactive Buttons

When the user wants buttons that change data or navigate:

1. **Create the button element** (usually a shape + text)
2. **Enable interactivity** on the element: \`"interactive": true\`
3. **Configure the visual script** with:
   - Event node for onClick with the button's elementId
   - Action node(s) for what should happen

**Example: State Selection Buttons**

For buttons that switch between states (like Arizona vs New York):

\`\`\`json
{
  "elements": [
    {
      "name": "Arizona Button",
      "element_type": "shape",
      "interactive": true,
      "content": {"type": "shape", "shape": "rectangle", "fill": "#3b82f6"}
    },
    {
      "name": "New York Button",
      "element_type": "shape",
      "interactive": true,
      "content": {"type": "shape", "shape": "rectangle", "fill": "#3b82f6"}
    }
  ],
  "visualScript": {
    "nodes": [
      {
        "id": "event-arizona",
        "type": "event",
        "data": {
          "eventType": "onClick",
          "elementId": "{{ARIZONA_BUTTON_ID}}"
        }
      },
      {
        "id": "action-arizona",
        "type": "action",
        "data": {
          "actionType": "setState",
          "address": "@template.Weather_Card.data",
          "value": "Arizona"
        }
      },
      {
        "id": "event-newyork",
        "type": "event",
        "data": {
          "eventType": "onClick",
          "elementId": "{{NEWYORK_BUTTON_ID}}"
        }
      },
      {
        "id": "action-newyork",
        "type": "action",
        "data": {
          "actionType": "setState",
          "address": "@template.Weather_Card.data",
          "value": "New York"
        }
      }
    ],
    "edges": [
      {"source": "event-arizona", "target": "action-arizona"},
      {"source": "event-newyork", "target": "action-newyork"}
    ]
  }
}
\`\`\`

### Data Binding with Addresses

For data-driven interactive graphics, combine bindings with addresses:

1. **Static binding** - Element shows field from current record:
\`\`\`json
{
  "binding": {
    "field": "location.name",
    "type": "text"
  }
}
\`\`\`

2. **Dynamic switching** - Button changes which record is "current":
\`\`\`
Action: setState @template.TemplateName.data = "Record Name"
\`\`\`

This updates the template's current record, and all bound elements automatically refresh.

### Best Practices for Interactive Graphics

1. **Name elements clearly** - Good names make addresses readable
   - "Arizona Button" → \`@Arizona_Button\`
   - "Weather Card" → \`@Weather_Card\`

2. **One Event Node per element** - Each clickable element needs its own event node with correct elementId

3. **Use display field values** - When switching data, use the display field value (like "Arizona") rather than indexes

4. **Test each button** - Verify each button triggers only its own action, not all actions

5. **Layer organization** - Keep interactive elements on their own layer for easier management

### Common Interactive Patterns

**Tab Navigation:**
- Multiple buttons, each sets a different state/data
- Visual feedback (highlight active button)

**Expandable Panels:**
- Button toggles panel visibility
- Use showElement/hideElement actions

**Data Carousel:**
- Next/Prev buttons change dataIndex
- \`@template.Name.dataIndex\` += 1 or -= 1

**Multi-Template Flow:**
- Buttons navigate between templates
- Use navigate action with template names
`;

/**
 * Keywords that indicate interactive functionality is needed
 */
export const INTERACTIVE_KEYWORDS = [
  'interactive',
  'button',
  'click',
  'clickable',
  'hover',
  'navigation',
  'navigate',
  'switch',
  'toggle',
  'select',
  'selector',
  'tab',
  'tabs',
  'menu',
  'dropdown',
  'carousel',
  'slider',
  'expandable',
  'collapsible',
  'accordion',
  'modal',
  'popup',
  'dialog',
  'state',
  'dynamic',
  'responsive',
  'touch',
  'gesture',
  'drag',
  'drop',
];

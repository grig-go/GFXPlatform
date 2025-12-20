/**
 * Interactive Scripting Reference
 *
 * Provides documentation for the AI about:
 * - Universal Address System for referencing elements and data
 * - JavaScript code scripting for creating interactive graphics
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

#### Data Addresses
Reference current data record fields:
- \`@data.current.fieldName\` - Field from current record
- \`@data.current.location.name\` - Nested field access

#### State Addresses
Reference runtime state variables:
- \`@state.variableName\` - Get/set state value

### JavaScript Code Scripting

Interactive graphics use **JavaScript code** to define behavior. The script runs in a sandboxed environment with access to special APIs.

#### Available Global Objects

| Object | Description |
|--------|-------------|
| \`state\` | Read/write runtime state variables |
| \`data\` | Access current data record fields |
| \`event\` | Information about the triggering event |
| \`actions\` | Methods to perform actions |

#### Event Handler Functions

Create functions named \`on{ElementName}On{EventType}\` to handle events:

\`\`\`javascript
// Handler for onClick on element named "Btn_Alabama"
function onBtn_AlabamaOnClick(event) {
  actions.setState('@template.{{CURRENT_TEMPLATE}}.data', 'Alabama');
}

// Handler for onClick on element named "Btn_Texas"
function onBtn_TexasOnClick(event) {
  actions.setState('@template.{{CURRENT_TEMPLATE}}.data', 'Texas');
}
\`\`\`

**Function naming pattern:** \`on{ElementName}On{EventType}\`
- Element name with spaces → underscores: "My Button" → "My_Button"
- Event types: \`Click\`, \`Hover\`, \`HoverEnd\`, \`Load\`, \`DataChange\`

#### Actions API

| Method | Description | Example |
|--------|-------------|---------|
| \`actions.setState(address, value)\` | Set a value at an address | \`actions.setState('@template.{{CURRENT_TEMPLATE}}.data', 'Arizona')\` |
| \`actions.navigate(templateName)\` | Navigate to another template | \`actions.navigate('Results Screen')\` |
| \`actions.showElement(elementName)\` | Show an element | \`actions.showElement('Details Panel')\` |
| \`actions.hideElement(elementName)\` | Hide an element | \`actions.hideElement('Details Panel')\` |
| \`actions.toggleElement(elementName)\` | Toggle element visibility | \`actions.toggleElement('Details Panel')\` |
| \`actions.playIn(templateName, layerName)\` | Play IN animation | \`actions.playIn('Weather Card', 'Main Layer')\` |
| \`actions.playOut(layerName)\` | Play OUT animation | \`actions.playOut('Main Layer')\` |
| \`actions.log(message)\` | Log to console | \`actions.log('Button clicked!')\` |

### Creating Interactive Buttons

**⚠️ CRITICAL: You MUST include a \`script\` field when creating interactive buttons!**

**⚠️ IMPORTANT: Use \`{{CURRENT_TEMPLATE}}\` placeholder for template addresses!**
- Use \`@template.{{CURRENT_TEMPLATE}}.data\` - it will be replaced with the actual template name at runtime
- This ensures the script works even if the template is renamed later
- Do NOT use generic names like "Blank", "Template", or hard-coded template names

When the user wants buttons that change data or navigate:

1. **Create the button element** (usually a shape + text)
2. **Enable interactivity** on the element: \`"interactive": true\`
3. **ALWAYS include script** with handler functions for each button

**REQUIRED JSON OUTPUT FORMAT:**

Your response JSON MUST include the \`script\` field at the top level when creating buttons:

\`\`\`json
{
  "type": "create",
  "elements": [...],
  "script": "// Handler functions here..."
}
\`\`\`

**Example: State Selection Buttons**

For buttons that switch between states (like Alabama, Texas, California):

\`\`\`json
{
  "type": "create",
  "elements": [
    {
      "name": "Btn Alabama",
      "element_type": "shape",
      "interactive": true,
      "position_x": 50,
      "position_y": 400,
      "width": 120,
      "height": 40,
      "content": {"type": "shape", "shape": "rectangle", "fill": "#3b82f6"}
    },
    {
      "name": "Btn Alabama Label",
      "element_type": "text",
      "position_x": 60,
      "position_y": 410,
      "width": 100,
      "height": 20,
      "content": {"type": "text", "text": "Alabama"},
      "styles": {"color": "#ffffff", "fontSize": 14}
    },
    {
      "name": "Btn Texas",
      "element_type": "shape",
      "interactive": true,
      "position_x": 180,
      "position_y": 400,
      "width": 120,
      "height": 40,
      "content": {"type": "shape", "shape": "rectangle", "fill": "#3b82f6"}
    },
    {
      "name": "Btn Texas Label",
      "element_type": "text",
      "position_x": 190,
      "position_y": 410,
      "width": 100,
      "height": 20,
      "content": {"type": "text", "text": "Texas"},
      "styles": {"color": "#ffffff", "fontSize": 14}
    }
  ],
  "script": "// Handler for onClick on Btn_Alabama\\nfunction onBtn_AlabamaOnClick(event) {\\n  actions.setState('@template.{{CURRENT_TEMPLATE}}.data', 'Alabama');\\n}\\n\\n// Handler for onClick on Btn_Texas\\nfunction onBtn_TexasOnClick(event) {\\n  actions.setState('@template.{{CURRENT_TEMPLATE}}.data', 'Texas');\\n}"
}
\`\`\`

**NOTE:** Always use \`{{CURRENT_TEMPLATE}}\` placeholder - it will be automatically replaced with the actual template name at runtime.

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
\`\`\`javascript
actions.setState('@template.{{CURRENT_TEMPLATE}}.data', 'Arizona');
\`\`\`
(Use \`{{CURRENT_TEMPLATE}}\` placeholder - automatically resolved at runtime)

This updates the template's current record, and all bound elements automatically refresh.

### Best Practices for Interactive Graphics

1. **Name elements clearly** - Use descriptive names like "Btn Alabama", "Btn Texas"
   - "Btn Alabama" → function \`onBtn_AlabamaOnClick\`
   - "Nav Button" → function \`onNav_ButtonOnClick\`

2. **One handler per button** - Each clickable element needs its own handler function

3. **Use display field values** - When switching data, use the display field value (like "Arizona") rather than indexes

4. **Use \`{{CURRENT_TEMPLATE}}\` placeholder** - Never hard-code template names in addresses

5. **Keep scripts simple** - Each handler should do one clear action

### Common Interactive Patterns

**Tab Navigation:**
\`\`\`javascript
function onTab1OnClick(event) {
  actions.setState('@template.{{CURRENT_TEMPLATE}}.data', 'Tab1Data');
}
function onTab2OnClick(event) {
  actions.setState('@template.{{CURRENT_TEMPLATE}}.data', 'Tab2Data');
}
\`\`\`

**Expandable Panels:**
\`\`\`javascript
function onToggle_ButtonOnClick(event) {
  actions.toggleElement('Details Panel');
}
\`\`\`

**Multi-Template Flow:**
\`\`\`javascript
function onNext_ButtonOnClick(event) {
  actions.navigate('Results Screen');
}
\`\`\`
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

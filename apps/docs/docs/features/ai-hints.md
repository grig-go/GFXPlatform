---
sidebar_position: 14
---

# AI Hints

AI Hints help you guide the Nova GFX AI assistant to create exactly what you need. This feature lets you provide context and preferences that the AI uses when generating graphics.

## Overview

The AI assistant receives context about your project automatically:

- **Canvas dimensions** - Width and height of your project
- **Design system** - Your brand colors, fonts, and styles
- **Current template** - Existing elements on the canvas
- **Selected elements** - What you have selected
- **Interactive mode** - Whether interactivity is enabled
- **Data context** - Connected data sources and schema

You can enhance this by providing hints in your prompts.

## Effective Prompting

### Be Specific

Vague prompts lead to generic results. Be specific about what you want:

```
❌ "Add some text"
✅ "Add a headline that says 'Breaking News' in 48pt bold red text at the top center"

❌ "Make it look better"
✅ "Increase contrast, add a 2px white stroke, and add a drop shadow"

❌ "Create a button"
✅ "Create a blue rectangular button labeled 'Submit' that navigates to the Results template when clicked"
```

### Use Design Terms

The AI understands broadcast graphics terminology:

```
"Create a lower third with name and title fields"
"Add a score bug in the top right corner"
"Make a full-screen results graphic"
"Design a news ticker with scrolling text"
"Create an election results bar chart"
```

### Reference Context

Reference existing elements and selections:

```
"Make the selected element 20% larger"
"Match the style of the header text"
"Align this with the logo above"
"Use the same animation as the lower third"
```

## Interactive Mode Hints

When creating interactive graphics, include these hints:

### Specify Interactivity

```
"Create clickable buttons for each state that switch the weather data"
"Make the tabs interactive so they show different content"
"Add a toggle button that shows/hides the detail panel"
```

### Mention Handler Requirements

```
"Create state buttons with click handlers that update the template data"
"Add navigation buttons that go to different screens"
"Make buttons that control the animation playback"
```

### Include Script Requirements

The AI will generate script code when you mention:

- "clickable"
- "button"
- "interactive"
- "switch data"
- "navigate"
- "toggle"

## Data-Driven Hints

When working with data sources, help the AI understand your needs:

### Specify All Fields

```
"Create a weather graphic using ALL fields from the data source including temperature high/low, humidity, wind speed, and precipitation"
```

### Mention Binding Requirements

```
"Each text element should be bound to the corresponding data field"
"Create elements for every field in the schema with proper bindings"
```

### Reference Sample Data

```
"Based on the sample data, create elements for the team name, score, and logo"
```

## Design System Hints

Reference your design system for consistent results:

```
"Use our primary brand color for the background"
"Apply the heading font to the title"
"Follow our spacing guidelines for layout"
"Use the accent color for interactive elements"
```

## Animation Hints

Describe the motion you want:

```
"Animate the text sliding in from the left over 0.5 seconds"
"Add a fade-in effect to the background"
"Create a typewriter effect for the headline"
"Make elements stagger in one after another"
"Add a bounce effect when the score updates"
```

### Phase References

```
"Create IN animation that slides from left"
"Add a LOOP animation that pulses the highlight"
"Design an OUT animation that fades and scales down"
```

## Element-Specific Hints

### Charts

```
"Create a parliament chart showing seat distribution"
"Add a bar chart with horizontal bars for vote percentages"
"Make a pie chart with the top 5 categories"
```

### Maps

```
"Create a map of the United States with state borders"
"Add a weather map showing temperature zones"
"Make a results map with color-coded regions"
```

### Tables

```
"Create a leaderboard table with rank, name, and score columns"
"Add a stats table with alternating row colors"
```

## Prompt Templates

### Lower Third

```
"Create a lower third for [NAME] who is a [TITLE].
Use our brand colors with a slide-in animation from the left.
Include a decorative accent line."
```

### Score Bug

```
"Create a sports score bug showing [TEAM A] vs [TEAM B].
Include team logos, scores, and game clock.
Position in the top-left corner with our brand styling."
```

### Weather Graphic

```
"Create a weather forecast display using the connected data source.
Show location, current temperature, conditions icon, and 5-day forecast.
Use all available data fields with proper bindings.
Make it visually appealing with gradients and icons."
```

### Interactive Selector

```
"Create clickable buttons for each state in the data source.
When clicked, each button should switch the displayed weather data.
Include hover effects and active state styling.
Generate the script handlers for all buttons."
```

### Election Results

```
"Create an election results graphic with:
- Candidate photos and names
- Party affiliations with colors
- Vote percentages as animated bars
- Vote counts in thousands
Use data bindings for all dynamic fields."
```

## Iteration Tips

### Start Simple

Begin with a basic request, then refine:

1. "Create a lower third" (basic structure)
2. "Add a gradient background" (enhance styling)
3. "Make the text slide in from the left" (add animation)
4. "Increase the font size of the name" (fine-tune)

### Reference Previous Output

```
"Keep the layout but change the colors to blue and white"
"Add the same animation to all text elements"
"Apply this style to the other templates"
```

### Request Modifications

```
"Update the selected element to use a larger font"
"Change the background from solid to gradient"
"Move all elements 50 pixels to the right"
```

## Troubleshooting

### AI Not Understanding

If results aren't what you expected:

1. **Be more specific** - Add details about size, position, colors
2. **Use correct terms** - "lower third" not "name thing at bottom"
3. **Reference examples** - "like a typical sports score bug"

### Missing Interactive Features

If buttons aren't interactive:

1. **Explicitly request interactivity** - "make them clickable"
2. **Mention script generation** - "generate click handlers"
3. **Reference the action** - "that switch the template data"

### Missing Data Bindings

If data isn't bound properly:

1. **Request all fields** - "use ALL available data fields"
2. **Mention bindings explicitly** - "with data bindings"
3. **Reference the schema** - "create elements for each field in the schema"

## Context the AI Receives

### Automatic Context

| Context | What AI Knows |
|---------|--------------|
| Canvas Size | Width and height of your project |
| Current Template | Name and all existing elements |
| Selected Elements | Currently selected element(s) |
| Design System | Brand colors, fonts, spacing |
| Interactive Mode | Whether project is interactive |
| Data Context | Schema, sample data, source name |

### Interactive Mode Context

When Interactive Mode is enabled, the AI also knows:

- Which elements are already interactive
- The address system syntax
- Available actions API
- Script handler patterns

## Related Features

- [AI Assistant](./ai-assistant) - Main AI documentation
- [AI Configuration](./ai-configuration) - Model settings
- [Interactive Mode](./interactive-mode) - Interactivity
- [Data Binding](./data-binding) - Data connections

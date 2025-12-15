---
sidebar_position: 4
---

# AI Assistant

Nova GFX includes an intelligent AI assistant that helps you create and modify graphics using natural language. The AI can generate elements, update properties, create animations, and interpret design instructions.

## Overview

The AI Assistant provides:

- **Natural Language Creation**: Describe what you want, AI creates it
- **Smart Modifications**: Ask for changes in plain English
- **Animation Generation**: Describe movement, get keyframes
- **Context Awareness**: AI understands your current canvas and project
- **Multi-Model Support**: Choose from Gemini or Claude models
- **AI Image Generation**: Generate images or fetch from Pexels
- **Voice Input**: Speak your instructions
- **Real-Time Streaming**: See AI responses as they're generated

## Chat Panel Interface

```
┌─────────────────────────────────────────────────────┐
│  AI Assistant                           🗑️  ⚙️      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  User: Create a lower third with                    │
│        "John Smith" as the name                     │
│                                                     │
│  AI: I'll create a lower third graphic with         │
│      name styling. Here's what I made:              │
│      [Show Code ▼]                                  │
│      ┌───────────────────────────────┐             │
│      │ { "type": "create", ...       │             │
│      └───────────────────────────────┘             │
│      [Apply Changes]                               │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Quick Actions                                      │
│  [Add Animation] [Create L3] [Score Bug]           │
│  [Chart] [Map] [Improve]                           │
├─────────────────────────────────────────────────────┤
│  📎  📷  🎤  [Type a message...]           [Send]  │
└─────────────────────────────────────────────────────┘
```

## AI Capabilities

### Create Elements

Ask the AI to create new elements:

```
"Add a text element that says 'Breaking News' in red"
"Create a lower third with name and title fields"
"Add a score bug in the top right corner"
"Put a map of New York City centered on Manhattan"
```

### Modify Elements

Request changes to existing elements:

```
"Make the title text bigger"
"Change the background color to blue"
"Move the logo to the bottom left"
"Rotate the image 45 degrees"
```

### Create Animations

Describe the motion you want:

```
"Animate the text sliding in from the left"
"Make the logo fade in over 0.5 seconds"
"Add a bounce effect to the title"
"Create a typewriter effect for the text"
```

### Complex Instructions

Combine multiple actions:

```
"Create a sports score display with home team on the
left, away team on the right, and scores in the middle.
Use a dark background with white text. Add a slide-in
animation from the top."
```

## Quick Prompts

One-click access to common tasks:

| Button | Description |
|--------|-------------|
| **Add Animation** | Add animation to selected element |
| **Create L3** | Create a lower third graphic |
| **Score Bug** | Create a sports score display |
| **Chart** | Generate a bar chart |
| **Map** | Create a map element |
| **Improve** | Improve the existing design |

## Attachments

### Image Upload

Attach images for AI reference:

1. Click the **📎** attachment button
2. Select an image file
3. AI analyzes the image for context
4. Use in prompts: "Make something like this image"

### Canvas Screenshot

Capture current canvas state:

1. Click the **📷** camera button
2. Choose full canvas or selection
3. Screenshot attaches to your message
4. Reference: "Improve what you see here"

### Supported Formats

- Images: PNG, JPG, GIF, WebP
- Files: Any file type for context
- Screenshots: Automatic PNG capture

## Voice Input

Speak your instructions:

1. Click the **🎤** microphone button
2. Speak your request clearly
3. Speech is transcribed to text
4. Review and send

:::note Browser Support
Voice input requires browser Speech Recognition API support.
:::

## Understanding AI Responses

### Auto-Apply

Simple changes apply automatically:
- Single element modifications
- Property updates
- Small additions

### Manual Apply

Complex changes require confirmation:
- Multiple element creation
- Major canvas changes
- Structural modifications

Click **Apply Changes** to confirm.

### Code Display

Toggle **Show Code** to see:
- JSON structure of changes
- Element properties
- Animation keyframes

Useful for learning and debugging.

## Context Awareness

The AI understands your current context:

| Context | How It's Used |
|---------|---------------|
| **Project Dimensions** | Creates elements that fit |
| **Current Template** | Knows what's on canvas |
| **Selected Elements** | Targets for modifications |
| **Available Layers** | Assigns to correct layer type |
| **Design System** | Uses your brand colors/fonts |
| **Animation Presets** | References available animations |

## Layer Detection

AI automatically determines the correct layer:

| Content Description | Assigned Layer |
|--------------------|----------------|
| Lower third, name strap | `lower-third` |
| Score bug, logo | `bug` |
| Full screen graphic | `fullscreen` |
| News ticker, crawl | `ticker` |
| Alert, breaking news | `alert` |
| Overlay, frame | `overlay` |

## Design System Integration

When configured, AI respects your design system:

- **Colors**: Uses brand color palette
- **Typography**: Applies font pairings
- **Spacing**: Follows grid guidelines
- **Animations**: Uses preferred easing

See [Design Guidelines](/docs/features/design-guidelines) for setup.

## Chat History

### Persistence

- Chat history saves per project
- Resume conversations across sessions
- History loads with project

### Management

- **Clear Chat**: Click trash icon to clear history
- **Confirmation**: Required before clearing
- **New Session**: Each project has separate history

## Example Workflows

### Creating a Lower Third

```
User: "Create a lower third for John Smith who is a
      Senior Producer. Use our brand colors."

AI: Creates group with:
    - Background shape (brand primary color)
    - Name text "John Smith" (brand heading font)
    - Title text "Senior Producer" (brand body font)
    - Assigns to lower-third layer
    - Applies slide-in animation
```

### Modifying Elements

```
User: "Make the background darker and add a
      subtle drop shadow"

AI: Updates selected element:
    - Adjusts background color (darken 20%)
    - Adds shadow: 4px blur, 2px offset
    - Shows before/after comparison
```

### Building Complex Graphics

```
User: "I need an election results graphic showing
      two candidates with percentage bars"

AI: Creates comprehensive layout:
    - Title "Election Results"
    - Candidate 1 with photo placeholder, name, party
    - Candidate 2 with photo placeholder, name, party
    - Animated percentage bars
    - Vote count displays
    - Groups all elements logically
```

## Tips for Better Results

### Be Specific

❌ "Add some text"
✅ "Add a headline that says 'Breaking News' in 48pt bold red text at the top center"

### Reference Context

❌ "Make it look better"
✅ "Improve the selected lower third by making the text more readable and adding a subtle animation"

### Use Design Terms

❌ "Make it pop"
✅ "Increase contrast, add a 2px white stroke, and add a drop shadow"

### Iterate

1. Start with basic request
2. Review AI output
3. Request specific adjustments
4. Refine until satisfied

## Troubleshooting

| Issue | Solution |
|-------|----------|
| AI not understanding | Be more specific, use design terms |
| Wrong layer assigned | Specify layer type in request |
| Changes not applying | Click "Apply Changes" button |
| Voice not working | Check browser permissions |
| Slow response | Check AI configuration settings |

## AI Models

Nova GFX supports multiple AI models. Select your preferred model in the settings:

### Available Models

| Model | Provider | Description |
|-------|----------|-------------|
| **Gemini 2.5 Pro** | Google | Latest multimodal model, excellent for visual tasks |
| **Gemini 2.0 Flash** | Google | Fast responses, good for simple tasks |
| **Claude 3.5 Sonnet** | Anthropic | Excellent reasoning and code generation |
| **Claude 3 Opus** | Anthropic | Most capable Claude model |
| **Claude 3 Haiku** | Anthropic | Fast, cost-effective responses |

### Model Selection

1. Click the **⚙️** settings icon in the chat panel
2. Select your preferred model from the dropdown
3. Model selection persists across sessions

:::tip Model Recommendations
- **Complex graphics**: Use Gemini 2.5 Pro or Claude 3.5 Sonnet
- **Quick edits**: Use Gemini 2.0 Flash or Claude 3 Haiku
- **Image understanding**: Use Gemini models for best image analysis
:::

## AI Image Generation

The AI can generate or source images for your graphics:

### Image Sources

| Type | How It Works |
|------|--------------|
| **AI Generated** | AI generates images using Imagen or similar services |
| **Pexels Stock** | AI searches Pexels for relevant stock photos |
| **Sports Logos** | Pre-integrated database of sports team/league logos |
| **Custom URLs** | Provide your own image URLs |

### Placeholder System

When creating graphics, use these placeholder types:

```
LOGO: Team logo or brand logo
PEXELS: Stock photo from Pexels
GENERATE: AI-generated image
```

Example prompt:
```
"Create a sports graphic with LOGO for the Patriots and a
PEXELS background image of a football stadium"
```

### Image Resolution

AI images are generated at appropriate resolutions for broadcast:
- Full-screen backgrounds: 1920x1080
- Element images: Sized to fit element bounds
- Logos: Preserved aspect ratio with transparency

## Processing Phases

When generating graphics, the AI displays its progress through phases:

| Phase | Icon | Description |
|-------|------|-------------|
| **Thinking** | 🤔 | AI processing your request |
| **Designing** | 🎨 | Creating element structure |
| **Generating** | ⚙️ | Building JSON response |
| **Parsing** | 📝 | Validating and parsing response |
| **Images** | 🖼️ | Fetching or generating images |
| **Applying** | ✓ | Applying changes to canvas |
| **Animating** | 🎬 | Creating animation keyframes |

## Documentation Mode

Access the **Docs** tab in the chat panel for:

- Learning Nova GFX concepts
- Understanding templates, layers, and bindings
- Getting help with specific features
- No changes applied to canvas in this mode

## Related Features

- [AI Configuration](/docs/features/ai-configuration) - Setup and API keys
- [Design Guidelines](/docs/features/design-guidelines) - Brand configuration
- [Elements](/docs/elements/overview) - Available element types

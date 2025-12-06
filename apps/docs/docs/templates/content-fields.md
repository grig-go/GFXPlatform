---
sidebar_position: 4
---

# Content Fields

Content fields allow template content to be edited at playout time without modifying the template design.

## What are Content Fields?

Content fields are editable areas within a template:
- Text content
- Image sources
- Map locations
- Data bindings

## Creating Content Fields

### Text Fields

1. Select text element
2. Enable "Editable" in properties
3. Set a field name (e.g., "playerName")

### Image Fields

1. Select image element
2. Enable "Editable" in properties
3. Set a field name (e.g., "teamLogo")

### Map Fields

1. Select map element
2. Enable "Editable" in properties
3. Users can set location and keyframes

## Field Types

| Type | Input | Example |
|------|-------|---------|
| Text | Text input | Names, titles |
| Textarea | Multi-line | Descriptions |
| Image | Media picker | Photos, logos |
| Map | Location picker | Map coordinates |
| Color | Color picker | Accent colors |
| Number | Numeric input | Scores, stats |

## Using Content Fields

### In Pulsar GFX

1. Select a page
2. Content Editor shows all fields
3. Edit field values
4. Preview updates in real-time

### Via API

```typescript
POST /api/pages/{id}/content
{
  "playerName": "John Smith",
  "teamLogo": "https://..../logo.png"
}
```

## Best Practices

- Use descriptive field names
- Provide placeholder text
- Document expected content formats
- Test with various content lengths

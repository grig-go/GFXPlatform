---
sidebar_position: 8
---

# Auto Follow

Auto Follow allows elements to automatically position themselves relative to another element's bounding box. This is useful for creating dynamic layouts where elements need to maintain consistent spacing regardless of content changes.

## Overview

When Auto Follow is enabled on an element, it will:
1. Track the position and size of a target element
2. Automatically reposition itself based on the target's bounding box
3. Maintain specified padding and offset values

## Enabling Auto Follow

1. Select an element in the canvas
2. Open the **Properties Panel**
3. Scroll to the **Layout** section
4. Find **Auto Follow** and check "Follow another element"

## Configuration Options

### Target Element

Select which element to follow from the dropdown. All other elements in the project are available as targets.

### Follow Side

Choose which side of the target element to position relative to:

| Side | Behavior |
|------|----------|
| **Right** | Position to the right of the target, aligned at top |
| **Left** | Position to the left of the target, aligned at top |
| **Bottom** | Position below the target, aligned at left |
| **Top** | Position above the target, aligned at left |

### Padding

The gap (in pixels) between this element and the target element. This creates consistent spacing between elements.

### Offset

Fine-tune the alignment with offset values:

| When Following | Available Offset |
|----------------|------------------|
| Left or Right | **Vertical Offset** - Adjusts vertical position |
| Top or Bottom | **Horizontal Offset** - Adjusts horizontal position |

## TypeScript Interface

```typescript
{
  autoFollow?: {
    enabled: boolean;           // Enable/disable auto follow
    targetElementId: string;    // ID of element to follow
    side: 'left' | 'right' | 'top' | 'bottom';
    padding: number;            // Gap between elements (px)
    offsetX: number;            // Horizontal offset (top/bottom)
    offsetY: number;            // Vertical offset (left/right)
  };
}
```

## Use Cases

### Lower Third with Dynamic Name

Create a lower third where the title automatically positions to the right of a name that may vary in length:

```
┌─────────────────┐ ┌──────────────┐
│  JOHN SMITH     │ │  CEO         │
└─────────────────┘ └──────────────┘
     Name (dynamic)    Title (follows name)
```

**Setup:**
1. Create the name text element
2. Create the title text element
3. On the title, enable Auto Follow:
   - Target: Name element
   - Side: Right
   - Padding: 20px

### Score Display

Position team logos on either side of a score that changes width:

```
┌─────┐ ┌─────┐ ┌─────┐
│LOGO │ │ 3-2 │ │LOGO │
└─────┘ └─────┘ └─────┘
 Away     Score    Home
```

### Stacked Information

Stack multiple text elements vertically with consistent spacing:

```
┌──────────────────┐
│  BREAKING NEWS   │  ← Main headline
└──────────────────┘
┌──────────────────┐
│  Latest updates  │  ← Follows headline (Bottom)
└──────────────────┘
┌──────────────────┐
│  12:45 PM        │  ← Follows subheadline (Bottom)
└──────────────────┘
```

## Best Practices

### Choose the Right Target

- Select stable elements as targets (elements that won't be deleted)
- Consider the visual hierarchy when choosing targets

### Use Consistent Padding

- Maintain consistent padding values across related elements
- Use your design system's spacing values (8px, 16px, 24px, etc.)

### Combine with Max Size

For text elements that follow other text:
- Enable **Max Size** to prevent the following element from wrapping
- The element will scale to fit while maintaining position

### Animation Considerations

- Auto Follow positions are calculated based on the target's current position
- Animated target elements will be followed in real-time
- Consider timing when animating both target and follower elements

## Limitations

- Circular references are prevented (Element A cannot follow Element B if B follows A)
- The follower element's own position animations are overridden by Auto Follow
- Auto Follow uses the target's base position, not animated position

## Related Features

- [Max Size](/docs/elements/text#max-size-mode) - Scale text to fit
- [Layers](/docs/features/layers) - Organize elements in layers
- [Animation](/docs/animation/overview) - Animate element properties

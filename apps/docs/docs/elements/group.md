---
sidebar_position: 9
---

# Group Element

Group elements are containers that hold multiple child elements, allowing them to be transformed and animated together.

## Creating Groups

### From Selection

1. Select multiple elements (`Shift+Click` or drag select)
2. Press `Ctrl+G` or right-click → "Group"
3. Elements become children of the new group

### Empty Group

1. Click the Group button in toolbar
2. Drag elements into the group
3. Or use the Elements panel to nest

## Group Properties

```typescript
{
  type: 'group',
  children: Element[];    // Child elements
  x: number;              // Group X position
  y: number;              // Group Y position
  width: number;          // Bounding width
  height: number;         // Bounding height
  rotation: number;       // Group rotation
  scale: number;          // Group scale
  opacity: number;        // Group opacity
}
```

## Transform Behavior

### Position

Moving a group moves all children together:

```
Group at (100, 100)
├── Text at (0, 0)     → Screen position: (100, 100)
├── Shape at (50, 20)  → Screen position: (150, 120)
└── Image at (0, 50)   → Screen position: (100, 150)
```

### Rotation

Rotating a group rotates children around the group's anchor point:

```typescript
// Group rotated 45°
// All children rotate together around group center
```

### Scale

Scaling a group scales all children proportionally:

```typescript
// Group scale: 0.5
// All children rendered at 50% size
```

### Opacity

Group opacity multiplies with child opacity:

```typescript
// Group opacity: 0.5
// Child opacity: 0.8
// Final opacity: 0.5 × 0.8 = 0.4
```

## Nested Groups

Groups can contain other groups:

```
Parent Group
├── Child Group A
│   ├── Text
│   └── Shape
└── Child Group B
    ├── Image
    └── Icon
```

Transforms cascade through the hierarchy.

## Animation

### Group Animation

Animate the group to affect all children:

```typescript
// IN animation
// Group slides in from left
{ x: -200, opacity: 0 }
{ x: 100, opacity: 1 }
// All children move together
```

### Individual + Group Animation

Combine group and individual animations:

```typescript
// Group fades in
Group: { opacity: 0 } → { opacity: 1 }

// Child text also slides
Text: { y: 20 } → { y: 0 }

// Result: Text fades AND slides
```

### Staggered Children

Animate children with delays:

```typescript
// Group animation
Group: { opacity: 1 }

// Child 1: delay 0ms
Text1: { x: -50 } → { x: 0 }

// Child 2: delay 100ms
Text2: { x: -50 } → { x: 0 }

// Child 3: delay 200ms
Text3: { x: -50 } → { x: 0 }
```

## Common Use Cases

### Lower Third

```
Lower Third Group
├── Background Shape
├── Name Text
├── Title Text
└── Accent Line
```

All elements animate in/out together.

### Score Bug

```
Score Bug Group
├── Background
├── Home Team Group
│   ├── Logo
│   ├── Name
│   └── Score
└── Away Team Group
    ├── Logo
    ├── Name
    └── Score
```

### Info Card

```
Info Card Group
├── Card Background
├── Avatar Image
├── Name Text
├── Details Text
└── Social Icons Group
    ├── Twitter Icon
    ├── Instagram Icon
    └── YouTube Icon
```

## Managing Groups

### Ungrouping

1. Select the group
2. Press `Ctrl+Shift+G` or right-click → "Ungroup"
3. Children become independent elements

### Adding to Group

- Drag elements onto group in Elements panel
- Or drag from canvas into group

### Removing from Group

- Drag element out of group in Elements panel
- Or cut (`Ctrl+X`) and paste (`Ctrl+V`) outside

### Editing Children

1. Double-click group to enter edit mode
2. Select and modify individual children
3. Click outside or press `Escape` to exit

## Group Bounds

### Auto-sizing

Group bounds automatically fit children:
- Width = rightmost child edge - leftmost child edge
- Height = bottom child edge - top child edge

### Fixed Size

Optionally set fixed dimensions:
- Enable "Fixed Size" in properties
- Set explicit width/height
- Children can extend beyond bounds

### Clipping

Enable clipping to hide overflow:

```typescript
{
  clip: true  // Children clipped to group bounds
}
```

## Best Practices

### Organization
- Group related elements together
- Use descriptive group names
- Keep hierarchy depth reasonable (2-3 levels)

### Performance
- Avoid deeply nested groups
- Ungroup when no longer needed
- Use groups purposefully

### Animation
- Prefer group animation for coordinated movement
- Use individual animations for staggered effects
- Test performance with complex groups

### Editing
- Lock groups when positioning is final
- Use double-click to edit children
- Maintain consistent internal positioning

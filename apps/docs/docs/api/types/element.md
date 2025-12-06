---
sidebar_position: 1
---

# Element Types

TypeScript type definitions for elements.

## Element Interface

```typescript
interface Element {
  id: string;
  template_id: string;
  element_type: ElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  sort_order: number;
  content: ElementContent;
  style?: ElementStyle;
  created_at: string;
  updated_at: string;
}
```

## Element Types

```typescript
type ElementType = 
  | 'text'
  | 'image'
  | 'shape'
  | 'map'
  | 'chart'
  | 'ticker'
  | 'icon'
  | 'group';
```

## Content Types

See individual element documentation for content type definitions.

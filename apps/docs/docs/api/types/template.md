---
sidebar_position: 2
---

# Template Types

TypeScript type definitions for templates.

## Template Interface

```typescript
interface Template {
  id: string;
  project_id: string;
  layer_id: string;
  name: string;
  slug: string;
  width: number;
  height: number;
  background_color: string;
  in_duration: number;
  out_duration: number;
  loop_duration: number;
  enabled: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
}
```

## Template Settings

```typescript
interface TemplateSettings {
  defaultInDuration: number;
  defaultOutDuration: number;
  defaultEasing: string;
}
```

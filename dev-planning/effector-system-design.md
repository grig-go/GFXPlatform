# Effector System Design

Effectors are first-class objects that attach to groups, controlling child elements with animatable properties.

## Effector Categories

### Transform Effectors
- **Align/Distribute** – snap elements to grid, center, space evenly (like Figma's auto-layout)
- **Stack** – vertical/horizontal stacking with gap control
- **Radial** – arrange elements in circular patterns with radius/angle controls
- **Grid** – force elements into rows/columns
- **Random Transform** – add controlled randomness to position, rotation, scale (C4D MoGraph style)

### Color Effectors
- **Gradient Map** – map colors across group based on index or position
- **Contrast Enforcer** – ensure WCAG/broadcast-safe contrast ratios
- **Theme Propagator** – cascade brand colors through hierarchy

### Data-Driven Effectors
- **Value Mapper** – scale element properties based on data values (bar chart style)
- **Conditional Visibility** – show/hide based on data conditions
- **Sort/Filter** – reorder elements based on data

### Animation Effectors (Phase 2)
- **Delay/Stagger** – offset animation timing across group
- **Falloff** – apply effect based on distance from point/line/plane
- **Step** – quantize animations to create rhythmic movement
- **Inheritance** – child elements follow parent with delay/dampening

---

## UX Flow

### Outline Panel

Effectors appear in the hierarchy with an `[E]` prefix, showing what controls each group:

```
├── Lower Third (Group)
│   ├── [E] Stack (vertical, gap: 12)
│   ├── [E] Safe Area (action-safe)
│   ├── Name (Text)
│   └── Title (Text)
```

Effectors can be reordered (evaluation order matters), toggled, or deleted like any other item.

### Properties Panel

When an effector is selected, its settings appear in the properties panel:

```
Stack Effector
─────────────────
Direction    [Vertical ▾]
Gap          [12] px
Alignment    [Start ▾] [Center ▾]
             (main)     (cross)
Distribute   [ ] Equal spacing
```

All numeric properties become keyframeable in the timeline (phase 2).

### Adding Effectors

A `+` button on groups in the outline, or a dedicated "Effectors" section in properties panel:

```
Effectors
─────────────────
[E] Stack          [👁] [🗑]
[E] Safe Area      [👁] [🗑]

[+ Add Effector ▾]
  ├── Transform
  │   ├── Stack
  │   ├── Grid
  │   ├── Radial
  │   └── Random
  ├── Color
  │   ├── Gradient Map
  │   └── Contrast Enforcer
  └── Data
      ├── Value Mapper
      └── Conditional Visibility
```

---

## Data Model

```typescript
interface Effector {
  id: string;
  type: EffectorType;
  enabled: boolean;
  order: number; // evaluation priority within group
  config: EffectorConfig; // type-specific settings
}

interface GroupElement extends BaseElement {
  children: string[]; // element IDs
  effectors: Effector[];
}
```

### Effector Configs

```typescript
interface StackEffectorConfig {
  direction: 'horizontal' | 'vertical';
  gap: number;
  mainAlign: 'start' | 'center' | 'end' | 'space-between';
  crossAlign: 'start' | 'center' | 'end' | 'stretch';
}

interface RadialEffectorConfig {
  radius: number;
  startAngle: number;
  endAngle: number;
  alignToPath: boolean;
}

interface GridEffectorConfig {
  columns: number;
  rows: number | 'auto';
  gapX: number;
  gapY: number;
  cellWidth: number | 'auto';
  cellHeight: number | 'auto';
}

interface RandomTransformConfig {
  seed: number;
  positionX: { min: number; max: number };
  positionY: { min: number; max: number };
  rotation: { min: number; max: number };
  scale: { min: number; max: number };
}

interface GradientMapEffectorConfig {
  property: 'fill' | 'stroke' | 'background';
  colors: string[]; // color stops
  distribution: 'index' | 'position-x' | 'position-y';
}

interface ContrastEnforcerConfig {
  standard: 'wcag-aa' | 'wcag-aaa' | 'broadcast';
  backgroundRef: string | null; // element ID or null for auto-detect
  adjustMethod: 'lighten' | 'darken' | 'auto';
}

interface ValueMapperConfig {
  dataField: string;
  targetProperty: 'scale' | 'height' | 'width' | 'opacity';
  inputRange: [number, number];
  outputRange: [number, number];
  clamp: boolean;
}

interface ConditionalVisibilityConfig {
  dataField: string;
  operator: 'equals' | 'not-equals' | 'greater' | 'less' | 'contains';
  value: string | number | boolean;
  invert: boolean;
}
```

---

## Effector Evaluation Pipeline

```typescript
function applyEffectors(group: GroupElement, elements: Element[]): ComputedStyles[] {
  let computed = elements.map(el => getBaseStyles(el));
  
  // Sort by order, filter disabled
  const activeEffectors = group.effectors
    .filter(e => e.enabled)
    .sort((a, b) => a.order - b.order);
  
  // Chain effectors - output of one feeds into next
  for (const effector of activeEffectors) {
    computed = effectorRegistry[effector.type].apply(computed, effector.config, group);
  }
  
  return computed;
}
```

---

## Conflict Resolution

Some effectors conflict (Stack vs Grid vs Radial all control position).

**Phase 1 approach: Type exclusivity**
- Only one transform effector per group
- Multiple color/data effectors can stack
- Simpler to reason about

**Future options:**
- Last wins – simple, predictable
- Explicit layering – transforms compose, let user manage

---

## Performance Considerations

- **Batch updates** – collect all effector calculations, apply in single render pass
- **Dirty flagging** – only recalculate when inputs change, cache results
- **Spatial indexing** – for collision/proximity effectors, use quadtree or grid-based lookups
- **GPU offload** – transform effectors can often be pure CSS (compositor thread)
- **Priority tiers** – critical effectors (safe area) run every frame, others can throttle
- **Lazy evaluation** – defer expensive calculations until element is visible

---
sidebar_position: 4
---

# Content Types

TypeScript type definitions for element content.

## Text Content

```typescript
interface TextContent {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fill: string;
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
}
```

## Image Content

```typescript
interface ImageContent {
  type: 'image';
  src: string;
  objectFit: 'contain' | 'cover' | 'fill';
  objectPosition: string;
}
```

## Map Content

```typescript
interface MapContent {
  type: 'map';
  center: [number, number];  // [lng, lat]
  zoom: number;
  pitch: number;
  bearing: number;
  mapStyle: MapStyle;
  projection: MapProjection;
  locationKeyframes?: MapLocationKeyframe[];
}
```

## Chart Content

```typescript
interface ChartContent {
  type: 'chart';
  chartType: 'bar' | 'line' | 'pie' | 'doughnut';
  data: ChartData;
  options: ChartOptions;
}
```

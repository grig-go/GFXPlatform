/**
 * Element Documentation Index
 *
 * Each element type has its own documentation file that can be
 * dynamically included based on user intent.
 */

import { SHAPE_ELEMENT_DOCS } from './shape';
import { TEXT_ELEMENT_DOCS } from './text';
import { IMAGE_ELEMENT_DOCS } from './image';
import { ICON_ELEMENT_DOCS } from './icon';
import { CHART_ELEMENT_DOCS } from './chart';
import { TABLE_ELEMENT_DOCS } from './table';
import { MAP_ELEMENT_DOCS } from './map';
import { VIDEO_ELEMENT_DOCS } from './video';
import { TICKER_ELEMENT_DOCS } from './ticker';
import { COUNTDOWN_ELEMENT_DOCS } from './countdown';
import { LINE_ELEMENT_DOCS } from './line';

const ELEMENT_DOCS: Record<string, string> = {
  shape: SHAPE_ELEMENT_DOCS,
  text: TEXT_ELEMENT_DOCS,
  image: IMAGE_ELEMENT_DOCS,
  icon: ICON_ELEMENT_DOCS,
  chart: CHART_ELEMENT_DOCS,
  'd3-chart': CHART_ELEMENT_DOCS, // Alias
  table: TABLE_ELEMENT_DOCS,
  map: MAP_ELEMENT_DOCS,
  video: VIDEO_ELEMENT_DOCS,
  ticker: TICKER_ELEMENT_DOCS,
  countdown: COUNTDOWN_ELEMENT_DOCS,
  line: LINE_ELEMENT_DOCS,
};

/**
 * Get documentation for a specific element type
 */
export function getElementDocs(elementType: string): string | null {
  return ELEMENT_DOCS[elementType] || null;
}

/**
 * Get all available element types
 */
export function getAvailableElementTypes(): string[] {
  return Object.keys(ELEMENT_DOCS);
}

/**
 * Get a quick reference of all element types (for core prompt)
 */
export function getElementTypeSummary(): string {
  return `## Available Element Types

### USE THESE ELEMENTS (default choices):
| Type | Use For |
|------|---------|
| text | ALL text: labels, titles, names, scores, stats, records, numbers, headlines |
| shape | Backgrounds, containers, cards (supports gradients, glass, textures). Shapes: rectangle, ellipse, rhombus, trapezoid, parallelogram. Use ellipse+texture for circular image frames! |
| image | Photos, logos, graphics |
| icon | Icons from Lucide, FontAwesome, Weather, Lottie |
| line | Lines, dividers, arrows |

## ⛔ RESTRICTED ELEMENTS - NEVER USE UNLESS USER SAYS THE EXACT WORD:

| Element | ONLY use if user literally says... |
|---------|-----------------------------------|
| table | "table" (NOT "stats", NOT "data", NOT "standings" - those use TEXT!) |
| chart | "chart" or "graph" |
| map | "map" |
| video | "video" |
| ticker | "ticker" or "crawl" |
| countdown | "countdown" or "timer" |

## ⚠️ CRITICAL: How to display stats/data WITHOUT tables:

For "stats", "statistics", "player stats", "game stats", "standings", "leaderboard", "records":
→ Use MULTIPLE TEXT ELEMENTS arranged in rows/columns
→ Use SHAPE elements as backgrounds for each row
→ NEVER use the table element!

Example for "show player stats":
\`\`\`
shape (background) + text "Points: 25" + text "Rebounds: 10" + text "Assists: 8"
\`\`\`

NOT:
\`\`\`
table element (WRONG!)
\`\`\``;
}

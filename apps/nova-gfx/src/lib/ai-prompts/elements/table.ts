/**
 * Table Element Documentation
 * Updated: 2024-12
 */

export const TABLE_ELEMENT_DOCS = `### Table Element

Data tables for standings, statistics, leaderboards, and grids.

#### Basic Table:
\`\`\`json
{
  "element_type": "table",
  "name": "Standings",
  "position_x": 100,
  "position_y": 100,
  "width": 600,
  "height": 400,
  "content": {
    "type": "table",
    "columns": [
      { "id": "rank", "header": "#", "accessorKey": "rank", "width": 50, "align": "center" },
      { "id": "team", "header": "Team", "accessorKey": "team", "width": 200, "align": "left" },
      { "id": "wins", "header": "W", "accessorKey": "wins", "width": 60, "align": "center", "format": "number" },
      { "id": "losses", "header": "L", "accessorKey": "losses", "width": 60, "align": "center", "format": "number" },
      { "id": "pct", "header": "PCT", "accessorKey": "pct", "width": 80, "align": "center", "format": "percentage" }
    ],
    "data": [
      { "id": "1", "rank": 1, "team": "Team Alpha", "wins": 15, "losses": 3, "pct": 0.833 },
      { "id": "2", "rank": 2, "team": "Team Beta", "wins": 12, "losses": 6, "pct": 0.667 },
      { "id": "3", "rank": 3, "team": "Team Gamma", "wins": 10, "losses": 8, "pct": 0.556 }
    ],
    "showHeader": true,
    "striped": true,
    "bordered": false
  }
}
\`\`\`

#### Column Configuration:
\`\`\`json
{
  "id": "col1",
  "header": "Column Title",
  "accessorKey": "dataKey",
  "width": 100,
  "align": "left",           // "left" | "center" | "right"
  "format": "text"           // "text" | "number" | "currency" | "percentage" | "date"
}
\`\`\`

#### Table Styling:
\`\`\`json
{
  "content": {
    "type": "table",
    "columns": [...],
    "data": [...],
    "showHeader": true,
    "striped": true,
    "bordered": false,
    "compact": false,
    "headerBackgroundColor": "#1E3A5F",
    "headerTextColor": "#FFFFFF",
    "rowBackgroundColor": "transparent",
    "rowTextColor": "#FFFFFF",
    "stripedRowBackgroundColor": "rgba(255, 255, 255, 0.05)",
    "borderColor": "rgba(255, 255, 255, 0.1)",
    "solidBackgroundColor": "rgba(0, 0, 0, 0.5)"
  }
}
\`\`\`

#### Border Options:
\`\`\`json
{
  "showRowBorders": true,
  "showColumnBorders": false,
  "showOuterBorder": true
}
\`\`\`

#### Format Types:
| Format | Example Output |
|--------|---------------|
| text | "Hello World" |
| number | "1,234" |
| currency | "$1,234.00" |
| percentage | "83.3%" |
| date | "Dec 10, 2024" |`;

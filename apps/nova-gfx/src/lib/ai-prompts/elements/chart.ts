/**
 * Chart Element Documentation
 * Updated: 2024-12
 */

export const CHART_ELEMENT_DOCS = `### Chart Element

Data visualization with bar, line, pie, donut, gauge, area, and horizontal bar charts.

**Note**: Use \`element_type: "chart"\` (or "d3-chart")

#### Bar Chart:
\`\`\`json
{
  "element_type": "chart",
  "name": "Stats Chart",
  "position_x": 100,
  "position_y": 100,
  "width": 600,
  "height": 400,
  "content": {
    "type": "chart",
    "chartType": "bar",
    "data": {
      "labels": ["Team A", "Team B", "Team C"],
      "datasets": [{
        "label": "Points",
        "data": [85, 72, 68]
      }]
    },
    "options": {
      "showLegend": true,
      "legendPosition": "bottom",
      "animated": true,
      "colors": ["#3B82F6", "#EF4444", "#22C55E"],
      "barBorderRadius": 4,
      "fontFamily": "Inter"
    }
  }
}
\`\`\`

#### Chart Types:
| Type | Use For |
|------|---------|
| bar | Comparison of values |
| horizontal-bar | Long labels, rankings |
| line | Trends over time |
| area | Trends with emphasis |
| pie | Parts of a whole |
| donut | Parts with center info |
| gauge | Single value 0-100 |

#### Pie/Donut Chart:
\`\`\`json
{
  "content": {
    "type": "chart",
    "chartType": "donut",
    "data": {
      "labels": ["Won", "Lost", "Draw"],
      "datasets": [{
        "data": [15, 8, 2]
      }]
    },
    "options": {
      "colors": ["#22C55E", "#EF4444", "#94A3B8"],
      "donutCutout": 60,
      "showLabels": true
    }
  }
}
\`\`\`

#### Gauge Chart:
\`\`\`json
{
  "content": {
    "type": "chart",
    "chartType": "gauge",
    "data": { "labels": [], "datasets": [] },
    "options": {
      "gaugeValue": 75,
      "gaugeMax": 100,
      "colors": ["#22C55E"],
      "showValues": true
    }
  }
}
\`\`\`

#### Line Chart:
\`\`\`json
{
  "content": {
    "type": "chart",
    "chartType": "line",
    "data": {
      "labels": ["Q1", "Q2", "Q3", "Q4"],
      "datasets": [{
        "label": "Revenue",
        "data": [100, 150, 180, 220]
      }]
    },
    "options": {
      "lineWidth": 3,
      "lineTension": 0.4,
      "pointRadius": 4,
      "showGrid": true
    }
  }
}
\`\`\`

#### Chart Options:
- **Display**: showLegend, legendPosition, showLabels, showValues, animated
- **Colors**: colors (array), barColors, datasetColors
- **Typography**: fontFamily, titleFontSize, labelFontSize, valueFontSize
- **Axes**: showXAxis, showYAxis, showGrid, gridColor, axisLineColor
- **Bar**: barBorderWidth, barBorderRadius, barSpacing
- **Line**: lineWidth, lineTension, pointRadius
- **Pie/Donut**: donutCutout (0-100)
- **Area**: areaOpacity

#### Animatable Properties:
Charts support keyframe animation for:
- \`chartData_0\`, \`chartData_1\`, etc. (individual data points)
- \`chartColor_0\`, \`chartColor_1\`, etc.
- \`gaugeValue\`, \`gaugeMax\`
- \`chartProgress\` (progressive reveal)`;

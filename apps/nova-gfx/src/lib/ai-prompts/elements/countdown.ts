/**
 * Countdown Element Documentation
 * Updated: 2024-12
 */

export const COUNTDOWN_ELEMENT_DOCS = `### Countdown Element

Timers, clocks, and countdowns for events, broadcasts, and live shows.

#### Duration Countdown:
\`\`\`json
{
  "element_type": "countdown",
  "name": "Game Timer",
  "position_x": 100,
  "position_y": 50,
  "width": 200,
  "height": 80,
  "content": {
    "type": "countdown",
    "mode": "duration",
    "durationSeconds": 900,           // 15 minutes
    "showDays": false,
    "showHours": false,
    "showMinutes": true,
    "showSeconds": true,
    "showLabels": true,
    "padZeros": true,
    "separator": ":",
    "onComplete": "stop"              // "stop" | "loop" | "hide"
  }
}
\`\`\`

#### Datetime Countdown:
\`\`\`json
{
  "content": {
    "type": "countdown",
    "mode": "datetime",
    "targetDatetime": "2024-12-31T23:59:59",
    "showDays": true,
    "showHours": true,
    "showMinutes": true,
    "showSeconds": true,
    "showLabels": true,
    "onComplete": "stop"
  }
}
\`\`\`

#### Clock Mode:
\`\`\`json
{
  "content": {
    "type": "countdown",
    "mode": "clock",
    "clockFormat": "12h",             // "12h" | "24h"
    "timezone": "America/New_York",   // Optional timezone
    "showDate": true,
    "showSeconds": true
  }
}
\`\`\`

#### Countdown Modes:
| Mode | Description |
|------|-------------|
| duration | Count down from specified seconds |
| datetime | Count down to specific date/time |
| clock | Display current time |

#### Display Options:
| Option | Type | Description |
|--------|------|-------------|
| showDays | boolean | Show days unit |
| showHours | boolean | Show hours unit |
| showMinutes | boolean | Show minutes unit |
| showSeconds | boolean | Show seconds unit |
| showMilliseconds | boolean | Show milliseconds |
| showLabels | boolean | Show unit labels (d, h, m, s) |
| showDate | boolean | Show date (clock mode) |
| padZeros | boolean | Zero-pad numbers (01:05 vs 1:5) |
| separator | string | Separator between units |

#### On Complete Actions:
| Action | Description |
|--------|-------------|
| stop | Stop at 00:00:00 |
| loop | Restart from beginning |
| hide | Hide the element |`;

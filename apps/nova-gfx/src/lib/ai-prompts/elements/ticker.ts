/**
 * Ticker Element Documentation
 * Updated: 2024-12
 */

export const TICKER_ELEMENT_DOCS = `### Ticker Element

Scrolling text tickers for news crawls, sports updates, and information displays.

#### Basic Ticker:
\`\`\`json
{
  "element_type": "ticker",
  "name": "News Ticker",
  "position_x": 0,
  "position_y": 1020,
  "width": 1920,
  "height": 60,
  "content": {
    "type": "ticker",
    "items": [
      { "id": "1", "content": "Breaking: First headline goes here" },
      { "id": "2", "content": "Sports: Team wins championship" },
      { "id": "3", "content": "Weather: Sunny with highs in the 70s" }
    ],
    "config": {
      "mode": "scroll",
      "direction": "left",
      "speed": 50,
      "gap": 60
    }
  }
}
\`\`\`

#### Ticker Modes:
| Mode | Description |
|------|-------------|
| scroll | Continuous scroll (classic news ticker) |
| flip | Flip animation between items |
| fade | Fade between items |
| slide | Slide between items |

#### Ticker Item Properties:
\`\`\`json
{
  "id": "unique-id",
  "content": "The text content",
  "topic": "news",                    // Topic type for styling
  "customTopicStyle": {...},          // Custom topic badge style
  "icon": "iconName",                 // Optional icon
  "label": "BREAKING",                // Optional label
  "value": 123.45,                    // For stock tickers
  "color": "#FFFFFF",
  "backgroundColor": "#EF4444",
  "change": "up",                     // "up" | "down" | "neutral"
  "changeValue": "+2.5%"
}
\`\`\`

#### Topic Types:
news, breaking, sports, finance, weather, entertainment, politics, tech, health, world, local, alert, live, custom

#### Ticker Config:
\`\`\`json
{
  "config": {
    "mode": "scroll",
    "direction": "left",        // "left" | "right" | "up" | "down"
    "speed": 50,                // Pixels per second (scroll mode)
    "delay": 3000,              // Ms between items (flip/fade/slide)
    "gap": 60,                  // Space between items (scroll mode)
    "pauseOnHover": true,
    "loop": true,
    "gradient": true,           // Fade edges
    "gradientWidth": 50,
    "gradientColor": "#000000"
  }
}
\`\`\`

#### Stock Ticker Example:
\`\`\`json
{
  "content": {
    "type": "ticker",
    "items": [
      { "id": "1", "label": "AAPL", "value": 178.52, "change": "up", "changeValue": "+1.2%" },
      { "id": "2", "label": "GOOGL", "value": 141.80, "change": "down", "changeValue": "-0.8%" },
      { "id": "3", "label": "MSFT", "value": 378.91, "change": "up", "changeValue": "+0.5%" }
    ],
    "config": {
      "mode": "scroll",
      "direction": "left",
      "speed": 40,
      "gap": 80
    }
  }
}
\`\`\``;

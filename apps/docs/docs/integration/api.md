---
sidebar_position: 3
---

# API Integration

Integrate Nova GFX with external systems via REST API.

## API Overview

Nova GFX provides REST APIs for:
- Template management
- Content updates
- Animation control
- Real-time data

## Authentication

API requests require authentication:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-nova-instance/api/...
```

Get your API key from Project Settings.

## Common Operations

### Update Content

```bash
POST /api/pages/{pageId}/content
Content-Type: application/json

{
  "playerName": "John Smith",
  "score": "3"
}
```

### Trigger Animation

```bash
# Play IN animation
POST /api/preview/playIn

# Play OUT animation
POST /api/preview/playOut

# Reset to initial state
POST /api/preview/reset
```

### Get Template Info

```bash
GET /api/templates/{templateId}
```

## WebSocket Real-time Updates

For real-time data updates:

```javascript
const ws = new WebSocket('ws://localhost:5173/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    templateId: 'template-123'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Update:', data);
};
```

## Integration Examples

### Sports Data

```javascript
// Update score from sports API
async function updateScore(homeScore, awayScore) {
  await fetch('/api/pages/score-bug/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      homeScore: String(homeScore),
      awayScore: String(awayScore)
    })
  });
}
```

### Social Media Integration

```javascript
// Display latest tweet
async function showTweet(tweet) {
  await fetch('/api/pages/social-card/content', {
    method: 'POST',
    body: JSON.stringify({
      username: tweet.user.name,
      text: tweet.text,
      avatar: tweet.user.profile_image
    })
  });

  // Trigger IN animation
  await fetch('/api/preview/playIn', { method: 'POST' });
}
```

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Content updates | 10/second |
| Animation triggers | 5/second |
| Data queries | 30/second |

## Error Handling

```javascript
try {
  const response = await fetch('/api/...');
  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error.message);
  }
} catch (err) {
  console.error('Network error:', err);
}
```

See [API Reference](/docs/api/overview) for complete documentation.

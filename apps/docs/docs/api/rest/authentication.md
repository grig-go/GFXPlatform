---
sidebar_position: 1
---

# Authentication

API authentication using API keys.

## Getting an API Key

1. Open Project Settings
2. Navigate to API section
3. Click "Generate API Key"
4. Copy and store securely

## Using the API Key

Include in request headers:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.example.com/api/templates
```

## Key Permissions

| Permission | Access |
|------------|--------|
| Read | View data |
| Write | Modify data |
| Admin | Full access |

## Security

- Never expose keys in client-side code
- Rotate keys periodically
- Use environment variables

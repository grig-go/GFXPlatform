---
sidebar_position: 1
---

# API Overview

Nova GFX provides REST APIs for programmatic control and integration.

## Base URL

Development:
```
http://localhost:5173/api
```

Production:
```
https://your-domain.com/api
```

## Authentication

Include API key in request headers:

```bash
Authorization: Bearer YOUR_API_KEY
```

Get your API key from **Project Settings → API**.

## Response Format

All responses are JSON:

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

## Available Endpoints

### Projects
- `GET /api/projects` - List projects
- `GET /api/projects/{id}` - Get project details

### Templates
- `GET /api/templates` - List templates
- `GET /api/templates/{id}` - Get template details
- `POST /api/templates` - Create template
- `PUT /api/templates/{id}` - Update template

### Elements
- `GET /api/elements` - List elements
- `GET /api/elements/{id}` - Get element details
- `POST /api/elements` - Create element
- `PUT /api/elements/{id}` - Update element

### Pages
- `GET /api/pages` - List pages
- `POST /api/pages` - Create page
- `PUT /api/pages/{id}/content` - Update page content

### Preview Control
- `POST /api/preview/playIn` - Play IN animation
- `POST /api/preview/playOut` - Play OUT animation
- `POST /api/preview/reset` - Reset preview

## Rate Limiting

| Tier | Requests/minute |
|------|-----------------|
| Free | 60 |
| Pro | 300 |
| Enterprise | Unlimited |

## SDKs

Official SDKs (coming soon):
- JavaScript/TypeScript
- Python
- Go

## Next Steps

- [Authentication](/docs/api/rest/authentication)
- [Projects API](/docs/api/rest/projects)
- [Templates API](/docs/api/rest/templates)

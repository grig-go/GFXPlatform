---
sidebar_position: 2
---

# Projects API

Manage Nova GFX projects.

## List Projects

```http
GET /api/projects
```

Response:
```json
{
  "data": [
    {
      "id": "proj_123",
      "name": "My Project",
      "canvas_width": 1920,
      "canvas_height": 1080
    }
  ]
}
```

## Get Project

```http
GET /api/projects/{id}
```

## Create Project

```http
POST /api/projects
Content-Type: application/json

{
  "name": "New Project",
  "canvas_width": 1920,
  "canvas_height": 1080
}
```

## Update Project

```http
PUT /api/projects/{id}
Content-Type: application/json

{
  "name": "Updated Name"
}
```

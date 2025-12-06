---
sidebar_position: 3
---

# Templates API

Manage graphic templates.

## List Templates

```http
GET /api/templates?project_id={projectId}
```

## Get Template

```http
GET /api/templates/{id}
```

## Create Template

```http
POST /api/templates
Content-Type: application/json

{
  "project_id": "proj_123",
  "name": "Lower Third",
  "layer_id": "layer_1",
  "width": 1920,
  "height": 1080
}
```

## Update Template

```http
PUT /api/templates/{id}
Content-Type: application/json

{
  "name": "Updated Template Name"
}
```

## Delete Template

```http
DELETE /api/templates/{id}
```

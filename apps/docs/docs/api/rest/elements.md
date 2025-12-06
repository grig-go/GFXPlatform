---
sidebar_position: 4
---

# Elements API

Manage template elements.

## List Elements

```http
GET /api/elements?template_id={templateId}
```

## Get Element

```http
GET /api/elements/{id}
```

## Create Element

```http
POST /api/elements
Content-Type: application/json

{
  "template_id": "tmpl_123",
  "element_type": "text",
  "name": "Player Name",
  "x": 100,
  "y": 850,
  "width": 400,
  "height": 50,
  "content": {
    "type": "text",
    "text": "Player Name"
  }
}
```

## Update Element

```http
PUT /api/elements/{id}
Content-Type: application/json

{
  "x": 150,
  "content": {
    "text": "New Text"
  }
}
```

## Delete Element

```http
DELETE /api/elements/{id}
```

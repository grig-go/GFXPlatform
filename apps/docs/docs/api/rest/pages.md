---
sidebar_position: 5
---

# Pages API

Manage playout pages.

## List Pages

```http
GET /api/pages?playlist_id={playlistId}
```

## Get Page

```http
GET /api/pages/{id}
```

## Create Page

```http
POST /api/pages
Content-Type: application/json

{
  "playlist_id": "pl_123",
  "template_id": "tmpl_123",
  "name": "Player Introduction",
  "payload": {
    "playerName": "John Smith",
    "position": "Forward"
  }
}
```

## Update Page Content

```http
PUT /api/pages/{id}/content
Content-Type: application/json

{
  "playerName": "Jane Doe",
  "position": "Guard"
}
```

## Delete Page

```http
DELETE /api/pages/{id}
```

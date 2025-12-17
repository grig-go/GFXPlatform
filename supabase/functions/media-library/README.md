# Media Library Edge Function

A standalone Supabase Edge Function for managing media assets, file uploads, and distribution tracking.

## Endpoint

```
https://{project-id}.supabase.co/functions/v1/media-library
```

## Database Tables

This function connects to the following Supabase tables:
- `media_assets` - Main media storage table
- `systems` - Distribution systems (Pixera, Disguise, etc.)
- `media_distribution` - Junction table tracking which media is on which systems

## Supabase Storage

Files are stored in a private bucket: `make-8a536fc1-media`

The bucket is automatically created on first upload if it doesn't exist.

## API Endpoints

### GET - Fetch Media Assets

Retrieve media assets with pagination and filters.

**Query Parameters:**
- `limit` (number, default: 24) - Number of items per page
- `offset` (number, default: 0) - Pagination offset
- `type` (string) - Filter by media type: `image`, `video`, `audio`, `3d`
- `source` (string) - Filter by source (searches in `created_by` field)
- `model` (string) - Filter by AI model used
- `status` (string) - Filter by sync status: `synced`, `pending`, `error`
- `search` (string) - Text search across name, tags, and description

**Example Request:**
```bash
curl "https://{project-id}.supabase.co/functions/v1/media-library?limit=24&offset=0&type=image&model=Midjourney"
```

**Example Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "athlete_portrait_001.jpg",
      "file_url": "https://.../signedUrl",
      "thumbnail_url": "https://.../thumbs/signedUrl",
      "media_type": "image",
      "created_by": "ai:Pulsar",
      "ai_model_used": "Midjourney v6",
      "tags": ["athlete", "portrait", "sports"],
      "created_at": "2025-10-25T07:20:00Z",
      "size": 1234567,
      "distribution": [
        {
          "system_name": "Sports Production A",
          "system_type": "Pixera",
          "path": "/mnt/sports/portraits/athlete_portrait_001.jpg",
          "status": "synced",
          "last_sync": "2025-10-27T03:30:00Z"
        }
      ]
    }
  ],
  "count": 8
}
```

### POST - Upload or Update Media

Upload a new file or update existing media metadata.

**Form Data Fields:**
- `file` (File, optional) - The file to upload
- `id` (string, optional) - If provided, updates existing asset
- `name` (string) - Display name for the asset
- `description` (string, optional) - Asset description
- `tags` (JSON string, optional) - Array of tags
- `media_type` (string) - Type: `image`, `video`, `audio`, `3d`
- `created_by` (string) - Creator identifier (e.g., "user@emergent.tv" or "ai:Pulsar")
- `ai_model_used` (string, optional) - AI model name if AI-generated
- `file_url` (string, optional) - External file URL (if not uploading file)
- `thumbnail_url` (string, optional) - Thumbnail URL

**Example Upload:**
```javascript
const formData = new FormData();
formData.append("file", fileBlob);
formData.append("name", "My Image");
formData.append("description", "A beautiful landscape");
formData.append("tags", JSON.stringify(["nature", "landscape"]));
formData.append("media_type", "image");
formData.append("created_by", "user@emergent.tv");

const response = await fetch(
  "https://{project-id}.supabase.co/functions/v1/media-library",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: formData,
  }
);
```

**Example Update:**
```javascript
const formData = new FormData();
formData.append("id", "existing-asset-id");
formData.append("name", "Updated Name");
formData.append("description", "Updated description");

const response = await fetch(
  "https://{project-id}.supabase.co/functions/v1/media-library",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: formData,
  }
);
```

### DELETE - Delete Media Asset

Delete a media asset and its associated file from storage.

**Example Request:**
```bash
curl -X DELETE "https://{project-id}.supabase.co/functions/v1/media-library/{asset-id}" \
  -H "Authorization: Bearer {SUPABASE_ANON_KEY}"
```

**Example Response:**
```json
{
  "success": true
}
```

## Frontend Integration

Use the `useMediaData()` hook from `/utils/useMediaData.ts`:

```typescript
import { useMediaData } from "../utils/useMediaData";

function MyComponent() {
  const { 
    assets,      // MediaAsset[]
    loading,     // boolean
    error,       // string | null
    count,       // number
    refresh,     // () => Promise<void>
    uploadAsset, // (formData: FormData) => Promise<{success, data?, error?}>
    updateAsset, // (id, data) => Promise<{success, data?, error?}>
    deleteAsset, // (id) => Promise<{success, error?}>
  } = useMediaData({
    limit: 24,
    offset: 0,
    type: "image",
    search: "sports",
  });

  // Use the data...
}
```

## File Storage

- **Bucket:** `make-8a536fc1-media` (private)
- **Path Structure:** `{media_type}/{timestamp}_{filename}`
- **URL Type:** Signed URLs with 1 year expiry
- **Security:** Private bucket, accessible only via signed URLs

## Notes

- The bucket is automatically created on first upload
- All files use signed URLs for security
- Files are organized by media type (image, video, audio, 3d)
- Storage paths are saved in the `storage_path` field
- Failed storage deletions won't prevent database deletion

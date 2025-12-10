# Project Textures Implementation Plan

## Overview
Add a "Textures" tab to the MediaPickerDialog in Nova GFX that allows users to upload, browse, and select organization-level textures (images and videos). Textures are stored in Supabase cloud storage in the "Textures" bucket, associated with the user's organization.

## Current Architecture
- **MediaPickerDialog** has 4 tabs: Browse Nova, Teams, Players, Upload
- **Storage**: Uses Supabase cloud at `https://ihdoylhzekyluiiigxxc.supabase.co`
- **Auth**: Users belong to organizations (via `organization_id` in users table)
- **Existing pattern**: `novaMediaService.ts` for Nova media, `storageService.ts` for project media

## Implementation Steps

### Phase 1: Database Schema & Storage Setup

#### 1.1 Create Supabase Migration for `organization_textures` Table
**File:** `supabase/migrations/20251209000000_organization_textures.sql`

```sql
-- Organization textures table for storing texture metadata
CREATE TABLE IF NOT EXISTS organization_textures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT NOT NULL,
  media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
  size BIGINT,
  width INTEGER,
  height INTEGER,
  duration REAL, -- for videos, in seconds
  uploaded_by UUID REFERENCES users(id),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_org_textures_org_id ON organization_textures(organization_id);
CREATE INDEX idx_org_textures_media_type ON organization_textures(media_type);
CREATE INDEX idx_org_textures_created_at ON organization_textures(created_at DESC);

-- RLS Policies
ALTER TABLE organization_textures ENABLE ROW LEVEL SECURITY;

-- Users can view textures from their organization
CREATE POLICY "Users can view org textures"
  ON organization_textures FOR SELECT
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Users can insert textures for their organization
CREATE POLICY "Users can insert org textures"
  ON organization_textures FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Users can update their organization's textures
CREATE POLICY "Users can update org textures"
  ON organization_textures FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Users can delete their organization's textures
CREATE POLICY "Users can delete org textures"
  ON organization_textures FOR DELETE
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));
```

#### 1.2 Supabase Storage Bucket Configuration
The "Textures" bucket already exists. Ensure it has:
- Public read access for files
- RLS policies for write operations based on organization
- Folder structure: `{organization_id}/{filename}`
- Thumbnails folder: `{organization_id}/thumbnails/{filename}`

---

### Phase 2: Service Layer

#### 2.1 Create Texture Service
**File:** `apps/nova-gfx/src/services/textureService.ts`

```typescript
interface OrganizationTexture {
  id: string;
  organizationId: string;
  name: string;
  fileName: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  storagePath: string;
  mediaType: 'image' | 'video';
  size: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  uploadedBy: string | null;
  tags: string[];
  createdAt: string;
}

// Functions to implement:
- fetchOrganizationTextures(options?: { limit, offset, type, search })
- uploadTexture(file: File, options?: { name, tags })
- deleteTexture(textureId: string)
- generateThumbnail(file: File) // Client-side thumbnail generation for videos
```

#### 2.2 Thumbnail Generation
- **Images**: Resize on client using canvas (max 400px)
- **Videos**: Extract first frame using video element + canvas
- Upload thumbnail to `Textures/{org_id}/thumbnails/`

---

### Phase 3: UI Components

#### 3.1 Update MediaPickerDialog Tab Order
**File:** `apps/nova-gfx/src/components/dialogs/MediaPickerDialog.tsx`

Current tabs: `browse` → `sports` → `players` → `upload`
New tabs: `browse` → `textures` → `sports` → `players` → `upload`

```typescript
// Add new tab state type
type TabValue = 'browse' | 'textures' | 'sports' | 'players' | 'upload';

// Add Textures tab trigger (between Nova and Teams)
<TabsTrigger value="textures" className="gap-2 data-[state=active]:bg-background">
  <Layers className="w-4 h-4" />  {/* or ImageIcon */}
  Textures
</TabsTrigger>
```

#### 3.2 Textures Tab Content
Features:
- Grid display of organization textures (similar to Browse Nova)
- Search by name
- Filter by type (image/video)
- Upload button that uploads to org textures (not Nova)
- Delete texture option (for admins/owners)
- Show upload date and uploader info on hover

```tsx
<TabsContent value="textures" className="flex-1 overflow-hidden m-0 bg-background">
  {/* Search and filter bar */}
  {/* Textures grid with thumbnails */}
  {/* Upload area for new textures */}
</TabsContent>
```

#### 3.3 Texture Upload Flow
1. User selects/drops file in Textures tab
2. Generate thumbnail (client-side)
3. Upload original to `Textures/{org_id}/{timestamp}-{filename}`
4. Upload thumbnail to `Textures/{org_id}/thumbnails/{timestamp}-{filename}`
5. Insert record into `organization_textures` table
6. Refresh texture list

---

### Phase 4: Integration

#### 4.1 Auth Store Integration
Get current user's `organizationId` from `useAuthStore` to scope texture queries.

#### 4.2 Handle Selection
When texture is selected:
```typescript
if (activeTab === 'textures' && selectedTexture) {
  onSelect(selectedTexture.fileUrl, {
    id: selectedTexture.id,
    name: selectedTexture.name,
    file_url: selectedTexture.fileUrl,
    thumbnail_url: selectedTexture.thumbnailUrl,
    media_type: selectedTexture.mediaType,
    // ... map to NovaMediaAsset interface
  });
}
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/20251209000000_organization_textures.sql` | Create | Database table and RLS |
| `apps/nova-gfx/src/services/textureService.ts` | Create | Texture CRUD operations |
| `apps/nova-gfx/src/components/dialogs/MediaPickerDialog.tsx` | Modify | Add Textures tab |
| `apps/nova-gfx/src/lib/thumbnailGenerator.ts` | Create | Client-side thumbnail generation |

---

## Storage Structure

```
Textures/                          # Supabase storage bucket
├── {organization_id}/             # Per-organization folder
│   ├── 1702123456789-image.png    # Original files
│   ├── 1702123456790-video.mp4
│   └── thumbnails/                # Thumbnail folder
│       ├── 1702123456789-image.png
│       └── 1702123456790-video.mp4.jpg
```

---

## UI Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│ Select Media                                                     │
├─────────────────────────────────────────────────────────────────┤
│ [Browse Nova] [Textures] [Teams] [Players] [Upload]    [All ▼]  │
├─────────────────────────────────────────────────────────────────┤
│ [🔍 Search textures...                              ] [Search]  │
│                                                                  │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                │
│ │     │ │     │ │     │ │     │ │     │ │ + │                  │
│ │ IMG │ │ VID │ │ IMG │ │ IMG │ │ VID │ │Upload│               │
│ │     │ │     │ │     │ │     │ │     │ │     │                │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                │
│  bg.png  intro   logo   banner  outro   [Drop]                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ Selected: background.png                    [Cancel] [Insert]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

- [ ] Textures tab appears between "Browse Nova" and "Teams"
- [ ] Users can view all textures from their organization
- [ ] Users can upload images and videos to organization textures
- [ ] Thumbnails are generated automatically for uploaded files
- [ ] Users can search textures by name
- [ ] Users can filter by media type (image/video)
- [ ] Selected texture can be inserted into canvas element
- [ ] Texture files are stored in Supabase "Textures" bucket
- [ ] Texture metadata is stored in `organization_textures` table
- [ ] RLS ensures users only see their organization's textures

---

## Questions Before Implementation

1. Should there be admin-only delete capability, or can any org member delete?
2. Do we need a "rename texture" feature?
3. Should textures support tags for better organization?
4. Maximum file size limit? (suggest 100MB for videos, 25MB for images)
5. Should we show video duration in the grid?

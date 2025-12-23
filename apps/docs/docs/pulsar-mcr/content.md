---
sidebar_position: 2
---

# Content Management

The Content page is your central library for all media and data that can be scheduled for broadcast.

## Content Hierarchy

Content is organized in a three-level hierarchy:

```
Folders (Organizational)
└── Buckets (Collections)
    └── Items (Individual content pieces)
```

| Level | Purpose |
|-------|---------|
| **Folder** | Organize buckets by category, show, or project |
| **Bucket** | Group related content items together |
| **Item** | Individual content piece with template data |

## Creating Folders

1. Click the **Add Folder** button in the toolbar
2. Enter a **Name** for the folder
3. Optionally select a **Parent Folder** for nesting
4. Click **Create**

## Creating Buckets

1. Select the parent folder where the bucket should be created
2. Click the **Add Bucket** button
3. Enter a **Name** for the bucket
4. Select a **Template** to define the content structure
5. Click **Create**

## Creating Content Items

1. Select the bucket where you want to add an item
2. Click **Add Item** button
3. Fill in the form fields defined by the bucket's template:
   - Text fields for headlines, descriptions
   - Image uploads for graphics
   - Dropdown selections for categories
   - Date/time pickers for scheduling
4. Set the **Duration** (how long the item displays)
5. Toggle **Active** status
6. Click **Save**

## Managing Content

### Inline Editing

- Double-click any cell in the grid to edit directly
- Press Enter to save or Escape to cancel

### Drag and Drop

- Drag items between buckets to move them
- Drag buckets between folders to reorganize

### Context Menu Actions

Right-click on any item for options:
- **Edit** - Open the full edit dialog
- **Duplicate** - Create a copy of the item
- **Delete** - Remove the item
- **Move to...** - Move to a different bucket

### Batch Operations

- Select multiple items using Ctrl+Click or Shift+Click
- Use the toolbar buttons for batch delete operations

## Using Templates for Content

Templates define what data fields are available when creating content items:

- All items in a bucket use the same form structure
- You can switch templates, but existing data may need to be re-entered
- Templates can include dynamic data bindings to integrations

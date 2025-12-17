# Pulsar User Guide

**Version 1.0**

Pulsar is a professional broadcast media management and control application designed for television and media production environments. It serves as a centralized hub for managing television channels, content scheduling, graphics templates, virtual sets, sponsor scheduling, and data integrations.

---

## Table of Contents

1. [Getting Started](#getting-started)
   - [Logging In](#logging-in)
   - [Understanding the Interface](#understanding-the-interface)
   - [Customizing Your Workspace](#customizing-your-workspace)
2. [Channels](#channels)
   - [Creating a Channel](#creating-a-channel)
   - [Channel Types](#channel-types)
   - [Editing and Deleting Channels](#editing-and-deleting-channels)
3. [Channel Schedules](#channel-schedules)
   - [Creating Playlists](#creating-playlists)
   - [Adding Content to Playlists](#adding-content-to-playlists)
   - [Scheduling Playback](#scheduling-playback)
   - [Managing Playlists](#managing-playlists)
4. [Content Management](#content-management)
   - [Understanding the Content Hierarchy](#understanding-the-content-hierarchy)
   - [Creating Folders](#creating-folders)
   - [Creating Buckets](#creating-buckets)
   - [Creating Content Items](#creating-content-items)
   - [Using Templates](#using-templates-for-content)
   - [Managing Content](#managing-content)
5. [Templates](#templates)
   - [Template Overview](#template-overview)
   - [Creating Templates](#creating-templates)
   - [Using the Form Builder](#using-the-form-builder)
   - [Template Carousels](#template-carousels)
   - [Managing Tab Fields](#managing-tab-fields)
6. [Widgets](#widgets)
   - [Understanding Widgets](#understanding-widgets)
   - [Creating Widgets](#creating-widgets)
   - [Widget Builder](#widget-builder)
   - [RCP Presets](#rcp-presets)
7. [Virtual Set](#virtual-set)
   - [Virtual Set Overview](#virtual-set-overview)
   - [AI Image Generation](#ai-image-generation)
   - [Configuring Set Elements](#configuring-set-elements)
   - [Connecting to Unreal Engine](#connecting-to-unreal-engine)
8. [Integrations](#integrations)
   - [Data Sources Overview](#data-sources-overview)
   - [Creating API Integrations](#creating-api-integrations)
   - [Database Connections](#database-connections)
   - [File and RSS Imports](#file-and-rss-imports)
   - [Preset Integrations](#preset-integrations)
   - [Syncing Data](#syncing-data)
9. [Sponsors](#sponsors)
   - [Sponsor Scheduling Overview](#sponsor-scheduling-overview)
   - [Creating Sponsor Schedules](#creating-sponsor-schedules)
   - [Time-Based Rules](#time-based-rules)
10. [Banners](#banners)
    - [Banner Scheduling Overview](#banner-scheduling-overview)
    - [Creating Banner Schedules](#creating-banner-schedules)
    - [Trigger Configuration](#trigger-configuration)
11. [Data Wizard](#data-wizard)
    - [Using the Data Wizard](#using-the-data-wizard)
    - [Source Types](#source-types)
    - [Field Mapping](#field-mapping)
12. [Ticker Wizard](#ticker-wizard)
    - [Importing Ticker Data](#importing-ticker-data)
    - [Template Selection](#template-selection)
    - [Data Mapping](#data-mapping)
13. [Tips and Best Practices](#tips-and-best-practices)
14. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Logging In

When you first open Pulsar, you will be presented with a login screen.

![Login Screen](./images/login-screen.png)

1. Enter your email address in the **Email** field
2. Enter your password in the **Password** field
3. Click **Sign In** to access the application

If you don't have an account, contact your system administrator to have one created for you.

### Understanding the Interface

Pulsar uses a flexible tab-based interface that allows you to organize your workspace according to your preferences.

![Main Interface Overview](./images/main-interface.png)

#### Key Interface Elements

| Element | Description |
|---------|-------------|
| **Tab Bar** | Located at the top of each panel, displays available pages and allows switching between them |
| **Navigation Tabs** | Individual tabs for Channels, Schedules, Content, Templates, Widgets, Virtual Set, Integrations, Sponsors, and Banners |
| **Theme Toggle** | Switch between light and dark modes (located in the header) |
| **User Menu** | Access account settings and logout options |

#### Available Pages

- **Channels** - Create and manage broadcast channels
- **Channel Schedules** - Organize content playlists for channels
- **Content** - Manage your content library with templates and buckets
- **Templates** - Create reusable form-based templates
- **Widgets** - View and manage Unreal Engine widgets
- **Widget Builder** - Create and configure widgets with preview capabilities
- **Virtual Set** - AI-powered virtual set designer
- **Integrations** - Manage data source connections
- **Sponsors** - Schedule sponsor media
- **Banners** - Manage banner schedules

### Customizing Your Workspace

Pulsar's FlexLayout system allows you to arrange tabs and panels to suit your workflow.

![Workspace Customization](./images/workspace-customization.png)

#### Rearranging Tabs

1. **Drag tabs** to reorder them within a panel
2. **Drag tabs to panel edges** to create split views
3. **Drag tabs between panels** to move them to different areas

#### Layout Presets

Access layout presets through the layout menu:

| Layout | Description |
|--------|-------------|
| **Default** | Single tabset with all tabs |
| **Horizontal** | Each tab in separate pane across width |
| **Vertical** | Each tab in separate pane down height |
| **Two-Row Grid** | Split tabs across 2 rows |
| **Three-Row Grid** | Split tabs across 3 rows |

#### Auto-Save

Your workspace layout is automatically saved to your user profile. When you log back in, your layout will be restored exactly as you left it.

---

## Channels

Channels represent the broadcast destinations where your content will be displayed. Pulsar supports multiple channel types to integrate with various broadcast systems.

### Creating a Channel

![Create Channel Dialog](./images/create-channel-dialog.png)

1. Navigate to the **Channels** page
2. Click the **Add Channel** button (+ icon)
3. In the dialog that appears:
   - Enter a **Name** for your channel
   - Select a **Type** from the dropdown
   - Add an optional **Description**
4. Click **Save** to create the channel

### Channel Types

Pulsar supports the following channel types:

| Type | Description | Use Case |
|------|-------------|----------|
| **Unreal** | Unreal Engine integration | Real-time graphics and virtual sets |
| **Vizrt** | Vizrt graphics system | Traditional broadcast graphics |
| **Pixera** | Pixera media server | LED walls and projection mapping |
| **Web** | Web-based output | Digital signage and web displays |

### Editing and Deleting Channels

![Channel Context Menu](./images/channel-context-menu.png)

#### To Edit a Channel:
1. Right-click on the channel in the grid
2. Select **Edit** from the context menu
3. Modify the channel properties
4. Click **Save**

#### To Delete a Channel:
1. Right-click on the channel in the grid
2. Select **Delete** from the context menu
3. Confirm the deletion when prompted

> **Warning:** Deleting a channel will also affect any playlists associated with it.

---

## Channel Schedules

Channel Schedules allow you to organize and schedule content for playback on your channels.

### Creating Playlists

![Create Playlist Dialog](./images/create-playlist-dialog.png)

1. Navigate to the **Channel Schedules** page
2. Select a channel from the left sidebar
3. Click **Add Playlist** button
4. Enter a **Name** for the playlist
5. Optionally select a **Carousel** to group related playlists
6. Click **Create**

### Adding Content to Playlists

![Bucket Selector](./images/bucket-selector.png)

1. Select a playlist from the list
2. Click **Add Content** or use the **Bucket Selector**
3. Browse the content hierarchy:
   - Expand folders to find content buckets
   - Select the bucket(s) you want to add
4. Click **Add** to include the content in your playlist

#### Understanding the Bucket Selector

The Bucket Selector displays your content library in a hierarchical tree view:
- **Folders** (folder icon) - Organizational containers
- **Buckets** (bucket icon) - Collections of content items
- **Checkboxes** - Select multiple buckets at once

### Scheduling Playback

![Schedule Dialog](./images/schedule-dialog.png)

1. Select a playlist or content item in the schedule grid
2. Click the **Schedule** button or double-click to edit
3. Configure the schedule settings:

| Setting | Description |
|---------|-------------|
| **Start Time** | When playback begins |
| **End Time** | When playback ends |
| **Days of Week** | Which days the schedule is active |
| **Active** | Toggle the schedule on/off |

4. Click **Save** to apply the schedule

### Managing Playlists

![Playlist Management](./images/playlist-management.png)

#### Reordering Content
- Drag and drop content items within the playlist to change playback order

#### Removing Content
- Select content items and click **Remove** or use the delete key

#### Batch Operations
- Select multiple items using Ctrl+Click or Shift+Click
- Use the toolbar buttons for batch delete operations

---

## Content Management

The Content page is your central library for all media and data that can be scheduled for broadcast.

### Understanding the Content Hierarchy

![Content Hierarchy](./images/content-hierarchy.png)

Content is organized in a three-level hierarchy:

```
Folders (Organizational)
└── Buckets (Collections)
    └── Items (Individual content pieces)
```

| Level | Purpose | Icon |
|-------|---------|------|
| **Folder** | Organize buckets by category, show, or project | 📁 |
| **Bucket** | Group related content items together | 🪣 |
| **Item** | Individual content piece with template data | 📄 |

### Creating Folders

![Create Folder Dialog](./images/create-folder-dialog.png)

1. Click the **Add Folder** button in the toolbar
2. Enter a **Name** for the folder
3. Optionally select a **Parent Folder** for nesting
4. Click **Create**

### Creating Buckets

![Create Bucket Dialog](./images/create-bucket-dialog.png)

1. Select the parent folder where the bucket should be created
2. Click the **Add Bucket** button
3. Enter a **Name** for the bucket
4. Select a **Template** to define the content structure
5. Click **Create**

### Creating Content Items

![Create Item Form](./images/create-item-form.png)

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

### Using Templates for Content

Templates define what data fields are available when creating content items. When you select a template for a bucket:

- All items in that bucket will use the same form structure
- You can switch templates, but existing data may need to be re-entered
- Templates can include dynamic data bindings to integrations

### Managing Content

![Content Grid Actions](./images/content-grid-actions.png)

#### Inline Editing
- Double-click any cell in the grid to edit directly
- Press Enter to save or Escape to cancel

#### Drag and Drop
- Drag items between buckets to move them
- Drag buckets between folders to reorganize

#### Context Menu Actions
Right-click on any item for options:
- **Edit** - Open the full edit dialog
- **Duplicate** - Create a copy of the item
- **Delete** - Remove the item
- **Move to...** - Move to a different bucket

---

## Templates

Templates are the foundation of your content structure, defining the form fields and data types that content creators will use.

### Template Overview

![Templates Page](./images/templates-page.png)

Templates in Pulsar:
- Define the structure of content items
- Use Form.io for flexible form building
- Support dynamic data from integrations
- Can be organized in folders and carousels
- Include tab fields for organized data entry

### Creating Templates

![Create Template Dialog](./images/create-template-dialog.png)

1. Navigate to the **Templates** page
2. Click **Add Template** button
3. Enter a **Name** for the template
4. Select a **Parent Folder** (optional)
5. Choose or create a **Carousel** to group related templates
6. Click **Create**

### Using the Form Builder

![Form.io Builder](./images/formio-builder.png)

Pulsar integrates Form.io for professional form building:

#### Available Field Types

| Field Type | Description | Example Use |
|------------|-------------|-------------|
| **Text Field** | Single line text input | Headlines, names |
| **Text Area** | Multi-line text input | Descriptions, body text |
| **Number** | Numeric input | Scores, counts |
| **Select** | Dropdown selection | Categories, status |
| **Radio** | Radio button group | Yes/No options |
| **Checkbox** | Toggle checkbox | Flags, confirmations |
| **Date/Time** | Date and time picker | Scheduling, timestamps |
| **File** | File upload | Images, videos |
| **Hidden** | Hidden data field | IDs, system values |

#### Building a Form

1. Drag components from the left panel to the form canvas
2. Click on components to configure:
   - **Display** - Label, placeholder, tooltip
   - **Data** - Default values, data sources
   - **Validation** - Required, patterns, custom validation
   - **Conditional** - Show/hide based on other fields
3. Use the **Preview** tab to test your form
4. Click **Save** to store the template

### Template Carousels

![Template Carousel](./images/template-carousel.png)

Carousels group related templates for easier navigation:

1. When creating or editing a template, enter a **Carousel Name**
2. Templates with the same carousel name are grouped together
3. Use the carousel selector to filter templates by group

### Managing Tab Fields

![Tab Fields Editor](./images/tab-fields-editor.png)

Tab fields organize template data into logical sections:

1. Select a template
2. Click **Manage Tab Fields**
3. Add new tabs with the **+** button
4. Drag fields between tabs to organize
5. Rename tabs by double-clicking the tab name
6. Delete tabs using the **×** button

---

## Widgets

Widgets provide real-time control over Unreal Engine parameters through the Remote Control Protocol (RCP).

### Understanding Widgets

![Widgets Overview](./images/widgets-overview.png)

Widgets in Pulsar:
- Connect to Unreal Engine via RCP
- Control graphics, text, and parameters in real-time
- Can be built from RCP presets
- Offer preview capabilities before publishing

### Creating Widgets

![Widget Wizard](./images/widget-wizard.png)

Use the Widget Wizard to create new widgets:

1. Navigate to **Widgets** page
2. Click **Create Widget** button
3. **Step 1: Select Channel**
   - Choose the Unreal Engine channel to connect to
4. **Step 2: Scan for Presets**
   - Click **Scan** to discover available RCP presets
   - Wait for the scan to complete
5. **Step 3: Select Presets**
   - Check the presets you want to include in the widget
   - Preview preset properties on the right
6. **Step 4: Configure Widget**
   - Enter a **Name** for the widget
   - Add an optional **Description**
7. Click **Create Widget**

### Widget Builder

![Widget Builder Interface](./images/widget-builder.png)

The Widget Builder provides advanced configuration:

#### Builder Layout

| Panel | Purpose |
|-------|---------|
| **Left Panel** | Available RCP properties and presets |
| **Center Panel** | Widget configuration form |
| **Right Panel** | Live preview |

#### Configuring Widgets

1. Select a widget from the Widgets page
2. Click **Edit in Builder** to open the Widget Builder
3. Configure:
   - **Connection Settings** - Unreal Engine endpoint
   - **Field Mappings** - Map RCP properties to form inputs
   - **Default Values** - Set initial values for properties
4. Use **Preview** to test changes
5. Click **Publish** to activate the widget

### RCP Presets

![RCP Preset Selection](./images/rcp-presets.png)

RCP Presets are pre-configured Unreal Engine remote control endpoints:

- **Scan** to discover available presets on the connected channel
- **Select** multiple presets to combine into a single widget
- **Preview** preset properties before adding
- **Filter** presets by name or category

---

## Virtual Set

The Virtual Set page allows you to design and control virtual environments powered by AI and Unreal Engine.

### Virtual Set Overview

![Virtual Set Interface](./images/virtual-set-interface.png)

The Virtual Set feature includes:
- AI-powered background generation
- Real-time Unreal Engine integration
- Element configuration (floors, walls, platforms)
- Actor positioning
- Lighting and screen controls

### AI Image Generation

![AI Image Generation](./images/ai-image-generation.png)

Generate custom backgrounds using AI:

1. Enter a descriptive **prompt** for your desired environment
   - Example: "Modern news studio with blue lighting and glass walls"
2. Click **Generate** to create AI images
3. Review generated options
4. Select an image to use as your background
5. Fine-tune with additional prompts if needed

#### Tips for Better Prompts

- Be specific about lighting ("soft blue ambient lighting")
- Describe materials ("polished concrete floor")
- Include style references ("minimalist modern design")
- Mention camera angle if relevant ("wide angle view")

### Configuring Set Elements

![Set Element Controls](./images/set-elements.png)

Customize your virtual set components:

| Element | Options |
|---------|---------|
| **Floor** | Material, color, reflectivity |
| **Walls** | Texture, transparency, color |
| **Platforms** | Position, size, material |
| **Screens** | Content source, position, size |
| **Lighting** | Color, intensity, direction |

### Connecting to Unreal Engine

![Unreal Connection](./images/unreal-connection.png)

1. Select the target **Unreal Engine channel**
2. Click **Connect** to establish the connection
3. Use **Send to Unreal** to push changes
4. Enable **Live Update** for real-time sync
5. Use **Preview** to see changes before broadcasting

---

## Integrations

Integrations connect Pulsar to external data sources, enabling dynamic content updates from APIs, databases, files, and more.

### Data Sources Overview

![Integrations Page](./images/integrations-page.png)

Pulsar supports multiple integration types:

| Source Type | Description | Use Cases |
|-------------|-------------|-----------|
| **API** | REST API endpoints | Weather, sports scores, stock prices |
| **Database** | Direct database connections | Internal systems, CMS data |
| **File/CSV** | File imports | Spreadsheets, data exports |
| **RSS Feed** | RSS/Atom feeds | News headlines, blog posts |
| **Presets** | Pre-configured integrations | Traffic, weather, elections |

### Creating API Integrations

![API Integration Setup](./images/api-integration.png)

1. Navigate to **Integrations** page
2. Click **Add Integration** or use the **Data Wizard**
3. Select **API** as the source type
4. Configure:
   - **Name** - Descriptive name for the integration
   - **Endpoint URL** - The API URL to fetch data from
   - **Method** - GET, POST, PUT, etc.
   - **Headers** - Authentication headers, content type
   - **Authentication** - API keys, OAuth tokens, Basic auth
5. Click **Test Connection** to verify
6. Click **Save**

### Database Connections

![Database Connection Setup](./images/database-connection.png)

Connect to MySQL, PostgreSQL, or SQL Server:

1. Select **Database** as the source type
2. Choose the **Database Type**
3. Enter connection details:
   - **Host** - Server address
   - **Port** - Database port
   - **Database Name** - Target database
   - **Username** - Database user
   - **Password** - Database password
4. Enter your **SQL Query**
5. Test the connection
6. Save the integration

### File and RSS Imports

![File Import Setup](./images/file-import.png)

#### CSV/File Import
1. Select **File** as the source type
2. Upload your file or specify a file path
3. Configure parsing options:
   - Delimiter (comma, tab, etc.)
   - Header row
   - Column mapping
4. Save the integration

#### RSS Feed
1. Select **RSS** as the source type
2. Enter the **Feed URL**
3. Configure:
   - Update interval
   - Number of items to fetch
   - Field mapping
4. Save the integration

### Preset Integrations

![Preset Integrations](./images/preset-integrations.png)

Pulsar includes pre-configured integrations for common data sources:

| Preset | Data Provided |
|--------|---------------|
| **Traffic** | Traffic conditions, incidents, travel times |
| **Weather** | Current conditions, forecasts, alerts |
| **Elections** | Voting results, candidate information |
| **School Closings** | School closure announcements |

To use a preset:
1. Click **Add Preset Integration**
2. Select the preset type
3. Configure location or region settings
4. Save and sync

### Syncing Data

![Sync Status](./images/sync-status.png)

#### Manual Sync
1. Select an integration from the list
2. Click **Sync Now** button
3. Monitor the sync status
4. Review any errors in the sync log

#### Auto Sync
1. Edit the integration
2. Enable **Auto Sync**
3. Set the **Sync Interval** (minutes)
4. Save changes

Data from synced integrations can be used in:
- Template form fields
- Dynamic content items
- Ticker displays
- Real-time graphics

---

## Sponsors

The Sponsors page manages sponsor media scheduling with time-based display rules.

### Sponsor Scheduling Overview

![Sponsors Page](./images/sponsors-page.png)

Sponsor scheduling features:
- Time-range based display rules
- Day-of-week configuration
- Media preview thumbnails
- Active/inactive status toggle
- Multiple schedules per sponsor

### Creating Sponsor Schedules

![Sponsor Schedule Dialog](./images/sponsor-schedule-dialog.png)

1. Navigate to the **Sponsors** page
2. Click **Add Sponsor Schedule**
3. Configure the schedule:

| Field | Description |
|-------|-------------|
| **Name** | Descriptive name for the schedule |
| **Media** | Select sponsor image or video |
| **Start Time** | Time when sponsor begins displaying |
| **End Time** | Time when sponsor stops displaying |
| **Days** | Days of the week the schedule is active |
| **Active** | Toggle schedule on/off |

4. Preview the media selection
5. Click **Save**

### Time-Based Rules

![Time Rules Configuration](./images/time-rules.png)

Configure recurring sponsor display:

#### Time Range
- Set specific **Start Time** and **End Time**
- Times are in 24-hour format
- Schedules repeat daily within the time range

#### Days of Week
- Check which days the schedule should be active
- Uncheck days to skip (e.g., weekends)
- Schedules automatically repeat each week

#### Examples

| Schedule | Start | End | Days |
|----------|-------|-----|------|
| Morning Show Sponsor | 06:00 | 09:00 | Mon-Fri |
| Weekend Special | 10:00 | 22:00 | Sat-Sun |
| Prime Time Ad | 19:00 | 23:00 | Daily |

---

## Banners

The Banners page manages dynamic banner scheduling with trigger-based display rules.

### Banner Scheduling Overview

![Banners Page](./images/banners-page.png)

Banner scheduling features:
- Trigger-based activation
- Priority levels
- Duration settings
- Media asset selection
- Active status management

### Creating Banner Schedules

![Banner Schedule Dialog](./images/banner-schedule-dialog.png)

1. Navigate to the **Banners** page
2. Click **Add Banner Schedule**
3. Configure:
   - **Name** - Banner schedule name
   - **Media** - Banner image or video
   - **Priority** - Display priority (higher = more important)
   - **Duration** - How long the banner displays
   - **Active** - Enable/disable the schedule
4. Click **Save**

### Trigger Configuration

![Banner Triggers](./images/banner-triggers.png)

Banners can be triggered by various conditions:

| Trigger Type | Description | Example |
|--------------|-------------|---------|
| **Time** | Display at specific times | Breaking news banner at top of hour |
| **Event** | Display on external events | Weather alert triggers |
| **Manual** | Manually activated | Operator-triggered announcements |
| **Data** | Based on data conditions | Score threshold triggers |

Configure triggers in the banner schedule dialog to automate banner display based on your broadcast needs.

---

## Data Wizard

The Data Wizard provides a guided process for connecting to external data sources.

### Using the Data Wizard

![Data Wizard Overview](./images/data-wizard-overview.png)

Access the Data Wizard from the Integrations page:

1. Click **Add Integration** → **Use Data Wizard**
2. Follow the step-by-step process:
   - **Step 1:** Select source type
   - **Step 2:** Configure connection
   - **Step 3:** Test and validate
   - **Step 4:** Map fields
   - **Step 5:** Set sync options
   - **Step 6:** Review and save

### Source Types

![Data Wizard Source Types](./images/data-wizard-sources.png)

The wizard supports:

#### API Sources
- REST APIs with GET/POST
- Authentication options (API Key, OAuth, Basic)
- Header configuration
- Request body templates

#### Database Sources
- MySQL
- PostgreSQL
- SQL Server
- Custom SQL queries

#### File Sources
- CSV file upload
- Delimited text files
- JSON files
- Server file browser

#### Feed Sources
- RSS feeds
- Atom feeds
- XML endpoints

### Field Mapping

![Field Mapping Interface](./images/field-mapping.png)

Map source data to Pulsar fields:

1. View the source data preview
2. Select a **Source Field** from the data
3. Choose or create a **Target Field** in Pulsar
4. Configure field transformations:
   - Text formatting
   - Date parsing
   - Number conversion
   - Value mapping
5. Repeat for all required fields
6. Click **Complete** to finish

---

## Ticker Wizard

The Ticker Wizard helps you import ticker and template data from files quickly.

### Importing Ticker Data

![Ticker Wizard Interface](./images/ticker-wizard.png)

1. Access the Ticker Wizard from the toolbar
2. **Step 1: Upload File**
   - Drag and drop or browse to select a file
   - Supported formats: CSV, Excel, JSON
3. **Step 2: Preview Data**
   - Review the imported data in the grid
   - Verify column detection
   - Adjust parsing options if needed

### Template Selection

![Ticker Template Selection](./images/ticker-template-selection.png)

1. **Select Target Template**
   - Choose from available templates
   - Template determines the data structure
2. **Select Carousel** (optional)
   - Group imported data with a carousel
3. **Select Target Bucket**
   - Choose where to create content items

### Data Mapping

![Ticker Data Mapping](./images/ticker-data-mapping.png)

1. Map imported columns to template fields:
   - Source columns appear on the left
   - Template fields appear on the right
   - Drag to connect or use dropdown selection
2. Configure import options:
   - **Create new items** vs. **Update existing**
   - **Duration** for new items
   - **Active status** default
3. Click **Import** to create content items
4. Review the import summary

---

## Tips and Best Practices

### Content Organization

- **Use descriptive names** for folders, buckets, and items
- **Create a logical hierarchy** that matches your broadcast structure
- **Group related content** in the same bucket for easier scheduling
- **Archive old content** rather than deleting for historical reference

### Template Design

- **Start simple** with essential fields, add complexity as needed
- **Use validation** to ensure data quality
- **Create templates for specific use cases** (sports, news, weather)
- **Document field purposes** in tooltips and descriptions

### Scheduling Efficiency

- **Create reusable playlists** for recurring shows
- **Use time ranges** to automate content changes
- **Test schedules** before going live
- **Monitor schedule conflicts** using the schedule grid

### Integration Management

- **Test connections regularly** to ensure data freshness
- **Set appropriate sync intervals** based on data change frequency
- **Monitor sync logs** for errors
- **Use presets** when available for faster setup

### Performance Tips

- **Limit the number of active real-time syncs** to reduce server load
- **Use batch operations** for bulk content changes
- **Close unused tabs** to free up memory
- **Clear browser cache** periodically

---

## Troubleshooting

### Common Issues

#### Cannot Log In
- Verify your email and password
- Check if your account is active (contact administrator)
- Clear browser cache and cookies
- Try a different browser

#### Content Not Appearing in Schedule
- Verify the schedule is set to **Active**
- Check the time range matches current time
- Confirm the days of week are selected
- Verify the playlist is assigned to the correct channel

#### Integration Sync Failing
- Check the endpoint URL is correct
- Verify authentication credentials
- Test the connection manually
- Review error messages in sync logs
- Check if the source service is online

#### Widget Not Connecting to Unreal
- Verify Unreal Engine is running
- Check the channel connection settings
- Confirm RCP is enabled in Unreal
- Verify firewall settings allow connection

#### Layout Not Saving
- Check you are logged in
- Refresh the page and try again
- Clear browser local storage
- Report persistent issues to support

### Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Connection refused" | Cannot reach the server | Check network/firewall settings |
| "Authentication failed" | Login credentials incorrect | Re-enter credentials or reset password |
| "Permission denied" | Insufficient access rights | Contact administrator for permissions |
| "Sync timeout" | Data source taking too long | Check source availability, increase timeout |
| "Invalid template" | Template structure error | Review and fix template form |

### Getting Help

If you encounter issues not covered in this guide:

1. Check the error message details
2. Review recent changes that might have caused the issue
3. Contact your system administrator
4. Report bugs at the project issue tracker

---

## Appendix

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Save current item |
| `Delete` | Delete selected items |
| `Ctrl + A` | Select all items in grid |
| `Escape` | Cancel current operation |
| `F5` | Refresh current view |

### Supported File Formats

#### Media Files
- Images: PNG, JPG, JPEG, GIF, WebP
- Video: MP4, WebM, MOV

#### Data Files
- CSV (comma-separated values)
- Excel (.xlsx, .xls)
- JSON
- XML
- RSS/Atom feeds

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Minimum 1920x1080 screen resolution recommended
- Stable internet connection
- For Unreal Engine features: Network access to Unreal Engine server

---

**Document Version:** 1.0
**Last Updated:** December 2025
**Product:** Pulsar
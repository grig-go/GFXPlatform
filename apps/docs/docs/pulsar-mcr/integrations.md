---
sidebar_position: 6
---

# Integrations

Integrations connect Pulsar MCR to external data sources, enabling dynamic content updates from APIs, databases, files, and more.

## Data Source Types

| Source Type | Description | Use Cases |
|-------------|-------------|-----------|
| **API** | REST API endpoints | Weather, sports scores, stock prices |
| **Database** | Direct database connections | Internal systems, CMS data |
| **File/CSV** | File imports | Spreadsheets, data exports |
| **RSS Feed** | RSS/Atom feeds | News headlines, blog posts |
| **Presets** | Pre-configured integrations | Traffic, weather, elections |

## Creating API Integrations

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

## Database Connections

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

## File and RSS Imports

### CSV/File Import

1. Select **File** as the source type
2. Upload your file or specify a file path
3. Configure parsing options:
   - Delimiter (comma, tab, etc.)
   - Header row
   - Column mapping
4. Save the integration

### RSS Feed

1. Select **RSS** as the source type
2. Enter the **Feed URL**
3. Configure:
   - Update interval
   - Number of items to fetch
   - Field mapping
4. Save the integration

## Preset Integrations

Pulsar MCR includes pre-configured integrations for common data sources:

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

## Syncing Data

### Manual Sync

1. Select an integration from the list
2. Click **Sync Now** button
3. Monitor the sync status
4. Review any errors in the sync log

### Auto Sync

1. Edit the integration
2. Enable **Auto Sync**
3. Set the **Sync Interval** (minutes)
4. Save changes

## Data Wizard

The Data Wizard provides a guided process for connecting to external data sources:

1. Click **Add Integration** → **Use Data Wizard**
2. Follow the step-by-step process:
   - **Step 1:** Select source type
   - **Step 2:** Configure connection
   - **Step 3:** Test and validate
   - **Step 4:** Map fields
   - **Step 5:** Set sync options
   - **Step 6:** Review and save

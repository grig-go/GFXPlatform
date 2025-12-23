---
sidebar_position: 4
---

# Widgets

Widgets provide real-time control over Unreal Engine parameters through the Remote Control Protocol (RCP).

## Overview

Widgets in Pulsar MCR:
- Connect to Unreal Engine via RCP
- Control graphics, text, and parameters in real-time
- Can be built from RCP presets
- Offer preview capabilities before publishing

## Creating Widgets

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

## Widget Builder

The Widget Builder provides advanced configuration.

### Builder Layout

| Panel | Purpose |
|-------|---------|
| **Left Panel** | Available RCP properties and presets |
| **Center Panel** | Widget configuration form |
| **Right Panel** | Live preview |

### Configuring Widgets

1. Select a widget from the Widgets page
2. Click **Edit in Builder** to open the Widget Builder
3. Configure:
   - **Connection Settings** - Unreal Engine endpoint
   - **Field Mappings** - Map RCP properties to form inputs
   - **Default Values** - Set initial values for properties
4. Use **Preview** to test changes
5. Click **Publish** to activate the widget

## RCP Presets

RCP Presets are pre-configured Unreal Engine remote control endpoints:

- **Scan** to discover available presets on the connected channel
- **Select** multiple presets to combine into a single widget
- **Preview** preset properties before adding
- **Filter** presets by name or category

# @emergent-platform/playout-engine

Shared rendering engine for Nova GFX templates.

## Status

This package is a placeholder for future implementation.

## Planned Features

- Template rendering to canvas/DOM
- Animation timeline management
- Real-time data binding
- Video/image compositing
- Output encoding (for NDI, WebRTC, etc.)

## Usage

This package will be used by:
- **Nova Player**: Browser-based graphics renderer
- **Nova GFX**: Preview system for template editing
- **Pulsar GFX**: Preview for playout control

## Architecture

The playout engine will provide:

1. **Renderer Core**: Handles DOM/Canvas rendering of templates
2. **Animation Controller**: Manages timeline-based animations
3. **Data Binder**: Connects template bindings to data sources
4. **Output Manager**: Handles video output (browser capture, NDI, WebRTC)

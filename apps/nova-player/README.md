# Nova Player

Browser-based graphics playout renderer.

## Status

This application is planned but not yet implemented.

## Purpose

Nova Player is a lightweight browser application that:
- Receives commands from Pulsar GFX via Supabase Realtime
- Renders graphics in real-time using @emergent-platform/playout-engine
- Outputs video via browser capture, NDI, or WebRTC
- Runs on dedicated render PCs in the broadcast chain

## Planned Features

- Real-time template rendering
- Multi-layer compositing
- Animation timeline control
- Live data binding updates
- Multiple output options (browser, NDI, WebRTC, SRT)
- Performance monitoring
- Remote configuration

## Deployment Options

1. **Browser Capture**: Open in Chrome, capture with OBS/vMix
2. **NDI Output**: Native NDI output via browser extension
3. **WebRTC Stream**: Direct WebRTC to video switchers
4. **Electron App**: Packaged desktop application with enhanced features

## Tech Stack (Planned)

- React + TypeScript (minimal UI)
- @emergent-platform/playout-engine for rendering
- Supabase Realtime for commands
- Web Workers for performance

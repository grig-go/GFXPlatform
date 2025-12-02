# Pulsar GFX

Professional broadcast graphics control application.

## Status

This application is planned but not yet implemented.

## Planned Features

- Template browser (loads from Nova GFX projects)
- Page editor (template instances with content)
- Playlist management
- Real-time playout control
- Multi-channel support
- Data binding to external sources
- Loop management (tickers, carousels)

## Architecture

Pulsar GFX will:
1. Connect to the same Supabase backend as Nova GFX
2. Load templates created in Nova GFX
3. Create "Pages" - instances of templates with filled-in content
4. Send playback commands to Nova Player via Supabase Realtime

## Tech Stack (Planned)

- React + TypeScript
- Vite
- Tailwind CSS + shadcn/ui (shared from @emergent-platform/ui)
- Supabase (shared from @emergent-platform/supabase-client)
- Zustand for state management

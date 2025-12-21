# NovaGFX Platform - Claude Code Instructions

## Project Overview
NovaGFX is a broadcast graphics platform with multiple apps in a monorepo structure using pnpm workspaces.

## Database: Supabase Cloud

**IMPORTANT: This project uses Supabase Cloud, NOT local Supabase.**

### Supabase Project

All apps use a SINGLE unified Supabase project:
- Project ref: `bgkjcngrslxyqjitksim`
- URL: `https://bgkjcngrslxyqjitksim.supabase.co`

### Database Operations

Always use Supabase CLI for database operations:

```bash
# Check if linked
supabase projects list

# Link to the project (if not already linked)
supabase link --project-ref bgkjcngrslxyqjitksim

# Push migrations to cloud
supabase db push

# Pull schema from cloud
supabase db pull

# Generate types
supabase gen types typescript --project-id bgkjcngrslxyqjitksim > packages/types/src/database.ts
```

### Environment Variables
All Supabase credentials are in `.env` at the project root. Check this file for URLs and anon keys.

## Tech Stack
- **Framework**: React + Vite + TypeScript
- **UI**: Tailwind CSS + shadcn/ui components
- **State**: Zustand
- **Database**: Supabase (PostgreSQL)
- **Package Manager**: pnpm
- **Monorepo**: pnpm workspaces

## Key Directories
- `/apps/nova-gfx` - Main graphics designer app
- `/apps/nova` - Nova dashboard
- `/apps/pulsar-gfx` - Pulsar playout app
- `/packages/types` - Shared TypeScript types
- `/packages/ui` - Shared UI components
- `/supabase/migrations` - Database migrations

## Running Apps
```bash
# Nova GFX (default port 3003)
pnpm --filter nova-gfx dev

# Nova dashboard
pnpm --filter nova dev
```

## Interactive Mode
Nova GFX supports Interactive Mode for creating dynamic graphics with:
- Clickable elements and event handling
- JavaScript code scripting or Visual Node Editor
- Data binding with `{{field.path}}` syntax
- Universal Address System (`@ElementName.property`)
- Template placeholder `{{CURRENT_TEMPLATE}}`

## Important Notes
- Always check `.env` for configuration
- Never use local Supabase - always cloud
- Migrations go to `/supabase/migrations`
- Use `supabase db push` to apply migrations

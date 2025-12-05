# Emergent Platform

Broadcast graphics design and control platform.

## Applications

| App | Description | Status |
|-----|-------------|--------|
| [Nova GFX](./apps/nova-gfx) | Design tool for creating broadcast graphics | ✅ Active |
| [Pulsar GFX](./apps/pulsar-gfx) | Control app for operating graphics | 🚧 Planned |
| [Nova Player](./apps/nova-player) | Browser-based playout renderer | 🚧 Planned |

## Packages

| Package | Description |
|---------|-------------|
| [@emergent-platform/types](./packages/types) | Shared TypeScript types |
| [@emergent-platform/ui](./packages/ui) | Shared UI components (shadcn/ui) |
| [@emergent-platform/supabase-client](./packages/supabase-client) | Supabase client & queries |
| [@emergent-platform/design-tokens](./packages/design-tokens) | Design system tokens |
| [@emergent-platform/playout-engine](./packages/playout-engine) | Graphics rendering engine |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- Supabase CLI

### Installation

```bash
# Install dependencies
pnpm install

# Start Supabase (local development)
pnpm db:start

# Generate database types
pnpm db:generate

# Start Nova GFX development server
pnpm dev:nova
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm dev:nova` | Start Nova GFX only |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint all apps and packages |
| `pnpm clean` | Clean all build artifacts |
| `pnpm db:generate` | Generate Supabase types |
| `pnpm db:migrate` | Push database migrations |

## Architecture

See [Architecture Documentation](./docs/) for detailed system design.

---
sidebar_position: 1
---

# Getting Started

Welcome to **Nova GFX** - a professional broadcast graphics platform for creating stunning, animated overlays for live streaming and broadcast production.

## What is Nova GFX?

Nova GFX is a comprehensive graphics platform consisting of two main applications:

- **Nova GFX (Designer)** - Create and design animated graphics templates
- **Pulsar GFX (Playout)** - Control and playout graphics in real-time

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm package manager
- Modern browser (Chrome, Firefox, Edge)

### Installation

```bash
# Clone the repository
git clone https://github.com/emergent-solutions/nova-gfx.git
cd nova-gfx

# Install dependencies
pnpm install

# Start Nova GFX (Designer)
pnpm dev:nova

# Start Pulsar GFX (Playout) - in a separate terminal
pnpm dev:pulsar
```

### Access the Applications

- **Nova GFX Designer**: http://localhost:5173
- **Pulsar GFX Playout**: http://localhost:5174

## Core Concepts

### Projects

Projects are the top-level containers for all your graphics. Each project has:
- Canvas dimensions (e.g., 1920x1080)
- Frame rate settings
- Design system (colors, fonts, spacing)
- Multiple templates organized in layers

### Templates

Templates are reusable graphic layouts. Each template contains:
- **Elements** - The visual building blocks (text, images, shapes, maps, etc.)
- **Animations** - Motion and transitions for each element
- **Content Fields** - Editable areas that can be updated at playout time

### Layers

Templates are organized into layers for compositing. Higher layers appear on top. Common layer setup:
- Layer 1: Lower thirds
- Layer 2: Bugs/logos
- Layer 3: Full-screen graphics
- Layer 4: Alerts/tickers

### Animation Phases

Every animation has three phases:
- **IN** - The entrance animation (how elements appear)
- **LOOP** - What happens while the graphic is on screen
- **OUT** - The exit animation (how elements disappear)

## Next Steps

- [Learn about Nova GFX Designer](/docs/apps/nova-gfx)
- [Explore Element Types](/docs/elements/overview)
- [Master Animations](/docs/animation/overview)
- [Set up OBS Integration](/docs/integration/obs)

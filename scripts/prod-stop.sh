#!/bin/bash

# Emergent Platform Monorepo - Production Stop Script
# Stops all running production services

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping Emergent Platform Production Environment...${NC}"
echo ""

# Function to stop a service by PID file
stop_service() {
    local service_name=$1
    local pid_file="$LOG_DIR/$service_name.pid"

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}Stopping $service_name (PID: $pid)...${NC}"
            kill "$pid" 2>/dev/null || true
            sleep 1
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null || true
            fi
            echo -e "${GREEN}✓ $service_name stopped${NC}"
        else
            echo -e "${YELLOW}$service_name already stopped${NC}"
        fi
        rm -f "$pid_file"
    fi
}

# Stop all services
SERVICES=(
    "nova"
    "pulsar"
    "nova-gfx"
    "pulsar-gfx"
    "nexus"
    "pulsar-vs"
    "pulsar-hub"
    "docs"
    "logrotate"
)

for service in "${SERVICES[@]}"; do
    stop_service "$service"
done

# Fallback: kill any remaining serve processes for this project
echo -e "${YELLOW}Cleaning up any remaining processes...${NC}"
pkill -f "serve.*GFXPlatform" 2>/dev/null || true

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   All production services stopped${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""

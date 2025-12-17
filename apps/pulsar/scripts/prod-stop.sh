#!/bin/bash

# Pulsar App - Production Stop Script (Local)
# Stops all production services

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🛑 Stopping Pulsar App (Production Mode)${NC}"

# Function to stop a service by PID file
stop_service() {
    local name="$1"
    local pid_file="$LOG_DIR/$2.pid"

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            echo -e "${GREEN}✓ Stopped $name (PID: $pid)${NC}"
        else
            echo -e "${YELLOW}○ $name was not running${NC}"
        fi
        rm -f "$pid_file"
    else
        echo -e "${YELLOW}○ No PID file for $name${NC}"
    fi
}

# Stop all services
stop_service "Production server" "serve"
stop_service "Log rotation watcher" "logrotate"

# Also kill any remaining processes by name (cleanup)
pkill -f "serve.*pulsar.*dist" 2>/dev/null || true
pkill -f "node.*serve.*5173" 2>/dev/null || true

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}   All production services stopped${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""

#!/bin/bash

# Emergent Platform - Production Start Script
# Builds and starts selected apps in production mode

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUPABASE_DIR="$PROJECT_ROOT/supabase"
LOG_DIR="$PROJECT_ROOT/logs"
LOGROTATE_CONF="$LOG_DIR/logrotate.conf"
LOGROTATE_STATE="$LOG_DIR/logrotate.state"

# Load .env file if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default ports (can be overridden via .env)
NOVA_PORT=${VITE_NOVA_PORT:-5173}
PULSAR_PORT=${VITE_PULSAR_PORT:-5174}
NOVA_GFX_PORT=${VITE_NOVA_GFX_PORT:-3000}
PULSAR_GFX_PORT=${VITE_PULSAR_GFX_PORT:-3001}
NEXUS_PORT=${VITE_NEXUS_PORT:-3002}
DOCS_PORT=${VITE_DOCS_PORT:-3003}
PULSAR_VS_PORT=${VITE_PULSAR_VS_PORT:-3004}
PULSAR_HUB_PORT=${VITE_PULSAR_HUB_PORT:-3005}

# Parse arguments
APPS_TO_START=()
START_ALL=false
SKIP_BUILD=false

show_help() {
    echo -e "${CYAN}Emergent Platform Production Start Script${NC}"
    echo ""
    echo "Usage: $0 [options] [apps...]"
    echo ""
    echo "Options:"
    echo "  --all           Start all apps"
    echo "  --skip-build    Skip the build step"
    echo "  -h, --help      Show this help message"
    echo ""
    echo "Available apps:"
    echo "  nova            Nova app (standalone)"
    echo "  pulsar          Pulsar app (standalone)"
    echo "  nova-gfx        Nova GFX (design tool)"
    echo "  pulsar-gfx      Pulsar GFX (control tool)"
    echo "  nexus           Nexus (central hub)"
    echo "  pulsar-vs       Pulsar VS (visual system)"
    echo "  pulsar-hub      Pulsar Hub"
    echo "  docs            Documentation site"
    echo ""
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            START_ALL=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            APPS_TO_START+=("$1")
            shift
            ;;
    esac
done

# If no apps specified and not --all, show help
if [ ${#APPS_TO_START[@]} -eq 0 ] && [ "$START_ALL" = false ]; then
    show_help
    exit 0
fi

if [ "$START_ALL" = true ]; then
    APPS_TO_START=("nova" "pulsar" "nova-gfx" "pulsar-gfx" "nexus" "pulsar-vs" "pulsar-hub" "docs")
fi

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Emergent Platform Production Environment${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Create logs directory
mkdir -p "$LOG_DIR"

# Check for serve package
if ! command -v serve &> /dev/null; then
    echo -e "${YELLOW}Installing serve package globally...${NC}"
    npm install -g serve
fi

# Setup logrotate (same as dev)
LOGROTATE_BIN=""
if command -v logrotate &> /dev/null; then
    LOGROTATE_BIN="logrotate"
elif [ -x /usr/sbin/logrotate ]; then
    LOGROTATE_BIN="/usr/sbin/logrotate"
elif [ -x /sbin/logrotate ]; then
    LOGROTATE_BIN="/sbin/logrotate"
fi

cat > "$LOGROTATE_CONF" << EOF
$LOG_DIR/*.log {
    size 100M
    rotate 3
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF

# Build and start apps
cd "$PROJECT_ROOT"

if [ "$SKIP_BUILD" = false ]; then
    echo -e "${YELLOW}Building apps...${NC}"
    for app in "${APPS_TO_START[@]}"; do
        echo -e "${YELLOW}Building $app...${NC}"
        pnpm run build --filter="$app" || true
    done
    echo -e "${GREEN}✓ Build complete${NC}"
fi

# Function to start a production app
start_prod_app() {
    local app_name=$1
    local port=$2
    local app_dir="$PROJECT_ROOT/apps/$app_name"
    local dist_dir="$app_dir/dist"

    if [ ! -d "$dist_dir" ]; then
        echo -e "${RED}✗ Dist directory not found: $dist_dir (run build first)${NC}"
        return 1
    fi

    echo -e "${YELLOW}Starting $app_name on port $port...${NC}"
    nohup serve -s "$dist_dir" -l "$port" > "$LOG_DIR/$app_name.log" 2>&1 &
    echo $! > "$LOG_DIR/$app_name.pid"
    echo -e "${GREEN}✓ $app_name started (PID: $(cat $LOG_DIR/$app_name.pid))${NC}"
}

# Start apps
for app in "${APPS_TO_START[@]}"; do
    case $app in
        nova)
            start_prod_app "nova" "$NOVA_PORT"
            ;;
        pulsar)
            start_prod_app "pulsar" "$PULSAR_PORT"
            ;;
        nova-gfx)
            start_prod_app "nova-gfx" "$NOVA_GFX_PORT"
            ;;
        pulsar-gfx)
            start_prod_app "pulsar-gfx" "$PULSAR_GFX_PORT"
            ;;
        nexus)
            start_prod_app "nexus" "$NEXUS_PORT"
            ;;
        pulsar-vs)
            start_prod_app "pulsar-vs" "$PULSAR_VS_PORT"
            ;;
        pulsar-hub)
            start_prod_app "pulsar-hub" "$PULSAR_HUB_PORT"
            ;;
        docs)
            start_prod_app "docs" "$DOCS_PORT"
            ;;
    esac
done

# Start logrotate watcher
if [ -n "$LOGROTATE_BIN" ]; then
    (
        while true; do
            sleep 60
            "$LOGROTATE_BIN" -s "$LOGROTATE_STATE" "$LOGROTATE_CONF" 2>/dev/null || true
        done
    ) &
    echo $! > "$LOG_DIR/logrotate.pid"
    echo -e "${GREEN}✓ Log rotation watcher started${NC}"
fi

sleep 2

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Production Environment Ready${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""

for app in "${APPS_TO_START[@]}"; do
    case $app in
        nova)
            echo -e "  Nova:          ${CYAN}http://localhost:$NOVA_PORT${NC}"
            ;;
        pulsar)
            echo -e "  Pulsar:        ${CYAN}http://localhost:$PULSAR_PORT${NC}"
            ;;
        nova-gfx)
            echo -e "  Nova GFX:      ${CYAN}http://localhost:$NOVA_GFX_PORT${NC}"
            ;;
        pulsar-gfx)
            echo -e "  Pulsar GFX:    ${CYAN}http://localhost:$PULSAR_GFX_PORT${NC}"
            ;;
        nexus)
            echo -e "  Nexus:         ${CYAN}http://localhost:$NEXUS_PORT${NC}"
            ;;
        pulsar-vs)
            echo -e "  Pulsar VS:     ${CYAN}http://localhost:$PULSAR_VS_PORT${NC}"
            ;;
        pulsar-hub)
            echo -e "  Pulsar Hub:    ${CYAN}http://localhost:$PULSAR_HUB_PORT${NC}"
            ;;
        docs)
            echo -e "  Docs:          ${CYAN}http://localhost:$DOCS_PORT${NC}"
            ;;
    esac
done

echo ""
echo -e "  Logs:          ${YELLOW}$LOG_DIR/${NC}"
echo ""
echo -e "  Stop with:     ${YELLOW}pnpm run prod:stop${NC}"
echo ""

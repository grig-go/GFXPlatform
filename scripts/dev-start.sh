#!/bin/bash

# Emergent Platform - Development Start Script
# Starts Supabase, functions, and selected apps with logging and rotation

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
PULSAR_MCR_PORT=${VITE_PULSAR_MCR_PORT:-5174}
NOVA_GFX_PORT=${VITE_NOVA_GFX_PORT:-3000}
PULSAR_GFX_PORT=${VITE_PULSAR_GFX_PORT:-3001}
NEXUS_PORT=${VITE_NEXUS_PORT:-3002}
DOCS_PORT=${VITE_DOCS_PORT:-3003}
PULSAR_VS_PORT=${VITE_PULSAR_VS_PORT:-3004}
PULSAR_HUB_PORT=${VITE_PULSAR_HUB_PORT:-3005}
FILE_SERVER_PORT=${VITE_FILE_SERVER_PORT:-8001}
TLS_PROXY_PORT=${VITE_TLS_PROXY_PORT:-8002}

# Parse arguments
APPS_TO_START=()
START_ALL=false
START_SUPABASE=true
START_FILE_SERVER=false
START_TLS_PROXY=false

show_help() {
    echo -e "${CYAN}Emergent Platform Development Start Script${NC}"
    echo ""
    echo "Usage: $0 [options] [apps...]"
    echo ""
    echo "Options:"
    echo "  --all           Start all apps"
    echo "  --no-supabase   Don't start Supabase"
    echo "  --file-server   Start the file server"
    echo "  --tls-proxy     Start the TLS proxy"
    echo "  -h, --help      Show this help message"
    echo ""
    echo "Available apps:"
    echo "  nova            Nova app (standalone)"
    echo "  pulsar-mcr      Pulsar MCR app (standalone)"
    echo "  nova-gfx        Nova GFX (design tool)"
    echo "  pulsar-gfx      Pulsar GFX (control tool)"
    echo "  nexus           Nexus (central hub)"
    echo "  pulsar-vs       Pulsar VS (visual system)"
    echo "  pulsar-hub      Pulsar Hub"
    echo "  docs            Documentation site"
    echo ""
    echo "Examples:"
    echo "  $0 nova pulsar-mcr       # Start Nova and Pulsar MCR"
    echo "  $0 --all                 # Start all apps"
    echo "  $0 nova --file-server    # Start Nova with file server"
    echo ""
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            START_ALL=true
            shift
            ;;
        --no-supabase)
            START_SUPABASE=false
            shift
            ;;
        --file-server)
            START_FILE_SERVER=true
            shift
            ;;
        --tls-proxy)
            START_TLS_PROXY=true
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

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Emergent Platform Development Environment${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Create logs directory
mkdir -p "$LOG_DIR"

# Find logrotate binary (check common locations)
LOGROTATE_BIN=""
if command -v logrotate &> /dev/null; then
    LOGROTATE_BIN="logrotate"
elif [ -x /usr/sbin/logrotate ]; then
    LOGROTATE_BIN="/usr/sbin/logrotate"
elif [ -x /sbin/logrotate ]; then
    LOGROTATE_BIN="/sbin/logrotate"
fi

# Install logrotate if not found
if [ -z "$LOGROTATE_BIN" ]; then
    echo -e "${YELLOW}Installing logrotate...${NC}"
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y logrotate
    elif command -v yum &> /dev/null; then
        sudo yum install -y logrotate
    elif command -v pacman &> /dev/null; then
        sudo pacman -S --noconfirm logrotate
    elif command -v brew &> /dev/null; then
        brew install logrotate
    else
        echo -e "${RED}Could not install logrotate. Please install it manually.${NC}"
    fi
    # Re-check after install
    if command -v logrotate &> /dev/null; then
        LOGROTATE_BIN="logrotate"
    elif [ -x /usr/sbin/logrotate ]; then
        LOGROTATE_BIN="/usr/sbin/logrotate"
    fi
fi

# Create logrotate config
cat > "$LOGROTATE_CONF" << EOF
# Logrotate configuration for Emergent Platform
# Max 100MB per log, 500MB total (5 logs x 100MB max)

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

# Run logrotate to check/rotate logs
run_logrotate() {
    if [ -n "$LOGROTATE_BIN" ]; then
        "$LOGROTATE_BIN" -s "$LOGROTATE_STATE" "$LOGROTATE_CONF" 2>/dev/null || true
    fi
}

# Initial log rotation check
echo -e "${YELLOW}Checking log rotation...${NC}"
run_logrotate
echo -e "${GREEN}✓ Log rotation configured${NC}"

# Start background logrotate watcher (every 60 seconds)
start_logrotate_watcher() {
    (
        while true; do
            sleep 60
            "$LOGROTATE_BIN" -s "$LOGROTATE_STATE" "$LOGROTATE_CONF" 2>/dev/null || true
        done
    ) &
    echo $! > "$LOG_DIR/logrotate.pid"
}

# Function to check if Supabase is running
check_supabase() {
    cd "$SUPABASE_DIR"
    if supabase status > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Start Supabase if requested
if [ "$START_SUPABASE" = true ]; then
    echo -e "${YELLOW}Checking Supabase status...${NC}"
    if check_supabase; then
        echo -e "${GREEN}✓ Supabase is already running${NC}"
    else
        echo -e "${YELLOW}Starting Supabase...${NC}"
        cd "$SUPABASE_DIR"
        supabase start
        echo -e "${GREEN}✓ Supabase started${NC}"
    fi

    # Start Supabase functions in background
    echo -e "${YELLOW}Starting Supabase functions...${NC}"
    cd "$SUPABASE_DIR"
    nohup supabase functions serve > "$LOG_DIR/functions.log" 2>&1 &
    echo $! > "$LOG_DIR/functions.pid"
    echo -e "${GREEN}✓ Supabase functions started (PID: $(cat $LOG_DIR/functions.pid))${NC}"
fi

# Function to start an app
start_app() {
    local app_name=$1
    local port=$2
    local app_dir="$PROJECT_ROOT/apps/$app_name"

    if [ ! -d "$app_dir" ]; then
        echo -e "${RED}✗ App directory not found: $app_dir${NC}"
        return 1
    fi

    echo -e "${YELLOW}Starting $app_name on port $port...${NC}"
    cd "$app_dir"
    VITE_PORT=$port nohup pnpm run dev > "$LOG_DIR/$app_name.log" 2>&1 &
    echo $! > "$LOG_DIR/$app_name.pid"
    echo -e "${GREEN}✓ $app_name started (PID: $(cat $LOG_DIR/$app_name.pid))${NC}"
}

# Start file server if requested (for Nova)
if [ "$START_FILE_SERVER" = true ]; then
    if [ -d "$PROJECT_ROOT/apps/nova/file-server" ]; then
        echo -e "${YELLOW}Starting file server...${NC}"
        cd "$PROJECT_ROOT/apps/nova"
        PORT=$FILE_SERVER_PORT nohup pnpm run dev:file-server > "$LOG_DIR/file-server.log" 2>&1 &
        echo $! > "$LOG_DIR/file-server.pid"
        echo -e "${GREEN}✓ File server started (PID: $(cat $LOG_DIR/file-server.pid))${NC}"
    fi
fi

# Start TLS proxy if requested (for Nova)
if [ "$START_TLS_PROXY" = true ]; then
    if [ -d "$PROJECT_ROOT/apps/nova/legacy-tls-proxy" ]; then
        echo -e "${YELLOW}Starting legacy TLS proxy...${NC}"
        cd "$PROJECT_ROOT/apps/nova"
        PORT=$TLS_PROXY_PORT nohup pnpm run dev:legacy-tls-proxy > "$LOG_DIR/proxy.log" 2>&1 &
        echo $! > "$LOG_DIR/proxy.pid"
        echo -e "${GREEN}✓ Legacy TLS proxy started (PID: $(cat $LOG_DIR/proxy.pid))${NC}"
    fi
fi

# Start requested apps
cd "$PROJECT_ROOT"

if [ "$START_ALL" = true ]; then
    APPS_TO_START=("nova" "pulsar-mcr" "nova-gfx" "pulsar-gfx" "nexus" "pulsar-vs" "pulsar-hub" "docs")
fi

for app in "${APPS_TO_START[@]}"; do
    case $app in
        nova)
            start_app "nova" "$NOVA_PORT"
            ;;
        pulsar-mcr)
            start_app "pulsar-mcr" "$PULSAR_MCR_PORT"
            ;;
        nova-gfx)
            start_app "nova-gfx" "$NOVA_GFX_PORT"
            ;;
        pulsar-gfx)
            start_app "pulsar-gfx" "$PULSAR_GFX_PORT"
            ;;
        nexus)
            start_app "nexus" "$NEXUS_PORT"
            ;;
        pulsar-vs)
            start_app "pulsar-vs" "$PULSAR_VS_PORT"
            ;;
        pulsar-hub)
            start_app "pulsar-hub" "$PULSAR_HUB_PORT"
            ;;
        docs)
            start_app "docs" "$DOCS_PORT"
            ;;
        *)
            echo -e "${RED}Unknown app: $app${NC}"
            ;;
    esac
done

# Start logrotate watcher
if [ -n "$LOGROTATE_BIN" ]; then
    echo -e "${YELLOW}Starting log rotation watcher...${NC}"
    start_logrotate_watcher
    echo -e "${GREEN}✓ Log rotation watcher started (PID: $(cat $LOG_DIR/logrotate.pid))${NC}"
fi

# Wait a moment for services to start
sleep 2

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Development Environment Ready${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Show started apps
for app in "${APPS_TO_START[@]}"; do
    case $app in
        nova)
            echo -e "  Nova:          ${CYAN}http://localhost:$NOVA_PORT${NC}"
            ;;
        pulsar-mcr)
            echo -e "  Pulsar MCR:    ${CYAN}http://localhost:$PULSAR_MCR_PORT${NC}"
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

if [ "$START_SUPABASE" = true ]; then
    echo ""
    echo -e "  Supabase:      ${CYAN}http://localhost:54321${NC}"
    echo -e "  Studio:        ${CYAN}http://localhost:54323${NC}"
fi

if [ "$START_FILE_SERVER" = true ]; then
    echo -e "  File Server:   ${CYAN}http://localhost:$FILE_SERVER_PORT${NC}"
fi

if [ "$START_TLS_PROXY" = true ]; then
    echo -e "  TLS Proxy:     ${CYAN}http://localhost:$TLS_PROXY_PORT${NC}"
fi

echo ""
echo -e "  Logs:          ${YELLOW}$LOG_DIR/${NC}"
echo -e "  Max size:      ${YELLOW}100MB per log, 500MB total${NC}"
echo ""
echo -e "  Stop with:     ${YELLOW}pnpm run dev:stop${NC}"
echo ""

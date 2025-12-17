#!/bin/bash

# Nova App - Development Start Script
# Starts Supabase, functions, and dev server

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUPABASE_DIR="$PROJECT_ROOT/src/supabase"
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
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Nova App (Development Mode)${NC}"

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

# Create logrotate config (always regenerate to ensure correct path)
cat > "$LOGROTATE_CONF" << EOF
# Logrotate configuration for Nova App
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
echo -e "${GREEN}✓ Log rotation complete${NC}"

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

# Start Supabase if not running
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

# Start file server in background
echo -e "${YELLOW}Starting file server...${NC}"
cd "$PROJECT_ROOT"
nohup npm run dev:file-server > "$LOG_DIR/file-server.log" 2>&1 &
echo $! > "$LOG_DIR/file-server.pid"
echo -e "${GREEN}✓ File server started (PID: $(cat $LOG_DIR/file-server.pid))${NC}"

# Start legacy TLS proxy in background
echo -e "${YELLOW}Starting legacy TLS proxy...${NC}"
cd "$PROJECT_ROOT"
nohup npm run dev:legacy-tls-proxy > "$LOG_DIR/proxy.log" 2>&1 &
echo $! > "$LOG_DIR/proxy.pid"
echo -e "${GREEN}✓ Legacy TLS proxy started (PID: $(cat $LOG_DIR/proxy.pid))${NC}"

# Start Vite dev server in background
echo -e "${YELLOW}Starting Vite dev server...${NC}"
cd "$PROJECT_ROOT"
nohup npm run dev > "$LOG_DIR/vite.log" 2>&1 &
echo $! > "$LOG_DIR/vite.pid"
echo -e "${GREEN}✓ Vite dev server started (PID: $(cat $LOG_DIR/vite.pid))${NC}"

# Start logrotate watcher
if [ -n "$LOGROTATE_BIN" ]; then
    echo -e "${YELLOW}Starting log rotation watcher...${NC}"
    start_logrotate_watcher
    echo -e "${GREEN}✓ Log rotation watcher started (PID: $(cat $LOG_DIR/logrotate.pid))${NC}"
fi

# Wait a moment for services to start
sleep 2

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}   Nova App Development Environment Ready${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "  Frontend:    ${YELLOW}http://localhost:${VITE_PORT:-5173}${NC}"
echo -e "  Supabase:    ${YELLOW}http://localhost:54321${NC}"
echo -e "  Studio:      ${YELLOW}http://localhost:54323${NC}"
echo -e "  File Server: ${YELLOW}http://localhost:8001${NC}"
echo -e "  TLS Proxy:   ${YELLOW}http://localhost:8002${NC}"
echo ""
echo -e "  Logs:        ${YELLOW}$LOG_DIR/${NC}"
echo -e "  Max size:    ${YELLOW}100MB per log, 500MB total${NC}"
echo ""
echo -e "  Stop with:   ${YELLOW}npm run dev:stop${NC}"
echo ""

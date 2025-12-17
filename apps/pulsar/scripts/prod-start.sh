#!/bin/bash

# Pulsar App - Production Start Script (Local)
# Builds and serves production bundle

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
BUILD_DIR="$PROJECT_ROOT/dist"
LOGROTATE_CONF="$LOG_DIR/logrotate.conf"
LOGROTATE_STATE="$LOG_DIR/logrotate.state"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Pulsar App (Production Mode - Local)${NC}"

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
# Logrotate configuration for Pulsar App
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

# Build production bundle
echo -e "${YELLOW}Building production bundle...${NC}"
cd "$PROJECT_ROOT"
npm run build
echo -e "${GREEN}✓ Production build complete${NC}"

# Check if 'serve' is installed, install if not
if ! command -v serve &> /dev/null; then
    echo -e "${YELLOW}Installing 'serve' package...${NC}"
    npm install -g serve
fi

# Start production server in background
echo -e "${YELLOW}Starting production server...${NC}"
cd "$PROJECT_ROOT"
nohup serve "$BUILD_DIR" -l 5173 > "$LOG_DIR/serve.log" 2>&1 &
echo $! > "$LOG_DIR/serve.pid"
echo -e "${GREEN}✓ Production server started (PID: $(cat $LOG_DIR/serve.pid))${NC}"

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
echo -e "${GREEN}   Pulsar App Production Environment Ready${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "  Frontend:    ${YELLOW}http://localhost:5173${NC}"
echo ""
echo -e "  Logs:        ${YELLOW}$LOG_DIR/${NC}"
echo -e "  Max size:    ${YELLOW}100MB per log, 500MB total${NC}"
echo ""
echo -e "  Stop with:   ${YELLOW}npm run prod:stop${NC}"
echo ""

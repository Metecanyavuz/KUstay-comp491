#!/bin/bash
set -e

# --- Robust Path Resolution ---
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
cd "$PROJECT_ROOT"

# Configuration
CONTAINER_NAME="local_postgres"
ENV_FILE=".env"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() { printf "${BLUE}[DEV]${NC} %s\n" "$1"; }
success() { printf "${GREEN}[SUCCESS]${NC} %s\n" "$1"; }
error() { printf "${RED}[ERROR]${NC} %s\n" "$1"; }

# --- 1. Database Check ---
log "Checking database container '$CONTAINER_NAME'..."
if [ "$(docker ps -q -f name=^/${CONTAINER_NAME}$)" ]; then
    success "Database container is running."
elif [ "$(docker ps -aq -f status=exited -f name=^/${CONTAINER_NAME}$)" ]; then
    log "Container exists but is stopped. Starting it..."
    docker start "$CONTAINER_NAME" > /dev/null
    success "Database container started."
else
    log "Container '$CONTAINER_NAME' does not exist."
    log "Run './scripts/sync_db.sh' first to set up the local database."
    # We don't exit here strictly, but it might fail later. 
    # The prompt asked to "Start it" if stopped. If it doesn't exist, we can't start it easily without parameters.
    # Assuming it exists or the user ran sync_db.sh previously as implied.
    error "Please run ./scripts/sync_db.sh to create the database container first."
    exit 1
fi

# --- 2. Environment Setup ---
if [ -f "$ENV_FILE" ]; then
    # We won't export everything, just check/notify
    DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d '=' -f2-)
    if [[ $DB_URL != *"localhost"* ]] && [[ $DB_URL != *"127.0.0.1"* ]]; then
        log "${RED}WARNING: DATABASE_URL in .env does not look like localhost!${NC}"
        log "Current value: $DB_URL"
        log "Your local apps might connect to the REMOTE database."
        read -p "Continue anyway? (y/N) " confirm
        if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
            exit 1
        fi
    fi
else
    log "No .env file found. Apps might use default settings."
fi

# --- 2.5 Auto-Activate Virtual Environment ---
if [ -z "$VIRTUAL_ENV" ]; then
    log "No active virtual environment detected."
    if [ -f "venv/bin/activate" ]; then
        log "Found 'venv' directory. Activating..."
        source venv/bin/activate
    elif [ -f ".venv/bin/activate" ]; then
        log "Found '.venv' directory. Activating..."
        source .venv/bin/activate
    else
        log "${RED}WARNING: No 'venv' or '.venv' found. Using system Python.${NC}"
        log "If you have a named Conda env, please activate it manually first."
    fi
else
    log "Using active virtual environment: $VIRTUAL_ENV"
fi

# --- 3. Process Management Setup ---
# Function to kill processes on exit
cleanup() {
    echo ""
    log "Stopping background processes..."
    if [ -n "$DJANGO_PID" ]; then
        kill "$DJANGO_PID" 2>/dev/null || true
        log "Stopped Django (PID $DJANGO_PID)"
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
        log "Stopped Frontend (PID $FRONTEND_PID)"
    fi
    exit
}

# Trap SIGINT (Ctrl+C)
trap cleanup SIGINT

# --- 4. Start Backend ---
log "Starting Django backend..."
# Check if Django is installed/available
if ! python -c "import django" 2>/dev/null; then
    error "Django module not found! Are you in the correct virtual environment?"
    error "Current Python: $(which python)"
    exit 1
fi

python manage.py runserver &
DJANGO_PID=$!
success "Django started with PID $DJANGO_PID"

# --- 5. Start Frontend ---
log "Starting Frontend..."
if [ -d "frontend" ]; then
    (cd frontend && npm start) &
    FRONTEND_PID=$!
    success "Frontend started with PID $FRONTEND_PID"
else
    error "Frontend directory not found!"
fi

# --- 6. Wait ---
log "Development environment is running. Press Ctrl+C to stop."
wait

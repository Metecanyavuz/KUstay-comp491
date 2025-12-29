#!/bin/bash
set -e

# --- Robust Path Resolution ---
# This identifies the directory where the script is located
# and sets the project root as the parent of that directory.
SCRIPT_PATH="$0"
# Handle cases where $0 might be a relative path or just the filename
SCRIPT_DIR=$(cd "$(dirname "$SCRIPT_PATH")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)

# Change to project root so we can find .env
cd "$PROJECT_ROOT" || exit 1

# Configuration
CONTAINER_NAME="local_postgres"
LOCAL_PORT="5432"
LOCAL_USER="postgres"
LOCAL_PASS="postgres"
LOCAL_DB="postgres"
ENV_FILE=".env"

# --- Logging Setup ---
# Avoid 'echo -e' as it behaves differently across shells (bash/zsh/sh)
log() { printf "[\033[0;34mSYNC\033[0m] %s\n" "$1"; }
success() { printf "[\033[0;32mSUCCESS\033[0m] %s\n" "$1"; }
error() { 
    printf "[\033[0;31mERROR\033[0m] %s\n" "$1" >&2
    exit 1
}

log "Working directory: $(pwd)"

# 1. Read Config
log "Checking for $ENV_FILE in $PROJECT_ROOT..."
if [ ! -f "$ENV_FILE" ]; then
    echo "----------------------------------------------------------------"
    error "File $ENV_FILE not found in $PROJECT_ROOT"
    echo "Tip: Make sure you have created your .env file from .env.example"
    echo "----------------------------------------------------------------"
fi

log "Reading configuration from $ENV_FILE..."
# Extract DATABASE_URL using grep to avoid sourcing
# Assumes DATABASE_URL=value format
REMOTE_DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)

if [ -z "$REMOTE_DB_URL" ]; then
    error "DATABASE_URL not found in $ENV_FILE"
fi

if [[ "$REMOTE_DB_URL" == *"localhost"* ]] || [[ "$REMOTE_DB_URL" == *"127.0.0.1"* ]]; then
    error "DATABASE_URL in .env seems to be local already. Please point it to your remote DB for syncing."
fi

log "Remote database URL found."

# 2. Docker Setup
log "Checking for existing container '$CONTAINER_NAME'..."
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log "Removing existing container..."
    docker rm -f "$CONTAINER_NAME" > /dev/null
fi

log "Starting new PostgreSQL container on port $LOCAL_PORT..."
docker run -d \
    --name "$CONTAINER_NAME" \
    -p "${LOCAL_PORT}:5432" \
    -e POSTGRES_PASSWORD="$LOCAL_PASS" \
    -e POSTGRES_DB="$LOCAL_DB" \
    postgres:latest > /dev/null

log "Waiting for PostgreSQL to be ready..."
until docker exec "$CONTAINER_NAME" pg_isready -U "$LOCAL_USER" > /dev/null 2>&1; do
    printf "."
    sleep 1
done
printf "\n"
success "Local PostgreSQL container is ready!"

# 3. Data Transfer
log "Starting data dump and restore (Remote -> Local)..."
log "Note: This requires Docker to be running and network access to remote DB."

# We use a temporary postgres container to run pg_dump so the user doesn't need local postgres tools
# We pipe the output directly to the local container
if ! docker run --rm -i postgres:latest pg_dump "$REMOTE_DB_URL" --no-owner --no-acl --clean --if-exists | \
     docker exec -i "$CONTAINER_NAME" psql -U "$LOCAL_USER" -d "$LOCAL_DB" > /dev/null 2>&1; then
    error "Failed to transfer data. Please check your REMOTE_DB_URL and internet connection."
fi

success "Data migration completed!"

# 4. Config Update Info
LOCAL_CONN_STRING="postgres://${LOCAL_USER}:${LOCAL_PASS}@localhost:${LOCAL_PORT}/${LOCAL_DB}"

echo ""
echo "----------------------------------------------------------------"
success "Done! Your local database is synchronized."
echo "----------------------------------------------------------------"
echo "You can now update your .env file with:"
echo ""
printf "DATABASE_URL=%s\n" "$LOCAL_CONN_STRING"
echo ""
echo "----------------------------------------------------------------"

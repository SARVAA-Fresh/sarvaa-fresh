#!/bin/bash
# SARVAA Fresh — PostgreSQL Database Backup Script
# Version: 1.0
# Usage: ./backup.sh [output_directory]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${1:-$SCRIPT_DIR/backups}"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.production.yml"
CONTAINER_NAME="infrastructure-postgres-1"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Generate timestamped backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/sarvaa_fresh_${TIMESTAMP}.sql.gz"

echo "========================================"
echo "SARVAA Fresh — Database Backup"
echo "========================================"
echo ""

# Verify docker-compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "ERROR: docker-compose.production.yml not found at: $COMPOSE_FILE"
    exit 1
fi

# Load environment variables from .env.production
if [ -f "$PROJECT_ROOT/.env.production" ]; then
    echo "Loading environment from .env.production..."
    set -a
    source "$PROJECT_ROOT/.env.production"
    set +a
else
    echo "WARNING: .env.production not found. Using defaults from docker-compose file."
fi

# Database configuration with defaults
DB_USER="${POSTGRES_USER:-sarvaa}"
DB_NAME="${POSTGRES_DB:-sarvaa_fresh}"

echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Container: $CONTAINER_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""

# Verify container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "ERROR: PostgreSQL container '$CONTAINER_NAME' is not running."
    echo "Start it with: docker compose -f $COMPOSE_FILE up -d postgres"
    exit 1
fi

# Check if pg_dump is available in container
echo "Verifying pg_dump availability..."
if ! docker exec "$CONTAINER_NAME" which pg_dump > /dev/null 2>&1; then
    echo "ERROR: pg_dump not found in container. Ensure postgres image includes client tools."
    exit 1
fi

# Perform backup using pg_dump inside the container
echo "Creating database backup..."

# Use a temporary file for the SQL dump to keep stdout clean
TEMP_SQL=$(mktemp)
trap 'rm -f "$TEMP_SQL"' EXIT

# Capture stdout (SQL) to temp file, let stderr (diagnostics) go to terminal
if ! docker exec "$CONTAINER_NAME" pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-acl \
    --verbose \
    > "$TEMP_SQL"; then
    echo "ERROR: pg_dump failed. Backup aborted." >&2
    exit 1
fi

# Compress the SQL dump
if ! gzip -c "$TEMP_SQL" > "$BACKUP_FILE"; then
    echo "ERROR: Compression failed. Removing partial backup." >&2
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Verify gzip integrity
if ! gzip -t "$BACKUP_FILE"; then
    echo "ERROR: Backup file integrity check failed. Removing corrupt file." >&2
    rm -f "$BACKUP_FILE"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo ""
echo "========================================"
echo "Backup completed successfully!"
echo "========================================"
echo "File: $BACKUP_FILE"
echo "Size: $BACKUP_SIZE"
echo ""

# Optional: Keep only last 7 backups
echo "Cleaning up old backups (keeping last 7)..."
ls -t "$BACKUP_DIR"/sarvaa_fresh_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm -f

echo "Done."
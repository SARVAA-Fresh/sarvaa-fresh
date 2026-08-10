#!/bin/bash
# SARVAA Fresh — PostgreSQL Database Restore Script
# Version: 1.0
# Usage: ./restore.sh <backup_file> [target_database]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.production.yml"
CONTAINER_NAME="infrastructure-postgres-1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validate arguments
if [ $# -lt 1 ]; then
    echo "ERROR: Backup file not specified."
    echo "Usage: $0 <backup_file> [target_database]"
    echo ""
    echo "Example:"
    echo "  $0 ./backups/sarvaa_fresh_20260109_120000.sql.gz"
    echo "  $0 ./backups/sarvaa_fresh_20260109_120000.sql.gz sarvaa_fresh_restore"
    exit 1
fi

BACKUP_FILE="$1"
TARGET_DB="${2:-sarvaa_fresh}"

echo "========================================"
echo "SARVAA Fresh — Database Restore"
echo "========================================"
echo ""

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup file: $BACKUP_FILE"
echo "Backup size: $BACKUP_SIZE"
echo "Target database: $TARGET_DB"
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

# Warn if targeting production database
if [ "$TARGET_DB" = "$DB_NAME" ]; then
    echo -e "${RED}WARNING: You are about to restore to the PRODUCTION database '$DB_NAME'.${NC}"
    echo -e "${RED}This will OVERWRITE all existing data.${NC}"
    echo ""
    read -p "Are you absolutely sure? Type 'yes' to continue: " -r
    echo ""
    if [[ ! $REPLY =~ ^yes$ ]]; then
        echo "Restore cancelled."
        exit 0
    fi
fi

# Verify container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "ERROR: PostgreSQL container '$CONTAINER_NAME' is not running."
    echo "Start it with: docker compose -f $COMPOSE_FILE up -d postgres"
    exit 1
fi

# Check if psql is available in container
echo "Verifying PostgreSQL client tools..."
if ! docker exec "$CONTAINER_NAME" which psql > /dev/null 2>&1; then
    echo "ERROR: psql not found in container. Ensure postgres image includes client tools."
    exit 1
fi

# Create temporary restore database if target is different from production
RESTORE_DB_CREATED=false
if [ "$TARGET_DB" != "$DB_NAME" ]; then
    echo "Creating temporary restore database: $TARGET_DB"
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$TARGET_DB\";" > /dev/null 2>&1 || true
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$TARGET_DB\";" > /dev/null 2>&1
    RESTORE_DB_CREATED=true
    echo "Temporary database created."
    echo ""
fi

# Perform restore
echo "Restoring backup to database: $TARGET_DB"
echo "This may take a moment..."
echo ""

# Detect compression and restore accordingly
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$TARGET_DB" --set ON_ERROR_STOP=on
else
    cat "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$TARGET_DB" --set ON_ERROR_STOP=on
fi

# Verify restore
echo ""
echo "Verifying restore..."
TABLE_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$TARGET_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d '[:space:]')

if [ -z "$TABLE_COUNT" ] || [ "$TABLE_COUNT" = "0" ]; then
    echo -e "${RED}ERROR: Restore verification failed. No tables found in database.${NC}"
    if [ "$RESTORE_DB_CREATED" = true ]; then
        echo "Cleaning up temporary database..."
        docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$TARGET_DB\";" > /dev/null 2>&1 || true
    fi
    exit 1
fi

echo -e "${GREEN}Restore verified successfully!${NC}"
echo "Tables restored: $TABLE_COUNT"

# Show sample data if available
echo ""
echo "Sample data from key tables:"
echo "---------------------------"

# Check users count
USERS_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$TARGET_DB" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d '[:space:]' || echo "0")
echo "Users: $USERS_COUNT"

# Check products count
PRODUCTS_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$TARGET_DB" -t -c "SELECT COUNT(*) FROM products;" 2>/dev/null | tr -d '[:space:]' || echo "0")
echo "Products: $PRODUCTS_COUNT"

# Check orders count
ORDERS_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$TARGET_DB" -t -c "SELECT COUNT(*) FROM orders;" 2>/dev/null | tr -d '[:space:]' || echo "0")
echo "Orders: $ORDERS_COUNT"

echo ""
echo "========================================"
echo -e "${GREEN}Restore completed successfully!${NC}"
echo "========================================"
echo "Database: $TARGET_DB"
echo "Tables: $TABLE_COUNT"
echo ""

# Cleanup temporary database if created
if [ "$RESTORE_DB_CREATED" = true ]; then
    echo "IMPORTANT: This was a temporary restore database."
    echo "To clean up:"
    echo "  docker exec $CONTAINER_NAME psql -U $DB_USER -d postgres -c \"DROP DATABASE \\\"$TARGET_DB\\\";\""
    echo ""
    echo "To promote this to production (if needed):"
    echo "  1. Stop the application"
    echo "  2. Update POSTGRES_DB in .env.production to: $TARGET_DB"
    echo "  3. Restart the application"
fi

echo ""
echo "Next steps:"
echo "  1. Verify application functionality"
echo "  2. Check critical data integrity"
echo "  3. Run application tests if available"
echo ""
# SARVAA Fresh — Database Backup & Restore

**Version:** 1.0
**Last Updated:** 2026-08-09
**Database:** PostgreSQL 16+
**Backup Tool:** `pg_dump`

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Security Considerations](#security-considerations)
4. [Backup Procedure](#backup-procedure)
5. [Restore Procedure](#restore-procedure)
6. [Verification Steps](#verification-steps)
7. [Troubleshooting](#troubleshooting)
8. [Automation](#automation)

---

## Overview

This document describes the PostgreSQL backup and restore procedure for SARVAA Fresh.

The procedure provides:
- Recoverable database backups before and during deployment
- Verified restore capability into a separate temporary database
- Schema and data validation
- Automatic cleanup of old backups

---

## Prerequisites

### Required Software
- Docker and Docker Compose
- PostgreSQL client tools (included in the container)
- Bash shell (Linux/macOS/WSL)

### Required Access
- Access to `.env.production` file
- Docker container permissions
- PostgreSQL database credentials

### Container Details
- **Database:** `sarvaa_fresh`
- **Container:** `infrastructure-postgres-1`
- **PostgreSQL Version:** 16.14+
- **Port:** 5432

---

## Security Considerations

### Critical Rules

1. **Never commit database backups to Git**
   - Backups contain sensitive customer data
   - Already excluded via `.gitignore`

2. **Never store database passwords in documentation**
   - Use `.env.production` for credentials
   - Scripts load environment variables at runtime

3. **Never place `.env.production` inside backup directories**
   - Keep secrets separate from data

4. **Store production backups outside the application source tree when possible**
   - Use dedicated backup storage
   - Consider off-site/cloud storage

5. **A backup stored only on the same machine as the database does not protect against loss of that machine**
   - Copy backups to independent storage
   - Use cloud storage or remote servers

### Current `.gitignore` Configuration

```gitignore
# Database backups
backups/
*.sql
*.dump
```

---

## Backup Procedure

### Quick Start

```bash
cd infrastructure
./backup.sh
```

### With Custom Directory

```bash
cd infrastructure
./backup.sh /path/to/backup/directory
```

### What the Script Does

1. Loads environment variables from `.env.production`
2. Verifies PostgreSQL container is running
3. Checks for `pg_dump` availability
4. Creates a timestamped, compressed SQL backup
5. Verifies the backup file was created
6. Cleans up old backups (keeps last 7)

### Backup File Naming

```
sarvaa_fresh_YYYYMMDD_HHMMSS.sql.gz
```

Example: `sarvaa_fresh_20260109_143052.sql.gz`

### Backup Location

Default: `infrastructure/backups/`

### Backup Options

The script uses these `pg_dump` options:

| Option | Purpose |
|--------|---------|
| `--format=plain` | Human-readable SQL |
| `--no-owner` | Skip ownership commands (portable across environments) |
| `--no-acl` | Skip access control commands |
| `--verbose` | Detailed output |

### Retention Policy

By default, the script keeps the last 7 backups. Modify this by editing the `tail -n +8` line in `backup.sh`.

---

## Restore Procedure

### Quick Start

```bash
cd infrastructure
./restore.sh ./backups/sarvaa_fresh_20260109_143052.sql.gz
```

### Restore to Temporary Database (Recommended)

```bash
cd infrastructure
./restore.sh ./backups/sarvaa_fresh_20260109_143052.sql.gz sarvaa_fresh_restore
```

This creates a temporary database named `sarvaa_fresh_restore` for verification.

### Restore to Production Database

```bash
cd infrastructure
./restore.sh ./backups/sarvaa_fresh_20260109_143052.sql.gz sarvaa_fresh
```

⚠️ **WARNING:** This will overwrite all production data. The script requires explicit confirmation.

### What the Script Does

1. Validates the backup file exists
2. Loads environment variables from `.env.production`
3. Warns if targeting production database (requires confirmation)
4. Verifies PostgreSQL container is running
5. Creates temporary database if target differs from production
6. Restores the backup
7. Verifies the restore by counting tables
8. Shows sample data from key tables
9. Provides cleanup instructions if temporary database was created

---

## Verification Steps

### After Backup

1. **Check backup file exists and has content**
   ```bash
   ls -lh infrastructure/backups/sarvaa_fresh_*.sql.gz
   ```

2. **Verify backup integrity**
   ```bash
   gunzip -c infrastructure/backups/sarvaa_fresh_*.sql.gz | head -20
   ```

3. **Test restore to temporary database** (see Restore Procedure)

### After Restore

The restore script automatically:

1. **Counts tables restored**
   - Verifies schema was recreated
   - Reports table count

2. **Shows sample data**
   - Users count
   - Products count
   - Orders count

3. **Validates data integrity**
   - Confirms tables are populated
   - Fails if no tables found

### Manual Verification

Connect to the restored database:

```bash
# Get container name
CONTAINER_NAME="infrastructure-postgres-1"

# Connect to temporary database
docker exec -it $CONTAINER_NAME psql -U sarvaa -d sarvaa_fresh_restore

# Run verification queries
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM order_items;
```

### Prisma Verification

After restore, verify Prisma can connect:

```bash
cd backend
npx prisma migrate status
npx prisma studio  # Optional: visual inspection
```

---

## Troubleshooting

### Container Not Running

**Error:** `PostgreSQL container 'infrastructure-postgres-1' is not running`

**Solution:**
```bash
cd infrastructure
docker compose -f docker-compose.production.yml up -d postgres
```

### pg_dump Not Found

**Error:** `pg_dump not found in container`

**Solution:** Ensure you're using the official `postgres:16-alpine` image. Rebuild if necessary:
```bash
cd infrastructure
docker compose -f docker-compose.production.yml pull postgres
```

### Permission Denied on Scripts

**Error:** `Permission denied`

**Solution:**
```bash
chmod +x infrastructure/backup.sh infrastructure/restore.sh
```

### Environment Variables Not Loading

**Error:** `.env.production not found`

**Solution:** Ensure `.env.production` exists in the project root. Copy from `.env.production.example` if needed.

### Restore Fails with Errors

**Error:** `Restore verification failed. No tables found in database.`

**Solution:**
1. Check backup file integrity: `gunzip -c backup.sql.gz | head -20`
2. Verify PostgreSQL version compatibility
3. Check for SQL syntax errors in backup
4. Review PostgreSQL logs: `docker logs infrastructure-postgres-1`

### Connection Refused

**Error:** `Connection refused`

**Solution:**
1. Verify container is running: `docker ps`
2. Check port mapping: `docker port infrastructure-postgres-1`
3. Verify healthcheck: `docker inspect infrastructure-postgres-1 | grep -A 10 Health`

---

## Automation

### Manual Backup Before Deployment

Add to your deployment checklist:

```bash
# 1. Create backup
cd infrastructure && ./backup.sh

# 2. Deploy application
cd infrastructure && docker compose -f docker-compose.production.yml up -d

# 3. Verify application health
curl http://localhost:3000/api/v1/health
```

### Scheduled Backups (Cron)

Add to crontab (`crontab -e`):

```bash
# Daily backup at 2:00 AM
0 2 * * * cd /path/to/sarvaa-fresh/infrastructure && ./backup.sh

# Weekly full backup on Sunday at 3:00 AM
0 3 * * 0 cd /path/to/sarvaa-fresh/infrastructure && ./backup.sh /backup/weekly
```

### CI/CD Integration

Example for GitHub Actions:

```yaml
- name: Backup Database
  run: |
    cd infrastructure
    ./backup.sh ./backups
  env:
    POSTGRES_USER: ${{ secrets.POSTGRES_USER }}
    POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
    POSTGRES_DB: ${{ secrets.POSTGRES_DB }}
```

### Off-Site Backup Sync

After backup completes, sync to remote storage:

```bash
# Example: Sync to AWS S3
aws s3 cp infrastructure/backups/sarvaa_fresh_*.sql.gz s3://sarvaa-backups/

# Example: Sync to remote server via rsync
rsync -avz infrastructure/backups/ user@backup-server:/backups/sarvaa/
```

---

## File Reference

| File | Purpose |
|------|---------|
| `infrastructure/backup.sh` | Database backup script |
| `infrastructure/restore.sh` | Database restore script |
| `infrastructure/docker-compose.production.yml` | Production Docker configuration |
| `.env.production` | Environment variables (excluded from Git) |
| `docs/DATABASE.md` | Database architecture documentation |

---

## Testing Procedure

### Manual Verification (As Per Requirements)

1. **Create a PostgreSQL dump**
   ```bash
   cd infrastructure
   ./backup.sh
   ```

2. **Restore the dump into a separate temporary database**
   ```bash
   ./restore.sh ./backups/sarvaa_fresh_*.sql.gz sarvaa_fresh_test
   ```

3. **Verify the restored schema and application data**
   ```bash
   docker exec infrastructure-postgres-1 psql -U sarvaa -d sarvaa_fresh_test -c "\dt"
   docker exec infrastructure-postgres-1 psql -U sarvaa -d sarvaa_fresh_test -c "SELECT COUNT(*) FROM users;"
   ```

4. **Remove the temporary restore database**
   ```bash
   docker exec infrastructure-postgres-1 psql -U sarvaa -d postgres -c "DROP DATABASE sarvaa_fresh_test;"
   ```

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review PostgreSQL logs: `docker logs infrastructure-postgres-1`
3. Verify environment variables in `.env.production`
4. Consult `docs/DATABASE.md` for schema details

---

## Changelog

### Version 1.0 (2026-01-09)
- Initial backup and restore scripts
- Documentation with verification procedure
- Security best practices implemented
- Automatic cleanup of old backups
- Temporary database support for safe testing
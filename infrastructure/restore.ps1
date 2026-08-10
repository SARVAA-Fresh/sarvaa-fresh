# SARVAA Fresh - PostgreSQL Database Restore Script (PowerShell)
# Version: 1.0
# Usage: .\restore.ps1 <backup_file> [target_database]

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,

    [string]$TargetDb = "sarvaa_fresh"
)

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ComposeFile = Join-Path $ScriptDir "docker-compose.production.yml"
$ContainerName = "infrastructure-postgres-1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SARVAA Fresh - Database Restore" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify backup file exists
if (-not (Test-Path $BackupFile)) {
    Write-Host "ERROR: Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

$BackupSize = [math]::Round((Get-Item $BackupFile).Length / 1MB, 2)
Write-Host "Backup file: $BackupFile"
Write-Host "Backup size: ${BackupSize} MB"
Write-Host "Target database: $TargetDb"
Write-Host ""

# Verify docker-compose file exists
if (-not (Test-Path $ComposeFile)) {
    Write-Host "ERROR: docker-compose.production.yml not found at: $ComposeFile" -ForegroundColor Red
    exit 1
}

# Load environment variables from .env.production
$EnvFile = Join-Path $ProjectRoot ".env.production"
if (Test-Path $EnvFile) {
    Write-Host "Loading environment from .env.production..." -ForegroundColor Yellow
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
} else {
    Write-Host "WARNING: .env.production not found. Using defaults from docker-compose file." -ForegroundColor Yellow
}

# Database configuration with defaults
$DbUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "sarvaa" }
$DbName = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "sarvaa_fresh" }

# Warn if targeting production database
if ($TargetDb -eq $DbName) {
    Write-Host "WARNING: You are about to restore to the PRODUCTION database '$DbName'." -ForegroundColor Red
    Write-Host "This will OVERWRITE all existing data." -ForegroundColor Red
    Write-Host ""
    $Confirm = Read-Host "Are you absolutely sure? Type 'yes' to continue"
    Write-Host ""
    if ($Confirm -ne "yes") {
        Write-Host "Restore cancelled."
        exit 0
    }
}

# Verify container is running
$ContainerStatus = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
if (-not $ContainerStatus) {
    Write-Host "ERROR: PostgreSQL container '$ContainerName' is not running." -ForegroundColor Red
    Write-Host "Start it with: docker compose -f $ComposeFile up -d postgres"
    exit 1
}

# Check if psql is available in container
Write-Host "Verifying PostgreSQL client tools..."
$PsqlCheck = docker exec $ContainerName which psql 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: psql not found in container. Ensure postgres image includes client tools." -ForegroundColor Red
    exit 1
}

# Create temporary restore database if target is different from production
$RestoreDbCreated = $false
if ($TargetDb -ne $DbName) {
    Write-Host "Creating temporary restore database: $TargetDb" -ForegroundColor Yellow
    $dropCmd = 'DROP DATABASE IF EXISTS "' + $TargetDb + '";'
    $createCmd = 'CREATE DATABASE "' + $TargetDb + '";'
    docker exec $ContainerName psql -U $DbUser -d postgres -c $dropCmd 2>&1 | Out-Null
    docker exec $ContainerName psql -U $DbUser -d postgres -c $createCmd 2>&1 | Out-Null
    $RestoreDbCreated = $true
    Write-Host "Temporary database created."
    Write-Host ""
}

# Perform restore
Write-Host "Restoring backup to database: $TargetDb"
Write-Host "This may take a moment..."
Write-Host ""

# Detect compression and restore accordingly
if ($BackupFile -like "*.gz") {
    # Decompress using .NET GzipStream
    $InputFile = Get-Item $BackupFile
    $StreamIn = [System.IO.File]::OpenRead($InputFile.FullName)
    $GzipStream = New-Object System.IO.Compression.GzipStream($StreamIn, [System.IO.Compression.CompressionMode]::Decompress)
    $StreamReader = New-Object System.IO.StreamReader($GzipStream)
    $SqlContent = $StreamReader.ReadToEnd()
    $StreamReader.Close()
    $GzipStream.Close()
    $StreamIn.Close()

    # Pipe SQL to psql
    $SqlContent | docker exec -i $ContainerName psql -U $DbUser -d $TargetDb --set ON_ERROR_STOP=on
} else {
    Get-Content $BackupFile -Raw | docker exec -i $ContainerName psql -U $DbUser -d $TargetDb --set ON_ERROR_STOP=on
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Restore failed." -ForegroundColor Red
    if ($RestoreDbCreated) {
        Write-Host "Cleaning up temporary database..."
        $dropCmd = 'DROP DATABASE IF EXISTS "' + $TargetDb + '";'
        docker exec $ContainerName psql -U $DbUser -d postgres -c $dropCmd 2>&1 | Out-Null
    }
    exit 1
}

# Verify restore
Write-Host ""
Write-Host "Verifying restore..."
$TableCount = docker exec $ContainerName psql -U $DbUser -d $TargetDb -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>$null | ForEach-Object { $_.Trim() }

if ([string]::IsNullOrEmpty($TableCount) -or $TableCount -eq "0") {
    Write-Host "ERROR: Restore verification failed. No tables found in database." -ForegroundColor Red
    if ($RestoreDbCreated) {
        Write-Host "Cleaning up temporary database..."
        $dropCmd = 'DROP DATABASE IF EXISTS "' + $TargetDb + '";'
        docker exec $ContainerName psql -U $DbUser -d postgres -c $dropCmd 2>&1 | Out-Null
    }
    exit 1
}

Write-Host "Restore verified successfully!" -ForegroundColor Green
Write-Host "Tables restored: $TableCount"

# Show sample data if available
Write-Host ""
Write-Host "Sample data from key tables:"
Write-Host "---------------------------"

# Check users count
$UsersCount = docker exec $ContainerName psql -U $DbUser -d $TargetDb -t -c "SELECT COUNT(*) FROM users;" 2>$null | ForEach-Object { $_.Trim() }
Write-Host "Users: $UsersCount"

# Check products count
$ProductsCount = docker exec $ContainerName psql -U $DbUser -d $TargetDb -t -c "SELECT COUNT(*) FROM products;" 2>$null | ForEach-Object { $_.Trim() }
Write-Host "Products: $ProductsCount"

# Check orders count
$OrdersCount = docker exec $ContainerName psql -U $DbUser -d $TargetDb -t -c "SELECT COUNT(*) FROM orders;" 2>$null | ForEach-Object { $_.Trim() }
Write-Host "Orders: $OrdersCount"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Restore completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Database: $TargetDb"
Write-Host "Tables: $TableCount"
Write-Host ""

# Cleanup temporary database if created
if ($RestoreDbCreated) {
    Write-Host "IMPORTANT: This was a temporary restore database." -ForegroundColor Yellow
    Write-Host "To clean up:"
    Write-Host "  docker exec $ContainerName psql -U $DbUser -d postgres -c DROP DATABASE $TargetDb ;"
    Write-Host ""
    Write-Host "To promote this to production (if needed):"
    Write-Host "  1. Stop the application"
    Write-Host "  2. Update POSTGRES_DB in .env.production to: $TargetDb"
    Write-Host "  3. Restart the application"
}

Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Verify application functionality"
Write-Host "  2. Check critical data integrity"
Write-Host "  3. Run application tests if available"
Write-Host ""
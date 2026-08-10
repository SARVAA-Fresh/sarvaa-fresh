# SARVAA Fresh - PostgreSQL Database Backup Script (PowerShell)
# Version: 1.0
# Usage: .\backup.ps1 [output_directory]

param(
    [string]$BackupDir = ""
)

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackupDir = if ([string]::IsNullOrEmpty($BackupDir)) { Join-Path $ScriptDir "backups" } else { $BackupDir }
$ComposeFile = Join-Path $ScriptDir "docker-compose.production.yml"
$ContainerName = "infrastructure-postgres-1"

# Ensure backup directory exists
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# Generate timestamped backup filename
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "sarvaa_fresh_${Timestamp}.sql.gz"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SARVAA Fresh - Database Backup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
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

Write-Host "Database: $DbName"
Write-Host "User: $DbUser"
Write-Host "Container: $ContainerName"
Write-Host "Backup file: $BackupFile"
Write-Host ""

# Verify container is running
$ContainerStatus = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
if (-not $ContainerStatus) {
    Write-Host "ERROR: PostgreSQL container '$ContainerName' is not running." -ForegroundColor Red
    Write-Host "Start it with: docker compose -f $ComposeFile up -d postgres"
    exit 1
}

# Check if pg_dump is available in container
Write-Host "Verifying pg_dump availability..."
$PgDumpCheck = docker exec $ContainerName which pg_dump 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: pg_dump not found in container. Ensure postgres image includes client tools." -ForegroundColor Red
    exit 1
}

# Perform backup using pg_dump inside the container
Write-Host "Creating database backup..."

# Use a temporary file for the SQL dump to keep output clean
$TempSql = [System.IO.Path]::GetTempFileName()
$TempSqlFinal = "$TempSql.sql"
Rename-Item $TempSql $TempSqlFinal

# Capture stdout (SQL) to temp file, let stderr (diagnostics) go to terminal
$Process = Start-Process -FilePath "docker" -ArgumentList "exec", $ContainerName, "pg_dump", "-U", $DbUser, "-d", $DbName, "--format=plain", "--no-owner", "--no-acl", "--verbose" -NoNewWindow -Wait -PassThru -RedirectStandardOutput $TempSqlFinal -RedirectStandardError "$TempSqlFinal.err"
$LastExitCode = $Process.ExitCode

if ($LastExitCode -ne 0) {
    Write-Host "ERROR: pg_dump failed. Backup aborted." -ForegroundColor Red
    if (Test-Path "$TempSqlFinal.err") {
        Get-Content "$TempSqlFinal.err" | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    }
    Remove-Item $TempSqlFinal -ErrorAction SilentlyContinue
    Remove-Item "$TempSqlFinal.err" -ErrorAction SilentlyContinue
    exit LastExitCode
}

# Remove error file if present
Remove-Item "$TempSqlFinal.err" -ErrorAction SilentlyContinue

# Compress and save
try {
    $InputFile = Get-Item $TempSqlFinal
    $StreamIn = [System.IO.File]::OpenRead($InputFile.FullName)
    $StreamOut = [System.IO.File]::Create($BackupFile)
    $GzipStream = New-Object System.IO.Compression.GzipStream($StreamOut, [System.IO.Compression.CompressionMode]::Compress)
    $StreamIn.CopyTo($GzipStream)
    $GzipStream.Close()
    $StreamOut.Close()
    $StreamIn.Close()
} catch {
    Write-Host "ERROR: Compression failed. Removing partial backup." -ForegroundColor Red
    Remove-Item $BackupFile -ErrorAction SilentlyContinue
    Remove-Item $TempSqlFinal -ErrorAction SilentlyContinue
    exit 1
}

# Verify gzip integrity
try {
    $TestStream = [System.IO.File]::OpenRead($BackupFile)
    $GzipTest = New-Object System.IO.Compression.GzipStream($TestStream, [System.IO.Compression.CompressionMode]::Decompress)
    $GzipTest.ReadByte() | Out-Null
    $GzipTest.Close()
    $TestStream.Close()
} catch {
    Write-Host "ERROR: Backup file integrity check failed. Removing corrupt file." -ForegroundColor Red
    Remove-Item $BackupFile -ErrorAction SilentlyContinue
    Remove-Item $TempSqlFinal -ErrorAction SilentlyContinue
    exit 1
} finally {
    Remove-Item $TempSqlFinal -ErrorAction SilentlyContinue
}

# Verify backup was created
if (-not (Test-Path $BackupFile)) {
    Write-Host "ERROR: Backup file was not created." -ForegroundColor Red
    exit 1
}

$BackupSize = [math]::Round((Get-Item $BackupFile).Length / 1MB, 2)
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Backup completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "File: $BackupFile"
Write-Host "Size: ${BackupSize} MB"
Write-Host ""

# Optional: Keep only last 7 backups
Write-Host "Cleaning up old backups (keeping last 7)..." -ForegroundColor Yellow
$OldBackups = Get-ChildItem -Path $BackupDir -Filter 'sarvaa_fresh_*.sql.gz' |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 7

if ($OldBackups) {
    $OldBackups | Remove-Item -Force
}

Write-Host "Done."
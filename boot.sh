#!/bin/bash
# =============================================================================
# MedGuardian Production Entrypoint Script
# =============================================================================
# This script runs as the container entrypoint and performs:
# 1. Database availability check (prevents race conditions)
# 2. Automatic schema migrations (ensures code/DB sync)
# 3. Gunicorn startup with proper signal handling (exec for PID 1)
# =============================================================================

set -e  # Exit on any error

echo "🚀 MedGuardian Production Startup"
echo "=================================="

# -----------------------------------------------------------------------------
# Step 1: Wait for PostgreSQL to be ready
# -----------------------------------------------------------------------------
# Why: Docker Compose `depends_on` only waits for container start, not service
# readiness. The database may take a few seconds to accept connections.
# -----------------------------------------------------------------------------
echo "⏳ Waiting for PostgreSQL..."

# Use nc (netcat) to check if postgres port is open
# The host "db" comes from docker-compose service name
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
MAX_RETRIES=30
RETRY_COUNT=0

while ! nc -z "$DB_HOST" "$DB_PORT"; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ Database not available after $MAX_RETRIES attempts. Exiting."
        exit 1
    fi
    echo "   Attempt $RETRY_COUNT/$MAX_RETRIES - Database not ready, waiting..."
    sleep 1
done

echo "✅ PostgreSQL is ready!"

# -----------------------------------------------------------------------------
# Step 2: Run Database Migrations
# -----------------------------------------------------------------------------
# Why: Ensures the database schema always matches the deployed application code.
# If migrations fail, the container fails to start, alerting the orchestrator.
# -----------------------------------------------------------------------------
echo "🔄 Running database migrations..."

flask db upgrade

echo "✅ Migrations complete!"

# -----------------------------------------------------------------------------
# Step 3: Start Gunicorn with eventlet workers
# -----------------------------------------------------------------------------
# Why exec: Replaces the shell process with Gunicorn, making it PID 1.
# This is critical for proper signal handling (SIGTERM for graceful shutdown).
#
# Why -w 1: Socket.IO requires sticky sessions. Gunicorn's internal load
# balancer doesn't support them, so we run 1 worker per container and scale
# horizontally via container orchestration instead.
#
# Why eventlet: Enables cooperative multitasking for handling thousands of
# concurrent WebSocket connections without blocking.
# -----------------------------------------------------------------------------
echo "🌐 Starting Gunicorn with eventlet workers..."

exec gunicorn \
    --worker-class eventlet \
    --workers 1 \
    --bind 0.0.0.0:5000 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --capture-output \
    --enable-stdio-inheritance \
    wsgi:app

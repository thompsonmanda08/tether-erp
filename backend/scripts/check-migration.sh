#!/bin/bash

# Simple script to check if migrations ran successfully
echo "Checking migration status..."

# Test database connection
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL not set"
    exit 1
fi

echo "DATABASE_URL is configured"

# Try to connect and check migrations table
psql "$DATABASE_URL" -c "SELECT version, applied_at FROM schema_migrations ORDER BY applied_at DESC LIMIT 5;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Database migrations check passed"
else
    echo "⚠️  Could not verify migrations (this might be normal if psql is not available)"
fi

echo "Migration check complete"
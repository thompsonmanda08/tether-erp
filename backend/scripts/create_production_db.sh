#!/bin/bash

# Script to create the production database on Prisma.io
# Run this script to create the liyali-gateway-db database

DB_HOST="db.prisma.io"
DB_PORT="5432"
DB_USER="a866ea4ff3135588ee1a79d217fdf137eecace20129be6567c9ee87a47ad3bce"
DB_PASSWORD="sk_Zj7NMeUK-V3uzew6mQ0F0"
DB_NAME="liyali-gateway-db"

echo "Creating database: $DB_NAME"

# Connect to the default postgres database and create our target database
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE \"$DB_NAME\";"

if [ $? -eq 0 ]; then
    echo "✓ Database '$DB_NAME' created successfully"
    
    # Grant permissions
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO $DB_USER;"
    
    if [ $? -eq 0 ]; then
        echo "✓ Permissions granted successfully"
    else
        echo "⚠️  Warning: Could not grant permissions (database may still work)"
    fi
else
    echo "❌ Failed to create database. It may already exist."
    echo "Checking if database exists..."
    
    # Check if database exists
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" | grep -q 1
    
    if [ $? -eq 0 ]; then
        echo "✓ Database '$DB_NAME' already exists"
    else
        echo "❌ Database does not exist and could not be created"
        exit 1
    fi
fi

echo "Database setup complete!"
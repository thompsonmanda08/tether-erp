#!/bin/bash

# Fly.io Secrets Setup Script
# This script helps set up all required secrets for Fly.io deployment

set -e

echo "🚀 Fly.io Secrets Setup Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    print_error "flyctl is not installed. Please install it first:"
    echo "curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if user is logged in
if ! flyctl auth whoami &> /dev/null; then
    print_error "You are not logged in to Fly.io. Please run:"
    echo "flyctl auth login"
    exit 1
fi

print_status "Fly.io CLI is ready"

# App names
BACKEND_APP="liyali-gateway-api"
FRONTEND_APP="liyali-gateway-frontend"

echo ""
echo "📋 This script will set up secrets for:"
echo "   Backend:  $BACKEND_APP"
echo "   Frontend: $FRONTEND_APP"
echo ""

# Function to generate secure secret
generate_secret() {
    openssl rand -base64 32
}

# Function to prompt for secret
prompt_secret() {
    local var_name=$1
    local description=$2
    local default_value=$3
    
    echo ""
    print_info "Setting up: $var_name"
    echo "Description: $description"
    
    if [ -n "$default_value" ]; then
        echo "Default: $default_value"
        read -p "Enter value (press Enter for default): " value
        if [ -z "$value" ]; then
            value=$default_value
        fi
    else
        read -p "Enter value: " value
        if [ -z "$value" ]; then
            print_error "Value cannot be empty"
            return 1
        fi
    fi
    
    echo "$value"
}

# Function to set secret for app
set_app_secret() {
    local app=$1
    local key=$2
    local value=$3
    
    echo "Setting $key for $app..."
    if flyctl secrets set "$key=$value" --app "$app"; then
        print_status "Set $key for $app"
    else
        print_error "Failed to set $key for $app"
        return 1
    fi
}

echo "🔐 Setting up secrets..."

# Generate or prompt for secrets
echo ""
echo "1. JWT_SECRET (for backend authentication)"
JWT_SECRET=$(prompt_secret "JWT_SECRET" "Secret key for JWT token signing" "$(generate_secret)")

echo ""
echo "2. NEXTAUTH_SECRET (for frontend authentication)"
NEXTAUTH_SECRET=$(prompt_secret "NEXTAUTH_SECRET" "Secret key for NextAuth" "$(generate_secret)")

echo ""
echo "3. DATABASE_URL (PostgreSQL connection string)"
print_info "Format: postgresql://username:password@hostname:port/database"
print_info "Example: postgresql://postgres:password@liyali-db.internal:5432/liyali"
DATABASE_URL=$(prompt_secret "DATABASE_URL" "PostgreSQL connection string for both apps")

echo ""
echo "4. CORS_ALLOWED_ORIGINS (for backend CORS)"
CORS_DEFAULT="https://$FRONTEND_APP.fly.dev,http://localhost:3000"
CORS_ALLOWED_ORIGINS=$(prompt_secret "CORS_ALLOWED_ORIGINS" "Comma-separated list of allowed origins" "$CORS_DEFAULT")

echo ""
echo "5. NEXT_PUBLIC_API_URL (frontend API endpoint)"
API_URL_DEFAULT="https://$BACKEND_APP.fly.dev/api/v1"
NEXT_PUBLIC_API_URL=$(prompt_secret "NEXT_PUBLIC_API_URL" "Backend API URL for frontend" "$API_URL_DEFAULT")

echo ""
echo "6. NEXTAUTH_URL (frontend URL for NextAuth)"
NEXTAUTH_URL_DEFAULT="https://$FRONTEND_APP.fly.dev"
NEXTAUTH_URL=$(prompt_secret "NEXTAUTH_URL" "Frontend URL for NextAuth callbacks" "$NEXTAUTH_URL_DEFAULT")

# Confirm before setting secrets
echo ""
echo "📝 Summary of secrets to be set:"
echo "================================"
echo "JWT_SECRET: [HIDDEN]"
echo "NEXTAUTH_SECRET: [HIDDEN]"
echo "DATABASE_URL: $DATABASE_URL"
echo "CORS_ALLOWED_ORIGINS: $CORS_ALLOWED_ORIGINS"
echo "NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL"
echo "NEXTAUTH_URL: $NEXTAUTH_URL"
echo ""

read -p "Do you want to proceed? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    print_warning "Aborted by user"
    exit 0
fi

echo ""
echo "🔧 Setting secrets for backend app: $BACKEND_APP"
set_app_secret "$BACKEND_APP" "JWT_SECRET" "$JWT_SECRET"
set_app_secret "$BACKEND_APP" "DATABASE_URL" "$DATABASE_URL"
set_app_secret "$BACKEND_APP" "CORS_ALLOWED_ORIGINS" "$CORS_ALLOWED_ORIGINS"

echo ""
echo "🔧 Setting secrets for frontend app: $FRONTEND_APP"
set_app_secret "$FRONTEND_APP" "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"
set_app_secret "$FRONTEND_APP" "DATABASE_URL" "$DATABASE_URL"
set_app_secret "$FRONTEND_APP" "NEXT_PUBLIC_API_URL" "$NEXT_PUBLIC_API_URL"
set_app_secret "$FRONTEND_APP" "NEXTAUTH_URL" "$NEXTAUTH_URL"

echo ""
print_status "All secrets have been set successfully!"

echo ""
echo "🔍 Verifying secrets..."
echo "Backend secrets:"
flyctl secrets list --app "$BACKEND_APP"
echo ""
echo "Frontend secrets:"
flyctl secrets list --app "$FRONTEND_APP"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Deploy your applications:"
echo "   flyctl deploy --app $BACKEND_APP"
echo "   flyctl deploy --app $FRONTEND_APP"
echo ""
echo "2. Or push to develop branch for automatic deployment"
echo ""
echo "3. Verify deployment:"
echo "   curl https://$BACKEND_APP.fly.dev/health"
echo "   curl https://$FRONTEND_APP.fly.dev/api/health"
echo ""
print_status "Happy deploying! 🚀"
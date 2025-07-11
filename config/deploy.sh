#!/bin/bash

# Fly.io Deployment Script for LaTeX Editor
set -e

echo "🚀 Deploying LaTeX Editor to Fly.io..."

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed. Please install it from https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Check if user is logged in to Fly.io
if ! flyctl auth whoami &> /dev/null; then
    echo "❌ You are not logged in to Fly.io. Please run 'flyctl auth login' first."
    exit 1
fi

# Set environment variables for production
echo "📝 Setting up environment variables..."

# Prompt for required environment variables if not set
if [ -z "$SUPABASE_URL" ]; then
    read -p "Enter your Supabase URL: " SUPABASE_URL
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    read -s -p "Enter your Supabase Service Key: " SUPABASE_SERVICE_KEY
    echo
fi

if [ -z "$SECRET_KEY" ]; then
    echo "Generating a random secret key..."
    SECRET_KEY=$(openssl rand -hex 32)
fi

# Set secrets in Fly.io
flyctl secrets set \
    SUPABASE_URL="$SUPABASE_URL" \
    SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY" \
    SECRET_KEY="$SECRET_KEY" \
    ENVIRONMENT="production" \
    DEBUG="false" \
    LOG_LEVEL="info"

# Create volume for LaTeX cache if it doesn't exist
echo "📦 Creating volume for LaTeX cache..."
flyctl volumes list | grep -q latex_cache || flyctl volumes create latex_cache --size 1

# Deploy the application
echo "🏗️  Building and deploying..."
flyctl deploy

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at: https://$(flyctl info --json | jq -r '.Hostname')"

# Show logs
echo "📊 Recent logs:"
flyctl logs --app latex-editor-api

# Deployment Configuration

This directory contains configuration files for deploying the LaTeX Editor to various environments.

## Files Overview

- **`.env.development`** - Development environment variables template
- **`.env.production`** - Production environment variables template  
- **`deploy.sh`** - Automated deployment script for Fly.io

## Local Development with Docker

1. Copy the development environment template:
   ```bash
   cp config/.env.development config/.env.local
   ```

2. Edit `config/.env.local` with your actual Supabase credentials

3. Build and run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

The API will be available at `http://localhost:8000`

## Fly.io Deployment

### Prerequisites

1. Install [flyctl](https://fly.io/docs/hands-on/install-flyctl/)
2. Sign up for a Fly.io account and login:
   ```bash
   flyctl auth login
   ```

### Initial Setup

1. Create a new Fly.io app:
   ```bash
   flyctl apps create latex-editor-api
   ```

2. Set up your environment variables in `config/.env.production`

3. Run the deployment script:
   ```bash
   ./config/deploy.sh
   ```

### Manual Deployment

If you prefer to deploy manually:

1. Set environment secrets:
   ```bash
   flyctl secrets set SUPABASE_URL="your-url" SUPABASE_SERVICE_KEY="your-key"
   ```

2. Create a volume for LaTeX cache:
   ```bash
   flyctl volumes create latex_cache --size 1
   ```

3. Deploy:
   ```bash
   flyctl deploy
   ```

### Environment Variables

Required environment variables for production:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Your Supabase service role key
- `SECRET_KEY` - Random secret key for JWT signing

Optional environment variables:

- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `LATEX_TIMEOUT` - LaTeX compilation timeout in seconds (default: 30)
- `MAX_LATEX_SIZE` - Maximum LaTeX file size in bytes (default: 1MB)

## Docker Configuration

The `backend/Dockerfile` includes:

- Python 3.11 slim base image
- Tectonic LaTeX engine installation
- Security hardening with non-root user
- Health checks for container monitoring
- Optimized layer caching

## Monitoring

- Health check endpoint: `/health`
- Logs: `flyctl logs --app latex-editor-api`
- Metrics: Available through Fly.io dashboard

## Scaling

The Fly.io configuration supports auto-scaling:
- Minimum 0 machines (scales to zero when idle)
- Auto-start on incoming requests
- Shared CPU with 1GB RAM per instance

To manually scale:
```bash
flyctl scale count 2  # Run 2 instances
flyctl scale memory 2048  # Use 2GB RAM
```

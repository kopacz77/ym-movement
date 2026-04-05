# Docker Deployment Guide - YM Movement Scheduler

## Overview

This guide covers Docker usage for YM Movement Scheduler v3. The Docker setup is optimized for **local development** using your existing **Neon PostgreSQL** cloud database.

## 🎯 **Important: Docker is for Local Development**

The YM Movement Scheduler uses:
- ✅ **Netlify** for production hosting (recommended - keep using it!)
- ✅ **Neon PostgreSQL** for database (cloud-managed)
- ✅ **Docker** for local development environment (optional but recommended)

**You do NOT need to deploy Docker containers to production.** Netlify handles that automatically.

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** installed and running
- **Git** for version control
- **`.env` file** with your Neon database credentials

### First Time Setup

```bash
# 1. Clone the repository (if not already done)
git clone <repository-url>
cd ym-movement

# 2. Ensure your .env file exists with Neon database URL
cat .env | grep DATABASE_URL
# Should show: DATABASE_URL="postgresql://..."

# 3. Build the Docker image (first time only)
pnpm docker:build
# This takes 2-5 minutes

# 4. Start the development environment
pnpm docker:dev
# App will be available at http://localhost:3000
```

### Daily Development Workflow

```bash
# Start Docker development
pnpm docker:dev

# Open http://localhost:3000 in your browser
# Edit code in VS Code - changes auto-reload

# When done:
# Press Ctrl+C or run:
pnpm docker:down
```

## 📋 Available Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `pnpm docker:build` | Build Docker image (first time only) |
| `pnpm docker:dev` | Start dev server (foreground with logs) |
| `pnpm docker:dev -d` | Start in background (detached mode) |
| `pnpm docker:down` | Stop all containers |
| `pnpm docker:logs` | View application logs |
| `pnpm docker:shell` | Access container shell for debugging |
| `pnpm docker:clean` | Remove all containers, volumes, images |

### Rebuild Commands

```bash
# Clean rebuild after dependency changes
pnpm docker:clean
pnpm docker:build
pnpm docker:dev

# Quick restart
pnpm docker:down && pnpm docker:dev
```

## 🗄️ Database Configuration

### Using Neon (Current Setup)

Your Docker setup is configured to use your **Neon cloud database** from the `.env` file:

```bash
# .env file
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
# ... other environment variables
```

**No local PostgreSQL installation needed!** The containerized app connects to your Neon database.

### Health Check

Test database connectivity:
```bash
# With Docker running
curl http://localhost:3000/api/health

# Should return:
# {"status":"healthy","database":"connected","timestamp":"..."}
```

## 🔧 Optional: Redis Caching

Redis is optional and disabled by default:

```bash
# Start with Redis enabled
docker-compose --profile redis up

# Redis will be available at localhost:6379
# Add to .env: REDIS_URL="redis://localhost:6379"
```

## 🆚 Docker vs Local Development

### Option 1: Docker Development

```bash
pnpm docker:dev
```

**Pros:**
- ✅ Consistent Node.js version across team
- ✅ Isolated dependencies
- ✅ Production-like environment
- ✅ No local Node.js needed

**Cons:**
- ❌ Slower startup (~30 seconds)
- ❌ More complex debugging

### Option 2: Local Development

```bash
pnpm dev
```

**Pros:**
- ✅ Faster startup (~5 seconds)
- ✅ Simpler debugging
- ✅ Direct file access

**Cons:**
- ❌ Requires local Node.js 20+
- ❌ Potential version inconsistencies

**Both use the same Neon database!** Choose based on preference.

## 🐛 Troubleshooting

### Port 3000 Already in Use

```bash
# Stop your local dev server first
# Then start Docker
pnpm docker:dev
```

### Changes Not Showing Up

```bash
# Restart the container
pnpm docker:down && pnpm docker:dev

# Or clean rebuild
pnpm docker:clean
pnpm docker:build
pnpm docker:dev
```

### Database Connection Fails

```bash
# Verify .env file has correct DATABASE_URL
cat .env | grep DATABASE_URL

# Test health check
curl http://localhost:3000/api/health

# Check Neon dashboard for database status
```

### Build Errors

```bash
# Clean everything and rebuild
pnpm docker:clean
pnpm docker:build

# Check Docker is running
docker --version
docker ps
```

### Out of Disk Space

```bash
# Clean up old Docker data
docker system prune -a --volumes

# Remove specific images
docker images
docker rmi <image-id>
```

### Hot Reload Not Working

```bash
# Ensure you're editing files in the project directory
pwd
# Should show: /home/username/projects/ym-movement

# Restart with clean volumes
pnpm docker:down
pnpm docker:dev
```

## 📦 What's Inside docker-compose.yml

```yaml
services:
  app:
    # Next.js application
    # Uses .env file for all config
    # Connects to Neon database
    # Hot reload enabled via volume mounts

  redis: (optional)
    # Redis caching layer
    # Only starts with --profile redis
    # Available at localhost:6379
```

**Removed from original setup:**
- ❌ Local PostgreSQL (using Neon instead)
- ❌ Prisma Studio (not needed for cloud DB)

## 🏗️ Architecture

```
┌─────────────────────┐
│  Docker Container   │
│  ┌───────────────┐  │
│  │   Next.js     │  │◄───── Hot reload from host
│  │   App (3000)  │  │
│  └───────┬───────┘  │
└──────────┼──────────┘
           │
           ▼
   ┌────────────────┐
   │  Neon Cloud    │
   │  PostgreSQL    │◄────────── Cloud Database
   └────────────────┘
```

## ✅ Health Checks

The Docker container includes automatic health checks:

```bash
# Check container health
docker ps
# STATUS shows "healthy" when database connected

# Manual health check
curl http://localhost:3000/api/health
```

Health check runs every 30 seconds and verifies:
- ✅ App is responding
- ✅ Database connection is active
- ✅ Critical services are running

## 🚀 Production Deployment

**Important:** For production, continue using **Netlify** (not Docker containers).

Netlify deployment is optimized for:
- ✅ Serverless functions (no container overhead)
- ✅ Global CDN distribution
- ✅ Automatic scaling
- ✅ Zero DevOps maintenance
- ✅ Free tier for small apps

Your production workflow:
```bash
# 1. Make changes locally (Docker or local dev)
pnpm docker:dev  # or pnpm dev

# 2. Test locally
# Visit http://localhost:3000

# 3. Commit and push to GitHub
git add .
git commit -m "Add new feature"
git push origin main

# 4. Netlify automatically deploys!
# Visit your-app.netlify.app
```

## 📚 Additional Resources

- **Main Documentation**: [README.md](README.md)
- **Development Guide**: [CLAUDE.md](CLAUDE.md)
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Docker Compose File**: [docker-compose.yml](docker-compose.yml)
- **Dockerfile**: [Dockerfile](Dockerfile)

## 🤔 FAQ

**Q: Do I need Docker for development?**
A: No, it's optional. You can use `pnpm dev` for local development.

**Q: Does Docker replace Netlify?**
A: No! Docker is for local development. Netlify is for production hosting.

**Q: Can I use Docker for production?**
A: You can, but Netlify is recommended for this app. It's optimized for Next.js serverless deployment.

**Q: Do I need a local database?**
A: No! The Docker setup uses your Neon cloud database.

**Q: How do I switch between Docker and local dev?**
A: Just stop one and start the other:
```bash
# Stop Docker
pnpm docker:down

# Start local dev
pnpm dev

# Or vice versa
```

**Q: Will Docker slow down my development?**
A: Startup is slower (~30s vs ~5s), but hot reload works the same. Many developers prefer Docker for team consistency.

---

**Last Updated**: 2025-10-21
**Docker Setup**: Optimized for Neon + Netlify architecture

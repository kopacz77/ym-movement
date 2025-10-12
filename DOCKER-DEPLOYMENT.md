# YM Movement Scheduler - Deployment Guide

## Overview

This document provides comprehensive deployment instructions for the YM Movement scheduler application. The project is designed to be deployed on Netlify (free tier) with external database hosting on Neon PostgreSQL.

## Current Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Netlify       │    │   Neon           │    │   Resend        │
│   (Frontend +   │────│   (PostgreSQL    │    │   (Email        │
│   API Routes)   │    │   Database)      │    │   Service)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Prerequisites

### Required Accounts (All Free Tier)
1. **GitHub Account** - Source code repository
2. **Netlify Account** - Application hosting
3. **Neon Account** - PostgreSQL database
4. **Resend Account** - Email services (optional)
5. **Google Cloud Console** - Calendar API (optional)

### Local Development Requirements
- **Node.js 20+** and **pnpm**
- **Docker & Docker Compose** (for containerized development)
- **Git** for version control

## Environment Variables

### Required Environment Variables

Create a `.env` file in the project root with these variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@host.neon.tech/database_name?sslmode=require"

# NextAuth Configuration
NEXTAUTH_URL="https://your-netlify-site.netlify.app"
NEXTAUTH_SECRET="your-super-secret-key-minimum-32-characters"

# Application Settings
NODE_ENV="production"
NEXT_TELEMETRY_DISABLED=1
```

### Optional Environment Variables

```bash
# Email Services (Resend)
RESEND_API_KEY="re_your_api_key_here"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# Google Calendar Integration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="https://your-netlify-site.netlify.app/api/auth/callback/google"

# Redis (if using external Redis)
REDIS_URL="redis://username:password@host:port"

# Development Settings
ENABLE_AUTH_BYPASS="false"  # Only use in development
```

## Database Setup (Neon)

### 1. Create Neon Database

1. Visit [neon.tech](https://neon.tech) and create a free account
2. Create a new project: **"YM Movement Scheduler"**
3. Choose region closest to your users
4. Copy the connection string from the dashboard

### 2. Configure Database

```bash
# Set your DATABASE_URL
DATABASE_URL="postgresql://username:password@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Run database migrations
pnpm prisma:migrate

# Verify connection
pnpm prisma studio
```

### 3. Database Security

- Enable **Connection Pooling** in Neon dashboard
- Set **Auto-pause** to reduce costs
- Configure **Branch Protection** for production data

## Netlify Deployment

### 1. Initial Setup

1. **Connect Repository**:
   - Log in to Netlify
   - Click "New site from Git"
   - Connect your GitHub repository
   - Select the main branch

2. **Build Settings**:
   ```
   Base directory: (leave empty)
   Build command: pnpm build
   Publish directory: .next
   ```

3. **Environment Variables**:
   - Go to Site settings → Environment variables
   - Add all required environment variables from your `.env` file
   - **Important**: Never commit `.env` to git

### 2. Build Configuration

Create `netlify.toml` in project root:

```toml
[build]
  command = "pnpm build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--version"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### 3. Deployment Process

1. **Automatic Deployment**:
   - Push to main branch triggers automatic deployment
   - Build takes ~3-5 minutes
   - Check deploy logs for any errors

2. **Environment Setup**:
   ```bash
   # Production build locally (optional)
   pnpm build

   # Test production build
   pnpm start
   ```

3. **Custom Domain** (Optional):
   - Purchase domain from your preferred registrar
   - Add custom domain in Netlify dashboard
   - Configure DNS settings as instructed

## Docker Development Environment

### Quick Start

The project includes a complete Docker development environment for team consistency:

```bash
# Start complete development environment
pnpm docker:dev

# Access the application
open http://localhost:3000

# View database with Prisma Studio
pnpm docker:studio
open http://localhost:5555

# Stop everything
pnpm docker:down
```

### Docker Services

The development environment includes:

1. **Next.js Application** (localhost:3000)
   - Hot reload enabled
   - TypeScript compilation
   - All features working

2. **PostgreSQL Database** (localhost:5432)
   - Pre-configured with test data
   - Automatic schema migration
   - Persistent data storage

3. **Redis Cache** (localhost:6379)
   - Session storage
   - API response caching
   - Background job queue

4. **Prisma Studio** (localhost:5555)
   - Database GUI
   - Data browsing and editing
   - Query execution

### Docker Benefits

- ✅ **Zero Configuration** - Works immediately on any machine with Docker
- ✅ **Team Consistency** - Same environment for all developers
- ✅ **Production Parity** - Matches deployment environment closely
- ✅ **Isolated Dependencies** - No conflicts with local installations
- ✅ **Easy Cleanup** - Remove everything with one command

### Docker Commands Reference

```bash
# Start development environment
pnpm docker:dev

# Build containers
pnpm docker:build

# Stop all services
pnpm docker:down

# View logs
pnpm docker:logs

# Clean up everything (containers, volumes, images)
pnpm docker:clean

# Start only database and Redis
pnpm docker:db

# Access container shell
pnpm docker:shell

# Start Prisma Studio
pnpm docker:studio
```

## Production Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database migrations run successfully
- [ ] Build completes without errors locally
- [ ] Tests pass (`pnpm test:all`)
- [ ] No console errors in production build
- [ ] Docker environment tested and working

### Post-Deployment
- [ ] Site loads correctly at Netlify URL
- [ ] Authentication works (login/logout)
- [ ] Database connections successful
- [ ] Email notifications working (if configured)
- [ ] Calendar sync functioning (if configured)
- [ ] Mobile responsiveness verified
- [ ] Performance metrics acceptable

### Security Verification
- [ ] HTTPS enabled (automatic with Netlify)
- [ ] Environment variables not exposed
- [ ] Database access restricted to application
- [ ] No development credentials in production
- [ ] Security headers configured correctly

## Monitoring & Maintenance

### Performance Monitoring

1. **Netlify Analytics**:
   - Enable in Netlify dashboard
   - Monitor page views, performance
   - Track Core Web Vitals

2. **Database Monitoring**:
   - Monitor Neon dashboard for query performance
   - Set up alerts for connection limits
   - Review slow query logs

### Backup Strategy

1. **Database Backups**:
   - Neon provides automatic backups
   - Export critical data periodically
   - Test restore procedures

2. **Code Backups**:
   - GitHub serves as primary backup
   - Tag releases for easy rollback
   - Document deployment procedures

### Update Process

1. **Regular Updates**:
   ```bash
   # Update dependencies
   pnpm update

   # Security audit
   pnpm audit

   # Test changes locally
   pnpm test:all

   # Test in Docker environment
   pnpm docker:dev

   # Deploy
   git push origin main
   ```

2. **Emergency Rollback**:
   - Use Netlify deploy history
   - Rollback to previous working deploy
   - Fix issues and redeploy

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check Node.js version (must be 20+)
   - Verify all dependencies installed
   - Review build logs in Netlify

2. **Database Connection Issues**:
   - Verify DATABASE_URL format
   - Check Neon database status
   - Confirm SSL requirements

3. **Authentication Problems**:
   - Verify NEXTAUTH_URL matches site URL
   - Check NEXTAUTH_SECRET is set
   - Confirm callback URLs configured

4. **Function Timeouts**:
   - Optimize database queries
   - Implement caching strategies
   - Consider query pagination

5. **Docker Issues**:
   - Ensure Docker daemon is running
   - Check port conflicts (3000, 5432, 6379)
   - Run `pnpm docker:clean` and restart

### Support Resources

- **Netlify Documentation**: [docs.netlify.com](https://docs.netlify.com)
- **Neon Documentation**: [neon.tech/docs](https://neon.tech/docs)
- **Next.js Deployment**: [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)
- **Docker Documentation**: [docs.docker.com](https://docs.docker.com)
- **Project Issues**: [GitHub Issues](https://github.com/your-username/yura-scheduler-v3/issues)

## Cost Optimization

### Free Tier Limits

**Netlify Free Tier**:
- 100GB bandwidth/month
- 300 build minutes/month
- 125,000 function calls/month

**Neon Free Tier**:
- 0.5GB storage
- 1 database
- Auto-pause after inactivity

### Optimization Tips

1. **Reduce Bundle Size**:
   - Use dynamic imports
   - Optimize images
   - Remove unused dependencies

2. **Database Optimization**:
   - Use connection pooling
   - Optimize query patterns
   - Implement caching

3. **Function Optimization**:
   - Minimize cold starts
   - Cache responses
   - Optimize query complexity

## Scaling Considerations

### When to Upgrade

Consider upgrading when you hit these limits:
- **100+ concurrent users**
- **1000+ lessons/month**
- **10GB+ database storage**
- **Consistent function timeouts**

### Migration Path

1. **Database**: Upgrade Neon tier or migrate to dedicated PostgreSQL
2. **Hosting**: Migrate to Vercel Pro or dedicated hosting (Docker ready!)
3. **Monitoring**: Implement comprehensive observability
4. **CDN**: Add Cloudflare for global performance

## Security Best Practices

### Production Security

1. **Environment Variables**:
   - Never commit secrets to git
   - Use strong random values for secrets
   - Rotate credentials regularly

2. **Database Security**:
   - Use connection pooling
   - Implement query timeouts
   - Monitor for suspicious activity

3. **Application Security**:
   - Keep dependencies updated
   - Implement rate limiting
   - Use HTTPS everywhere
   - Validate all inputs

4. **Docker Security**:
   - Use non-root user in containers
   - Keep base images updated
   - Scan images for vulnerabilities
   - Minimize container attack surface

### Compliance

- **Data Protection**: Implement GDPR-compliant data handling
- **User Privacy**: Clear privacy policy and consent
- **Payment Security**: PCI compliance for payment processing
- **Audit Trail**: Log all administrative actions

---

**Last Updated**: 2025-01-07
**Next Review**: 2025-04-07
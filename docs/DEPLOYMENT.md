# Deployment Guide - YM Movement

## Overview

This guide covers deployment options for YM Movement, from development to production environments. The application supports multiple deployment strategies including Netlify, Vercel, Docker, and traditional VPS hosting.

## 🚀 Netlify Deployment (Current Production)

### Prerequisites
- GitHub account with repository access
- Netlify account (free tier available)
- PostgreSQL database (Neon, Supabase, or other provider)

### Configuration

The project is already configured for Netlify with `netlify.toml`:

```toml
[build]
  command = "npx prisma generate && npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NEXT_USE_NETLIFY_EDGE = "true"
```

### Deployment Steps

1. **Environment Variables in Netlify Dashboard**
   ```bash
   # Required for production
   DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
   NEXTAUTH_SECRET="your-32-character-secret-key"
   NEXTAUTH_URL="https://your-app.netlify.app"
   
   # Optional but recommended
   GOOGLE_CLIENT_EMAIL="service-account@project.iam.gserviceaccount.com"
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Key\n-----END PRIVATE KEY-----"
   GOOGLE_CALENDAR_ID="calendar-id@group.calendar.google.com"
   INSTRUCTOR_EMAIL="instructor@example.com"
   RESEND_API_KEY="your-email-api-key"
   ```

2. **Deploy to Netlify**
   - Push to GitHub repository
   - Connect repository in Netlify dashboard
   - Build settings are automatically detected from `netlify.toml`
   - Deployment will run: `npx prisma generate && npm run build`

3. **Database Setup**
   ```bash
   # After first deployment, run migrations
   # Use Netlify CLI or connect to your database directly
   npx prisma migrate deploy
   ```

### Netlify Features Used
- **Next.js Plugin**: Automatic optimization for Next.js apps
- **Edge Runtime**: Enhanced performance with `NEXT_USE_NETLIFY_EDGE`
- **Automatic Builds**: Triggered on GitHub pushes
- **Custom Build Command**: Includes Prisma generation

## 🚀 Alternative: Vercel Deployment

### Prerequisites
- GitHub account with repository access
- Vercel account (free tier available)
- PostgreSQL database (Neon, Supabase, or other provider)

### Steps

1. **Prepare Environment Variables**
   ```bash
   # Required for production
   DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
   NEXTAUTH_SECRET="your-32-character-secret-key"
   NEXTAUTH_URL="https://your-app.vercel.app"
   
   # Optional but recommended
   GOOGLE_CLIENT_EMAIL="service-account@project.iam.gserviceaccount.com"
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Key\n-----END PRIVATE KEY-----"
   GOOGLE_CALENDAR_ID="calendar-id@group.calendar.google.com"
   INSTRUCTOR_EMAIL="instructor@example.com"
   RESEND_API_KEY="your-email-api-key"
   ```

2. **Deploy to Vercel**
   ```bash
   # Option 1: Using Vercel CLI
   npm i -g vercel
   vercel --prod
   
   # Option 2: GitHub Integration
   # Push to GitHub, connect repo in Vercel dashboard
   ```

3. **Configure Database**
   ```bash
   # Run migrations after deployment
   pnpm prisma migrate deploy
   
   # Optional: Seed with initial data
   pnpm prisma db seed
   ```

### Vercel Configuration

Create `vercel.json` in project root:
```json
{
  "functions": {
    "src/app/api/**": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

## Docker Deployment

For Docker-based development setup, see [DOCKER-DEPLOYMENT.md](DOCKER-DEPLOYMENT.md).

## 🖥️ VPS Deployment (Ubuntu/CentOS)

### Prerequisites
- Ubuntu 20.04+ or CentOS 8+
- Root or sudo access
- Domain name pointed to server IP

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Nginx
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Install PM2 for process management
npm install -g pm2
```

### Step 2: Database Setup

```bash
# Configure PostgreSQL
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE ym_movement;
CREATE USER your_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE ym_movement TO your_user;
\q

# Configure PostgreSQL for remote connections (if needed)
sudo nano /etc/postgresql/14/main/postgresql.conf
# Uncomment and modify: listen_addresses = '*'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: host all all 0.0.0.0/0 md5

sudo systemctl restart postgresql
```

### Step 3: Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/ym-movement
sudo chown $USER:$USER /var/www/ym-movement

# Clone and setup application
cd /var/www/ym-movement
git clone <repository> .
pnpm install

# Create production environment file
cat > .env.production << EOF
NODE_ENV=production
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/ym_movement"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="https://yourdomain.com"
# Add other environment variables...
EOF

# Build application
pnpm build

# Run database migrations
pnpm prisma migrate deploy

# Optional: Seed database
pnpm prisma db seed
```

### Step 4: Process Management with PM2

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'ym-movement',
    script: 'pnpm',
    args: 'start',
    cwd: '/var/www/ym-movement',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3100
    },
    env_file: '.env.production',
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 5: Nginx Configuration

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/ym-movement

# Add configuration:
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    
    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3100;
        # Same proxy settings as above...
    }
    
    location /api/auth/ {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:3100;
        # Same proxy settings as above...
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/ym-movement /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 🔒 Production Security Checklist

### Environment Security
- [ ] Use strong, random secrets (NEXTAUTH_SECRET)
- [ ] Enable SSL/TLS (HTTPS only)
- [ ] Configure security headers
- [ ] Set up rate limiting
- [ ] Enable database SSL connections
- [ ] Use environment variables for secrets (never commit to git)

### Database Security
- [ ] Use strong database passwords
- [ ] Restrict database access to application server only
- [ ] Enable SSL for database connections
- [ ] Regular database backups
- [ ] Monitor database performance and access logs

### Application Security
- [ ] Keep dependencies updated (`pnpm audit`)
- [ ] Enable CSRF protection (built into Next.js)
- [ ] Configure Content Security Policy
- [ ] Set up monitoring and logging
- [ ] Regular security audits

### Infrastructure Security
- [ ] Keep server OS updated
- [ ] Configure firewall (UFW on Ubuntu)
- [ ] Disable unnecessary services
- [ ] Use SSH keys (disable password auth)
- [ ] Regular security updates

## 📊 Monitoring and Maintenance

### Health Checks
```bash
# Application health
curl https://yourdomain.com/api/health

# Database connectivity
curl https://yourdomain.com/api/health/database

# Detailed system status
curl https://yourdomain.com/api/health/detailed
```

### Log Monitoring
```bash
# PM2 logs
pm2 logs ym-movement

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -f -u nginx
```

### Database Backup
```bash
# Create backup script
cat > /home/ubuntu/backup-db.sh << EOF
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U your_user ym_movement > /backups/ym_movement_$DATE.sql
find /backups -name "ym_movement_*.sql" -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup-db.sh

# Add to crontab for daily backups
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-db.sh
```

### Updates and Maintenance
```bash
# Update application
cd /var/www/ym-movement
git pull origin main
pnpm install
pnpm build
pnpm prisma migrate deploy
pm2 restart ym-movement

# Update system
sudo apt update && sudo apt upgrade -y
sudo systemctl restart nginx
```

## 🐛 Troubleshooting

### Common Issues

**Application won't start**
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs ym-movement

# Check environment variables
pm2 env 0
```

**Database connection issues**
```bash
# Test database connection
psql -h localhost -U your_user -d ym_movement

# Check PostgreSQL status
sudo systemctl status postgresql

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

**Nginx configuration issues**
```bash
# Test configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

### Performance Optimization

**Enable Nginx caching**
```nginx
# Add to server block
location /_next/static/ {
    alias /var/www/ym-movement/.next/static/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location /images/ {
    expires 30d;
    add_header Cache-Control "public, no-transform";
}
```

**Database optimization**
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_lessons_start_time ON "Lesson"("startTime");
CREATE INDEX idx_users_email ON "User"("email");
CREATE INDEX idx_time_slots_date_rink ON "RinkTimeSlot"("date", "rinkId");
```

## 📞 Support

For deployment support:
- **Documentation**: This guide and README.md
- **Issues**: GitHub repository issues
- **Community**: Project discussions
- **Emergency**: Contact system administrator
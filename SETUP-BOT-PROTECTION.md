# Bot Protection Setup Guide

Quick setup guide for the multi-layer bot protection system.

## Prerequisites

- Node.js 20+ and pnpm installed
- A Cloudflare account (free tier is sufficient)

## Setup Steps

### 1. Install Dependencies

Dependencies are already installed via package.json:
```bash
# Already included: @marsidev/react-turnstile
```

### 2. Get Cloudflare Turnstile Keys

**Step-by-step:**

1. **Sign up/Login to Cloudflare**
   - Go to https://dash.cloudflare.com/
   - Create a free account or log in

2. **Navigate to Turnstile**
   - In the dashboard, find **"Turnstile"** in the sidebar
   - Or go directly to: https://dash.cloudflare.com/?to=/:account/turnstile

3. **Create a New Site**
   - Click **"Add Site"** or **"Create"**
   - Enter your domain (e.g., `localhost` for development, `yourdomain.com` for production)
   - **Widget Mode**: Select **"Managed"** (recommended - invisible for most users)
   - **Pre-clearance**: Leave unchecked (default)
   - Click **"Create"**

4. **Copy Your Keys**
   After creation, you'll see:
   - **Site Key** - This is public and goes in frontend code
   - **Secret Key** - This is private and stays on the server

### 3. Configure Environment Variables

**Development (.env.local):**
```bash
# Copy from .env.example and fill in your keys
NEXT_PUBLIC_TURNSTILE_SITE_KEY="your_site_key_here"
TURNSTILE_SECRET_KEY="your_secret_key_here"
```

**Production (deployment platform):**
```bash
# Add these to your production environment variables
# (Vercel, Netlify, Railway, etc.)
NEXT_PUBLIC_TURNSTILE_SITE_KEY="your_production_site_key"
TURNSTILE_SECRET_KEY="your_production_secret_key"
```

**Test Keys (for development only):**
```bash
# Use these for testing without a Cloudflare account
# They always pass verification
NEXT_PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000000000AA"
TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"
```

### 4. Restart Development Server

```bash
# Stop the server (Ctrl+C) and restart
pnpm dev
```

### 5. Test the Protection

**Manual Testing:**
1. Go to `http://localhost:3100/auth/signup`
2. Fill out the signup form
3. You should see a Turnstile verification widget (small checkbox)
4. Complete the form and submit
5. Check that signup succeeds ✅

**Automated Testing:**
```bash
# Run the bot protection test suite
pnpm test:bot-protection
```

**Test all three layers:**
- ✅ Honeypot: Hidden field catches bots
- ✅ Turnstile: CAPTCHA verification works
- ✅ Rate Limiting: 6th signup in an hour is blocked

## Verification Checklist

- [ ] Turnstile keys configured in `.env.local`
- [ ] Development server restarted
- [ ] Signup form shows Turnstile widget
- [ ] Can complete signup successfully
- [ ] Rate limiting works (6th attempt blocked)
- [ ] Production keys configured in deployment platform
- [ ] Tested in production environment

## Troubleshooting

### Widget Not Showing

**Symptoms:** No Turnstile checkbox appears on signup form

**Solutions:**
1. Check browser console for errors
2. Verify `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set
3. Make sure you restarted the dev server after adding env vars
4. Check that the domain in Cloudflare matches your current domain

### All Signups Rejected

**Symptoms:** Every signup fails with "verification failed"

**Solutions:**
1. Verify `TURNSTILE_SECRET_KEY` is set (server-side)
2. Check server logs for verification errors
3. Ensure keys are from the same Turnstile site
4. Try using test keys first to isolate the issue

### Rate Limiting Too Aggressive

**Symptoms:** Legitimate users getting blocked

**Solutions:**
1. Increase limit in `src/lib/security.ts`:
   ```typescript
   // Change from 5 to 10 signups per hour
   export const authRateLimiter = new RateLimiter(10, 60 * 60 * 1000);
   ```
2. Restart server for changes to take effect
3. Consider if multiple users share same IP (office/school network)

### Turnstile Widget Shows Error

**Symptoms:** Widget displays error message

**Solutions:**
1. Check Cloudflare dashboard for quota/issues
2. Verify domain matches configuration
3. Ensure no ad blockers are interfering
4. Try refreshing the page

## Production Deployment

### Vercel/Netlify/Railway

1. **Add Environment Variables:**
   - Go to your project settings
   - Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - Add `TURNSTILE_SECRET_KEY`
   - Make sure to use your production keys

2. **Deploy:**
   ```bash
   git push origin main
   # Or manually deploy via platform dashboard
   ```

3. **Verify:**
   - Visit your production signup page
   - Complete a test signup
   - Check logs for security events

### Environment-Specific Keys

**Recommended:** Use different Turnstile sites for dev/staging/prod:

```bash
# Development (.env.local)
NEXT_PUBLIC_TURNSTILE_SITE_KEY="dev_site_key"
TURNSTILE_SECRET_KEY="dev_secret_key"

# Staging (staging environment)
NEXT_PUBLIC_TURNSTILE_SITE_KEY="staging_site_key"
TURNSTILE_SECRET_KEY="staging_secret_key"

# Production (production environment)
NEXT_PUBLIC_TURNSTILE_SITE_KEY="prod_site_key"
TURNSTILE_SECRET_KEY="prod_secret_key"
```

## Monitoring

### Security Event Logs

Bot detection attempts are logged to console/logs:

```bash
# In production, search logs for security events
grep "SECURITY_EVENT" logs/app.log

# Common events:
# - BOT_DETECTED_HONEYPOT: Honeypot field was filled
# - INVALID_TURNSTILE_TOKEN: Token verification failed
# - RATE_LIMIT_EXCEEDED: Too many signup attempts
```

### Cloudflare Dashboard

Monitor Turnstile usage in Cloudflare dashboard:
- Total verifications
- Success/failure rates
- Geographic distribution
- Time-based trends

## Next Steps

- [ ] Read full documentation: `BOT-PROTECTION.md`
- [ ] Configure monitoring alerts for bot attempts
- [ ] Review security event logs regularly
- [ ] Consider adding email notifications for admins on bot detection
- [ ] Test all three layers in production after deployment

## Support

If you encounter issues:
1. Check `BOT-PROTECTION.md` for detailed documentation
2. Run `pnpm test:bot-protection` to verify setup
3. Review server logs for detailed error messages
4. Verify all environment variables are set correctly

## Cost Summary

**Total Cost: $0/month** 🎉

- **Cloudflare Turnstile**: Free (unlimited verifications)
- **Honeypot**: Free (built-in)
- **Rate Limiting**: Free (in-memory)

All bot protection is completely free, forever.

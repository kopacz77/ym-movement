# Multi-Layer Bot Protection System

This document describes the comprehensive bot protection system implemented for the student signup form.

## Overview

The system implements **three independent layers** of bot protection, all using **FREE solutions**:

1. **Layer 1: Honeypot Field** - Invisible trap for automated bots
2. **Layer 2: Cloudflare Turnstile** - Free CAPTCHA verification
3. **Layer 3: Rate Limiting** - IP-based signup throttling

All layers work independently, providing defense-in-depth protection against bot signups while maintaining a smooth experience for legitimate users.

---

## Layer 1: Honeypot Field

### How It Works

A hidden form field called "website" is added to the signup form but made completely invisible to human users. Automated bots typically auto-fill all form fields, triggering this trap.

### Implementation

**Frontend** (`src/app/auth/signup/page.tsx`):
```tsx
// Hidden field - invisible to humans
<div
  style={{
    position: "absolute",
    left: "-9999px",
    opacity: 0,
    pointerEvents: "none",
    height: 0,
    overflow: "hidden",
  }}
  aria-hidden="true"
>
  <Label htmlFor="website" className="sr-only">
    Leave this field blank
  </Label>
  <Input
    id="website"
    name="website"
    type="text"
    tabIndex={-1}
    autoComplete="off"
    value={honeypot}
    onChange={(e) => setHoneypot(e.target.value)}
  />
</div>
```

**Backend** (`src/app/api/auth/signup/route.ts`):
```typescript
// Layer 1 Verification: Honeypot field should be empty
if (result.data.honeypot && result.data.honeypot.length > 0) {
  logSecurityEvent("BOT_DETECTED_HONEYPOT", { ip: clientIP });
  return NextResponse.json(
    { message: "Invalid form submission. Please try again." },
    { status: 400 }
  );
}
```

### Why It Works

- **Invisible to humans**: Positioned off-screen, zero opacity, no pointer events
- **Accessible**: Uses `sr-only` class and `aria-hidden` for screen reader compatibility
- **Bot detection**: Automated form-fillers will populate this field
- **No user friction**: Legitimate users never see or interact with it

---

## Layer 2: Cloudflare Turnstile (Free CAPTCHA)

### What Is Turnstile?

Cloudflare Turnstile is a free, privacy-friendly CAPTCHA alternative that:
- Verifies users are human without annoying puzzles
- Works invisibly for most users
- Is completely free (unlimited requests)
- Respects user privacy (no tracking)

### Setup Instructions

1. **Create a Cloudflare Account** (if you don't have one):
   - Go to https://dash.cloudflare.com/
   - Sign up for free

2. **Add Turnstile to Your Account**:
   - In the Cloudflare Dashboard, navigate to **Turnstile**
   - Click **"Create Site"** or **"Add Site"**

3. **Configure Your Site**:
   - **Domain**: Enter your domain (e.g., `yourdomain.com`)
   - **Widget Mode**: Select **"Managed"** (recommended)
   - Click **"Create"**

4. **Get Your Keys**:
   - After creation, you'll see two keys:
     - **Site Key** (public) - Used in frontend
     - **Secret Key** (private) - Used in backend

5. **Add Keys to Environment**:
   ```bash
   # .env.local (for development)
   NEXT_PUBLIC_TURNSTILE_SITE_KEY="your_site_key_here"
   TURNSTILE_SECRET_KEY="your_secret_key_here"
   ```

6. **Restart Your Development Server**:
   ```bash
   pnpm dev
   ```

### Implementation

**Frontend Component** (`src/app/auth/signup/page.tsx`):
```tsx
import Turnstile from "@marsidev/react-turnstile";

// In component:
<Turnstile
  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
  onSuccess={(token) => setTurnstileToken(token)}
  onError={() => {
    setTurnstileToken(null);
    toast.error("Verification Failed", {
      description: "Please try refreshing the page.",
    });
  }}
  onExpire={() => {
    setTurnstileToken(null);
    toast("Verification Expired", {
      description: "Please verify again.",
    });
  }}
/>
```

**Backend Verification** (`src/app/api/auth/signup/route.ts`):
```typescript
async function verifyTurnstileToken(token: string, clientIP: string): Promise<boolean> {
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: clientIP,
    }),
  });

  const data = await response.json();
  return data.success === true;
}
```

### Testing in Development

The system includes a development bypass:
- If `TURNSTILE_SECRET_KEY` is not configured in `.env`, verification is bypassed in development
- In production, Turnstile is **always required**

**Test Keys** (for development only):
```bash
# These keys always pass verification (use for testing)
NEXT_PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000000000AA"
TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"
```

---

## Layer 3: Rate Limiting

### How It Works

Limits the number of signup attempts from a single IP address to **5 per hour**, preventing bot spam even if other layers are bypassed.

### Implementation

**Rate Limiter** (`src/lib/security.ts`):
```typescript
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.requests.get(identifier);

    if (!record || now > record.resetTime) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (record.count >= this.maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }
}

// 5 signups per hour per IP
export const authRateLimiter = new RateLimiter(5, 60 * 60 * 1000);
```

**API Enforcement** (`src/app/api/auth/signup/route.ts`):
```typescript
const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

if (!authRateLimiter.isAllowed(clientIP)) {
  logSecurityEvent("RATE_LIMIT_EXCEEDED", { ip: clientIP });
  return NextResponse.json(
    { message: "Too many signup attempts. Please try again in an hour." },
    { status: 429 }
  );
}
```

### Benefits

- **In-memory**: No database or external service required
- **Automatic cleanup**: Old entries are removed every hour
- **IP-based**: Tracks by IP address from headers
- **Production-ready**: Works behind proxies and load balancers

---

## Testing Each Layer

### Test Layer 1: Honeypot

1. Open the signup form in a browser
2. Fill out the form normally
3. **Do NOT fill** the honeypot field (it's invisible)
4. Submit the form → Should succeed ✅

**To test bot detection:**
```javascript
// In browser console, simulate bot behavior:
document.getElementById('website').value = 'bot-filled-this';
// Then submit form → Should be rejected ❌
```

### Test Layer 2: Turnstile

1. Configure Turnstile keys in `.env`
2. Open signup form
3. Wait for Turnstile widget to load (small checkbox appears)
4. Complete verification (usually automatic)
5. Submit form → Should succeed ✅

**To test without Turnstile:**
```bash
# Remove keys from .env
# In development: Should bypass and succeed ✅
# In production: Should be rejected ❌
```

### Test Layer 3: Rate Limiting

1. Complete a successful signup
2. Immediately try to signup again (4 more times)
3. On the 6th attempt within an hour → Should be rate limited ❌
4. Wait 1 hour → Should work again ✅

**Check logs for:**
```
SECURITY_EVENT: {"event":"RATE_LIMIT_EXCEEDED","ip":"..."}
```

---

## Security Events

All bot detection attempts are logged via `logSecurityEvent()`:

```typescript
// Events logged:
- BOT_DETECTED_HONEYPOT: Honeypot field was filled
- INVALID_TURNSTILE_TOKEN: Turnstile verification failed
- MISSING_TURNSTILE_TOKEN: No Turnstile token provided (production)
- RATE_LIMIT_EXCEEDED: Too many signup attempts from IP
```

**Log format:**
```json
{
  "timestamp": "2025-11-15T10:30:00.000Z",
  "event": "BOT_DETECTED_HONEYPOT",
  "details": {
    "ip": "192.168.1.1",
    "honeypot": "spam-value"
  },
  "environment": "production"
}
```

---

## User Experience

### For Legitimate Users

1. **Layer 1**: Completely invisible, no impact
2. **Layer 2**: Usually invisible (auto-verification) or one click
3. **Layer 3**: No impact unless attempting rapid signups

**Total additional friction**: ~1-2 seconds for Turnstile verification

### For Bots

1. **Layer 1**: Trapped by honeypot field
2. **Layer 2**: Cannot pass Turnstile verification
3. **Layer 3**: Blocked after 5 attempts per hour

**Bot success rate**: Near zero ✅

---

## Production Deployment

### Environment Variables

Ensure these are set in your production environment:

```bash
# Required for Layer 2
NEXT_PUBLIC_TURNSTILE_SITE_KEY="your_real_site_key"
TURNSTILE_SECRET_KEY="your_real_secret_key"

# Other required variables
NEXTAUTH_SECRET="..."
DATABASE_URL="..."
```

### Deployment Checklist

- [ ] Turnstile keys configured in production
- [ ] Rate limiter cleanup interval is running
- [ ] Security event logging is enabled
- [ ] Test all three layers in production
- [ ] Monitor security event logs
- [ ] Verify legitimate signups work smoothly

---

## Monitoring and Maintenance

### Log Monitoring

Monitor security events to detect bot attacks:

```bash
# In production logs, search for:
grep "SECURITY_EVENT" logs/production.log | grep "BOT_DETECTED"
grep "RATE_LIMIT_EXCEEDED" logs/production.log
```

### Rate Limiter Cleanup

The system automatically cleans up expired rate limit entries every hour:

```typescript
setInterval(() => {
  authRateLimiter.cleanup();
}, 60 * 60 * 1000); // 1 hour
```

### Adjusting Limits

To modify rate limits, edit `src/lib/security.ts`:

```typescript
// Change 5 signups per hour to different values:
export const authRateLimiter = new RateLimiter(
  10,              // Max requests (increase for more lenient)
  60 * 60 * 1000   // Time window in milliseconds
);
```

---

## Troubleshooting

### Issue: Turnstile not loading

**Solution:**
1. Check browser console for errors
2. Verify `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set
3. Ensure domain matches Cloudflare configuration
4. Check network requests aren't being blocked

### Issue: All signups rejected with rate limit

**Solution:**
1. Check if multiple users share same IP (NAT/proxy)
2. Adjust rate limit settings if needed
3. Clear rate limiter state (restart server in development)

### Issue: Legitimate users marked as bots

**Solution:**
1. Check if browser extensions are auto-filling honeypot
2. Verify honeypot field is properly hidden
3. Review security event logs for pattern

### Issue: Turnstile failing in production

**Solution:**
1. Verify `TURNSTILE_SECRET_KEY` is set in production
2. Check Cloudflare dashboard for quota/issues
3. Ensure server can reach Cloudflare API
4. Review Turnstile logs in Cloudflare dashboard

---

## Cost

**All layers are completely FREE:**

- **Layer 1 (Honeypot)**: Free (built-in)
- **Layer 2 (Turnstile)**: Free (unlimited requests on Cloudflare Free plan)
- **Layer 3 (Rate Limiting)**: Free (in-memory, no external service)

**Total cost: $0/month** 🎉

---

## Summary

This multi-layer bot protection system provides enterprise-grade security without any cost:

✅ **Three independent layers** of protection
✅ **Defense-in-depth** approach
✅ **Zero cost** (all free solutions)
✅ **Minimal user friction** (1-2 second verification)
✅ **Production-ready** with proper logging and monitoring
✅ **Privacy-friendly** (no user tracking)

The combination makes it extremely difficult for bots to successfully signup while maintaining a smooth experience for real users.

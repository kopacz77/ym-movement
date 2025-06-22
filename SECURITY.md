# Security Policy

## Overview

This document outlines the security measures implemented in the YM Movement scheduling application to protect user data and maintain system integrity.

## Security Measures Implemented

### 1. Authentication & Authorization

#### ✅ **Secure Session Management**
- JWT tokens with 7-day expiration (reduced from 30 days)
- Secure cookie configuration with `httpOnly`, `sameSite`, and `secure` flags
- Session updates every 24 hours
- Automatic logout on token expiration

#### ✅ **Role-Based Access Control (RBAC)**
- Strict separation between ADMIN and STUDENT roles
- Middleware-level route protection
- Role validation on every request
- Automatic redirection to appropriate dashboards

#### ✅ **Password Security**
- Bcrypt hashing with salt rounds (10)
- Strong password requirements:
  - Minimum 8 characters, maximum 128 characters
  - Must contain uppercase, lowercase, number, and special character
  - Protection against common passwords
- Cryptographically secure token generation for password resets

### 2. API Security

#### ✅ **Input Validation & Sanitization**
- Zod schema validation on all API endpoints
- Input length limits to prevent buffer overflow
- XSS prevention through input sanitization
- SQL injection prevention via Prisma ORM

#### ✅ **Rate Limiting**
- Authentication endpoints: 5 attempts per 15 minutes
- General API endpoints: 100 requests per minute
- IP-based tracking with automatic cleanup

#### ✅ **Error Handling**
- Sanitized error messages in production
- No sensitive information in error responses
- Security event logging for monitoring

### 3. Data Protection

#### ✅ **Data Encryption**
- Passwords hashed with bcrypt
- Sensitive tokens generated with crypto.randomBytes
- Database connections secured (SSL recommended for production)

#### ✅ **PII Protection**
- Student data sanitized before API responses
- Emergency contact information properly structured
- Audit logging for data access

#### ✅ **Environment Security**
- Environment variable validation at startup
- Required security configurations enforced
- No sensitive data in logs

### 4. Frontend Security

#### ✅ **Security Headers**
- Content Security Policy (CSP) configured
- X-Frame-Options: DENY (clickjacking protection)
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict referrer policy

#### ✅ **CSRF Protection**
- SameSite cookie configuration
- Origin validation for API requests
- NextAuth.js built-in CSRF protection

### 5. Infrastructure Security

#### ✅ **HTTPS Enforcement**
- Secure cookie configuration for production
- CSP configured for secure connections
- Automatic HTTPS redirects (to be configured at deployment)

#### ✅ **Dependency Security**
- Regular dependency updates
- Known vulnerability scanning
- Minimal permission principle

## Security Configuration Checklist

### Production Deployment

- [ ] Set `NODE_ENV=production`
- [ ] Configure `NEXTAUTH_SECRET` with 32+ character random string
- [ ] Set `NEXTAUTH_URL` to your production domain
- [ ] Enable SSL/TLS for database connections
- [ ] Configure HTTPS redirects at load balancer/CDN level
- [ ] Set up security monitoring and alerting
- [ ] Remove or disable `ENABLE_AUTH_BYPASS`
- [ ] Configure proper CORS origins
- [ ] Set up automated security scanning

### Environment Variables

```bash
# Required
NEXTAUTH_SECRET=your-secure-32-character-secret
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
NODE_ENV=production

# Optional but recommended
NEXTAUTH_URL=https://yourdomain.com
RESEND_API_KEY=your-resend-api-key
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=your-calendar@gmail.com
```

## Security Monitoring

### Logged Security Events

- Failed authentication attempts
- Rate limit violations
- Invalid data submissions
- Weak password attempts
- Duplicate registration attempts
- Role-based access violations

### Monitoring Recommendations

1. **Set up log aggregation** (e.g., ELK stack, Splunk)
2. **Configure alerting** for security events
3. **Monitor authentication patterns** for anomalies
4. **Regular security audits** of user accounts
5. **Database activity monitoring**

## Incident Response

### Security Incident Types

1. **Authentication Bypass**
2. **Data Breach**
3. **Unauthorized Access**
4. **DDoS/DoS Attacks**
5. **Malicious Data Injection**

### Response Process

1. **Immediate**: Isolate affected systems
2. **Assessment**: Determine scope and impact
3. **Containment**: Stop ongoing attack
4. **Recovery**: Restore secure operations
5. **Lessons Learned**: Update security measures

## Compliance & Standards

### OWASP Top 10 Compliance

- ✅ A01: Broken Access Control - Role-based access control implemented
- ✅ A02: Cryptographic Failures - Strong encryption and hashing
- ✅ A03: Injection - Input validation and parameterized queries
- ✅ A04: Insecure Design - Security-first architecture
- ✅ A05: Security Misconfiguration - Secure defaults and headers
- ✅ A06: Vulnerable Components - Regular dependency updates
- ✅ A07: Authentication Failures - Strong authentication measures
- ✅ A08: Software Integrity Failures - Input validation and CSP
- ✅ A09: Logging Failures - Comprehensive security logging
- ✅ A10: Server-Side Request Forgery - Input validation and restrictions

### Privacy & Data Protection

- **Data Minimization**: Only collect necessary student information
- **Purpose Limitation**: Data used only for scheduling purposes
- **Retention Policy**: Regular cleanup of expired sessions and tokens
- **Access Controls**: Role-based data access
- **Audit Trail**: Logging of data access and modifications

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **DO NOT** open a public issue
2. Email security concerns to: [security-email]
3. Include detailed description and reproduction steps
4. Allow reasonable time for response and remediation

## Security Updates

This security policy will be reviewed and updated regularly to address new threats and improve existing protections.

## Recent Security Updates

### January 2025 Security Patches

✅ **FIXED: Critical Next.js Authorization Bypass (CVE-2025-29927)**
- Updated Next.js from 15.2.1 to 15.3.4
- CVSS Score: 9.1/10 (Critical)
- Impact: Could allow authorization bypass in middleware
- Fix: Upgraded to patched version

✅ **FIXED: DOMPurify XSS Vulnerability (CVE-2025-26791)**  
- Added package overrides to force DOMPurify >=3.2.4
- CVSS Score: 4.5/10 (Moderate)
- Impact: Potential cross-site scripting through template literals
- Fix: Forced upgrade via package overrides

✅ **FIXED: Next.js Dev Server Information Exposure (CVE-2025-48068)**
- Updated Next.js and configured `allowedDevOrigins`
- CVSS Score: Low
- Impact: Limited source code exposure in development
- Fix: Upgraded Next.js and configured dev origin protection

✅ **UPDATED: Dependencies Security Hardening**
- Updated bcrypt from 5.1.1 to 6.0.0
- Updated googleapis from 146.0.0 to 150.0.1
- Updated @hookform/resolvers from 4.1.3 to 5.1.1
- Updated @biomejs/biome from 1.5.3 to 2.0.4
- Removed deprecated critters package

### Security Audit Results: ✅ PASSED
- ✅ 0 Known vulnerabilities in dependencies
- ✅ Security headers properly configured  
- ✅ Development origin protection enabled
- ✅ All security files present and updated

**Last Updated**: January 22, 2025
**Next Review**: February 22, 2025
#!/usr/bin/env node
/**
 * Security Audit Script
 * Runs comprehensive security checks for the application
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const SECURITY_CHECKS = [
  {
    name: 'Dependency Vulnerability Scan',
    command: 'pnpm audit',
    critical: true
  },
  {
    name: 'Outdated Package Check',
    command: 'pnpm outdated',
    critical: false
  },
  {
    name: 'License Compliance Check',
    command: 'pnpm licenses list',
    critical: false
  }
];

const REQUIRED_SECURITY_FILES = [
  'SECURITY.md',
  'src/lib/security.ts',
  'src/lib/env-validation.ts'
];

const SECURITY_HEADERS_CHECK = [
  'X-Frame-Options',
  'X-Content-Type-Options',
  'X-XSS-Protection',
  'Content-Security-Policy',
  'Strict-Transport-Security'
];

async function runSecurityAudit() {
  console.log('🔒 Starting Security Audit...\n');

  // Check for required security files
  console.log('📁 Checking security files...');
  for (const file of REQUIRED_SECURITY_FILES) {
    try {
      await fs.access(file);
      console.log(`✅ ${file} exists`);
    } catch (error) {
      console.log(`❌ ${file} missing`);
    }
  }

  console.log('\n🔍 Running security checks...\n');

  // Run each security check
  for (const check of SECURITY_CHECKS) {
    console.log(`Running: ${check.name}`);
    try {
      const { stdout, stderr } = await execAsync(check.command);
      if (stderr && check.critical) {
        console.log(`⚠️  ${check.name}:`);
        console.log(stderr);
      } else {
        console.log(`✅ ${check.name} completed`);
      }
    } catch (error) {
      if (check.critical) {
        console.log(`❌ ${check.name} failed:`);
        console.log(error.stdout || error.message);
      } else {
        console.log(`⚠️  ${check.name} had warnings (non-critical)`);
      }
    }
    console.log('');
  }

  // Check environment configuration
  console.log('🌍 Checking environment security...');
  const envVars = [
    'NEXTAUTH_SECRET',
    'DATABASE_URL',
    'NODE_ENV'
  ];

  for (const envVar of envVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar} is set`);
    } else {
      console.log(`❌ ${envVar} is missing`);
    }
  }

  // Check Next.js configuration for security settings
  console.log('\n⚙️  Checking Next.js security configuration...');
  try {
    const nextConfigPath = path.join(process.cwd(), 'next.config.js');
    const nextConfig = await fs.readFile(nextConfigPath, 'utf8');
    
    if (nextConfig.includes('allowedDevOrigins')) {
      console.log('✅ Development origin protection configured');
    } else {
      console.log('⚠️  Consider configuring allowedDevOrigins for dev server security');
    }

    if (nextConfig.includes('headers()')) {
      console.log('✅ Security headers configured');
    } else {
      console.log('❌ Security headers not configured');
    }
  } catch (error) {
    console.log('❌ Could not read Next.js configuration');
  }

  console.log('\n🏁 Security audit completed!');
  console.log('\n📋 Security Recommendations:');
  console.log('1. Run `pnpm audit` regularly to check for vulnerabilities');
  console.log('2. Keep dependencies updated with `pnpm update`');
  console.log('3. Review SECURITY.md for deployment security guidelines');
  console.log('4. Enable security monitoring in production');
  console.log('5. Implement regular security testing');
}

// Run the audit
runSecurityAudit().catch(error => {
  console.error('Security audit failed:', error);
  process.exit(1);
});
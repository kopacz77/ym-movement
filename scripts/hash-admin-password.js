#!/usr/bin/env node

import bcrypt from 'bcrypt';

async function generateHash() {
  try {
    const password = 'ADMINPASS2025!';
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    
    console.log('🔐 Password Hash Generated for YM Movement');
    console.log('==========================================');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('');
    console.log('SQL Command to update in Neon DB:');
    console.log(`UPDATE "User" SET password = '${hash}' WHERE email = 'your-admin-email@example.com';`);
    console.log('');
    console.log('Or use Prisma Studio: pnpm prisma studio');
    
  } catch (error) {
    console.error('❌ Error generating password hash:', error);
  }
}

generateHash();
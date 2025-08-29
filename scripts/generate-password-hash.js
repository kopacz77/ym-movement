#!/usr/bin/env node

const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function generatePasswordHash() {
  try {
    rl.question('Enter the new password: ', async (password) => {
      if (!password || password.trim().length === 0) {
        console.log('❌ Password cannot be empty');
        rl.close();
        return;
      }

      const saltRounds = 10;
      const hash = await bcrypt.hash(password.trim(), saltRounds);
      
      console.log('\n✅ Password hash generated successfully!');
      console.log('Hash:', hash);
      console.log('\nTo update in your Neon database:');
      console.log(`UPDATE "User" SET password = '${hash}' WHERE email = 'your-email@example.com';`);
      console.log('\nOr use Prisma Studio:');
      console.log('pnpm prisma studio');
      
      rl.close();
    });
  } catch (error) {
    console.error('❌ Error generating password hash:', error);
    rl.close();
  }
}

console.log('🔐 Password Hash Generator for YM Movement');
console.log('==========================================');
generatePasswordHash();
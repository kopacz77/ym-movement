#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestAccounts() {
  try {
    console.log('🧪 Creating Playwright Test Accounts');
    console.log('====================================');

    // Test admin account
    const adminEmail = 'admin@test.com';
    const adminPassword = 'ADMINPASS2025!';
    const adminHashedPassword = await bcrypt.hash(adminPassword, 10);

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log('✅ Admin test account already exists:', adminEmail);
      
      // Update password to ensure it matches our test password
      await prisma.user.update({
        where: { email: adminEmail },
        data: { password: adminHashedPassword }
      });
      console.log('🔄 Updated admin password for testing');
    } else {
      // Create new admin account
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: adminHashedPassword,
          name: 'Test Admin',
          role: 'ADMIN',
          emailVerified: new Date(),
        }
      });
      console.log('✅ Created admin test account:', adminEmail);
    }

    // Test student account
    const studentEmail = 'test.student@example.com';
    const studentPassword = 'TestPassword123!';
    const studentHashedPassword = await bcrypt.hash(studentPassword, 10);

    // Check if student already exists
    const existingStudent = await prisma.user.findUnique({
      where: { email: studentEmail },
      include: { Student: true }
    });

    if (existingStudent) {
      console.log('✅ Student test account already exists:', studentEmail);
      
      // Update password to ensure it matches our test password
      await prisma.user.update({
        where: { email: studentEmail },
        data: { password: studentHashedPassword }
      });
      
      // Ensure student profile exists and is approved
      if (!existingStudent.Student) {
        await prisma.student.create({
          data: {
            userId: existingStudent.id,
            phone: '555-123-4567',
            level: 'PRELIMINARY',
            maxLessonsPerWeek: 2,
            isApproved: true,
            emergencyContact: {
              name: 'Test Parent',
              phone: '555-987-6543',
              relationship: 'Parent'
            }
          }
        });
        console.log('🆕 Created student profile for existing user');
      } else {
        // Ensure student is approved for testing
        await prisma.student.update({
          where: { id: existingStudent.Student.id },
          data: { 
            isApproved: true,
          }
        });
        console.log('🔄 Updated student profile for testing');
      }
    } else {
      // Create new student account
      const studentUser = await prisma.user.create({
        data: {
          email: studentEmail,
          password: studentHashedPassword,
          name: 'Test Student',
          role: 'STUDENT',
          emailVerified: new Date(),
        }
      });

      await prisma.student.create({
        data: {
          userId: studentUser.id,
          phone: '555-123-4567',
          level: 'PRELIMINARY',
          maxLessonsPerWeek: 2,
          approved: true, // Pre-approved for testing
          emergencyContact: {
            name: 'Test Parent',
            phone: '555-987-6543',
            relationship: 'Parent'
          }
        }
      });
      console.log('✅ Created student test account:', studentEmail);
    }

    console.log('');
    console.log('🎯 Test Account Summary');
    console.log('======================');
    console.log('Admin Account:');
    console.log('  Email:', adminEmail);
    console.log('  Password:', adminPassword);
    console.log('');
    console.log('Student Account:');
    console.log('  Email:', studentEmail);
    console.log('  Password:', studentPassword);
    console.log('');
    console.log('✅ All test accounts ready for Playwright testing!');

  } catch (error) {
    console.error('❌ Error creating test accounts:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAccounts();
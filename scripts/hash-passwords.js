// scripts/hash-passwords.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function hashAllPasswords() {
  console.log("Starting password hashing process...");

  try {
    // Get all users with plaintext passwords
    const users = await prisma.user.findMany({
      where: {
        password: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });

    console.log(`Found ${users.length} users with passwords to hash`);

    // Update each user's password
    for (const user of users) {
      if (!user.password || user.password.startsWith("$2")) {
        // Skip if password is null or already appears to be hashed (bcrypt hashes start with $2)
        console.log(
          `Skipping user ${user.email}: Password is null or already hashed`,
        );
        continue;
      }

      const plaintextPassword = user.password;
      const hashedPassword = await bcrypt.hash(plaintextPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      console.log(`Updated password for user: ${user.email}`);
    }

    console.log("Password hashing completed successfully");
  } catch (error) {
    console.error("Error during password hashing:", error);
  } finally {
    await prisma.$disconnect();
  }
}

hashAllPasswords();

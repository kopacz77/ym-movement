// scripts/fix-existing-payments-and-pricing.ts
// Migration script to fix existing lessons with missing payments and incorrect pricing

import { randomUUID } from "node:crypto";
import { PaymentMethod, PaymentStatus, PrismaClient } from "@prisma/client";
import { calculateLessonPrice } from "../src/lib/pricing";

const prisma = new PrismaClient();

async function fixExistingPaymentsAndPricing() {
  console.log("🔧 Fixing Existing Payments and Pricing...\n");

  try {
    // Get default pricing from database
    const defaultPricing = await prisma.defaultPricing.findFirst();
    console.log("📊 Default Pricing:", defaultPricing);
    console.log("");

    // Get all scheduled lessons
    const allLessons = await prisma.lesson.findMany({
      where: {
        status: "SCHEDULED",
      },
      include: {
        Student: {
          include: {
            User: true,
          },
        },
        Payment: true,
        RinkTimeSlot: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    console.log(`📝 Found ${allLessons.length} scheduled lessons\n`);

    let paymentsCreated = 0;
    let pricesFixed = 0;
    let errors = 0;

    for (const lesson of allLessons) {
      try {
        const duration = lesson.duration || 60;
        const currentPrice = lesson.price;

        // Calculate correct price based on duration
        const correctPrice = calculateLessonPrice(
          lesson.type,
          duration,
          lesson.Student,
          defaultPricing,
        );

        const needsPriceUpdate = Math.abs(currentPrice - correctPrice) > 0.01;
        const needsPayment = !lesson.Payment;

        if (needsPriceUpdate || needsPayment) {
          console.log(`\n🔍 Processing Lesson ID: ${lesson.id}`);
          console.log(`   Student: ${lesson.Student.User.name}`);
          console.log(`   Type: ${lesson.type} (${duration} min)`);
          console.log(`   Date: ${lesson.startTime.toISOString()}`);

          if (needsPriceUpdate) {
            console.log(`   ❌ Current Price: $${currentPrice}`);
            console.log(`   ✅ Correct Price: $${correctPrice}`);

            // Update lesson price
            await prisma.lesson.update({
              where: { id: lesson.id },
              data: { price: correctPrice },
            });

            pricesFixed++;
            console.log(`   ✓ Price updated!`);
          }

          if (needsPayment) {
            console.log(`   ❌ No payment record exists`);

            // Create payment record
            await prisma.payment.create({
              data: {
                lessonId: lesson.id,
                studentId: lesson.studentId,
                amount: correctPrice, // Use the correct price
                method: PaymentMethod.VENMO,
                status: PaymentStatus.PENDING,
                referenceCode: `PAY-${randomUUID().substring(0, 8)}`,
                lesson_date: lesson.startTime,
              },
            });

            paymentsCreated++;
            console.log(`   ✓ Payment record created! ($${correctPrice})`);
          } else if (needsPriceUpdate && lesson.Payment) {
            // Update existing payment with correct price
            await prisma.payment.update({
              where: { lessonId: lesson.id },
              data: { amount: correctPrice },
            });
            console.log(`   ✓ Payment amount updated!`);
          }
        }
      } catch (error) {
        console.error(`   ❌ Error processing lesson ${lesson.id}:`, error);
        errors++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total Lessons Processed: ${allLessons.length}`);
    console.log(`Payments Created: ${paymentsCreated}`);
    console.log(`Prices Fixed: ${pricesFixed}`);
    console.log(`Errors: ${errors}`);
    console.log("=".repeat(60));

    // Verify the fix
    console.log("\n🔍 Verifying fixes...\n");

    const lessonsWithoutPayments = await prisma.lesson.count({
      where: {
        status: "SCHEDULED",
        Payment: null,
      },
    });

    const totalLessons = await prisma.lesson.count({
      where: {
        status: "SCHEDULED",
      },
    });

    const totalPayments = await prisma.payment.count();

    console.log("✅ Verification Results:");
    console.log(`   Total Scheduled Lessons: ${totalLessons}`);
    console.log(`   Total Payments: ${totalPayments}`);
    console.log(`   Lessons Without Payments: ${lessonsWithoutPayments}`);

    if (lessonsWithoutPayments === 0) {
      console.log("\n🎉 SUCCESS! All lessons now have payment records!");
    } else {
      console.log(`\n⚠️  WARNING: ${lessonsWithoutPayments} lessons still missing payments`);
    }

  } catch (error) {
    console.error("❌ Fatal Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run with confirmation
console.log("⚠️  WARNING: This script will modify the database!");
console.log("It will:");
console.log("  1. Create payment records for all lessons without them");
console.log("  2. Fix pricing for 30-minute lessons");
console.log("  3. Update payment amounts to match corrected prices\n");

fixExistingPaymentsAndPricing()
  .then(() => {
    console.log("\n✅ Migration complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  });

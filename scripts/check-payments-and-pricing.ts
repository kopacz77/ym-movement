// scripts/check-payments-and-pricing.ts
// Script to diagnose payment and pricing issues

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkPaymentsAndPricing() {
  console.log("🔍 Checking Payments and Pricing Issues...\n");

  try {
    // 1. Check all lessons
    const allLessons = await prisma.lesson.findMany({
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
        startTime: "desc",
      },
      take: 50, // Last 50 lessons
    });

    console.log(`📊 Found ${allLessons.length} recent lessons\n`);

    // 2. Check for lessons without payments
    const lessonsWithoutPayments = allLessons.filter((lesson) => !lesson.Payment);
    console.log(`❌ Lessons WITHOUT payment records: ${lessonsWithoutPayments.length}`);

    if (lessonsWithoutPayments.length > 0) {
      console.log("\nLessons missing payments:");
      for (const lesson of lessonsWithoutPayments) {
        const duration = lesson.duration || 0;
        console.log(`  - ID: ${lesson.id}`);
        console.log(`    Student: ${lesson.Student.User.name}`);
        console.log(`    Type: ${lesson.type}`);
        console.log(`    Date: ${lesson.startTime.toISOString()}`);
        console.log(`    Duration: ${duration} minutes`);
        console.log(`    Price in Lesson: $${lesson.price}`);
        console.log("");
      }
    }

    // 3. Check lessons with payments
    const lessonsWithPayments = allLessons.filter((lesson) => lesson.Payment);
    console.log(`\n✅ Lessons WITH payment records: ${lessonsWithPayments.length}\n`);

    // 4. Check for pricing mismatches (30-minute lessons with full-hour pricing)
    console.log("🔎 Checking for pricing issues...\n");

    const pricingIssues = [];

    for (const lesson of allLessons) {
      const duration = lesson.duration || 0;
      const price = lesson.price;
      const payment = lesson.Payment;

      // Check if 30-minute lesson has full-hour pricing
      if (duration === 30) {
        let expectedPrice = 0;

        // Calculate expected price based on type
        switch (lesson.type) {
          case "PRIVATE":
            expectedPrice = 60; // $120/hr * 0.5
            break;
          case "CHOREOGRAPHY":
            expectedPrice = 75; // $150/hr * 0.5
            break;
          case "GROUP":
            expectedPrice = 40; // $80/hr * 0.5
            break;
          case "COMPETITION_PREP":
            expectedPrice = 90; // $180/hr * 0.5
            break;
        }

        if (price !== expectedPrice) {
          pricingIssues.push({
            lessonId: lesson.id,
            studentName: lesson.Student.User.name,
            type: lesson.type,
            duration,
            currentPrice: price,
            expectedPrice,
            hasPayment: !!payment,
            paymentAmount: payment?.amount,
          });
        }
      }
    }

    if (pricingIssues.length > 0) {
      console.log(`❌ Found ${pricingIssues.length} pricing issues:\n`);

      for (const issue of pricingIssues) {
        console.log(`  Lesson ID: ${issue.lessonId}`);
        console.log(`    Student: ${issue.studentName}`);
        console.log(`    Type: ${issue.type} (${issue.duration} min)`);
        console.log(`    Current Price: $${issue.currentPrice}`);
        console.log(`    Expected Price: $${issue.expectedPrice}`);
        console.log(`    Has Payment: ${issue.hasPayment ? "Yes" : "No"}`);
        if (issue.hasPayment) {
          console.log(`    Payment Amount: $${issue.paymentAmount}`);
        }
        console.log("");
      }
    } else {
      console.log("✅ No pricing issues found for 30-minute lessons!\n");
    }

    // 5. Summary statistics
    console.log("\n📈 Summary Statistics:");
    console.log(`  Total Lessons: ${allLessons.length}`);
    console.log(`  With Payments: ${lessonsWithPayments.length}`);
    console.log(`  Without Payments: ${lessonsWithoutPayments.length}`);
    console.log(`  Pricing Issues: ${pricingIssues.length}`);

    // 6. Check payment counts
    const totalPayments = await prisma.payment.count();
    const totalLessons = await prisma.lesson.count({
      where: {
        status: "SCHEDULED",
      },
    });

    console.log(`\n💰 Database Totals:`);
    console.log(`  Total Payments: ${totalPayments}`);
    console.log(`  Total Scheduled Lessons: ${totalLessons}`);
    console.log(`  Missing Payments: ${totalLessons - totalPayments}`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPaymentsAndPricing()
  .then(() => {
    console.log("\n✅ Check complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });

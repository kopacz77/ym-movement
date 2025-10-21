import { PrismaClient, LessonType } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Migration script to fix lesson prices that are set to 0
 * This script recalculates prices based on:
 * 1. Student's custom pricing (if enabled)
 * 2. Default pricing from the database
 */

async function fixLessonPrices() {
  console.log("🔧 Starting lesson price fix migration...\n");

  try {
    // Get default pricing
    const defaultPricing = await prisma.defaultPricing.findFirst();
    if (!defaultPricing) {
      console.error("❌ No default pricing found in database!");
      return;
    }

    console.log("📊 Default Pricing:");
    console.log(`   Private: $${defaultPricing.privateLessonPrice}`);
    console.log(`   Choreography: $${defaultPricing.choreographyPrice}`);
    console.log(`   Group: $${defaultPricing.groupLessonPrice}`);
    console.log(`   Competition Prep: $${defaultPricing.competitionPrice}\n`);

    // Find all lessons with price = 0
    const lessonsToFix = await prisma.lesson.findMany({
      where: {
        price: 0,
      },
      include: {
        Student: {
          select: {
            id: true,
            customPricingEnabled: true,
            privateLessonPrice: true,
            choreographyPrice: true,
            groupLessonPrice: true,
            competitionPrepPrice: true,
            User: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    console.log(`📋 Found ${lessonsToFix.length} lessons with incorrect pricing\n`);

    if (lessonsToFix.length === 0) {
      console.log("✅ All lesson prices are already correct!");
      return;
    }

    let updatedCount = 0;
    let errorCount = 0;

    for (const lesson of lessonsToFix) {
      try {
        const student = lesson.Student;
        let correctPrice = 0;

        // Calculate correct price based on lesson type and student pricing
        if (student.customPricingEnabled) {
          switch (lesson.type) {
            case LessonType.PRIVATE:
              correctPrice = student.privateLessonPrice ?? defaultPricing.privateLessonPrice;
              break;
            case LessonType.CHOREOGRAPHY:
              correctPrice = student.choreographyPrice ?? defaultPricing.choreographyPrice;
              break;
            case LessonType.GROUP:
              correctPrice = student.groupLessonPrice ?? defaultPricing.groupLessonPrice;
              break;
            case LessonType.COMPETITION_PREP:
              correctPrice =
                student.competitionPrepPrice ?? defaultPricing.competitionPrice;
              break;
            default:
              correctPrice = defaultPricing.privateLessonPrice;
          }
        } else {
          // Use default pricing
          switch (lesson.type) {
            case LessonType.PRIVATE:
              correctPrice = defaultPricing.privateLessonPrice;
              break;
            case LessonType.CHOREOGRAPHY:
              correctPrice = defaultPricing.choreographyPrice;
              break;
            case LessonType.GROUP:
              correctPrice = defaultPricing.groupLessonPrice;
              break;
            case LessonType.COMPETITION_PREP:
              correctPrice = defaultPricing.competitionPrice;
              break;
            default:
              correctPrice = defaultPricing.privateLessonPrice;
          }
        }

        // Update the lesson price
        await prisma.lesson.update({
          where: { id: lesson.id },
          data: { price: correctPrice },
        });

        // Also update the payment if it exists
        const payment = await prisma.payment.findUnique({
          where: { lessonId: lesson.id },
        });

        if (payment) {
          await prisma.payment.update({
            where: { lessonId: lesson.id },
            data: { amount: correctPrice },
          });
        }

        console.log(
          `✓ Updated lesson for ${student.User?.name || "Unknown"} (${lesson.type}): $${lesson.price} → $${correctPrice}`,
        );
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating lesson ${lesson.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   ✅ Successfully updated: ${updatedCount} lessons`);
    if (errorCount > 0) {
      console.log(`   ❌ Errors: ${errorCount} lessons`);
    }
    console.log(`\n🎉 Migration complete!`);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
fixLessonPrices()
  .then(() => {
    console.log("\n✨ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });

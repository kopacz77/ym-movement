/**
 * Migration Script: Set Default Lesson Types
 *
 * This script updates all existing lessons in the database that don't have
 * a lesson type set to use PRIVATE as the default type.
 *
 * It also ensures all lessons have proper pricing set based on their type.
 *
 * Usage:
 *   npx tsx scripts/migrate-lesson-types.ts
 *
 * Or add to package.json:
 *   "migrate:lesson-types": "tsx scripts/migrate-lesson-types.ts"
 *   Then run: pnpm migrate:lesson-types
 */

import { PrismaClient, LessonType } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateDefaultLessonTypes() {
  console.log("🔄 Starting lesson type migration...\n");

  try {
    // Get default pricing from database
    const defaultPricing = await prisma.defaultPricing.findFirst();

    if (!defaultPricing) {
      console.log("⚠️  No default pricing found. Creating default pricing...");
      await prisma.defaultPricing.create({
        data: {
          privateLessonPrice: 75,
          groupLessonPrice: 45,
          choreographyPrice: 90,
          competitionPrice: 95,
        },
      });
      console.log("✅ Default pricing created\n");
    }

    // Find all lessons without a type or with null type
    const lessonsWithoutType = await prisma.lesson.findMany({
      where: {
        OR: [
          { type: null as any },
          // This will catch any that might have undefined
        ],
      },
      include: {
        Student: {
          select: {
            id: true,
            customPricingEnabled: true,
            privateLessonPrice: true,
            User: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    console.log(`📊 Found ${lessonsWithoutType.length} lessons without type set\n`);

    if (lessonsWithoutType.length === 0) {
      console.log("✅ All lessons already have types set!");
      return;
    }

    // Update each lesson
    let updatedCount = 0;
    let skippedCount = 0;

    for (const lesson of lessonsWithoutType) {
      try {
        // Calculate proper price for PRIVATE lesson
        let price = lesson.price;

        // Only update price if it's 0 or not set
        if (!price || price === 0) {
          if (lesson.Student.customPricingEnabled && lesson.Student.privateLessonPrice) {
            price = lesson.Student.privateLessonPrice;
          } else {
            price = defaultPricing?.privateLessonPrice || 75;
          }
        }

        await prisma.lesson.update({
          where: { id: lesson.id },
          data: {
            type: LessonType.PRIVATE,
            price: price,
          },
        });

        updatedCount++;
        console.log(
          `✅ Updated lesson for ${lesson.Student.User.name || "Unknown"} - Set to PRIVATE ($${price})`
        );
      } catch (error) {
        skippedCount++;
        console.error(
          `❌ Failed to update lesson ${lesson.id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   ✅ Successfully updated: ${updatedCount} lessons`);
    if (skippedCount > 0) {
      console.log(`   ⚠️  Skipped (errors): ${skippedCount} lessons`);
    }
    console.log(`\n🎉 Migration completed successfully!`);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateDefaultLessonTypes()
  .then(() => {
    console.log("\n✨ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration error:", error);
    process.exit(1);
  });

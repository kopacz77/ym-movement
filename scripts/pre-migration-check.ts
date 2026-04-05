import { PrismaClient } from "@prisma/client";

/**
 * Pre-Migration Safety Check
 *
 * Run before any Prisma migration to verify current database state.
 * Reports row counts for critical tables so you can detect unexpected data loss.
 *
 * Usage: pnpm db:check
 */

const prisma = new PrismaClient();

interface TableCount {
  table: string;
  count: number;
}

async function checkDatabase(): Promise<void> {
  console.log("\n=== Database Pre-Migration Check ===\n");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Database: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@") ?? "not set"}\n`);

  const tables: TableCount[] = [];

  try {
    const [users, students, rinks, timeSlots, lessons, payments, notifications] = await Promise.all(
      [
        prisma.user.count(),
        prisma.student.count(),
        prisma.rink.count(),
        prisma.rinkTimeSlot.count(),
        prisma.lesson.count(),
        prisma.payment.count(),
        prisma.notification.count(),
      ],
    );

    tables.push(
      { table: "User", count: users },
      { table: "Student", count: students },
      { table: "Rink", count: rinks },
      { table: "RinkTimeSlot", count: timeSlots },
      { table: "Lesson", count: lessons },
      { table: "Payment", count: payments },
      { table: "Notification", count: notifications },
    );

    // Print table
    console.log("Table              | Rows");
    console.log("-------------------|------");
    for (const { table, count } of tables) {
      console.log(`${table.padEnd(19)}| ${count}`);
    }

    // Warn if critical tables are empty
    const criticalTables = tables.filter(
      (t) => ["RinkTimeSlot", "Lesson", "Payment"].includes(t.table) && t.count === 0,
    );

    if (criticalTables.length > 0) {
      console.log("\n⚠️  WARNING: The following critical tables are EMPTY:");
      for (const { table } of criticalTables) {
        console.log(`   - ${table}`);
      }
      console.log(
        "\n   If this is unexpected, DO NOT run migrations. Check Neon dashboard for restore options.",
      );
    } else {
      console.log("\n✅ All critical tables have data. Safe to proceed with migrations.");
    }

    const totalRows = tables.reduce((sum, t) => sum + t.count, 0);
    console.log(`\nTotal rows across all tables: ${totalRows}\n`);
  } catch (error) {
    console.error("\n❌ Failed to connect to database:", (error as Error).message);
    console.error("   Check your DATABASE_URL in .env\n");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();

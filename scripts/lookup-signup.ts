/**
 * Read-only diagnostic: look up a user by name (case-insensitive partial match)
 * and print their User + Student state, token status, and recent audit trail.
 *
 * Usage: pnpm tsx scripts/lookup-signup.ts "Reina Lee"
 *
 * Safe — SELECT queries only. Does not write or delete anything.
 */
import { prisma } from "@/lib/prisma";

async function main() {
  const query = process.argv[2];
  if (!query) {
    console.error("Usage: tsx scripts/lookup-signup.ts <name-or-email>");
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      Student: true,
      PasswordResetToken: {
        select: { expires: true },
      },
    },
    orderBy: { id: "asc" },
  });

  if (users.length === 0) {
    console.log(`No users matched "${query}".`);
    return;
  }

  for (const u of users) {
    console.log("---");
    console.log(`User id:          ${u.id}`);
    console.log(`Name:             ${u.name}`);
    console.log(`Email:            ${u.email}`);
    console.log(`Role:             ${u.role}`);
    console.log(`Has password:     ${u.password ? "yes" : "no"}`);
    console.log(`Email verified:   ${u.emailVerified ? u.emailVerified.toISOString() : "no"}`);
    if (u.Student) {
      console.log(`Student id:       ${u.Student.id}`);
      console.log(`Student level:    ${u.Student.level}`);
      console.log(`isApproved:       ${u.Student.isApproved}`);
      console.log(`approvedAt:       ${u.Student.approvedAt?.toISOString() ?? "—"}`);
      console.log(`Student created:  ${u.Student.createdAt.toISOString()}`);
    } else {
      console.log("Student record:   (none — orphan user)");
    }
    if (u.PasswordResetToken.length > 0) {
      const now = Date.now();
      for (const t of u.PasswordResetToken) {
        const valid = t.expires.getTime() > now;
        console.log(
          `Reset token:      expires ${t.expires.toISOString()} (${valid ? "VALID" : "expired"})`,
        );
      }
    } else {
      console.log("Reset token:      (none)");
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

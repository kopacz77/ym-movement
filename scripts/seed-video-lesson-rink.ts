import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.rink.findFirst({
    where: { name: "Video Lesson" },
  });

  if (existing) {
    if (!existing.isVirtual) {
      await prisma.rink.update({
        where: { id: existing.id },
        data: { isVirtual: true },
      });
      console.log("Updated existing 'Video Lesson' rink to isVirtual: true");
    } else {
      console.log("'Video Lesson' rink already exists with isVirtual: true");
    }
    return;
  }

  await prisma.rink.create({
    data: {
      name: "Video Lesson",
      address: "Online / Video Call",
      timezone: "America/Los_Angeles",
      isVirtual: true,
    },
  });

  console.log("Created 'Video Lesson' virtual rink");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

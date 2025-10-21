import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkLessons() {
  const lessons = await prisma.lesson.findMany({
    where: {
      Student: {
        User: {
          name: { contains: "Jessie Li" }
        }
      }
    },
    include: {
      Student: {
        include: {
          User: true
        }
      }
    },
    orderBy: {
      startTime: 'desc'
    },
    take: 5
  });

  console.log("Found " + lessons.length + " lessons for Jessie Li:\n");

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    console.log((i + 1) + ". Lesson ID: " + lesson.id);
    console.log("   Type: " + lesson.type);
    console.log("   Price: $" + lesson.price);
    console.log("   Date: " + lesson.startTime.toLocaleDateString());
    console.log("");
  }

  await prisma.$disconnect();
}

checkLessons().catch(console.error);

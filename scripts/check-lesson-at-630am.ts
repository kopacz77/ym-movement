import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkLesson() {
  const lessons = await prisma.lesson.findMany({
    where: {
      Student: {
        User: {
          name: { contains: "Jessie Li" }
        }
      },
      startTime: {
        gte: new Date('2025-10-21T00:00:00'),
        lte: new Date('2025-10-21T23:59:59')
      }
    },
    include: {
      Student: {
        include: {
          User: true
        }
      },
      RinkTimeSlot: true
    }
  });

  console.log("Found " + lessons.length + " lesson(s) for Jessie Li on 10/21/2025:\n");

  for (const lesson of lessons) {
    console.log("Lesson ID: " + lesson.id);
    console.log("Type: " + lesson.type);
    console.log("Price: $" + lesson.price);
    console.log("Start: " + lesson.startTime.toLocaleString());
    console.log("End: " + lesson.endTime.toLocaleString());
    console.log("TimeSlot ID: " + lesson.timeSlotId);
    console.log("");
  }

  await prisma.$disconnect();
}

checkLesson().catch(console.error);

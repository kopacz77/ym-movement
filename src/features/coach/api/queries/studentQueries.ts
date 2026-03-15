import { coachProcedure, createTRPCRouter } from "@/lib/trpc";

export const coachStudentsRouter = createTRPCRouter({
  getMyStudents: coachProcedure.query(async ({ ctx }) => {
    const coachStudents = await ctx.prisma.coachStudent.findMany({
      where: { coachId: ctx.coach.id },
      include: {
        Student: {
          include: {
            User: { select: { name: true, email: true } },
            _count: {
              select: {
                Lesson: {
                  where: { coachId: ctx.coach.id },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return coachStudents.map((cs) => ({
      id: cs.Student.id,
      isPrimary: cs.isPrimary,
      assignedAt: cs.createdAt,
      name: cs.Student.User.name,
      email: cs.Student.User.email,
      level: cs.Student.level,
      isActive: cs.Student.isActive,
      isApproved: cs.Student.isApproved,
      totalLessons: cs.Student._count.Lesson,
    }));
  }),
});

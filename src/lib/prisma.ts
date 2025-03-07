// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Modify log levels to disable query logging
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      // Remove 'query' from this array to stop SQL query logging
      // Use only errors and warnings
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'stdout',
        level: 'warn',
      },
      // {
      //   emit: 'stdout', 
      //   level: 'query',  // COMMENT OUT OR REMOVE THIS
      // },
    ],
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
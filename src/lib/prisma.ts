// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// Modify log levels to disable query logging
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      // Remove 'query' from this array to stop SQL query logging
      // Use only errors and warnings
      // {
      //   emit: 'event',
      // level: 'error',
      //},
      // {
      //   emit: 'stdout',
      //   level: 'warn',
      // },
      // {
      //   emit: 'stdout',
      //   level: 'query',  // COMMENT OUT OR REMOVE THIS
      // },
    ],
  });
};

declare global {
  // Use a different name for the global variable to avoid conflicts
  var globalPrisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.globalPrisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.globalPrisma = prisma;

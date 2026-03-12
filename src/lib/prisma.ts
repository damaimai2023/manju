import { PrismaClient } from "@prisma/client";

// Prisma 7.x requires empty options or specific configuration
const prismaClientSingleton = () => {
  return new PrismaClient({});
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

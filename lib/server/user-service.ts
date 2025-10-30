import { prisma } from './prisma';

export async function getUserPreferences(userId: string) {
  return prisma.preference.findUnique({ where: { userId } });
}

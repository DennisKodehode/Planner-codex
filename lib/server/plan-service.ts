import { addMinutes, differenceInMinutes } from 'date-fns';
import { prisma } from './prisma';

export async function getPlanForDate(userId: string, date: Date) {
  const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const plan = await prisma.plan.findFirst({
    where: { userId, date: startOfDay },
    include: { blocks: { orderBy: { start: 'asc' } } },
  });
  return plan;
}

export function computeTravelBuffer(prevEnd: Date, nextStart: Date) {
  return Math.max(0, differenceInMinutes(nextStart, prevEnd));
}

export function adjustBlocksForInsertion(
  blocks: { id: string; start: Date; durationMin: number }[],
  insertIndex: number,
  durationMin: number,
  travelMin: number
) {
  const newBlocks = [...blocks];
  let carry = durationMin + travelMin;
  for (let i = insertIndex; i < newBlocks.length; i++) {
    const block = newBlocks[i];
    const newStart = addMinutes(block.start, carry);
    newBlocks[i] = { ...block, start: newStart };
  }
  return newBlocks;
}

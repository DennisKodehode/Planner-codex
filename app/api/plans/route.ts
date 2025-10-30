import { NextRequest, NextResponse } from 'next/server';
import { startOfDay } from 'date-fns';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { getSession } from '@/lib/server/session';

const getSchema = z.object({
  date: z.string().optional(),
});

const blockSchema = z.object({
  title: z.string(),
  start: z.string(),
  durationMin: z.number().min(5).max(720),
  notes: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  placeRef: z.string().optional(),
});

const postSchema = z.object({
  date: z.string(),
  blocks: z.array(blockSchema).optional(),
  blockIds: z.array(z.string()).optional(),
  reorder: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const parsed = getSchema.safeParse({ date: searchParams.get('date') ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const date = parsed.data.date ? new Date(parsed.data.date) : startOfDay(new Date());
  const startUtc = startOfDay(date);
  const plan = await prisma.plan.findFirst({
    where: { userId: session.user.id, date: startUtc },
    include: { blocks: { orderBy: { start: 'asc' } } },
  });
  return NextResponse.json({ plan: plan ? { id: plan.id, date: plan.date } : null, blocks: plan?.blocks ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const json = await request.json();
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const date = startOfDay(new Date(parsed.data.date));

  if (parsed.data.reorder && parsed.data.blockIds) {
    const blocks = await prisma.block.findMany({
      where: { id: { in: parsed.data.blockIds } },
      orderBy: { start: 'asc' },
    });
    const ordered = parsed.data.blockIds
      .map((id) => blocks.find((block) => block.id === id))
      .filter((block): block is typeof blocks[number] => Boolean(block));
    if (ordered.length === 0) {
      return NextResponse.json({ error: 'Blocks not found' }, { status: 404 });
    }
    let pointer = ordered[0]?.start ?? new Date();
    await prisma.$transaction(
      ordered.map((block, index) => {
        if (index === 0) {
          pointer = block.start;
          return prisma.block.update({ where: { id: block.id }, data: { start: block.start } });
        }
        pointer = new Date(pointer.getTime() + ordered[index - 1]!.durationMin * 60 * 1000);
        return prisma.block.update({ where: { id: block.id }, data: { start: pointer } });
      })
    );
    const plan = await prisma.plan.findFirst({
      where: { userId: session.user.id, date },
      include: { blocks: { orderBy: { start: 'asc' } } },
    });
    return NextResponse.json({ plan, blocks: plan?.blocks ?? [] });
  }

  if (!parsed.data.blocks) {
    return NextResponse.json({ error: 'No blocks provided' }, { status: 400 });
  }

  const plan = await prisma.plan.upsert({
    where: {
      userId_date: {
        userId: session.user.id,
        date,
      },
    },
    update: {
      blocks: {
        create: parsed.data.blocks.map((block) => ({
          title: block.title,
          start: new Date(block.start),
          durationMin: block.durationMin,
          notes: block.notes,
          lat: block.lat,
          lng: block.lng,
          placeRef: block.placeRef,
        })),
      },
    },
    create: {
      userId: session.user.id,
      date,
      blocks: {
        create: parsed.data.blocks.map((block) => ({
          title: block.title,
          start: new Date(block.start),
          durationMin: block.durationMin,
          notes: block.notes,
          lat: block.lat,
          lng: block.lng,
          placeRef: block.placeRef,
        })),
      },
    },
    include: { blocks: { orderBy: { start: 'asc' } } },
  });

  return NextResponse.json({ plan, blocks: plan.blocks, planId: plan.id, block: plan.blocks.at(-1) });
}

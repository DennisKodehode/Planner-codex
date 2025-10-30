import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { getSession } from '@/lib/server/session';

const patchSchema = z.object({
  title: z.string().optional(),
  notes: z.string().optional(),
  start: z.string().optional(),
  durationMin: z.number().min(5).max(720).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

async function ensureOwnership(blockId: string, userId: string) {
  const block = await prisma.block.findUnique({
    where: { id: blockId },
    include: { plan: true },
  });
  if (!block || block.plan.userId !== userId) {
    return null;
  }
  return block;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const block = await ensureOwnership(params.id, session.user.id);
  if (!block) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const data: Record<string, unknown> = { ...parsed.data };
  if (data.start) {
    data.start = new Date(String(data.start));
  }
  const updated = await prisma.block.update({ where: { id: params.id }, data });
  return NextResponse.json({ block: updated });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const block = await ensureOwnership(params.id, session.user.id);
  if (!block) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await prisma.block.delete({ where: { id: params.id } });
  return NextResponse.json({ blockId: params.id });
}

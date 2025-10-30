import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { getSession } from '@/lib/server/session';

const schema = z.object({
  title: z.string().min(1),
  start: z.string(),
  durationMin: z.number().min(5).max(720),
  notes: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  placeRef: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { planId: string } }) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const plan = await prisma.plan.findUnique({ where: { id: params.planId } });
  if (!plan || plan.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const block = await prisma.block.create({
    data: {
      planId: plan.id,
      title: parsed.data.title,
      start: new Date(parsed.data.start),
      durationMin: parsed.data.durationMin,
      notes: parsed.data.notes,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      placeRef: parsed.data.placeRef,
    },
  });
  return NextResponse.json({ block, planId: plan.id });
}

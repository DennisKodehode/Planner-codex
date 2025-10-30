import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { getSession } from '@/lib/server/session';

const schema = z.object({
  categories: z.array(z.string()),
  maxDistance: z.number().min(100).max(20000),
  minRating: z.number().min(0).max(5),
  priceLevels: z.array(z.number()).default([]),
  budgetDaily: z.number().nullable(),
  locale: z.string(),
  theme: z.string(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const preference = await prisma.preference.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({ preference });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const json = await request.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const preference = await prisma.preference.upsert({
    where: { userId: session.user.id },
    update: parsed.data,
    create: { ...parsed.data, userId: session.user.id },
  });
  return NextResponse.json({ preference });
}

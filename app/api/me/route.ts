import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { getSession } from '@/lib/server/session';

export async function DELETE() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await prisma.user.delete({ where: { id: session.user.id } });
  return NextResponse.json({}, { status: 204 });
}

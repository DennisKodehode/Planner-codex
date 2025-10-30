import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { getSession } from '@/lib/server/session';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      preferences: true,
      plans: { include: { blocks: true } },
      favorites: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const data = JSON.stringify(user, null, 2);
  return new NextResponse(data, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="dayplanner-export.json"',
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/server/session';
import { rateLimit } from '@/lib/server/rate-limit';
import { parseVoiceCommand, snapToFiveMinutes } from '@/lib/intent/parser';

const schema = z.object({
  text: z.string().min(1),
  locale: z.string().default('en'),
});

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
  const limit = await rateLimit(`voice:${session.user.id}`);
  if (!limit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  const intent = parseVoiceCommand(parsed.data.text, new Date(), parsed.data.locale);
  if (!intent) {
    return NextResponse.json({ error: 'Could not understand command' }, { status: 422 });
  }
  switch (intent.type) {
    case 'add':
      return NextResponse.json({
        intent: 'add',
        entities: {
          title: intent.title,
          start: snapToFiveMinutes(intent.start).toISOString(),
          durationMin: intent.duration,
        },
      });
    case 'move':
      return NextResponse.json({
        intent: 'move',
        entities: {
          title: intent.title,
          start: snapToFiveMinutes(intent.start).toISOString(),
        },
      });
    case 'delete':
      return NextResponse.json({ intent: 'delete', entities: { title: intent.title } });
    case 'read':
      return NextResponse.json({ intent: 'read', entities: {} });
    default:
      return NextResponse.json({ error: 'Unsupported intent' }, { status: 422 });
  }
}

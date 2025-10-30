import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/server/rate-limit';
import { getSession } from '@/lib/server/session';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const limit = await rateLimit(`voice-transcribe:${session.user.id}`);
  if (!limit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        text: '',
        error: 'Server-side transcription is disabled. Configure OPENAI_API_KEY to enable Whisper.',
      },
      { status: 503 }
    );
  }
  // TODO: Implement Whisper transcription when an external file store is available.
  return NextResponse.json({ text: '', error: 'Not implemented in this environment.' }, { status: 501 });
}

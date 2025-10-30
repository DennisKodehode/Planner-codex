import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/server/rate-limit';
import { getSession } from '@/lib/server/session';

const schema = z.object({
  fromLat: z.coerce.number(),
  fromLng: z.coerce.number(),
  toLat: z.coerce.number(),
  toLng: z.coerce.number(),
  mode: z.enum(['walking', 'driving', 'transit']).default('walking'),
});

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const parsed = schema.safeParse({
    fromLat: searchParams.get('fromLat'),
    fromLng: searchParams.get('fromLng'),
    toLat: searchParams.get('toLat'),
    toLng: searchParams.get('toLng'),
    mode: searchParams.get('mode') ?? 'walking',
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const limit = await rateLimit(`travel:${session.user.id}`);
  if (!limit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  const distanceMeters = haversine(parsed.data.fromLat, parsed.data.fromLng, parsed.data.toLat, parsed.data.toLng);
  const speedMps = parsed.data.mode === 'walking' ? 1.4 : parsed.data.mode === 'driving' ? 13.8 : 6.0;
  const minutes = Math.round(distanceMeters / speedMps / 60);
  return NextResponse.json({ minutes, distanceMeters });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/server/rate-limit';
import { getSession } from '@/lib/server/session';

const schema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  from: z.string(),
  to: z.string(),
  radius: z.coerce.number().default(2000),
  cat: z.array(z.string()).optional(),
});

const catalog = [
  {
    id: 'oslo-coffee-1',
    title: 'Oslo Kaffebar',
    category: 'coffee_shop',
    lat: 59.9148,
    lng: 10.7513,
    rating: 4.7,
    priceLevel: 1,
    description: 'Specialty coffee with Scandinavian roasts.',
  },
  {
    id: 'oslo-park-1',
    title: 'St. Hanshaugen Park',
    category: 'park',
    lat: 59.924,
    lng: 10.738,
    rating: 4.6,
    priceLevel: 0,
    description: 'Hilly park with panoramic views over Oslo.',
  },
  {
    id: 'oslo-gym-1',
    title: 'SATS Spektrum',
    category: 'gym',
    lat: 59.9122,
    lng: 10.7517,
    rating: 4.3,
    priceLevel: 2,
    description: 'Full-service gym next to Oslo Spektrum.',
  },
  {
    id: 'oslo-museum-1',
    title: 'Munch Museum',
    category: 'museum',
    lat: 59.9129,
    lng: 10.7605,
    rating: 4.5,
    priceLevel: 2,
    description: 'Modern museum dedicated to Edvard Munch.',
  },
  {
    id: 'oslo-park-2',
    title: 'Botanical Garden',
    category: 'park',
    lat: 59.9196,
    lng: 10.7608,
    rating: 4.8,
    priceLevel: 0,
    description: 'Historic gardens with themed plant collections.',
  },
];

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
  const catValues = searchParams.getAll('cat');
  const parsed = schema.safeParse({
    lat: searchParams.get('lat'),
    lng: searchParams.get('lng'),
    from: searchParams.get('from'),
    to: searchParams.get('to'),
    radius: searchParams.get('radius'),
    cat: catValues.length ? catValues : undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const limit = await rateLimit(`recommendations:${session.user.id}`);
  if (!limit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { lat, lng, radius, cat } = parsed.data;
  const results = catalog
    .map((item) => ({
      ...item,
      distanceMeters: haversine(lat, lng, item.lat, item.lng),
    }))
    .filter((item) => item.distanceMeters <= radius)
    .filter((item) => (cat ? cat.includes(item.category) : true))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 10);

  return NextResponse.json(results);
}

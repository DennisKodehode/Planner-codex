import { addMinutes, set } from 'date-fns';
import { prisma } from '@/lib/server/prisma';

const SEED_LAT = 59.9139;
const SEED_LNG = 10.7522;

async function main() {
  const email = 'demo@dayplanner.app';
  await prisma.favoritePlace.deleteMany({ where: { user: { email } } });
  await prisma.block.deleteMany({ where: { plan: { user: { email } } } });
  await prisma.plan.deleteMany({ where: { user: { email } } });
  await prisma.preference.deleteMany({ where: { user: { email } } });
  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: {
      email,
      name: 'Demo User',
      preferences: {
        create: {
          categories: ['coffee_shop', 'park', 'gym'],
          maxDistance: 2000,
          minRating: 4.0,
          priceLevels: [0, 1, 2],
          budgetDaily: 60000,
          locale: 'en',
          theme: 'system',
        },
      },
      favorites: {
        create: [
          {
            name: 'Oslo Kaffebar',
            placeRef: 'seed-oslo-coffee',
            lat: SEED_LAT + 0.002,
            lng: SEED_LNG + 0.001,
            metaJson: { category: 'coffee_shop', rating: 4.6 },
          },
          {
            name: 'St. Hanshaugen Park',
            placeRef: 'seed-oslo-park',
            lat: SEED_LAT + 0.01,
            lng: SEED_LNG - 0.005,
            metaJson: { category: 'park', rating: 4.7 },
          },
          {
            name: 'SATS Spektrum',
            placeRef: 'seed-oslo-gym',
            lat: SEED_LAT - 0.004,
            lng: SEED_LNG + 0.003,
            metaJson: { category: 'gym', rating: 4.4 },
          },
        ],
      },
    },
  });

  const today = set(new Date(), { hours: 6, minutes: 0, seconds: 0, milliseconds: 0 });

  await prisma.plan.create({
    data: {
      userId: user.id,
      date: today,
      blocks: {
        create: [
          {
            title: 'Morning Run',
            start: today,
            durationMin: 45,
          },
          {
            title: 'Coffee with Anna',
            start: addMinutes(today, 60),
            durationMin: 60,
            lat: SEED_LAT + 0.002,
            lng: SEED_LNG + 0.001,
            placeRef: 'seed-oslo-coffee',
          },
          {
            title: 'Client Workshop',
            start: addMinutes(today, 180),
            durationMin: 120,
          },
        ],
      },
    },
  });

  console.log('Seeded demo user. Email: demo@dayplanner.app');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

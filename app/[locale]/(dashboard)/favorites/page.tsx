import { redirect } from 'next/navigation';
import { startOfDay } from 'date-fns';
import { prisma } from '@/lib/server/prisma';
import { getSession } from '@/lib/server/session';
import { getPlanForDate } from '@/lib/server/plan-service';
import { FavoriteList } from '@/components/favorites/favorite-list';

export default async function FavoritesPage({ params }: { params: { locale: string } }) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }
  const favorites = await prisma.favoritePlace.findMany({ where: { userId: session.user.id } });
  const today = startOfDay(new Date());
  const plan = await getPlanForDate(session.user.id, today);
  return (
    <FavoriteList favorites={favorites} planId={plan?.id} date={today.toISOString()} />
  );
}

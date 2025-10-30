import { redirect } from 'next/navigation';
import { startOfDay } from 'date-fns';
import { getSession } from '@/lib/server/session';
import { getPlanForDate } from '@/lib/server/plan-service';
import { getUserPreferences } from '@/lib/server/user-service';
import { RecommendationPanel } from '@/components/recommendations/recommendation-panel';

export default async function DiscoverPage({ params }: { params: { locale: string } }) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }
  const today = startOfDay(new Date());
  const plan = await getPlanForDate(session.user.id, today);
  const preferences = await getUserPreferences(session.user.id);
  return (
    <div className="grid gap-6">
      <RecommendationPanel
        locale={params.locale}
        planId={plan?.id}
        date={today.toISOString()}
        preferences={preferences}
      />
    </div>
  );
}

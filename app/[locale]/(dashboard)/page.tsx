import { redirect } from 'next/navigation';
import { startOfDay } from 'date-fns';
import { getSession } from '@/lib/server/session';
import { getPlanForDate } from '@/lib/server/plan-service';
import { getUserPreferences } from '@/lib/server/user-service';
import { PlanTimeline } from '@/components/plan/plan-timeline';
import { RecommendationPanel } from '@/components/recommendations/recommendation-panel';

export default async function PlanPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { date?: string };
}) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const dateParam = searchParams?.date ? new Date(searchParams.date) : startOfDay(new Date());
  const plan = await getPlanForDate(session.user.id, dateParam);
  const preferences = await getUserPreferences(session.user.id);

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <PlanTimeline
        locale={params.locale}
        date={dateParam.toISOString()}
        planId={plan?.id}
        initialBlocks={(plan?.blocks ?? []).map((block) => ({
          ...block,
          start: block.start.toISOString(),
        }))}
      />
      <RecommendationPanel
        locale={params.locale}
        preferences={preferences}
        planId={plan?.id}
        date={dateParam.toISOString()}
      />
    </div>
  );
}

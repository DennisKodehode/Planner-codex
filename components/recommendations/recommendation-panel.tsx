'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToastStore } from '@/components/ui/use-toast';
import { usePlanStore } from '@/lib/hooks/usePlanStore';

const Map = dynamic(() => import('./recommendation-map'), { ssr: false });

type Recommendation = {
  id: string;
  title: string;
  category: string;
  lat: number;
  lng: number;
  rating?: number;
  priceLevel?: number;
  description?: string;
  distanceMeters?: number;
};

export function RecommendationPanel({
  locale,
  planId,
  date,
  preferences,
}: {
  locale: string;
  planId?: string;
  date: string;
  preferences: {
    categories: string[];
    maxDistance: number;
    minRating: number;
    priceLevels: number[];
  } | null;
}) {
  const t = useTranslations('discover');
  const recommendationT = useTranslations('recommendations');
  const toastT = useTranslations('toast');
  const { pushToast } = useToastStore();
  const planStore = usePlanStore((state) => state.planId);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({ lat: result.coords.latitude, lng: result.coords.longitude });
      },
      () => {
        setPosition({ lat: 59.9139, lng: 10.7522 });
      }
    );
  }, []);

  const query = useQuery({
    queryKey: ['recommendations', position?.lat, position?.lng, preferences],
    enabled: Boolean(position),
    queryFn: async () => {
      const url = new URL('/api/recommendations', window.location.origin);
      if (position) {
        url.searchParams.set('lat', String(position.lat));
        url.searchParams.set('lng', String(position.lng));
      }
      url.searchParams.set('from', date);
      url.searchParams.set('to', date);
      if (preferences) {
        url.searchParams.set('radius', String(preferences.maxDistance));
        preferences.categories.forEach((category) => url.searchParams.append('cat', category));
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to load recommendations');
      return (await res.json()) as Recommendation[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (recommendation: Recommendation) => {
      const store = usePlanStore.getState();
      const activePlanId = planId ?? planStore ?? store.planId;
      if (activePlanId) {
        const res = await fetch(`/api/plans/${activePlanId}/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: recommendation.title,
            start: new Date(date).toISOString(),
            durationMin: 60,
            lat: recommendation.lat,
            lng: recommendation.lng,
            placeRef: recommendation.id,
          }),
        });
        if (!res.ok) throw new Error('Failed to add recommendation');
        return res.json();
      }
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          blocks: [
            {
              title: recommendation.title,
              start: date,
              durationMin: 60,
              lat: recommendation.lat,
              lng: recommendation.lng,
              placeRef: recommendation.id,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error('Failed to create plan');
      return res.json();
    },
    onSuccess: ({ block, planId: newPlanId }) => {
      const store = usePlanStore.getState();
      store.addBlock(block);
      if (newPlanId) {
        store.setPlanId(newPlanId);
      }
      pushToast({ title: toastT('added', { title: block.title }) });
    },
    onError: () => pushToast({ variant: 'destructive', title: 'Failed to add block' }),
  });

  const markers = useMemo(() => query.data ?? [], [query.data]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-60 overflow-hidden rounded-lg border">
          <Map markers={markers} locale={locale} />
        </div>
        <div className="space-y-3">
          {query.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {query.isError && <p className="text-sm text-destructive">Unable to load recommendations.</p>}
          {!query.isLoading && markers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{recommendationT('empty')}</p>
          ) : null}
          {markers.map((item) => (
            <div key={item.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{item.category}</Badge>
                    {item.rating ? <Badge variant="outline">★ {item.rating.toFixed(1)}</Badge> : null}
                    {typeof item.priceLevel === 'number' ? (
                      <Badge variant="outline">{'$'.repeat(item.priceLevel + 1)}</Badge>
                    ) : null}
                    {item.distanceMeters ? (
                      <Badge variant="outline">{Math.round(item.distanceMeters)} m</Badge>
                    ) : null}
                  </div>
                </div>
                <Button size="sm" onClick={() => addMutation.mutate(item)} disabled={addMutation.isLoading}>
                  {recommendationT('add')}
                </Button>
              </div>
              {item.description ? <p className="mt-2 text-xs text-muted-foreground">{item.description}</p> : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

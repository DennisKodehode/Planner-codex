'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToastStore } from '@/components/ui/use-toast';
import { usePlanStore } from '@/lib/hooks/usePlanStore';

interface FavoritePlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  placeRef: string;
  metaJson: Record<string, any>;
}

export function FavoriteList({ favorites, planId, date }: { favorites: FavoritePlace[]; planId?: string; date: string }) {
  const t = useTranslations('favorites');
  const recommendationT = useTranslations('recommendations');
  const { pushToast } = useToastStore();

  const mutation = useMutation({
    mutationFn: async (favorite: FavoritePlace) => {
      const store = usePlanStore.getState();
      const activePlanId = planId ?? store.planId;
      if (activePlanId) {
        const res = await fetch(`/api/plans/${activePlanId}/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: favorite.name,
            start: date,
            durationMin: 60,
            lat: favorite.lat,
            lng: favorite.lng,
            placeRef: favorite.placeRef,
          }),
        });
        if (!res.ok) throw new Error('Failed to add favorite');
        return res.json();
      }
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          blocks: [
            {
              title: favorite.name,
              start: date,
              durationMin: 60,
              lat: favorite.lat,
              lng: favorite.lng,
              placeRef: favorite.placeRef,
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
      pushToast({ title: recommendationT('added', { title: block.title }) });
    },
    onError: () => pushToast({ variant: 'destructive', title: 'Unable to add favorite to plan' }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {favorites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No favorites saved yet.</p>
        ) : (
          favorites.map((favorite) => (
            <div key={favorite.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-semibold">{favorite.name}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{favorite.lat.toFixed(3)}, {favorite.lng.toFixed(3)}</Badge>
                  {favorite.metaJson?.category ? <Badge variant="secondary">{favorite.metaJson.category}</Badge> : null}
                </div>
              </div>
              <Button size="sm" onClick={() => mutation.mutate(favorite)} disabled={mutation.isLoading}
                {recommendationT('add')}
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

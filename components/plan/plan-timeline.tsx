'use client';

import { useEffect } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToastStore } from '@/components/ui/use-toast';
import { usePlanStore, type PlanBlock } from '@/lib/hooks/usePlanStore';
import { SortablePlanBlock } from './sortable-plan-block';
import { VoiceMicButton } from '@/components/voice/voice-mic-button';

interface PlanTimelineProps {
  locale: string;
  date: string;
  planId?: string;
  initialBlocks: Array<Omit<PlanBlock, "start"> & { start: string | Date }>;
}

export function PlanTimeline({ locale, date, planId, initialBlocks }: PlanTimelineProps) {
  const t = useTranslations('plan');
  const { pushToast } = useToastStore();
  const queryClient = useQueryClient();
  const setPlanId = usePlanStore((state) => state.setPlanId);
  const setBlocks = usePlanStore((state) => state.setBlocks);
  const blocks = usePlanStore((state) => state.blocks);

  useEffect(() => {
    setPlanId(planId);
    setBlocks(initialBlocks.map((block) => ({ ...block, start: new Date(block.start) })));
  }, [initialBlocks, planId, setBlocks, setPlanId]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useQuery({
    queryKey: ['plan', date],
    queryFn: async () => {
      const res = await fetch(`/api/plans?date=${date}`);
      if (!res.ok) throw new Error('Failed to load plan');
      const data = await res.json();
      setPlanId(data.plan?.id);
      setBlocks(data.blocks.map((block: any) => ({ ...block, start: new Date(block.start) })));
      return data;
    },
    initialData: { plan: planId ? { id: planId } : undefined, blocks: initialBlocks },
  });

  const reorderMutation = useMutation({
    mutationFn: async (payload: { blockIds: string[] }) => {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, blockIds: payload.blockIds, reorder: true }),
      });
      if (!res.ok) throw new Error('Failed to reorder');
      return res.json();
    },
    onError: () => {
      pushToast({ variant: 'destructive', title: 'Reorder failed', description: 'Try again.' });
      queryClient.invalidateQueries({ queryKey: ['plan', date] });
    },
  });

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((block) => block.id === active.id);
    const newIndex = blocks.findIndex((block) => block.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(blocks, oldIndex, newIndex);
    setBlocks(newOrder);
    reorderMutation.mutate({ blockIds: newOrder.map((block) => block.id) });
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-xl">{format(new Date(date), 'PPP', { locale: undefined })}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('voicePrompt')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => pushToast({ title: t('addBlock') })}>{t('addBlock')}</Button>
          <VoiceMicButton locale={locale} planId={planId} date={date} />
        </div>
      </CardHeader>
      <CardContent>
        {blocks.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {blocks.map((block, index) => (
                  <div key={block.id} className="rounded-lg border bg-card">
                    <SortablePlanBlock block={block} index={index} />
                    {index < blocks.length - 1 ? <Separator /> : null}
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}

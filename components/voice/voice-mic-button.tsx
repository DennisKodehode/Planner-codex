'use client';

import { Mic, MicOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToastStore } from '@/components/ui/use-toast';
import { useSpeechRecognition, speak } from '@/lib/voice/useSpeechRecognition';
import { usePlanStore } from '@/lib/hooks/usePlanStore';

interface VoiceMicButtonProps {
  locale: string;
  date: string;
  planId?: string;
}

export function VoiceMicButton({ locale, date, planId }: VoiceMicButtonProps) {
  const t = useTranslations('voice');
  const toastT = useTranslations('toast');
  const { pushToast } = useToastStore();
  const currentPlanId = usePlanStore((state) => state.planId);

  const interpretMutation = useMutation({
    mutationFn: async (payload: { text: string }) => {
      const res = await fetch('/api/voice/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, locale }),
      });
      if (!res.ok) throw new Error('interpretation failed');
      return res.json() as Promise<{ intent: string; entities: Record<string, unknown> }>;
    },
    onError: () => {
      pushToast({ variant: 'destructive', title: t('error') });
    },
  });

  const addBlockMutation = useMutation({
    mutationFn: async (data: { title: string; start: string; durationMin: number }) => {
      const activePlanId = planId ?? currentPlanId;
      if (activePlanId) {
        const res = await fetch(`/api/plans/${activePlanId}/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to add block');
        return res.json();
      }
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, blocks: [data] }),
      });
      if (!res.ok) throw new Error('Failed to create plan');
      return res.json();
    },
    onSuccess: (payload) => {
      const { block, planId: newPlanId } = payload;
      const store = usePlanStore.getState();
      store.addBlock(block);
      if (newPlanId) {
        store.setPlanId(newPlanId);
      }
      pushToast({ title: toastT('added', { title: block.title }) });
    },
    onError: () => {
      pushToast({ variant: 'destructive', title: t('error') });
    },
  });

  const moveBlockMutation = useMutation({
    mutationFn: async (data: { title: string; start: string }) => {
      const block = usePlanStore.getState().blocks.find((item) => item.title.toLowerCase() === data.title.toLowerCase());
      if (!block) throw new Error('Block not found');
      const res = await fetch(`/api/blocks/${block.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: data.start }),
      });
      if (!res.ok) throw new Error('Failed to move block');
      return res.json();
    },
    onSuccess: (payload) => {
      usePlanStore.getState().updateBlock(payload.block.id, payload.block);
      pushToast({ title: toastT('updated') });
    },
    onError: () => pushToast({ variant: 'destructive', title: t('error') }),
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (data: { title: string }) => {
      const block = usePlanStore.getState().blocks.find((item) => item.title.toLowerCase() === data.title.toLowerCase());
      if (!block) throw new Error('Block not found');
      const res = await fetch(`/api/blocks/${block.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete block');
      return res.json();
    },
    onSuccess: (payload) => {
      usePlanStore.getState().removeBlock(payload.blockId);
      pushToast({ title: toastT('deleted') });
    },
    onError: () => pushToast({ variant: 'destructive', title: t('error') }),
  });

  const { start, stop, state, supported } = useSpeechRecognition({
    onTranscript: (text) => {
      interpretMutation.mutate({ text }, {
        onSuccess: (result) => handleIntent(result.intent, result.entities as Record<string, any>),
      });
    },
  });

  function handleIntent(intent: string, entities: Record<string, any>) {
    switch (intent) {
      case 'add':
        addBlockMutation.mutate({
          title: entities.title,
          start: entities.start,
          durationMin: entities.durationMin,
        });
        break;
      case 'move':
        moveBlockMutation.mutate({ title: entities.title, start: entities.start });
        break;
      case 'delete':
        deleteBlockMutation.mutate({ title: entities.title });
        break;
      case 'read':
        announceNextBlock();
        break;
      default:
        pushToast({ variant: 'destructive', title: t('error') });
    }
  }

  function announceNextBlock() {
    const blocks = usePlanStore.getState().blocks;
    const now = new Date();
    const next = blocks.find((block) => new Date(block.start) > now) ?? blocks[0];
    if (!next) {
      speak(t('error'), locale);
      return;
    }
    speak(
      t('nextTask', {
        title: next.title,
        time: new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(next.start)),
      }),
      locale
    );
  }

  if (!supported) {
    return (
      <Button variant="outline" disabled>
        <MicOff className="mr-2 h-4 w-4" />
        {t('error')}
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      size="lg"
      onMouseDown={start}
      onMouseUp={stop}
      onTouchStart={start}
      onTouchEnd={stop}
      aria-pressed={state === 'listening'}
    >
      <Mic className="mr-2 h-4 w-4" />
      {state === 'listening' ? t('listening') : t('idle')}
    </Button>
  );
}

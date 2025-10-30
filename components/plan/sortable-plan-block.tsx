'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { Clock, MapPin, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToastStore } from '@/components/ui/use-toast';
import { usePlanStore, type PlanBlock } from '@/lib/hooks/usePlanStore';

export function SortablePlanBlock({ block, index }: { block: PlanBlock; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const t = useTranslations('plan');
  const toastT = useTranslations('toast');
  const { pushToast } = useToastStore();
  const updateBlock = usePlanStore((state) => state.updateBlock);
  const removeBlock = usePlanStore((state) => state.removeBlock);
  const queryClient = useQueryClient();
  const [isEditing, setEditing] = useState(false);
  const [title, setTitle] = useState(block.title);

  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<PlanBlock>) => {
      const res = await fetch(`/api/blocks/${block.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update block');
      return res.json();
    },
    onSuccess: (data) => {
      updateBlock(block.id, data.block);
      pushToast({ title: toastT('updated') });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/blocks/${block.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete block');
      return res.json();
    },
    onSuccess: () => {
      removeBlock(block.id);
      pushToast({ title: toastT('deleted') });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
    },
  });

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col gap-3 p-4" aria-roledescription="draggable block">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">#{index + 1}</p>
          {isEditing ? (
            <Input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Block title" />
          ) : (
            <h3 className="text-lg font-semibold">{block.title}</h3>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {format(new Date(block.start), 'p')} • {block.durationMin} {t('minutes', { count: block.durationMin })}
            </span>
          </div>
          {block.lat && block.lng ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                {block.lat.toFixed(3)}, {block.lng.toFixed(3)}
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <button {...listeners} {...attributes} className="cursor-grab text-xs text-muted-foreground">
            Drag
          </button>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Button
                size="sm"
                onClick={() => {
                  updateMutation.mutate({ title });
                  setEditing(false);
                }}
              >
                Save
              </Button>
            ) : (
              <Button size="icon" variant="ghost" onClick={() => setEditing(true)} aria-label="Edit block">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate()} aria-label="Delete block">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

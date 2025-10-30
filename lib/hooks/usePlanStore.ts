import { create } from 'zustand';
import type { Block } from '@prisma/client';

export type PlanBlock = Pick<Block, 'id' | 'title' | 'notes' | 'start' | 'durationMin' | 'lat' | 'lng' | 'placeRef'>;

interface PlanState {
  planId?: string;
  blocks: PlanBlock[];
  setPlanId: (id?: string) => void;
  setBlocks: (blocks: PlanBlock[]) => void;
  addBlock: (block: PlanBlock) => void;
  updateBlock: (id: string, block: Partial<PlanBlock>) => void;
  removeBlock: (id: string) => void;
}

function normalizeBlock(block: Partial<PlanBlock> & { start?: string | Date }): PlanBlock {
  return {
    id: block.id ?? crypto.randomUUID(),
    title: block.title ?? '',
    notes: block.notes ?? null,
    start: new Date(block.start ?? Date.now()),
    durationMin: block.durationMin ?? 60,
    lat: block.lat ?? null,
    lng: block.lng ?? null,
    placeRef: block.placeRef ?? null,
  } as PlanBlock;
}

export const usePlanStore = create<PlanState>((set) => ({
  planId: undefined,
  blocks: [],
  setPlanId: (id) => set({ planId: id }),
  setBlocks: (blocks) =>
    set({ blocks: blocks.map((block) => normalizeBlock(block)).sort((a, b) => a.start.getTime() - b.start.getTime()) }),
  addBlock: (block) =>
    set((state) => ({
      blocks: [...state.blocks, normalizeBlock(block)].sort((a, b) => a.start.getTime() - b.start.getTime()),
    })),
  updateBlock: (id, block) =>
    set((state) => ({
      blocks: state.blocks
        .map((item) => (item.id === id ? normalizeBlock({ ...item, ...block }) : item))
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    })),
  removeBlock: (id) => set((state) => ({ blocks: state.blocks.filter((block) => block.id !== id) })),
}));

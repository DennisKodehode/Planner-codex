'use client';

import { nanoid } from 'nanoid';
import { create } from 'zustand';

type ToastVariant = 'default' | 'destructive';

export interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastStore {
  toasts: ToastData[];
  pushToast: (toast: Omit<ToastData, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  pushToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: nanoid() }],
    })),
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

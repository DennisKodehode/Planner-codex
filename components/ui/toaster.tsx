'use client';

import { useTranslations } from 'next-intl';
import { ToastProvider, Toast, ToastContent, ToastDismissButton } from './toast';
import { useToastStore } from './use-toast';

export function Toaster({ locale }: { locale: string }) {
  const t = useTranslations('toast');
  const { toasts, removeToast } = useToastStore();
  return (
    <ToastProvider>
      {toasts.map((toast) => (
        <Toast key={toast.id} open onOpenChange={(open) => !open && removeToast(toast.id)} variant={toast.variant}>
          <ToastContent title={toast.title ?? t('updated')} description={toast.description} />
          <ToastDismissButton />
        </Toast>
      ))}
    </ToastProvider>
  );
}

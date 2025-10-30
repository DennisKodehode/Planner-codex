'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose } from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border border-border bg-background p-4 pr-6 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:fade-in-80',
  {
    variants: {
      variant: {
        default: 'border border-border bg-background text-foreground',
        destructive: 'group destructive border-destructive/30 bg-destructive text-destructive-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const ToastRoot = React.forwardRef<React.ElementRef<typeof Toast>, React.ComponentPropsWithoutRef<typeof Toast> & VariantProps<typeof toastVariants>>(
  ({ className, variant, ...props }, ref) => {
    return <Toast ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />;
  }
);
ToastRoot.displayName = 'Toast';

const ToastAction = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn('rounded-md border border-border px-3 py-2 text-sm font-medium transition hover:bg-accent', className)}
    {...props}
  />
));
ToastAction.displayName = 'ToastAction';

function ToastProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider swipeDirection="right">
      {children}
      <ToastViewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-3 p-4 sm:max-w-sm" />
    </ToastProvider>
  );
}

function ToastContent({ title, description }: { title?: React.ReactNode; description?: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      {title ? <ToastTitle className="text-sm font-semibold">{title}</ToastTitle> : null}
      {description ? <ToastDescription className="text-sm text-muted-foreground">{description}</ToastDescription> : null}
    </div>
  );
}

function ToastDismissButton({ className }: { className?: string }) {
  return (
    <ToastClose className={cn('absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition hover:text-foreground', className)}>
      <X className="h-4 w-4" />
    </ToastClose>
  );
}

export { ToastProviderWrapper as ToastProvider, ToastViewport, ToastRoot as Toast, ToastTitle, ToastDescription, ToastAction, ToastDismissButton, ToastContent };

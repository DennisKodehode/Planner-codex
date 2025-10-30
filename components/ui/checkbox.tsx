'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const Checkbox = CheckboxPrimitive.Root;

function CheckboxIndicator({ className }: { className?: string }) {
  return (
    <CheckboxPrimitive.Indicator
      className={cn('flex items-center justify-center text-primary-foreground', className)}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  );
}

export { Checkbox, CheckboxIndicator };

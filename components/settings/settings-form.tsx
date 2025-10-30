'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox, CheckboxIndicator } from '@/components/ui/checkbox';
import { useToastStore } from '@/components/ui/use-toast';

const CATEGORY_OPTIONS = ['coffee_shop', 'park', 'gym', 'museum', 'restaurant', 'event'];
const PRICE_LEVELS = [0, 1, 2, 3, 4];

const schema = z.object({
  categories: z.array(z.string()),
  maxDistance: z.coerce.number().min(100).max(20000),
  minRating: z.coerce.number().min(0).max(5),
  priceLevels: z.array(z.number()),
  budgetDaily: z.coerce.number().nullable(),
  locale: z.enum(['en', 'no']),
  theme: z.enum(['system', 'light', 'dark']),
});

type FormValues = z.infer<typeof schema>;

export function SettingsForm({ initial }: { initial: Partial<FormValues> }) {
  const t = useTranslations('settings');
  const toastT = useTranslations('toast');
  const { pushToast } = useToastStore();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      categories: initial.categories ?? ['coffee_shop', 'park'],
      maxDistance: initial.maxDistance ?? 2000,
      minRating: initial.minRating ?? 4,
      priceLevels: initial.priceLevels ?? [0, 1, 2],
      budgetDaily: initial.budgetDaily ?? 600,
      locale: (initial.locale as 'en' | 'no') ?? 'en',
      theme: (initial.theme as 'system' | 'light' | 'dark') ?? 'system',
    },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const payload = { ...values, budgetDaily: Number.isNaN(values.budgetDaily ?? NaN) ? null : values.budgetDaily };
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        pushToast({ variant: 'destructive', title: 'Failed to update preferences' });
        return;
      }
      pushToast({ title: toastT('updated') });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('preferences')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label>Categories</Label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_OPTIONS.map((category) => (
                <Controller
                  key={category}
                  name="categories"
                  control={form.control}
                  render={({ field }) => {
                    const checked = field.value?.includes(category) ?? false;
                    return (
                      <label className="flex items-center gap-2 rounded border p-2 text-sm capitalize">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            const set = new Set(field.value ?? []);
                            if (value) {
                              set.add(category);
                            } else {
                              set.delete(category);
                            }
                            field.onChange(Array.from(set));
                          }}
                        >
                          <CheckboxIndicator />
                        </Checkbox>
                        {category.replace('_', ' ')}
                      </label>
                    );
                  }}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Max distance (m)</span>
              <Input type="number" min={100} max={20000} {...form.register('maxDistance', { valueAsNumber: true })} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Minimum rating</span>
              <Input type="number" step="0.5" min={0} max={5} {...form.register('minRating', { valueAsNumber: true })} />
            </label>
          </div>
          <div className="space-y-2">
            <Label>Price levels</Label>
            <div className="flex flex-wrap gap-2">
              {PRICE_LEVELS.map((level) => (
                <Controller
                  key={level}
                  name="priceLevels"
                  control={form.control}
                  render={({ field }) => {
                    const checked = field.value?.includes(level) ?? false;
                    return (
                      <label className="flex items-center gap-2 rounded border px-2 py-1 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            const set = new Set(field.value ?? []);
                            if (value) {
                              set.add(level);
                            } else {
                              set.delete(level);
                            }
                            field.onChange(Array.from(set));
                          }}
                        >
                          <CheckboxIndicator />
                        </Checkbox>
                        {'$'.repeat(level + 1)}
                      </label>
                    );
                  }}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Budget (NOK)</span>
              <Input type="number" min={0} {...form.register('budgetDaily', { valueAsNumber: true })} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Locale</span>
              <select className="w-full rounded border bg-background p-2" {...form.register('locale')}>
                <option value="en">English</option>
                <option value="no">Norsk</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Theme</span>
              <select className="w-full rounded border bg-background p-2" {...form.register('theme')}>
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </div>
          <Button type="submit" disabled={isPending}>
            Save changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

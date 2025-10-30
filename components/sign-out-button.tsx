'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

export function SignOutButton() {
  const t = useTranslations('nav');
  return (
    <Button variant="ghost" onClick={() => signOut({ callbackUrl: '/sign-in' })}>
      {t('signOut')}
    </Button>
  );
}

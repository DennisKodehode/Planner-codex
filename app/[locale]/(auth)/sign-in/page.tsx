'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export default function SignInPage() {
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? '/';
  const t = useTranslations('app');

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('tagline')}</p>
      </div>
      <div className="space-y-3">
        <Button className="w-full" onClick={() => signIn('google', { callbackUrl })}>
          Continue with Google
        </Button>
        <Button variant="outline" className="w-full" onClick={() => signIn('email', { callbackUrl })}>
          Continue with email
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        By continuing you agree to our privacy policy. Location and microphone access are requested only when needed.
      </p>
    </div>
  );
}

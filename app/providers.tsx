'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';
import { PostHogProvider } from '@/lib/telemetry/posthog-provider';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children, locale }: { children: React.ReactNode; locale: string }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed', error);
      });
    }
  }, []);

  return (
    <SessionProvider>
      <PostHogProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
            <Toaster locale={locale} />
          </QueryClientProvider>
        </ThemeProvider>
      </PostHogProvider>
    </SessionProvider>
  );
}

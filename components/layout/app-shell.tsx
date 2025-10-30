'use client';

import Link from 'next-intl/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
import { SignOutButton } from '@/components/sign-out-button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', key: 'plan' },
  { href: '/discover', key: 'discover' },
  { href: '/favorites', key: 'favorites' },
  { href: '/settings', key: 'settings' },
];

export function AppShell({ children, locale }: { children: React.ReactNode; locale: string }) {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold">
              DayPlanner
            </Link>
            <Badge variant="secondary">{locale.toUpperCase()}</Badge>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => {
              const href = `/${locale}${item.href === '/' ? '' : item.href}`;
              const active = pathname === href;
              return (
                <Link
                  key={item.key}
                  href={href}
                  className={cn(
                    'text-sm font-medium transition hover:text-primary',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {t(item.key as any)}
                  {active ? (
                    <motion.span layoutId="nav-active" className="mt-1 block h-0.5 rounded bg-primary" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 bg-muted/10">
        <div className="mx-auto w-full max-w-6xl px-4 py-6">{children}</div>
      </main>
      <footer className="border-t bg-background/80 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} DayPlanner. All rights reserved.
      </footer>
    </div>
  );
}

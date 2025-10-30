import { withAuth } from 'next-auth/middleware';
import type { NextRequest } from 'next/server';
import i18nMiddleware, { config as i18nConfig } from '@/lib/i18n/request';

const publicPaths = [
  '/',
  '/sign-in',
  '/manifest.json',
  '/sw.js',
  '/icons',
];

const authMiddleware = withAuth(
  (req) => i18nMiddleware(req),
  {
    pages: {
      signIn: '/sign-in',
    },
  }
);

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return i18nMiddleware(request);
  }
  return authMiddleware(request);
}

export const config = {
  matcher: i18nConfig.matcher,
};

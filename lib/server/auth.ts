import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions, Session } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? 'missing',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? 'missing',
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST ?? 'localhost',
        port: Number(process.env.EMAIL_SERVER_PORT ?? 1025),
        auth: {
          user: process.env.EMAIL_SERVER_USER ?? 'user',
          pass: process.env.EMAIL_SERVER_PASSWORD ?? 'password',
        },
      },
      from: process.env.EMAIL_FROM ?? 'noreply@dayplanner.app',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'database',
  },
  pages: {
    signIn: '/sign-in',
  },
  callbacks: {
    async session({ session, user }) {
      const enriched: Session = {
        ...session,
        user: {
          ...session.user,
          id: user.id,
        },
      } as Session;
      return enriched;
    },
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
  },
};

export type AuthSession = Session;

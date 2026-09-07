import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { ROUTES } from '@/constants/routes';

import { SECURITY_CONFIG } from '@/constants/security';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) {
          return null;
        }

        // Hesap kilitli mi kontrol et (Brute-Force Koruması)
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          console.warn(`[Auth] Giriş engellendi: Hesap kilitli (${user.email})`);
          return null;
        }

        const isValid = await compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
          const shouldLock = newFailedAttempts >= SECURITY_CONFIG.MAX_FAILED_LOGIN_ATTEMPTS;
          const lockedUntil = shouldLock ? new Date(Date.now() + SECURITY_CONFIG.LOCKOUT_DURATION_MS) : null;

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newFailedAttempts,
              lockedUntil,
            },
          });

          return null;
        }

        // Başarılı giriş: Hatalı giriş sayacını sıfırla ve son giriş zamanını güncelle
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          dealerId: user.dealerId,
          permissions: user.permissions || '["dashboard","prices","stocks","transactions","suppliers","price-check","users"]',
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.dealerId = (user as any).dealerId;
        token.permissions = (user as any).permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).dealerId = token.dealerId;
        (session.user as any).permissions = token.permissions;
      }
      return session;
    },
  },
  pages: {
    signIn: ROUTES.LOGIN,
  },
});

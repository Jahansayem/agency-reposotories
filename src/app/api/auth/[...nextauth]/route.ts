import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import { SupabaseAdapter } from '@auth/supabase-adapter';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { logger } from '@/lib/logger';

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true, // Allow linking with existing PIN accounts
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID || '',
      clientSecret: process.env.APPLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  pages: {
    signIn: '/', // Custom sign-in page
    error: '/', // Error page
  },

  callbacks: {
    async session({ session, user }) {
      // Add user ID and role to session
      if (session.user) {
        session.user.id = user.id;
        // @ts-ignore - adding custom field
        session.user.role = user.role || 'member';
      }

      logger.info('Session created', {
        userId: user.id,
        action: 'session_created',
      });

      return session;
    },

    async signIn({ user, account, profile }) {
      // Log successful sign-in
      logger.info('User signed in', {
        userId: user.id,
        provider: account?.provider,
        action: 'sign_in',
      });

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // @ts-ignore
        token.role = user.role || 'member';
      }
      return token;
    },
  },

  events: {
    async signOut({ session, token }) {
      logger.info('User signed out', {
        userId: token?.sub || session?.user?.id,
        action: 'sign_out',
      });
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

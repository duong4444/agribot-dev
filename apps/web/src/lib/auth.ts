import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { JWT } from 'next-auth/jwt';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        token: { label: 'Token', type: 'text' },
        refreshToken: { label: 'Refresh Token', type: 'text' },
      },
      async authorize(credentials) {
        // Xử lý login với email/password
        if (credentials?.email && credentials?.password) {
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            });

            if (!response.ok) {
              return null;
            }

            const data = await response.json();
            
            if (data.success && data.data) {
              return {
                id: data.data.user.id,
                email: data.data.user.email,
                name: data.data.user.fullName,
                role: data.data.user.role,
                credits: data.data.user.credits,
                plan: data.data.user.plan,
                subscriptionStatus: data.data.user.subscriptionStatus,
                subscriptionExpiry: data.data.user.subscriptionExpiry,
                accessToken: data.data.accessToken,
                refreshToken: data.data.refreshToken,
              };
            }

            return null;
          } catch (error) {
            console.error('Auth error:', error);
            return null;
          }
        }

        // Xử lý token từ Google OAuth
        if (credentials?.token) {
          try {
            // Verify token với backend
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${credentials.token}`,
              },
            });

            if (!response.ok) {
              return null;
            }

            const data = await response.json();
            
            if (data.success && data.data) {
              return {
                id: data.data.id,
                email: data.data.email,
                name: data.data.fullName,
                role: data.data.role,
                credits: data.data.credits,
                plan: data.data.plan,
                subscriptionStatus: data.data.subscriptionStatus,
                subscriptionExpiry: data.data.subscriptionExpiry,
                accessToken: credentials.token,
                refreshToken: credentials.refreshToken,
              };
            }

            return null;
          } catch (error) {
            console.error('Token verification error:', error);
            return null;
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }: { token: JWT; user?: any; trigger?: string; session?: any }) {
      if (user) {
        // bổ sung thêm các trường vào token object (về sau encode thành string lưu vào cookie)
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.role = user.role;
        token.credits = user.credits;
        token.plan = user.plan;
        token.subscriptionStatus = user.subscriptionStatus;
        token.subscriptionExpiry = user.subscriptionExpiry;
      }

      if (trigger === "update" && session?.user) {
        token.credits = session.user.credits;
        token.plan = session.user.plan;
        token.subscriptionStatus = session.user.subscriptionStatus;
        token.subscriptionExpiry = session.user.subscriptionExpiry;
      }

      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      if (token) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.credits = token.credits;
        session.user.plan = token.plan;
        session.user.subscriptionStatus = token.subscriptionStatus;
        session.user.subscriptionExpiry = token.subscriptionExpiry;
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

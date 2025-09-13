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
    async jwt({ token, user }: { token: JWT; user?: any }) {
      if (user) {
        // bổ sung thêm các trường vào token object (về sau encode thành string lưu vào cookie)
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      if (token) {
        session.user.id = token.sub;
        session.user.role = token.role;
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

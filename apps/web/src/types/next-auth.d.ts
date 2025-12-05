import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      credits: number;
      plan: string;
      subscriptionStatus: string;
      subscriptionExpiry?: string | null;
    };
    accessToken: string;
    refreshToken: string;
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: string;
    credits: number;
    plan: string;
    subscriptionStatus: string;
    subscriptionExpiry?: string | null;
    accessToken: string;
    refreshToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    credits: number;
    plan: string;
    subscriptionStatus: string;
    subscriptionExpiry?: string | null;
    accessToken: string;
    refreshToken: string;
  }
}

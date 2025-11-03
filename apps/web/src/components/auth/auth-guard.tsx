'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login' 
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (requireAuth && !session) {
      router.push(redirectTo);
    } else if (!requireAuth && session) {
      // If user is logged in but on public page, redirect based on role
      if (session.user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [session, status, requireAuth, redirectTo, router]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-agri-green-600"></div>
      </div>
    );
  }

  // Don't render children if auth requirements not met
  if (requireAuth && !session) {
    return null;
  }

  if (!requireAuth && session) {
    return null;
  }

  return <>{children}</>;
}

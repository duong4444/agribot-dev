'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  allowedRoles?: string[];
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login',
  allowedRoles
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (requireAuth && !session) {
      router.push(redirectTo);
    } else if (session) {
      // Check role access if allowedRoles is defined
      if (allowedRoles && !allowedRoles.includes(session.user?.role)) {
        // Redirect to appropriate dashboard based on role
        if (session.user?.role === 'ADMIN') {
          router.push('/admin');
        } else if (session.user?.role === 'TECHNICIAN') {
          router.push('/technician');
        } else {
          router.push('/dashboard');
        }
        return;
      }

      // If user is logged in but on public page (requireAuth=false), redirect based on role
      if (!requireAuth) {
        if (session.user?.role === 'ADMIN') {
          router.push('/admin');
        } else if (session.user?.role === 'TECHNICIAN') {
          router.push('/technician');
        } else {
          router.push('/dashboard');
        }
      }
    }
  }, [session, status, requireAuth, redirectTo, allowedRoles, router]);

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

  // Check role access
  if (session && allowedRoles && !allowedRoles.includes(session.user?.role)) {
    return null;
  }

  return <>{children}</>;
}

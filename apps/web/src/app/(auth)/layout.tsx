"use client";

import { AuthGuard } from '@/components/auth/auth-guard';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requireAuth={false}>
      {children}
    </AuthGuard>
  );
}
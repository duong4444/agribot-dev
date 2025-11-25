"use client";

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LogOut, Shield } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const router = useRouter();

  // Redirect non-admin users to dashboard
  React.useEffect(() => {
    if (session && session.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Show loading while checking
  if (!session || session.user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-agri-green-600"></div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Admin Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/admin" className="flex items-center space-x-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">AgriBot Admin</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Quản trị hệ thống</p>
                </div>
              </Link>
              
              <div className="flex items-center space-x-4">
                <ThemeToggle />
                <div className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">
                  {session.user?.name || session.user?.email}
                </div>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}

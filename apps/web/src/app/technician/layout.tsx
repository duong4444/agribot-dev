"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Loader2, Wrench, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';

import { AuthGuard } from '@/components/auth/auth-guard';

export default function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  return (
    <AuthGuard allowedRoles={['TECHNICIAN']}>
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/technician" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Wrench className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">AgriBot Technician</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <Link 
              href="/technician" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Bảng điều khiển
            </Link>
            <Link 
              href="/technician/requests" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Yêu cầu của tôi
            </Link>
            <Link 
              href="/technician/activate" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Kích hoạt thiết bị
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm mr-2">
              <span className="text-muted-foreground">
                Xin chào, <span className="font-semibold text-foreground">{session?.user?.name || session?.user?.email}</span>
              </span>
            </div>
            
            <ThemeToggle />
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/settings')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Cài đặt</span>
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        {children}
      </main>
    </div>
    </AuthGuard>
  );
}

"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Loader2, Wrench } from 'lucide-react';
import Link from 'next/link';

export default function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.role !== 'TECHNICIAN') {
      router.push('/');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session || session.user?.role !== 'TECHNICIAN') {
    return null;
  }

  return (
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
              Dashboard
            </Link>
            <Link 
              href="/technician/requests" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              My Requests
            </Link>
            <Link 
              href="/technician/activate" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Activate Device
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="hidden md:flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{session.user?.email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/login' })}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        {children}
      </main>
    </div>
  );
}

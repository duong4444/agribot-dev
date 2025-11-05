"use client";

import React, { useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DocumentUpload } from '@/components/admin/DocumentUpload';
import { DocumentList } from '@/components/admin/DocumentList';
import { DocumentStats } from '@/components/admin/DocumentStats';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LogOut, Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const AdminDocumentsPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

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
              <div className="flex items-center space-x-4">
                <Link href="/admin">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">AgriBot Admin</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Kiến thức Cây trồng</p>
                  </div>
                </div>
              </div>
              
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
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Quản lý Kiến thức Cây trồng
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Upload file Markdown (.md) với cấu trúc chunking cho Layer 1 FTS
            </p>
          </div>

          {/* Stats */}
          <div className="mb-8">
            <DocumentStats />
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload Section */}
            <div className="lg:col-span-1">
              <DocumentUpload onUploadSuccess={handleUploadSuccess} />
            </div>

            {/* List Section */}
            <div className="lg:col-span-2">
              <DocumentList refreshTrigger={refreshTrigger} />
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};

export default AdminDocumentsPage;

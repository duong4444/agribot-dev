"use client";

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { FileText, Users, BarChart3, Settings, LogOut, Shield, Leaf, Database } from 'lucide-react';
import Link from 'next/link';

const AdminPage = () => {
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

  const adminModules = [
    {
      title: 'Kiến thức Cây trồng',
      description: 'Upload file .md với structural chunking cho Layer 1 FTS',
      icon: Leaf,
      href: '/admin/documents',
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    {
      title: 'RAG Documents',
      description: 'Quản lý tài liệu RAG với vector embeddings cho Layer 2',
      icon: Database,
      href: '/admin/rag-documents',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900',
    },
    {
      title: 'Quản lý Người dùng',
      description: 'Quản lý tài khoản người dùng và phân quyền',
      icon: Users,
      href: '/admin/users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    {
      title: 'Thống kê & Phân tích',
      description: 'Xem thống kê hệ thống và phân tích dữ liệu',
      icon: BarChart3,
      href: '/admin/analytics',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
    },
    {
      title: 'Cài đặt Hệ thống',
      description: 'Cấu hình và thiết lập hệ thống',
      icon: Settings,
      href: '/admin/settings',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
    },
  ];

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
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Bảng điều khiển Admin
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Chào mừng {session.user?.email}, quản lý hệ thống Agricultural Chatbot
            </p>
          </div>

          {/* Admin Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {adminModules.map((module, index) => {
              const Icon = module.icon;
              return (
                <Link key={index} href={module.href}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl mb-2">{module.title}</CardTitle>
                          <CardDescription>{module.description}</CardDescription>
                        </div>
                        <div className={`p-3 rounded-full ${module.bgColor}`}>
                          <Icon className={`h-6 w-6 ${module.color}`} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full">
                        Truy cập
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Quick Stats */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin nhanh</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">Hoạt động</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Trạng thái hệ thống</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">API Ready</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Backend status</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">AI Service</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Python AI status</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};

export default AdminPage;

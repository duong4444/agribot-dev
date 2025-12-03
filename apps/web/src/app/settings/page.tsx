"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardHeader } from '@/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Bell, Lock, Palette, Globe, Wrench, Shield } from 'lucide-react';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const SettingsPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const isTechnician = session?.user?.role === 'TECHNICIAN';
  const isAdmin = session?.user?.role === 'ADMIN';

  const handleBack = () => {
    if (isTechnician) {
      router.push('/technician');
    } else if (isAdmin) {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  };

  const renderHeader = () => {
    if (isTechnician) {
      return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/technician" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Wrench className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">AgriBot Technician</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm mr-2">
                <span className="text-muted-foreground">
                  Xin chào, <span className="font-semibold text-foreground">{session?.user?.name || session?.user?.email}</span>
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>
      );
    }
    
    if (isAdmin) {
      return (
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
                  {session?.user?.name || session?.user?.email}
                </div>
              </div>
            </div>
          </div>
        </header>
      );
    }

    return <DashboardHeader userName={session?.user?.name} />;
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {renderHeader()}

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {isTechnician ? 'Quay lại' : isAdmin ? 'Quay lại Admin' : 'Quay lại Dashboard'}
          </Button>

          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Cài đặt
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Quản lý tài khoản và tùy chỉnh trải nghiệm của bạn
            </p>
          </div>

          {/* Settings Sections */}
          <div className="space-y-4">
            {/* Profile Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <CardTitle>Thông tin cá nhân</CardTitle>
                </div>
                <CardDescription>
                  Cập nhật thông tin tài khoản của bạn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tên
                    </label>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {session?.user?.name || 'Chưa cập nhật'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {session?.user?.email || 'Chưa cập nhật'}
                    </p>
                  </div>
                  <Button variant="outline" disabled>
                    Chỉnh sửa thông tin
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <CardTitle>Thông báo</CardTitle>
                </div>
                <CardDescription>
                  Quản lý cách bạn nhận thông báo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tính năng đang phát triển
                </p>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <CardTitle>Bảo mật</CardTitle>
                </div>
                <CardDescription>
                  Quản lý mật khẩu và bảo mật tài khoản
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  onClick={() => setIsChangePasswordOpen(true)}
                >
                  Đổi mật khẩu
                </Button>
              </CardContent>
            </Card>

            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <CardTitle>Giao diện</CardTitle>
                </div>
                <CardDescription>
                  Tùy chỉnh giao diện ứng dụng
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tính năng đang phát triển
                </p>
              </CardContent>
            </Card>

            {/* Language Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <CardTitle>Ngôn ngữ</CardTitle>
                </div>
                <CardDescription>
                  Chọn ngôn ngữ hiển thị
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-900 dark:text-white">
                  Tiếng Việt (Mặc định)
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <ChangePasswordModal 
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </AuthGuard>
  );
};

export default SettingsPage;

"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardHeader } from '@/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Bell, Lock, Palette, Globe } from 'lucide-react';

const SettingsPage = () => {
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardHeader />

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại Dashboard
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
                <Button variant="outline" disabled>
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
    </AuthGuard>
  );
};

export default SettingsPage;

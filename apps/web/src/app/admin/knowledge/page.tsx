"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Leaf,
  LogOut,
  Shield,
  BookOpen,
  Sprout,
  Calendar,
  Bug,
  Droplets,
  ArrowLeft,
  Plus,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function KnowledgeManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Check admin access
  React.useEffect(() => {
    if (session && session.user?.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [session, router]);

  const knowledgeCategories = [
    {
      id: 'crops',
      title: 'Quản Lý Cây Trồng',
      description: 'Thông tin về các loại cây trồng, đặc điểm, điều kiện sinh trưởng',
      icon: Sprout,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      count: 0,
      path: '/admin/knowledge/crops'
    },
    {
      id: 'techniques',
      title: 'Kỹ Thuật Canh Tác',
      description: 'Hướng dẫn kỹ thuật trồng trọt, chăm sóc, thu hoạch',
      icon: BookOpen,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      count: 0,
      path: '/admin/knowledge/techniques'
    },
    {
      id: 'seasons',
      title: 'Lịch Mùa Vụ',
      description: 'Quản lý thời vụ trồng trọt theo vùng miền',
      icon: Calendar,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      count: 0,
      path: '/admin/knowledge/seasons'
    },
    {
      id: 'pests',
      title: 'Sâu Bệnh & Phòng Trừ',
      description: 'Thông tin về sâu bệnh hại, triệu chứng và cách phòng trừ',
      icon: Bug,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      count: 0,
      path: '/admin/knowledge/pests'
    },
    {
      id: 'fertilizers',
      title: 'Phân Bón & Thuốc BVTV',
      description: 'Danh mục phân bón, thuốc bảo vệ thực vật và hướng dẫn sử dụng',
      icon: Droplets,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      count: 0,
      path: '/admin/knowledge/fertilizers'
    },
  ];

  if (!session || session.user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-agri-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="flex items-center gap-3 group">
                <div className="p-2 bg-gradient-to-br from-agri-green-500 to-agri-green-600 rounded-xl shadow-md group-hover:shadow-lg transition-all duration-200">
                  <Leaf className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-agri-green-700 to-agri-green-600 dark:from-agri-green-400 dark:to-agri-green-300 bg-clip-text text-transparent">
                  AgriBot Admin
                </span>
              </Link>
              <Badge variant="destructive" className="ml-2">
                <Shield className="h-3 w-3 mr-1" />
                ADMIN
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại Admin
              </Button>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/login')}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-agri-green-600 dark:text-agri-green-400" />
            Quản Lý Cơ Sở Tri Thức
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Quản lý kiến thức nông nghiệp để chatbot có thể trả lời chính xác
          </p>
        </div>

        {/* Search Bar */}
        <Card className="mb-6 border-gray-200 dark:border-gray-700 shadow-lg">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Tìm kiếm kiến thức..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {knowledgeCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Card
                key={category.id}
                className="border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group hover:scale-[1.02]"
                onClick={() => router.push(category.path)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`p-3 ${category.bgColor} rounded-xl`}>
                      <Icon className={`h-6 w-6 ${category.color}`} />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {category.count} mục
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-4 group-hover:text-agri-green-600 dark:group-hover:text-agri-green-400 transition-colors">
                    {category.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full group-hover:bg-agri-green-50 dark:group-hover:bg-agri-green-900/20 group-hover:border-agri-green-300 dark:group-hover:border-agri-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Quản lý
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats */}
        <Card className="mt-8 border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Thống Kê Tổng Quan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-agri-green-600 dark:text-agri-green-400">0</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tổng số mục</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">0</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Đã xuất bản</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">0</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Nháp</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">0</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cập nhật tuần này</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

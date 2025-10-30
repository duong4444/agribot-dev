"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Leaf,
  LogOut,
  Shield,
  ArrowLeft,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  BookOpen,
} from 'lucide-react';

const mockTechniques = [
  {
    id: '1',
    title: 'Kỹ thuật trồng lúa nước',
    category: 'Lúa',
    difficulty: 'Trung bình',
    duration: '90-120 ngày',
    status: 'published',
    views: 1250,
    lastUpdated: '2024-01-15',
  },
  {
    id: '2',
    title: 'Chăm sóc cà chua trong nhà kính',
    category: 'Rau củ',
    difficulty: 'Dễ',
    duration: '60-80 ngày',
    status: 'published',
    views: 890,
    lastUpdated: '2024-01-14',
  },
  {
    id: '3',
    title: 'Kỹ thuật bón phân cho cây ngô',
    category: 'Ngô',
    difficulty: 'Dễ',
    duration: '70-90 ngày',
    status: 'draft',
    views: 0,
    lastUpdated: '2024-01-13',
  },
];

export default function TechniquesManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [techniques, setTechniques] = useState(mockTechniques);

  React.useEffect(() => {
    if (session && session.user?.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [session, router]);

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa kỹ thuật này?')) {
      setTechniques(techniques.filter(t => t.id !== id));
    }
  };

  const filteredTechniques = techniques.filter(technique =>
    technique.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    technique.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <Link href="/admin" className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-agri-green-500 to-agri-green-600 rounded-xl shadow-md">
                  <Leaf className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-agri-green-700 to-agri-green-600 dark:from-agri-green-400 dark:to-agri-green-300 bg-clip-text text-transparent">
                  AgriBot Admin
                </span>
              </Link>
              <Badge variant="destructive">
                <Shield className="h-3 w-3 mr-1" />
                ADMIN
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin/knowledge')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quản lý tri thức
              </Button>
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={() => router.push('/login')}>
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Quản Lý Kỹ Thuật Canh Tác
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Quản lý hướng dẫn kỹ thuật trồng trọt, chăm sóc và thu hoạch
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Tìm kiếm kỹ thuật..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Thêm kỹ thuật mới
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {techniques.length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Tổng kỹ thuật</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {techniques.filter(t => t.status === 'published').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Đã xuất bản</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {techniques.filter(t => t.status === 'draft').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Nháp</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {techniques.reduce((sum, t) => sum + t.views, 0)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Lượt xem</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Techniques Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTechniques.map((technique) => (
            <Card
              key={technique.id}
              className="border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 group"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline">{technique.category}</Badge>
                  <Badge
                    variant={technique.status === 'published' ? 'default' : 'secondary'}
                    className={technique.status === 'published'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : ''}
                  >
                    {technique.status === 'published' ? 'Xuất bản' : 'Nháp'}
                  </Badge>
                </div>
                <CardTitle className="text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {technique.title}
                </CardTitle>
                <CardDescription>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span>⏱️ {technique.duration}</span>
                    <span>📊 {technique.difficulty}</span>
                    <span>👁️ {technique.views}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-1" />
                    Xem
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4 mr-1" />
                    Sửa
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(technique.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTechniques.length === 0 && (
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Không tìm thấy kỹ thuật nào
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

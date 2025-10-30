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
  Filter,
  Download,
  Upload,
} from 'lucide-react';

// Mock data for crops
const mockCrops = [
  {
    id: '1',
    name: 'Lúa',
    scientificName: 'Oryza sativa',
    category: 'Lương thực',
    growthPeriod: '90-120 ngày',
    waterRequirement: 'Cao',
    temperature: '25-30°C',
    status: 'published',
    lastUpdated: '2024-01-15',
  },
  {
    id: '2',
    name: 'Cà chua',
    scientificName: 'Solanum lycopersicum',
    category: 'Rau củ',
    growthPeriod: '60-80 ngày',
    waterRequirement: 'Trung bình',
    temperature: '20-25°C',
    status: 'published',
    lastUpdated: '2024-01-14',
  },
  {
    id: '3',
    name: 'Ngô',
    scientificName: 'Zea mays',
    category: 'Lương thực',
    growthPeriod: '70-90 ngày',
    waterRequirement: 'Trung bình',
    temperature: '22-28°C',
    status: 'draft',
    lastUpdated: '2024-01-13',
  },
];

export default function CropsManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [crops, setCrops] = useState(mockCrops);

  React.useEffect(() => {
    if (session && session.user?.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [session, router]);

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa cây trồng này?')) {
      setCrops(crops.filter(crop => crop.id !== id));
    }
  };

  const filteredCrops = crops.filter(crop => {
    const matchesSearch = crop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         crop.scientificName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || crop.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/knowledge')}
              >
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
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Quản Lý Cây Trồng
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Quản lý thông tin các loại cây trồng trong hệ thống
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Tìm kiếm cây trồng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Lọc
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Xuất
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Nhập
            </Button>
            <Button className="bg-agri-green-600 hover:bg-agri-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Thêm cây trồng
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-agri-green-600 dark:text-agri-green-400">
                  {crops.length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Tổng cây trồng</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {crops.filter(c => c.status === 'published').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Đã xuất bản</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {crops.filter(c => c.status === 'draft').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Nháp</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {new Set(crops.map(c => c.category)).size}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Danh mục</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Crops Table */}
        <Card className="border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle>Danh Sách Cây Trồng</CardTitle>
            <CardDescription>
              Hiển thị {filteredCrops.length} / {crops.length} cây trồng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Tên cây trồng
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Tên khoa học
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Danh mục
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Thời gian sinh trưởng
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredCrops.map((crop) => (
                    <tr key={crop.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {crop.name}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        <em>{crop.scientificName}</em>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline">{crop.category}</Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {crop.growthPeriod}
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          variant={crop.status === 'published' ? 'default' : 'secondary'}
                          className={crop.status === 'published' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                            : ''}
                        >
                          {crop.status === 'published' ? 'Xuất bản' : 'Nháp'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(crop.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredCrops.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">
                    Không tìm thấy cây trồng nào
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

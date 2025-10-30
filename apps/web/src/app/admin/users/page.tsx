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
  UserPlus,
  UserX,
  UserCheck,
  Users,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

// Mock data for users
const mockUsers = [
  {
    id: '1',
    name: 'Nguyễn Văn An',
    email: 'nguyenvanan@example.com',
    phone: '0912345678',
    role: 'FARMER',
    status: 'active',
    farmsCount: 2,
    location: 'An Giang',
    createdAt: '2024-01-10',
    lastActive: '2024-01-20',
  },
  {
    id: '2',
    name: 'Trần Thị Bình',
    email: 'tranthibinh@example.com',
    phone: '0987654321',
    role: 'FARMER',
    status: 'active',
    farmsCount: 1,
    location: 'Cần Thơ',
    createdAt: '2024-01-12',
    lastActive: '2024-01-20',
  },
  {
    id: '3',
    name: 'Lê Minh Châu',
    email: 'leminhchau@example.com',
    phone: '0909090909',
    role: 'ADMIN',
    status: 'active',
    farmsCount: 0,
    location: 'TP. Hồ Chí Minh',
    createdAt: '2024-01-05',
    lastActive: '2024-01-20',
  },
  {
    id: '4',
    name: 'Phạm Văn Dũng',
    email: 'phamvandung@example.com',
    phone: '0911111111',
    role: 'FARMER',
    status: 'inactive',
    farmsCount: 3,
    location: 'Đồng Tháp',
    createdAt: '2024-01-08',
    lastActive: '2024-01-15',
  },
];

export default function UsersManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [users, setUsers] = useState(mockUsers);

  React.useEffect(() => {
    if (session && session.user?.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [session, router]);

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      setUsers(users.filter(user => user.id !== id));
    }
  };

  const handleToggleStatus = (id: string) => {
    setUsers(users.map(user => 
      user.id === id 
        ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
        : user
    ));
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery);
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: string) => {
    if (role === 'ADMIN') {
      return <Badge variant="destructive" className="bg-red-600"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
    }
    return <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">Nông dân</Badge>;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Hoạt động</Badge>;
    }
    return <Badge variant="secondary">Không hoạt động</Badge>;
  };

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
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại Admin
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Quản Lý Người Dùng
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Quản lý tài khoản người dùng và phân quyền trong hệ thống
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Tìm kiếm người dùng (tên, email, SĐT)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="ADMIN">Admin</option>
              <option value="FARMER">Nông dân</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Không hoạt động</option>
            </select>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Thêm người dùng
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {users.length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Tổng người dùng</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {users.filter(u => u.status === 'active').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Đang hoạt động</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {users.filter(u => u.role === 'FARMER').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Nông dân</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {users.filter(u => u.role === 'ADMIN').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Admin</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle>Danh Sách Người Dùng</CardTitle>
            <CardDescription>
              Hiển thị {filteredUsers.length} / {users.length} người dùng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Người dùng
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Liên hệ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Vai trò
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Nông trại
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Hoạt động gần nhất
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {user.location}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Mail className="h-3 w-3" />
                            <span className="text-xs">{user.email}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Phone className="h-3 w-3" />
                            <span className="text-xs">{user.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {user.farmsCount > 0 ? `${user.farmsCount} nông trại` : '—'}
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(user.lastActive).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" title="Xem chi tiết">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Chỉnh sửa">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(user.id)}
                            title={user.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                            className={user.status === 'active' 
                              ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                              : 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20'}
                          >
                            {user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">
                    Không tìm thấy người dùng nào
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

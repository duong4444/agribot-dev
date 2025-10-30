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
  Search,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Brain,
  Download,
  RefreshCw,
  BarChart3,
  Eye,
} from 'lucide-react';

// Mock data for conversation logs
const mockConversations = [
  {
    id: '1',
    user: 'Nguyễn Văn An',
    query: 'Cách chăm sóc cây lúa trong mùa mưa?',
    intent: 'crop_care',
    confidence: 0.95,
    response: 'Đã cung cấp hướng dẫn chăm sóc lúa...',
    responseTime: 1.2,
    status: 'success',
    timestamp: '2024-01-20 14:30:00',
  },
  {
    id: '2',
    user: 'Trần Thị Bình',
    query: 'Thuốc trừ sâu nào tốt cho cà chua?',
    intent: 'pest_control',
    confidence: 0.88,
    response: 'Đã đề xuất các loại thuốc BVTV...',
    responseTime: 1.5,
    status: 'success',
    timestamp: '2024-01-20 14:25:00',
  },
  {
    id: '3',
    user: 'Lê Minh Châu',
    query: 'Bật tưới 10 phút',
    intent: 'iot_control',
    confidence: 0.92,
    response: 'Đã kích hoạt hệ thống tưới...',
    responseTime: 0.8,
    status: 'success',
    timestamp: '2024-01-20 14:20:00',
  },
  {
    id: '4',
    user: 'Phạm Văn Dũng',
    query: 'asdfghjkl',
    intent: 'unknown',
    confidence: 0.15,
    response: 'Xin lỗi, tôi không hiểu câu hỏi...',
    responseTime: 0.5,
    status: 'failed',
    timestamp: '2024-01-20 14:15:00',
  },
];

// Intent statistics
const intentStats = [
  { name: 'Chăm sóc cây trồng', count: 145, percent: 35, color: 'bg-green-500' },
  { name: 'Sâu bệnh hại', count: 98, percent: 24, color: 'bg-red-500' },
  { name: 'Điều khiển IoT', count: 87, percent: 21, color: 'bg-blue-500' },
  { name: 'Thông tin nông trại', count: 52, percent: 13, color: 'bg-purple-500' },
  { name: 'Không xác định', count: 28, percent: 7, color: 'bg-gray-500' },
];

export default function ChatbotManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterIntent, setFilterIntent] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  React.useEffect(() => {
    if (session && session.user?.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [session, router]);

  const filteredConversations = mockConversations.filter(conv => {
    const matchesSearch = 
      conv.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.query.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIntent = filterIntent === 'all' || conv.intent === filterIntent;
    const matchesStatus = filterStatus === 'all' || conv.status === filterStatus;
    return matchesSearch && matchesIntent && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    if (status === 'success') {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle className="h-3 w-3 mr-1" />
          Thành công
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Thất bại
      </Badge>
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.5) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
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
            <MessageSquare className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            Quản Lý Chatbot
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Theo dõi hoạt động, phân tích intent và đánh giá hiệu suất chatbot
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-gray-200 dark:border-gray-700 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tổng cuộc trò chuyện</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {mockConversations.length}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tỷ lệ thành công</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {Math.round((mockConversations.filter(c => c.status === 'success').length / mockConversations.length) * 100)}%
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Độ chính xác TB</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {Math.round((mockConversations.reduce((sum, c) => sum + c.confidence, 0) / mockConversations.length) * 100)}%
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Thời gian phản hồi TB</p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                    {(mockConversations.reduce((sum, c) => sum + c.responseTime, 0) / mockConversations.length).toFixed(1)}s
                  </p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Intent Analysis */}
          <Card className="lg:col-span-2 border-gray-200 dark:border-gray-700 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Phân Tích Intent
              </CardTitle>
              <CardDescription>Phân bố loại câu hỏi từ người dùng</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {intentStats.map((stat, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {stat.name}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {stat.count} ({stat.percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`${stat.color} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${stat.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card className="border-gray-200 dark:border-gray-700 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                Hiệu Suất
              </CardTitle>
              <CardDescription>Chỉ số hoạt động chatbot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
                <span className="font-semibold text-green-600 dark:text-green-400">99.8%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">API Latency</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">245ms</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Model Version</span>
                <Badge variant="outline">v2.1.0</Badge>
              </div>
              <Button className="w-full" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Cập nhật Model
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Conversation Logs */}
        <Card className="border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Logs Cuộc Trò Chuyện</CardTitle>
                <CardDescription>
                  Hiển thị {filteredConversations.length} / {mockConversations.length} cuộc trò chuyện
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Xuất logs
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm theo người dùng hoặc câu hỏi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="success">Thành công</option>
                <option value="failed">Thất bại</option>
              </select>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Người dùng
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Câu hỏi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Intent
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Độ chính xác
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Thời gian
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
                  {filteredConversations.map((conv) => (
                    <tr key={conv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                        {conv.user}
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-900 dark:text-white truncate">
                            {conv.query}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                            {conv.response}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="text-xs">
                          {conv.intent}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-sm font-semibold ${getConfidenceColor(conv.confidence)}`}>
                          {Math.round(conv.confidence * 100)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {conv.responseTime}s
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(conv.status)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredConversations.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">
                    Không tìm thấy cuộc trò chuyện nào
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

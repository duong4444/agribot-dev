"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  ClipboardList, 
  CheckCircle, 
  Clock, 
  ArrowRight,
  Package
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';

interface DashboardStats {
  pending: number;
  inProgress: number;
  completedToday: number;
}

interface RecentRequest {
  id: string;
  farmer: { fullName: string };
  farm: { name: string };
  area: { name: string };
  status: string;
  createdAt: string;
}

export default function TechnicianDashboard() {
  const [stats, setStats] = useState<DashboardStats>({ pending: 0, inProgress: 0, completedToday: 0 });
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/technician/requests');
      if (!res.ok) throw new Error('Failed to fetch');
      
      const requests = await res.json();
      
      // Calculate stats
      const pending = requests.filter((r: RecentRequest) => r.status === 'ASSIGNED').length;
      const inProgress = requests.filter((r: RecentRequest) => r.status === 'IN_PROGRESS').length;
      
      const today = new Date().toDateString();
      const completedToday = requests.filter((r: RecentRequest) => 
        r.status === 'COMPLETED' && new Date(r.createdAt).toDateString() === today
      ).length;
      
      setStats({ pending, inProgress, completedToday });
      setRecentRequests(requests.slice(0, 5));
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Tổng quan công việc lắp đặt thiết bị</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chờ xử lý</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Yêu cầu được phân công</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang thực hiện</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Đang lắp đặt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoàn thành hôm nay</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground">Lắp đặt thành công</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Thao tác nhanh</CardTitle>
          <CardDescription>Các tác vụ thường dùng</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Link href="/technician/requests">
            <Button className="w-full" variant="outline">
              <ClipboardList className="mr-2 h-4 w-4" />
              Xem yêu cầu của tôi
            </Button>
          </Link>
          <Link href="/technician/activate">
            <Button className="w-full">
              <Package className="mr-2 h-4 w-4" />
              Kích hoạt thiết bị
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Yêu cầu gần đây</CardTitle>
              <CardDescription>5 yêu cầu lắp đặt mới nhất</CardDescription>
            </div>
            <Link href="/technician/requests">
              <Button variant="ghost" size="sm">
                Xem tất cả
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Chưa có yêu cầu nào được phân công
            </p>
          ) : (
            <div className="space-y-4">
              {recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{request.farm.name} - {request.area.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Nông dân: {request.farmer.fullName}
                    </p>

                  </div>
                  <Badge variant={
                    request.status === 'ASSIGNED' ? 'secondary' :
                    request.status === 'IN_PROGRESS' ? 'default' :
                    'outline'
                  }>
                    {request.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

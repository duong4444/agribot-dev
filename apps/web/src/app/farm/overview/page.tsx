"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, MapPin, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function FarmOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [farm, setFarm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [farmRes, areasRes, activitiesRes, financeRes] = await Promise.all([
          fetch('/api/farms'),
          fetch('/api/farms/areas'),
          fetch('/api/farms/activities?limit=5'),
          fetch('/api/farms/stats'),
        ]);

        const farmData = farmRes.ok ? await farmRes.json() : null;
        const areas = areasRes.ok ? await areasRes.json() : [];
        const activities = activitiesRes.ok ? await activitiesRes.json() : [];
        const finance = financeRes.ok ? await financeRes.json() : { totalCost: 0, totalRevenue: 0, profit: 0 };

        setFarm(farmData);
        setStats({
          areasCount: areas.length,
          recentActivities: activities.slice(0, 3),
          finance,
        });
      } catch (error) {
        console.error('Failed to fetch overview stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Farm Info Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{farm?.name || 'Nông trại'}</h2>
          <div className="flex items-center gap-2 mt-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <p>{farm?.address || 'Chưa có địa chỉ'}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số khu vực</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.areasCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Khu vực canh tác
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(stats?.finance?.totalRevenue || 0).toLocaleString('vi-VN')} đ
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Thu nhập từ bán sản phẩm
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lợi nhuận</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.finance?.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(stats?.finance?.profit || 0).toLocaleString('vi-VN')} đ
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(stats?.finance?.profit || 0) >= 0 ? 'Kinh doanh có lãi' : 'Kinh doanh lỗ'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
            <CardDescription>Các hoạt động canh tác mới nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivities.map((activity: any) => (
                  <div key={activity.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{activity.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.date).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <Link href="/farm/activities">
                  <Button variant="outline" className="w-full mt-2">
                    Xem tất cả
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có hoạt động nào</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hành động nhanh</CardTitle>
            <CardDescription>Các thao tác thường dùng</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/farm/areas">
              <Button variant="outline" className="w-full justify-start">
                <MapPin className="mr-2 h-4 w-4" />
                Quản lý khu vực
              </Button>
            </Link>
            <Link href="/farm/activities">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                Ghi nhận hoạt động
              </Button>
            </Link>
            <Link href="/farm/finance">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                Xem báo cáo tài chính
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

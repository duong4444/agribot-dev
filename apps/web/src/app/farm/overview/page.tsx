"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Calendar, TrendingUp, Loader2 } from "lucide-react";
import Link from "next/link";
import { WeatherWidget } from "@/components/dashboard/WeatherWidget";

export default function FarmOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [farm, setFarm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [farmRes, areasRes, activitiesRes, financeRes] =
          await Promise.all([
            fetch("/api/farms"),
            fetch("/api/farms/areas"),
            fetch("/api/farms/activities?limit=5"),
            fetch("/api/farms/stats"),
          ]);

        const farmData = farmRes.ok ? await farmRes.json() : null;
        const areas = areasRes.ok ? await areasRes.json() : [];
        const activities = activitiesRes.ok ? await activitiesRes.json() : [];
        const finance = financeRes.ok
          ? await financeRes.json()
          : { totalCost: 0, totalRevenue: 0, profit: 0 };

        setFarm(farmData);
        setStats({
          areasCount: areas.length,
          recentActivities: activities.slice(0, 3),
          finance,
        });
      } catch (error) {
        console.error("Failed to fetch overview stats:", error);
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
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="grid gap-4 md:grid-cols-12 lg:grid-cols-12">
        {/* Welcome & Farm Info - Spans 8 columns */}
        <Card className="md:col-span-7 lg:col-span-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-green-800 dark:text-green-400">
              {farm?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground bg-white/50 dark:bg-black/20 p-3 rounded-lg w-fit">
              <MapPin className="h-5 w-5 text-green-600" />
              <span className="font-medium">
                {farm?.address || "Chưa cập nhật địa chỉ"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Weather Widget - Spans 4 columns */}
        <div className="md:col-span-5 lg:col-span-4">
          <WeatherWidget address={farm?.address || ""} />
        </div>
      </div>

      {/* Key Statistics */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">
          Thống kê nhanh
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Khu vực canh tác
              </CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats?.areasCount || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tổng số khu vực đang quản lý
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Doanh thu
              </CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(stats?.finance?.totalRevenue || 0).toLocaleString("vi-VN")} đ
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tổng thu nhập vụ mùa
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Lợi nhuận
              </CardTitle>
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center ${(stats?.finance?.profit || 0) >= 0 ? "bg-emerald-100" : "bg-red-100"}`}
              >
                <TrendingUp
                  className={`h-4 w-4 ${(stats?.finance?.profit || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${(stats?.finance?.profit || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}
              >
                {(stats?.finance?.profit || 0).toLocaleString("vi-VN")} đ
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Hiệu quả kinh doanh
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Recent Activities - Spans 8 columns */}
        <Card className="md:col-span-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Hoạt động gần đây</CardTitle>
                <CardDescription>Nhật ký canh tác mới nhất</CardDescription>
              </div>
              <Link href="/farm/activities">
                <Button variant="ghost" size="sm">
                  Xem tất cả
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              <div className="space-y-4">
                {stats.recentActivities.map((activity: any) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-100"
                  >
                    <div className="mt-1 h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-900 dark:text-slate-100">
                        {activity.type}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(activity.date).toLocaleDateString("vi-VN", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      {activity.notes && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">
                          {activity.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Chưa có hoạt động nào được ghi nhận</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions - Spans 4 columns */}
        <div className="md:col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hành động nhanh</CardTitle>
              <CardDescription>Lối tắt quản lý</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/farm/areas">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all group"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Quản lý khu vực</div>
                    <div className="text-[10px] text-muted-foreground">
                      Thêm hoặc sửa khu vực
                    </div>
                  </div>
                </Button>
              </Link>

              <Link href="/farm/activities">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition-all group"
                >
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center mr-3 group-hover:bg-orange-200 transition-colors">
                    <Calendar className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Ghi nhật ký</div>
                    <div className="text-[10px] text-muted-foreground">
                      Cập nhật hoạt động mới
                    </div>
                  </div>
                </Button>
              </Link>

              <Link href="/farm/finance">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3 hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all group"
                >
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3 group-hover:bg-green-200 transition-colors">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Tài chính</div>
                    <div className="text-[10px] text-muted-foreground">
                      Xem báo cáo thu chi
                    </div>
                  </div>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

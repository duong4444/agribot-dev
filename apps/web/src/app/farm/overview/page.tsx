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
import { MapPin, Calendar, TrendingUp, Loader2, ArrowRight, Package } from "lucide-react";
import Link from "next/link";
import { WeatherWidget } from "@/components/dashboard/WeatherWidget";
import { EditFarmModal } from "@/components/farm/EditFarmModal";

export default function FarmOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [farm, setFarm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Chào buổi sáng");
    else if (hour < 18) setGreeting("Chào buổi chiều");
    else setGreeting("Chào buổi tối");

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

  const fetchStats = async () => {
    try {
      const [farmRes] = await Promise.all([fetch("/api/farms")]);
      const farmData = farmRes.ok ? await farmRes.json() : null;
      setFarm(farmData);
    } catch (error) {
      console.error("Failed to refresh farm data:", error);
    }
  };

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
      <div className="grid gap-6 md:grid-cols-12">
        {/* Welcome Card */}
        <Card className="md:col-span-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-none shadow-sm overflow-hidden relative">
          <CardHeader className="pb-2 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                  {greeting},
                </div>
                <CardTitle className="text-3xl font-bold text-green-800 dark:text-green-300">
                  {farm?.name || "Nông trại của tôi"}
                </CardTitle>
              </div>
              <EditFarmModal farm={farm} onSuccess={fetchStats} />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-2 text-sm text-muted-foreground bg-white/60 dark:bg-black/20 p-3 rounded-lg backdrop-blur-sm w-fit">
                <MapPin className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium block text-slate-700 dark:text-slate-300">
                    Địa chỉ
                  </span>
                  <span className="opacity-80">
                    {farm?.address || "Chưa cập nhật địa chỉ"}
                  </span>
                </div>
              </div>
              
              {farm?.description && (
                <div className="text-sm text-slate-600 dark:text-slate-400 max-w-lg">
                  {farm.description}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weather Widget */}
        <div className="md:col-span-7 h-full">
          <WeatherWidget address={farm?.address || ""} />
        </div>
      </div>

      {/* Key Statistics */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Thống kê nhanh
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-md transition-all hover:-translate-y-1 duration-300 border-l-4 border-l-blue-500">
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

          <Card className="hover:shadow-md transition-all hover:-translate-y-1 duration-300 border-l-4 border-l-green-500">
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

          <Card className="hover:shadow-md transition-all hover:-translate-y-1 duration-300 border-l-4 border-l-emerald-500">
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
        <Card className="md:col-span-8 h-full flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Hoạt động gần đây</CardTitle>
                <CardDescription>Nhật ký canh tác mới nhất</CardDescription>
              </div>
              <Link href="/farm/activities">
                <Button variant="ghost" size="sm" className="gap-1">
                  Xem tất cả <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              <div className="space-y-4">
                {stats.recentActivities.map((activity: any) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-100 group"
                  >
                    <div className="mt-1 h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm text-slate-900 dark:text-slate-100">
                          {activity.type}
                        </p>
                        <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                          {new Date(activity.date).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(activity.date).toLocaleDateString("vi-VN", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      {activity.notes && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                          {activity.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center h-full">
                <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-slate-400" />
                </div>
                <p className="font-medium">Chưa có hoạt động nào</p>
                <p className="text-sm mt-1">Hãy bắt đầu ghi nhật ký canh tác ngay hôm nay</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions - Spans 4 columns */}
        <div className="md:col-span-4 space-y-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Hành động nhanh</CardTitle>
              <CardDescription>Lối tắt quản lý</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/farm/areas">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-blue-100/50 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
                  <div className="relative flex items-center w-full">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 group-hover:bg-white transition-colors shadow-sm">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-medium">Quản lý khu vực</div>
                      <div className="text-[11px] text-muted-foreground group-hover:text-blue-600/80">
                        Thêm hoặc sửa khu vực
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                  </div>
                </Button>
              </Link>

              <Link href="/farm/activities">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-orange-100/50 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
                  <div className="relative flex items-center w-full">
                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center mr-3 group-hover:bg-white transition-colors shadow-sm">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-medium">Ghi nhật ký</div>
                      <div className="text-[11px] text-muted-foreground group-hover:text-orange-600/80">
                        Cập nhật hoạt động mới
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                  </div>
                </Button>
              </Link>

              <Link href="/farm/installation-requests">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-purple-100/50 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
                  <div className="relative flex items-center w-full">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center mr-3 group-hover:bg-white transition-colors shadow-sm">
                      <Package className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-medium">Yêu cầu lắp đặt</div>
                      <div className="text-[11px] text-muted-foreground group-hover:text-purple-600/80">
                        Quản lý thiết bị IoT
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                  </div>
                </Button>
              </Link>

              <Link href="/farm/finance">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4 hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-green-100/50 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
                  <div className="relative flex items-center w-full">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-3 group-hover:bg-white transition-colors shadow-sm">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-medium">Tài chính</div>
                      <div className="text-[11px] text-muted-foreground group-hover:text-green-600/80">
                        Xem báo cáo thu chi
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
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

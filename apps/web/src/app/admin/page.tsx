"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Users,
  BarChart3,
  Settings,
  Shield,
  Activity,
  MessageSquare,
  Leaf,
  LogOut,
  Home,
  TrendingUp,
  UserCheck,
  Database,
} from "lucide-react";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    // Redirect to login if not authenticated
    if (!session) {
      router.replace("/login");
      return;
    }

    // Redirect to dashboard if not ADMIN role
    if (session.user?.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  // Show loading spinner while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-agri-green-600"></div>
      </div>
    );
  }

  // Don't render anything if not authenticated
  if (!session) {
    return null;
  }

  // Show access denied message if not ADMIN
  if (session.user?.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Không có quyền truy cập</CardTitle>
            <CardDescription className="text-center">
              Bạn không có quyền truy cập trang quản trị này.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/dashboard")}>
              Quay về Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Admin Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <Leaf className="h-8 w-8 text-agri-green-600" />
                <span className="text-xl font-bold text-agri-green-800 dark:text-agri-green-400">
                  AgriBot Admin
                </span>
              </Link>
              <Badge variant="destructive" className="ml-2">
                <Shield className="h-3 w-3 mr-1" />
                ADMIN
              </Badge>
            </div>

            <div className="flex items-center space-x-2">
              <span className="hidden md:inline text-sm text-gray-600 dark:text-gray-300">
                Xin chào, {session.user?.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat Dashboard
              </Button>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Bảng Điều Khiển Quản Trị
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Quản lý hệ thống AgriBot và giám sát hoạt động người dùng
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tổng Người Dùng
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground">
                Đang kết nối với API
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Người Dùng Hoạt Động
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground">
                Trong 24h qua
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Cuộc Trò Chuyện
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground">
                Tổng số cuộc trò chuyện
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Trạng Thái Hệ Thống
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-semibold">Hoạt Động Tốt</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tất cả dịch vụ bình thường
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-agri-green-600" />
                <span>Quản Lý Người Dùng</span>
              </CardTitle>
              <CardDescription>
                Xem danh sách, kích hoạt/vô hiệu hóa tài khoản người dùng
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Danh sách người dùng</p>
                  <p className="text-xs text-gray-500">Xem và quản lý tất cả tài khoản</p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  <Database className="h-4 w-4 mr-2" />
                  Xem
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Phân quyền</p>
                  <p className="text-xs text-gray-500">Thay đổi vai trò người dùng</p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  <Shield className="h-4 w-4 mr-2" />
                  Quản lý
                </Button>
              </div>
              <p className="text-xs text-center text-gray-500 pt-2">
                Tính năng đang được phát triển
              </p>
            </CardContent>
          </Card>

          {/* Analytics & Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-agri-green-600" />
                <span>Báo Cáo & Phân Tích</span>
              </CardTitle>
              <CardDescription>
                Xem thống kê chi tiết về hoạt động hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Thống kê sử dụng</p>
                  <p className="text-xs text-gray-500">Xem báo cáo chi tiết</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/analytics")}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Xem
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Hoạt động chatbot</p>
                  <p className="text-xs text-gray-500">Theo dõi cuộc trò chuyện</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/dashboard")}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Truy cập
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-agri-green-600" />
                <span>Cài Đặt Hệ Thống</span>
              </CardTitle>
              <CardDescription>
                Cấu hình các thông số và tùy chọn hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Cấu hình chatbot</p>
                  <p className="text-xs text-gray-500">Điều chỉnh AI parameters</p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  <Settings className="h-4 w-4 mr-2" />
                  Cấu hình
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Quản lý nông trại</p>
                  <p className="text-xs text-gray-500">Xem tất cả nông trại</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/farm")}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Xem
                </Button>
              </div>
              <p className="text-xs text-center text-gray-500 pt-2">
                Một số tính năng đang phát triển
              </p>
            </CardContent>
          </Card>

          {/* Quick Access */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-agri-green-600" />
                <span>Truy Cập Nhanh</span>
              </CardTitle>
              <CardDescription>
                Các tính năng thường dùng cho quản trị viên
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/dashboard")}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Giao diện Chat
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/farm")}
              >
                <Home className="h-4 w-4 mr-2" />
                Quản lý Nông trại
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/analytics")}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Báo cáo & Analytics
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/settings")}
              >
                <Settings className="h-4 w-4 mr-2" />
                Cài đặt Cá nhân
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

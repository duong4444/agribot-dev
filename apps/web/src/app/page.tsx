"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Bot,
  BarChart3,
  Droplets,
  Leaf,
  Smartphone,
  Cloud,
  LogOut,
  MessageSquare,
  FileText,
  Users,
  Shield,
  Tractor,
} from "lucide-react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect users based on role
  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.role === 'ADMIN') {
        router.push('/admin');
      } else if (session?.user?.role === 'TECHNICIAN') {
        router.push('/technician');
      }
    }
  }, [session, status, router]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const getDashboardLink = () => {
    if (session?.user?.role === 'ADMIN') {
      return '/admin';
    } else if (session?.user?.role === 'TECHNICIAN') {
      return '/technician';
    }
    return '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-agri-green-100 to-agri-green-200 dark:from-gray-900 dark:to-green-800">
      {/* If admin or technician is authenticated, show redirect message only */}
      {status === 'authenticated' && (session?.user?.role === 'ADMIN' || session?.user?.role === 'TECHNICIAN') ? (
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="pt-6 text-center">
              <div className="mb-4">
                <Shield className="h-16 w-16 text-purple-600 mx-auto mb-4" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {session.user?.role === 'ADMIN' ? 'ADMIN' : 'TECHNICIAN'} đã đăng nhập
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Chuyển hướng đến trang {session.user?.role === 'ADMIN' ? 'ADMIN' : 'Technician'}...
              </p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center space-x-2">
              <Leaf className="h-8 w-8 text-agri-green-600" />
              <span className="text-2xl font-bold text-agri-green-800 dark:text-agri-green-400">
                AgriBot
              </span>
            </div>
          </Link>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {status === 'loading' ? (
              <div className="animate-pulse bg-gray-200 h-10 w-20 rounded"></div>
            ) : session ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Xin chào, {session.user?.name}
                </span>
                <Link href={getDashboardLink()}>
                  <Button variant="outline" className="flex items-center space-x-2">
                    {session.user?.role === 'ADMIN' ? (
                      <>
                        <Shield className="h-4 w-4" />
                        <span>Quản trị</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4" />
                        <span>Chat</span>
                      </>
                    )}
                  </Button>
                </Link>
                {session.user?.role !== 'ADMIN' && (
                  <Link href="/farm/overview">
                    <Button variant="outline" className="flex items-center space-x-2">
                      <Tractor className="h-4 w-4" />
                      <span>Nông trại</span>
                    </Button>
                  </Link>
                )}
                <Button 
                  variant="ghost" 
                  onClick={handleSignOut}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Đăng xuất</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login">
                  <Button variant="outline">Đăng nhập</Button>
                </Link>
                <Link href="/register">
                  <Button>Đăng ký</Button>
                </Link>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        {session ? (
          session.user?.role === 'ADMIN' ? (
            // Admin user section
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center px-4 py-2 mb-4 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                <Shield className="h-4 w-4 mr-2" />
                <span className="text-sm font-semibold">ADMIN</span>
              </div>
              <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
                Chào mừng, {session.user?.name}! 👨‍💼
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                Quản lý hệ thống AgriBot, tài liệu, người dùng và giám sát hoạt động
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/admin">
                  <Button
                    size="lg"
                    className="bg-purple-600 hover:bg-purple-700 flex items-center space-x-2"
                  >
                    <Shield className="h-5 w-5" />
                    <span>Bảng điều khiển Admin</span>
                  </Button>
                </Link>
                <Link href="/admin/documents">
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <FileText className="h-5 w-5" />
                    <span>Quản lý Tài liệu</span>
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            // Regular user section
            <div className="text-center mb-16">
              <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
                Chào mừng trở lại, {session.user?.name}! 🌱
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                Sẵn sàng để bắt đầu cuộc trò chuyện với trợ lý AI nông nghiệp của bạn?
              </p>
              <div className="flex justify-center">
                <Link href={getDashboardLink()}>
                  <Button
                    size="lg"
                    className="bg-agri-green-600 hover:bg-agri-green-700 flex items-center space-x-2"
                  >
                    <MessageSquare className="h-5 w-5" />
                    <span>Bắt đầu Chat</span>
                  </Button>
                </Link>
              </div>
            </div>
          )
        ) : (
          // Landing section for non-logged in users
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Trợ lý AI Thông minh cho Nông nghiệp 
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Hệ thống chatbot AI tích hợp IoT giúp nông dân quản lý trang trại,
              tư vấn kỹ thuật canh tác và tự động hóa tưới tiêu.
            </p>
            <div className="flex justify-center">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-agri-green-600 hover:bg-agri-green-700"
                >
                  Bắt đầu miễn phí
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {session?.user?.role === 'ADMIN' && (
            <>
              <Card className="border-purple-200 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <FileText className="h-12 w-12 text-purple-600 mb-4" />
                  <CardTitle>Quản lý Tài liệu</CardTitle>
                  <CardDescription>
                    Upload và quản lý tài liệu nông nghiệp cho hệ thống AI
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-purple-200 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Users className="h-12 w-12 text-purple-600 mb-4" />
                  <CardTitle>Quản lý Người dùng</CardTitle>
                  <CardDescription>
                    Quản lý tài khoản người dùng và phân quyền hệ thống
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-purple-200 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <BarChart3 className="h-12 w-12 text-purple-600 mb-4" />
                  <CardTitle>Thống kê & Phân tích</CardTitle>
                  <CardDescription>
                    Xem thống kê hệ thống và phân tích dữ liệu chi tiết
                  </CardDescription>
                </CardHeader>
              </Card>
            </>
          )}
          <Card className="border-agri-green-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <Bot className="h-12 w-12 text-agri-green-600 mb-4" />
              <CardTitle>Chatbot AI Thông minh</CardTitle>
              <CardDescription>
                Tư vấn kỹ thuật canh tác, chăm sóc cây trồng bằng tiếng Việt
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-agri-green-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <Droplets className="h-12 w-12 text-agri-green-600 mb-4" />
              <CardTitle>Tự động Tưới tiêu</CardTitle>
              <CardDescription>
                Tích hợp IoT để theo dõi độ ẩm và tự động điều khiển tưới tiêu
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-agri-green-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-agri-green-600 mb-4" />
              <CardTitle>Quản lý Dữ liệu</CardTitle>
              <CardDescription>
                Theo dõi chi phí, năng suất và tạo báo cáo chi tiết
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-agri-green-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <Smartphone className="h-12 w-12 text-agri-green-600 mb-4" />
              <CardTitle>Giám sát IoT</CardTitle>
              <CardDescription>
                Theo dõi cảm biến nhiệt độ, độ ẩm, ánh sáng theo thời gian thực
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-agri-green-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <Leaf className="h-12 w-12 text-agri-green-600 mb-4" />
              <CardTitle>Cơ sở Tri thức</CardTitle>
              <CardDescription>
                Cơ sở dữ liệu phong phú về cây trồng và kỹ thuật canh tác
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-agri-green-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <Cloud className="h-12 w-12 text-agri-green-600 mb-4" />
              <CardTitle>Dự báo Thời tiết</CardTitle>
              <CardDescription>
                Tích hợp dữ liệu thời tiết để đưa ra khuyến nghị canh tác
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        {session ? (
          session.user?.role === 'ADMIN' ? (
            <div className="text-center bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-lg p-8 shadow-lg">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Công cụ Quản trị Hệ thống
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                Truy cập các công cụ quản lý và giám sát hệ thống AgriBot
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/admin">
                  <Button
                    size="lg"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Bảng điều khiển Admin
                  </Button>
                </Link>
                <Link href="/admin/documents">
                  <Button
                    size="lg"
                    variant="outline"
                  >
                    Quản lý Tài liệu
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Tiếp tục hành trình cùng AgriBot
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                Truy cập bảng điều khiển để quản lý trang trại và trò chuyện với trợ lý AI
              </p>
              <Link href={getDashboardLink()}>
                <Button
                  size="lg"
                  className="bg-agri-green-600 hover:bg-agri-green-700"
                >
                  Đi tới bảng điều khiển
                </Button>
              </Link>
            </div>
          )
        ) : (
          <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Sẵn sàng bắt đầu?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              Tham gia cùng hàng ngàn nông dân đã tin tưởng sử dụng AgriBot
            </p>
            <Link href="/register">
              <Button
                size="lg"
                className="bg-agri-green-600 hover:bg-agri-green-700"
              >
                Tạo tài khoản miễn phí
              </Button>
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Leaf className="h-6 w-6 text-agri-green-400" />
            <span className="text-xl font-bold">AgriBot</span>
          </div>
          <p className="text-gray-400">
            © 2025 AgriBot.
          </p>
        </div>
      </footer>
      </>
      )}
    </div>
  );
}

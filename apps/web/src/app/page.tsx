import Link from "next/link";
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
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-agri-green-100 to-agri-green-200 dark:from-gray-900 dark:to-green-800">
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
            <Link href="/login">
              <Button variant="outline">Đăng nhập</Button>
            </Link>
            <Link href="/register">
              <Button>Đăng ký</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Trợ lý AI Thông minh cho Nông nghiệp 
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Hệ thống chatbot AI tích hợp IoT giúp nông dân quản lý trang trại,
            tư vấn kỹ thuật canh tác và tự động hóa tưới tiêu.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-agri-green-600 hover:bg-agri-green-700"
              >
                Bắt đầu miễn phí
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline">
                Xem demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
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
    </div>
  );
}

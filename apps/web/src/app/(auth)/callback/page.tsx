"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Leaf, CheckCircle, XCircle, Loader2, ArrowLeft, Home } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Đang xử lý đăng nhập...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        const token = searchParams.get('token');
        const refresh = searchParams.get('refresh');

        if (!token) {
          clearInterval(progressInterval);
          setStatus('error');
          setMessage('Không nhận được token từ server');
          setProgress(100);
          return;
        }

        // Sử dụng NextAuth.js để tạo session với token từ backend
        const result = await signIn('credentials', {
          token,
          refreshToken: refresh,
          redirect: false,
        });

        clearInterval(progressInterval);
        setProgress(100);

        if (result?.error) {
          setStatus('error');
          setMessage('Lỗi xác thực token');
        } else {
          setStatus('success');
          setMessage('Đăng nhập thành công! Đang chuyển hướng...');
          
          // Get session to check user role and redirect accordingly
          const { getSession } = await import('next-auth/react');
          const session = await getSession();
          
          setTimeout(() => {
            if (session?.user?.role === "ADMIN") {
              router.push('/admin');
            } else {
              router.push('/dashboard');
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Callback error:', error);
        setStatus('error');
        setMessage('Đã xảy ra lỗi khi xử lý đăng nhập');
        setProgress(100);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-agri-green-50 via-white to-agri-green-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="p-3 bg-agri-green-100 dark:bg-agri-green-900 rounded-full">
              <Leaf className="h-10 w-10 text-agri-green-600 dark:text-agri-green-400" />
            </div>
            <span className="text-3xl font-bold text-agri-green-800 dark:text-agri-green-400">
              AgriBot
            </span>
          </div>
        </div>

        {/* Main Card */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              Xử lý đăng nhập
            </CardTitle>
          </CardHeader>
          
          <CardContent className="px-6 pb-6">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Tiến trình</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-agri-green-500 to-agri-green-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Status Content */}
            <div className="text-center space-y-6">
              {status === 'loading' && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative">
                      <Loader2 className="h-12 w-12 text-agri-green-600 animate-spin" />
                      <div className="absolute inset-0 rounded-full border-2 border-agri-green-200 dark:border-agri-green-800"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-700 dark:text-gray-300 font-medium">{message}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Vui lòng đợi trong giây lát...
                    </p>
                  </div>
                </div>
              )}
              
              {status === 'success' && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-green-700 dark:text-green-400 font-semibold text-lg">
                      Đăng nhập thành công!
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Đang chuyển hướng đến trang chính...
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              {status === 'error' && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                      <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-red-700 dark:text-red-400 font-semibold text-lg">
                      Đăng nhập thất bại
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {message}
                    </p>
                  </div>
                  <div className="flex flex-col space-y-3 pt-2">
                    <Button
                      onClick={() => router.push('/login')}
                      className="w-full bg-agri-green-600 hover:bg-agri-green-700 text-white"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Quay lại đăng nhập
                    </Button>
                    <Button
                      onClick={() => router.push('/')}
                      variant="outline"
                      className="w-full"
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Về trang chủ
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Được bảo mật bởi AgriBot Authentication System
          </p>
        </div>
      </div>
    </div>
  );
}


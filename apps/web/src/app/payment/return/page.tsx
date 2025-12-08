'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function PaymentReturnPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { update } = useSession();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'error'>('loading');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Backend redirects here with ?status=success|failed|error
    const statusParam = searchParams.get('status');
    
    if (statusParam) {
      // Validate status param
      if (['success', 'failed', 'error'].includes(statusParam)) {
          setStatus(statusParam as any);
          if (statusParam === 'success') {
            update(); // Refresh session to reflect new subscription
          }
      } else {
          setStatus('error');
      }
    } else {
      // No status param - invalid state or direct access
       setStatus('error');
    }
  }, [searchParams, update]);

  useEffect(() => {
    if (status !== 'loading' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      router.push('/dashboard');
    }
  }, [countdown, router, status]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center text-center space-y-4">
            <Loader2 className="h-20 w-20 text-blue-500 animate-spin" />
            <h2 className="text-2xl font-bold text-blue-700">Đang xác thực thanh toán...</h2>
            <p className="text-gray-600">Vui lòng chờ trong giây lát.</p>
          </div>
        );
      case 'success':
        return (
          <div className="flex flex-col items-center text-center space-y-4">
            <CheckCircle2 className="h-20 w-20 text-green-500" />
            <h2 className="text-2xl font-bold text-green-700">Thanh toán thành công!</h2>
            <p className="text-gray-600">Gói Premium của bạn đã được kích hoạt. Cảm ơn bạn đã tin tưởng sử dụng dịch vụ.</p>
          </div>
        );
      case 'failed':
        return (
          <div className="flex flex-col items-center text-center space-y-4">
            <XCircle className="h-20 w-20 text-red-500" />
            <h2 className="text-2xl font-bold text-red-700">Thanh toán thất bại</h2>
            <p className="text-gray-600">Giao dịch đã bị hủy hoặc xảy ra lỗi trong quá trình xử lý.</p>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center text-center space-y-4">
            <AlertCircle className="h-20 w-20 text-yellow-500" />
            <h2 className="text-2xl font-bold text-yellow-700">Có lỗi xảy ra</h2>
            <p className="text-gray-600">Không thể xác thực giao dịch. Vui lòng liên hệ hỗ trợ.</p>
          </div>
        );
    }
  };

  return (
    <div className="container py-20 flex justify-center items-center min-h-[calc(100vh-80px)]">
      <Card className="max-w-md w-full shadow-lg">
        <CardContent className="pt-10">
          {renderContent()}
        </CardContent>
        {status !== 'loading' && (
          <CardFooter className="flex flex-col space-y-2">
            <Button className="w-full" onClick={() => router.push('/dashboard')}>
              Quay về Dashboard ({countdown}s)
            </Button>
            {status === 'failed' && (
               <Button variant="outline" className="w-full" onClick={() => router.push('/farm/pricing')}>
                  Thử lại
               </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

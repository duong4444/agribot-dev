'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { toast } from '@/components/ui/use-toast';

export function TokenExpirationHandler() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    // Intercept fetch globally
    // lưu lại hàm fetch gốc của trình duyệt để dùng và hồi phục 
    const originalFetch = window.fetch;
    // ghi đè hàm fetch
    window.fetch = async (...args) => {
      // vẫn gọi api như bth bằng hàm gốc
      const response = await originalFetch(...args);
      
      // Check for 401 Unauthorized
      if (response.status === 401 && status === 'authenticated') {
        // Clone response to read body
        const clonedResponse = response.clone();
        
        try {
          const errorData = await clonedResponse.json();
          
          if (errorData.isTokenExpired) {
            toast({
              title: '⏰ Bạn đã hết phiên đăng nhập',
              description: 'Vui lòng đăng nhập lại để tiếp tục.',
              variant: 'destructive',
            });
            
            // Auto logout
            await signOut({ redirect: false });
            router.push('/login');
          }
        } catch (e) {
          // If JSON parse fails, ignore
        }
      }
      
      return response;
    };
    
    // Cleanup
    return () => {
      window.fetch = originalFetch;
    };
  }, [router, status]);
  
  return null;
}

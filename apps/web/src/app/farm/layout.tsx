"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardHeader } from '@/components/dashboard';
import { FarmRegistrationModal } from '@/components/farm/FarmRegistrationModal';
import { LayoutDashboard, MapPin, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationTabs = [
  { 
    label: 'Tổng quan', 
    href: '/farm/overview', 
    icon: LayoutDashboard 
  },
  { 
    label: 'Khu vực', 
    href: '/farm/areas', 
    icon: MapPin 
  },
  { 
    label: 'Nhật ký', 
    href: '/farm/activities', 
    icon: Calendar 
  },
  { 
    label: 'Tài chính', 
    href: '/farm/finance', 
    icon: DollarSign 
  },
  { 
    label: 'Yêu cầu lắp đặt', 
    href: '/farm/installation-requests', 
    icon: LayoutDashboard 
  },
];

export default function FarmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [hasFarm, setHasFarm] = useState(false);
  const [isCheckingFarm, setIsCheckingFarm] = useState(true);

  useEffect(() => {
    const checkFarm = async () => {
      try {
        const response = await fetch('/api/farms');
        if (response.ok) {
          setHasFarm(true);
        } else if (response.status === 404) {
          setHasFarm(false);
          setShowFarmModal(true);
        }
      } catch (error) {
        console.error('Farm check error:', error);
      } finally {
        setIsCheckingFarm(false);
      }
    };

    if (session) {
      checkFarm();
    }
  }, [session]);

  const handleFarmCreated = (newFarm: any) => {
    setHasFarm(true);
    setShowFarmModal(false);
  };

  if (isCheckingFarm) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-50 to-agri-green-50/30">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-agri-green-600" />
            <p className="text-gray-600">Đang tải thông tin nông trại...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-agri-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <DashboardHeader userName={session?.user?.name} />
        
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {hasFarm ? (
            <>
              {/* Navigation Tabs */}
              <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  {navigationTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = pathname === tab.href || 
                                   (pathname === '/farm' && tab.href === '/farm/overview');
                    
                    return (
                      <Link
                        key={tab.href}
                        href={tab.href}
                        className={cn(
                          "group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                          isActive
                            ? "border-agri-green-500 text-agri-green-600 dark:text-agri-green-400"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                        )}
                      >
                        <Icon
                          className={cn(
                            "mr-2 h-5 w-5",
                            isActive
                              ? "text-agri-green-500 dark:text-agri-green-400"
                              : "text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300"
                          )}
                        />
                        {tab.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Page Content */}
              <div className="mt-6">
                {children}
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <h2 className="text-xl font-semibold mb-4">Bạn chưa có nông trại</h2>
              <p className="text-gray-500 mb-4">Vui lòng đăng ký nông trại để bắt đầu quản lý.</p>
            </div>
          )}
        </div>
        
        <FarmRegistrationModal isOpen={showFarmModal} onSuccess={handleFarmCreated} />
      </div>
    </AuthGuard>
  );
}

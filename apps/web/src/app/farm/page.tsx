"use client";
import React from 'react';
import { useSession } from 'next-auth/react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardHeader } from '@/components/dashboard';
import { FarmDashboard } from '@/components/farm/FarmDashboard';
import { FarmRegistrationModal } from '@/components/farm/FarmRegistrationModal';

const FarmPage = () => {
  const { data: session } = useSession();
  const [showFarmModal, setShowFarmModal] = React.useState(false);
  const [farm, setFarm] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const checkFarm = async () => {
      try {
        const res = await fetch('/api/farms');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setFarm(data);
          } else {
            setShowFarmModal(true);
          }
        } else if (res.status === 404) {
          setShowFarmModal(true);
        }
      } catch (error) {
        console.error('Failed to check farm:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (session?.user) {
      checkFarm();
    }
  }, [session]);

  const handleFarmCreated = (newFarm: any) => {
    setFarm(newFarm);
    setShowFarmModal(false);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-agri-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <DashboardHeader userName={session?.user?.name} />
        
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {isLoading ? (
            <div className="text-center py-10">Đang tải thông tin nông trại...</div>
          ) : farm ? (
            <FarmDashboard farm={farm} />
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
};

export default FarmPage;
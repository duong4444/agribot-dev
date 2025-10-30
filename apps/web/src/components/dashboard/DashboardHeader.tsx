"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { 
  Leaf,
  LogOut,
  Settings,
  BarChart3,
  Home
} from 'lucide-react';

interface DashboardHeaderProps {
  userName?: string | null;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userName }) => {
  const router = useRouter();

  const handleFarmManagement = () => {
    router.push('/farm');
  };

  const handleAnalytics = () => {
    router.push('/analytics');
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="p-2 bg-gradient-to-br from-agri-green-500 to-agri-green-600 rounded-xl shadow-md group-hover:shadow-lg transition-all duration-200">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-agri-green-700 to-agri-green-600 dark:from-agri-green-400 dark:to-agri-green-300 bg-clip-text text-transparent">
                AgriBot
              </span>
            </Link>
            <div className="hidden md:flex items-center pl-4 border-l border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Xin chào, <span className="font-semibold text-gray-900 dark:text-white">{userName}</span>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleFarmManagement}
              className="hidden sm:flex hover:bg-agri-green-50 dark:hover:bg-agri-green-900/20 hover:text-agri-green-700 dark:hover:text-agri-green-300"
            >
              <Home className="h-4 w-4 mr-2" />
              Farm
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleAnalytics}
              className="hidden sm:flex hover:bg-agri-green-50 dark:hover:bg-agri-green-900/20 hover:text-agri-green-700 dark:hover:text-agri-green-300"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSettings}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};


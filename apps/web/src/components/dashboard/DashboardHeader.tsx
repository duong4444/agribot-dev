"use client";

import React from 'react';
import Link from 'next/link';
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
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <Leaf className="h-8 w-8 text-agri-green-600" />
              <span className="text-xl font-bold text-agri-green-800 dark:text-agri-green-400">
                AgriBot
              </span>
            </Link>
            <div className="hidden md:block">
              <span className="text-sm text-gray-500">
                Xin chào, {userName}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.location.href = '/farm'}
            >
              <Home className="h-4 w-4 mr-2" />
              Farm Management
            </Button>
            <Button variant="ghost" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};


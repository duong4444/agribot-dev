"use client";

import React from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { BarChart3, LogOut, Home } from 'lucide-react';

interface FarmHeaderProps {
  userName?: string | null;
}

export const FarmHeader: React.FC<FarmHeaderProps> = ({ userName }) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <Home className="h-8 w-8 text-agri-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Farm Management</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Quản lý nông trại và cây trồng</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Xin chào, {userName}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/dashboard'}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Chat Bot
            </Button>
            <ThemeToggle />
            <Button
              variant="outline"
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

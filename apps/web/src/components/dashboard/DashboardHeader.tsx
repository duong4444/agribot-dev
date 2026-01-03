"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { 
  Leaf,
  LogOut,
  Settings,
  Phone,
  Mail
} from 'lucide-react';
import { AreaReference } from './AreaReference';
import { ContactInfo } from './ContactInfo';

interface DashboardHeaderProps {
  userName?: string | null;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userName }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const isFarmer = session?.user?.role === 'FARMER';

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
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-2 ml-8">
              <Link href="/dashboard">
                <Button 
                  variant={pathname === '/dashboard' ? 'default' : 'ghost'}
                  className={pathname === '/dashboard' ? 'bg-agri-green-600 hover:bg-agri-green-700' : ''}
                >
                  Chat
                </Button>
              </Link>
              <Link href="/farm/overview">
                <Button 
                  variant={pathname?.startsWith('/farm') ? 'default' : 'ghost'}
                  className={pathname?.startsWith('/farm') ? 'bg-agri-green-600 hover:bg-agri-green-700' : ''}
                >
                  Nông Trại
                </Button>
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-2">
            {isFarmer && <AreaReference />}
            {isFarmer && <ContactInfo phone="0920222027" email="kmact7c@gmail.com" />}
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSettings}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Cài đặt</span>
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


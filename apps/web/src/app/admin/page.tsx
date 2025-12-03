"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Settings, Leaf, Database } from 'lucide-react';
import Link from 'next/link';

const AdminPage = () => {
  const { data: session } = useSession();

  const adminModules = [
    {
      title: 'Yêu Cầu Lắp Đặt',
      description: 'Quản lý yêu cầu lắp đặt thiết bị IoT và phân công kỹ thuật viên',
      icon: Settings,
      href: '/admin/installation-requests',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100 dark:bg-cyan-900',
    },
    {
      title: 'Kho Thiết Bị',
      description: 'Quản lý thiết bị IoT trong kho và theo dõi trạng thái',
      icon: Database,
      href: '/admin/device-inventory',
      color: 'text-teal-600',
      bgColor: 'bg-teal-100 dark:bg-teal-900',
    },
    {
      title: 'Kiến thức Cây trồng',
      description: 'Upload file .md với structural chunking cho Layer 1 FTS',
      icon: Leaf,
      href: '/admin/documents',
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    {
      title: 'RAG Documents',
      description: 'Quản lý tài liệu RAG với vector embeddings cho Layer 2',
      icon: Database,
      href: '/admin/rag-documents',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900',
    },
    {
      title: 'Quản lý Người dùng',
      description: 'Quản lý tài khoản người dùng và phân quyền',
      icon: Users,
      href: '/admin/users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Bảng điều khiển Admin
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Chào mừng {session?.user?.email}, quản lý hệ thống Agricultural Chatbot
        </p>
      </div>

      {/* Admin Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminModules.map((module, index) => {
          const Icon = module.icon;
          return (
            <Link key={index} href={module.href} className="h-full">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer flex flex-col">
                <CardHeader className="flex-grow">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl mb-2">{module.title}</CardTitle>
                      <CardDescription>{module.description}</CardDescription>
                    </div>
                    <div className={`p-3 rounded-full ${module.bgColor}`}>
                      <Icon className={`h-6 w-6 ${module.color}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Truy cập
                  </Button>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

    </div>
  );
};

export default AdminPage;

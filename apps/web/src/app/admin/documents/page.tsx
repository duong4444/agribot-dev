"use client";

import React, { useState } from 'react';
import { DocumentUpload } from '@/components/admin/DocumentUpload';
import { DocumentList } from '@/components/admin/DocumentList';
import { DocumentStats } from '@/components/admin/DocumentStats';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const AdminDocumentsPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Redirect non-admin users to dashboard
  React.useEffect(() => {
    if (session && session.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Show loading while checking
  if (!session || session.user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Quản lý Kiến thức Cây trồng
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload file Markdown (.md) với cấu trúc chunking cho Layer 1 FTS
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <DocumentStats />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Section */}
        <div className="lg:col-span-1">
          <DocumentUpload onUploadSuccess={handleUploadSuccess} />
        </div>

        {/* List Section */}
        <div className="lg:col-span-2">
          <DocumentList refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </>
  );
};

export default AdminDocumentsPage;

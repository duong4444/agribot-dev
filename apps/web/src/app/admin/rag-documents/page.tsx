"use client";

import React, { useState } from 'react';
import { RagDocumentUpload } from '@/components/admin/RagDocumentUpload';
import { RagDocumentList } from '@/components/admin/RagDocumentList';
import { RagDocumentStats } from '@/components/admin/RagDocumentStats';

const AdminRagDocumentsPage = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Quản lý RAG Documents
          </h2>
          <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full">
            Layer 2
          </span>
        </div>
        <p className="text-muted-foreground">
          Upload file Text (.txt) cho Vector Search với AI Embeddings
        </p>
      </div>

      {/* Stats */}
      <RagDocumentStats refreshTrigger={refreshTrigger} />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Section */}
        <div className="lg:col-span-1">
          <RagDocumentUpload onUploadSuccess={handleUploadSuccess} />
        </div>

        {/* List Section */}
        <div className="lg:col-span-2">
          <RagDocumentList refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
};

export default AdminRagDocumentsPage;

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, FileText, Loader2, CheckCircle, Clock, XCircle, Sparkles, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';

interface RagDocument {
  id: string;
  originalName: string;
  filename: string;
  category: string;
  tags: string[];
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  chunkCount: number;
  embeddingGenerated: boolean;
  createdAt: string;
}

interface RagDocumentListProps {
  refreshTrigger?: number;
}

export const RagDocumentList: React.FC<RagDocumentListProps> = ({ refreshTrigger }) => {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<RagDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/rag-documents`, {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setDocuments(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.accessToken) {
      fetchDocuments();
    }
  }, [session, refreshTrigger]);

  const openDeleteDialog = (doc: RagDocument) => {
    setSelectedDoc(doc);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/rag-documents/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
        },
      });

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== id));
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    } finally {
      setDeleting(null);
      setDeleteDialogOpen(false);
      setSelectedDoc(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Hoàn thành';
      case 'processing':
        return 'Đang xử lý';
      case 'failed':
        return 'Thất bại';
      default:
        return 'Chờ xử lý';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Danh sách Documents</span>
        </CardTitle>
        <CardDescription>
          {documents.length} document(s) • Vector embeddings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Tìm kiếm tài liệu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {documents.filter(doc => 
          doc.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        ).length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Chưa có document nào</p>
            <p className="text-sm mt-2">Upload file .txt để bắt đầu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.filter(doc => 
              doc.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
            ).map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <FileText className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    <h3 className="font-medium truncate">{doc.originalName}</h3>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(doc.processingStatus)}
                      <span>{getStatusText(doc.processingStatus)}</span>
                    </div>
                    
                    {doc.chunkCount > 0 && (
                      <span className="flex items-center">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {doc.chunkCount} chunks
                      </span>
                    )}
                    
                    <span className="text-xs">
                      {format(new Date(doc.createdAt), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>

                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {doc.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openDeleteDialog(doc)}
                  disabled={deleting === doc.id}
                  className="ml-4 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  {deleting === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setSelectedDoc(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa document</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa{' '}
              <span className="font-semibold">{selectedDoc?.originalName}</span>
              ? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedDoc(null);
              }}
              disabled={!!deleting}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedDoc) {
                  handleDelete(selectedDoc.id);
                }
              }}
              disabled={!selectedDoc || !!deleting}
            >
              {deleting && deleting === selectedDoc?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Xóa'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

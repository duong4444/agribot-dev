"use client";

import React, { useState, useEffect } from 'react';
import { FileText, Trash2, RefreshCw, Download, Eye, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type DocumentCategory = 
  | 'CROP_CARE'
  | 'PLANTING'
  | 'HARVESTING'
  | 'PEST_CONTROL'
  | 'SOIL_MANAGEMENT'
  | 'IRRIGATION'
  | 'WEATHER'
  | 'EQUIPMENT'
  | 'GENERAL';

interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: DocumentCategory;
  tags: string[];
  language: string;
  processingStatus: DocumentStatus;
  indexed: boolean;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DocumentListResponse {
  success: boolean;
  data: {
    documents: Document[];
    total: number;
    page: number;
    limit: number;
  };
}

interface DocumentListProps {
  refreshTrigger?: number;
}

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  CROP_CARE: 'Chăm sóc cây trồng',
  PLANTING: 'Gieo trồng',
  HARVESTING: 'Thu hoạch',
  PEST_CONTROL: 'Phòng trừ sâu bệnh',
  SOIL_MANAGEMENT: 'Quản lý đất đai',
  IRRIGATION: 'Tưới tiêu',
  WEATHER: 'Thời tiết',
  EQUIPMENT: 'Thiết bị',
  GENERAL: 'Tổng hợp',
};

const STATUS_LABELS: Record<DocumentStatus, { label: string; color: string }> = {
  PENDING: { label: 'Chờ xử lý', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  PROCESSING: { label: 'Đang xử lý', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  COMPLETED: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  FAILED: { label: 'Thất bại', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

export const DocumentList: React.FC<DocumentListProps> = ({ refreshTrigger }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<DocumentStatus | ''>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{ id: string; filename: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedStatus) params.append('status', selectedStatus);

      const response = await fetch(`/api/admin/documents?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const result: DocumentListResponse = await response.json();
      
      // Safely handle the response data
      if (result.data && Array.isArray(result.data.documents)) {
        setDocuments(result.data.documents);
        setTotal(result.data.total || 0);
      } else {
        setDocuments([]);
        setTotal(0);
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi tải danh sách tài liệu');
      setDocuments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, refreshTrigger]);

  const handleSearch = () => {
    setPage(1);
    fetchDocuments();
  };

  const handleDelete = async (id: string, filename: string) => {
    setDocumentToDelete({ id, filename });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/documents/${documentToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      await fetchDocuments();
      setShowDeleteModal(false);
      setDocumentToDelete(null);
    } catch (err: any) {
      alert(`Lỗi: ${err.message || 'Không thể xóa tài liệu'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDocumentToDelete(null);
  };

  const handleReprocess = async (id: string, filename: string) => {
    if (!confirm(`Bạn có muốn xử lý lại tài liệu "${filename}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/documents/${id}/reprocess`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reprocess document');
      }

      fetchDocuments();
    } catch (err: any) {
      alert(`Lỗi: ${err.message || 'Không thể xử lý lại tài liệu'}`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getStatusLabel = (status: string) => {
    const statusKey = status as DocumentStatus;
    return STATUS_LABELS[statusKey] || { 
      label: status, 
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' 
    };
  };

  const getCategoryLabel = (category: string) => {
    const categoryKey = category as DocumentCategory;
    return CATEGORY_LABELS[categoryKey] || category;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <>
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Danh sách Tài liệu
        </CardTitle>
        <CardDescription>
          Quản lý tài liệu nông nghiệp đã upload
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Tìm kiếm tài liệu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} variant="outline" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory | '')}
          >
            <option value="">Tất cả danh mục</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as DocumentStatus | '')}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <Button onClick={fetchDocuments} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Đang tải...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            <p>{error}</p>
            <Button onClick={fetchDocuments} variant="outline" className="mt-4">
              Thử lại
            </Button>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Chưa có tài liệu nào</p>
          </div>
        ) : (
          <>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên file</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Chunks</TableHead>
                    <TableHead>Kích thước</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium">{doc.originalName}</p>
                            {doc.tags && doc.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {doc.tags.slice(0, 3).map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {doc.tags.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{doc.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getCategoryLabel(doc.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusLabel(doc.processingStatus).color}>
                          {getStatusLabel(doc.processingStatus).label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.chunkCount > 0 ? (
                          <span className="text-green-600 font-medium">{doc.chunkCount}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{formatFileSize(doc.size)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(doc.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReprocess(doc.id, doc.originalName)}
                            title="Xử lý lại"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(doc.id, doc.originalName)}
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-gray-500">
                Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, total)} trong tổng số {total} tài liệu
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Trước
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>

    {/* Delete Confirmation Modal */}
    <ConfirmModal
      isOpen={showDeleteModal}
      onClose={cancelDelete}
      onConfirm={confirmDelete}
      title="Xóa tài liệu"
      message={`Bạn có chắc chắn muốn xóa tài liệu "${documentToDelete?.filename}"? Hành động này không thể hoàn tác.`}
      confirmText="Xóa"
      cancelText="Hủy"
      isLoading={isDeleting}
      variant="danger"
    />
    </>
  );
};

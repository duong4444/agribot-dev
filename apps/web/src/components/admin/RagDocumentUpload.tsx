"use client";

import React, { useState, useCallback } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useSession } from 'next-auth/react';

interface RagDocumentUploadProps {
  onUploadSuccess?: () => void;
}

interface UploadState {
  file: File | null;
  category: string;
  tags: string[];
  uploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
  successMessage: string;
}

const CATEGORIES = [
  { value: 'crop_care', label: 'Chăm sóc cây trồng' },
  { value: 'planting', label: 'Gieo trồng' },
  { value: 'harvesting', label: 'Thu hoạch' },
  { value: 'pest_control', label: 'Phòng trừ sâu bệnh' },
  { value: 'soil_management', label: 'Quản lý đất đai' },
  { value: 'irrigation', label: 'Tưới tiêu' },
  { value: 'general', label: 'Tổng hợp' },
];

export const RagDocumentUpload: React.FC<RagDocumentUploadProps> = ({ onUploadSuccess }) => {
  const { data: session } = useSession();
  const [state, setState] = useState<UploadState>({
    file: null,
    category: 'general',
    tags: [],
    uploading: false,
    progress: 0,
    error: null,
    success: false,
    successMessage: '',
  });

  const [tagInput, setTagInput] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    // Validate file type (.txt only)
    if (!file.name.endsWith('.txt')) {
      setState(prev => ({
        ...prev,
        error: 'Chỉ chấp nhận file .txt',
        file: null,
      }));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setState(prev => ({
        ...prev,
        error: 'File quá lớn (tối đa 10MB)',
        file: null,
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      file,
      error: null,
      success: false,
    }));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !state.tags.includes(tagInput.trim())) {
      setState(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setState(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const handleUpload = async () => {
    if (!state.file) return;

    setState(prev => ({ ...prev, uploading: true, error: null, progress: 0 }));

    try {
      const formData = new FormData();
      formData.append('file', state.file);
      formData.append('category', state.category);
      if (state.tags.length > 0) {
        formData.append('tags', state.tags.join(','));
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/rag-documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();

      setState(prev => ({
        ...prev,
        uploading: false,
        success: true,
        successMessage: `✅ Upload thành công! Document đang được xử lý...`,
        file: null,
        tags: [],
        progress: 100,
      }));

      // Call success callback
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      // Reset after 3 seconds
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          success: false,
          successMessage: '',
          progress: 0,
        }));
      }, 3000);

    } catch (error) {
      setState(prev => ({
        ...prev,
        uploading: false,
        error: 'Lỗi khi upload file. Vui lòng thử lại.',
        progress: 0,
      }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <span>Upload RAG Document</span>
        </CardTitle>
        <CardDescription>
          Upload file .txt để tạo embeddings cho semantic search
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : 'border-gray-300 dark:border-gray-700'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {state.file ? (
            <div className="space-y-2">
              <File className="h-12 w-12 mx-auto text-purple-500" />
              <p className="text-sm font-medium">{state.file.name}</p>
              <p className="text-xs text-gray-500">
                {(state.file.size / 1024).toFixed(2)} KB
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setState(prev => ({ ...prev, file: null }))}
              >
                <X className="h-4 w-4 mr-1" />
                Xóa
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-12 w-12 mx-auto text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Kéo thả file .txt vào đây hoặc
              </p>
              <label>
                <Button variant="outline" size="sm" asChild>
                  <span>Chọn file</span>
                </Button>
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500">
                Chỉ chấp nhận file .txt (tối đa 10MB)
              </p>
            </div>
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label>Danh mục</Label>
          <select
            value={state.category}
            onChange={(e) => setState(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags (tùy chọn)</Label>
          <div className="flex space-x-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="Nhập tag..."
            />
            <Button onClick={handleAddTag} size="sm">
              Thêm
            </Button>
          </div>
          {state.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {state.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-md text-sm flex items-center space-x-1"
                >
                  <span>{tag}</span>
                  <button onClick={() => handleRemoveTag(tag)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Error Message */}
        {state.error && (
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{state.error}</span>
          </div>
        )}

        {/* Success Message */}
        {state.success && (
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>{state.successMessage}</span>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!state.file || state.uploading}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {state.uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Đang upload...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </>
          )}
        </Button>

        {/* Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>ℹ️ File sẽ được xử lý tự động:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Chunking (sentence-based, 500 chars)</li>
            <li>Generate embeddings (768 dims)</li>
            <li>Save to vector database</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

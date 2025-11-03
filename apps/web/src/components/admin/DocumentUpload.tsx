"use client";

import React, { useState, useCallback } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface DocumentUploadProps {
  onUploadSuccess?: () => void;
}

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

interface UploadState {
  file: File | null;
  category: DocumentCategory;
  tags: string[];
  language: string;
  notes: string;
  uploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

const CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'CROP_CARE', label: 'Chăm sóc cây trồng' },
  { value: 'PLANTING', label: 'Gieo trồng' },
  { value: 'HARVESTING', label: 'Thu hoạch' },
  { value: 'PEST_CONTROL', label: 'Phòng trừ sâu bệnh' },
  { value: 'SOIL_MANAGEMENT', label: 'Quản lý đất đai' },
  { value: 'IRRIGATION', label: 'Tưới tiêu' },
  { value: 'WEATHER', label: 'Thời tiết' },
  { value: 'EQUIPMENT', label: 'Thiết bị' },
  { value: 'GENERAL', label: 'Tổng hợp' },
];

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadSuccess }) => {
  const [state, setState] = useState<UploadState>({
    file: null,
    category: 'GENERAL',
    tags: [],
    language: 'vi',
    notes: '',
    uploading: false,
    progress: 0,
    error: null,
    success: false,
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
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      setState(prev => ({
        ...prev,
        error: 'Chỉ hỗ trợ file PDF, DOCX, DOC và TXT',
        file: null,
      }));
      return;
    }

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      setState(prev => ({
        ...prev,
        error: 'Kích thước file không được vượt quá 50MB',
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setState(prev => ({ ...prev, uploading: true, progress: 0, error: null }));

    const formData = new FormData();
    formData.append('file', state.file);
    formData.append('category', state.category);
    formData.append('language', state.language);
    if (state.tags.length > 0) {
      formData.append('tags', JSON.stringify(state.tags));
    }
    if (state.notes) {
      formData.append('notes', state.notes);
    }

    try {
      const response = await fetch('/api/admin/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();

      setState(prev => ({
        ...prev,
        uploading: false,
        success: true,
        progress: 100,
      }));

      // Reset form after 2 seconds
      setTimeout(() => {
        setState({
          file: null,
          category: 'GENERAL',
          tags: [],
          language: 'vi',
          notes: '',
          uploading: false,
          progress: 0,
          error: null,
          success: false,
        });
        onUploadSuccess?.();
      }, 2000);

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        uploading: false,
        error: error.message || 'Có lỗi xảy ra khi upload tài liệu',
      }));
    }
  };

  const handleReset = () => {
    setState({
      file: null,
      category: 'GENERAL',
      tags: [],
      language: 'vi',
      notes: '',
      uploading: false,
      progress: 0,
      error: null,
      success: false,
    });
    setTagInput('');
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Tài liệu
        </CardTitle>
        <CardDescription>
          Upload tài liệu nông nghiệp (PDF, DOCX, DOC, TXT - tối đa 50MB)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {state.file ? (
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <File className="h-8 w-8 text-green-600" />
                <div className="text-left">
                  <p className="font-medium">{state.file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(state.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                disabled={state.uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">
                Kéo thả file vào đây hoặc click để chọn
              </p>
              <p className="text-sm text-gray-500 mb-4">
                PDF, DOCX, DOC, TXT (tối đa 50MB)
              </p>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileChange}
                disabled={state.uploading}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={state.uploading}
              >
                Chọn file
              </Button>
            </>
          )}
        </div>

        {/* Category Selection */}
        <div className="space-y-2">
          <Label htmlFor="category">Danh mục</Label>
          <select
            id="category"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={state.category}
            onChange={(e) => setState(prev => ({ ...prev, category: e.target.value as DocumentCategory }))}
            disabled={state.uploading}
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tags Input */}
        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <div className="flex gap-2">
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              placeholder="Nhập tag và nhấn Enter"
              disabled={state.uploading}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddTag}
              disabled={state.uploading}
            >
              Thêm
            </Button>
          </div>
          {state.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {state.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-full text-sm"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-green-600"
                    disabled={state.uploading}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Ghi chú (tùy chọn)</Label>
          <textarea
            id="notes"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={state.notes}
            onChange={(e) => setState(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Thêm ghi chú về tài liệu..."
            disabled={state.uploading}
          />
        </div>

        {/* Error/Success Messages */}
        {state.error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{state.error}</p>
          </div>
        )}

        {state.success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">Tài liệu đã được upload thành công!</p>
          </div>
        )}

        {/* Upload Progress */}
        {state.uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Đang xử lý...</span>
              <span>{state.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${state.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            className="flex-1"
            onClick={handleUpload}
            disabled={!state.file || state.uploading}
          >
            {state.uploading ? 'Đang upload...' : 'Upload tài liệu'}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={state.uploading}
          >
            Hủy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

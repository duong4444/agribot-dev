"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface InstallationRequest {
  id: string;
  notes: string;
  contactPhone?: string;
  area: {
    id: string;
    name: string;
  };
}

interface EditInstallationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: InstallationRequest | null;
}

export function EditInstallationRequestModal({
  isOpen,
  onClose,
  onSuccess,
  request,
}: EditInstallationRequestModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    notes: '',
    contactPhone: '',
  });

  useEffect(() => {
    if (isOpen && request) {
      setFormData({
        notes: request.notes || '',
        contactPhone: request.contactPhone || '',
      });
    }
  }, [isOpen, request]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!request) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/installation-requests/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to update request');

      onSuccess();
    } catch (error) {
      console.error(error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật yêu cầu lắp đặt",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Chỉnh Sửa Yêu Cầu Lắp Đặt</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Khu vực</Label>
            <div className="p-2 border rounded-md bg-muted text-muted-foreground">
              {request?.area.name}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Số điện thoại liên hệ</Label>
            <Input
              id="contactPhone"
              type="tel"
              placeholder="0912345678"
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              placeholder="Thông tin bổ sung (tùy chọn)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu Thay Đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

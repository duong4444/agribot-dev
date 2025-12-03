"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Area {
  id: string;
  name: string;
  type: string;
}

interface CreateInstallationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateInstallationRequestModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateInstallationRequestModalProps) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    areaId: '',
    notes: '',
    contactPhone: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchAreas();
      // Reset form
      setFormData({
        areaId: '',
        notes: '',
        contactPhone: '',
      });
    }
  }, [isOpen]);

  const fetchAreas = async () => {
    try {
      setLoadingAreas(true);
      const res = await fetch('/api/farms/areas?excludeWithDevices=true');
      if (!res.ok) throw new Error('Failed to fetch areas');
      const data = await res.json();
      setAreas(data);
    } catch (error) {
      console.error(error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách khu vực",
        variant: "destructive",
      });
    } finally {
      setLoadingAreas(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.areaId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn khu vực",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/installation-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to create request');

      onSuccess();
    } catch (error) {
      console.error(error);
      toast({
        title: "Lỗi",
        description: "Không thể tạo yêu cầu lắp đặt",
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
          <DialogTitle>Yêu Cầu Lắp Đặt Thiết Bị IoT</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="areaId">Khu vực *</Label>
            {loadingAreas ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <Select
                value={formData.areaId}
                onValueChange={(value) => setFormData({ ...formData, areaId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn khu vực" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name} {area.type && `(${area.type})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
              Gửi Yêu Cầu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

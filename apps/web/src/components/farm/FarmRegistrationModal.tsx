"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

const farmSchema = z.object({
  name: z.string().min(3, 'Tên nông trại phải có ít nhất 3 ký tự'),
  address: z.string().optional(),
  description: z.string().optional(),
});

type FarmFormData = z.infer<typeof farmSchema>;

interface FarmRegistrationModalProps {
  isOpen: boolean;
  onSuccess: (farm: any) => void;
}

export const FarmRegistrationModal: React.FC<FarmRegistrationModalProps> = ({
  isOpen,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FarmFormData>({
    resolver: zodResolver(farmSchema),
  });

  const onSubmit = async (data: FarmFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create farm');
      }

      const newFarm = await response.json();
      toast({
        title: 'Thành công',
        description: 'Đã tạo nông trại thành công!',
      });
      onSuccess(newFarm);
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo nông trại. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Chào mừng đến với AgriBot!</DialogTitle>
          <DialogDescription>
            Để bắt đầu, vui lòng cung cấp thông tin về nông trại của bạn.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Tên nông trại *</Label>
              <Input id="name" {...register('name')} placeholder="Ví dụ: Nông trại Xanh" />
              {errors.name && (
                <span className="text-sm text-red-500">{errors.name.message}</span>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Địa chỉ</Label>
              <Input id="address" {...register('address')} placeholder="Ví dụ: Đà Lạt, Lâm Đồng" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Mô tả ngắn về nông trại của bạn..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Đang tạo...' : 'Tạo Nông Trại'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

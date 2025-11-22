"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

const areaSchema = z.object({
  name: z.string().min(1, 'Tên khu vực là bắt buộc'),
  type: z.string().optional(),
  crop: z.string().optional(),
  description: z.string().optional(),
});

type AreaFormData = z.infer<typeof areaSchema>;

interface EditAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (area: any) => void;
  area: any;
}

export const EditAreaModal: React.FC<EditAreaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  area,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AreaFormData>({
    resolver: zodResolver(areaSchema),
    values: {
      name: area?.name || '',
      type: area?.type || '',
      crop: area?.crop || '',
      description: area?.description || '',
    },
  });

  const onSubmit = async (data: AreaFormData) => {
    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/farms/areas/${area.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update area');
      }

      const result = await response.json();

      toast({
        title: 'Đã cập nhật khu vực',
        description: 'Thông tin khu vực đã được cập nhật thành công',
      });

      onSuccess(result);
      onClose();
    } catch (error) {
      console.error('Error updating area:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật khu vực',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa khu vực</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin khu vực của bạn
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên khu vực *</FormLabel>
                  <FormControl>
                    <Input placeholder="VD: Khu A, Vườn cam..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại khu vực</FormLabel>
                    <FormControl>
                      <Input placeholder="VD: Nhà kính" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="crop"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cây trồng</FormLabel>
                    <FormControl>
                      <Input placeholder="VD: Cam sành" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Mô tả chi tiết về khu vực..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Đang lưu...' : 'Cập nhật'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

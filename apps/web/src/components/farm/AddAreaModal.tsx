"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

const areaSchema = z.object({
  name: z.string()
    .min(1, 'Tên khu vực là bắt buộc')
    .regex(/^(Khu [A-Z]|Khu \d+)$/, 'Tên khu vực phải theo định dạng "Khu [Chữ cái]" (VD: Khu A) hoặc "Khu [Số]" (VD: Khu 1) để tối ưu hóa cho AI nhận diện.'),
  type: z.string().optional(),
  crop: z.string().optional(),
  description: z.string().optional(),
});

type AreaFormData = z.infer<typeof areaSchema>;

interface AddAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (area: any) => void;
}

export const AddAreaModal: React.FC<AddAreaModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<AreaFormData>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      name: '',
      type: '',
      crop: '',
      description: '',
    },
  });

  const onSubmit = async (data: AreaFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/farms/areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create area');
      }

      const newArea = await response.json();
      
      toast({
        title: 'Thành công!',
        description: 'Khu vực đã được thêm.',
      });

      form.reset();
      onSuccess(newArea);
      onClose();
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể thêm khu vực. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Thêm khu vực mới</DialogTitle>
          <DialogDescription>
            Tạo một khu vực canh tác mới trong nông trại của bạn.
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
                    <Input placeholder="Ví dụ: Khu A, Khu 1" {...field} />
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
                      <Input placeholder="VD: Vườn cà chua,Vườn bưởi da xanh" {...field} />
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
                      <Input placeholder="VD: Lúa ST25" {...field} />
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
                      placeholder="Mô tả chi tiết về khu vực này..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Đang thêm...' : 'Thêm khu vực'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

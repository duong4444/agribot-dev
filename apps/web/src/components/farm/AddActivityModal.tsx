"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const activitySchema = z.object({
  type: z.enum(['seeding', 'fertilize', 'pesticide', 'harvest', 'watering', 'other']),
  date: z.date(),
  description: z.string().optional(),
  cost: z.string().optional(),
  revenue: z.string().optional(),
  areaId: z.string().optional(),
  cropName: z.string().optional(),
});

type ActivityFormData = z.infer<typeof activitySchema>;

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (activity: any) => void;
  editActivity?: any;
}

const activityTypes = [
  { value: 'seeding', label: 'Gieo trồng' },
  { value: 'fertilize', label: 'Bón phân' },
  { value: 'pesticide', label: 'Phun thuốc' },
  { value: 'harvest', label: 'Thu hoạch' },
  { value: 'watering', label: 'Tưới nước' },
  { value: 'other', label: 'Khác' },
];

export const AddActivityModal: React.FC<AddActivityModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editActivity,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [areas, setAreas] = useState<any[]>([]);

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      type: editActivity?.type || 'seeding',
      date: editActivity?.date ? new Date(editActivity.date) : new Date(),
      description: editActivity?.description || '',
      cost: editActivity?.cost?.toString() || '',
      revenue: editActivity?.revenue?.toString() || '',
      areaId: editActivity?.areaId || '',
      cropName: editActivity?.cropName || '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      // Fetch areas
      fetch('/api/farms/areas')
        .then(res => res.json())
        .then(data => setAreas(data))
        .catch(console.error);
    }
  }, [isOpen]);

  // Get unique crops from areas
  const availableCrops = Array.from(new Set(areas.map(a => a.crop).filter(Boolean)));

  // Auto-fill crop when area is selected
  const selectedAreaId = form.watch('areaId');
  useEffect(() => {
    if (selectedAreaId) {
      const selectedArea = areas.find(a => a.id === selectedAreaId);
      if (selectedArea?.crop) {
        form.setValue('cropName', selectedArea.crop);
      }
    }
  }, [selectedAreaId, areas, form]);

  const onSubmit = async (data: ActivityFormData) => {
    try {
      setIsSubmitting(true);

      const payload = {
        type: data.type.toUpperCase(),
        date: format(data.date, 'yyyy-MM-dd'),
        description: data.description || null,
        cost: data.cost ? parseFloat(data.cost) : null,
        revenue: data.revenue ? parseFloat(data.revenue) : null,
        areaId: data.areaId || null,
        cropName: data.cropName || null,
      };

      const url = editActivity 
        ? `/api/farms/activities/${editActivity.id}`
        : '/api/farms/activities';
      
      const method = editActivity ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save activity');
      }

      const result = await response.json();

      toast({
        title: editActivity ? 'Đã cập nhật hoạt động' : 'Đã thêm hoạt động',
        description: 'Hoạt động đã được lưu thành công',
      });

      onSuccess(result);
      onClose();
      form.reset();
    } catch (error) {
      console.error('Error saving activity:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu hoạt động',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editActivity ? 'Chỉnh sửa hoạt động' : 'Thêm hoạt động mới'}</DialogTitle>
          <DialogDescription>
            Ghi nhận các hoạt động canh tác như gieo trồng, bón phân, thu hoạch...
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại hoạt động *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại hoạt động" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activityTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Ngày thực hiện *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Chọn ngày</span>
                          )}
                          <Calendar className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="areaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Khu vực</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn khu vực" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {areas.map(area => (
                          <SelectItem key={area.id} value={area.id}>
                            {area.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cropName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cây trồng</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn cây trồng" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableCrops.map((crop: any) => (
                          <SelectItem key={crop} value={crop}>
                            {crop}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chi phí (VNĐ)</FormLabel>
                    <FormControl>
                      <Input 
                        type="text"
                        placeholder="VD: 1.000.000"
                        value={field.value ? parseFloat(field.value).toLocaleString('vi-VN') : ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\./g, '');
                          if (value === '' || /^\d+$/.test(value)) {
                            field.onChange(value);
                          }
                        }}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="revenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doanh thu (VNĐ)</FormLabel>
                    <FormControl>
                      <Input 
                        type="text"
                        placeholder="VD: 3.600.000"
                        value={field.value ? parseFloat(field.value).toLocaleString('vi-VN') : ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\./g, '');
                          if (value === '' || /^\d+$/.test(value)) {
                            field.onChange(value);
                          }
                        }}
                        onBlur={field.onBlur}
                      />
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
                      placeholder="Ghi chú thêm về hoạt động..."
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
                {isSubmitting ? 'Đang lưu...' : editActivity ? 'Cập nhật' : 'Thêm hoạt động'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

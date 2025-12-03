"use client";

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

interface Activity {
  id: string;
  type: string;
  date: string;
  description?: string;
  cost?: number;
  revenue?: number;
  area?: { name: string };
  cropName?: string;
}

interface ActivityListProps {
  activities: Activity[];
  onEdit: (activity: Activity) => void;
  onDelete: (activityId: string) => void;
  isLoading?: boolean;
}

const activityLabels: Record<string, string> = {
  seeding: 'Gieo trồng',
  fertilize: 'Bón phân',
  pesticide: 'Phun thuốc',
  harvest: 'Thu hoạch',
  watering: 'Tưới nước',
  other: 'Khác',
};

const activityColors: Record<string, string> = {
  seeding: 'bg-green-100 text-green-800',
 fertilize: 'bg-blue-100 text-blue-800',
  pesticide: 'bg-yellow-100 text-yellow-800',
  harvest: 'bg-purple-100 text-purple-800',
  watering: 'bg-cyan-100 text-cyan-800',
  other: 'bg-gray-100 text-gray-800',
};

export const ActivityList: React.FC<ActivityListProps> = ({
  activities,
  onEdit,
  onDelete,
  isLoading,
}) => {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/farms/activities/${deleteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete activity');
      }

      toast({
        title: 'Đã xóa hoạt động',
        description: 'Hoạt động đã được xóa thành công',
      });

      onDelete(deleteId);
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa hoạt động',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Đang tải...</span>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chưa có hoạt động nào. Nhấn "Thêm hoạt động" để bắt đầu ghi chép.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ngày</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Khu vực</TableHead>
            <TableHead>Cây trồng</TableHead>
            <TableHead className="text-right">Chi phí</TableHead>
            <TableHead className="text-right">Doanh thu</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((activity) => (
            <TableRow key={activity.id}>
              <TableCell>{format(new Date(activity.date), 'dd/MM/yyyy')}</TableCell>
              <TableCell>
                <Badge className={activityColors[activity.type?.toLowerCase()] || activityColors.other}>
                  {activityLabels[activity.type?.toLowerCase()] || activity.type}
                </Badge>
              </TableCell>
              <TableCell>{activity.area?.name || '-'}</TableCell>
              <TableCell>{activity.cropName || '-'}</TableCell>
              <TableCell className="text-right">
                {activity.cost ? parseFloat(activity.cost.toString()).toLocaleString('vi-VN') : '-'}
              </TableCell>
              <TableCell className="text-right">
                {activity.revenue ? parseFloat(activity.revenue.toString()).toLocaleString('vi-VN') : '-'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(activity)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(activity.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa hoạt động này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

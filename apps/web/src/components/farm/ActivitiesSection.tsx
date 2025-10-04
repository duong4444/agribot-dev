"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Activity } from 'lucide-react';
import { FarmData, NewActivityData, ActivityData } from './types';

interface ActivitiesSectionProps {
  selectedFarm: FarmData;
  newActivity: NewActivityData;
  setNewActivity: (activity: NewActivityData) => void;
  showCreateActivity: boolean;
  setShowCreateActivity: (show: boolean) => void;
  onCreateActivity: () => void;
  editingActivity: ActivityData | null;
  setEditingActivity: (activity: ActivityData | null) => void;
  onEditActivity: (id: string, data: Partial<ActivityData>) => void;
  onDeleteActivity: (id: string) => void;
  onUpdateActivityStatus: (id: string, status: string) => void;
}

export const ActivitiesSection: React.FC<ActivitiesSectionProps> = ({
  selectedFarm,
  newActivity,
  setNewActivity,
  showCreateActivity,
  setShowCreateActivity,
  onCreateActivity,
  editingActivity,
  setEditingActivity,
  onEditActivity,
  onDeleteActivity,
  onUpdateActivityStatus,
}) => {
  return (
    <>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Hoạt Động</h3>
        <Dialog open={showCreateActivity} onOpenChange={setShowCreateActivity}>
          <DialogTrigger asChild>
            <Button className="bg-agri-green-600 hover:bg-agri-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Thêm Hoạt Động
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Thêm Hoạt Động Mới</DialogTitle>
              <DialogDescription>
                Ghi nhận hoạt động nông nghiệp
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="activity-title">Tiêu Đề *</Label>
                <Input
                  id="activity-title"
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                  placeholder="VD: Bón phân cho cà chua"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="activity-description">Mô Tả</Label>
                <Textarea
                  id="activity-description"
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  placeholder="Mô tả chi tiết hoạt động..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="activity-type">Loại Hoạt Động</Label>
                <Select 
                  value={newActivity.type} 
                  onValueChange={(value: string) => setNewActivity({ ...newActivity, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANTING">Gieo Trồng</SelectItem>
                    <SelectItem value="WATERING">Tưới Nước</SelectItem>
                    <SelectItem value="FERTILIZING">Bón Phân</SelectItem>
                    <SelectItem value="PEST_CONTROL">Phòng Trừ Sâu Bệnh</SelectItem>
                    <SelectItem value="PRUNING">Cắt Tỉa</SelectItem>
                    <SelectItem value="HARVESTING">Thu Hoạch</SelectItem>
                    <SelectItem value="SOIL_PREPARATION">Chuẩn Bị Đất</SelectItem>
                    <SelectItem value="WEEDING">Làm Cỏ</SelectItem>
                    <SelectItem value="OTHER">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="scheduled-date">Ngày Dự Kiến</Label>
                  <Input
                    id="scheduled-date"
                    type="date"
                    value={newActivity.scheduledDate}
                    onChange={(e) => setNewActivity({ ...newActivity, scheduledDate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="duration">Thời Gian (phút)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={newActivity.duration}
                    onChange={(e) => setNewActivity({ ...newActivity, duration: e.target.value })}
                    placeholder="60"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cost">Chi Phí (VNĐ)</Label>
                <Input
                  id="cost"
                  type="number"
                  value={newActivity.cost}
                  onChange={(e) => setNewActivity({ ...newActivity, cost: e.target.value })}
                  placeholder="100000"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateActivity(false)}>
                Hủy
              </Button>
              <Button onClick={onCreateActivity} disabled={!newActivity.title || !newActivity.scheduledDate}>
                Thêm Hoạt Động
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {selectedFarm.activities?.map((activity) => (
          <Card key={activity.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-lg font-medium">{activity.title}</h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                    <Badge variant="outline">{activity.type}</Badge>
                    <span>Ngày: {new Date(activity.scheduledDate).toLocaleDateString('vi-VN')}</span>
                    {activity.cost && (
                      <span>Chi phí: {activity.cost.toLocaleString('vi-VN')} VNĐ</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Select 
                    value={activity.status} 
                    onValueChange={(value: string) => onUpdateActivityStatus(activity.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLANNED">Kế hoạch</SelectItem>
                      <SelectItem value="IN_PROGRESS">Đang thực hiện</SelectItem>
                      <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
                      <SelectItem value="CANCELLED">Hủy bỏ</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingActivity(activity)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onDeleteActivity(activity.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )) || []}
      </div>

      {(!selectedFarm.activities || selectedFarm.activities.length === 0) && (
        <Card className="text-center py-12">
          <CardContent>
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Chưa có hoạt động nào
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Hãy ghi nhận hoạt động đầu tiên
            </p>
            <Button
              onClick={() => setShowCreateActivity(true)}
              className="bg-agri-green-600 hover:bg-agri-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm Hoạt Động Đầu Tiên
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
};

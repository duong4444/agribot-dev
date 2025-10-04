"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, MapPin, Calendar, BarChart3, Home } from 'lucide-react';
import { FarmData, NewFarmData } from './types';

interface FarmSelectionProps {
  farms: FarmData[];
  selectedFarm: FarmData | null;
  onSelectFarm: (farm: FarmData) => void;
  newFarm: NewFarmData;
  setNewFarm: (farm: NewFarmData) => void;
  showCreateFarm: boolean;
  setShowCreateFarm: (show: boolean) => void;
  onCreateFarm: () => void;
}

export const FarmSelection: React.FC<FarmSelectionProps> = ({
  farms,
  selectedFarm,
  onSelectFarm,
  newFarm,
  setNewFarm,
  showCreateFarm,
  setShowCreateFarm,
  onCreateFarm,
}) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Chọn Nông Trại</h2>
        <Dialog open={showCreateFarm} onOpenChange={setShowCreateFarm}>
          <DialogTrigger asChild>
            <Button className="bg-agri-green-600 hover:bg-agri-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Tạo Nông Trại Mới
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Tạo Nông Trại Mới</DialogTitle>
              <DialogDescription>
                Thêm thông tin về nông trại của bạn
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên Nông Trại *</Label>
                <Input
                  id="name"
                  value={newFarm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setNewFarm({ ...newFarm, name: e.target.value })
                  }
                  placeholder="VD: Nông trại rau sạch ABC"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={newFarm.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                    setNewFarm({ ...newFarm, description: e.target.value })
                  }
                  placeholder="Mô tả về nông trại..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Địa chỉ</Label>
                <Input
                  id="location"
                  value={newFarm.location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setNewFarm({ ...newFarm, location: e.target.value })
                  }
                  placeholder="VD: Xã ABC, Huyện XYZ, Tỉnh DEF"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="area">Diện tích (m²)</Label>
                <Input
                  id="area"
                  type="number"
                  value={newFarm.area}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setNewFarm({ ...newFarm, area: e.target.value })
                  }
                  placeholder="1000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Loại Nông Trại</Label>
                <Select 
                  value={newFarm.type} 
                  onValueChange={(value: string) => setNewFarm({ ...newFarm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VEGETABLE">Rau Củ</SelectItem>
                    <SelectItem value="FRUIT">Cây Ăn Quả</SelectItem>
                    <SelectItem value="GRAIN">Ngũ Cốc</SelectItem>
                    <SelectItem value="FLOWER">Hoa</SelectItem>
                    <SelectItem value="MIXED">Hỗn Hợp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateFarm(false)}>
                Hủy
              </Button>
              <Button onClick={onCreateFarm} disabled={!newFarm.name}>
                Tạo Nông Trại
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {farms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {farms.map((farm) => (
            <Card
              key={farm.id}
              className={`cursor-pointer transition-all ${
                selectedFarm?.id === farm.id
                  ? 'ring-2 ring-agri-green-500 bg-agri-green-50 dark:bg-agri-green-900/20'
                  : 'hover:shadow-md'
              }`}
              onClick={() => onSelectFarm(farm)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{farm.name}</CardTitle>
                  <Badge variant="secondary">{farm.type}</Badge>
                </div>
                <CardDescription>{farm.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  {farm.location && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {farm.location}
                    </div>
                  )}
                  {farm.area && (
                    <div className="flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      {farm.area} m²
                    </div>
                  )}
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Tạo: {new Date(farm.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Home className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Chưa có nông trại nào
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Hãy tạo nông trại đầu tiên để bắt đầu quản lý
            </p>
            <Button
              onClick={() => setShowCreateFarm(true)}
              className="bg-agri-green-600 hover:bg-agri-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tạo Nông Trại Đầu Tiên
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

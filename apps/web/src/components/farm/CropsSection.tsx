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
import { Label } from '@/components/ui/label';
import { Plus, Eye, Edit, Trash2, Crop } from 'lucide-react';
import { FarmData, NewCropData } from './types';

interface CropsSectionProps {
  selectedFarm: FarmData;
  newCrop: NewCropData;
  setNewCrop: (crop: NewCropData) => void;
  showCreateCrop: boolean;
  setShowCreateCrop: (show: boolean) => void;
  onCreateCrop: () => void;
}

export const CropsSection: React.FC<CropsSectionProps> = ({
  selectedFarm,
  newCrop,
  setNewCrop,
  showCreateCrop,
  setShowCreateCrop,
  onCreateCrop,
}) => {
  return (
    <>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cây Trồng</h3>
        <Dialog open={showCreateCrop} onOpenChange={setShowCreateCrop}>
          <DialogTrigger asChild>
            <Button className="bg-agri-green-600 hover:bg-agri-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Thêm Cây Trồng
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Thêm Cây Trồng Mới</DialogTitle>
              <DialogDescription>
                Thêm thông tin về cây trồng vào nông trại
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="crop-name">Tên Cây Trồng *</Label>
                  <Input
                    id="crop-name"
                    value={newCrop.name}
                    onChange={(e) => setNewCrop({ ...newCrop, name: e.target.value })}
                    placeholder="VD: Cà chua"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="variety">Giống</Label>
                  <Input
                    id="variety"
                    value={newCrop.variety}
                    onChange={(e) => setNewCrop({ ...newCrop, variety: e.target.value })}
                    placeholder="VD: Cherry"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="crop-type">Loại Cây Trồng</Label>
                <Select 
                  value={newCrop.type} 
                  onValueChange={(value: string) => setNewCrop({ ...newCrop, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VEGETABLE">Rau Củ</SelectItem>
                    <SelectItem value="FRUIT">Cây Ăn Quả</SelectItem>
                    <SelectItem value="GRAIN">Ngũ Cốc</SelectItem>
                    <SelectItem value="HERB">Thảo Mộc</SelectItem>
                    <SelectItem value="FLOWER">Hoa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="planted-area">Diện Tích Trồng (m²)</Label>
                  <Input
                    id="planted-area"
                    type="number"
                    value={newCrop.plantedArea}
                    onChange={(e) => setNewCrop({ ...newCrop, plantedArea: e.target.value })}
                    placeholder="100"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="plant-count">Số Lượng Cây</Label>
                  <Input
                    id="plant-count"
                    type="number"
                    value={newCrop.plantCount}
                    onChange={(e) => setNewCrop({ ...newCrop, plantCount: e.target.value })}
                    placeholder="50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="planting-date">Ngày Gieo Trồng</Label>
                  <Input
                    id="planting-date"
                    type="date"
                    value={newCrop.plantingDate}
                    onChange={(e) => setNewCrop({ ...newCrop, plantingDate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="harvest-date">Ngày Thu Hoạch Dự Kiến</Label>
                  <Input
                    id="harvest-date"
                    type="date"
                    value={newCrop.expectedHarvestDate}
                    onChange={(e) => setNewCrop({ ...newCrop, expectedHarvestDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="expected-yield">Sản Lượng Dự Kiến (kg)</Label>
                  <Input
                    id="expected-yield"
                    type="number"
                    value={newCrop.expectedYield}
                    onChange={(e) => setNewCrop({ ...newCrop, expectedYield: e.target.value })}
                    placeholder="500"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="market-price">Giá Thị Trường (VNĐ/kg)</Label>
                  <Input
                    id="market-price"
                    type="number"
                    value={newCrop.marketPrice}
                    onChange={(e) => setNewCrop({ ...newCrop, marketPrice: e.target.value })}
                    placeholder="25000"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateCrop(false)}>
                Hủy
              </Button>
              <Button onClick={onCreateCrop} disabled={!newCrop.name}>
                Thêm Cây Trồng
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedFarm.crops?.map((crop) => (
          <Card key={crop.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{crop.name}</CardTitle>
                <Badge variant="secondary">{crop.type}</Badge>
              </div>
              {crop.variety && (
                <CardDescription>Giống: {crop.variety}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                {crop.plantedArea && (
                  <div>Diện tích: {crop.plantedArea} m²</div>
                )}
                {crop.plantCount && (
                  <div>Số cây: {crop.plantCount}</div>
                )}
                {crop.plantingDate && (
                  <div>Ngày trồng: {new Date(crop.plantingDate).toLocaleDateString('vi-VN')}</div>
                )}
                {crop.expectedHarvestDate && (
                  <div>Thu hoạch: {new Date(crop.expectedHarvestDate).toLocaleDateString('vi-VN')}</div>
                )}
                {crop.actualYield && (
                  <div className="font-medium text-green-600">
                    Sản lượng: {crop.actualYield} kg
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )) || []}
      </div>

      {(!selectedFarm.crops || selectedFarm.crops.length === 0) && (
        <Card className="text-center py-12">
          <CardContent>
            <Crop className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Chưa có cây trồng nào
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Hãy thêm cây trồng đầu tiên vào nông trại
            </p>
            <Button
              onClick={() => setShowCreateCrop(true)}
              className="bg-agri-green-600 hover:bg-agri-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm Cây Trồng Đầu Tiên
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
};

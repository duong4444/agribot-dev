"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Package, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Device {
  id: string;
  serialNumber: string;
  name: string;
  type: string;
  status: string;
  isActive: boolean;
  area?: { id: string; name: string };
  activatedAt?: string;
  createdAt: string;
}

const statusConfig = {
  AVAILABLE: { label: 'Có sẵn', color: 'bg-green-100 text-green-800' },
  ASSIGNED: { label: 'Đã phân công', color: 'bg-blue-100 text-blue-800' },
  ACTIVE: { label: 'Hoạt động', color: 'bg-purple-100 text-purple-800' },
  INACTIVE: { label: 'Ngưng hoạt động', color: 'bg-gray-100 text-gray-800' },
  MAINTENANCE: { label: 'Bảo trì', color: 'bg-yellow-100 text-yellow-800' },
};

export default function DeviceInventoryPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    serialNumber: '',
    name: '',
    type: 'SENSOR_NODE',
  });

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/device-inventory');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDevices(data);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách thiết bị",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/admin/device-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to add device');

      toast({
        title: "Thành công",
        description: "Đã thêm thiết bị vào kho",
      });

      setIsModalOpen(false);
      setFormData({ serialNumber: '', name: '', type: 'SENSOR_NODE' });
      fetchDevices();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể thêm thiết bị",
        variant: "destructive",
      });
    }
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = 
      device.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || device.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Kho Thiết Bị</h2>
          <p className="text-muted-foreground">Quản lý thiết bị IoT trong kho</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm Thiết Bị
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Danh sách thiết bị</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Lọc theo trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  <SelectItem value="AVAILABLE">Có sẵn</SelectItem>
                  <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                  <SelectItem value="INACTIVE">Ngưng hoạt động</SelectItem>
                  <SelectItem value="MAINTENANCE">Bảo trì</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Tên thiết bị</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Khu vực</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Không có thiết bị nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-mono text-sm">{device.serialNumber}</TableCell>
                      <TableCell>{device.name}</TableCell>
                      <TableCell>{device.type}</TableCell>
                      <TableCell>
                        <Badge className={statusConfig[device.status as keyof typeof statusConfig]?.color}>
                          {statusConfig[device.status as keyof typeof statusConfig]?.label || device.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{device.area?.name || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(device.createdAt).toLocaleDateString('vi-VN')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Device Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm Thiết Bị Mới</DialogTitle>
            <DialogDescription>
              Thêm thiết bị IoT vào kho để sẵn sàng lắp đặt
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddDevice} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number *</Label>
              <Input
                id="serialNumber"
                placeholder="ESP32-TEMP-001"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Tên thiết bị *</Label>
              <Input
                id="name"
                placeholder="Temperature Sensor #1"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Loại thiết bị *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SENSOR_NODE">Sensor Node</SelectItem>
                  <SelectItem value="CONTROLLER">Controller</SelectItem>
                  <SelectItem value="GATEWAY">Gateway</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit">
                Thêm Thiết Bị
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

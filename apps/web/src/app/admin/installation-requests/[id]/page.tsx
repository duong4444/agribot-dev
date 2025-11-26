"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, MapPin, User, Package, ArrowLeft, Calendar, UserPlus, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';

interface InstallationRequest {
  id: string;
  farmer: { id: string; fullName: string; email: string; phoneNumber?: string };
  farm: { id: string; name: string; address?: string };
  area: { id: string; name: string; description?: string };
  notes: string;
  contactPhone?: string;
  status: string;
  assignedTechnician?: { id: string; fullName: string; email: string };
  createdAt: string;
  updatedAt: string;
}

interface Technician {
  id: string;
  fullName: string;
  email: string;
}

const statusConfig = {
  PENDING: { label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-800' },
  ASSIGNED: { label: 'Đã phân công', color: 'bg-blue-100 text-blue-800' },
  IN_PROGRESS: { label: 'Đang lắp đặt', color: 'bg-purple-100 text-purple-800' },
  COMPLETED: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Đã hủy', color: 'bg-gray-100 text-gray-800' },
};

export default function AdminRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<InstallationRequest | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (params.id) {
      Promise.all([
        fetchRequestDetail(params.id as string),
        fetchTechnicians()
      ]);
    }
  }, [params.id]);

  const fetchRequestDetail = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/installation-requests/${id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRequest(data);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải chi tiết yêu cầu",
        variant: "destructive",
      });
      router.push('/admin/installation-requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const res = await fetch('/api/admin/users?role=TECHNICIAN');
      if (!res.ok) throw new Error('Failed to fetch technicians');
      const json = await res.json();
      setTechnicians(json.success ? json.data : []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAssignTechnician = async (technicianId: string) => {
    if (!request) return;

    try {
      setAssigning(true);
      const res = await fetch(`/api/admin/installation-requests/${request.id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianId }),
      });

      if (!res.ok) throw new Error('Failed to assign');

      toast({
        title: "Thành công",
        description: "Đã phân công kỹ thuật viên",
      });
      fetchRequestDetail(request.id);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể phân công kỹ thuật viên",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!request) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/installation-requests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">Chi Tiết Yêu Cầu Lắp Đặt</h2>
          <p className="text-muted-foreground">Mã yêu cầu: {request.id}</p>
        </div>
        <Badge className={`text-base px-3 py-1 ${statusConfig[request.status as keyof typeof statusConfig]?.color}`}>
          {statusConfig[request.status as keyof typeof statusConfig]?.label || request.status}
        </Badge>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Device Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Thông tin thiết bị
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Gói thiết bị</p>
              <p className="text-lg font-semibold">Bộ IoT Chuẩn</p>
              <p className="text-sm text-muted-foreground mt-1">
                ESP32 + Cảm biến nhiệt độ, độ ẩm, ánh sáng
              </p>
            </div>
            {request.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Ghi chú</p>
                <div className="bg-muted p-3 rounded-md text-sm">
                  {request.notes}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Farmer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Thông tin nông dân
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Họ tên</p>
              <p className="font-medium">{request.farmer.fullName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-sm">{request.farmer.email}</p>
            </div>
            {request.farmer.phoneNumber && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Số điện thoại (Hồ sơ)</p>
                <p className="text-sm">{request.farmer.phoneNumber}</p>
              </div>
            )}
            {request.contactPhone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Số điện thoại liên hệ</p>
                <p className="text-sm font-semibold text-primary">{request.contactPhone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Địa điểm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Trang trại</p>
              <p className="font-medium">{request.farm.name}</p>
              {request.farm.address && (
                <p className="text-sm text-muted-foreground">{request.farm.address}</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Khu vực</p>
              <p className="font-medium">{request.area.name}</p>
              {request.area.description && (
                <p className="text-sm text-muted-foreground">{request.area.description}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Technician Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Kỹ thuật viên
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {request.status === 'PENDING' ? (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Phân công kỹ thuật viên</p>
                <Select onValueChange={handleAssignTechnician} disabled={assigning}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn kỹ thuật viên" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.fullName} ({tech.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : request.assignedTechnician ? (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Đã phân công cho</p>
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p className="font-medium">{request.assignedTechnician.fullName}</p>
                  <p className="text-sm text-muted-foreground">{request.assignedTechnician.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa phân công</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Lịch sử
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ngày tạo yêu cầu:</span>
            <span className="font-medium">{new Date(request.createdAt).toLocaleString('vi-VN')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cập nhật lần cuối:</span>
            <span className="font-medium">{new Date(request.updatedAt).toLocaleString('vi-VN')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

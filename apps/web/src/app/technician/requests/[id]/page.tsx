"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, User, Package, Play, CheckCircle2, ArrowLeft, Calendar, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';

interface InstallationRequest {
  id: string;
  farmer: { id: string; fullName: string; email: string; phoneNumber?: string };
  farm: { id: string; name: string; address?: string };
  area: { id: string; name: string; description?: string };
  notes: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const statusConfig = {
  ASSIGNED: { label: 'Đã phân công', color: 'bg-blue-100 text-blue-800', icon: Package },
  IN_PROGRESS: { label: 'Đang lắp đặt', color: 'bg-purple-100 text-purple-800', icon: Play },
  COMPLETED: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
};

export default function TechnicianRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<InstallationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (params.id) {
      fetchRequestDetail(params.id as string);
    }
  }, [params.id]);

  const fetchRequestDetail = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/technician/requests/${id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRequest(data);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải chi tiết yêu cầu",
        variant: "destructive",
      });
      router.push('/technician/requests');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!request) return;

    try {
      const res = await fetch(`/api/technician/requests/${request.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update');

      toast({
        title: "Thành công",
        description: "Đã cập nhật trạng thái",
      });
      fetchRequestDetail(request.id);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái",
        variant: "destructive",
      });
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

  const StatusIcon = statusConfig[request.status as keyof typeof statusConfig]?.icon || Package;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/technician/requests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chi Tiết Yêu Cầu</h2>
          <p className="text-muted-foreground">Mã yêu cầu: {request.id}</p>
        </div>
        <div className="ml-auto">
          <Badge className={`text-base px-3 py-1 ${statusConfig[request.status as keyof typeof statusConfig]?.color}`}>
            <StatusIcon className="mr-2 h-4 w-4" />
            {statusConfig[request.status as keyof typeof statusConfig]?.label || request.status}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6">
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
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Ghi chú từ nông dân</p>
              <div className="bg-muted p-3 rounded-md text-sm">
                {request.notes || "Không có ghi chú"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location & Farmer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Địa điểm & Liên hệ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Trang trại</p>
                <p className="font-medium">{request.farm.name}</p>
                {request.farm.address && (
                  <p className="text-sm text-muted-foreground">{request.farm.address}</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Khu vực lắp đặt</p>
                <p className="font-medium">{request.area.name}</p>
                {request.area.description && (
                  <p className="text-sm text-muted-foreground">{request.area.description}</p>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{request.farmer.fullName}</p>
                  <p className="text-sm text-muted-foreground">{request.farmer.email}</p>
                  {request.farmer.phoneNumber && (
                    <p className="text-sm text-muted-foreground">{request.farmer.phoneNumber}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Thời gian
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

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {request.status === 'ASSIGNED' && (
            <Button 
              size="lg" 
              className="w-full"
              onClick={() => handleUpdateStatus('IN_PROGRESS')}
            >
              <Play className="mr-2 h-5 w-5" />
              Bắt đầu lắp đặt
            </Button>
          )}
          
          {request.status === 'IN_PROGRESS' && (
            <div className="space-y-3">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">⚠️ Lưu ý quan trọng:</p>
                <p>Vui lòng đảm bảo đã <strong>Kích hoạt thiết bị</strong> trước khi hoàn thành yêu cầu.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Link href="/technician/activate" className="w-full">
                  <Button variant="outline" size="lg" className="w-full">
                    <Package className="mr-2 h-5 w-5" />
                    Kích hoạt thiết bị
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={() => handleUpdateStatus('COMPLETED')}
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Hoàn thành
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

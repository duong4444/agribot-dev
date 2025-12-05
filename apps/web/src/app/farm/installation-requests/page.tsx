"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { CreateInstallationRequestModal } from '@/components/iot/CreateInstallationRequestModal';
import { EditInstallationRequestModal } from '@/components/iot/EditInstallationRequestModal';

interface InstallationRequest {
  id: string;
  notes: string;
  contactPhone?: string;
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  area: {
    id: string;
    name: string;
  };
  assignedTechnician?: {
    id: string;
    fullName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

const statusConfig = {
  PENDING: { label: 'Chờ xử lý', icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  ASSIGNED: { label: 'Đã phân công', icon: Package, color: 'bg-blue-100 text-blue-800 border-blue-300' },
  IN_PROGRESS: { label: 'Đang lắp đặt', icon: AlertCircle, color: 'bg-purple-100 text-purple-800 border-purple-300' },
  COMPLETED: { label: 'Hoàn thành', icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-300' },
  CANCELLED: { label: 'Đã hủy', icon: XCircle, color: 'bg-gray-100 text-gray-800 border-gray-300' },
};

export default function InstallationRequestsPage() {
  const [requests, setRequests] = useState<InstallationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<InstallationRequest | null>(null);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/installation-requests');
      if (!res.ok) throw new Error('Failed to fetch requests');
      const data = await res.json();
      setRequests(data);
    } catch (error) {
      console.error(error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách yêu cầu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRequestCreated = () => {
    setIsModalOpen(false);
    fetchRequests();
    toast({
      title: "Thành công",
      description: "Yêu cầu lắp đặt đã được tạo",
    });
  };


  const handleEditRequest = (request: InstallationRequest) => {
    setSelectedRequest(request);
    setIsEditModalOpen(true);
  };

  const handleRequestUpdated = () => {
    setIsEditModalOpen(false);
    fetchRequests();
    toast({
      title: "Thành công",
      description: "Đã cập nhật yêu cầu lắp đặt",
    });
  };

  const handleCancelRequest = async (id: string) => {
    if (!confirm('Bạn có chắc muốn hủy yêu cầu này?')) return;

    try {
      const res = await fetch(`/api/installation-requests/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to cancel request');

      toast({
        title: "Thành công",
        description: "Đã hủy yêu cầu lắp đặt",
      });
      fetchRequests();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể hủy yêu cầu",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Yêu Cầu Lắp Đặt Thiết Bị</h2>
          <p className="text-muted-foreground">Quản lý yêu cầu lắp đặt thiết bị IoT cho nông trại</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yêu Cầu Lắp Đặt Mới
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              Chưa có yêu cầu lắp đặt nào
            </p>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Tạo Yêu Cầu Đầu Tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => {
            const StatusIcon = statusConfig[request.status].icon;
            return (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Yêu cầu lắp đặt thiết bị IoT
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Khu vực: <span className="font-medium">{request.area.name}</span>
                      </CardDescription>
                    </div>
                    <Badge className={statusConfig[request.status].color}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {statusConfig[request.status].label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {request.notes && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Ghi chú:</span> {request.notes}
                      </p>
                    )}
                    {request.assignedTechnician && (
                      <p className="text-sm">
                        <span className="font-medium">Kỹ thuật viên:</span>{' '}
                        {request.assignedTechnician.fullName}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-muted-foreground">
                        Tạo lúc: {new Date(request.createdAt).toLocaleString('vi-VN')}
                      </p>
                      {request.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRequest(request)}
                          >
                            Chỉnh sửa
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelRequest(request.id)}
                          >
                            Hủy Yêu Cầu
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}


      <CreateInstallationRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRequestCreated}
      />
      
      <EditInstallationRequestModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleRequestUpdated}
        request={selectedRequest}
      />
    </div>
  );
}

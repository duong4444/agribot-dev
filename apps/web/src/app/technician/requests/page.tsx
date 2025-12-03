"use client";

import React, { useEffect, useState } from 'react';
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
import { Loader2, MapPin, User, Package, Play, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface InstallationRequest {
  id: string;
  farmer: { id: string; fullName: string; email: string };
  farm: { id: string; name: string };
  area: { id: string; name: string };
  notes: string;
  status: string;
  createdAt: string;
}

const statusConfig = {
  ASSIGNED: { label: 'Đã phân công', color: 'bg-blue-100 text-blue-800', icon: Package },
  IN_PROGRESS: { label: 'Đang lắp đặt', color: 'bg-purple-100 text-purple-800', icon: Play },
  COMPLETED: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
};

export default function TechnicianRequestsPage() {
  const [requests, setRequests] = useState<InstallationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [confirmingRequestId, setConfirmingRequestId] = useState<string | null>(null);
  const [startingRequestId, setStartingRequestId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/technician/requests');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRequests(data);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách yêu cầu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/technician/requests/${requestId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update');

      toast({
        title: "Thành công",
        description: "Đã cập nhật trạng thái",
      });
      fetchRequests();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái",
        variant: "destructive",
      });
    }
  };

  const filteredRequests = requests.filter(req => 
    filterStatus === 'ALL' || req.status === filterStatus
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Yêu Cầu Lắp Đặt</h2>
          <p className="text-muted-foreground">Quản lý các yêu cầu được phân công</p>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Lọc theo trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            <SelectItem value="ASSIGNED">Đã phân công</SelectItem>
            <SelectItem value="IN_PROGRESS">Đang lắp đặt</SelectItem>
            <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {filterStatus === 'ALL' 
                ? 'Chưa có yêu cầu nào được phân công'
                : `Không có yêu cầu với trạng thái ${statusConfig[filterStatus as keyof typeof statusConfig]?.label || filterStatus}`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request) => {
            const StatusIcon = statusConfig[request.status as keyof typeof statusConfig]?.icon || Package;
            
            return (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Yêu cầu lắp đặt thiết bị IoT
                      </CardTitle>
                    </div>
                    <Badge className={statusConfig[request.status as keyof typeof statusConfig]?.color}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {statusConfig[request.status as keyof typeof statusConfig]?.label || request.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Location Info */}
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{request.farm.name}</span>
                        <span className="text-muted-foreground">→</span>
                        <span>{request.area.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Nông dân:</span>
                        <span>{request.farmer.fullName}</span>
                        <span className="text-muted-foreground">({request.farmer.email})</span>
                      </div>
                    </div>

                    {/* Notes */}
                    {request.notes && (
                      <div className="text-sm text-muted-foreground border-l-2 pl-3">
                        <span className="font-medium">Ghi chú:</span> {request.notes}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      {request.status === 'ASSIGNED' && (
                        <Button
                          size="sm"
                          onClick={() => setStartingRequestId(request.id)}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Bắt đầu lắp đặt
                        </Button>
                      )}
                      {request.status === 'IN_PROGRESS' && (
                        <Button
                          size="sm"
                          onClick={() => setConfirmingRequestId(request.id)}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Hoàn thành
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground ml-auto">
                        Tạo lúc: {new Date(request.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Start Installation Confirmation Dialog */}
      <AlertDialog open={!!startingRequestId} onOpenChange={(open) => !open && setStartingRequestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận bắt đầu lắp đặt</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                Bạn có chắc chắn muốn bắt đầu lắp đặt thiết bị cho yêu cầu này?
                <br /><br />
                Sau khi bắt đầu, trạng thái sẽ chuyển sang <strong>Đang lắp đặt</strong>.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (startingRequestId) {
                  handleUpdateStatus(startingRequestId, 'IN_PROGRESS');
                  setStartingRequestId(null);
                }
              }}
            >
              Bắt đầu lắp đặt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Completion Confirmation Dialog */}
      <AlertDialog open={!!confirmingRequestId} onOpenChange={(open) => !open && setConfirmingRequestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hoàn thành</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                Bạn có chắc chắn muốn đánh dấu yêu cầu lắp đặt này là <strong>Hoàn thành</strong>?
                <br /><br />
                Hãy đảm bảo rằng:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Thiết bị đã được lắp đặt đúng vị trí</li>
                  <li>Thiết bị đã được kích hoạt thành công</li>
                  <li>Đã kiểm tra kết nối và dữ liệu cảm biến</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmingRequestId) {
                  handleUpdateStatus(confirmingRequestId, 'COMPLETED');
                  setConfirmingRequestId(null);
                }
              }}
            >
              Xác nhận hoàn thành
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

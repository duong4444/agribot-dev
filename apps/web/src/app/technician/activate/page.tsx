"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CheckCircle, Package } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface InstallationRequest {
  id: string;
  area: { id: string; name: string };
  farm: { name: string };
  status: string;
}

interface ActivatedDevice {
  id: string;
  serialNumber: string;
  name: string;
  status: string;
  area?: { name: string };
  activatedAt: string;
}

export default function ActivateDevicePage() {
  const [requests, setRequests] = useState<InstallationRequest[]>([]);
  const [recentDevices, setRecentDevices] = useState<ActivatedDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    serialNumber: '',
    installationRequestId: '',
    areaId: '',
  });

  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/technician/requests');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      
      // Only show IN_PROGRESS requests
      const inProgress = data.filter((r: InstallationRequest) => r.status === 'IN_PROGRESS');
      setRequests(inProgress);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestChange = (requestId: string) => {
    const selected = requests.find(r => r.id === requestId);
    if (selected) {
      setFormData({
        ...formData,
        installationRequestId: requestId,
        areaId: selected.area.id,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.serialNumber || !formData.installationRequestId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin",
        variant: "destructive",
      });
      return;
    }

    if (!isPaid) {
      toast({
        title: "Lỗi",
        description: "Vui lòng xác nhận đã thu tiền phần cứng từ khách hàng",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/technician/devices/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, isPaid }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to activate');
      }

      const device = await res.json();
      
      toast({
        title: "Thành công!",
        description: `Thiết bị ${device.serialNumber} đã được kích hoạt`,
      });

      // Add to recent devices
      setRecentDevices([device, ...recentDevices.slice(0, 4)]);

      // Reset form
      setFormData({
        serialNumber: '',
        installationRequestId: '',
        areaId: '',
      });
      setIsPaid(false);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể kích hoạt thiết bị",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Kích Hoạt Thiết Bị</h2>
        <p className="text-muted-foreground">Kích hoạt thiết bị sau khi lắp đặt hoàn tất</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Activation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin thiết bị</CardTitle>
            <CardDescription>Nhập thông tin để kích hoạt thiết bị</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number *</Label>
                <Input
                  id="serialNumber"
                  placeholder="ESP32-XXXX-XXX"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Nhập serial number từ thiết bị (in trên nhãn)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="request">Yêu cầu lắp đặt *</Label>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <Select
                    value={formData.installationRequestId}
                    onValueChange={handleRequestChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn yêu cầu" />
                    </SelectTrigger>
                    <SelectContent>
                      {requests.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          Không có yêu cầu đang thực hiện
                        </div>
                      ) : (
                        requests.map((req) => (
                          <SelectItem key={req.id} value={req.id}>
                            {req.farm.name} - {req.area.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {formData.areaId && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium">Khu vực sẽ được gán:</p>
                  <p className="text-muted-foreground">
                    {requests.find(r => r.id === formData.installationRequestId)?.area.name}
                  </p>
                </div>
              )}

              <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-gray-300"
                  />
                  <div>
                    <span className="font-medium text-yellow-900 dark:text-yellow-100">
                      Đã thu tiền phần cứng từ khách hàng
                    </span>
                    <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-1">
                      Xác nhận rằng bạn đã nhận thanh toán cho thiết bị trước khi kích hoạt
                    </p>
                  </div>
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kích hoạt thiết bị
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Activations */}
        <Card>
          <CardHeader>
            <CardTitle>Thiết bị vừa kích hoạt</CardTitle>
            <CardDescription>Danh sách thiết bị đã kích hoạt gần đây</CardDescription>
          </CardHeader>
          <CardContent>
            {recentDevices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Chưa có thiết bị nào được kích hoạt</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDevices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{device.serialNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {device.area?.name || 'N/A'}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(device.activatedAt).toLocaleTimeString('vi-VN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Loader2, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InstallationRequest {
  id: string;
  status: string;
  farmer: { id: string; fullName: string; email: string };
  area: { id: string; name: string };
  farm: { id: string; name: string };
  assignedTechnician?: { id: string; fullName: string };
  createdAt: string;
  notes: string;
}

interface Technician {
  id: string;
  fullName: string;
  email: string;
}

export default function AdminInstallationRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<InstallationRequest[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/admin/installation-requests');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRequests(data);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách yêu cầu",
        variant: "destructive",
      });
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

  useEffect(() => {
    Promise.all([fetchRequests(), fetchTechnicians()]).finally(() => setLoading(false));
  }, []);

  const handleAssignTechnician = async (requestId: string, technicianId: string) => {
    try {
      const res = await fetch(`/api/admin/installation-requests/${requestId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianId }),
      });

      if (!res.ok) throw new Error('Failed to assign');

      toast({
        title: "Thành công",
        description: "Đã phân công kỹ thuật viên",
      });
      fetchRequests();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể phân công kỹ thuật viên",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/admin/installation-requests/${deleteId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');

      toast({
        title: "Thành công",
        description: "Đã xoá yêu cầu",
      });
      fetchRequests();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xoá yêu cầu",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const filteredRequests = requests.filter(req =>
    req.farmer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.farm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.area.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Yêu Cầu Lắp Đặt</h2>
        <p className="text-muted-foreground">Quản lý và phân công yêu cầu lắp đặt thiết bị</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Danh sách yêu cầu</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                  <TableHead className="w-[200px]">Nông dân</TableHead>
                  <TableHead className="w-[200px]">Trang trại / Khu vực</TableHead>
                  <TableHead className="w-[120px]">Trạng thái</TableHead>
                  <TableHead className="w-[200px]">Kỹ thuật viên</TableHead>
                  <TableHead className="w-[120px]">Ngày tạo</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => (
                  <TableRow 
                    key={req.id} 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => router.push(`/admin/installation-requests/${req.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{req.farmer.fullName}</p>
                        <p className="text-xs text-muted-foreground">{req.farmer.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{req.farm.name}</p>
                        <p className="text-xs text-muted-foreground">{req.area.name}</p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={req.status === 'PENDING' ? 'secondary' : 'default'}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {req.status === 'PENDING' ? (
                        <Select
                          onValueChange={(value) => handleAssignTechnician(req.id, value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Chọn KTV" />
                          </SelectTrigger>
                          <SelectContent>
                            {technicians.map((tech) => (
                              <SelectItem key={tech.id} value={tech.id}>
                                {tech.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm">
                          {req.assignedTechnician?.fullName || 'N/A'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(req.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>


      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xoá?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Yêu cầu này sẽ bị xoá vĩnh viễn khỏi hệ thống.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

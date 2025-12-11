"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Search,
  Star,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  credits: number;
  durationDays: number;
  isActive: boolean;
  displayOrder: number;
  discountPercent: number | null;
  badgeText: string | null;
  isPopular: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PlanFormData {
  code: string;
  name: string;
  description: string;
  price: number | '';
  credits: number | '';
  durationDays: number | '';
  displayOrder: number | '';
  discountPercent: number | null;
  badgeText: string;
  isPopular: boolean;
  isActive: boolean;
}

const initialFormData: PlanFormData = {
  code: "",
  name: "",
  description: "",
  price: '',
  credits: '',
  durationDays: '',
  displayOrder: '',
  discountPercent: null,
  badgeText: "",
  isPopular: false,
  isActive: true,
};

export default function AdminSubscriptionPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/subscription-plans");
      if (!res.ok) throw new Error("Failed to fetch plans");
      const json = await res.json();
      if (json.success) {
        setPlans(json.data);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách gói đăng ký",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreateDialog = () => {
    setEditingPlan(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const openEditDialog = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      code: plan.code,
      name: plan.name,
      description: plan.description || "",
      price: Number(plan.price),
      credits: plan.credits,
      durationDays: plan.durationDays,
      displayOrder: plan.displayOrder,
      discountPercent: plan.discountPercent,
      badgeText: plan.badgeText || "",
      isPopular: plan.isPopular,
      isActive: plan.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingPlan
        ? `/api/admin/subscription-plans/${editingPlan.id}`
        : "/api/admin/subscription-plans";
      const method = editingPlan ? "PUT" : "POST";

      const payload = {
        ...formData,
        price: typeof formData.price === 'string' ? 0 : formData.price,
        credits: typeof formData.credits === 'string' ? 0 : formData.credits,
        durationDays: typeof formData.durationDays === 'string' ? 30 : formData.durationDays,
        displayOrder: typeof formData.displayOrder === 'string' ? 0 : formData.displayOrder,
        discountPercent: formData.discountPercent || null,
        badgeText: formData.badgeText || null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to save plan");
      }

      toast({
        title: "Thành công",
        description: editingPlan
          ? "Cập nhật gói đăng ký thành công"
          : "Tạo gói đăng ký mới thành công",
      });

      setIsDialogOpen(false);
      fetchPlans();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/subscription-plans/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete plan");

      toast({
        title: "Thành công",
        description: "Đã xóa gói đăng ký",
      });

      setDeleteTarget(null);
      fetchPlans();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa gói đăng ký",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      const res = await fetch(`/api/admin/subscription-plans/${plan.id}/toggle-active`, {
        method: "PATCH",
      });

      if (!res.ok) throw new Error("Failed to toggle status");

      toast({
        title: "Thành công",
        description: plan.isActive ? "Đã tắt gói đăng ký" : "Đã kích hoạt gói đăng ký",
      });

      fetchPlans();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể thay đổi trạng thái",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const filteredPlans = plans.filter(
    (plan) =>
      plan.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Quản lý Gói Đăng Ký</h2>
            <p className="text-muted-foreground">
              Thêm, sửa, xóa các gói subscription và cấu hình giá
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Thêm gói mới
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Danh sách gói đăng ký</CardTitle>
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
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Tên gói</TableHead>
                  <TableHead>Giá</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Thời hạn</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Chưa có gói đăng ký nào. Nhấn "Thêm gói mới" để tạo.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-mono font-medium">
                        {plan.code}
                        {plan.isPopular && (
                          <Star className="inline h-4 w-4 ml-1 text-yellow-500 fill-yellow-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{plan.name}</span>
                          {plan.badgeText && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {plan.badgeText}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatPrice(Number(plan.price))}</TableCell>
                      <TableCell>{plan.credits}</TableCell>
                      <TableCell>{plan.durationDays} ngày</TableCell>
                      <TableCell>
                        <Switch
                          checked={plan.isActive}
                          onCheckedChange={() => handleToggleActive(plan)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(plan)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(plan)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Chỉnh sửa gói đăng ký" : "Thêm gói đăng ký mới"}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? `Đang chỉnh sửa gói: ${editingPlan.name}`
                : "Điền thông tin để tạo gói đăng ký mới"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Mã gói (Code)*</Label>
                <Input
                  id="code"
                  placeholder="VD: MONTHLY, YEARLY"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Tên gói*</Label>
                <Input
                  id="name"
                  placeholder="VD: Gói Tháng"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                placeholder="Mô tả chi tiết về gói..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Giá (VNĐ)*</Label>
                <Input
                  id="price"
                  type="text"
                  placeholder="VD: 200.000"
                  value={formData.price ? formData.price.toLocaleString('vi-VN') : ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\./g, '');
                    if (value === '' || /^\d+$/.test(value)) {
                      setFormData({ ...formData, price: value === '' ? 0 : Number(value) });
                    }
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credits">Credits*</Label>
                <Input
                  id="credits"
                  type="text"
                  placeholder="VD: 200"
                  value={formData.credits ? formData.credits.toLocaleString('vi-VN') : ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\./g, '');
                    if (value === '' || /^\d+$/.test(value)) {
                      setFormData({ ...formData, credits: value === '' ? 0 : Number(value) });
                    }
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationDays">Thời hạn (ngày)*</Label>
                <Input
                  id="durationDays"
                  type="text"
                  placeholder="VD: 30"
                  value={formData.durationDays ? formData.durationDays.toLocaleString('vi-VN') : ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\./g, '');
                    if (value === '' || /^\d+$/.test(value)) {
                      setFormData({ ...formData, durationDays: value === '' ? 30 : Number(value) });
                    }
                  }}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayOrder">Thứ tự hiển thị</Label>
                <Input
                  id="displayOrder"
                  type="text"
                  placeholder="VD: 1"
                  value={formData.displayOrder ? formData.displayOrder.toLocaleString('vi-VN') : ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\./g, '');
                    if (value === '' || /^\d+$/.test(value)) {
                      setFormData({ ...formData, displayOrder: value === '' ? 0 : Number(value) });
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountPercent">% Giảm giá</Label>
                <Input
                  id="discountPercent"
                  type="number"
                  placeholder="VD: 17"
                  value={formData.discountPercent || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discountPercent: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="badgeText">Badge Text</Label>
              <Input
                id="badgeText"
                placeholder="VD: Tiết kiệm 17%"
                value={formData.badgeText}
                onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPopular"
                  checked={formData.isPopular}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isPopular: checked })
                  }
                />
                <Label htmlFor="isPopular">Đánh dấu là gói phổ biến</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">Kích hoạt</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : editingPlan ? (
                  "Cập nhật"
                ) : (
                  "Tạo mới"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa gói "{deleteTarget?.name}"? Hành động này không
              thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xóa"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

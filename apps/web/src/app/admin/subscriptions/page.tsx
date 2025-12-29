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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  MoreHorizontal,
  Search,
  Shield,
  Edit,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link"; // Added import

interface User {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "FARMER" | "TECHNICIAN";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  plan: "FREE" | "PREMIUM";
  subscriptionStatus: "ACTIVE" | "INACTIVE" | "TRIAL";
  credits: number;
  subscriptionExpiry?: string;
}

export default function AdminSubscriptionsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Subscription Management State
  const [subscriptionUser, setSubscriptionUser] = useState<User | null>(null);
  const [subscriptionFormData, setSubscriptionFormData] = useState({
    plan: "FREE",
    subscriptionStatus: "INACTIVE",
    credits: 0,
    subscriptionExpiry: "",
  });
  const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users"); // Helper endpoint reuse
      if (!res.ok) throw new Error("Failed to fetch users");
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openSubscriptionDialog = (user: User) => {
    setSubscriptionUser(user);
    setSubscriptionFormData({
      plan: user.plan || "FREE",
      subscriptionStatus: user.subscriptionStatus || "INACTIVE",
      credits: user.credits || 0,
      subscriptionExpiry: user.subscriptionExpiry ? new Date(user.subscriptionExpiry).toISOString().split('T')[0] : "",
    });
  };

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriptionUser) return;

    try {
      setIsUpdatingSubscription(true);
      const res = await fetch(`/api/admin/users/${subscriptionUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: subscriptionFormData.plan,
          subscriptionStatus: subscriptionFormData.subscriptionStatus,
          credits: parseInt(subscriptionFormData.credits.toString()),
          subscriptionExpiry: subscriptionFormData.subscriptionExpiry ? new Date(subscriptionFormData.subscriptionExpiry) : null,
        }),
      });

      if (!res.ok) throw new Error("Failed to update subscription");

      toast({
        title: "Thành công",
        description: "Thông tin gói cước đã được cập nhật",
      });
      setSubscriptionUser(null);
      fetchUsers();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật thông tin gói cước",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingSubscription(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Quản lý danh sách đăng ký
          </h2>
          <p className="text-muted-foreground">
            Quản lý và theo dõi trạng thái gói cước thành viên
          </p>
        </div>
        
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Danh sách đăng ký</CardTitle>
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
                  <TableHead>User</TableHead>
                  <TableHead>Current Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.fullName}</span>
                        <span className="text-sm text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.plan === 'PREMIUM' ? 'default' : 'outline'}>
                        {user.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.subscriptionStatus === 'ACTIVE' ? 'default' : user.subscriptionStatus === 'TRIAL' ? 'secondary' : 'outline'}
                      >
                         {user.subscriptionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.credits}
                    </TableCell>
                    <TableCell>
                      {user.subscriptionExpiry ? new Date(user.subscriptionExpiry).toLocaleDateString("vi-VN") : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openSubscriptionDialog(user)}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Subscription Management Dialog */}
      <Dialog
        open={!!subscriptionUser}
        onOpenChange={(open) => !open && setSubscriptionUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quản lý gói cước</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin gói cước cho {subscriptionUser?.fullName} ({subscriptionUser?.email})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubscription} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan">Gói cước</Label>
              <Select 
                value={subscriptionFormData.plan} 
                onValueChange={(value) => setSubscriptionFormData({...subscriptionFormData, plan: value as any})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn gói cước" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">FREE</SelectItem>
                  <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Trạng thái</Label>
              <Select 
                value={subscriptionFormData.subscriptionStatus} 
                onValueChange={(value) => setSubscriptionFormData({...subscriptionFormData, subscriptionStatus: value as any})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                  <SelectItem value="TRIAL">TRIAL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credits">Credits</Label>
              <Input
                id="credits"
                type="number"
                value={subscriptionFormData.credits}
                onChange={(e) =>
                  setSubscriptionFormData({
                    ...subscriptionFormData,
                    credits: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry">Ngày hết hạn</Label>
              <Input
                id="expiry"
                type="date"
                value={subscriptionFormData.subscriptionExpiry}
                onChange={(e) =>
                  setSubscriptionFormData({
                    ...subscriptionFormData,
                    subscriptionExpiry: e.target.value,
                  })
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubscriptionUser(null)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isUpdatingSubscription}>
                {isUpdatingSubscription ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu thay đổi"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  MapPin,
  Calendar,
  TrendingUp,
  Activity,
  Crop,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Eye,
  Edit,
  Trash2,
  Home,
} from "lucide-react";

interface FarmData {
  id: string;
  name: string;
  description?: string;
  location?: string;
  area?: number;
  type: string;
  status: string;
  createdAt: string;
  crops?: CropData[];
  activities?: ActivityData[];
  expenses?: ExpenseData[];
}

interface ExpenseData {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  amount: number;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  expenseDate: string;
  supplier?: string;
  invoiceNumber?: string;
  tags?: string[];
  farmId: string;
  cropId?: string;
  activityId?: string;
}

interface CropData {
  id: string;
  name: string;
  variety?: string;
  type: string;
  status: string;
  plantedArea?: number;
  plantCount?: number;
  plantingDate?: string;
  expectedHarvestDate?: string;
  actualYield?: number;
  marketPrice?: number;
}

interface ActivityData {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduledDate: string;
  actualDate?: string;
  cost?: number;
  farmId: string;
  cropId?: string;
}

interface FarmAnalytics {
  farm: {
    id: string;
    name: string;
    area: number;
    type: string;
  };
  crops: {
    total: number;
    active: number;
    harvested: number;
    totalYield: number;
  };
  activities: {
    total: number;
    completed: number;
    pending: number;
  };
  finances: {
    totalExpenses: number;
    paidExpenses: number;
    pendingExpenses: number;
    estimatedRevenue: number;
    estimatedProfit: number;
  };
}

export default function FarmDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [farms, setFarms] = useState<FarmData[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<FarmData | null>(null);
  const [analytics, setAnalytics] = useState<FarmAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateFarm, setShowCreateFarm] = useState(false);
  const [showCreateCrop, setShowCreateCrop] = useState(false);
  const [showCreateActivity, setShowCreateActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityData | null>(
    null
  );
  const [showCreateExpense, setShowCreateExpense] = useState(false);

  // Form states
  const [newFarm, setNewFarm] = useState({
    name: "",
    description: "",
    location: "",
    area: "",
    type: "MIXED",
  });

  const [newCrop, setNewCrop] = useState({
    name: "",
    variety: "",
    type: "VEGETABLE",
    plantedArea: "",
    plantCount: "",
    plantingDate: "",
    expectedHarvestDate: "",
    expectedYield: "",
    marketPrice: "",
  });

  const [newActivity, setNewActivity] = useState({
    title: "",
    description: "",
    type: "PLANTING",
    scheduledDate: "",
    duration: "",
    cost: "",
    cropId: "",
  });

  const [newExpense, setNewExpense] = useState({
    title: "",
    description: "",
    type: "SEEDS",
    amount: "",
    quantity: "",
    unit: "",
    unitPrice: "",
    expenseDate: "",
    supplier: "",
    invoiceNumber: "",
    tags: "",
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/");
      return;
    }
    fetchFarms();
  }, [session, status, router]);

  const fetchFarms = async () => {
    try {
      const response = await fetch("/api/farms", {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFarms(data);
        if (data.length > 0) {
          setSelectedFarm(data[0]);
          fetchAnalytics(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching farms:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async (farmId: string) => {
    try {
      const response = await fetch(`/api/farms/expenses/farm/${farmId}`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (response.ok) {
        const expenses = await response.json();
        setFarms((prevFarms) =>
          prevFarms.map((farm) =>
            farm.id === farmId ? { ...farm, expenses } : farm
          )
        );
        if (selectedFarm?.id === farmId) {
          setSelectedFarm((prev) => (prev ? { ...prev, expenses } : null));
        }
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  };

  const fetchAnalytics = async (farmId: string) => {
    try {
      const response = await fetch(`/api/farms/${farmId}/analytics`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const handleCreateFarm = async () => {
    try {
      const response = await fetch("/api/farms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          ...newFarm,
          area: newFarm.area ? parseFloat(newFarm.area) : undefined,
        }),
      });

      if (response.ok) {
        setShowCreateFarm(false);
        setNewFarm({
          name: "",
          description: "",
          location: "",
          area: "",
          type: "MIXED",
        });
        fetchFarms();
      }
    } catch (error) {
      console.error("Error creating farm:", error);
    }
  };

  const handleCreateCrop = async () => {
    if (!selectedFarm) return;

    try {
      const response = await fetch("/api/farms/crops", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          ...newCrop,
          farmId: selectedFarm.id,
          plantedArea: newCrop.plantedArea
            ? parseFloat(newCrop.plantedArea)
            : undefined,
          plantCount: newCrop.plantCount
            ? parseInt(newCrop.plantCount)
            : undefined,
          expectedYield: newCrop.expectedYield
            ? parseFloat(newCrop.expectedYield)
            : undefined,
          marketPrice: newCrop.marketPrice
            ? parseFloat(newCrop.marketPrice)
            : undefined,
        }),
      });

      if (response.ok) {
        setShowCreateCrop(false);
        setNewCrop({
          name: "",
          variety: "",
          type: "VEGETABLE",
          plantedArea: "",
          plantCount: "",
          plantingDate: "",
          expectedHarvestDate: "",
          expectedYield: "",
          marketPrice: "",
        });
        fetchFarms();
        if (selectedFarm) fetchAnalytics(selectedFarm.id);
      }
    } catch (error) {
      console.error("Error creating crop:", error);
    }
  };

  const handleCreateActivity = async () => {
    if (!selectedFarm) return;

    try {
      const response = await fetch("/api/farms/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          ...newActivity,
          farmId: selectedFarm.id,
          duration: newActivity.duration
            ? parseInt(newActivity.duration)
            : undefined,
          cost: newActivity.cost ? parseFloat(newActivity.cost) : undefined,
          cropId: newActivity.cropId || undefined,
        }),
      });

      if (response.ok) {
        setShowCreateActivity(false);
        setNewActivity({
          title: "",
          description: "",
          type: "PLANTING",
          scheduledDate: "",
          duration: "",
          cost: "",
          cropId: "",
        });
        fetchFarms();
        if (selectedFarm) fetchAnalytics(selectedFarm.id);
      }
    } catch (error) {
      console.error("Error creating activity:", error);
    }
  };

  const handleEditActivity = async (
    activityId: string,
    updateData: Partial<ActivityData>
  ) => {
    try {
      const response = await fetch(`/api/farms/activities/${activityId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        setEditingActivity(null);
        fetchFarms();
        if (selectedFarm) fetchAnalytics(selectedFarm.id);
      }
    } catch (error) {
      console.error("Error updating activity:", error);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa hoạt động này?")) return;

    try {
      const response = await fetch(`/api/farms/activities/${activityId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (response.ok) {
        fetchFarms();
        if (selectedFarm) fetchAnalytics(selectedFarm.id);
      }
    } catch (error) {
      console.error("Error deleting activity:", error);
    }
  };

  const handleUpdateActivityStatus = async (
    activityId: string,
    newStatus: string
  ) => {
    try {
      const response = await fetch(`/api/farms/activities/${activityId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          status: newStatus,
          actualDate:
            newStatus === "COMPLETED" ? new Date().toISOString() : undefined,
        }),
      });

      if (response.ok) {
        fetchFarms();
        if (selectedFarm) fetchAnalytics(selectedFarm.id);
      }
    } catch (error) {
      console.error("Error updating activity status:", error);
    }
  };

  const handleCreateExpense = async () => {
    if (!selectedFarm) return;

    try {
      const response = await fetch("/api/farms/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          ...newExpense,
          farmId: selectedFarm.id,
          amount: parseFloat(newExpense.amount),
          quantity: newExpense.quantity
            ? parseInt(newExpense.quantity)
            : undefined,
          unitPrice: newExpense.unitPrice
            ? parseFloat(newExpense.unitPrice)
            : undefined,
          tags: newExpense.tags
            ? newExpense.tags.split(",").map((tag) => tag.trim())
            : [],
        }),
      });

      if (response.ok) {
        setShowCreateExpense(false);
        setNewExpense({
          title: "",
          description: "",
          type: "SEEDS",
          amount: "",
          quantity: "",
          unit: "",
          unitPrice: "",
          expenseDate: "",
          supplier: "",
          invoiceNumber: "",
          tags: "",
        });
        fetchFarms();
        if (selectedFarm) {
          fetchAnalytics(selectedFarm.id);
          fetchExpenses(selectedFarm.id);
        }
      }
    } catch (error) {
      console.error("Error creating expense:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-agri-green-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Home className="h-8 w-8 text-agri-green-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Farm Management
                </h1>
                <p className="text-sm text-gray-500">
                  Quản lý nông trại và cây trồng
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Xin chào, {session.user?.name}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Farm Selection */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Chọn Nông Trại
            </h2>
            <Dialog open={showCreateFarm} onOpenChange={setShowCreateFarm}>
              <DialogTrigger asChild>
                <Button className="bg-agri-green-600 hover:bg-agri-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo Nông Trại Mới
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Tạo Nông Trại Mới</DialogTitle>
                  <DialogDescription>
                    Thêm thông tin về nông trại của bạn
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Tên Nông Trại *</Label>
                    <Input
                      id="name"
                      value={newFarm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewFarm({ ...newFarm, name: e.target.value })
                      }
                      placeholder="VD: Nông trại rau sạch ABC"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Mô tả</Label>
                    <Textarea
                      id="description"
                      value={newFarm.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setNewFarm({ ...newFarm, description: e.target.value })
                      }
                      placeholder="Mô tả về nông trại..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location">Địa chỉ</Label>
                    <Input
                      id="location"
                      value={newFarm.location}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewFarm({ ...newFarm, location: e.target.value })
                      }
                      placeholder="VD: Xã ABC, Huyện XYZ, Tỉnh DEF"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="area">Diện tích (m²)</Label>
                    <Input
                      id="area"
                      type="number"
                      value={newFarm.area}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewFarm({ ...newFarm, area: e.target.value })
                      }
                      placeholder="1000"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Loại Nông Trại</Label>
                    <Select
                      value={newFarm.type}
                      onValueChange={(value: string) =>
                        setNewFarm({ ...newFarm, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VEGETABLE">Rau Củ</SelectItem>
                        <SelectItem value="FRUIT">Cây Ăn Quả</SelectItem>
                        <SelectItem value="GRAIN">Ngũ Cốc</SelectItem>
                        <SelectItem value="FLOWER">Hoa</SelectItem>
                        <SelectItem value="MIXED">Hỗn Hợp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateFarm(false)}
                  >
                    Hủy
                  </Button>
                  <Button onClick={handleCreateFarm} disabled={!newFarm.name}>
                    Tạo Nông Trại
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {farms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {farms.map((farm) => (
                <Card
                  key={farm.id}
                  className={`cursor-pointer transition-all ${
                    selectedFarm?.id === farm.id
                      ? "ring-2 ring-agri-green-500 bg-agri-green-50"
                      : "hover:shadow-md"
                  }`}
                  onClick={() => {
                    setSelectedFarm(farm);
                    fetchAnalytics(farm.id);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{farm.name}</CardTitle>
                      <Badge variant="secondary">{farm.type}</Badge>
                    </div>
                    <CardDescription>{farm.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-600">
                      {farm.location && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          {farm.location}
                        </div>
                      )}
                      {farm.area && (
                        <div className="flex items-center">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          {farm.area} m²
                        </div>
                      )}
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Tạo:{" "}
                        {new Date(farm.createdAt).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Home className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Chưa có nông trại nào
                </h3>
                <p className="text-gray-500 mb-4">
                  Hãy tạo nông trại đầu tiên để bắt đầu quản lý
                </p>
                <Button
                  onClick={() => setShowCreateFarm(true)}
                  className="bg-agri-green-600 hover:bg-agri-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo Nông Trại Đầu Tiên
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Farm Details */}
        {selectedFarm && (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Tổng Quan</TabsTrigger>
              <TabsTrigger value="crops">Cây Trồng</TabsTrigger>
              <TabsTrigger value="activities">Hoạt Động</TabsTrigger>
              <TabsTrigger value="expenses">Chi Phí</TabsTrigger>
              <TabsTrigger value="analytics">Thống Kê</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Tổng Cây Trồng
                    </CardTitle>
                    <Crop className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics?.crops.total || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analytics?.crops.active || 0} đang phát triển
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Hoạt Động
                    </CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics?.activities.total || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analytics?.activities.completed || 0} đã hoàn thành
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Tổng Chi Phí
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics?.finances.totalExpenses?.toLocaleString(
                        "vi-VN"
                      ) || 0}{" "}
                      VNĐ
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analytics?.finances.pendingExpenses?.toLocaleString(
                        "vi-VN"
                      ) || 0}{" "}
                      VNĐ chưa thanh toán
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Lợi Nhuận Ước Tính
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics?.finances.estimatedProfit?.toLocaleString(
                        "vi-VN"
                      ) || 0}{" "}
                      VNĐ
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Doanh thu:{" "}
                      {analytics?.finances.estimatedRevenue?.toLocaleString(
                        "vi-VN"
                      ) || 0}{" "}
                      VNĐ
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="crops" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Cây Trồng</h3>
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
                            onChange={(e) =>
                              setNewCrop({ ...newCrop, name: e.target.value })
                            }
                            placeholder="VD: Cà chua"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="variety">Giống</Label>
                          <Input
                            id="variety"
                            value={newCrop.variety}
                            onChange={(e) =>
                              setNewCrop({
                                ...newCrop,
                                variety: e.target.value,
                              })
                            }
                            placeholder="VD: Cherry"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="crop-type">Loại Cây Trồng</Label>
                        <Select
                          value={newCrop.type}
                          onValueChange={(value: string) =>
                            setNewCrop({ ...newCrop, type: value })
                          }
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
                          <Label htmlFor="planted-area">
                            Diện Tích Trồng (m²)
                          </Label>
                          <Input
                            id="planted-area"
                            type="number"
                            value={newCrop.plantedArea}
                            onChange={(e) =>
                              setNewCrop({
                                ...newCrop,
                                plantedArea: e.target.value,
                              })
                            }
                            placeholder="100"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="plant-count">Số Lượng Cây</Label>
                          <Input
                            id="plant-count"
                            type="number"
                            value={newCrop.plantCount}
                            onChange={(e) =>
                              setNewCrop({
                                ...newCrop,
                                plantCount: e.target.value,
                              })
                            }
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
                            onChange={(e) =>
                              setNewCrop({
                                ...newCrop,
                                plantingDate: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="harvest-date">
                            Ngày Thu Hoạch Dự Kiến
                          </Label>
                          <Input
                            id="harvest-date"
                            type="date"
                            value={newCrop.expectedHarvestDate}
                            onChange={(e) =>
                              setNewCrop({
                                ...newCrop,
                                expectedHarvestDate: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="expected-yield">
                            Sản Lượng Dự Kiến (kg)
                          </Label>
                          <Input
                            id="expected-yield"
                            type="number"
                            value={newCrop.expectedYield}
                            onChange={(e) =>
                              setNewCrop({
                                ...newCrop,
                                expectedYield: e.target.value,
                              })
                            }
                            placeholder="500"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="market-price">
                            Giá Thị Trường (VNĐ/kg)
                          </Label>
                          <Input
                            id="market-price"
                            type="number"
                            value={newCrop.marketPrice}
                            onChange={(e) =>
                              setNewCrop({
                                ...newCrop,
                                marketPrice: e.target.value,
                              })
                            }
                            placeholder="25000"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateCrop(false)}
                      >
                        Hủy
                      </Button>
                      <Button
                        onClick={handleCreateCrop}
                        disabled={!newCrop.name}
                      >
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
                      <div className="space-y-2 text-sm text-gray-600">
                        {crop.plantedArea && (
                          <div>Diện tích: {crop.plantedArea} m²</div>
                        )}
                        {crop.plantCount && (
                          <div>Số cây: {crop.plantCount}</div>
                        )}
                        {crop.plantingDate && (
                          <div>
                            Ngày trồng:{" "}
                            {new Date(crop.plantingDate).toLocaleDateString(
                              "vi-VN"
                            )}
                          </div>
                        )}
                        {crop.expectedHarvestDate && (
                          <div>
                            Thu hoạch:{" "}
                            {new Date(
                              crop.expectedHarvestDate
                            ).toLocaleDateString("vi-VN")}
                          </div>
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Chưa có cây trồng nào
                    </h3>
                    <p className="text-gray-500 mb-4">
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
            </TabsContent>

            <TabsContent value="activities" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Hoạt Động</h3>
                <Dialog
                  open={showCreateActivity}
                  onOpenChange={setShowCreateActivity}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-agri-green-600 hover:bg-agri-green-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Thêm Hoạt Động
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Thêm Hoạt Động Mới</DialogTitle>
                      <DialogDescription>
                        Ghi nhận hoạt động nông nghiệp
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="activity-title">Tiêu Đề *</Label>
                        <Input
                          id="activity-title"
                          value={newActivity.title}
                          onChange={(e) =>
                            setNewActivity({
                              ...newActivity,
                              title: e.target.value,
                            })
                          }
                          placeholder="VD: Bón phân cho cà chua"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="activity-description">Mô Tả</Label>
                        <Textarea
                          id="activity-description"
                          value={newActivity.description}
                          onChange={(e) =>
                            setNewActivity({
                              ...newActivity,
                              description: e.target.value,
                            })
                          }
                          placeholder="Mô tả chi tiết hoạt động..."
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="activity-type">Loại Hoạt Động</Label>
                        <Select
                          value={newActivity.type}
                          onValueChange={(value: string) =>
                            setNewActivity({ ...newActivity, type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PLANTING">Gieo Trồng</SelectItem>
                            <SelectItem value="WATERING">Tưới Nước</SelectItem>
                            <SelectItem value="FERTILIZING">
                              Bón Phân
                            </SelectItem>
                            <SelectItem value="PEST_CONTROL">
                              Phòng Trừ Sâu Bệnh
                            </SelectItem>
                            <SelectItem value="PRUNING">Cắt Tỉa</SelectItem>
                            <SelectItem value="HARVESTING">
                              Thu Hoạch
                            </SelectItem>
                            <SelectItem value="SOIL_PREPARATION">
                              Chuẩn Bị Đất
                            </SelectItem>
                            <SelectItem value="WEEDING">Làm Cỏ</SelectItem>
                            <SelectItem value="OTHER">Khác</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="scheduled-date">Ngày Dự Kiến</Label>
                          <Input
                            id="scheduled-date"
                            type="date"
                            value={newActivity.scheduledDate}
                            onChange={(e) =>
                              setNewActivity({
                                ...newActivity,
                                scheduledDate: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="duration">Thời Gian (phút)</Label>
                          <Input
                            id="duration"
                            type="number"
                            value={newActivity.duration}
                            onChange={(e) =>
                              setNewActivity({
                                ...newActivity,
                                duration: e.target.value,
                              })
                            }
                            placeholder="60"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cost">Chi Phí (VNĐ)</Label>
                        <Input
                          id="cost"
                          type="number"
                          value={newActivity.cost}
                          onChange={(e) =>
                            setNewActivity({
                              ...newActivity,
                              cost: e.target.value,
                            })
                          }
                          placeholder="100000"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateActivity(false)}
                      >
                        Hủy
                      </Button>
                      <Button
                        onClick={handleCreateActivity}
                        disabled={
                          !newActivity.title || !newActivity.scheduledDate
                        }
                      >
                        Thêm Hoạt Động
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-4">
                {selectedFarm.activities?.map((activity) => (
                  <Card key={activity.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="text-lg font-medium">
                            {activity.title}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <Badge variant="outline">{activity.type}</Badge>
                            <span>
                              Ngày:{" "}
                              {new Date(
                                activity.scheduledDate
                              ).toLocaleDateString("vi-VN")}
                            </span>
                            {activity.cost && (
                              <span>
                                Chi phí: {activity.cost.toLocaleString("vi-VN")}{" "}
                                VNĐ
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Select
                            value={activity.status}
                            onValueChange={(value: string) =>
                              handleUpdateActivityStatus(activity.id, value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PLANNED">Kế hoạch</SelectItem>
                              <SelectItem value="IN_PROGRESS">
                                Đang thực hiện
                              </SelectItem>
                              <SelectItem value="COMPLETED">
                                Hoàn thành
                              </SelectItem>
                              <SelectItem value="CANCELLED">Hủy bỏ</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingActivity(activity)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteActivity(activity.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )) || []}
              </div>

              {(!selectedFarm.activities ||
                selectedFarm.activities.length === 0) && (
                <Card className="text-center py-12">
                  <CardContent>
                    <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Chưa có hoạt động nào
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Hãy ghi nhận hoạt động đầu tiên
                    </p>
                    <Button
                      onClick={() => setShowCreateActivity(true)}
                      className="bg-agri-green-600 hover:bg-agri-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Thêm Hoạt Động Đầu Tiên
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="expenses" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Quản Lý Chi Phí</h3>
                <Dialog
                  open={showCreateExpense}
                  onOpenChange={setShowCreateExpense}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-agri-green-600 hover:bg-agri-green-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Thêm Chi Phí
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Thêm Chi Phí Mới</DialogTitle>
                      <DialogDescription>
                        Ghi nhận chi phí cho nông trại
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="expense-title">Tiêu Đề *</Label>
                          <Input
                            id="expense-title"
                            value={newExpense.title}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) =>
                              setNewExpense({
                                ...newExpense,
                                title: e.target.value,
                              })
                            }
                            placeholder="VD: Mua hạt giống cà chua"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="expense-type">Loại Chi Phí</Label>
                          <Select
                            value={newExpense.type}
                            onValueChange={(value: string) =>
                              setNewExpense({ ...newExpense, type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SEEDS">Hạt Giống</SelectItem>
                              <SelectItem value="FERTILIZER">
                                Phân Bón
                              </SelectItem>
                              <SelectItem value="PESTICIDE">
                                Thuốc Trừ Sâu
                              </SelectItem>
                              <SelectItem value="EQUIPMENT">
                                Thiết Bị
                              </SelectItem>
                              <SelectItem value="LABOR">Nhân Công</SelectItem>
                              <SelectItem value="WATER">Nước Tưới</SelectItem>
                              <SelectItem value="ELECTRICITY">Điện</SelectItem>
                              <SelectItem value="FUEL">Nhiên Liệu</SelectItem>
                              <SelectItem value="TRANSPORTATION">
                                Vận Chuyển
                              </SelectItem>
                              <SelectItem value="MAINTENANCE">
                                Bảo Trì
                              </SelectItem>
                              <SelectItem value="OTHER">Khác</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="expense-description">Mô Tả</Label>
                        <Textarea
                          id="expense-description"
                          value={newExpense.description}
                          onChange={(
                            e: React.ChangeEvent<HTMLTextAreaElement>
                          ) =>
                            setNewExpense({
                              ...newExpense,
                              description: e.target.value,
                            })
                          }
                          placeholder="Mô tả chi tiết về chi phí..."
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="expense-amount">
                            Số Tiền (VNĐ) *
                          </Label>
                          <Input
                            id="expense-amount"
                            type="number"
                            value={newExpense.amount}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) =>
                              setNewExpense({
                                ...newExpense,
                                amount: e.target.value,
                              })
                            }
                            placeholder="100000"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="expense-quantity">Số Lượng</Label>
                          <Input
                            id="expense-quantity"
                            type="number"
                            value={newExpense.quantity}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) =>
                              setNewExpense({
                                ...newExpense,
                                quantity: e.target.value,
                              })
                            }
                            placeholder="10"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="expense-unit">Đơn Vị</Label>
                          <Input
                            id="expense-unit"
                            value={newExpense.unit}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) =>
                              setNewExpense({
                                ...newExpense,
                                unit: e.target.value,
                              })
                            }
                            placeholder="kg, lít, cái..."
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="expense-date">Ngày Chi Phí</Label>
                          <Input
                            id="expense-date"
                            type="date"
                            value={newExpense.expenseDate}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) =>
                              setNewExpense({
                                ...newExpense,
                                expenseDate: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="supplier">Nhà Cung Cấp</Label>
                          <Input
                            id="supplier"
                            value={newExpense.supplier}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) =>
                              setNewExpense({
                                ...newExpense,
                                supplier: e.target.value,
                              })
                            }
                            placeholder="Tên nhà cung cấp"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="invoice-number">Số Hóa Đơn</Label>
                        <Input
                          id="invoice-number"
                          value={newExpense.invoiceNumber}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setNewExpense({
                              ...newExpense,
                              invoiceNumber: e.target.value,
                            })
                          }
                          placeholder="HD001"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="expense-tags">
                          Tags (phân cách bằng dấu phẩy)
                        </Label>
                        <Input
                          id="expense-tags"
                          value={newExpense.tags}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setNewExpense({
                              ...newExpense,
                              tags: e.target.value,
                            })
                          }
                          placeholder="urgent, monthly, equipment"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateExpense(false)}
                      >
                        Hủy
                      </Button>
                      <Button
                        onClick={handleCreateExpense}
                        disabled={!newExpense.title || !newExpense.amount}
                      >
                        Thêm Chi Phí
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-4">
                {selectedFarm.expenses?.map((expense) => (
                  <Card key={expense.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="text-lg font-medium">
                            {expense.title}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <Badge variant="outline">{expense.type}</Badge>
                            <span>
                              Số tiền: {expense.amount?.toLocaleString("vi-VN")}{" "}
                              VNĐ
                            </span>
                            {expense.supplier && (
                              <span>Nhà cung cấp: {expense.supplier}</span>
                            )}
                            {expense.expenseDate && (
                              <span>
                                Ngày:{" "}
                                {new Date(
                                  expense.expenseDate
                                ).toLocaleDateString("vi-VN")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              expense.status === "PAID"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {expense.status}
                          </Badge>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )) || []}
              </div>

              {(!selectedFarm.expenses ||
                selectedFarm.expenses.length === 0) && (
                <Card className="text-center py-12">
                  <CardContent>
                    <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Chưa có chi phí nào
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Hãy ghi nhận chi phí đầu tiên
                    </p>
                    <Button
                      onClick={() => setShowCreateExpense(true)}
                      className="bg-agri-green-600 hover:bg-agri-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Thêm Chi Phí Đầu Tiên
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <h3 className="text-lg font-semibold">Thống Kê Chi Tiết</h3>
              {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Thống Kê Cây Trồng</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span>Tổng số cây trồng:</span>
                        <span className="font-medium">
                          {analytics.crops.total}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Đang phát triển:</span>
                        <span className="font-medium text-blue-600">
                          {analytics.crops.active}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Đã thu hoạch:</span>
                        <span className="font-medium text-green-600">
                          {analytics.crops.harvested}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tổng sản lượng:</span>
                        <span className="font-medium">
                          {analytics.crops.totalYield} kg
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Thống Kê Hoạt Động</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span>Tổng hoạt động:</span>
                        <span className="font-medium">
                          {analytics.activities.total}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Đã hoàn thành:</span>
                        <span className="font-medium text-green-600">
                          {analytics.activities.completed}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Chờ thực hiện:</span>
                        <span className="font-medium text-yellow-600">
                          {analytics.activities.pending}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Tài Chính</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span>Tổng chi phí:</span>
                        <span className="font-medium text-red-600">
                          {analytics.finances.totalExpenses.toLocaleString(
                            "vi-VN"
                          )}{" "}
                          VNĐ
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Đã thanh toán:</span>
                        <span className="font-medium text-green-600">
                          {analytics.finances.paidExpenses.toLocaleString(
                            "vi-VN"
                          )}{" "}
                          VNĐ
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Chưa thanh toán:</span>
                        <span className="font-medium text-yellow-600">
                          {analytics.finances.pendingExpenses.toLocaleString(
                            "vi-VN"
                          )}{" "}
                          VNĐ
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Doanh Thu & Lợi Nhuận</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span>Doanh thu ước tính:</span>
                        <span className="font-medium text-blue-600">
                          {analytics.finances.estimatedRevenue.toLocaleString(
                            "vi-VN"
                          )}{" "}
                          VNĐ
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Lợi nhuận ước tính:</span>
                        <span
                          className={`font-medium ${
                            analytics.finances.estimatedProfit >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {analytics.finances.estimatedProfit.toLocaleString(
                            "vi-VN"
                          )}{" "}
                          VNĐ
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

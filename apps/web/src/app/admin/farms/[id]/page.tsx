"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, MapPin, User, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

interface FarmDetail {
  id: string;
  name: string;
  address: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  areas: Array<{
    id: string;
    name: string;
    type: string;
    crop: string;
  }>;
}

export default function AdminFarmDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [farm, setFarm] = useState<FarmDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFarm = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/farms/${params.id}`);
        if (!res.ok) throw new Error("Failed to fetch farm");
        const data = await res.json();
        setFarm(data);
      } catch (error) {
        console.error(error);
        toast({
          title: "Lỗi",
          description: "Không thể tải thông tin nông trại",
          variant: "destructive",
        });
        router.push("/admin/farms");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchFarm();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!farm) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/farms">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{farm.name}</h2>
          <p className="text-muted-foreground">Thông tin chi tiết nông trại</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Thông tin cơ bản */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Thông tin nông trại
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                ID nông trại
              </label>
              <p className="text-base font-mono text-sm">{farm.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Tên nông trại
              </label>
              <p className="text-base">{farm.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Địa chỉ
              </label>
              <p className="text-base">{farm.address}</p>
            </div>
            {farm.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Mô tả
                </label>
                <p className="text-base">{farm.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Ngày tạo
                </label>
                <p className="text-sm">
                  {new Date(farm.createdAt).toLocaleDateString("vi-VN")}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Cập nhật
                </label>
                <p className="text-sm">
                  {new Date(farm.updatedAt).toLocaleDateString("vi-VN")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Thông tin chủ nông trại */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Chủ nông trại
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Họ và tên
              </label>
              <p className="text-base">{farm.user.fullName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Email
              </label>
              <p className="text-base">{farm.user.email}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danh sách khu vực */}
      <Card>
        <CardHeader>
          <CardTitle>Khu vực canh tác ({farm.areas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {farm.areas.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Chưa có khu vực nào
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {farm.areas.map((area) => (
                <Card key={area.id}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">{area.name}</h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {area.type && <p>Loại: {area.type}</p>}
                      <p>Cây trồng: {area.crop || "Chưa có"}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

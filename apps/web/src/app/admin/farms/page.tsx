"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Eye, MapPin } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

interface Farm {
  id: string;
  name: string;
  address: string;
  areasCount: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
}

export default function AdminFarmsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchFarms = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/farms");
      if (!res.ok) throw new Error("Failed to fetch farms");
      const data = await res.json();
      setFarms(data);
    } catch (error) {
      console.error(error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách nông trại",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  const filteredFarms = farms.filter(
    (farm) =>
      farm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      farm.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      farm.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      farm.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Quản lý Nông trại</h2>
        <p className="text-muted-foreground">
          Xem danh sách và thông tin cơ bản các nông trại trong hệ thống
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Danh sách nông trại</CardTitle>
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
                  <TableHead>ID</TableHead>
                  <TableHead>Tên nông trại</TableHead>
                  <TableHead>Chủ nông trại</TableHead>
                  <TableHead>Địa chỉ</TableHead>
                  <TableHead>Số khu vực</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFarms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">
                        {searchTerm ? "Không tìm thấy nông trại" : "Chưa có nông trại nào"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFarms.map((farm) => (
                    <TableRow key={farm.id}>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">
                          {farm.id.slice(0, 8)}...
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{farm.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{farm.user.fullName}</span>
                          <span className="text-sm text-muted-foreground">
                            {farm.user.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">{farm.address}</div>
                      </TableCell>
                      <TableCell>{farm.areasCount}</TableCell>
                      <TableCell>
                        {new Date(farm.createdAt).toLocaleDateString("vi-VN")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/farms/${farm.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Xem chi tiết
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

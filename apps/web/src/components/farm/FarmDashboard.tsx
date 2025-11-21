"use client";

import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { AddAreaModal } from './AddAreaModal';

interface FarmDashboardProps {
  farm: any;
}

export const FarmDashboard: React.FC<FarmDashboardProps> = ({ farm }) => {
  const [isAddAreaModalOpen, setIsAddAreaModalOpen] = useState(false);
  const [areas, setAreas] = useState<any[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState(true);

  const fetchAreas = async () => {
    try {
      setIsLoadingAreas(true);
      const response = await fetch('/api/farms/areas');
      if (response.ok) {
        const data = await response.json();
        setAreas(data);
      }
    } catch (error) {
      console.error('Failed to fetch areas:', error);
    } finally {
      setIsLoadingAreas(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const handleAreaAdded = (newArea: any) => {
    setAreas([...areas, newArea]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{farm.name}</h2>
          <p className="text-muted-foreground">{farm.address}</p>
        </div>
        <Button onClick={() => setIsAddAreaModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Thêm Khu Vực
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="areas">Khu vực</TabsTrigger>
          <TabsTrigger value="activities">Nhật ký canh tác</TabsTrigger>
          <TabsTrigger value="finance">Tài chính</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng số khu vực</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{areas.length}</div>
              </CardContent>
            </Card>
            {/* Add more stats cards here */}
          </div>
        </TabsContent>

        <TabsContent value="areas">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách khu vực</CardTitle>
              <CardDescription>Quản lý các khu vực trồng trọt của bạn.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAreas ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Đang tải...</span>
                </div>
              ) : areas.length === 0 ? (
                <p className="text-muted-foreground">Chưa có khu vực nào. Nhấn "Thêm Khu Vực" để bắt đầu.</p>
              ) : (
                <div className="space-y-4">
                  {areas.map((area) => (
                    <Card key={area.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{area.name}</CardTitle>
                        {area.type && <CardDescription>{area.type}</CardDescription>}
                      </CardHeader>
                      {area.description && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{area.description}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>Nhật ký canh tác</CardTitle>
              <CardDescription>Ghi lại các hoạt động gieo trồng, chăm sóc.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Activity list will go here */}
              <p className="text-muted-foreground">Chưa có hoạt động nào.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <Card>
            <CardHeader>
              <CardTitle>Tài chính</CardTitle>
              <CardDescription>Theo dõi chi phí và doanh thu.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Chưa có dữ liệu tài chính.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddAreaModal
        isOpen={isAddAreaModalOpen}
        onClose={() => setIsAddAreaModalOpen(false)}
        onSuccess={handleAreaAdded}
      />
    </div>
  );
};

"use client";

import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Edit, Trash2 } from 'lucide-react';
import { AddAreaModal } from './AddAreaModal';
import { EditAreaModal } from './EditAreaModal';
import { AddActivityModal } from './AddActivityModal';
import { ActivityList } from './ActivityList';
import { FinancialStats } from './FinancialStats';
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

interface FarmDashboardProps {
  farm: any;
}

export const FarmDashboard: React.FC<FarmDashboardProps> = ({ farm }) => {
  const [isAddAreaModalOpen, setIsAddAreaModalOpen] = useState(false);
  const [isEditAreaModalOpen, setIsEditAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<any>(null);
  const [deleteAreaId, setDeleteAreaId] = useState<string | null>(null);
  const [isDeletingArea, setIsDeletingArea] = useState(false);
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [areas, setAreas] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

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

  const fetchActivities = async () => {
    try {
      setIsLoadingActivities(true);
      const response = await fetch('/api/farms/activities');
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  useEffect(() => {
    fetchAreas();
    fetchActivities();
  }, []);

  const handleAreaAdded = (newArea: any) => {
    setAreas([...areas, newArea]);
  };

  const handleActivityAdded = (newActivity: any) => {
    // Refetch to get full relations (area, etc.)
    fetchActivities();
  };

  const handleActivityDeleted = (activityId: string) => {
    setActivities(activities.filter(a => a.id !== activityId));
  };

  const handleEditActivity = (activity: any) => {
    setEditingActivity(activity);
    setIsAddActivityModalOpen(true);
  };

  const handleCloseActivityModal = () => {
    setIsAddActivityModalOpen(false);
    setEditingActivity(null);
  };

  const handleAreaUpdated = (updatedArea: any) => {
    setAreas(areas.map(a => a.id === updatedArea.id ? updatedArea : a));
    setIsEditAreaModalOpen(false);
    setEditingArea(null);
  };

  const handleEditArea = (area: any) => {
    setEditingArea(area);
    setIsEditAreaModalOpen(true);
  };

  const handleDeleteArea = async () => {
    if (!deleteAreaId) return;

    try {
      setIsDeletingArea(true);
      const response = await fetch(`/api/farms/areas/${deleteAreaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete area');
      }

      setAreas(areas.filter(a => a.id !== deleteAreaId));
    } catch (error) {
      console.error('Error deleting area:', error);
    } finally {
      setIsDeletingArea(false);
      setDeleteAreaId(null);
    }
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
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{area.name}</CardTitle>
                            {area.type && <CardDescription>{area.type}</CardDescription>}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditArea(area)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteAreaId(area.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
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
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Nhật ký canh tác</CardTitle>
                  <CardDescription>Ghi lại các hoạt động gieo trồng, chăm sóc.</CardDescription>
                </div>
                <Button onClick={() => setIsAddActivityModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Thêm hoạt động
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ActivityList
                activities={activities}
                onEdit={handleEditActivity}
                onDelete={handleActivityDeleted}
                isLoading={isLoadingActivities}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <Card>
            <CardContent className="pt-6">
              <FinancialStats />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddAreaModal
        isOpen={isAddAreaModalOpen}
        onClose={() => setIsAddAreaModalOpen(false)}
        onSuccess={handleAreaAdded}
      />

      <AddActivityModal
        isOpen={isAddActivityModalOpen}
        onClose={handleCloseActivityModal}
        onSuccess={handleActivityAdded}
        editActivity={editingActivity}
      />

      <EditAreaModal
        isOpen={isEditAreaModalOpen}
        onClose={() => {
          setIsEditAreaModalOpen(false);
          setEditingArea(null);
        }}
        onSuccess={handleAreaUpdated}
        area={editingArea}
      />

      <AlertDialog open={!!deleteAreaId} onOpenChange={() => setDeleteAreaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa khu vực</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa khu vực này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingArea}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteArea} disabled={isDeletingArea}>
              {isDeletingArea ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

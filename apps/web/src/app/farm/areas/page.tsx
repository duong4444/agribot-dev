"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Edit, Trash2 } from 'lucide-react';
import { AddAreaModal } from '@/components/farm/AddAreaModal';
import { EditAreaModal } from '@/components/farm/EditAreaModal';
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

export default function FarmAreasPage() {
  const [isAddAreaModalOpen, setIsAddAreaModalOpen] = useState(false);
  const [isEditAreaModalOpen, setIsEditAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<any>(null);
  const [deleteAreaId, setDeleteAreaId] = useState<string | null>(null);
  const [isDeletingArea, setIsDeletingArea] = useState(false);
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
          <h2 className="text-2xl font-bold tracking-tight">Quản lý khu vực</h2>
          <p className="text-muted-foreground">Quản lý các khu vực trồng trọt của bạn</p>
        </div>
        <Button onClick={() => setIsAddAreaModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Thêm Khu Vực
        </Button>
      </div>

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
                        {area.crop && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Cây trồng: <span className="font-medium">{area.crop}</span>
                          </p>
                        )}
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

      <AddAreaModal
        isOpen={isAddAreaModalOpen}
        onClose={() => setIsAddAreaModalOpen(false)}
        onSuccess={handleAreaAdded}
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
}

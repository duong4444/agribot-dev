"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Activity, TrendingUp, DollarSign, MapPin } from 'lucide-react';
import { AddActivityModal } from '@/components/farm/AddActivityModal';
import { ActivityList } from '@/components/farm/ActivityList';
import { ActivityFiltersComponent, ActivityFilters } from '@/components/farm/ActivityFilters';
import { format } from 'date-fns';

export default function FarmActivitiesPage() {
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [areas, setAreas] = useState<any[]>([]);
  const [filters, setFilters] = useState<ActivityFilters>({
    startDate: null,
    endDate: null,
    type: 'all',
    areaId: 'all',
    cropName: 'all',
    search: '',
  });

  // Fetch areas for filter
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const response = await fetch('/api/farms/areas');
        if (response.ok) {
          const data = await response.json();
          setAreas(data);
        }
      } catch (error) {
        console.error('Failed to fetch areas:', error);
      }
    };
    fetchAreas();
  }, []);

  const fetchActivities = async () => {
    try {
      setIsLoadingActivities(true);
      
      // Build query params from filters
      const params = new URLSearchParams();
      if (filters.startDate) {
        params.append('startDate', format(filters.startDate, 'yyyy-MM-dd'));
      }
      if (filters.endDate) {
        params.append('endDate', format(filters.endDate, 'yyyy-MM-dd'));
      }
      if (filters.type && filters.type !== 'all') {
        params.append('type', filters.type);
      }
      if (filters.areaId && filters.areaId !== 'all') {
        params.append('areaId', filters.areaId);
      }
      if (filters.cropName && filters.cropName !== 'all') {
        params.append('cropName', filters.cropName);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }

      const response = await fetch(`/api/farms/activities?${params.toString()}`);
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
    fetchActivities();
  }, [filters]);

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

  // Extract unique crops from activities
  const uniqueCrops = Array.from(new Set(activities.map(a => a.cropName).filter(Boolean))) as string[];

  // Calculate stats
  const totalActivities = activities.length;
  const totalCost = activities.reduce((sum, a) => sum + (parseFloat(a.cost) || 0), 0);
  const avgCost = totalActivities > 0 ? totalCost / totalActivities : 0;
  
  // Find most active area
  const areaActivityCounts = activities.reduce((acc, a) => {
    if (a.area?.name) {
      acc[a.area.name] = (acc[a.area.name] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const mostActiveArea = (Object.entries(areaActivityCounts) as [string, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nhật ký canh tác</h2>
          <p className="text-muted-foreground">Ghi lại các hoạt động gieo trồng, chăm sóc</p>
        </div>
        <Button onClick={() => setIsAddActivityModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Thêm hoạt động
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng hoạt động</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActivities}</div>
            <p className="text-xs text-muted-foreground">
              Theo bộ lọc hiện tại
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chi phí trung bình</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgCost.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ
            </div>
            <p className="text-xs text-muted-foreground">
              Trên mỗi hoạt động
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng chi phí</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCost.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ
            </div>
            <p className="text-xs text-muted-foreground">
              Trong khoảng thời gian
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Khu vực hoạt động nhất</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mostActiveArea}</div>
            <p className="text-xs text-muted-foreground">
              {areaActivityCounts[mostActiveArea] || 0} hoạt động
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <ActivityFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        areas={areas}
        crops={uniqueCrops}
      />

      {/* Activities List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách hoạt động</CardTitle>
          <CardDescription>Lịch sử các hoạt động canh tác</CardDescription>
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

      <AddActivityModal
        isOpen={isAddActivityModalOpen}
        onClose={handleCloseActivityModal}
        onSuccess={handleActivityAdded}
        editActivity={editingActivity}
      />
    </div>
  );
}


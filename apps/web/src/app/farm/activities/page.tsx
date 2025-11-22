"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AddActivityModal } from '@/components/farm/AddActivityModal';
import { ActivityList } from '@/components/farm/ActivityList';

export default function FarmActivitiesPage() {
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

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
    fetchActivities();
  }, []);

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

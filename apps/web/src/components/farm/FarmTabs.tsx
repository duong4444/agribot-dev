"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FarmData, FarmAnalytics } from './types';
import { FarmOverview } from './FarmOverview';
import { CropsSection } from './CropsSection';
import { ActivitiesSection } from './ActivitiesSection';
import { ExpensesSection } from './ExpensesSection';
import { AnalyticsSection } from './AnalyticsSection';

interface FarmTabsProps {
  selectedFarm: FarmData;
  analytics: FarmAnalytics | null;
  // Crops props
  newCrop: any;
  setNewCrop: (crop: any) => void;
  showCreateCrop: boolean;
  setShowCreateCrop: (show: boolean) => void;
  onCreateCrop: () => void;
  // Activities props
  newActivity: any;
  setNewActivity: (activity: any) => void;
  showCreateActivity: boolean;
  setShowCreateActivity: (show: boolean) => void;
  onCreateActivity: () => void;
  editingActivity: any;
  setEditingActivity: (activity: any) => void;
  onEditActivity: (id: string, data: any) => void;
  onDeleteActivity: (id: string) => void;
  onUpdateActivityStatus: (id: string, status: string) => void;
  // Expenses props
  newExpense: any;
  setNewExpense: (expense: any) => void;
  showCreateExpense: boolean;
  setShowCreateExpense: (show: boolean) => void;
  onCreateExpense: () => void;
}

export const FarmTabs: React.FC<FarmTabsProps> = ({
  selectedFarm,
  analytics,
  newCrop,
  setNewCrop,
  showCreateCrop,
  setShowCreateCrop,
  onCreateCrop,
  newActivity,
  setNewActivity,
  showCreateActivity,
  setShowCreateActivity,
  onCreateActivity,
  editingActivity,
  setEditingActivity,
  onEditActivity,
  onDeleteActivity,
  onUpdateActivityStatus,
  newExpense,
  setNewExpense,
  showCreateExpense,
  setShowCreateExpense,
  onCreateExpense,
}) => {
  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="overview">Tổng Quan</TabsTrigger>
        <TabsTrigger value="crops">Cây Trồng</TabsTrigger>
        <TabsTrigger value="activities">Hoạt Động</TabsTrigger>
        <TabsTrigger value="expenses">Chi Phí</TabsTrigger>
        <TabsTrigger value="analytics">Thống Kê</TabsTrigger>
        <TabsTrigger value="advanced-analytics">Phân Tích Nâng Cao</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <FarmOverview analytics={analytics} />
      </TabsContent>

      <TabsContent value="crops" className="space-y-6">
        <CropsSection
          selectedFarm={selectedFarm}
          newCrop={newCrop}
          setNewCrop={setNewCrop}
          showCreateCrop={showCreateCrop}
          setShowCreateCrop={setShowCreateCrop}
          onCreateCrop={onCreateCrop}
        />
      </TabsContent>

      <TabsContent value="activities" className="space-y-6">
        <ActivitiesSection
          selectedFarm={selectedFarm}
          newActivity={newActivity}
          setNewActivity={setNewActivity}
          showCreateActivity={showCreateActivity}
          setShowCreateActivity={setShowCreateActivity}
          onCreateActivity={onCreateActivity}
          editingActivity={editingActivity}
          setEditingActivity={setEditingActivity}
          onEditActivity={onEditActivity}
          onDeleteActivity={onDeleteActivity}
          onUpdateActivityStatus={onUpdateActivityStatus}
        />
      </TabsContent>

      <TabsContent value="expenses" className="space-y-6">
        <ExpensesSection
          selectedFarm={selectedFarm}
          newExpense={newExpense}
          setNewExpense={setNewExpense}
          showCreateExpense={showCreateExpense}
          setShowCreateExpense={setShowCreateExpense}
          onCreateExpense={onCreateExpense}
        />
      </TabsContent>

      <TabsContent value="analytics" className="space-y-6">
        <AnalyticsSection analytics={analytics} />
      </TabsContent>

      <TabsContent value="advanced-analytics" className="space-y-6">
        <AnalyticsSection 
          analytics={analytics} 
          selectedFarm={selectedFarm}
          showAdvanced={true}
        />
      </TabsContent>
    </Tabs>
  );
};

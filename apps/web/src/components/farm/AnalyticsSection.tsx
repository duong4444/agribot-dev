"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FarmAnalytics, FarmData } from './types';
// import ExpenseAnalytics from '@/components/analytics/expense-analytics';
// import ActivityAnalytics from '@/components/analytics/activity-analytics';
// import CropAnalytics from '@/components/analytics/crop-analytics';
// import FinancialAnalytics from '@/components/analytics/financial-analytics';

interface AnalyticsSectionProps {
  analytics: FarmAnalytics | null;
  selectedFarm?: FarmData;
  showAdvanced?: boolean;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ 
  analytics, 
  selectedFarm,
  showAdvanced = false 
}) => {
  if (showAdvanced) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Phân Tích Nâng Cao</h3>
          <Badge variant="outline" className="text-sm">
            Dữ liệu thời gian thực
          </Badge>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="financial" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="financial">Tài Chính</TabsTrigger>
            <TabsTrigger value="expense">Chi Phí</TabsTrigger>
            <TabsTrigger value="activity">Hoạt Động</TabsTrigger>
            <TabsTrigger value="crop">Cây Trồng</TabsTrigger>
          </TabsList>

          <TabsContent value="financial" className="space-y-6">
            <div className="text-center py-8">
              <p className="text-gray-500">Financial Analytics - Coming Soon</p>
            </div>
          </TabsContent>

          <TabsContent value="expense" className="space-y-6">
            <div className="text-center py-8">
              <p className="text-gray-500">Expense Analytics - Coming Soon</p>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <div className="text-center py-8">
              <p className="text-gray-500">Activity Analytics - Coming Soon</p>
            </div>
          </TabsContent>

          <TabsContent value="crop" className="space-y-6">
            <div className="text-center py-8">
              <p className="text-gray-500">Crop Analytics - Coming Soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Thống Kê Chi Tiết</h3>
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Thống Kê Cây Trồng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Tổng số cây trồng:</span>
                <span className="font-medium">{analytics.crops.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Đang phát triển:</span>
                <span className="font-medium text-blue-600">{analytics.crops.active}</span>
              </div>
              <div className="flex justify-between">
                <span>Đã thu hoạch:</span>
                <span className="font-medium text-green-600">{analytics.crops.harvested}</span>
              </div>
              <div className="flex justify-between">
                <span>Tổng sản lượng:</span>
                <span className="font-medium">{analytics.crops.totalYield} kg</span>
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
                <span className="font-medium">{analytics.activities.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Đã hoàn thành:</span>
                <span className="font-medium text-green-600">{analytics.activities.completed}</span>
              </div>
              <div className="flex justify-between">
                <span>Chờ thực hiện:</span>
                <span className="font-medium text-yellow-600">{analytics.activities.pending}</span>
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
                  {analytics.finances.totalExpenses.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
              <div className="flex justify-between">
                <span>Đã thanh toán:</span>
                <span className="font-medium text-green-600">
                  {analytics.finances.paidExpenses.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
              <div className="flex justify-between">
                <span>Chưa thanh toán:</span>
                <span className="font-medium text-yellow-600">
                  {analytics.finances.pendingExpenses.toLocaleString('vi-VN')} VNĐ
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
                  {analytics.finances.estimatedRevenue.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
              <div className="flex justify-between">
                <span>Lợi nhuận ước tính:</span>
                <span className={`font-medium ${
                  analytics.finances.estimatedProfit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {analytics.finances.estimatedProfit.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

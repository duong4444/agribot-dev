"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Crop, DollarSign, TrendingUp } from 'lucide-react';
import { FarmAnalytics } from './types';

interface FarmOverviewProps {
  analytics: FarmAnalytics | null;
}

export const FarmOverview: React.FC<FarmOverviewProps> = ({ analytics }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Cây Trồng</CardTitle>
            <Crop className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.crops.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.crops.active || 0} đang phát triển
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoạt Động</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.activities.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.activities.completed || 0} đã hoàn thành
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Chi Phí</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.finances.totalExpenses?.toLocaleString('vi-VN') || 0} VNĐ
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.finances.pendingExpenses?.toLocaleString('vi-VN') || 0} VNĐ chưa thanh toán
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lợi Nhuận Ước Tính</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.finances.estimatedProfit?.toLocaleString('vi-VN') || 0} VNĐ
            </div>
            <p className="text-xs text-muted-foreground">
              Doanh thu: {analytics?.finances.estimatedRevenue?.toLocaleString('vi-VN') || 0} VNĐ
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

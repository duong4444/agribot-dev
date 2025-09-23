"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  Crop, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  PieChart as PieChartIcon,
  BarChart3,
  Leaf
} from 'lucide-react';

interface CropData {
  id: string;
  name: string;
  variety?: string;
  type: string;
  status: string;
  plantedArea?: number;
  plantCount?: number;
  plantingDate?: string;
  expectedHarvestDate?: string;
  actualHarvestDate?: string;
  expectedYield?: number;
  actualYield?: number;
  marketPrice?: number;
}

interface CropAnalyticsProps {
  crops: CropData[];
  period?: 'week' | 'month' | 'quarter' | 'year';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const STATUS_COLORS = {
  'PLANTED': '#3B82F6',
  'GROWING': '#10B981', 
  'READY_FOR_HARVEST': '#F59E0B',
  'HARVESTED': '#8B5CF6',
  'FAILED': '#EF4444'
};

const STATUS_LABELS = {
  'PLANTED': 'Đã trồng',
  'GROWING': 'Đang phát triển',
  'READY_FOR_HARVEST': 'Sẵn sàng thu hoạch',
  'HARVESTED': 'Đã thu hoạch',
  'FAILED': 'Thất bại'
};

export default function CropAnalytics({ crops, period = 'month' }: CropAnalyticsProps) {
  // Calculate crop statistics
  const totalCrops = crops.length;
  const plantedCrops = crops.filter(c => c.status === 'PLANTED').length;
  const growingCrops = crops.filter(c => c.status === 'GROWING').length;
  const readyCrops = crops.filter(c => c.status === 'READY_FOR_HARVEST').length;
  const harvestedCrops = crops.filter(c => c.status === 'HARVESTED').length;
  const failedCrops = crops.filter(c => c.status === 'FAILED').length;

  // Calculate total planted area
  const totalPlantedArea = crops.reduce((sum, crop) => sum + (crop.plantedArea || 0), 0);

  // Calculate total expected yield
  const totalExpectedYield = crops.reduce((sum, crop) => sum + (crop.expectedYield || 0), 0);

  // Calculate total actual yield
  const totalActualYield = crops.reduce((sum, crop) => sum + (crop.actualYield || 0), 0);

  // Calculate yield efficiency
  const yieldEfficiency = totalExpectedYield > 0 ? (totalActualYield / totalExpectedYield) * 100 : 0;

  // Calculate crops by type
  const cropsByType = crops.reduce((acc, crop) => {
    acc[crop.type] = (acc[crop.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate crops by status
  const cropsByStatus = crops.reduce((acc, crop) => {
    acc[crop.status] = (acc[crop.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate area by crop type
  const areaByType = crops.reduce((acc, crop) => {
    acc[crop.type] = (acc[crop.type] || 0) + (crop.plantedArea || 0);
    return acc;
  }, {} as Record<string, number>);

  // Calculate monthly planting trends
  const monthlyPlantingTrends = crops.reduce((acc, crop) => {
    if (crop.plantingDate) {
      const month = new Date(crop.plantingDate).toLocaleDateString('vi-VN', { 
        month: 'short', 
        year: 'numeric' 
      });
      acc[month] = (acc[month] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Get top crop types
  const topCropTypes = Object.entries(cropsByType)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Prepare data for charts
  const barChartData = topCropTypes.map(([type, count]) => ({
    type: type.replace('_', ' '),
    count,
    percentage: ((count / totalCrops) * 100).toFixed(1)
  }));

  const pieChartData = Object.entries(cropsByStatus).map(([status, count], index) => ({
    name: STATUS_LABELS[status as keyof typeof STATUS_LABELS],
    value: count,
    color: STATUS_COLORS[status as keyof typeof STATUS_COLORS]
  }));

  const areaChartData = Object.entries(areaByType)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([type, area]) => ({
      type: type.replace('_', ' '),
      area
    }));

  const lineChartData = Object.entries(monthlyPlantingTrends)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([month, count]) => ({
      month,
      count
    }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Cây Trồng</CardTitle>
            <Crop className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCrops}</div>
            <p className="text-xs text-muted-foreground">
              Tất cả cây trồng
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diện Tích Trồng</CardTitle>
            <Leaf className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalPlantedArea.toLocaleString('vi-VN')} m²
            </div>
            <p className="text-xs text-muted-foreground">
              Tổng diện tích
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Năng Suất Thực Tế</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalActualYield.toLocaleString('vi-VN')} kg
            </div>
            <p className="text-xs text-muted-foreground">
              Tổng sản lượng
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hiệu Suất</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {yieldEfficiency.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              So với dự kiến
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm font-medium">Đã trồng</span>
            </div>
            <div className="text-2xl font-bold mt-2">{plantedCrops}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm font-medium">Đang phát triển</span>
            </div>
            <div className="text-2xl font-bold mt-2">{growingCrops}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm font-medium">Sẵn sàng thu hoạch</span>
            </div>
            <div className="text-2xl font-bold mt-2">{readyCrops}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-sm font-medium">Đã thu hoạch</span>
            </div>
            <div className="text-2xl font-bold mt-2">{harvestedCrops}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm font-medium">Thất bại</span>
            </div>
            <div className="text-2xl font-bold mt-2">{failedCrops}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crop by Type - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Cây Trồng Theo Loại
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="type" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [
                    `${value} cây trồng`,
                    'Số lượng'
                  ]}
                />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Crop Status Distribution - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Phân Bố Trạng Thái
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [
                    `${value} cây trồng`,
                    'Số lượng'
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Area Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5" />
            Phân Bố Diện Tích Theo Loại Cây
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={areaChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="type" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis 
                tickFormatter={(value) => `${value}m²`}
              />
              <Tooltip 
                formatter={(value: number) => [
                  `${value.toLocaleString('vi-VN')} m²`,
                  'Diện tích'
                ]}
              />
              <Area 
                type="monotone" 
                dataKey="area" 
                stroke="#8884d8" 
                fill="#8884d8"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Planting Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Xu Hướng Trồng Cây Theo Tháng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [
                  `${value} cây trồng`,
                  'Số lượng'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Crop Types */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Loại Cây Trồng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topCropTypes.map(([type, count], index) => {
              const percentage = ((count / totalCrops) * 100).toFixed(1);
              const area = areaByType[type] || 0;
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <span className="font-medium">
                        {type.replace('_', ' ')}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {area.toLocaleString('vi-VN')} m²
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {percentage}%
                    </span>
                    <Badge variant="secondary">
                      {count} cây
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

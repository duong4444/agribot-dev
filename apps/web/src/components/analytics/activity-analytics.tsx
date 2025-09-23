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
  Line
} from 'recharts';
import { 
  Activity, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  PieChart as PieChartIcon
} from 'lucide-react';

interface ActivityData {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduledDate: string;
  actualDate?: string;
  duration?: number;
  cost?: number;
}

interface ActivityAnalyticsProps {
  activities: ActivityData[];
  period?: 'week' | 'month' | 'quarter' | 'year';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const STATUS_COLORS = {
  'PLANNED': '#3B82F6',
  'IN_PROGRESS': '#F59E0B', 
  'COMPLETED': '#10B981',
  'CANCELLED': '#EF4444'
};

const STATUS_LABELS = {
  'PLANNED': 'Kế hoạch',
  'IN_PROGRESS': 'Đang thực hiện',
  'COMPLETED': 'Hoàn thành',
  'CANCELLED': 'Hủy bỏ'
};

export default function ActivityAnalytics({ activities, period = 'month' }: ActivityAnalyticsProps) {
  // Calculate activity statistics
  const totalActivities = activities.length;
  const completedActivities = activities.filter(a => a.status === 'COMPLETED').length;
  const inProgressActivities = activities.filter(a => a.status === 'IN_PROGRESS').length;
  const plannedActivities = activities.filter(a => a.status === 'PLANNED').length;
  const cancelledActivities = activities.filter(a => a.status === 'CANCELLED').length;

  // Calculate completion rate
  const completionRate = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;

  // Calculate activities by type
  const activitiesByType = activities.reduce((acc, activity) => {
    acc[activity.type] = (acc[activity.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate activities by status
  const activitiesByStatus = activities.reduce((acc, activity) => {
    acc[activity.status] = (acc[activity.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate monthly activity trends
  const monthlyTrends = activities.reduce((acc, activity) => {
    const month = new Date(activity.scheduledDate).toLocaleDateString('vi-VN', { 
      month: 'short', 
      year: 'numeric' 
    });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate average duration
  const activitiesWithDuration = activities.filter(a => a.duration);
  const averageDuration = activitiesWithDuration.length > 0 
    ? activitiesWithDuration.reduce((sum, a) => sum + (a.duration || 0), 0) / activitiesWithDuration.length 
    : 0;

  // Get top activity types
  const topActivityTypes = Object.entries(activitiesByType)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Prepare data for charts
  const barChartData = topActivityTypes.map(([type, count]) => ({
    type: type.replace('_', ' '),
    count,
    percentage: ((count / totalActivities) * 100).toFixed(1)
  }));

  const pieChartData = Object.entries(activitiesByStatus).map(([status, count], index) => ({
    name: STATUS_LABELS[status as keyof typeof STATUS_LABELS],
    value: count,
    color: STATUS_COLORS[status as keyof typeof STATUS_COLORS]
  }));

  const lineChartData = Object.entries(monthlyTrends)
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
            <CardTitle className="text-sm font-medium">Tổng Hoạt Động</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActivities}</div>
            <p className="text-xs text-muted-foreground">
              Tất cả hoạt động
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tỷ Lệ Hoàn Thành</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {completedActivities}/{totalActivities} hoạt động
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang Thực Hiện</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressActivities}</div>
            <p className="text-xs text-muted-foreground">
              Hoạt động đang diễn ra
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Thời Gian TB</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageDuration.toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground">
              Mỗi hoạt động
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm font-medium">Kế hoạch</span>
            </div>
            <div className="text-2xl font-bold mt-2">{plannedActivities}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm font-medium">Đang thực hiện</span>
            </div>
            <div className="text-2xl font-bold mt-2">{inProgressActivities}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm font-medium">Hoàn thành</span>
            </div>
            <div className="text-2xl font-bold mt-2">{completedActivities}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm font-medium">Hủy bỏ</span>
            </div>
            <div className="text-2xl font-bold mt-2">{cancelledActivities}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity by Type - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Hoạt Động Theo Loại
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
                    `${value} hoạt động`,
                    'Số lượng'
                  ]}
                />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Status Distribution - Pie Chart */}
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
                    `${value} hoạt động`,
                    'Số lượng'
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Xu Hướng Hoạt Động Theo Tháng
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
                  `${value} hoạt động`,
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

      {/* Top Activity Types */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Loại Hoạt Động</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topActivityTypes.map(([type, count], index) => {
              const percentage = ((count / totalActivities) * 100).toFixed(1);
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">
                      {type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {percentage}%
                    </span>
                    <Badge variant="secondary">
                      {count} hoạt động
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

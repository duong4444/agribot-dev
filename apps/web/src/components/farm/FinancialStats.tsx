"use client";

import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfYear, subMonths, subYears } from 'date-fns';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface FinancialStatsProps {
  onDateRangeChange?: (startDate: string, endDate: string) => void;
}

type DateRange = 'this_month' | 'last_month' | 'this_year' | 'last_year';

export const FinancialStats: React.FC<FinancialStatsProps> = ({ onDateRangeChange }) => {
  const [selectedRange, setSelectedRange] = useState<DateRange>('this_month');
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getDateRange = (range: DateRange): { startDate: string; endDate: string } => {
    const now = new Date();
    let start: Date, end: Date;

    switch (range) {
      case 'this_month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case 'this_year':
        start = startOfYear(now);
        end = now;
        break;
      case 'last_year':
        const lastYear = subYears(now, 1);
        start = startOfYear(lastYear);
        end = new Date(lastYear.getFullYear(), 11, 31);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  };

  const fetchStats = async (range: DateRange) => {
    try {
      setIsLoading(true);
      const { startDate, endDate } = getDateRange(range);
      
      const response = await fetch(`/api/farms/stats?startDate=${startDate}&endDate=${endDate}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        
        if (onDateRangeChange) {
          onDateRangeChange(startDate, endDate);
        }
      }
    } catch (error) {
      console.error('Failed to fetch financial stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(selectedRange);
  }, [selectedRange]);

  const handleRangeChange = (value: DateRange) => {
    setSelectedRange(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Đang tải dữ liệu tài chính...</span>
      </div>
    );
  }

  const profit = stats?.profit || 0;
  const isProfitable = profit >= 0;

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Báo cáo tài chính</h3>
        <Select value={selectedRange} onValueChange={(value) => handleRangeChange(value as DateRange)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Chọn khoảng thời gian" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">Tháng này</SelectItem>
            <SelectItem value="last_month">Tháng trước</SelectItem>
            <SelectItem value="this_year">Năm nay</SelectItem>
            <SelectItem value="last_year">Năm ngoái</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng chi phí</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {(stats?.totalCost || 0).toLocaleString('vi-VN')} đ
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Chi phí gieo trồng, bón phân, thuốc...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(stats?.totalRevenue || 0).toLocaleString('vi-VN')} đ
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Thu nhập từ bán sản phẩm
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lợi nhuận</CardTitle>
            {isProfitable ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
              {profit.toLocaleString('vi-VN')} đ
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isProfitable ? 'Kinh doanh có lãi' : 'Kinh doanh lỗ'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Chi phí vs Doanh thu</CardTitle>
            <CardDescription>So sánh tổng chi phí và doanh thu</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  {
                    name: 'Tài chính',
                    'Chi phí': stats?.totalCost || 0,
                    'Doanh thu': stats?.totalRevenue || 0,
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => value.toLocaleString('vi-VN') + ' đ'}
                />
                <Legend />
                <Bar dataKey="Chi phí" fill="#ef4444" />
                <Bar dataKey="Doanh thu" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Xu hướng lợi nhuận</CardTitle>
            <CardDescription>Biểu đồ lợi nhuận theo thời gian</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={[
                  { name: 'Kỳ trước', profit: 0 },
                  { name: 'Hiện tại', profit: profit },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => value.toLocaleString('vi-VN') + ' đ'}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke={isProfitable ? '#22c55e' : '#ef4444'} 
                  strokeWidth={2}
                  name="Lợi nhuận"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {stats && stats.totalCost === 0 && stats.totalRevenue === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>Chưa có dữ liệu tài chính trong khoảng thời gian này.</p>
              <p className="text-sm mt-2">Hãy ghi nhận các hoạt động canh tác để theo dõi chi phí và doanh thu.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

"use client";

import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';
import { vi } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { MuiThemeProvider } from '@/components/providers/mui-theme-provider';

interface FinancialStatsProps {
  onDateRangeChange?: (startDate: string, endDate: string) => void;
}

type DateRangeType = 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'custom';

export const FinancialStats: React.FC<FinancialStatsProps> = ({ onDateRangeChange }) => {
  const [selectedRange, setSelectedRange] = useState<DateRangeType>('this_month');
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(endOfMonth(new Date()));

  const getDateRange = (range: DateRangeType): { startDate: string; endDate: string } | null => {
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
        end = endOfYear(now);
        break;
      case 'last_year':
        const lastYear = subYears(now, 1);
        start = startOfYear(lastYear);
        end = new Date(lastYear.getFullYear(), 11, 31);
        break;
      case 'custom':
        if (startDate && endDate) {
          start = startDate;
          end = endDate;
        } else {
          return null;
        }
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

  const fetchStats = async (range: DateRangeType) => {
    try {
      const dateRange = getDateRange(range);
      if (!dateRange) return;

      setIsLoading(true);
      const { startDate: start, endDate: end } = dateRange;
      
      const response = await fetch(`/api/farms/stats?startDate=${start}&endDate=${end}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        
        if (onDateRangeChange) {
          onDateRangeChange(start, end);
        }
      }
    } catch (error) {
      console.error('Failed to fetch financial stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRange !== 'custom' || (startDate && endDate)) {
      fetchStats(selectedRange);
    }
  }, [selectedRange, startDate, endDate]);

  const handleRangeChange = (value: DateRangeType) => {
    setSelectedRange(value);
  };

  if (isLoading && !stats) {
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
    <MuiThemeProvider>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
        <div className="space-y-6">
        {/* Date Range Filter */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-semibold">Báo cáo tài chính</h3>
            
            <Select value={selectedRange} onValueChange={(value) => handleRangeChange(value as DateRangeType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Chọn khoảng thời gian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">Tháng này</SelectItem>
                <SelectItem value="last_month">Tháng trước</SelectItem>
                <SelectItem value="this_year">Năm nay</SelectItem>
                <SelectItem value="last_year">Năm ngoái</SelectItem>
                <SelectItem value="custom">Tùy chọn...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedRange === 'custom' && (
            <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex-1">
                <DatePicker
                  label="Từ ngày"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                    },
                  }}
                />
              </div>

              <div className="flex-1">
                <DatePicker
                  label="Đến ngày"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  minDate={startDate || undefined}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                    },
                  }}
                />
              </div>
            </div>
          )}
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
                  margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
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
                  margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
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
    </LocalizationProvider>
    </MuiThemeProvider>
  );
};

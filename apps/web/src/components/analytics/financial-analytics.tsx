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
  LineChart,
  Line,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  Wallet
} from 'lucide-react';

interface ExpenseData {
  id: string;
  amount: number;
  type: string;
  expenseDate: string;
}

interface CropData {
  id: string;
  actualYield?: number;
  marketPrice?: number;
  actualHarvestDate?: string;
}

interface FinancialAnalyticsProps {
  expenses: ExpenseData[];
  crops: CropData[];
  period?: 'week' | 'month' | 'quarter' | 'year';
}

export default function FinancialAnalytics({ expenses, crops, period = 'month' }: FinancialAnalyticsProps) {
  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Calculate total revenue from crops
  const totalRevenue = crops.reduce((sum, crop) => {
    const revenue = (crop.actualYield || 0) * (crop.marketPrice || 0);
    return sum + revenue;
  }, 0);

  // Calculate net profit
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Calculate monthly financial trends
  const monthlyFinancials = expenses.reduce((acc, expense) => {
    const month = new Date(expense.expenseDate).toLocaleDateString('vi-VN', { 
      month: 'short', 
      year: 'numeric' 
    });
    if (!acc[month]) {
      acc[month] = { month, expenses: 0, revenue: 0, profit: 0 };
    }
    acc[month].expenses += expense.amount;
    return acc;
  }, {} as Record<string, { month: string; expenses: number; revenue: number; profit: number }>);

  // Add revenue data
  crops.forEach(crop => {
    if (crop.actualHarvestDate) {
      const month = new Date(crop.actualHarvestDate).toLocaleDateString('vi-VN', { 
        month: 'short', 
        year: 'numeric' 
      });
      if (monthlyFinancials[month]) {
        const revenue = (crop.actualYield || 0) * (crop.marketPrice || 0);
        monthlyFinancials[month].revenue += revenue;
      }
    }
  });

  // Calculate profit for each month
  Object.values(monthlyFinancials).forEach(monthData => {
    monthData.profit = monthData.revenue - monthData.expenses;
  });

  // Calculate expenses by type
  const expensesByType = expenses.reduce((acc, expense) => {
    acc[expense.type] = (acc[expense.type] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  // Get top expense categories
  const topExpenseCategories = Object.entries(expensesByType)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Prepare data for charts
  const barChartData = topExpenseCategories.map(([type, amount]) => ({
    type: type.replace('_', ' '),
    amount,
    percentage: ((amount / totalExpenses) * 100).toFixed(1)
  }));

  const lineChartData = Object.values(monthlyFinancials)
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  // Calculate ROI (Return on Investment)
  const roi = totalExpenses > 0 ? (netProfit / totalExpenses) * 100 : 0;

  // Calculate break-even point
  const averageMonthlyExpenses = Object.values(monthlyFinancials).length > 0 
    ? Object.values(monthlyFinancials).reduce((sum, month) => sum + month.expenses, 0) / Object.values(monthlyFinancials).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Doanh Thu</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalRevenue.toLocaleString('vi-VN')} VNĐ
            </div>
            <p className="text-xs text-muted-foreground">
              Từ bán sản phẩm
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Chi Phí</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totalExpenses.toLocaleString('vi-VN')} VNĐ
            </div>
            <p className="text-xs text-muted-foreground">
              Tất cả chi phí
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lợi Nhuận Ròng</CardTitle>
            <DollarSign className={`h-4 w-4 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netProfit.toLocaleString('vi-VN')} VNĐ
            </div>
            <p className="text-xs text-muted-foreground">
              {netProfit >= 0 ? 'Lãi' : 'Lỗ'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tỷ Suất Lợi Nhuận</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              So với doanh thu
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {roi.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Tỷ suất sinh lời
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chi Phí TB/Tháng</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageMonthlyExpenses.toLocaleString('vi-VN')} VNĐ
            </div>
            <p className="text-xs text-muted-foreground">
              Chi phí trung bình
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Điểm Hòa Vốn</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageMonthlyExpenses.toLocaleString('vi-VN')} VNĐ
            </div>
            <p className="text-xs text-muted-foreground">
              Doanh thu cần thiết
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Categories - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Chi Phí Theo Danh Mục
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
                <YAxis 
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  formatter={(value: number) => [
                    `${value.toLocaleString('vi-VN')} VNĐ`,
                    'Chi phí'
                  ]}
                />
                <Bar dataKey="amount" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Financial Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Xu Hướng Tài Chính
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis 
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString('vi-VN')} VNĐ`,
                    name === 'expenses' ? 'Chi phí' : 
                    name === 'revenue' ? 'Doanh thu' : 'Lợi nhuận'
                  ]}
                />
                <Bar dataKey="expenses" fill="#ef4444" name="expenses" />
                <Bar dataKey="revenue" fill="#10b981" name="revenue" />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Profit/Loss Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Xu Hướng Lợi Nhuận Theo Tháng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis 
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                formatter={(value: number) => [
                  `${value.toLocaleString('vi-VN')} VNĐ`,
                  'Lợi nhuận'
                ]}
              />
              <Area 
                type="monotone" 
                dataKey="profit" 
                stroke="#3b82f6" 
                fill="#3b82f6"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Expense Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Danh Mục Chi Phí</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topExpenseCategories.map(([type, amount], index) => {
              const percentage = ((amount / totalExpenses) * 100).toFixed(1);
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full bg-red-500" />
                    <span className="font-medium">
                      {type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {percentage}%
                    </span>
                    <Badge variant="destructive">
                      {amount.toLocaleString('vi-VN')} VNĐ
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

"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import { FarmData, NewExpenseData } from './types';

interface ExpensesSectionProps {
  selectedFarm: FarmData;
  newExpense: NewExpenseData;
  setNewExpense: (expense: NewExpenseData) => void;
  showCreateExpense: boolean;
  setShowCreateExpense: (show: boolean) => void;
  onCreateExpense: () => void;
}

export const ExpensesSection: React.FC<ExpensesSectionProps> = ({
  selectedFarm,
  newExpense,
  setNewExpense,
  showCreateExpense,
  setShowCreateExpense,
  onCreateExpense,
}) => {
  return (
    <>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quản Lý Chi Phí</h3>
        <Dialog open={showCreateExpense} onOpenChange={setShowCreateExpense}>
          <DialogTrigger asChild>
            <Button className="bg-agri-green-600 hover:bg-agri-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Thêm Chi Phí
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Thêm Chi Phí Mới</DialogTitle>
              <DialogDescription>
                Ghi nhận chi phí cho nông trại
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="expense-title">Tiêu Đề *</Label>
                  <Input
                    id="expense-title"
                    value={newExpense.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setNewExpense({ ...newExpense, title: e.target.value })
                    }
                    placeholder="VD: Mua hạt giống cà chua"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expense-type">Loại Chi Phí</Label>
                  <Select 
                    value={newExpense.type} 
                    onValueChange={(value: string) => setNewExpense({ ...newExpense, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SEEDS">Hạt Giống</SelectItem>
                      <SelectItem value="FERTILIZER">Phân Bón</SelectItem>
                      <SelectItem value="PESTICIDE">Thuốc Trừ Sâu</SelectItem>
                      <SelectItem value="EQUIPMENT">Thiết Bị</SelectItem>
                      <SelectItem value="LABOR">Nhân Công</SelectItem>
                      <SelectItem value="WATER">Nước Tưới</SelectItem>
                      <SelectItem value="ELECTRICITY">Điện</SelectItem>
                      <SelectItem value="FUEL">Nhiên Liệu</SelectItem>
                      <SelectItem value="TRANSPORTATION">Vận Chuyển</SelectItem>
                      <SelectItem value="MAINTENANCE">Bảo Trì</SelectItem>
                      <SelectItem value="OTHER">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expense-description">Mô Tả</Label>
                <Textarea
                  id="expense-description"
                  value={newExpense.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                    setNewExpense({ ...newExpense, description: e.target.value })
                  }
                  placeholder="Mô tả chi tiết về chi phí..."
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="expense-amount">Số Tiền (VNĐ) *</Label>
                  <Input
                    id="expense-amount"
                    type="number"
                    value={newExpense.amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setNewExpense({ ...newExpense, amount: e.target.value })
                    }
                    placeholder="100000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expense-quantity">Số Lượng</Label>
                  <Input
                    id="expense-quantity"
                    type="number"
                    value={newExpense.quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setNewExpense({ ...newExpense, quantity: e.target.value })
                    }
                    placeholder="10"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expense-unit">Đơn Vị</Label>
                  <Input
                    id="expense-unit"
                    value={newExpense.unit}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setNewExpense({ ...newExpense, unit: e.target.value })
                    }
                    placeholder="kg, lít, cái..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="expense-date">Ngày Chi Phí</Label>
                  <Input
                    id="expense-date"
                    type="date"
                    value={newExpense.expenseDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setNewExpense({ ...newExpense, expenseDate: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="supplier">Nhà Cung Cấp</Label>
                  <Input
                    id="supplier"
                    value={newExpense.supplier}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setNewExpense({ ...newExpense, supplier: e.target.value })
                    }
                    placeholder="Tên nhà cung cấp"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoice-number">Số Hóa Đơn</Label>
                <Input
                  id="invoice-number"
                  value={newExpense.invoiceNumber}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setNewExpense({ ...newExpense, invoiceNumber: e.target.value })
                  }
                  placeholder="HD001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expense-tags">Tags (phân cách bằng dấu phẩy)</Label>
                <Input
                  id="expense-tags"
                  value={newExpense.tags}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setNewExpense({ ...newExpense, tags: e.target.value })
                  }
                  placeholder="urgent, monthly, equipment"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateExpense(false)}>
                Hủy
              </Button>
              <Button onClick={onCreateExpense} disabled={!newExpense.title || !newExpense.amount}>
                Thêm Chi Phí
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {selectedFarm.expenses?.map((expense) => (
          <Card key={expense.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-lg font-medium">{expense.title}</h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                    <Badge variant="outline">{expense.type}</Badge>
                    <span>Số tiền: {expense.amount?.toLocaleString('vi-VN')} VNĐ</span>
                    {expense.supplier && <span>Nhà cung cấp: {expense.supplier}</span>}
                    {expense.expenseDate && (
                      <span>Ngày: {new Date(expense.expenseDate).toLocaleDateString('vi-VN')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={expense.status === 'PAID' ? 'default' : 'secondary'}>
                    {expense.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )) || []}
      </div>

      {(!selectedFarm.expenses || selectedFarm.expenses.length === 0) && (
        <Card className="text-center py-12">
          <CardContent>
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Chưa có chi phí nào
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Hãy ghi nhận chi phí đầu tiên
            </p>
            <Button
              onClick={() => setShowCreateExpense(true)}
              className="bg-agri-green-600 hover:bg-agri-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm Chi Phí Đầu Tiên
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
};

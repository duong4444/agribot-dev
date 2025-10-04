export interface FarmData {
  id: string;
  name: string;
  description?: string;
  location?: string;
  area?: number;
  type: string;
  status: string;
  createdAt: string;
  crops?: CropData[];
  activities?: ActivityData[];
  expenses?: ExpenseData[];
}

export interface ExpenseData {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  amount: number;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  expenseDate: string;
  supplier?: string;
  invoiceNumber?: string;
  tags?: string[];
  farmId: string;
  cropId?: string;
  activityId?: string;
}

export interface CropData {
  id: string;
  name: string;
  variety?: string;
  type: string;
  status: string;
  plantedArea?: number;
  plantCount?: number;
  plantingDate?: string;
  expectedHarvestDate?: string;
  actualYield?: number;
  marketPrice?: number;
}

export interface ActivityData {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduledDate: string;
  actualDate?: string;
  cost?: number;
  farmId: string;
  cropId?: string;
}

export interface FarmAnalytics {
  farm: {
    id: string;
    name: string;
    area: number;
    type: string;
  };
  crops: {
    total: number;
    active: number;
    harvested: number;
    totalYield: number;
  };
  activities: {
    total: number;
    completed: number;
    pending: number;
  };
  finances: {
    totalExpenses: number;
    paidExpenses: number;
    pendingExpenses: number;
    estimatedRevenue: number;
    estimatedProfit: number;
  };
}

export interface NewFarmData {
  name: string;
  description: string;
  location: string;
  area: string;
  type: string;
}

export interface NewCropData {
  name: string;
  variety: string;
  type: string;
  plantedArea: string;
  plantCount: string;
  plantingDate: string;
  expectedHarvestDate: string;
  expectedYield: string;
  marketPrice: string;
}

export interface NewActivityData {
  title: string;
  description: string;
  type: string;
  scheduledDate: string;
  duration: string;
  cost: string;
  cropId: string;
}

export interface NewExpenseData {
  title: string;
  description: string;
  type: string;
  amount: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  expenseDate: string;
  supplier: string;
  invoiceNumber: string;
  tags: string;
}

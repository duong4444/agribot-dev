"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FinancialStats } from '@/components/farm/FinancialStats';

export default function FarmFinancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Báo cáo tài chính</h2>
        <p className="text-muted-foreground">Theo dõi chi phí, doanh thu và lợi nhuận</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <FinancialStats />
        </CardContent>
      </Card>
    </div>
  );
}

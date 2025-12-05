import React from 'react';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';

export default function SubscriptionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Quản lý Gói cước</h2>
        <p className="text-muted-foreground">
          Xem thông tin gói dịch vụ và nâng cấp tài khoản.
        </p>
      </div>
      
      <SubscriptionCard />
    </div>
  );
}

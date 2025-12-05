"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

export const TrialBanner = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;

  // Only show for TRIAL status
  if (user?.subscriptionStatus !== "TRIAL") return null;

  // Calculate remaining days
  const expiryDate = user?.subscriptionExpiry ? new Date(user.subscriptionExpiry) : null;
  const now = new Date();
  const remainingDays = expiryDate 
    ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Don't show if expired
  if (remainingDays <= 0) return null;

  return (
    <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Crown className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                  Bạn đang dùng thử Premium
                </h3>
                <div className="flex items-center gap-1 text-yellow-600">
                  <Clock className="h-4 w-4" />
                  <span className="font-bold">Còn {remainingDays} ngày</span>
                </div>
              </div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Hãy nâng cấp ngay để tiếp tục sử dụng tính năng điều khiển IoT và nhận 200 credits/tháng!
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            className="shrink-0"
            onClick={() => router.push("/farm/subscription")}
          >
            Nâng cấp ngay
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

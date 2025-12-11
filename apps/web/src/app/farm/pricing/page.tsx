"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, CheckCircle, Star } from "lucide-react";

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  credits: number;
  durationDays: number;
  isActive: boolean;
  displayOrder: number;
  discountPercent: number | null;
  badgeText: string | null;
  isPopular: boolean;
}

export default function PricingPage() {
  const { data: session, update } = useSession();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const { toast } = useToast();

  const fetchProfile = async () => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/profile`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const current = session.user;
          const fresh = data.data;

          if (
            current.credits !== fresh.credits ||
            current.plan !== fresh.plan ||
            current.subscriptionStatus !== fresh.subscriptionStatus
          ) {
            await update({
              ...session,
              user: {
                ...session.user,
                ...fresh,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
    }
  };

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const res = await fetch("/api/subscription-plans");
      const data = await res.json();
      if (data.success) {
        // Sort by displayOrder
        const sortedPlans = data.data.sort(
          (a: SubscriptionPlan, b: SubscriptionPlan) => a.displayOrder - b.displayOrder
        );
        setPlans(sortedPlans);
      }
    } catch (error) {
      console.error("Failed to fetch plans", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách gói đăng ký",
        variant: "destructive",
      });
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    if (session?.accessToken) {
      fetchProfile();
    }
    fetchPlans();
  }, [session?.accessToken]);

  const user = session?.user;
  const isPremium =
    user?.plan === "PREMIUM" && user?.subscriptionStatus === "ACTIVE";

  const handleSubscribe = async (planCode: string) => {
    if (!session) {
      toast({
        title: "Lỗi",
        description: "Vui lòng đăng nhập để nâng cấp",
        variant: "destructive",
      });
      return;
    }

    setLoadingPlan(planCode);
    try {
      const response = await fetch("/api/payment/create-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "SUBSCRIPTION", planCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Có lỗi xảy ra");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Không nhận được link thanh toán");
      }
    } catch (error: any) {
      toast({
        title: "Lỗi thanh toán",
        description: error.message,
        variant: "destructive",
      });
      setLoadingPlan(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  };

  const formatDuration = (days: number) => {
    if (days >= 365) {
      const years = Math.floor(days / 365);
      return years === 1 ? "năm" : `${years} năm`;
    }
    if (days >= 30) {
      const months = Math.floor(days / 30);
      return months === 1 ? "tháng" : `${months} tháng`;
    }
    return `${days} ngày`;
  };

  const features = [
    "Điều khiển IoT không giới hạn",
    "Xem lịch sử cảm biến chi tiết",
    "Hỏi đáp AI thông minh",
    "Hỗ trợ 24/7",
  ];

  if (isPremium) {
    return (
      <div className="container py-12 flex justify-start items-start h-full">
        <div className="max-w-md w-full">
          <Card className="border-2 border-primary/50 bg-primary/5 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Crown className="h-6 w-6 text-yellow-500" />
                  Gói hiện tại
                </CardTitle>
                <Badge className="bg-primary text-primary-foreground">
                  PREMIUM
                </Badge>
              </div>
              <CardDescription>
                Trạng thái:{" "}
                <span className="font-medium text-foreground">
                  {user?.subscriptionStatus}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Credits còn lại
                    </p>
                    <p className="text-3xl font-bold">{user?.credits}</p>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Hỏi đáp AI</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Quyền lợi đang hưởng:</h4>
                <ul className="space-y-2 text-sm">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-sm text-muted-foreground pt-4 border-t">
                Hết hạn vào:{" "}
                {user?.subscriptionExpiry
                  ? new Date(user.subscriptionExpiry).toLocaleString("vi-VN")
                  : "Không xác định"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loadingPlans) {
    return (
      <div className="container py-12 flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="container py-12 flex justify-center items-center h-full">
        <div className="text-center text-muted-foreground">
          <p>Chưa có gói đăng ký nào được cấu hình.</p>
          <p className="text-sm">Vui lòng liên hệ quản trị viên.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-1">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">Chọn gói Premium phù hợp</h1>
        <p className="text-muted-foreground">
          Nâng cấp để sử dụng đầy đủ tính năng IoT và AI
        </p>
      </div>

      <div className={`grid gap-6 max-w-4xl mx-auto ${plans.length === 1 ? 'md:grid-cols-1 max-w-md' : plans.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`border-2 shadow-lg relative overflow-hidden flex flex-col ${
              plan.isPopular
                ? "border-primary bg-gradient-to-br from-primary/5 to-transparent"
                : "border-primary/20"
            }`}
          >
            {plan.badgeText && (
              <div className="absolute top-4 right-4">
                <Badge className="bg-yellow-500 text-yellow-900 flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {plan.badgeText}
                </Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                {plan.isPopular && <Crown className="h-6 w-6 text-yellow-500" />}
                {plan.name}
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="flex items-baseline mb-2">
                <span className="text-4xl font-extrabold">{formatPrice(Number(plan.price))}</span>
                <span className="text-gray-500 ml-1">/{formatDuration(plan.durationDays)}</span>
              </div>
              {plan.discountPercent && plan.durationDays >= 365 && (
                <p className="text-sm text-muted-foreground mb-4">
                  ~{formatPrice(Math.round(Number(plan.price) / 12))}/tháng
                </p>
              )}
              <div className={`mb-4 p-3 rounded-lg ${
                plan.isPopular
                  ? "bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800"
                  : "bg-blue-50 dark:bg-blue-950"
              }`}>
                <div className={`flex items-center gap-2 ${
                  plan.isPopular
                    ? "text-yellow-700 dark:text-yellow-300"
                    : "text-blue-700 dark:text-blue-300"
                }`}>
                  <Zap className="h-5 w-5" />
                  <span className="font-semibold">{plan.credits.toLocaleString()} Credits AI</span>
                </div>
                <p className={`text-sm mt-1 ${
                  plan.isPopular
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-blue-600 dark:text-blue-400"
                }`}>
                  Thời hạn {plan.durationDays} ngày
                </p>
              </div>
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <div className="mr-3 p-1 bg-green-100 dark:bg-green-900 rounded-full">
                      <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className={`w-full h-12 text-lg font-semibold ${
                  plan.isPopular
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    : ""
                }`}
                variant={plan.isPopular ? "default" : "outline"}
                onClick={() => handleSubscribe(plan.code)}
                disabled={loadingPlan !== null}
              >
                {loadingPlan === plan.code ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  `Mua ${plan.name}`
                )}
              </Button>
            </CardFooter>
            <div className="px-6 pb-6 text-center text-xs text-gray-400">
              Hỗ trợ thanh toán: Thẻ ATM (Napas), QR Code
              <div className="mt-2 text-[10px] text-gray-300">
                Secured by VNPAY
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

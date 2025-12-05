"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

export const SubscriptionCard = () => {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const user = session?.user;
  const isPremium = user?.plan === "PREMIUM" && user?.subscriptionStatus === "ACTIVE";

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/subscription/upgrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (!res.ok) {
        let errorMessage = "Upgrade failed";
        try {
          const errorData = await res.json();
          // NestJS exceptions return message as string or array of strings
          errorMessage = Array.isArray(errorData.message) 
            ? errorData.message.join(', ') 
            : errorData.message || errorData.error || "Upgrade failed";
        } catch (e) {
          errorMessage = await res.text() || res.statusText;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      
      toast({
        title: "Nâng cấp thành công!",
        description: "Bạn đã trở thành thành viên Premium.",
      });

      // Force refresh profile data
      await fetchProfile();
      
      router.refresh();
    } catch (error: any) {
      console.log("Upgrade error:", error);
      toast({
        title: "Lỗi nâng cấp",
        description: error instanceof Error ? error.message : "Đã có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          // Only update if data has changed
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
              }
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
    }
  };

  React.useEffect(() => {
    if (session?.accessToken) {
      fetchProfile();
    }
  }, [session?.accessToken]);

  if (!user) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Current Plan Info */}
      <Card className={isPremium ? "border-primary/50 bg-primary/5" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Crown className={`h-5 w-5 ${isPremium ? "text-yellow-500" : "text-muted-foreground"}`} />
              Gói hiện tại
            </CardTitle>
            <Badge variant={isPremium ? "default" : "secondary"}>
              {user.plan || "FREE"}
            </Badge>
          </div>
          <CardDescription>
            Trạng thái: <span className="font-medium text-foreground">{user.subscriptionStatus || "TRIAL"}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Credits còn lại</p>
                <p className="text-2xl font-bold">{user.credits}</p>
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Hỏi đáp AI</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Quyền lợi của bạn:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Tra cứu tài chính & Nhật ký canh tác</span>
              </li>
              <li className="flex items-center gap-2">
                {isPremium ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={isPremium ? "" : "text-muted-foreground"}>
                  Điều khiển thiết bị IoT & Xem cảm biến
                </span>
              </li>
              <li className="flex items-center gap-2">
                {isPremium ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={isPremium ? "" : "text-muted-foreground"}>
                  200 Credits hỏi đáp AI / tháng
                </span>
              </li>
            </ul>
          </div>
        </CardContent>
        {!isPremium && (
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={handleUpgrade} 
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Nâng cấp lên Premium (Miễn phí)
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Premium Benefits Info (Only show if not premium) */}
      {!isPremium && (
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-dashed">
          <CardHeader>
            <CardTitle>Tại sao nên nâng cấp?</CardTitle>
            <CardDescription>
              Mở khóa toàn bộ sức mạnh của AgriBot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex gap-3">
                <div className="mt-1">
                  <Zap className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <h4 className="font-medium">Điều khiển IoT không giới hạn</h4>
                  <p className="text-sm text-muted-foreground">
                    Bật tắt thiết bị, xem dữ liệu cảm biến realtime mọi lúc mọi nơi.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1">
                  <Crown className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <h4 className="font-medium">Trợ lý AI chuyên sâu</h4>
                  <p className="text-sm text-muted-foreground">
                    Nhận 200 credits mỗi tháng để hỏi đáp về kỹ thuật canh tác, sâu bệnh.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Settings, Cpu } from "lucide-react";
import { SensorDashboard } from "@/components/dashboard/SensorDashboard";
import { Badge } from "@/components/ui/badge";

interface Device {
  id: string;
  serialNumber: string;
  name: string;
  type: string;
  isActive: boolean;
}

interface AreaDetail {
  id: string;
  name: string;
  description: string;
  type: string;
  crop: string;
  devices: Device[];
}

export default function AreaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [area, setArea] = useState<AreaDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArea = async () => {
      try {
        const res = await fetch(`/api/farms/areas/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setArea(data);
        } else {
          console.error("Failed to fetch area");
        }
      } catch (error) {
        console.error("Error fetching area:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchArea();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!area) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-muted-foreground">Không tìm thấy khu vực</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{area.name}</h2>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            {area.type && <Badge variant="outline">{area.type}</Badge>}
            {area.crop && <span>• Cây trồng: {area.crop}</span>}
          </div>
        </div>
      </div>

      {area.description && (
        <p className="text-muted-foreground">{area.description}</p>
      )}

      {/* Sensor Dashboard */}
      <SensorDashboard areaId={area.id} />

      {/* Devices List */}
      <Card>
        <CardHeader>
          <CardTitle>Thiết bị trong khu vực</CardTitle>
          <CardDescription>Danh sách các cảm biến và bộ điều khiển</CardDescription>
        </CardHeader>
        <CardContent>
          {area.devices && area.devices.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {area.devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Cpu className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {device.serialNumber}
                      </p>
                    </div>
                  </div>
                  <Badge variant={device.isActive ? "default" : "secondary"}>
                    {device.isActive ? "Online" : "Offline"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có thiết bị nào được lắp đặt tại khu vực này.
              <br />
              <Button 
                variant="link" 
                onClick={() => router.push('/farm/installation-requests')}
                className="mt-2"
              >
                Yêu cầu lắp đặt thiết bị
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

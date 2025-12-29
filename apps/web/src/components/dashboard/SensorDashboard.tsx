"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplets, Sun, Thermometer, Wind, Clock, AlertTriangle } from "lucide-react";

interface SensorData {
  id: string;
  temperature: number;
  humidity: number;
  soilMoisture: number;
  lightLevel: number;
  timestamp: string;
  isFresh: boolean;        // Data < 5 minutes old
  minutesAgo: number;      // Minutes since reading
  device?: {
    name: string;
    area?: {
      name: string;
    };
  };
}

interface SensorDashboardProps {
  areaId: string;
}

export function SensorDashboard({ areaId }: SensorDashboardProps) {
  const [data, setData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Sensor Data
  useEffect(() => {
    const fetchData = async () => {
      if (!areaId) return;
      
      try { // iot controller
        const url = `/api/iot/sensors/latest?areaId=${areaId}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (error) {
        console.error("Failed to fetch sensor data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [areaId]);

  if (loading) {
    return <div>Đang tải dữ liệu cảm biến...</div>;
  }

  // Calculate averages or use latest reading
  const latest = data[0] || {
    temperature: 0,
    humidity: 0,
    soilMoisture: 0,
    lightLevel: 0,
    isFresh: true,
    minutesAgo: 0,
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Dữ liệu thời gian thực</h2>
        
        {/* Data freshness indicator */}
        {latest && !latest.isFresh && (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Cập nhật {latest.minutesAgo} phút trước
          </Badge>
        )}
      </div>
      
      {/* Stale data warning */}
      {latest && latest.minutesAgo > 10 && (
        <div className="flex items-start gap-3 p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Cảnh báo: Dữ liệu cũ
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
              Thiết bị chưa gửi dữ liệu trong {latest.minutesAgo} phút. Vui lòng kiểm tra kết nối thiết bị.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nhiệt độ</CardTitle>
            <Thermometer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest.temperature.toFixed(1)}°C</div>
            {/* <p className="text-xs text-muted-foreground">
              {data.length > 0 ? "Latest reading" : "No data"}
            </p> */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Độ ẩm không khí</CardTitle>
            <Wind className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest.humidity.toFixed(1)}%</div>
            {/* <p className="text-xs text-muted-foreground">
              Relative Humidity
            </p> */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Độ ẩm đất</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest.soilMoisture.toFixed(1)}%</div>
            {/* <p className="text-xs text-muted-foreground">
              Volumetric Water Content
            </p> */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mức độ sáng</CardTitle>
            <Sun className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest.lightLevel.toFixed(0)} Lux</div>
            {/* <p className="text-xs text-muted-foreground">
              Ambient Light
            </p> */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

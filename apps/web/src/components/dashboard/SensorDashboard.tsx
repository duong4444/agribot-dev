"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Thermometer, Droplets, Sun, Wind, RefreshCw } from 'lucide-react';

interface SensorData {
  id: string;
  device_id: string;
  temperature: number;
  humidity: number;
  soil_moisture: number;
  light_level: number;
  timestamp: string;
}

export function SensorDashboard() {
  const [data, setData] = useState<SensorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/iot/sensors/latest');
      if (res.ok) {
        const json = await res.json();
        // Assuming the API returns { success: true, data: [...] }
        // and we want the latest reading (first item if sorted DESC)
        if (json.data && json.data.length > 0) {
          setData(json.data[0]);
          setLastUpdated(new Date());
        }
      }
    } catch (error) {
      console.error('Failed to fetch sensor data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Đang tải dữ liệu cảm biến...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chưa có dữ liệu cảm biến</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Giám sát môi trường (Real-time)</h3>
        <div className="flex items-center text-sm text-muted-foreground">
          <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
          Cập nhật: {lastUpdated?.toLocaleTimeString('vi-VN')}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Temperature */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nhiệt độ</CardTitle>
            <Thermometer className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.temperature}°C</div>
            <p className="text-xs text-muted-foreground">
              Nhiệt độ không khí
            </p>
          </CardContent>
        </Card>

        {/* Humidity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Độ ẩm</CardTitle>
            <Droplets className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.humidity}%</div>
            <p className="text-xs text-muted-foreground">
              Độ ẩm không khí
            </p>
          </CardContent>
        </Card>

        {/* Soil Moisture */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Độ ẩm đất</CardTitle>
            <Wind className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.soil_moisture}%</div>
            <p className="text-xs text-muted-foreground">
              Cảm biến đất
            </p>
          </CardContent>
        </Card>

        {/* Light Level */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ánh sáng</CardTitle>
            <Sun className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.light_level} Lux</div>
            <p className="text-xs text-muted-foreground">
              Cường độ ánh sáng
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

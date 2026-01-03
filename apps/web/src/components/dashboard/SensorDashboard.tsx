"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplets, Sun, Thermometer, Wind, Clock, AlertTriangle } from "lucide-react";
import { io, Socket } from 'socket.io-client';

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
      id: string;
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
  // Ref để track polling interval (fallback)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // trigger re-render để update "X phút trước"
  const [, forceUpdate] = useState(0);

  // Fetch Sensor Data
  useEffect(() => {
    const fetchData = async () => {
      if (!areaId) return;
      
      try {
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

    // Initial fetch
    fetchData();

    // SocketIO tự xử lý protocol, tự upgrade lên ws://
    // Connect to WebSocket for real-time updates
    const newSocket = io('http://localhost:3000/iot', {
      transports: ['websocket'],
    });
    
    // Listen event cụ thể 'connect'
    newSocket.on('connect', () => {
      console.log('WebSocket connected (Sensor)');
      // Clear polling interval if it exists
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log('Stopped polling (WebSocket reconnected)');
      }
    });
    
    // Listen for sensor data updates with area filtering
    newSocket.onAny((eventName, newData: SensorData) => {
      console.log('WebSocket event received:', eventName);
      
      if (eventName.startsWith('sensor:')) {
        const deviceId = eventName.replace('sensor:', '');
        console.log('Sensor data:', {
          deviceId,
          currentAreaId: areaId,
          dataAreaId: newData.device?.area?.id,
          dataAreaName: newData.device?.area?.name,
          hasAreaInfo: !!newData.device?.area,
        });
        
        // Filter by area: Compare area.id with areaId prop
        const isFromCurrentArea = 
          newData.device?.area?.id === areaId ||
          // If no area info in data, accept it (user is viewing this area)
          !newData.device?.area;
        
        console.log('Filter result:', {
          isFromCurrentArea,
          reason: newData.device?.area?.id === areaId 
            ? 'Area ID match' 
            : !newData.device?.area 
              ? 'No area info (accepting)' 
              : 'Area ID mismatch'
        });
        
        if (isFromCurrentArea) {
          console.log(`Accepted sensor data from ${deviceId} (area: ${areaId})`);
          setData(prev => {
            console.log('Updating data state, prev length:', prev.length);
            // Update or add new sensor data
            const updated = [newData, ...prev.filter(d => d.id !== newData.id)];
            console.log('New data state length:', updated.length);
            return updated.slice(0, 10); // Keep latest 10 readings
          });
        } else {
          console.log(
            `Filtered out sensor data from ${deviceId} ` +
            `(area ID: ${newData.device?.area?.id}, current: ${areaId})`
          );
        }
      }
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected, falling back to polling');
      // Start polling only if not already polling
      if (!pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(fetchData, 10000);
        console.log('Started polling');
      }
    });

    return () => {
      newSocket.close();
      // Clean up polling interval on unmount
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [areaId]);

  // Force re-render every minute to update "X phút trước"
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(prev => prev + 1);
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div>Đang tải dữ liệu cảm biến...</div>;
  }

  // Calculate real-time freshness (not from backend)
  const calculateFreshness = (timestamp: string) => {
    const now = new Date().getTime();
    const dataTime = new Date(timestamp).getTime();
    const minutesAgo = Math.floor((now - dataTime) / 60000);
    const isFresh = minutesAgo < 5;
    return { minutesAgo, isFresh };
  };

  // Get latest reading with real-time freshness
  const latestData = data[0];
  const latest = latestData ? {
    ...latestData,
    ...calculateFreshness(latestData.timestamp),
  } : {
    temperature: 0,
    humidity: 0,
    soilMoisture: 0,
    lightLevel: 0,
    isFresh: true,
    minutesAgo: 0,
    timestamp: new Date().toISOString(),
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Dữ liệu thời gian thực</h2>
        
        {/* Data freshness indicator - Only show when data is 5+ minutes old */}
        {latest && latest.minutesAgo >= 5 && (
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

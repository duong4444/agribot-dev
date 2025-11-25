"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets, Sun, Thermometer, Wind } from "lucide-react";

interface SensorData {
  id: string;
  temperature: number;
  humidity: number;
  soilMoisture: number;
  lightLevel: number;
  timestamp: string;
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

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [areaId]);

  if (loading) {
    return <div>Loading sensor data...</div>;
  }

  // Calculate averages or use latest reading
  const latest = data[0] || {
    temperature: 0,
    humidity: 0,
    soilMoisture: 0,
    lightLevel: 0,
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Real-time Monitoring</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temperature</CardTitle>
            <Thermometer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest.temperature.toFixed(1)}°C</div>
            <p className="text-xs text-muted-foreground">
              {data.length > 0 ? "Latest reading" : "No data"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Humidity</CardTitle>
            <Wind className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest.humidity.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Relative Humidity
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Soil Moisture</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest.soilMoisture.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Volumetric Water Content
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Light Level</CardTitle>
            <Sun className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest.lightLevel.toFixed(0)} Lux</div>
            <p className="text-xs text-muted-foreground">
              Ambient Light
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

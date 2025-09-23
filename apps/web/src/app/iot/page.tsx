'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Thermometer, 
  Droplets, 
  Sun, 
  Activity, 
  Power, 
  PowerOff, 
  Settings,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface Sensor {
  id: string;
  name: string;
  type: string;
  status: string;
  location: string;
  lastReading: number;
  lastReadingTime: string;
  unit: string;
}

interface Device {
  id: string;
  name: string;
  type: string;
  status: string;
  location: string;
  isControllable: boolean;
  currentState: string;
}

interface SensorReading {
  id: string;
  value: number;
  unit: string;
  timestamp: string;
  isAlert: boolean;
  alertMessage?: string;
}

interface DeviceCommand {
  id: string;
  command: string;
  status: string;
  createdAt: string;
  executedAt?: string;
}

export default function IotDashboard() {
  const [selectedFarm, setSelectedFarm] = useState<string>('');
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [deviceCommands, setDeviceCommands] = useState<DeviceCommand[]>([]);
  const [mqttStatus, setMqttStatus] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Mock data for demonstration
  const mockSensors: Sensor[] = [
    {
      id: '1',
      name: 'Cảm biến độ ẩm đất 1',
      type: 'moisture',
      status: 'active',
      location: 'Khu A',
      lastReading: 65,
      lastReadingTime: new Date().toISOString(),
      unit: '%'
    },
    {
      id: '2',
      name: 'Cảm biến nhiệt độ',
      type: 'temperature',
      status: 'active',
      location: 'Khu A',
      lastReading: 28,
      lastReadingTime: new Date().toISOString(),
      unit: '°C'
    },
    {
      id: '3',
      name: 'Cảm biến ánh sáng',
      type: 'light',
      status: 'active',
      location: 'Khu B',
      lastReading: 850,
      lastReadingTime: new Date().toISOString(),
      unit: 'lux'
    }
  ];

  const mockDevices: Device[] = [
    {
      id: '1',
      name: 'Bơm tưới nước 1',
      type: 'pump',
      status: 'online',
      location: 'Khu A',
      isControllable: true,
      currentState: 'OFF'
    },
    {
      id: '2',
      name: 'Quạt thông gió',
      type: 'fan',
      status: 'online',
      location: 'Khu B',
      isControllable: true,
      currentState: 'ON'
    }
  ];

  useEffect(() => {
    // Load mock data
    setSensors(mockSensors);
    setDevices(mockDevices);
    setMqttStatus(true);
  }, []);

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'moisture':
        return <Droplets className="h-5 w-5 text-blue-500" />;
      case 'temperature':
        return <Thermometer className="h-5 w-5 text-red-500" />;
      case 'light':
        return <Sun className="h-5 w-5 text-yellow-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'pump':
        return <Droplets className="h-5 w-5 text-blue-500" />;
      case 'fan':
        return <Activity className="h-5 w-5 text-green-500" />;
      default:
        return <Settings className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'online':
        return <Badge variant="default" className="bg-green-500">Hoạt động</Badge>;
      case 'inactive':
      case 'offline':
        return <Badge variant="secondary">Không hoạt động</Badge>;
      case 'error':
        return <Badge variant="destructive">Lỗi</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDeviceControl = async (deviceId: string, command: string) => {
    setLoading(true);
    try {
      // Mock device control
      console.log(`Sending command ${command} to device ${deviceId}`);
      
      // Update device state
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? { ...device, currentState: command === 'pump_on' ? 'ON' : 'OFF' }
          : device
      ));
      
      // Add command to history
      const newCommand: DeviceCommand = {
        id: Date.now().toString(),
        command,
        status: 'executed',
        createdAt: new Date().toISOString(),
        executedAt: new Date().toISOString()
      };
      
      setDeviceCommands(prev => [newCommand, ...prev]);
      
    } catch (error) {
      console.error('Error controlling device:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">IoT Dashboard</h1>
          <p className="text-gray-600">Quản lý cảm biến và thiết bị nông trại</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {mqttStatus ? (
              <>
                <Wifi className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-600">MQTT Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-red-500" />
                <span className="text-sm text-red-600">MQTT Disconnected</span>
              </>
            )}
          </div>
          
          <Button onClick={() => setMqttStatus(!mqttStatus)}>
            {mqttStatus ? 'Disconnect' : 'Connect'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Tổng Quan</TabsTrigger>
          <TabsTrigger value="sensors">Cảm Biến</TabsTrigger>
          <TabsTrigger value="devices">Thiết Bị</TabsTrigger>
          <TabsTrigger value="analytics">Phân Tích</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Cảm Biến</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sensors.length}</div>
                <p className="text-xs text-muted-foreground">
                  {sensors.filter(s => s.status === 'active').length} đang hoạt động
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Thiết Bị</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{devices.length}</div>
                <p className="text-xs text-muted-foreground">
                  {devices.filter(d => d.status === 'online').length} đang online
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cảnh Báo</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">2</div>
                <p className="text-xs text-muted-foreground">
                  Cần chú ý
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Trạng Thái MQTT</CardTitle>
                {mqttStatus ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mqttStatus ? 'Connected' : 'Disconnected'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {mqttStatus ? 'Kết nối ổn định' : 'Mất kết nối'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cảm Biến Gần Đây</CardTitle>
                <CardDescription>Dữ liệu cảm biến mới nhất</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sensors.map((sensor) => (
                  <div key={sensor.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getSensorIcon(sensor.type)}
                      <div>
                        <p className="font-medium">{sensor.name}</p>
                        <p className="text-sm text-gray-500">{sensor.location}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{sensor.lastReading}{sensor.unit}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(sensor.lastReadingTime).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Thiết Bị Điều Khiển</CardTitle>
                <CardDescription>Trạng thái và điều khiển thiết bị</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {devices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getDeviceIcon(device.type)}
                      <div>
                        <p className="font-medium">{device.name}</p>
                        <p className="text-sm text-gray-500">{device.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(device.status)}
                      {device.isControllable && (
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant={device.currentState === 'ON' ? 'default' : 'outline'}
                            onClick={() => handleDeviceControl(device.id, 'pump_on')}
                            disabled={loading}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={device.currentState === 'OFF' ? 'default' : 'outline'}
                            onClick={() => handleDeviceControl(device.id, 'pump_off')}
                            disabled={loading}
                          >
                            <PowerOff className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sensors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Danh Sách Cảm Biến</CardTitle>
              <CardDescription>Quản lý và theo dõi cảm biến</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sensors.map((sensor) => (
                  <div key={sensor.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getSensorIcon(sensor.type)}
                      <div>
                        <h3 className="font-semibold">{sensor.name}</h3>
                        <p className="text-sm text-gray-500">
                          {sensor.type} • {sensor.location}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-bold text-xl">{sensor.lastReading}{sensor.unit}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(sensor.lastReadingTime).toLocaleString('vi-VN')}
                        </p>
                      </div>
                      {getStatusBadge(sensor.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Danh Sách Thiết Bị</CardTitle>
              <CardDescription>Quản lý và điều khiển thiết bị</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {devices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getDeviceIcon(device.type)}
                      <div>
                        <h3 className="font-semibold">{device.name}</h3>
                        <p className="text-sm text-gray-500">
                          {device.type} • {device.location}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-bold text-lg">{device.currentState}</p>
                        <p className="text-xs text-gray-500">Trạng thái hiện tại</p>
                      </div>
                      {getStatusBadge(device.status)}
                      {device.isControllable && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleDeviceControl(device.id, 'pump_on')}
                            disabled={loading}
                          >
                            Bật
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeviceControl(device.id, 'pump_off')}
                            disabled={loading}
                          >
                            Tắt
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Lịch Sử Điều Khiển</CardTitle>
                <CardDescription>Các lệnh điều khiển gần đây</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deviceCommands.slice(0, 5).map((command) => (
                    <div key={command.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="font-medium">{command.command}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(command.createdAt).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                      <Badge variant={command.status === 'executed' ? 'default' : 'secondary'}>
                        {command.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Thống Kê Cảm Biến</CardTitle>
                <CardDescription>Dữ liệu thống kê cảm biến</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Độ ẩm trung bình</span>
                    <span className="font-bold">65%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Nhiệt độ trung bình</span>
                    <span className="font-bold">28°C</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Ánh sáng trung bình</span>
                    <span className="font-bold">850 lux</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

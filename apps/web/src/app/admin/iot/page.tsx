"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Input } from '@/components/ui/input';
import {
  Leaf,
  LogOut,
  Shield,
  ArrowLeft,
  Search,
  Wifi,
  WifiOff,
  Thermometer,
  Droplets,
  Sun,
  Wind,
  Activity,
  Power,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Zap,
  RefreshCw,
  Download,
} from 'lucide-react';

// Mock data for IoT devices
const mockDevices = [
  {
    id: '1',
    name: 'Cảm biến độ ẩm đất #1',
    type: 'soil_moisture',
    location: 'Lô A - Nông trại An Giang',
    status: 'online',
    battery: 85,
    lastUpdate: '2024-01-20 14:35:00',
    value: 45,
    unit: '%',
    threshold: { min: 30, max: 70 },
    alerts: 0,
  },
  {
    id: '2',
    name: 'Cảm biến nhiệt độ #1',
    type: 'temperature',
    location: 'Lô A - Nông trại An Giang',
    status: 'online',
    battery: 92,
    lastUpdate: '2024-01-20 14:34:50',
    value: 28.5,
    unit: '°C',
    threshold: { min: 20, max: 35 },
    alerts: 0,
  },
  {
    id: '3',
    name: 'Cảm biến ánh sáng #1',
    type: 'light',
    location: 'Lô B - Nông trại Cần Thơ',
    status: 'online',
    battery: 78,
    lastUpdate: '2024-01-20 14:35:05',
    value: 75000,
    unit: 'lux',
    threshold: { min: 10000, max: 100000 },
    alerts: 0,
  },
  {
    id: '4',
    name: 'Bơm tưới #1',
    type: 'pump',
    location: 'Lô A - Nông trại An Giang',
    status: 'online',
    battery: 100,
    lastUpdate: '2024-01-20 14:35:02',
    value: 0,
    unit: 'ON/OFF',
    threshold: { min: 0, max: 1 },
    alerts: 0,
    isPump: true,
    pumpStatus: 'off',
  },
  {
    id: '5',
    name: 'Cảm biến độ ẩm không khí #1',
    type: 'humidity',
    location: 'Lô B - Nông trại Cần Thơ',
    status: 'offline',
    battery: 15,
    lastUpdate: '2024-01-20 12:20:00',
    value: 0,
    unit: '%',
    threshold: { min: 40, max: 80 },
    alerts: 2,
  },
];

export default function IoTDeviceManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [devices, setDevices] = useState(mockDevices);

  React.useEffect(() => {
    if (session && session.user?.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [session, router]);

  const handleTogglePump = (deviceId: string) => {
    setDevices(devices.map(device => {
      if (device.id === deviceId && device.isPump) {
        return {
          ...device,
          pumpStatus: device.pumpStatus === 'on' ? 'off' : 'on',
          lastUpdate: new Date().toLocaleString('vi-VN'),
        };
      }
      return device;
    }));
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = 
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || device.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'soil_moisture': return Droplets;
      case 'temperature': return Thermometer;
      case 'light': return Sun;
      case 'humidity': return Wind;
      case 'pump': return Activity;
      default: return Wifi;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'online') {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
          <Wifi className="h-3 w-3 mr-1" />
          Trực tuyến
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <WifiOff className="h-3 w-3 mr-1" />
        Ngoại tuyến
      </Badge>
    );
  };

  const getBatteryColor = (battery: number) => {
    if (battery >= 70) return 'text-green-600 dark:text-green-400';
    if (battery >= 30) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const isValueNormal = (device: any) => {
    if (device.status === 'offline') return false;
    return device.value >= device.threshold.min && device.value <= device.threshold.max;
  };

  if (!session || session.user?.role !== 'ADMIN') {
    return null;
  }

  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const offlineDevices = devices.filter(d => d.status === 'offline').length;
  const totalAlerts = devices.reduce((sum, d) => sum + d.alerts, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-agri-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="flex items-center gap-3 group">
                <div className="p-2 bg-gradient-to-br from-agri-green-500 to-agri-green-600 rounded-xl shadow-md">
                  <Leaf className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-agri-green-700 to-agri-green-600 dark:from-agri-green-400 dark:to-agri-green-300 bg-clip-text text-transparent">
                  AgriBot Admin
                </span>
              </Link>
              <Badge variant="destructive">
                <Shield className="h-3 w-3 mr-1" />
                ADMIN
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại Admin
              </Button>
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={() => router.push('/login')}>
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <Wifi className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Quản Lý Thiết Bị IoT
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Giám sát và điều khiển các thiết bị cảm biến trong nông trại
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-gray-200 dark:border-gray-700 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tổng thiết bị</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {devices.length}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Wifi className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Trực tuyến</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {onlineDevices}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Ngoại tuyến</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {offlineDevices}
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <WifiOff className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Cảnh báo</p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                    {totalAlerts}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Tìm kiếm thiết bị..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="online">Trực tuyến</option>
              <option value="offline">Ngoại tuyến</option>
            </select>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Xuất dữ liệu
            </Button>
          </div>
        </div>

        {/* Devices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDevices.map((device) => {
            const DeviceIcon = getDeviceIcon(device.type);
            const isNormal = isValueNormal(device);
            
            return (
              <Card
                key={device.id}
                className={`border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 ${
                  device.alerts > 0 ? 'border-l-4 border-l-orange-500' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        device.status === 'online' 
                          ? 'bg-blue-100 dark:bg-blue-900/20' 
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        <DeviceIcon className={`h-5 w-5 ${
                          device.status === 'online' 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{device.name}</CardTitle>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {device.location}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(device.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Value */}
                  {!device.isPump ? (
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Giá trị hiện tại</p>
                      <p className={`text-3xl font-bold ${
                        device.status === 'offline' 
                          ? 'text-gray-400' 
                          : isNormal 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                      }`}>
                        {device.status === 'offline' ? '--' : device.value}
                        <span className="text-sm ml-1">{device.unit}</span>
                      </p>
                      {device.status === 'online' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Ngưỡng: {device.threshold.min} - {device.threshold.max} {device.unit}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Trạng thái bơm</p>
                      <Badge 
                        variant={device.pumpStatus === 'on' ? 'default' : 'secondary'}
                        className={`text-lg px-4 py-2 ${
                          device.pumpStatus === 'on' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        {device.pumpStatus === 'on' ? 'ĐANG BẬT' : 'TẮT'}
                      </Badge>
                      {device.status === 'online' && (
                        <Button
                          onClick={() => handleTogglePump(device.id)}
                          className={`w-full mt-3 ${
                            device.pumpStatus === 'on'
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          <Power className="h-4 w-4 mr-2" />
                          {device.pumpStatus === 'on' ? 'Tắt bơm' : 'Bật bơm'}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Device Info */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Zap className={`h-4 w-4 ${getBatteryColor(device.battery)}`} />
                      <span className="text-gray-600 dark:text-gray-400">Pin:</span>
                      <span className={`font-semibold ${getBatteryColor(device.battery)}`}>
                        {device.battery}%
                      </span>
                    </div>
                    {device.alerts > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-gray-600 dark:text-gray-400">Cảnh báo:</span>
                        <span className="font-semibold text-orange-600 dark:text-orange-400">
                          {device.alerts}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Clock className="h-3 w-3" />
                    <span>Cập nhật: {device.lastUpdate}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Settings className="h-4 w-4 mr-1" />
                      Cấu hình
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredDevices.length === 0 && (
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Không tìm thấy thiết bị nào
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

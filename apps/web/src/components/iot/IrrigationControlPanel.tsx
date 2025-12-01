"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { Power, Droplets, Settings, Loader2, Clock } from 'lucide-react';

interface AutoConfig {
  enabled: boolean;
  moistureThreshold: number;
  irrigationDuration: number;
  cooldownPeriod: number;
}

interface IrrigationControlPanelProps {
  deviceId: string;
  onActionComplete?: () => void;
}

export function IrrigationControlPanel({ deviceId, onActionComplete }: IrrigationControlPanelProps) {
  const [loading, setLoading] = useState(false);
  const [autoConfig, setAutoConfig] = useState<AutoConfig | null>(null);
  const [durationInput, setDurationInput] = useState('600');
  const [configLoading, setConfigLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAutoConfig();
  }, [deviceId]);

  const fetchAutoConfig = async () => {
    try {
      setConfigLoading(true);
      const res = await fetch(`/api/iot/devices/${deviceId}/irrigation/auto-config`);
      if (res.ok) {
        const data = await res.json();
        setAutoConfig(data);
      }
    } catch (error) {
      console.error('Error fetching auto config:', error);
    } finally {
      setConfigLoading(false);
    }
  };

  const handleManualControl = async (action: 'on' | 'off') => {
    try {
      setLoading(true);
      const res = await fetch(`/api/iot/devices/${deviceId}/irrigation/${action}`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to control pump');

      toast({
        title: action === 'on' ? '✅ Đã bật máy bơm' : '🛑 Đã tắt máy bơm',
        description: `Lệnh điều khiển đã được gửi đến thiết bị`,
      });
      
      if (onActionComplete) {
        onActionComplete();
      }
    } catch (error) {
      toast({
        title: '❌ Lỗi',
        description: 'Không thể điều khiển máy bơm',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDurationIrrigation = async () => {
    const duration = parseInt(durationInput);
    if (duration < 60 || duration > 7200) {
      toast({
        title: '⚠️ Thời gian không hợp lệ',
        description: 'Thời gian tưới phải từ 60 đến 7200 giây (1 phút - 2 giờ)',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/iot/devices/${deviceId}/irrigation/duration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration }),
      });

      if (!res.ok) throw new Error('Failed to start irrigation');

      toast({
        title: '💧 Bắt đầu tưới',
        description: `Tưới trong ${Math.floor(duration / 60)} phút ${duration % 60} giây`,
      });

      if (onActionComplete) {
        onActionComplete();
      }
    } catch (error) {
      toast({
        title: '❌ Lỗi',
        description: 'Không thể bắt đầu tưới',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoMode = async (enabled: boolean) => {
    try {
      const res = await fetch(`/api/iot/devices/${deviceId}/irrigation/auto-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (!res.ok) throw new Error('Failed to toggle auto mode');

      const data = await res.json();
      setAutoConfig(data);

      toast({
        title: enabled ? '✅ Đã bật chế độ tự động' : '⏸️ Đã tắt chế độ tự động',
        description: enabled 
          ? `Tưới tự động khi độ ẩm < ${data.moistureThreshold}%`
          : 'Chỉ điều khiển thủ công',
      });

      if (onActionComplete) {
        onActionComplete();
      }
    } catch (error) {
      toast({
        title: '❌ Lỗi',
        description: 'Không thể thay đổi chế độ tự động',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateAutoConfig = async () => {
    if (!autoConfig) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/iot/devices/${deviceId}/irrigation/auto-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moistureThreshold: autoConfig.moistureThreshold,
          irrigationDuration: autoConfig.irrigationDuration,
          cooldownPeriod: autoConfig.cooldownPeriod,
        }),
      });

      if (!res.ok) throw new Error('Failed to update config');

      const data = await res.json();
      setAutoConfig(data);

      toast({
        title: '✅ Đã cập nhật cấu hình',
        description: 'Cấu hình tự động đã được lưu',
      });

      if (onActionComplete) {
        onActionComplete();
      }
    } catch (error) {
      toast({
        title: '❌ Lỗi',
        description: 'Không thể cập nhật cấu hình',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (configLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Manual Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5" />
            Điều khiển thủ công
          </CardTitle>
          <CardDescription>Bật/tắt máy bơm hoặc tưới theo thời gian</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => handleManualControl('on')}
              disabled={loading}
              className="flex-1"
              variant="default"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
              <span className="ml-2">Bật</span>
            </Button>
            <Button
              onClick={() => handleManualControl('off')}
              disabled={loading}
              className="flex-1"
              variant="outline"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
              <span className="ml-2">Tắt</span>
            </Button>
          </div>

          <div className="border-t pt-4">
            <Label htmlFor="duration">Tưới theo thời gian (giây)</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="duration"
                type="number"
                min="60"
                max="7200"
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                placeholder="600"
              />
              <Button onClick={handleDurationIrrigation} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Droplets className="h-4 w-4" />}
                <span className="ml-2">Tưới</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              60 - 7200 giây (1 phút - 2 giờ)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Auto Mode Configuration */}
      {autoConfig && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <CardTitle>Chế độ tự động</CardTitle>
              </div>
              <Switch
                checked={autoConfig.enabled}
                onCheckedChange={handleToggleAutoMode}
              />
            </div>
            <CardDescription>
              Tưới tự động khi độ ẩm đất thấp hơn ngưỡng
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ngưỡng độ ẩm</Label>
                <span className="text-sm font-medium">{autoConfig.moistureThreshold}%</span>
              </div>
              <Slider
                value={[autoConfig.moistureThreshold]}
                onValueChange={(value: number[]) =>
                  setAutoConfig({ ...autoConfig, moistureThreshold: value[0] })
                }
                min={0}
                max={100}
                step={5}
                disabled={!autoConfig.enabled}
              />
              <p className="text-xs text-muted-foreground">
                Tưới khi độ ẩm đất {'<'} {autoConfig.moistureThreshold}%
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auto-duration">Thời gian tưới mỗi lần (giây)</Label>
              <Input
                id="auto-duration"
                type="number"
                min="60"
                max="7200"
                value={autoConfig.irrigationDuration}
                onChange={(e) =>
                  setAutoConfig({
                    ...autoConfig,
                    irrigationDuration: parseInt(e.target.value) || 600,
                  })
                }
                disabled={!autoConfig.enabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cooldown">Thời gian chờ (giây)</Label>
              <Input
                id="cooldown"
                type="number"
                min="300"
                max="86400"
                value={autoConfig.cooldownPeriod}
                onChange={(e) =>
                  setAutoConfig({
                    ...autoConfig,
                    cooldownPeriod: parseInt(e.target.value) || 3600,
                  })
                }
                disabled={!autoConfig.enabled}
              />
              <p className="text-xs text-muted-foreground">
                Không tưới lại trong {Math.floor(autoConfig.cooldownPeriod / 60)} phút
              </p>
            </div>

            <Button
              onClick={handleUpdateAutoConfig}
              disabled={loading || !autoConfig.enabled}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Lưu cấu hình
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

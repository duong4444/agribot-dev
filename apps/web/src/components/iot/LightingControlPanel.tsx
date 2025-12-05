"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { Lightbulb, Settings, Loader2, Power } from 'lucide-react';

interface LightingAutoConfig {
  lightEnabled: boolean;
  lightThreshold: number;
}

interface LightingControlPanelProps {
  deviceId: string;
}

export function LightingControlPanel({ deviceId }: LightingControlPanelProps) {
  const [loading, setLoading] = useState(false);
  const [autoConfig, setAutoConfig] = useState<LightingAutoConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAutoConfig();
  }, [deviceId]);

  const fetchAutoConfig = async () => {
    try {
      setConfigLoading(true);
      const res = await fetch(`/api/iot/devices/${deviceId}/lighting/auto-config`);
      if (res.ok) {
        const data = await res.json();
        setAutoConfig(data);
      }
    } catch (error) {
      console.error('Error fetching lighting config:', error);
    } finally {
      setConfigLoading(false);
    }
  };

  const handleManualControl = async (action: 'on' | 'off') => {
    try {
      setLoading(true);
      const res = await fetch(`/api/iot/devices/${deviceId}/lighting/${action}`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to control light' }));
        throw new Error(errorData.message || 'Failed to control light');
      }

      toast({
        title: action === 'on' ? '💡 Đã bật đèn' : '🌑 Đã tắt đèn',
        description: action === 'off' && autoConfig?.lightEnabled 
          ? 'Đã tắt đèn và tắt chế độ tự động' 
          : 'Lệnh điều khiển đã được gửi',
      });

      // If turning off, refresh config as it might have disabled auto mode
      if (action === 'off') {
        fetchAutoConfig();
      }

    } catch (error: any) {
      toast({
        title: '❌ Lỗi',
        description: error.message || 'Không thể điều khiển đèn',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoMode = async (enabled: boolean) => {
    try {
      const res = await fetch(`/api/iot/devices/${deviceId}/lighting/auto-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to toggle auto mode' }));
        throw new Error(errorData.message || 'Failed to toggle auto mode');
      }

      const data = await res.json();
      setAutoConfig(prev => prev ? { ...prev, lightEnabled: data.lightEnabled } : null);

      toast({
        title: enabled ? '✅ Đã bật tự động' : '⏸️ Đã tắt tự động',
        description: enabled 
          ? `Đèn sẽ bật khi độ sáng < ${autoConfig?.lightThreshold} lux`
          : 'Chế độ tự động đã tắt',
      });
    } catch (error: any) {
      toast({
        title: '❌ Lỗi',
        description: error.message || 'Không thể thay đổi chế độ tự động',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateThreshold = async () => {
    if (!autoConfig) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/iot/devices/${deviceId}/lighting/auto-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threshold: autoConfig.lightThreshold,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to update threshold' }));
        throw new Error(errorData.message || 'Failed to update threshold');
      }

      toast({
        title: '✅ Đã cập nhật ngưỡng',
        description: `Ngưỡng độ sáng: ${autoConfig.lightThreshold} lux`,
      });
    } catch (error: any) {
      toast({
        title: '❌ Lỗi',
        description: error.message || 'Không thể cập nhật cấu hình',
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Điều khiển đèn
          </CardTitle>
          <CardDescription>Điều khiển đèn chiếu sáng khu vực</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Manual Control */}
          <div className="flex gap-2">
            <Button
              onClick={() => handleManualControl('on')}
              disabled={loading}
              className="flex-1"
              variant="default"
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Bật
            </Button>
            <Button
              onClick={() => handleManualControl('off')}
              disabled={loading}
              className="flex-1"
              variant="outline"
            >
              <Power className="h-4 w-4 mr-2" />
              Tắt
            </Button>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <Label>Tự động bật khi trời tối</Label>
              </div>
              <Switch
                checked={autoConfig?.lightEnabled || false}
                onCheckedChange={handleToggleAutoMode}
              />
            </div>

            {autoConfig && (
              <div className={`space-y-3 transition-opacity ${autoConfig.lightEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div className="flex items-center justify-between">
                  <Label>Ngưỡng độ sáng (Lux)</Label>
                  <span className="text-sm font-medium">{autoConfig.lightThreshold} lux</span>
                </div>
                <Slider
                  value={[autoConfig.lightThreshold]}
                  onValueChange={(value) => setAutoConfig({ ...autoConfig, lightThreshold: value[0] })}
                  min={0}
                  max={1000}
                  step={10}
                  onValueCommit={handleUpdateThreshold}
                />
                <p className="text-xs text-muted-foreground">
                  Đèn sẽ bật khi độ sáng môi trường thấp hơn {autoConfig.lightThreshold} lux
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

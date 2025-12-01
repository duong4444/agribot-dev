"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Droplets, Power, Settings, Clock, TrendingDown } from 'lucide-react';

interface IrrigationEvent {
  id: string;
  type: 'manual_on' | 'manual_off' | 'duration' | 'auto' | 'auto_config_update';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  plannedDuration?: number;
  actualDuration?: number;
  soilMoistureBefore?: number;
  soilMoistureAfter?: number;
  metadata?: any;
}

interface IrrigationHistoryProps {
  deviceId: string;
  limit?: number;
  refreshTrigger?: number;
}

export function IrrigationHistory({ deviceId, limit = 20, refreshTrigger = 0 }: IrrigationHistoryProps) {
  const [events, setEvents] = useState<IrrigationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();

    const interval = setInterval(() => {
      fetchHistory();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [deviceId, limit, refreshTrigger]);

  const fetchHistory = async () => {
    try {
      // Only show loading spinner if we don't have data yet
      if (events.length === 0) {
        setLoading(true);
      }
      const res = await fetch(`/api/iot/devices/${deviceId}/irrigation/history?limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching irrigation history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'manual_on':
      case 'manual_off':
        return <Power className="h-4 w-4" />;
      case 'duration':
        return <Clock className="h-4 w-4" />;
      case 'auto':
        return <Droplets className="h-4 w-4" />;
      case 'auto_config_update':
        return <Settings className="h-4 w-4" />;
      default:
        return <Droplets className="h-4 w-4" />;
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'manual_on':
        return 'Bật thủ công';
      case 'manual_off':
        return 'Tắt thủ công';
      case 'duration':
        return 'Tưới theo thời gian';
      case 'auto':
        return 'Tưới tự động';
      case 'auto_config_update':
        return 'Cập nhật cấu hình';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      running: 'default',
      completed: 'outline',
      failed: 'destructive',
      cancelled: 'secondary',
    };

    const labels: Record<string, string> = {
      pending: 'Đang chờ',
      running: 'Đang chạy',
      completed: 'Hoàn thành',
      failed: 'Thất bại',
      cancelled: 'Đã hủy',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}p ${secs}s`;
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lịch sử tưới</CardTitle>
        <CardDescription>
          {events.length} hoạt động gần đây
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Droplets className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Chưa có hoạt động tưới nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-4 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                <div className="mt-1 h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                  {getEventIcon(event.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {getEventLabel(event.type)}
                    </span>
                    {getStatusBadge(event.status)}
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-4">
                      <span>🕐 {formatDateTime(event.startTime)}</span>
                      {event.plannedDuration && (
                        <span>⏱️ {formatDuration(event.plannedDuration)}</span>
                      )}
                    </div>

                    {event.soilMoistureBefore !== undefined && event.soilMoistureBefore !== null && (
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          Trước: {event.soilMoistureBefore.toFixed(1)}%
                        </span>
                        {event.soilMoistureAfter !== undefined && event.soilMoistureAfter !== null && (
                          <span>
                            Sau: {event.soilMoistureAfter.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    )}

                    {event.actualDuration && event.actualDuration !== event.plannedDuration && (
                      <span className="text-orange-600 dark:text-orange-400">
                        Thực tế: {formatDuration(event.actualDuration)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

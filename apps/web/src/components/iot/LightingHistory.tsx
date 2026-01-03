"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lightbulb, Power, Settings, Calendar } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface LightingEvent {
  id: string;
  type: 'manual_on' | 'manual_off' | 'auto' | 'schedule' | 'auto_config_update';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  timestamp: string;
  lightLevelBefore?: number;
  lightLevelAfter?: number;
  metadata?: any;
}

interface LightingHistoryProps {
  deviceId: string;
  limit?: number;
  refreshTrigger?: number;
}

export function LightingHistory({ deviceId, limit = 20, refreshTrigger = 0 }: LightingHistoryProps) {
  const [events, setEvents] = useState<LightingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial fetch
    fetchHistory();

    // Connect to WebSocket
    const newSocket = io('http://localhost:3000/iot', {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected (Lighting)');
      // Clear polling interval if it exists
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log('Stopped polling (WebSocket reconnected)');
      }
    });

    newSocket.on(`lighting:${deviceId}`, (newEvent: LightingEvent) => {
      console.log('Received lighting event:', newEvent);
      setEvents(prev => {
        const updated = [newEvent, ...prev.filter(e => e.id !== newEvent.id)];
        return updated.slice(0, limit);
      });
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected, falling back to polling');
      // Start polling only if not already polling
      if (!pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(fetchHistory, 5000);
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
  }, [deviceId, limit, refreshTrigger]);

  const fetchHistory = async () => {
    try {
      // Only show loading spinner if we don't have data yet
      if (events.length === 0) {
        setLoading(true);
      }
      const res = await fetch(`/api/iot/devices/${deviceId}/lighting/history?limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching lighting history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'manual_on':
      case 'manual_off':
        return <Power className="h-4 w-4" />;
      case 'auto':
        return <Lightbulb className="h-4 w-4" />;
      case 'schedule':
        return <Calendar className="h-4 w-4" />;
      case 'auto_config_update':
        return <Settings className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'manual_on':
        return 'Bật thủ công';
      case 'manual_off':
        return 'Tắt thủ công';
      case 'auto':
        return 'Tự động';
      case 'schedule':
        return 'Theo lịch';
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
        <CardTitle>Lịch sử điều khiển đèn</CardTitle>
        <CardDescription>
          {events.length} hoạt động gần đây
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Chưa có hoạt động điều khiển đèn nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-4 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                <div className="mt-1 h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
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
                      <span>🕐 {formatDateTime(event.timestamp)}</span>
                    </div>

                    {event.lightLevelBefore !== undefined && event.lightLevelBefore !== null && (
                      <div className="flex items-center gap-4">
                        <span>
                          💡 Ánh sáng: {event.lightLevelBefore.toFixed(0)} lux
                        </span>
                        {event.lightLevelAfter !== undefined && event.lightLevelAfter !== null && (
                          <span>
                            → {event.lightLevelAfter.toFixed(0)} lux
                          </span>
                        )}
                      </div>
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

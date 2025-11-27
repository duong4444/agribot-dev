import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, Droplets, Wind, MapPin, Calendar } from 'lucide-react';

interface WeatherData {
  location: string;
  forecast: Array<{
    date: number;
    temp: number;
    humidity: number;
    condition: string;
    icon: string;
    windSpeed: number;
  }>;
}

interface WeatherWidgetProps {
  address: string;
}

export function WeatherWidget({ address }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      fetchWeather();
    }
  }, [address]);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use the proxy route which calls the backend's /weather/forecast endpoint
      const res = await fetch(`/api/weather?address=${encodeURIComponent(address)}&type=forecast`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch weather');
      }
      
      const data = await res.json();
      setWeather(data);
    } catch (error) {
      console.error('Error fetching weather:', error);
      setError(error instanceof Error ? error.message : 'Failed to load weather');
    } finally {
      setLoading(false);
    }
  };

  if (!address) return null;

  if (loading) {
    return (
      <Card className="h-full border-none shadow-sm bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Thời tiết
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[100px] text-muted-foreground">
            Đang tải dữ liệu thời tiết...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="h-full border-none shadow-sm bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Thời tiết
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[100px] text-muted-foreground text-sm">
            {error || 'Không tìm thấy thông tin thời tiết'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const today = weather.forecast[0];

  return (
    <Card className="h-full border-none shadow-sm bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">
            {weather.location}
          </CardTitle>
          <div className="flex items-center text-xs text-muted-foreground">
            <MapPin className="mr-1 h-3 w-3" />
            {address}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <img 
            src={`https://openweathermap.org/img/wn/${today.icon}@2x.png`}
            alt={today.condition}
            className="h-10 w-10"
          />
          <div className="text-right">
            <div className="text-2xl font-bold">{Math.round(today.temp)}°C</div>
            <p className="text-xs text-muted-foreground capitalize">{today.condition}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Droplets className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">Độ ẩm:</span>
            <span className="font-medium">{today.humidity}%</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wind className="h-4 w-4 text-slate-500" />
            <span className="text-muted-foreground">Gió:</span>
            <span className="font-medium">{today.windSpeed} m/s</span>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase">Dự báo 5 ngày tới</h4>
          <div className="grid grid-cols-5 gap-2 text-center">
            {weather.forecast.map((day) => (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">
                  {new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short' })}
                </span>
                <img 
                  src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                  alt={day.condition}
                  className="h-8 w-8"
                />
                <span className="text-xs font-bold">{Math.round(day.temp)}°</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

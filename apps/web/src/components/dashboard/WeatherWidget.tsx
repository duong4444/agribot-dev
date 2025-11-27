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
    <Card className="h-full border-none shadow-sm bg-blue-50/50 dark:bg-blue-950/20 overflow-hidden">
      <CardContent className="p-0 h-full">
        <div className="flex flex-col md:flex-row h-full">
          {/* Left Section: Current Weather (~35%) */}
          <div className="md:w-[35%] p-6 flex flex-col justify-between bg-blue-100/50 dark:bg-blue-900/20">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">{weather.location}</span>
              </div>
              <div className="text-xs text-muted-foreground pl-6">
                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>

            <div className="flex flex-col items-center my-4">
              <img 
                src={`https://openweathermap.org/img/wn/${today.icon}@4x.png`}
                alt={today.condition}
                className="h-24 w-24 drop-shadow-md"
              />
              <div className="text-5xl font-bold text-slate-800 dark:text-slate-100">
                {Math.round(today.temp)}°
              </div>
              <p className="text-lg font-medium text-blue-600 dark:text-blue-400 capitalize mt-1">
                {today.condition}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-auto">
              <div className="flex flex-col items-center p-2 bg-white/40 dark:bg-black/20 rounded-lg">
                <Droplets className="h-5 w-5 text-blue-500 mb-1" />
                <span className="text-xs text-muted-foreground">Độ ẩm</span>
                <span className="font-semibold">{today.humidity}%</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-white/40 dark:bg-black/20 rounded-lg">
                <Wind className="h-5 w-5 text-slate-500 mb-1" />
                <span className="text-xs text-muted-foreground">Gió</span>
                <span className="font-semibold">{today.windSpeed} m/s</span>
              </div>
            </div>
          </div>

          {/* Right Section: Forecast (~65%) */}
          <div className="md:w-[65%] p-6 flex flex-col">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dự báo 5 ngày tới
            </h4>
            
            <div className="grid grid-cols-5 gap-3 h-full items-center">
              {weather.forecast.map((day) => (
                <div key={day.date} className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 transition-colors group cursor-default">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                    {new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short' })}
                  </span>
                  <img 
                    src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
                    alt={day.condition}
                    className="h-12 w-12 group-hover:scale-110 transition-transform"
                  />
                  <div className="mt-2 text-center">
                    <span className="block text-lg font-bold text-slate-800 dark:text-slate-200">
                      {Math.round(day.temp)}°
                    </span>
                    <span className="text-[10px] text-muted-foreground line-clamp-1 px-1">
                      {day.condition}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5/weather';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('WEATHER_API_KEY') || '';
  }

  async getWeatherByAddress(address: string) {
    try {
      // Step 1: Use Geocoding API to get coordinates from address
      const geoResponse = await axios.get('http://api.openweathermap.org/geo/1.0/direct', {
        params: {
          q: address,
          limit: 1,
          appid: this.apiKey,
        },
      });

      if (!geoResponse.data || geoResponse.data.length === 0) {
        // Fallback: Try with just the city name
        const cityName = this.extractCityName(address);
        const fallbackGeoResponse = await axios.get('http://api.openweathermap.org/geo/1.0/direct', {
          params: {
            q: `${cityName},VN`,
            limit: 1,
            appid: this.apiKey,
          },
        });

        if (!fallbackGeoResponse.data || fallbackGeoResponse.data.length === 0) {
          this.logger.warn(`Location not found for address: ${address}`);
          return null;
        }

        const { lat, lon, name } = fallbackGeoResponse.data[0];
        return this.getWeatherByCoordinates(lat, lon, name);
      }

      const { lat, lon, name } = geoResponse.data[0];
      
      // Step 2: Use coordinates to get accurate weather
      return this.getWeatherByCoordinates(lat, lon, name);
    } catch (error) {
      this.logger.error(`Error fetching weather for address ${address}: ${error.message}`);
      return null;
    }
  }

  async getForecastByAddress(address: string) {
    try {
      // Step 1: Use Geocoding API to get coordinates from address
      const geoResponse = await axios.get('http://api.openweathermap.org/geo/1.0/direct', {
        params: {
          q: address,
          limit: 1,
          appid: this.apiKey,
        },
      });

      let lat, lon, name;

      if (!geoResponse.data || geoResponse.data.length === 0) {
        // Fallback: Try with just the city name
        const cityName = this.extractCityName(address);
        const fallbackGeoResponse = await axios.get('http://api.openweathermap.org/geo/1.0/direct', {
          params: {
            q: `${cityName},VN`,
            limit: 1,
            appid: this.apiKey,
          },
        });

        if (!fallbackGeoResponse.data || fallbackGeoResponse.data.length === 0) {
          this.logger.warn(`Location not found for address: ${address}`);
          return null;
        }

        lat = fallbackGeoResponse.data[0].lat;
        lon = fallbackGeoResponse.data[0].lon;
        name = fallbackGeoResponse.data[0].name;
      } else {
        lat = geoResponse.data[0].lat;
        lon = geoResponse.data[0].lon;
        name = geoResponse.data[0].name;
      }

      // Step 2: Use coordinates to get 5-day forecast
      const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric',
          lang: 'vi',
        },
      });

      // Process forecast data to get daily summary (OpenWeatherMap returns 3-hour intervals)
      // We'll pick one data point per day (e.g., around noon)
      const dailyForecasts: Array<{
        date: number;
        temp: number;
        humidity: number;
        condition: string;
        icon: string;
        windSpeed: number;
      }> = [];
      const seenDates = new Set();

      for (const item of response.data.list) {
        const date = new Date(item.dt * 1000).toLocaleDateString();
        if (!seenDates.has(date)) {
          dailyForecasts.push({
            date: item.dt * 1000, // timestamp in ms
            temp: item.main.temp,
            humidity: item.main.humidity,
            condition: item.weather[0].description,
            icon: item.weather[0].icon,
            windSpeed: item.wind.speed,
          });
          seenDates.add(date);
        }
        if (dailyForecasts.length >= 5) break;
      }

      return {
        location: name,
        forecast: dailyForecasts,
      };

    } catch (error) {
      this.logger.error(`Error fetching forecast for address ${address}: ${error.message}`);
      return null;
    }
  }

  private async getWeatherByCoordinates(lat: number, lon: number, locationName: string) {
    const response = await axios.get(this.baseUrl, {
      params: {
        lat,
        lon,
        appid: this.apiKey,
        units: 'metric',
        lang: 'vi',
      },
    });

    return {
      temp: response.data.main.temp,
      humidity: response.data.main.humidity,
      condition: response.data.weather[0].description,
      icon: response.data.weather[0].icon,
      windSpeed: response.data.wind.speed,
      location: locationName,
    };
  }

  private extractCityName(address: string): string {
    // Extract city name from Vietnamese address
    let cityName = address;
    
    if (address.includes(',')) {
      const parts = address.split(',');
      cityName = parts[parts.length - 1].trim();
    }
    
    // Normalize Vietnamese city names to English
    const cityMap: Record<string, string> = {
      'Hà Nội': 'Hanoi',
      'Hồ Chí Minh': 'Ho Chi Minh City',
      'Đà Nẵng': 'Da Nang',
      'Cần Thơ': 'Can Tho',
      'Hải Phòng': 'Hai Phong',
    };
    
    return cityMap[cityName] || cityName;
  }
}

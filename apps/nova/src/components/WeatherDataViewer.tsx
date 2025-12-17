import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Database, Cloud, Wind, Droplets, Eye, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { getSupabaseAnonKey, getEdgeFunctionUrl } from '../utils/supabase/config';

interface WeatherLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WeatherCurrent {
  id: string;
  location_id: string;
  timestamp: string;
  temp_c: number;
  temp_f: number;
  condition_text: string;
  condition_icon: string;
  wind_mph: number;
  wind_kph: number;
  wind_dir: string;
  pressure_mb: number;
  precip_mm: number;
  humidity: number;
  cloud: number;
  feelslike_c: number;
  feelslike_f: number;
  uv: number;
  created_at: string;
}

interface WeatherAirQuality {
  id: string;
  location_id: string;
  timestamp: string;
  co: number;
  no2: number;
  o3: number;
  so2: number;
  pm2_5: number;
  pm10: number;
  us_epa_index: number;
  gb_defra_index: number;
  created_at: string;
}

interface WeatherHourlyForecast {
  id: string;
  location_id: string;
  forecast_time: string;
  temp_c: number;
  temp_f: number;
  condition_text: string;
  condition_icon: string;
  wind_mph: number;
  wind_kph: number;
  wind_dir: string;
  pressure_mb: number;
  precip_mm: number;
  humidity: number;
  cloud: number;
  feelslike_c: number;
  feelslike_f: number;
  windchill_c: number;
  windchill_f: number;
  chance_of_rain: number;
  chance_of_snow: number;
  visibility_km: number;
  created_at: string;
}

interface WeatherDailyForecast {
  id: string;
  location_id: string;
  forecast_date: string;
  maxtemp_c: number;
  maxtemp_f: number;
  mintemp_c: number;
  mintemp_f: number;
  avgtemp_c: number;
  avgtemp_f: number;
  maxwind_mph: number;
  maxwind_kph: number;
  totalprecip_mm: number;
  totalsnow_cm: number;
  avghumidity: number;
  daily_chance_of_rain: number;
  daily_chance_of_snow: number;
  condition_text: string;
  condition_icon: string;
  uv: number;
  created_at: string;
}

interface WeatherAlert {
  id: string;
  location_id: string;
  headline: string;
  severity: string;
  urgency: string;
  areas: string;
  category: string;
  certainty: string;
  event: string;
  note: string;
  effective: string;
  expires: string;
  desc: string;
  instruction: string;
  created_at: string;
}

export function WeatherDataViewer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<WeatherLocation[]>([]);
  const [current, setCurrent] = useState<WeatherCurrent[]>([]);
  const [airQuality, setAirQuality] = useState<WeatherAirQuality[]>([]);
  const [hourly, setHourly] = useState<WeatherHourlyForecast[]>([]);
  const [daily, setDaily] = useState<WeatherDailyForecast[]>([]);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const baseUrl = getEdgeFunctionUrl('weather_dashboard');
      const headers = {
        'Authorization': `Bearer ${getSupabaseAnonKey()}`,
        'Content-Type': 'application/json',
      };

      // Fetch locations
      const locRes = await fetch(`${baseUrl}/weather/locations`, { headers });
      if (!locRes.ok) throw new Error(`Locations: ${locRes.status}`);
      const locData = await locRes.json();
      setLocations(locData);

      // Fetch current weather
      const currRes = await fetch(`${baseUrl}/weather/current`, { headers });
      if (!currRes.ok) throw new Error(`Current: ${currRes.status}`);
      const currData = await currRes.json();
      setCurrent(currData);

      // Fetch air quality
      const aqRes = await fetch(`${baseUrl}/weather/air-quality`, { headers });
      if (!aqRes.ok) throw new Error(`Air Quality: ${aqRes.status}`);
      const aqData = await aqRes.json();
      setAirQuality(aqData);

      // Fetch hourly forecasts (limited to first 24)
      const hourlyRes = await fetch(`${baseUrl}/weather/hourly-forecast?limit=24`, { headers });
      if (!hourlyRes.ok) throw new Error(`Hourly: ${hourlyRes.status}`);
      const hourlyData = await hourlyRes.json();
      setHourly(hourlyData);

      // Fetch daily forecasts
      const dailyRes = await fetch(`${baseUrl}/weather/daily-forecast`, { headers });
      if (!dailyRes.ok) throw new Error(`Daily: ${dailyRes.status}`);
      const dailyData = await dailyRes.json();
      setDaily(dailyData);

      // Fetch alerts
      const alertsRes = await fetch(`${baseUrl}/weather/alerts`, { headers });
      if (!alertsRes.ok) throw new Error(`Alerts: ${alertsRes.status}`);
      const alertsData = await alertsRes.json();
      setAlerts(alertsData);

    } catch (err) {
      console.error('Error fetching weather data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Database className="w-6 h-6" />
            Weather Data Backend Viewer
          </h1>
          <p className="text-muted-foreground">
            Viewing data stored in Supabase weather tables
          </p>
        </div>
        <Button onClick={fetchData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Data'}
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardContent className="pt-6">
            <p className="text-red-700 dark:text-red-300">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="summary" className="w-full">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="locations">Locations ({locations.length})</TabsTrigger>
          <TabsTrigger value="current">Current ({current.length})</TabsTrigger>
          <TabsTrigger value="air-quality">Air Quality ({airQuality.length})</TabsTrigger>
          <TabsTrigger value="hourly">Hourly ({hourly.length})</TabsTrigger>
          <TabsTrigger value="daily">Daily ({daily.length})</TabsTrigger>
          <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Tables Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Locations:</span>
                  <Badge>{locations.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Current Weather:</span>
                  <Badge>{current.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Air Quality:</span>
                  <Badge>{airQuality.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Hourly Forecasts:</span>
                  <Badge>{hourly.length} (showing 24)</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Daily Forecasts:</span>
                  <Badge>{daily.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Alerts:</span>
                  <Badge variant={alerts.length > 0 ? "destructive" : "secondary"}>
                    {alerts.length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {current.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="w-5 h-5" />
                    Current Weather
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Temperature:</span>
                    <span>{current[0].temp_c}°C / {current[0].temp_f}°F</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Condition:</span>
                    <span>{current[0].condition_text}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Humidity:</span>
                    <span>{current[0].humidity}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Wind:</span>
                    <span>{current[0].wind_kph} kph {current[0].wind_dir}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>UV Index:</span>
                    <span>{current[0].uv}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {airQuality.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wind className="w-5 h-5" />
                    Air Quality
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>US EPA Index:</span>
                    <Badge>{airQuality[0].us_epa_index}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>PM2.5:</span>
                    <span>{airQuality[0].pm2_5.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PM10:</span>
                    <span>{airQuality[0].pm10.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>O₃:</span>
                    <span>{airQuality[0].o3.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>NO₂:</span>
                    <span>{airQuality[0].no2.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          {locations.map((loc) => (
            <Card key={loc.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{loc.name}</span>
                  <Badge variant={loc.is_active ? "default" : "secondary"}>
                    {loc.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Coordinates</p>
                    <p>{loc.lat}, {loc.lon}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Country</p>
                    <p>{loc.country}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p>{formatTimestamp(loc.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Updated</p>
                    <p>{formatTimestamp(loc.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="current" className="space-y-4">
          {current.map((curr) => (
            <Card key={curr.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="w-5 h-5" />
                  Current Weather
                </CardTitle>
                <p className="text-muted-foreground">
                  {formatTimestamp(curr.timestamp)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-muted-foreground">Temperature</p>
                    <p>{curr.temp_c}°C / {curr.temp_f}°F</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Feels Like</p>
                    <p>{curr.feelslike_c}°C / {curr.feelslike_f}°F</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Condition</p>
                    <p>{curr.condition_text}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Humidity</p>
                    <p>{curr.humidity}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Wind</p>
                    <p>{curr.wind_kph} kph {curr.wind_dir}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pressure</p>
                    <p>{curr.pressure_mb} mb</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Precipitation</p>
                    <p>{curr.precip_mm} mm</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cloud Cover</p>
                    <p>{curr.cloud}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">UV Index</p>
                    <p>{curr.uv}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="air-quality" className="space-y-4">
          {airQuality.map((aq) => (
            <Card key={aq.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wind className="w-5 h-5" />
                  Air Quality Data
                </CardTitle>
                <p className="text-muted-foreground">
                  {formatTimestamp(aq.timestamp)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-muted-foreground">US EPA Index</p>
                    <Badge>{aq.us_epa_index}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">GB DEFRA Index</p>
                    <Badge>{aq.gb_defra_index}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">PM2.5</p>
                    <p>{aq.pm2_5.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">PM10</p>
                    <p>{aq.pm10.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">CO</p>
                    <p>{aq.co.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">NO₂</p>
                    <p>{aq.no2.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">O₃</p>
                    <p>{aq.o3.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">SO₂</p>
                    <p>{aq.so2.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="hourly" className="space-y-4">
          <p className="text-muted-foreground">Showing first 24 hours</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hourly.map((hour) => (
              <Card key={hour.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {formatTimestamp(hour.forecast_time)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Temp:</span>
                    <span>{hour.temp_c}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Condition:</span>
                    <span>{hour.condition_text}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rain Chance:</span>
                    <span>{hour.chance_of_rain}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Wind:</span>
                    <span>{hour.wind_kph} kph</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Humidity:</span>
                    <span>{hour.humidity}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="daily" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {daily.map((day) => (
              <Card key={day.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {day.forecast_date}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>High:</span>
                    <span>{day.maxtemp_c}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Low:</span>
                    <span>{day.mintemp_c}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg:</span>
                    <span>{day.avgtemp_c}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Condition:</span>
                    <span>{day.condition_text}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rain Chance:</span>
                    <span>{day.daily_chance_of_rain}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Precipitation:</span>
                    <span>{day.totalprecip_mm} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span>UV Index:</span>
                    <span>{day.uv}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No weather alerts</p>
              </CardContent>
            </Card>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.id} className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    {alert.headline}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline">{alert.severity}</Badge>
                    <Badge variant="outline">{alert.urgency}</Badge>
                    <Badge variant="outline">{alert.certainty}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-muted-foreground">Event</p>
                    <p>{alert.event}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Description</p>
                    <p>{alert.desc}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Areas</p>
                    <p>{alert.areas}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground">Effective</p>
                      <p>{formatTimestamp(alert.effective)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expires</p>
                      <p>{formatTimestamp(alert.expires)}</p>
                    </div>
                  </div>
                  {alert.instruction && (
                    <div>
                      <p className="text-muted-foreground">Instructions</p>
                      <p>{alert.instruction}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
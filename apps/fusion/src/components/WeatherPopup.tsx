import { Cloud, CloudRain, CloudSnow, Sun, CloudDrizzle, Droplets, Gauge, AlertTriangle, MapPin, MoreVertical } from 'lucide-react';

export interface WeatherPopupData {
  location: string;
  admin1?: string;
  country?: string;
  temperature: number;
  feelsLike?: number;
  condition: string;
  humidity?: number;
  uvIndex?: number;
  alerts?: Array<{
    type: string;
    description: string;
    severity?: 'low' | 'medium' | 'high';
  }>;
  lastUpdated?: string;
  icon?: string;
}

interface WeatherPopupProps {
  data: WeatherPopupData;
}

const getWeatherIcon = (condition: string = '', iconCode?: string) => {
  const lower = condition.toLowerCase();
  
  if (lower.includes('rain') || lower.includes('rainy')) {
    return <CloudRain className="w-8 h-8 text-blue-500" />;
  } else if (lower.includes('snow')) {
    return <CloudSnow className="w-8 h-8 text-blue-300" />;
  } else if (lower.includes('cloud') || lower.includes('overcast')) {
    return <Cloud className="w-8 h-8 text-gray-400" />;
  } else if (lower.includes('drizzle')) {
    return <CloudDrizzle className="w-8 h-8 text-blue-400" />;
  } else if (lower.includes('clear') || lower.includes('sunny') || lower.includes('sun')) {
    return <Sun className="w-8 h-8 text-yellow-500" />;
  }
  
  return <Sun className="w-8 h-8 text-gray-400" />;
};

const formatLastUpdated = (timestamp?: string) => {
  if (!timestamp) return null;
  
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } catch {
    return timestamp;
  }
};

export function WeatherPopup({ data }: WeatherPopupProps) {
  const {
    location,
    admin1,
    country,
    temperature,
    feelsLike,
    condition,
    humidity,
    uvIndex,
    alerts = [],
    lastUpdated,
    icon
  } = data;

  // Determine background gradient based on temperature
  const tempGradient = temperature > 75 
    ? 'from-orange-500 to-red-500' 
    : temperature > 60 
    ? 'from-yellow-400 to-orange-400'
    : temperature > 40
    ? 'from-blue-400 to-cyan-400'
    : 'from-blue-600 to-indigo-600';

  return (
    <div className="w-[340px] overflow-hidden rounded-lg shadow-xl">
      {/* Header with gradient background */}
      <div className={`bg-gradient-to-br ${tempGradient} px-4 py-5 text-white relative overflow-hidden`}>
        {/* Decorative circle */}
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        
        <div className="relative">
          <div className="flex items-start gap-2 mb-3">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 drop-shadow-md" />
            <div className="min-w-0 flex-1">
              <h3 className="text-white mb-0 drop-shadow-md">{location}</h3>
              <p className="text-xs text-white/90">
                {admin1 && country ? `${admin1}, ${country}` : admin1 || country || ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-5xl text-white drop-shadow-lg">
                {Math.round(temperature)}°
              </div>
              {feelsLike && Math.round(feelsLike) !== Math.round(temperature) && (
                <p className="text-sm text-white/90 mt-1">
                  Feels like {Math.round(feelsLike)}°
                </p>
              )}
              <p className="text-sm text-white/95 mt-1 capitalize">{condition || 'N/A'}</p>
            </div>
            <div className="drop-shadow-lg">
              {getWeatherIcon(condition, icon)}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white p-4">{/* Removed mb-3 div that was here */}

        {/* Weather Metrics */}
        {(humidity !== undefined || uvIndex !== undefined) && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {humidity !== undefined && (
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="bg-blue-500 rounded-md p-1.5">
                    <Droplets className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs text-blue-900">Humidity</span>
                </div>
                <div className="text-lg text-blue-950 ml-1">{humidity}%</div>
              </div>
            )}
            
            {uvIndex !== undefined && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="bg-amber-500 rounded-md p-1.5">
                    <Gauge className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs text-amber-900">UV Index</span>
                </div>
                <div className="text-lg text-amber-950 ml-1">{uvIndex}</div>
              </div>
            )}
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="border-t border-gray-200 pt-4 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-red-500 rounded-md p-1.5">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-red-900">
                Active Alerts
              </span>
              <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-2 py-0.5 rounded-full shadow-sm">
                {alerts.length}
              </span>
            </div>
            
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div key={index} className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-lg p-3 border-l-4 border-red-500 shadow-sm">
                  <div className="text-xs text-red-900 mb-1">
                    {alert.type}
                  </div>
                  <div className="text-xs text-red-800 leading-relaxed">
                    {alert.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Updated */}
        {lastUpdated && (
          <div className="border-t border-gray-100 pt-3 mt-1">
            <p className="text-xs text-gray-500 text-center">
              Last updated: {formatLastUpdated(lastUpdated)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

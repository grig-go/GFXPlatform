import { useState } from 'react';
import { Cloud, CloudRain, CloudSnow, Sun, CloudDrizzle, Droplets, Gauge, AlertTriangle, MapPin, ChevronDown, ChevronUp, Calendar, Clock, X, Wind, Eye } from 'lucide-react';

export interface DailyForecast {
  date: string;
  day: string;
  high: number;
  low: number;
  condition: string;
  icon?: string;
  sunrise?: string;
  sunset?: string;
  moon_phase?: string;
  uv_index_max?: number;
  precip_probability?: number;
  wind_speed?: number;
}

export interface HourlyForecast {
  time: string;
  temp: number;
  condition: string;
  icon?: string;
  feels_like?: number;
  humidity?: number;
  wind_speed?: number;
  precip_probability?: number;
  uv_index?: number;
}

export interface WeatherAlert {
  type: string;
  description: string;
  severity?: 'low' | 'medium' | 'high' | 'extreme' | 'moderate' | 'minor';
  headline?: string;
  urgency?: string;
  certainty?: string;
  start_time?: string;
  end_time?: string;
  areas?: string;
  instruction?: string;
}

export interface WeatherMarkerData {
  location: string;
  admin1?: string;
  country?: string;
  temperature: number;
  feelsLike?: number;
  condition: string;
  humidity?: number;
  uvIndex?: number;
  alerts?: WeatherAlert[];
  lastUpdated?: string;
  icon?: string;
  dailyForecast?: DailyForecast[];
  hourlyForecast?: HourlyForecast[];
}

interface WeatherMarkerProps {
  data: WeatherMarkerData;
}

const getWeatherIcon = (condition: string = '', iconCode?: string, size: 'small' | 'large' = 'small', color: string = 'text-white') => {
  const lower = condition.toLowerCase();
  const sizeClass = size === 'large' ? 'w-10 h-10' : 'w-5 h-5';
  
  if (lower.includes('rain') || lower.includes('rainy')) {
    return <CloudRain className={`${sizeClass} ${color} drop-shadow-lg`} />;
  } else if (lower.includes('snow')) {
    return <CloudSnow className={`${sizeClass} ${color} drop-shadow-lg`} />;
  } else if (lower.includes('cloud') || lower.includes('overcast')) {
    return <Cloud className={`${sizeClass} ${color} drop-shadow-lg`} />;
  } else if (lower.includes('drizzle')) {
    return <CloudDrizzle className={`${sizeClass} ${color} drop-shadow-lg`} />;
  } else if (lower.includes('clear') || lower.includes('sunny') || lower.includes('sun')) {
    return <Sun className={`${sizeClass} ${color} drop-shadow-lg`} />;
  }
  
  return <Sun className={`${sizeClass} ${color} drop-shadow-lg`} />;
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

export function WeatherMarker({ data }: WeatherMarkerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showingAlerts, setShowingAlerts] = useState(false);
  const [showingDaily, setShowingDaily] = useState(false);
  const [showingHourly, setShowingHourly] = useState(false);
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
    icon,
    dailyForecast = [],
    hourlyForecast = []
  } = data;

  // Determine background gradient based on temperature
  const tempGradient = temperature > 75 
    ? 'from-orange-400/90 via-red-400/90 to-pink-500/90' 
    : temperature > 60 
    ? 'from-yellow-300/90 via-amber-400/90 to-orange-400/90'
    : temperature > 40
    ? 'from-blue-300/90 via-cyan-400/90 to-teal-400/90'
    : 'from-blue-400/90 via-indigo-500/90 to-purple-500/90';

  if (!isExpanded) {
    // Compact glassmorphism view
    return (
      <div 
        className="group relative cursor-pointer transition-all duration-300 hover:scale-105"
        onClick={() => setIsExpanded(true)}
      >
        {/* Glassmorphism container */}
        <div className="relative backdrop-blur-xl bg-white/80 rounded-2xl border border-white/50 shadow-2xl overflow-hidden">
          {/* Glass shine effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent"></div>
          
          {/* Content */}
          <div className="relative flex items-center gap-3 px-4 py-3">
            {/* Weather icon */}
            <div className="relative">
              {getWeatherIcon(condition, icon, 'small', 'text-gray-700')}
            </div>
            
            {/* Location and temp */}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm truncate max-w-[100px] text-gray-900 font-medium">
                {location}
              </span>
              <span className="text-2xl text-gray-900 font-light tracking-tight">
                {Math.round(temperature)}°
              </span>
            </div>
            
            {/* Alert indicator with pulse */}
            {alerts.length > 0 && (
              <div className="relative">
                <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-75"></div>
                <div className="relative bg-red-500 rounded-full w-3 h-3 border-2 border-white shadow-lg"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If showing alerts view
  if (showingAlerts) {
    return (
      <div className="w-[220px] overflow-hidden rounded-2xl shadow-2xl">
        {/* Glassmorphism header */}
        <div className="relative backdrop-blur-xl bg-gradient-to-br from-red-500/90 to-red-600/90 px-4 py-4 text-white overflow-hidden border-b border-white/20">
          {/* Decorative glass elements */}
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent"></div>
          
          <div className="relative flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 drop-shadow-lg" />
              <div className="min-w-0 flex-1">
                <h2 className="text-white drop-shadow-lg tracking-tight">Weather Alerts</h2>
                <p className="text-xs text-white/80 mt-0.5">{location}</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowingAlerts(false);
              }}
              className="text-white/80 hover:text-white transition-colors backdrop-blur-sm bg-white/10 rounded-lg p-1 hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alerts List with glass background */}
        <div className="backdrop-blur-xl bg-white/95 p-3 max-h-[320px] overflow-y-auto">
          {alerts.length > 0 ? (
            alerts.map((alert, index) => {
              const getSeverityColor = (severity?: string) => {
                const sev = severity?.toLowerCase();
                if (sev === 'extreme' || sev === 'high') return { 
                  border: 'border-red-400', 
                  text: 'text-red-700', 
                  bg: 'from-red-100/80 via-red-50/80 to-transparent',
                  badge: 'bg-red-500 text-white'
                };
                if (sev === 'severe' || sev === 'moderate' || sev === 'medium') return { 
                  border: 'border-orange-400', 
                  text: 'text-orange-700', 
                  bg: 'from-orange-100/80 via-orange-50/80 to-transparent',
                  badge: 'bg-orange-500 text-white'
                };
                return { 
                  border: 'border-yellow-400', 
                  text: 'text-yellow-700', 
                  bg: 'from-yellow-100/80 via-yellow-50/80 to-transparent',
                  badge: 'bg-yellow-500 text-white'
                };
              };
              
              const colors = getSeverityColor(alert.severity);
              
              return (
                <div key={index} className={`mb-3 last:mb-0 backdrop-blur-sm bg-gradient-to-br ${colors.bg} rounded-xl p-3 border-l-4 ${colors.border} shadow-lg`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2 flex-1">
                      <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${colors.text}`} />
                      <span className="text-xs ${colors.text}">{alert.type}</span>
                    </div>
                    {alert.severity && (
                      <span className={`text-[9px] px-2 py-1 rounded-full uppercase font-medium ${colors.badge} shadow-md`}>
                        {alert.severity}
                      </span>
                    )}
                  </div>
                  
                  {alert.headline && (
                    <p className={`text-[10px] ${colors.text} mb-2 font-medium`}>{alert.headline}</p>
                  )}
                  
                  {alert.description && (
                    <p className="text-[10px] text-gray-700 leading-relaxed mb-2">{alert.description}</p>
                  )}
                  
                  {alert.instruction && (
                    <div className="mt-2 pt-2 border-t border-white/30">
                      <p className="text-[9px] text-gray-600 italic">{alert.instruction}</p>
                    </div>
                  )}
                  
                  {(alert.start_time || alert.end_time) && (
                    <div className="mt-2 flex items-center gap-1 text-[9px] text-gray-600">
                      <Clock className="w-3 h-3" />
                      {alert.start_time && <span>{new Date(alert.start_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
                      {alert.start_time && alert.end_time && <span>→</span>}
                      {alert.end_time && <span>{new Date(alert.end_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center text-sm text-gray-500 py-8 backdrop-blur-sm bg-white/50 rounded-xl">
              No active alerts
            </div>
          )}
        </div>
      </div>
    );
  }

  // If showing daily forecast view
  if (showingDaily) {
    return (
      <div className="w-[220px] overflow-hidden rounded-2xl shadow-2xl">
        {/* Glassmorphism header - white with black text */}
        <div className="relative backdrop-blur-xl bg-white/80 px-4 py-4 overflow-hidden border-b border-gray-200/50">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-gray-100/30 rounded-full blur-3xl"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent"></div>
          
          <div className="relative flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-700" />
              <div className="min-w-0 flex-1">
                <h2 className="text-gray-900 tracking-tight">7-Day Forecast</h2>
                <p className="text-xs text-gray-600 mt-0.5">{location}</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowingDaily(false);
              }}
              className="text-gray-500 hover:text-gray-900 transition-colors backdrop-blur-sm bg-gray-100/50 rounded-lg p-1 hover:bg-gray-200/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Daily Forecast List */}
        <div className="backdrop-blur-xl bg-white/95 p-3 max-h-[320px] overflow-y-auto">
          {dailyForecast.length > 0 ? (
            dailyForecast.map((day, index) => (
              <div key={index} className="mb-2 last:mb-0 backdrop-blur-sm bg-white/90 rounded-xl p-3 border border-gray-200/70 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-900 font-medium">{day.day}</span>
                    {getWeatherIcon(day.condition, day.icon, 'small', 'text-gray-700')}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 font-medium">{Math.round(day.high)}°</span>
                    <span className="text-sm text-gray-500">{Math.round(day.low)}°</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-600 capitalize">{day.condition}</p>
              </div>
            ))
          ) : (
            <div className="text-center text-sm text-gray-500 py-8 backdrop-blur-sm bg-white/50 rounded-xl">
              No forecast data available
            </div>
          )}
        </div>
      </div>
    );
  }

  // If showing hourly forecast view
  if (showingHourly) {
    return (
      <div className="w-[220px] overflow-hidden rounded-2xl shadow-2xl">
        {/* Glassmorphism header - white with black text */}
        <div className="relative backdrop-blur-xl bg-white/80 px-4 py-4 overflow-hidden border-b border-gray-200/50">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-gray-100/30 rounded-full blur-3xl"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent"></div>
          
          <div className="relative flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-700" />
              <div className="min-w-0 flex-1">
                <h2 className="text-gray-900 tracking-tight">Hourly Forecast</h2>
                <p className="text-xs text-gray-600 mt-0.5">{location}</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowingHourly(false);
              }}
              className="text-gray-500 hover:text-gray-900 transition-colors backdrop-blur-sm bg-gray-100/50 rounded-lg p-1 hover:bg-gray-200/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hourly Forecast List */}
        <div className="backdrop-blur-xl bg-white/95 p-3 max-h-[320px] overflow-y-auto">
          {hourlyForecast.length > 0 ? (
            hourlyForecast.map((hour, index) => (
              <div key={index} className="mb-2 last:mb-0 backdrop-blur-sm bg-white/90 rounded-xl p-3 border border-gray-200/70 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-900 font-medium">{hour.time}</span>
                    {getWeatherIcon(hour.condition, hour.icon, 'small', 'text-gray-700')}
                  </div>
                  <span className="text-sm text-gray-900 font-medium">{Math.round(hour.temp)}°</span>
                </div>
                <p className="text-[10px] text-gray-600 mt-1 capitalize">{hour.condition}</p>
              </div>
            ))
          ) : (
            <div className="text-center text-sm text-gray-500 py-8 backdrop-blur-sm bg-white/50 rounded-xl">
              No hourly forecast data available
            </div>
          )}
        </div>
      </div>
    );
  }

  // Expanded glassmorphism view
  return (
    <div className="w-[220px] overflow-hidden rounded-2xl shadow-2xl">
      {/* Glassmorphism header - white with black text */}
      <div className="relative backdrop-blur-xl bg-white/80 px-4 py-5 overflow-hidden border-b border-gray-200/50">
        {/* Decorative glass elements */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-gray-100/30 rounded-full blur-3xl"></div>
        <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-gray-50/20 rounded-full blur-2xl"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent"></div>
        
        <div className="relative">
          {/* Location header with close button */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-gray-700" />
              <div className="min-w-0 flex-1">
                <h2 className="text-gray-900 tracking-tight leading-tight">{location}</h2>
                {admin1 && (
                  <p className="text-xs text-gray-600 mt-0.5">{admin1}</p>
                )}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
                setShowingAlerts(false);
                setShowingDaily(false);
                setShowingHourly(false);
              }}
              className="text-gray-500 hover:text-gray-900 transition-colors backdrop-blur-sm bg-gray-100/50 rounded-lg p-1 hover:bg-gray-200/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Temperature and Icon - Main Focus */}
          <div className="flex items-start justify-between">
            <div>
              <div className="text-6xl text-gray-900 font-light tracking-tighter" style={{ lineHeight: '1' }}>
                {Math.round(temperature)}°
              </div>
              <p className="text-sm text-gray-700 capitalize mt-2">{condition || 'N/A'}</p>
              {feelsLike !== undefined && (
                <p className="text-xs text-gray-600 mt-1">Feels like {Math.round(feelsLike)}°</p>
              )}
            </div>
            <div className="mt-2">
              {getWeatherIcon(condition, icon, 'large', 'text-gray-700')}
            </div>
          </div>
        </div>
      </div>

      {/* Content with glassmorphism */}
      <div className="backdrop-blur-xl bg-white/95 p-3">
        {/* Weather Metrics */}
        {(humidity !== undefined || uvIndex !== undefined) && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {humidity !== undefined && (
              <div className="backdrop-blur-sm bg-white/90 border border-gray-200/70 rounded-xl p-3 shadow-md">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="bg-gray-800 rounded-lg p-1.5 shadow-md">
                    <Droplets className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[10px] text-gray-700 font-medium">Humidity</span>
                </div>
                <div className="text-lg text-gray-900 font-medium">{humidity}%</div>
              </div>
            )}
            
            {uvIndex !== undefined && (
              <div className="backdrop-blur-sm bg-white/90 border border-gray-200/70 rounded-xl p-3 shadow-md">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="bg-gray-800 rounded-lg p-1.5 shadow-md">
                    <Gauge className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[10px] text-gray-700 font-medium">UV Index</span>
                </div>
                <div className="text-lg text-gray-900 font-medium">{uvIndex}</div>
              </div>
            )}
          </div>
        )}

        {/* Forecast Buttons with glass effect */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowingDaily(true);
            }}
            className="flex items-center justify-center gap-2 backdrop-blur-sm bg-gray-800/90 hover:bg-gray-900 text-white rounded-xl px-3 py-2.5 shadow-lg hover:shadow-xl transition-all border border-gray-700/30"
          >
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium">Daily</span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowingHourly(true);
            }}
            className="flex items-center justify-center gap-2 backdrop-blur-sm bg-gray-800/90 hover:bg-gray-900 text-white rounded-xl px-3 py-2.5 shadow-lg hover:shadow-xl transition-all border border-gray-700/30"
          >
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">Hourly</span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowingAlerts(true);
            }}
            className="col-span-2 flex items-center justify-center gap-2 backdrop-blur-sm bg-gray-800/90 hover:bg-gray-900 text-white rounded-xl px-3 py-2.5 shadow-lg hover:shadow-xl transition-all relative border border-gray-700/30"
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium">Weather Alerts</span>
            {alerts.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] rounded-full w-5 h-5 flex items-center justify-center shadow-lg font-bold border-2 border-white">
                {alerts.length}
              </span>
            )}
          </button>
        </div>

        {/* Last updated timestamp */}
        {lastUpdated && (
          <div className="text-[9px] text-gray-500 text-center mt-2">
            Updated {formatLastUpdated(lastUpdated)}
          </div>
        )}
      </div>
    </div>
  );
}
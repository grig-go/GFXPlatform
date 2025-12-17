import { WeatherDashboardData, WeatherLocationWithOverrides } from '../types/weather';

const generateHourlyForecast = () => {
  const hours = [];
  const baseTemp = 68;
  
  for (let i = 0; i < 48; i++) {
    const time = new Date(Date.now() + i * 60 * 60 * 1000).toISOString();
    const tempVariation = Math.sin(i * 0.3) * 8 + Math.random() * 4 - 2;
    const temp = baseTemp + tempVariation;
    
    hours.push({
      time,
      summary: i < 6 ? "Partly Cloudy" : i < 12 ? "Sunny" : i < 18 ? "Mostly Sunny" : "Clear",
      icon: i < 6 ? "partly-cloudy-day" : i < 12 ? "clear-day" : i < 18 ? "partly-cloudy-day" : "clear-night",
      temperature: { value: Math.round(temp), unit: "°F" },
      feelsLike: { value: Math.round(temp + Math.random() * 4 - 2), unit: "°F" },
      dewPoint: { value: Math.round(temp - 20 + Math.random() * 6), unit: "°F" },
      humidity: Math.round(45 + Math.random() * 30) / 100,
      wind: {
        speed: { value: Math.round(5 + Math.random() * 10), unit: "mph" },
        gust: { value: Math.round(10 + Math.random() * 15), unit: "mph" },
        direction_deg: Math.round(200 + Math.random() * 80),
        direction_cardinal: ["SW", "W", "WSW", "WNW"][Math.floor(Math.random() * 4)]
      },
      pressure: { value: Number((30.0 + Math.random() * 0.4).toFixed(2)), unit: "inHg" },
      cloudCover: Math.round(Math.random() * 60) / 100,
      precipProbability: Math.round(Math.random() * 30) / 100,
      precipIntensity: { value: 0, unit: "in/hr" },
      uvIndex: Math.max(0, Math.round(6 - Math.abs(i - 12) * 0.8))
    });
  }
  
  return hours;
};

const generateDailyForecast = () => {
  const days = [];
  const baseHigh = 72;
  const baseLow = 58;
  
  for (let i = 0; i < 10; i++) {
    const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
    const tempVariation = Math.sin(i * 0.5) * 6 + Math.random() * 6 - 3;
    
    days.push({
      date: date.toISOString().split('T')[0],
      summary: ["Partly Cloudy", "Sunny", "Mostly Sunny", "Cloudy", "Rain Showers"][Math.floor(Math.random() * 5)],
      icon: ["partly-cloudy-day", "clear-day", "partly-cloudy-day", "cloudy", "rain"][Math.floor(Math.random() * 5)],
      tempMax: { value: Math.round(baseHigh + tempVariation), unit: "°F" },
      tempMin: { value: Math.round(baseLow + tempVariation * 0.7), unit: "°F" },
      sunrise: `${date.toISOString().split('T')[0]}T07:${String(Math.round(Math.random() * 20) + 5).padStart(2, '0')}:00-04:00`,
      sunset: `${date.toISOString().split('T')[0]}T18:${String(Math.round(Math.random() * 40) + 20).padStart(2, '0')}:00-04:00`,
      moonPhase: ["new", "waxing-crescent", "first-quarter", "waxing-gibbous", "full", "waning-gibbous", "last-quarter", "waning-crescent"][i % 8],
      uvIndexMax: Math.round(3 + Math.random() * 5),
      precipProbability: Math.round(Math.random() * 60) / 100,
      precipType: Math.random() > 0.7 ? "rain" : "none",
      precipAccumulation: { value: Math.random() > 0.7 ? Number((Math.random() * 0.5).toFixed(2)) : 0, unit: "in" },
      snowAccumulation: { value: 0, unit: "in" },
      wind: {
        speedAvg: { value: Math.round(8 + Math.random() * 10), unit: "mph" },
        gustMax: { value: Math.round(15 + Math.random() * 20), unit: "mph" },
        direction_deg: Math.round(180 + Math.random() * 120)
      }
    });
  }
  
  return days;
};

const mockLocations: WeatherLocationWithOverrides[] = [
  {
    location: {
      id: "newark-nj",
      name: "Newark, NJ",
      admin1: "New Jersey",
      country: "United States",
      lat: 40.8136,
      lon: -74.2210,
      elevation_m: 95,
      stationId: "KEWR"
    },
    data: {
      version: "1.1.0",
      product: "Emergent Weather",
      location: {
        id: "newark-nj",
        name: "Newark, NJ",
        admin1: "New Jersey",
        country: "United States",
        lat: 40.8136,
        lon: -74.2210,
        elevation_m: 95,
        stationId: "KEWR"
      },
      current: {
        asOf: new Date().toISOString(),
        summary: "Partly Cloudy",
        icon: "partly-cloudy-day",
        temperature: { 
          value: {
            originalValue: 68.4,
            overriddenValue: 75.0,
            isOverridden: true,
            overriddenAt: "2025-10-07T14:30:00Z",
            reason: "Adjusted for microclimate conditions"
          }, 
          unit: "°F" 
        },
        feelsLike: { value: 68.4, unit: "°F" },
        dewPoint: { value: 48.0, unit: "°F" },
        humidity: 0.52,
        pressure: { value: 30.12, unit: "inHg", tendency: "steady" },
        wind: {
          speed: { value: 6.0, unit: "mph" },
          gust: { value: 12.0, unit: "mph" },
          direction_deg: 230,
          direction_cardinal: "SW"
        },
        visibility: { value: 10.0, unit: "mi" },
        cloudCover: 0.4,
        uvIndex: 4,
        precipLastHr: { value: 0.00, unit: "in" },
        precipType: "none",
        snowDepth: { value: 0.0, unit: "in" },
        sun: {
          sunrise: "2025-10-07T07:01:00-04:00",
          sunset: "2025-10-07T18:27:00-04:00",
          moonPhase: "waning-crescent",
          illumination: 0.21
        },
        airQuality: {
          aqi: 38,
          category: "Good",
          pm25: 8.2,
          pm10: 12.1,
          o3: 24.0,
          no2: 9.0,
          so2: 2.0,
          co: 0.3,
          standard: "EPA_US"
        },
        pollen: {
          tree: 1,
          grass: 0,
          weed: 2,
          risk: "Low"
        }
      },
      hourly: {
        stepHours: 1,
        items: generateHourlyForecast()
      },
      daily: {
        items: generateDailyForecast()
      },
      alerts: [
        {
          id: "NWS-XYZ-123",
          source: "NWS",
          event: "Wind Advisory",
          severity: "Advisory",
          urgency: "Expected",
          certainty: "Likely",
          start: "2025-10-07T14:00:00-04:00",
          end: "2025-10-07T22:00:00-04:00",
          headline: "Wind Advisory in effect",
          description: "Southwest winds 20–30 mph with gusts to 45 mph.",
          areas: ["Essex", "Passaic"],
          instruction: "Secure loose objects.",
          links: ["https://alerts.weather.gov/…"]
        }
      ],
      tropical: {
        basin: "AL",
        advisoryTime: "2025-10-07T18:00:00Z",
        systems: [
          {
            id: "AL09",
            name: "Tropical Storm Alpha",
            type: "TS",
            position: { time: "2025-10-07T18:00:00Z", lat: 25.8, lon: -72.3 },
            windMax: { value: 60, unit: "mph" },
            pressureMin: { value: 995, unit: "mb" },
            motion: { dir_deg: 300, speed: { value: 12, unit: "mph" } },
            forecastPoints: [
              {
                time: "2025-10-08T18:00:00Z",
                lat: 27.9,
                lon: -75.0,
                type: "TS",
                windMax: { value: 65, unit: "mph" }
              }
            ]
          }
        ]
      }
    }
  },
  {
    location: {
      id: "miami-fl",
      name: "Miami, FL",
      admin1: "Florida",
      country: "United States",
      lat: 25.7617,
      lon: -80.1918,
      elevation_m: 2,
      stationId: "KMIA"
    },
    data: {
      version: "1.1.0",
      product: "Emergent Weather",
      location: {
        id: "miami-fl",
        name: "Miami, FL",
        admin1: "Florida",
        country: "United States",
        lat: 25.7617,
        lon: -80.1918,
        elevation_m: 2,
        stationId: "KMIA"
      },
      current: {
        asOf: new Date().toISOString(),
        summary: "Thunderstorms",
        icon: "thunderstorm",
        temperature: { value: 84.2, unit: "°F" },
        feelsLike: { value: 92.1, unit: "°F" },
        dewPoint: { value: 76.0, unit: "°F" },
        humidity: {
          originalValue: 0.78,
          overriddenValue: 0.85,
          isOverridden: true,
          overriddenAt: "2025-10-07T15:15:00Z",
          reason: "Sensor calibration adjustment"
        },
        pressure: { value: 29.89, unit: "inHg", tendency: "falling" },
        wind: {
          speed: { value: 12.0, unit: "mph" },
          gust: { value: 28.0, unit: "mph" },
          direction_deg: 145,
          direction_cardinal: "SE"
        },
        visibility: { value: 6.0, unit: "mi" },
        cloudCover: 0.85,
        uvIndex: 8,
        precipLastHr: { value: 0.42, unit: "in" },
        precipType: "rain",
        snowDepth: { value: 0.0, unit: "in" },
        sun: {
          sunrise: "2025-10-07T07:25:00-04:00",
          sunset: "2025-10-07T18:52:00-04:00",
          moonPhase: "waning-crescent",
          illumination: 0.21
        },
        airQuality: {
          aqi: 45,
          category: "Good",
          pm25: 11.2,
          pm10: 18.5,
          o3: 32.0,
          no2: 15.0,
          so2: 3.0,
          co: 0.5,
          standard: "EPA_US"
        },
        pollen: {
          tree: 3,
          grass: 2,
          weed: 4,
          risk: "Moderate"
        }
      },
      hourly: {
        stepHours: 1,
        items: generateHourlyForecast().map(item => ({
          ...item,
          temperature: { value: item.temperature.value + 16, unit: "°F" },
          feelsLike: { value: item.feelsLike.value + 20, unit: "°F" },
          humidity: Math.min(0.95, item.humidity + 0.2),
          precipProbability: Math.min(0.8, item.precipProbability + 0.3)
        }))
      },
      daily: {
        items: generateDailyForecast().map(item => ({
          ...item,
          tempMax: { value: item.tempMax.value + 16, unit: "°F" },
          tempMin: { value: item.tempMin.value + 18, unit: "°F" },
          precipProbability: Math.min(0.9, item.precipProbability + 0.4)
        }))
      },
      alerts: [
        {
          id: "NWS-MIA-456",
          source: "NWS",
          event: "Severe Thunderstorm Watch",
          severity: "Watch",
          urgency: "Expected",
          certainty: "Possible",
          start: "2025-10-07T16:00:00-04:00",
          end: "2025-10-08T00:00:00-04:00",
          headline: "Severe Thunderstorm Watch until midnight",
          description: "Severe thunderstorms with damaging winds and large hail possible.",
          areas: ["Miami-Dade", "Broward"],
          instruction: "Stay indoors and avoid windows during storms.",
          links: ["https://alerts.weather.gov/…"]
        }
      ],
      marine: {
        waves: {
          significantHeight: { value: 3.2, unit: "ft" },
          period: { value: 6.8, unit: "s" }
        },
        tides: [
          {
            time: "2025-10-07T06:42:00-04:00",
            height: { value: 2.1, unit: "ft" },
            type: "High"
          },
          {
            time: "2025-10-07T12:18:00-04:00",
            height: { value: 0.3, unit: "ft" },
            type: "Low"
          },
          {
            time: "2025-10-07T18:55:00-04:00",
            height: { value: 2.4, unit: "ft" },
            type: "High"
          },
          {
            time: "2025-10-08T01:05:00-04:00",
            height: { value: 0.2, unit: "ft" },
            type: "Low"
          }
        ]
      },
      smoke: {
        surfacePM25: {
          grid: [
            [12.5, 15.2, 18.7, 22.1],
            [14.3, 16.8, 20.4, 24.6],
            [16.1, 18.9, 21.7, 26.3],
            [18.2, 20.5, 23.1, 28.0]
          ]
        },
        verticallyIntegratedSmoke: {
          grid: [
            [45.2, 52.3, 58.7, 64.1],
            [48.5, 55.1, 61.2, 67.8],
            [51.3, 57.9, 63.5, 69.2],
            [54.1, 60.2, 65.8, 71.5]
          ]
        },
        fireSources: [
          {
            lat: 25.6792,
            lon: -80.3182,
            confidence: 85.2,
            brightness: 312.5
          },
          {
            lat: 25.7421,
            lon: -80.2847,
            confidence: 92.1,
            brightness: 345.7
          }
        ]
      }
    }
  },
  {
    location: {
      id: "denver-co",
      name: "Denver, CO",
      admin1: "Colorado",
      country: "United States",
      lat: 39.7392,
      lon: -104.9903,
      elevation_m: 1609,
      stationId: "KDEN"
    },
    data: {
      version: "1.1.0",
      product: "Emergent Weather",
      location: {
        id: "denver-co",
        name: "Denver, CO",
        admin1: "Colorado",
        country: "United States",
        lat: 39.7392,
        lon: -104.9903,
        elevation_m: 1609,
        stationId: "KDEN"
      },
      current: {
        asOf: new Date().toISOString(),
        summary: "Clear",
        icon: "clear-day",
        temperature: { value: 62.8, unit: "°F" },
        feelsLike: { value: 62.8, unit: "°F" },
        dewPoint: { value: 28.0, unit: "°F" },
        humidity: 0.32,
        pressure: { value: 24.85, unit: "inHg", tendency: "steady" },
        wind: {
          speed: { value: 8.0, unit: "mph" },
          gust: { value: 15.0, unit: "mph" },
          direction_deg: 270,
          direction_cardinal: "W"
        },
        visibility: { value: 15.0, unit: "mi" },
        cloudCover: 0.1,
        uvIndex: 6,
        precipLastHr: { value: 0.00, unit: "in" },
        precipType: "none",
        snowDepth: { value: 0.0, unit: "in" },
        sun: {
          sunrise: "2025-10-07T07:12:00-06:00",
          sunset: "2025-10-07T18:35:00-06:00",
          moonPhase: "waning-crescent",
          illumination: 0.21
        },
        airQuality: {
          aqi: 65,
          category: "Moderate",
          pm25: 22.1,
          pm10: 35.8,
          o3: 48.0,
          no2: 25.0,
          so2: 8.0,
          co: 1.2,
          standard: "EPA_US"
        },
        pollen: {
          tree: 0,
          grass: 1,
          weed: 3,
          risk: "Low"
        }
      },
      hourly: {
        stepHours: 1,
        items: generateHourlyForecast().map(item => ({
          ...item,
          temperature: { value: item.temperature.value - 8, unit: "°F" },
          feelsLike: { value: item.feelsLike.value - 8, unit: "°F" },
          humidity: Math.max(0.15, item.humidity - 0.25),
          precipProbability: Math.max(0, item.precipProbability - 0.2)
        }))
      },
      daily: {
        items: generateDailyForecast().map(item => ({
          ...item,
          tempMax: { value: item.tempMax.value - 8, unit: "°F" },
          tempMin: { value: item.tempMin.value - 12, unit: "°F" },
          precipProbability: Math.max(0, item.precipProbability - 0.3)
        }))
      },
      alerts: []
    }
  }
];

export const mockWeatherData: WeatherDashboardData = {
  locations: mockLocations,
  lastUpdated: new Date().toISOString()
};
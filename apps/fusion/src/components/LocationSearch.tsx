import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Search, MapPin, ThermometerSun, Users, AlertCircle } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_FUSION_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const publicAnonKey = import.meta.env.VITE_FUSION_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export function LocationSearch() {
  const [searchTerm, setSearchTerm] = useState('Mustang');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const searchData = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Search in population data
      const populationResponse = await fetch(
        `${supabaseUrl}/functions/v1/map_data/population`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      let populationData = null;
      if (populationResponse.ok) {
        const population = await populationResponse.json();
        // Search for matching locations
        const matches = population.filter((loc: any) => 
          loc.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          loc.state_code?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        populationData = matches;
      }

      // Search in weather data
      const weatherResponse = await fetch(
        `${supabaseUrl}/functions/v1/weather_dashboard/weather-data`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      let weatherData = null;
      if (weatherResponse.ok) {
        const weatherResult = await weatherResponse.json();
        if (weatherResult.ok && Array.isArray(weatherResult.data)) {
          // Transform weather_dashboard response and search for matching locations
          const matches = weatherResult.data.filter((item: any) => {
            const locationName = typeof item.location?.name === 'string' 
              ? item.location.name 
              : item.location?.name?.overriddenValue || item.location?.name?.originalValue || '';
            return locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.location?.admin1?.toLowerCase().includes(searchTerm.toLowerCase());
          }).map((item: any) => ({
            id: item.location.id,
            location: typeof item.location.name === 'string' 
              ? item.location.name 
              : item.location.name?.overriddenValue || item.location.name?.originalValue || 'Unknown',
            latitude: item.location.lat,
            longitude: item.location.lon,
            admin1: item.location.admin1,
            country: item.location.country,
            current_temp: item.data.current?.temperature?.value,
            current_condition: item.data.current?.summary,
          }));
          weatherData = matches;
        }
      }

      // Get AI infrastructure data
      const aiInfraResponse = await fetch(
        `${supabaseUrl}/functions/v1/map_data/ai-infra`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      let aiInfraData = null;
      if (aiInfraResponse.ok) {
        const aiData = await aiInfraResponse.json();
        // Search for matching locations
        const matches = aiData.features?.filter((feature: any) => 
          feature.properties.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          feature.properties.city?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        aiInfraData = matches;
      }

      setResults({
        population: populationData || [],
        weather: weatherData || [],
        aiInfra: aiInfraData || [],
      });

      if ((!populationData || populationData.length === 0) &&
          (!weatherData || weatherData.length === 0) &&
          (!aiInfraData || aiInfraData.length === 0)) {
        setError(`No data found for "${searchTerm}"`);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-gray-900">Location Search</h1>
        <p className="text-gray-600 mt-1">Search for data about any location</p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter location name (e.g., Mustang, New York, Miami)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchData()}
              className="flex-1"
            />
            <Button onClick={searchData} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {results && (
        <div className="space-y-6">
          {/* Population Data */}
          {results.population && results.population.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Population Data
                </CardTitle>
                <CardDescription>
                  Found {results.population.length} county/counties
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.population.map((feature: any, idx: number) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {feature.properties.name}
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">GEOID:</span>
                            <span className="ml-2 font-mono">{feature.properties.GEOID}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Population:</span>
                            <span className="ml-2 font-semibold text-blue-600">
                              {feature.properties.POP?.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Latitude:</span>
                            <span className="ml-2 font-mono">
                              {feature.geometry.coordinates[1]?.toFixed(4)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Longitude:</span>
                            <span className="ml-2 font-mono">
                              {feature.geometry.coordinates[0]?.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                        View full data
                      </summary>
                      <pre className="mt-2 bg-white p-3 rounded border border-gray-200 overflow-auto text-xs">
                        {JSON.stringify(feature, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Weather Data */}
          {results.weather && results.weather.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ThermometerSun className="h-5 w-5 text-orange-600" />
                  Weather Data
                </CardTitle>
                <CardDescription>
                  Found {results.weather.length} weather location(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.weather.map((loc: any, idx: number) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {loc.location}, {loc.admin1}
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Temperature:</span>
                            <span className="ml-2 font-semibold text-orange-600">
                              {loc.current_temp}°F
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Condition:</span>
                            <span className="ml-2">{loc.current_condition}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Coordinates:</span>
                            <span className="ml-2 font-mono text-xs">
                              {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                        View full data
                      </summary>
                      <pre className="mt-2 bg-white p-3 rounded border border-gray-200 overflow-auto text-xs">
                        {JSON.stringify(loc, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* AI Infrastructure Data */}
          {results.aiInfra && results.aiInfra.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  AI Infrastructure Data
                </CardTitle>
                <CardDescription>
                  Found {results.aiInfra.length} AI facility/facilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.aiInfra.map((feature: any, idx: number) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {feature.properties.name}
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">City:</span>
                            <span className="ml-2">{feature.properties.city}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Type:</span>
                            <span className="ml-2">{feature.properties.type}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                        View full data
                      </summary>
                      <pre className="mt-2 bg-white p-3 rounded border border-gray-200 overflow-auto text-xs">
                        {JSON.stringify(feature, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
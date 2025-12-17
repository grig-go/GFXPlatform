import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertCircle, RefreshCw, Search, Database, Table, Sparkles, MapPin } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { LocationSearch } from './LocationSearch';
import { TableViewer } from './TableViewer';
import AISettingsPanel from './AISettingsPanel';

interface BackendDataViewerProps {
  countyCount?: number;
  isFetchingCensus?: boolean;
  onFetchAllCounties?: () => void;
}

export function BackendDataViewer({ 
  countyCount = 0, 
  isFetchingCensus = false, 
  onFetchAllCounties 
}: BackendDataViewerProps = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [schema, setSchema] = useState<any>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/weather_dashboard/weather-data`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error('Error fetching backend data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const inspectSchema = async () => {
    setSchemaLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/weather_dashboard/locations`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setSchema(result);
      console.log('📋 Weather locations:', result);
    } catch (err: any) {
      console.error('Error inspecting schema:', err);
      setError(err.message || 'Failed to inspect schema');
    } finally {
      setSchemaLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    inspectSchema(); // Also fetch schema on load
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-gray-900">Backend Data Viewer</h1>
        <p className="text-gray-600 mt-1">Search for locations or view raw database tables</p>
      </div>

      <Tabs defaultValue="tableViewer" className="w-full">
        <TabsList className="grid w-full max-w-4xl grid-cols-5">
          <TabsTrigger value="tableViewer" className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            Table Viewer
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Location
          </TabsTrigger>
          <TabsTrigger value="countyData" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            County Data
          </TabsTrigger>
          <TabsTrigger value="aiSettings" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Settings
          </TabsTrigger>
          <TabsTrigger value="rawDebug" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Raw Debug
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tableViewer" className="mt-6">
          <TableViewer />
        </TabsContent>

        <TabsContent value="search" className="mt-6">
          <LocationSearch />
        </TabsContent>

        <TabsContent value="countyData" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Census County Data Management
              </CardTitle>
              <CardDescription>
                Fetch and manage US Census population data for all 3,143 counties
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* County Count Status */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Current County Coverage</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-gray-900">Counties Loaded: </span>
                      <span className={countyCount < 100 ? 'text-amber-600' : 'text-green-600'}>
                        {countyCount.toLocaleString()}
                      </span>
                      <span className="text-gray-500"> / 3,143</span>
                    </div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2 w-64">
                      <div 
                        className={`h-2 rounded-full transition-all ${countyCount < 100 ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min((countyCount / 3143) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  {onFetchAllCounties && (
                    <Button
                      onClick={onFetchAllCounties}
                      disabled={isFetchingCensus}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isFetchingCensus ? 'animate-spin' : ''}`} />
                      {isFetchingCensus ? 'Fetching Census Data...' : 'Fetch All from Census API'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Information Section */}
              <div className="space-y-3">
                <h3 className="text-gray-900">About Census Data Integration</h3>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2 text-sm">
                  <p className="text-gray-700">
                    <strong>Data Source:</strong> US Census Bureau API - Population estimates for all US counties
                  </p>
                  <p className="text-gray-700">
                    <strong>Total Counties:</strong> 3,143 counties across all 50 states
                  </p>
                  <p className="text-gray-700">
                    <strong>Data Storage:</strong> County population data is stored in the Supabase backend KV store
                  </p>
                  <p className="text-gray-700">
                    <strong>Update Frequency:</strong> Census data can be refreshed manually using the button above
                  </p>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Data Status</p>
                  <p className={`font-semibold ${countyCount >= 3143 ? 'text-green-600' : countyCount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {countyCount >= 3143 ? '✓ Complete' : countyCount > 0 ? '⚠ Partial' : '○ Empty'}
                  </p>
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Fetch Status</p>
                  <p className={`font-semibold ${isFetchingCensus ? 'text-blue-600' : 'text-gray-400'}`}>
                    {isFetchingCensus ? '⟳ Loading...' : '○ Idle'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aiSettings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI Provider Settings
              </CardTitle>
              <CardDescription>
                View and configure AI providers using the new v2 RPC function
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <AISettingsPanel />
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="rawDebug" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gray-900">Database Architecture</h2>
              <p className="text-gray-600 text-sm mt-1">KV Store (location IDs) + Supabase tables (cross-referenced data)</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={inspectSchema} disabled={schemaLoading} variant="outline" size="sm">
                <Database className={`h-4 w-4 mr-2 ${schemaLoading ? 'animate-spin' : ''}`} />
                Inspect Schema
              </Button>
              <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </div>
          </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Schema Inspection Results */}
          {schema && (
            <Card className="md:col-span-2 border-purple-200 bg-purple-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-purple-600" />
                  Table Schemas (Column Names)
                </CardTitle>
                <CardDescription>Actual column names in each weather table - use these for seeding data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(schema).map(([tableName, tableInfo]: [string, any]) => (
                    <div key={tableName} className="bg-white p-3 rounded-lg border border-purple-200">
                      <p className="font-mono text-xs mb-2 text-purple-900">{tableName}</p>
                      {tableInfo.error ? (
                        <p className="text-xs text-red-600">{tableInfo.error}</p>
                      ) : tableInfo.columns && tableInfo.columns.length > 0 ? (
                        <ul className="text-xs space-y-1">
                          {tableInfo.columns.map((col: string) => (
                            <li key={col} className="text-gray-700">
                              <span className="font-mono bg-gray-100 px-1 rounded">{col}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-500">{tableInfo.note || 'No data'}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* KV Store - Active Locations */}
          <Card className="md:col-span-2 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                KV Store: Active Location IDs
              </CardTitle>
              <CardDescription>The source of truth for which weather locations to display (Count: {data.kv_store?.count || 0})</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-white p-4 rounded-lg overflow-auto max-h-32 text-sm border border-blue-200">
                {JSON.stringify(data.kv_store?.active_locations || [], null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Weather Locations */}
          <Card>
            <CardHeader>
              <CardTitle>weather_locations Table</CardTitle>
              <CardDescription>Location metadata (Count: {data.locations?.count || 0})</CardDescription>
            </CardHeader>
            <CardContent>
              {data.locations?.error ? (
                <Alert variant="destructive">
                  <AlertDescription>{data.locations.error}</AlertDescription>
                </Alert>
              ) : (
                <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-xs">
                  {JSON.stringify(data.locations?.data, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>

          {/* Weather Current */}
          <Card>
            <CardHeader>
              <CardTitle>weather_current Table</CardTitle>
              <CardDescription>Current conditions (Count: {data.current?.count || 0})</CardDescription>
            </CardHeader>
            <CardContent>
              {data.current?.error ? (
                <Alert variant="destructive">
                  <AlertDescription>{data.current.error}</AlertDescription>
                </Alert>
              ) : (
                <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-xs">
                  {JSON.stringify(data.current?.data, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>

          {/* Weather Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>weather_alerts Table</CardTitle>
              <CardDescription>Active alerts (Count: {data.alerts?.count || 0})</CardDescription>
            </CardHeader>
            <CardContent>
              {data.alerts?.error ? (
                <Alert variant="destructive">
                  <AlertDescription>{data.alerts.error}</AlertDescription>
                </Alert>
              ) : (
                <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-xs">
                  {JSON.stringify(data.alerts?.data, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>

          {/* Daily Forecast */}
          <Card>
            <CardHeader>
              <CardTitle>weather_daily_forecast Table</CardTitle>
              <CardDescription>Daily forecasts (Count: {data.daily_forecast?.count || 0})</CardDescription>
            </CardHeader>
            <CardContent>
              {data.daily_forecast?.error ? (
                <Alert variant="destructive">
                  <AlertDescription>{data.daily_forecast.error}</AlertDescription>
                </Alert>
              ) : data.daily_forecast?.data && data.daily_forecast.data.length > 0 ? (
                <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-xs">
                  {JSON.stringify(data.daily_forecast?.data, null, 2)}
                </pre>
              ) : (
                <div className="text-gray-500 text-center py-8">No daily forecast data available</div>
              )}
            </CardContent>
          </Card>

          {/* Hourly Forecast */}
          <Card>
            <CardHeader>
              <CardTitle>weather_hourly_forecast Table</CardTitle>
              <CardDescription>Hourly forecasts (Count: {data.hourly_forecast?.count || 0})</CardDescription>
            </CardHeader>
            <CardContent>
              {data.hourly_forecast?.error ? (
                <Alert variant="destructive">
                  <AlertDescription>{data.hourly_forecast.error}</AlertDescription>
                </Alert>
              ) : data.hourly_forecast?.data && data.hourly_forecast.data.length > 0 ? (
                <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-xs">
                  {JSON.stringify(data.hourly_forecast?.data, null, 2)}
                </pre>
              ) : (
                <div className="text-gray-500 text-center py-8">No hourly forecast data available</div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

          {/* Data Architecture Info */}
          {data && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Data Flow Architecture</CardTitle>
                <CardDescription>How weather data is fetched and cross-referenced</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-900 mb-2">Step-by-Step Process:</p>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                      <li><span className="font-mono bg-blue-100 px-2 py-0.5 rounded">KV Store</span> → Fetch active location IDs from <code className="bg-gray-200 px-1 rounded">weather:active_locations</code></li>
                      <li><span className="font-mono bg-green-100 px-2 py-0.5 rounded">weather_locations</span> → Cross-reference location IDs to get metadata (lat, lon, name, etc.)</li>
                      <li><span className="font-mono bg-yellow-100 px-2 py-0.5 rounded">weather_current</span> → Cross-reference location IDs to get current conditions</li>
                      <li><span className="font-mono bg-red-100 px-2 py-0.5 rounded">weather_alerts</span> → Cross-reference location IDs to get active alerts</li>
                      <li><span className="font-mono bg-purple-100 px-2 py-0.5 rounded">JOIN</span> → Merge all data together and return to frontend</li>
                    </ol>
                  </div>
                  {data.current?.data && data.current.data.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 mb-2">weather_current Table Schema:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {Object.keys(data.current.data[0]).map((column) => (
                          <li key={column} className="text-gray-600">
                            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{column}</span>
                            <span className="text-gray-500 ml-2">
                              ({typeof data.current.data[0][column]})
                            </span>
                            {data.current.data[0][column] !== null && (
                              <span className="text-gray-400 ml-2">
                                = {JSON.stringify(data.current.data[0][column])}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
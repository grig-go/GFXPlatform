import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from '../utils/supabase/config';
import { toast } from 'sonner@2.0.3';

interface WeatherBackendDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  locationName: string;
}

export function WeatherBackendDataDialog({
  open,
  onOpenChange,
  locationId,
  locationName,
}: WeatherBackendDataDialogProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🔵 Fetching backend data for location ID: ${locationId}`);
      
      // Fetch data directly for this specific location
      const baseUrl = getEdgeFunctionUrl('weather_dashboard');
      const response = await fetch(`${baseUrl}/locations/${locationId}`, {
        headers: {
          'Authorization': `Bearer ${getSupabaseAnonKey()}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🔴 Failed to fetch location data (HTTP ${response.status}):`, errorText);
        throw new Error(`Failed to fetch location data: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Fetched location data:`, result);
      
      if (!result.ok) {
        throw new Error(result.error || result.detail || 'Failed to fetch location data');
      }
      
      // Now fetch weather data for this location
      const weatherResponse = await fetch(`${baseUrl}/weather-data`, {
        headers: {
          'Authorization': `Bearer ${getSupabaseAnonKey()}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!weatherResponse.ok) {
        const errorText = await weatherResponse.text();
        console.error(`🔴 Failed to fetch weather data (HTTP ${weatherResponse.status}):`, errorText);
        throw new Error(`Failed to fetch weather data: ${weatherResponse.status} - ${errorText}`);
      }
      
      const weatherResult = await weatherResponse.json();
      console.log(`✅ Fetched weather data:`, weatherResult);
      
      if (!weatherResult.ok) {
        throw new Error(weatherResult.error || weatherResult.detail || 'Failed to fetch weather data');
      }
      
      // Find the weather data for this specific location
      const weatherData = weatherResult.data?.find((wd: any) => wd.location.id === locationId);
      
      if (!weatherData) {
        throw new Error('Weather data not found for this location');
      }
      
      // Combine location info with weather data
      const combinedData = {
        location: result.data,
        weatherData: weatherData
      };
      
      console.log(`✅ Combined backend data:`, combinedData);
      setData(combinedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`🔴 Error fetching backend data:`, err);
      setError(errorMessage);
      toast.error(`Failed to load backend data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      fetchData();
    } else {
      setData(null);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Backend Data: {locationName}</DialogTitle>
          <DialogDescription>
            Raw weather data from the backend API for this location
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={fetchData}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {data && (
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-xs overflow-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
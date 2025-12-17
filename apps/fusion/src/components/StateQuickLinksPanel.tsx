import { useState, useEffect } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import mapboxgl from 'mapbox-gl';
import { fetchPopulationData } from '../utils/populationApi';

interface StateQuickLinksPanelProps {
  mapRef?: React.MutableRefObject<mapboxgl.Map | null>;
  onClose: () => void;
}

interface LocationData {
  lng: number;
  lat: number;
  zoom: number;
  type: 'state' | 'county';
}

// State coordinates (approximate center points)
const stateCoordinates: Record<string, { lng: number; lat: number; zoom: number }> = {
  'Alabama': { lng: -86.9023, lat: 32.8067, zoom: 6 },
  'Alaska': { lng: -152.4044, lat: 61.3707, zoom: 4 },
  'Arizona': { lng: -111.0937, lat: 33.7298, zoom: 6 },
  'Arkansas': { lng: -92.3731, lat: 34.9697, zoom: 6 },
  'California': { lng: -119.4179, lat: 36.7783, zoom: 5 },
  'Colorado': { lng: -105.7821, lat: 39.5501, zoom: 6 },
  'Connecticut': { lng: -72.7554, lat: 41.5978, zoom: 8 },
  'Delaware': { lng: -75.5071, lat: 39.3185, zoom: 8 },
  'Florida': { lng: -81.5158, lat: 27.7663, zoom: 6 },
  'Georgia': { lng: -83.5007, lat: 32.1656, zoom: 6 },
  'Hawaii': { lng: -157.5311, lat: 20.7984, zoom: 6 },
  'Idaho': { lng: -114.7420, lat: 44.0682, zoom: 6 },
  'Illinois': { lng: -89.3985, lat: 40.6331, zoom: 6 },
  'Indiana': { lng: -86.1349, lat: 40.2672, zoom: 6 },
  'Iowa': { lng: -93.0977, lat: 41.8780, zoom: 6 },
  'Kansas': { lng: -98.4842, lat: 39.0119, zoom: 6 },
  'Kentucky': { lng: -84.2700, lat: 37.8393, zoom: 6 },
  'Louisiana': { lng: -91.9623, lat: 30.9843, zoom: 6 },
  'Maine': { lng: -69.4455, lat: 45.2538, zoom: 6 },
  'Maryland': { lng: -76.6413, lat: 39.0458, zoom: 7 },
  'Massachusetts': { lng: -71.3824, lat: 42.4072, zoom: 7 },
  'Michigan': { lng: -85.6024, lat: 44.3148, zoom: 6 },
  'Minnesota': { lng: -94.6859, lat: 46.7296, zoom: 6 },
  'Mississippi': { lng: -89.3985, lat: 32.3547, zoom: 6 },
  'Missouri': { lng: -92.6038, lat: 37.9643, zoom: 6 },
  'Montana': { lng: -110.3626, lat: 46.8797, zoom: 6 },
  'Nebraska': { lng: -99.9018, lat: 41.4925, zoom: 6 },
  'Nevada': { lng: -116.4194, lat: 38.8026, zoom: 6 },
  'New Hampshire': { lng: -71.5724, lat: 43.1939, zoom: 7 },
  'New Jersey': { lng: -74.4057, lat: 40.0583, zoom: 7 },
  'New Mexico': { lng: -106.2371, lat: 34.5199, zoom: 6 },
  'New York': { lng: -75.4999, lat: 43.2994, zoom: 6 },
  'North Carolina': { lng: -79.0193, lat: 35.7596, zoom: 6 },
  'North Dakota': { lng: -100.4659, lat: 47.5515, zoom: 6 },
  'Ohio': { lng: -82.9071, lat: 40.4173, zoom: 6 },
  'Oklahoma': { lng: -97.5164, lat: 35.4676, zoom: 6 },
  'Oregon': { lng: -120.5542, lat: 43.8041, zoom: 6 },
  'Pennsylvania': { lng: -77.1945, lat: 41.2033, zoom: 6 },
  'Rhode Island': { lng: -71.4774, lat: 41.5801, zoom: 9 },
  'South Carolina': { lng: -81.1637, lat: 33.8361, zoom: 7 },
  'South Dakota': { lng: -100.2263, lat: 43.9695, zoom: 6 },
  'Tennessee': { lng: -86.5804, lat: 35.5175, zoom: 6 },
  'Texas': { lng: -99.9018, lat: 31.9686, zoom: 5 },
  'Utah': { lng: -111.0937, lat: 39.3200, zoom: 6 },
  'Vermont': { lng: -72.5778, lat: 44.5588, zoom: 7 },
  'Virginia': { lng: -78.6569, lat: 37.4316, zoom: 6 },
  'Washington': { lng: -120.7401, lat: 47.7511, zoom: 6 },
  'West Virginia': { lng: -80.4549, lat: 38.5976, zoom: 7 },
  'Wisconsin': { lng: -89.6385, lat: 43.7844, zoom: 6 },
  'Wyoming': { lng: -107.2903, lat: 43.0760, zoom: 6 },
};

export function StateQuickLinksPanel({ mapRef, onClose }: StateQuickLinksPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [counties, setCounties] = useState<Record<string, { lng: number; lat: number; zoom: number }>>({});
  const [isLoadingCounties, setIsLoadingCounties] = useState(true);

  // Load county data from population API on mount
  useEffect(() => {
    const loadCounties = async () => {
      try {
        setIsLoadingCounties(true);
        const populationData = await fetchPopulationData();
        
        if (populationData?.features) {
          const countyData: Record<string, { lng: number; lat: number; zoom: number }> = {};
          
          populationData.features.forEach(feature => {
            const name = feature.properties.name;
            const [lng, lat] = feature.geometry.coordinates;
            
            // Store county with coordinates and zoom level 9 for counties
            countyData[name] = { lng, lat, zoom: 9 };
          });
          
          setCounties(countyData);
          console.log(`Loaded ${Object.keys(countyData).length} counties for quick search`);
        }
      } catch (error) {
        console.error('Error loading counties:', error);
      } finally {
        setIsLoadingCounties(false);
      }
    };

    loadCounties();
  }, []);

  const handleLocationClick = (name: string, location: LocationData) => {
    if (mapRef?.current) {
      mapRef.current.flyTo({
        center: [location.lng, location.lat],
        zoom: location.zoom,
        duration: 1500,
        essential: true
      });
    }
  };

  // Combine states and counties for searching
  const allLocations = [
    ...Object.keys(stateCoordinates).map(name => ({
      name,
      ...stateCoordinates[name],
      type: 'state' as const
    })),
    ...Object.keys(counties).map(name => ({
      name,
      ...counties[name],
      type: 'county' as const
    }))
  ];

  // Filter locations based on search query
  const filteredLocations = allLocations
    .filter(location => location.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // Sort by type first (states before counties), then alphabetically
      if (a.type !== b.type) {
        return a.type === 'state' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-80">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm">Quick Links</h3>
          {isLoadingCounties && (
            <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close panel"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search states or counties..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Location List */}
      <ScrollArea className="h-96">
        <div className="p-2">
          {filteredLocations.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-8">
              {isLoadingCounties ? 'Loading counties...' : 'No locations found'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLocations.map((location) => (
                <button
                  key={location.name}
                  onClick={() => handleLocationClick(location.name, location)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="truncate">{location.name}</span>
                    {location.type === 'county' && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                        County
                      </Badge>
                    )}
                  </div>
                  <MapPin className="w-3 h-3 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

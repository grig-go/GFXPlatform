import { useState, useEffect } from 'react';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface LocationMapPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  initialLat?: number;
  initialLng?: number;
}

export function LocationMapPicker({ 
  open, 
  onOpenChange, 
  onLocationSelect,
  initialLat,
  initialLng 
}: LocationMapPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLat, setSelectedLat] = useState<number>(initialLat || 40.7128);
  const [selectedLng, setSelectedLng] = useState<number>(initialLng || -74.0060);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    initialLat || 40.7128, 
    initialLng || -74.0060
  ]);
  const [locationName, setLocationName] = useState('');
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [markerInstance, setMarkerInstance] = useState<any>(null);

  useEffect(() => {
    if (!open) return;

    // Dynamically import Leaflet and create map
    const loadMap = async () => {
      const L = (await import('leaflet')).default;
      
      // Fix for default marker icons in Leaflet with bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Wait for the map container to be in the DOM
      setTimeout(() => {
        const mapContainer = document.getElementById('location-map');
        if (!mapContainer) return;

        // Clear any existing map
        if (mapInstance) {
          mapInstance.remove();
        }

        // Create new map
        const map = L.map('location-map').setView(mapCenter, 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        // Add marker at center
        const marker = L.marker(mapCenter, { draggable: true }).addTo(map);
        
        // Update coordinates when marker is dragged
        marker.on('dragend', function(e: any) {
          const position = e.target.getLatLng();
          setSelectedLat(position.lat);
          setSelectedLng(position.lng);
          reverseGeocode(position.lat, position.lng);
        });

        // Add click handler to map
        map.on('click', function(e: any) {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setSelectedLat(lat);
          setSelectedLng(lng);
          reverseGeocode(lat, lng);
        });

        setMapInstance(map);
        setMarkerInstance(marker);
      }, 100);
    };

    loadMap();

    // Cleanup function
    return () => {
      if (mapInstance) {
        mapInstance.remove();
        setMapInstance(null);
      }
    };
  }, [open]);

  // Update map when center changes
  useEffect(() => {
    if (mapInstance && markerInstance) {
      mapInstance.setView(mapCenter, 13);
      markerInstance.setLatLng(mapCenter);
    }
  }, [mapCenter, mapInstance, markerInstance]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data.display_name) {
        setLocationName(data.display_name);
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        
        setSelectedLat(newLat);
        setSelectedLng(newLng);
        setMapCenter([newLat, newLng]);
        setLocationName(display_name);
      } else {
        alert('Location not found. Please try a different search.');
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
      alert('Failed to search location. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    onLocationSelect(selectedLat, selectedLng, locationName);
    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select Location on Map</DialogTitle>
          <DialogDescription>
            Search for a location or click/drag the marker on the map to set coordinates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search for a location (e.g., Times Square, New York)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={isSearching || !searchQuery.trim()}
              className="gap-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search
                </>
              )}
            </Button>
          </div>

          {/* Map Container */}
          <div className="relative">
            <link 
              rel="stylesheet" 
              href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
              integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
              crossOrigin=""
            />
            <div 
              id="location-map" 
              className="w-full h-[400px] rounded-lg border-2 border-border z-0"
              style={{ position: 'relative' }}
            />
            <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 text-sm shadow-md z-[1000]">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>Click map or drag marker to select location</span>
              </div>
            </div>
          </div>

          {/* Coordinates Display */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Latitude</Label>
              <Input
                type="number"
                step="0.000001"
                value={selectedLat.toFixed(6)}
                onChange={(e) => {
                  const lat = parseFloat(e.target.value);
                  if (!isNaN(lat)) {
                    setSelectedLat(lat);
                    setMapCenter([lat, selectedLng]);
                  }
                }}
              />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input
                type="number"
                step="0.000001"
                value={selectedLng.toFixed(6)}
                onChange={(e) => {
                  const lng = parseFloat(e.target.value);
                  if (!isNaN(lng)) {
                    setSelectedLng(lng);
                    setMapCenter([selectedLat, lng]);
                  }
                }}
              />
            </div>
          </div>

          {/* Location Name */}
          {locationName && (
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-xs text-muted-foreground">Selected Location</Label>
              <p className="text-sm mt-1">{locationName}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="gap-2">
            <MapPin className="w-4 h-4" />
            Confirm Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

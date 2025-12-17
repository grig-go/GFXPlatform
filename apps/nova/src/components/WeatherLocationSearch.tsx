import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Search, MapPin, Loader2, Plus } from "lucide-react";
import { SavedWeatherLocation } from "../types/weather";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";

interface SearchResult {
  id: string;
  name: string;
  admin1: string;
  country: string;
  lat: number;
  lon: number;
  url: string;
}

interface WeatherLocationSearchProps {
  onAddLocation: (location: SavedWeatherLocation) => void;
  existingLocationIds: string[];
}

export function WeatherLocationSearch({
  onAddLocation,
  existingLocationIds,
}: WeatherLocationSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [addingLocationId, setAddingLocationId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a location to search");
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        getEdgeFunctionUrl(`weather_dashboard/locations/search?q=${encodeURIComponent(searchQuery)}`),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || errorData.detail || "Search failed");
      }

      const data = await response.json();
      setResults(data.results || []);

      if (!data.results || data.results.length === 0) {
        toast.info("No locations found", {
          description: "Try searching with a different term",
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error(`Search failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSearching(false);
    }
  };

  const handleAddLocation = async (result: SearchResult) => {
    if (existingLocationIds.includes(result.id)) {
      toast.error("Location already exists", {
        description: "This location is already being monitored",
      });
      return;
    }

    setAddingLocationId(result.id);
    
    try {
      const newLocation: SavedWeatherLocation = {
        id: result.id,
        name: result.name,
        admin1: result.admin1,
        country: result.country,
        lat: result.lat,
        lon: result.lon,
      };

      await onAddLocation(newLocation);
      setOpen(false);
      setSearchQuery("");
      setResults([]);
    } catch (error) {
      console.error("Error adding location:", error);
      // Error toast is handled by parent component
    } finally {
      setAddingLocationId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Location
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Add Weather Location
          </DialogTitle>
          <DialogDescription>
            Search for a location to add to your weather monitoring
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Search for a city or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              disabled={searching}
            />
            <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {results.length > 0 ? (
              results.map((result) => {
                const alreadyExists = existingLocationIds.includes(result.id);
                return (
                  <div
                    key={result.id}
                    className={`p-3 border rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors ${
                      alreadyExists ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{result.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">
                        {[result.admin1, result.country].filter(Boolean).join(", ")}
                      </p>
                      <p className="text-xs text-muted-foreground ml-6">
                        {result.lat.toFixed(4)}, {result.lon.toFixed(4)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddLocation(result)}
                      disabled={alreadyExists || addingLocationId === result.id}
                      variant={alreadyExists ? "outline" : "default"}
                      className="gap-2"
                    >
                      {addingLocationId === result.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Adding...
                        </>
                      ) : alreadyExists ? (
                        "Already Added"
                      ) : (
                        "Add"
                      )}
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Search for a location to get started</p>
                <p className="text-sm mt-1">Try searching for a city name</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
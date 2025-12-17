import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { MapPin, Users, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface VenueCardProps {
  venue: {
    id: string;
    name: string;
    city?: string;
    country?: string;
    capacity?: number;
    surface?: string;
    image_url?: string;
    team_count?: number;
    latitude?: number;
    longitude?: number;
  };
  onClick?: () => void;
}

export function VenueCard({ venue, onClick }: VenueCardProps) {
  const formatCapacity = (capacity: number) => {
    return capacity.toLocaleString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
    >
      <Card 
        className="h-full overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer"
        onClick={onClick}
      >
        {/* Stadium Image */}
        {venue.image_url && (
          <div className="relative h-48 overflow-hidden bg-muted">
            <ImageWithFallback
              src={venue.image_url}
              alt={venue.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            
            {/* Surface badge overlay */}
            {venue.surface && (
              <Badge 
                variant="secondary" 
                className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm"
              >
                <Layers className="w-3 h-3 mr-1" />
                {venue.surface}
              </Badge>
            )}
          </div>
        )}

        <CardContent className="p-4">
          {/* Stadium Name */}
          <h3 className="font-semibold mb-2 line-clamp-1">
            {venue.name}
          </h3>

          {/* Location */}
          {(venue.city || venue.country) && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {[venue.city, venue.country].filter(Boolean).join(', ')}
              </span>
            </div>
          )}

          {/* Stats Row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Capacity */}
            {venue.capacity && (
              <Badge variant="outline" className="gap-1">
                <Users className="w-3 h-3" />
                {formatCapacity(venue.capacity)}
              </Badge>
            )}

            {/* Team Count */}
            {venue.team_count !== undefined && venue.team_count > 0 && (
              <span className="text-xs text-muted-foreground">
                Home to {venue.team_count} team{venue.team_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Coordinates indicator (for future map integration) */}
          {venue.latitude && venue.longitude && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="font-mono">
                  {venue.latitude.toFixed(4)}, {venue.longitude.toFixed(4)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

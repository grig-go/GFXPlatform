import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { MapPin, Users, Layers, Calendar, Ruler, Building2, RefreshCw } from "lucide-react";
import { supabase } from "../utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface VenueDetailsModalProps {
  venueId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface VenueDetails {
  id: string;
  name: string;
  city?: string;
  country?: string;
  capacity?: number;
  surface?: string;
  image_url?: string;
  description?: string;
  year_opened?: number;
  architect?: string;
  latitude?: number;
  longitude?: number;
  teams?: Array<{
    id: string;
    name: string;
    logo_url?: string;
    colors?: {
      primary?: string;
    };
  }>;
}

export function VenueDetailsModal({ venueId, open, onOpenChange }: VenueDetailsModalProps) {
  const [venueDetails, setVenueDetails] = useState<VenueDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && venueId) {
      fetchVenueDetails();
    }
  }, [open, venueId]);

  const fetchVenueDetails = async () => {
    if (!venueId) return;

    try {
      setLoading(true);
      setError(null);

      console.log('[VenueDetails] Fetching details for venue:', venueId);

      const { data: details, error: rpcError } = await supabase.rpc('get_venue_details', {
        p_venue_id: venueId,
      });

      if (rpcError) {
        console.error('[VenueDetails] RPC error:', rpcError);
        setError(rpcError.message);
        return;
      }

      console.log('[VenueDetails] Raw response:', details);

      if (details?.success) {
        setVenueDetails(details.data);
      } else {
        setError(details?.error || 'Failed to load venue details');
      }
    } catch (err) {
      console.error('[VenueDetails] Error fetching venue details:', err);
      setError('Failed to load venue details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogTitle className="sr-only">
          {venueDetails?.name || 'Venue Details'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Detailed information about {venueDetails?.name || 'the venue'} including capacity, surface, location, and home teams.
        </DialogDescription>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <RefreshCw className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading venue details...</p>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 px-6"
            >
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <MapPin className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-destructive">{error}</p>
            </motion.div>
          ) : venueDetails ? (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-y-auto max-h-[90vh]"
            >
              {/* Large Stadium Image */}
              {venueDetails.image_url && (
                <div className="relative h-80 overflow-hidden bg-muted">
                  <ImageWithFallback
                    src={venueDetails.image_url}
                    alt={venueDetails.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Venue name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h2 className="text-3xl text-white mb-2 font-semibold">
                      {venueDetails.name}
                    </h2>
                    {(venueDetails.city || venueDetails.country) && (
                      <div className="flex items-center gap-2 text-white/90">
                        <MapPin className="w-4 h-4" />
                        <span>{[venueDetails.city, venueDetails.country].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="p-6 space-y-6">
                {!venueDetails.image_url && (
                  <div>
                    <h2 className="text-2xl mb-2 font-semibold">{venueDetails.name}</h2>
                    {(venueDetails.city || venueDetails.country) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{[venueDetails.city, venueDetails.country].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {venueDetails.capacity && (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="pt-4 text-center">
                        <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                        <p className="text-2xl font-bold">{venueDetails.capacity.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Capacity</p>
                      </CardContent>
                    </Card>
                  )}

                  {venueDetails.surface && (
                    <Card className="bg-green-500/5 border-green-500/20">
                      <CardContent className="pt-4 text-center">
                        <Layers className="w-6 h-6 mx-auto mb-2 text-green-600" />
                        <p className="font-bold">{venueDetails.surface}</p>
                        <p className="text-xs text-muted-foreground">Surface</p>
                      </CardContent>
                    </Card>
                  )}

                  {venueDetails.year_opened && (
                    <Card className="bg-blue-500/5 border-blue-500/20">
                      <CardContent className="pt-4 text-center">
                        <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                        <p className="text-2xl font-bold">{venueDetails.year_opened}</p>
                        <p className="text-xs text-muted-foreground">Opened</p>
                      </CardContent>
                    </Card>
                  )}

                  {venueDetails.architect && (
                    <Card className="bg-purple-500/5 border-purple-500/20">
                      <CardContent className="pt-4 text-center">
                        <Building2 className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                        <p className="font-bold text-sm line-clamp-1">{venueDetails.architect}</p>
                        <p className="text-xs text-muted-foreground">Architect</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Description */}
                {venueDetails.description && (
                  <Card>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-2">About</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {venueDetails.description}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Teams */}
                {venueDetails.teams && venueDetails.teams.length > 0 && (
                  <Card>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-3">Home Teams</h3>
                      <div className="space-y-2">
                        {venueDetails.teams.map((team) => (
                          <motion.div
                            key={team.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            {team.logo_url ? (
                              <div 
                                className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1.5 border-2"
                                style={{ borderColor: team.colors?.primary || '#ccc' }}
                              >
                                <ImageWithFallback
                                  src={team.logo_url}
                                  alt={team.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            ) : (
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center border-2"
                                style={{ 
                                  backgroundColor: team.colors?.primary || '#ccc',
                                  borderColor: team.colors?.primary || '#ccc'
                                }}
                              >
                                <span className="text-white font-bold text-sm">
                                  {team.name[0]}
                                </span>
                              </div>
                            )}
                            <span className="font-medium">{team.name}</span>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Map Coordinates */}
                {venueDetails.latitude && venueDetails.longitude && (
                  <Card>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Location Coordinates
                      </h3>
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Latitude</p>
                            <p className="font-mono font-semibold">{venueDetails.latitude.toFixed(6)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Longitude</p>
                            <p className="font-mono font-semibold">{venueDetails.longitude.toFixed(6)}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-3 text-center">
                          Ready for map integration
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
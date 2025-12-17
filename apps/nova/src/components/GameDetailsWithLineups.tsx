import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Calendar, MapPin, Users, User, RefreshCw } from "lucide-react";
import { Separator } from "./ui/separator";
import { supabase } from "../utils/supabase/client";
import { motion } from "framer-motion";

interface GameDetailsWithLineupsProps {
  gameId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PlayerLineup {
  player_id: string;
  name: string;
  jersey_number: number;
  position: string;
  lineup_type: 'starting' | 'substitute';
  goals?: number;
  assists?: number;
  yellow_cards?: number;
  red_cards?: number;
}

interface EventData {
  event: {
    id: string;
    sportradar_id?: string;
    start_time: string;
    status: string;
    round?: string;
    venue?: {
      name: string;
      city?: string;
      capacity?: number;
    };
    attendance?: number;
    referee?: string;
  };
  home_team: {
    id: string;
    name: string;
    abbreviation?: string;
    logo_url?: string;
    score?: number;
    colors?: {
      primary?: string;
      secondary?: string;
    };
  };
  away_team: {
    id: string;
    name: string;
    abbreviation?: string;
    logo_url?: string;
    score?: number;
    colors?: {
      primary?: string;
      secondary?: string;
    };
  };
  home_lineup: PlayerLineup[];
  away_lineup: PlayerLineup[];
  competition?: {
    id: string;
    name: string;
    logo_url?: string;
  };
  season?: {
    id: string;
    name: string;
    year?: string;
  };
}

const getStatusBadge = (status: string) => {
  const statusLower = status.toLowerCase();
  
  if (statusLower === 'live' || statusLower === 'inprogress' || statusLower === 'in_progress') {
    return (
      <Badge className="bg-red-500 text-white border-0 animate-pulse">
        <span className="mr-1">🔴</span> LIVE
      </Badge>
    );
  }
  
  if (statusLower === 'ended' || statusLower === 'closed' || statusLower === 'complete') {
    return <Badge variant="secondary">Full Time</Badge>;
  }
  
  if (statusLower === 'scheduled' || statusLower === 'not_started') {
    return <Badge className="bg-blue-500 text-white border-0">Upcoming</Badge>;
  }
  
  return <Badge variant="outline">{status}</Badge>;
};

const getPositionBadge = (position: string) => {
  const positionUpper = position.toUpperCase();
  
  if (positionUpper.includes('GK') || positionUpper === 'G') {
    return <Badge className="bg-yellow-500 text-white border-0 text-xs">GK</Badge>;
  }
  if (positionUpper.includes('DF') || positionUpper === 'D') {
    return <Badge className="bg-blue-500 text-white border-0 text-xs">DF</Badge>;
  }
  if (positionUpper.includes('MF') || positionUpper === 'M') {
    return <Badge className="bg-green-500 text-white border-0 text-xs">MF</Badge>;
  }
  if (positionUpper.includes('FW') || positionUpper === 'F') {
    return <Badge className="bg-red-500 text-white border-0 text-xs">FW</Badge>;
  }
  
  return <Badge variant="outline" className="text-xs">{position}</Badge>;
};

export function GameDetailsWithLineups({ gameId, open, onOpenChange }: GameDetailsWithLineupsProps) {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && gameId) {
      fetchGameDetails();
    }
  }, [open, gameId]);

  const fetchGameDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[GameDetails] Fetching details for game:', gameId);

      const { data, error: rpcError } = await supabase
        .rpc('get_event_details', { p_event_id: gameId });

      if (rpcError) {
        console.error('[GameDetails] RPC error:', rpcError);
        setError(rpcError.message);
        return;
      }

      if (!data || data.length === 0) {
        console.error('[GameDetails] No data returned');
        setError('Game details not found');
        return;
      }

      const gameData = data[0]?.event_data as EventData;
      console.log('[GameDetails] Fetched event data:', gameData);
      setEventData(gameData);
    } catch (err) {
      console.error('[GameDetails] Error fetching game details:', err);
      setError('Failed to load game details');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isGameEnded = (status: string): boolean => {
    const statusLower = status.toLowerCase();
    return statusLower === 'ended' || statusLower === 'closed' || statusLower === 'complete';
  };

  const PlayerRow = ({ 
    player, 
    teamColor 
  }: { 
    player: PlayerLineup; 
    teamColor?: string;
  }) => (
    <motion.div 
      className="flex items-center gap-2 py-2 hover:bg-muted/30 transition-colors rounded-md"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Jersey Number */}
      <span 
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
        style={{ backgroundColor: teamColor || '#000000' }}
      >
        {player.jersey_number}
      </span>
      
      {/* Player Name */}
      <span className="flex-1 text-sm font-medium truncate">{player.name}</span>
      
      {/* Position Badge */}
      {getPositionBadge(player.position)}
      
      {/* Stats */}
      <div className="flex items-center gap-1.5">
        {player.goals !== undefined && player.goals > 0 && (
          <div className="flex items-center gap-0.5">
            <span className="text-xs">⚽</span>
            <span className="text-xs font-medium">{player.goals}</span>
          </div>
        )}
        {player.assists !== undefined && player.assists > 0 && (
          <div className="flex items-center gap-0.5">
            <span className="text-xs">🅰️</span>
            <span className="text-xs font-medium">{player.assists}</span>
          </div>
        )}
        {player.yellow_cards !== undefined && player.yellow_cards > 0 && (
          <span className="text-xs">🟨</span>
        )}
        {player.red_cards !== undefined && player.red_cards > 0 && (
          <span className="text-xs">🟥</span>
        )}
      </div>
    </motion.div>
  );

  const LineupSection = ({ 
    lineup, 
    teamName, 
    teamColor 
  }: { 
    lineup: PlayerLineup[]; 
    teamName: string;
    teamColor?: string;
  }) => {
    const startingXI = lineup.filter(p => p.lineup_type === 'starting');
    const substitutes = lineup.filter(p => p.lineup_type === 'substitute');

    return (
      <div className="space-y-3">
        <h3 className="font-semibold">{teamName}</h3>
        
        {/* Starting XI */}
        {startingXI.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Starting XI
              </span>
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                {startingXI.length}
              </Badge>
            </div>
            <div className="space-y-0.5">
              {startingXI.map((player) => (
                <PlayerRow 
                  key={player.player_id} 
                  player={player} 
                  teamColor={teamColor}
                />
              ))}
            </div>
          </div>
        )}

        {/* Substitutes */}
        {substitutes.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Substitutes
              </span>
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                {substitutes.length}
              </Badge>
            </div>
            <div className="space-y-0.5 opacity-80">
              {substitutes.map((player) => (
                <PlayerRow 
                  key={player.player_id} 
                  player={player} 
                  teamColor={teamColor}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
        {loading ? (
          <>
            <DialogTitle>Loading Game Details</DialogTitle>
            <DialogDescription>Please wait while we fetch the match information</DialogDescription>
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading game details...</span>
            </div>
          </>
        ) : error ? (
          <>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>Unable to load game details</DialogDescription>
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{error}</p>
            </div>
          </>
        ) : eventData ? (
          <>
            {/* Header */}
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {eventData.competition?.logo_url && (
                    <img
                      src={eventData.competition.logo_url}
                      alt={eventData.competition.name}
                      className="w-10 h-10 object-contain"
                    />
                  )}
                  <div>
                    <DialogTitle>{eventData.competition?.name || 'Match Details'}</DialogTitle>
                    {eventData.season && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {eventData.season.name} {eventData.season.year && `(${eventData.season.year})`}
                      </p>
                    )}
                  </div>
                </div>
                {getStatusBadge(eventData.event.status)}
              </div>
            </DialogHeader>
            <DialogDescription>
              {eventData.event.status === 'ended' || eventData.event.status === 'closed' || eventData.event.status === 'complete'
                ? `Final score: ${eventData.home_team.name} ${eventData.home_team.score ?? 0} - ${eventData.away_team.score ?? 0} ${eventData.away_team.name}`
                : `Upcoming match between ${eventData.home_team.name} and ${eventData.away_team.name}`}
            </DialogDescription>

            {/* Score Section */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-6">
                  {/* Home Team */}
                  <div className="flex flex-col items-center gap-2 flex-1">
                    {eventData.home_team.logo_url ? (
                      <img
                        src={eventData.home_team.logo_url}
                        alt={eventData.home_team.name}
                        className="w-16 h-16 object-contain"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                        <span className="text-xl font-bold">
                          {eventData.home_team.abbreviation?.[0] || 'H'}
                        </span>
                      </div>
                    )}
                    <p className="font-semibold text-center">{eventData.home_team.name}</p>
                  </div>

                  {/* Score */}
                  <div className="text-center">
                    {isGameEnded(eventData.event.status) ? (
                      <div className="text-4xl font-bold">
                        {eventData.home_team.score ?? 0} - {eventData.away_team.score ?? 0}
                      </div>
                    ) : (
                      <div className="text-2xl text-muted-foreground font-medium">vs</div>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">
                      {formatDateTime(eventData.event.start_time)}
                    </p>
                    {eventData.event.venue && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {eventData.event.venue.name}
                        {eventData.event.venue.city && `, ${eventData.event.venue.city}`}
                      </p>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="flex flex-col items-center gap-2 flex-1">
                    {eventData.away_team.logo_url ? (
                      <img
                        src={eventData.away_team.logo_url}
                        alt={eventData.away_team.name}
                        className="w-16 h-16 object-contain"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                        <span className="text-xl font-bold">
                          {eventData.away_team.abbreviation?.[0] || 'A'}
                        </span>
                      </div>
                    )}
                    <p className="font-semibold text-center">{eventData.away_team.name}</p>
                  </div>
                </div>

                {/* Additional Match Info */}
                {(eventData.event.attendance || eventData.event.referee) && (
                  <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t text-sm text-muted-foreground">
                    {eventData.event.attendance && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{eventData.event.attendance.toLocaleString()} attendance</span>
                      </div>
                    )}
                    {eventData.event.referee && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Referee: {eventData.event.referee}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="lineups" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="lineups">Lineups</TabsTrigger>
                <TabsTrigger value="stats" disabled>Match Stats</TabsTrigger>
                <TabsTrigger value="events" disabled>Events</TabsTrigger>
              </TabsList>

              <TabsContent value="lineups" className="mt-4">
                {eventData.home_lineup.length === 0 && eventData.away_lineup.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Lineups not yet available for this match
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Home Lineup */}
                    <Card>
                      <CardContent className="pt-6">
                        <LineupSection
                          lineup={eventData.home_lineup}
                          teamName={eventData.home_team.name}
                          teamColor={eventData.home_team.colors?.primary}
                        />
                      </CardContent>
                    </Card>

                    {/* Away Lineup */}
                    <Card>
                      <CardContent className="pt-6">
                        <LineupSection
                          lineup={eventData.away_lineup}
                          teamName={eventData.away_team.name}
                          teamColor={eventData.away_team.colors?.primary}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="stats">
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">Match statistics coming soon</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="events">
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">Match events timeline coming soon</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Match Information Footer */}
            {eventData.event.venue && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">Venue Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {eventData.event.venue.name && (
                      <div>
                        <p className="text-muted-foreground">Venue</p>
                        <p className="font-medium">{eventData.event.venue.name}</p>
                      </div>
                    )}
                    {eventData.event.venue.city && (
                      <div>
                        <p className="text-muted-foreground">City</p>
                        <p className="font-medium">{eventData.event.venue.city}</p>
                      </div>
                    )}
                    {eventData.event.venue.capacity && (
                      <div>
                        <p className="text-muted-foreground">Capacity</p>
                        <p className="font-medium">{eventData.event.venue.capacity.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
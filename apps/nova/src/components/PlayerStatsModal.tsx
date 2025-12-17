import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { User, TrendingUp, Trophy, Activity, RefreshCw, Calendar, MapPin, Ruler, Weight } from "lucide-react";
import { supabase } from "../utils/supabase/client";
import { motion } from "framer-motion";

interface PlayerStatsModalProps {
  playerId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seasonId?: number | null;
  teamId?: number | null;
}

interface PlayerData {
  player: {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    position?: string;
    jersey_number?: number;
    photo_url?: string;
    date_of_birth?: string;
    nationality?: string;
    nationality_code?: string;
  };
  current_team?: {
    team_id: number;
    team_name: string;
    team_logo?: string;
    colors?: {
      primary?: string;
      secondary?: string;
    };
  };
  season_stats?: {
    appearances?: number;
    starts?: number;
    minutes_played?: number;
    goals?: number;
    assists?: number;
    yellow_cards?: number;
    red_cards?: number;
    shots?: number;
    shots_on_target?: number;
    passes?: number;
    pass_accuracy?: number;
    tackles?: number;
    interceptions?: number;
    saves?: number;
    clean_sheets?: number;
    rating?: string;
  };
  career_stats?: {
    total_appearances?: number;
    total_goals?: number;
    total_assists?: number;
    total_minutes?: number;
    seasons_played?: number;
  };
}

const getPositionColor = (position?: string) => {
  if (!position) return "bg-gray-500";
  const pos = position.toLowerCase();
  if (pos.includes("goalkeeper") || pos.includes("gk")) return "bg-yellow-500";
  if (pos.includes("defender") || pos.includes("df")) return "bg-blue-500";
  if (pos.includes("midfielder") || pos.includes("mf")) return "bg-green-500";
  if (pos.includes("forward") || pos.includes("fw") || pos.includes("attacker")) return "bg-red-500";
  return "bg-gray-500";
};

export function PlayerStatsModal({ playerId, open, onOpenChange, seasonId, teamId }: PlayerStatsModalProps) {
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && playerId) {
      fetchPlayerStats();
    }
  }, [open, playerId, seasonId, teamId]);

  const fetchPlayerStats = async () => {
    if (!playerId) return;

    try {
      setLoading(true);
      setError(null);

      console.log('[PlayerStats] Fetching stats for player:', playerId);

      const { data: stats, error: rpcError } = await supabase.rpc('get_player_stats', {
        p_player_id: playerId,
        p_season_id: seasonId || null,
      });

      if (rpcError) {
        console.error('[PlayerStats] RPC error:', rpcError);
        setError(rpcError.message);
        return;
      }

      console.log('[PlayerStats] Raw response:', stats);

      // Check if successful
      if (stats?.success) {
        const playerData = stats.data;
        console.log('[PlayerStats] Player data:', playerData);
        setPlayerData(playerData);
      } else {
        console.error('[PlayerStats] Request failed:', stats);
        setError(stats?.error || 'Failed to load player stats');
      }
    } catch (err) {
      console.error('[PlayerStats] Error fetching player stats:', err);
      setError('Failed to load player stats');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string): number | null => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    subValue 
  }: { 
    icon: any; 
    label: string; 
    value: string | number; 
    subValue?: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="pt-6 relative">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl group-hover:scale-110 transition-transform">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold mb-1">{value}</p>
              <p className="text-sm text-muted-foreground font-medium">{label}</p>
              {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const seasonStats = playerData?.season_stats;
  const careerStats = playerData?.career_stats;
  const age = playerData?.player?.date_of_birth ? calculateAge(playerData.player.date_of_birth) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
        {loading ? (
          <>
            <DialogTitle>Loading Player Stats</DialogTitle>
            <DialogDescription>Please wait while we fetch player information</DialogDescription>
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading player stats...</span>
            </div>
          </>
        ) : error ? (
          <>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>Unable to load player stats</DialogDescription>
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{error}</p>
            </div>
          </>
        ) : playerData ? (
          <>
            <DialogTitle>{playerData.player.name}</DialogTitle>
            <DialogDescription>
              {playerData.current_team?.team_name && `${playerData.current_team.team_name} - `}
              {playerData.player.position || 'Player Statistics and Career Information'}
            </DialogDescription>

            {/* Player Header */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="pt-6">
                <div className="flex items-start gap-6">
                  {/* Player Photo */}
                  <div className="flex-shrink-0">
                    {playerData.player.photo_url ? (
                      <img
                        src={playerData.player.photo_url}
                        alt={playerData.player.name}
                        className="w-24 h-24 rounded-full object-cover border-4 border-background shadow-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-background shadow-lg">
                        <User className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h2 className="text-2xl font-bold mb-1">
                          {playerData.player.name}
                        </h2>
                        <div className="flex items-center gap-2">
                          {playerData.player.position && (
                            <Badge className={`${getPositionColor(playerData.player.position)} text-white border-0`}>
                              {playerData.player.position}
                            </Badge>
                          )}
                          {playerData.player.jersey_number && (
                            <Badge variant="outline" className="font-bold">
                              #{playerData.player.jersey_number}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Team Logo */}
                      {playerData.current_team?.team_logo && (
                        <img
                          src={playerData.current_team.team_logo}
                          alt={playerData.current_team.team_name}
                          className="w-16 h-16 object-contain"
                        />
                      )}
                    </div>

                    {/* Player Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-sm">
                      {age !== null && (
                        <div>
                          <p className="text-muted-foreground">Age</p>
                          <p className="font-semibold">{age} years</p>
                        </div>
                      )}
                      {playerData.player.nationality && (
                        <div>
                          <p className="text-muted-foreground">Nationality</p>
                          <p className="font-semibold">
                            {playerData.player.nationality_code && (
                              <span className="mr-1">{playerData.player.nationality_code}</span>
                            )}
                            {playerData.player.nationality}
                          </p>
                        </div>
                      )}
                    </div>

                    {playerData.player.date_of_birth && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Born {formatDate(playerData.player.date_of_birth)}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Tabs */}
            <Tabs defaultValue="season" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="season">Season Stats</TabsTrigger>
                <TabsTrigger value="career">Career Stats</TabsTrigger>
              </TabsList>

              {/* Season Stats */}
              <TabsContent value="season" className="mt-4">
                {seasonStats ? (
                  <div className="space-y-4">
                    {/* Key Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {seasonStats.appearances !== undefined && (
                        <StatCard
                          icon={Activity}
                          label="Appearances"
                          value={seasonStats.appearances}
                        />
                      )}
                      {seasonStats.goals !== undefined && (
                        <StatCard
                          icon={TrendingUp}
                          label="Goals"
                          value={seasonStats.goals}
                        />
                      )}
                      {seasonStats.assists !== undefined && (
                        <StatCard
                          icon={Trophy}
                          label="Assists"
                          value={seasonStats.assists}
                        />
                      )}
                      {seasonStats.minutes_played !== undefined && (
                        <StatCard
                          icon={Activity}
                          label="Minutes"
                          value={seasonStats.minutes_played.toLocaleString()}
                          subValue={seasonStats.appearances ? `${Math.round(seasonStats.minutes_played / seasonStats.appearances)} avg` : undefined}
                        />
                      )}
                    </div>

                    {/* Additional Stats */}
                    <Card className="overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                        <CardTitle>Performance Metrics</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          {seasonStats.rating && (
                            <motion.div 
                              className="text-center p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20"
                              whileHover={{ scale: 1.05 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="flex items-center justify-center mb-2">
                                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                                  <TrendingUp className="w-6 h-6 text-amber-600" />
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">Rating</p>
                              <p className="text-3xl font-bold text-amber-600">{seasonStats.rating}</p>
                            </motion.div>
                          )}
                          {seasonStats.shots !== undefined && (
                            <motion.div 
                              className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20"
                              whileHover={{ scale: 1.05 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="flex items-center justify-center mb-2">
                                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                  <Activity className="w-6 h-6 text-blue-600" />
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">Shots on Target</p>
                              <p className="text-2xl font-bold text-blue-600">
                                {seasonStats.shots_on_target || 0} / {seasonStats.shots}
                              </p>
                              {seasonStats.shots > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {Math.round(((seasonStats.shots_on_target || 0) / seasonStats.shots) * 100)}% accuracy
                                </p>
                              )}
                            </motion.div>
                          )}
                          {seasonStats.pass_accuracy !== undefined && (
                            <motion.div 
                              className="text-center p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20"
                              whileHover={{ scale: 1.05 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="flex items-center justify-center mb-2">
                                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                  <TrendingUp className="w-6 h-6 text-green-600" />
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">Pass Accuracy</p>
                              <p className="text-3xl font-bold text-green-600">{seasonStats.pass_accuracy}%</p>
                            </motion.div>
                          )}
                          {seasonStats.tackles !== undefined && (
                            <motion.div 
                              className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20"
                              whileHover={{ scale: 1.05 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="flex items-center justify-center mb-2">
                                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                                  <Activity className="w-6 h-6 text-purple-600" />
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">Tackles</p>
                              <p className="text-3xl font-bold text-purple-600">{seasonStats.tackles}</p>
                            </motion.div>
                          )}
                          {seasonStats.interceptions !== undefined && (
                            <motion.div 
                              className="text-center p-4 rounded-lg bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border border-indigo-500/20"
                              whileHover={{ scale: 1.05 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="flex items-center justify-center mb-2">
                                <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                  <Activity className="w-6 h-6 text-indigo-600" />
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">Interceptions</p>
                              <p className="text-3xl font-bold text-indigo-600">{seasonStats.interceptions}</p>
                            </motion.div>
                          )}
                          {seasonStats.clean_sheets !== undefined && (
                            <motion.div 
                              className="text-center p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20"
                              whileHover={{ scale: 1.05 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="flex items-center justify-center mb-2">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                  <Trophy className="w-6 h-6 text-emerald-600" />
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">Clean Sheets</p>
                              <p className="text-3xl font-bold text-emerald-600">{seasonStats.clean_sheets}</p>
                            </motion.div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Discipline */}
                    {(seasonStats.yellow_cards !== undefined || seasonStats.red_cards !== undefined) && (
                      <Card className="overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                          <CardTitle>Discipline</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-2 gap-4">
                            {seasonStats.yellow_cards !== undefined && (
                              <motion.div
                                className="p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20"
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                    <span className="text-2xl">🟨</span>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Yellow Cards</p>
                                    <p className="text-3xl font-bold text-yellow-600">{seasonStats.yellow_cards}</p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                            {seasonStats.red_cards !== undefined && (
                              <motion.div
                                className="p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20"
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <span className="text-2xl">🟥</span>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Red Cards</p>
                                    <p className="text-3xl font-bold text-red-600">{seasonStats.red_cards}</p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Activity className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No season statistics available for this player
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Career Stats */}
              <TabsContent value="career" className="mt-4">
                {careerStats ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {careerStats.total_appearances !== undefined && (
                      <StatCard
                        icon={Activity}
                        label="Total Appearances"
                        value={careerStats.total_appearances}
                        subValue={careerStats.seasons_played ? `${careerStats.seasons_played} seasons` : undefined}
                      />
                    )}
                    {careerStats.total_goals !== undefined && (
                      <StatCard
                        icon={TrendingUp}
                        label="Total Goals"
                        value={careerStats.total_goals}
                        subValue={careerStats.total_appearances ? `${(careerStats.total_goals / careerStats.total_appearances).toFixed(2)} per game` : undefined}
                      />
                    )}
                    {careerStats.total_assists !== undefined && (
                      <StatCard
                        icon={Trophy}
                        label="Total Assists"
                        value={careerStats.total_assists}
                      />
                    )}
                    {careerStats.seasons_played !== undefined && (
                      <StatCard
                        icon={Calendar}
                        label="Seasons Played"
                        value={careerStats.seasons_played}
                      />
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No career statistics available for this player
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
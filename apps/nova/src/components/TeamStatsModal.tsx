import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Trophy, TrendingUp, Target, Activity, RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "../utils/supabase/client";
import { motion } from "framer-motion";

interface TeamStatsModalProps {
  teamId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seasonId?: number | null;
}

interface TeamData {
  team: {
    id: string;
    name: string;
    short_name?: string;
    logo_url?: string;
    colors?: {
      primary?: string;
      secondary?: string;
    };
  };
  season_stats?: {
    played?: number;
    wins?: number;
    draws?: number;
    losses?: number;
    goals_for?: number;
    goals_against?: number;
    goal_difference?: number;
    points?: number;
    avg_possession?: number;
    pass_accuracy?: number;
    shots_per_game?: number;
    shots_on_target_per_game?: number;
    clean_sheets?: number;
    yellow_cards?: number;
    red_cards?: number;
    win_percentage?: number;
  };
}

export function TeamStatsModal({ teamId, open, onOpenChange, seasonId }: TeamStatsModalProps) {
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && teamId) {
      fetchTeamStats();
    }
  }, [open, teamId, seasonId]);

  const fetchTeamStats = async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);

      console.log('[TeamStats] Fetching stats for team:', teamId);

      const { data: stats, error: rpcError } = await supabase.rpc('get_team_stats', {
        p_team_id: teamId,
        p_season_id: seasonId || null,
      });

      if (rpcError) {
        console.error('[TeamStats] RPC error:', rpcError);
        setError(rpcError.message);
        return;
      }

      console.log('[TeamStats] Raw response:', stats);

      // Check if successful
      if (stats?.success) {
        const data = stats.data;
        console.log('[TeamStats] Team data:', data);
        setTeamData(data);
      } else {
        console.error('[TeamStats] Request failed:', stats);
        setError(stats?.error || 'Failed to load team stats');
      }
    } catch (err) {
      console.error('[TeamStats] Error fetching team stats:', err);
      setError('Failed to load team stats');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    subValue,
    color = "primary"
  }: { 
    icon: any; 
    label: string; 
    value: string | number; 
    subValue?: string;
    color?: string;
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
            <div className={`p-3 bg-gradient-to-br from-${color}/10 to-${color}/5 rounded-xl group-hover:scale-110 transition-transform`}>
              <Icon className={`w-6 h-6 text-${color}`} />
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

  const seasonStats = teamData?.season_stats;
  const primaryColor = teamData?.team?.colors?.primary || '#000000';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
        {loading ? (
          <>
            <DialogTitle>Loading Team Stats</DialogTitle>
            <DialogDescription>Please wait while we fetch team information</DialogDescription>
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading team stats...</span>
            </div>
          </>
        ) : error ? (
          <>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>Unable to load team stats</DialogDescription>
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{error}</p>
            </div>
          </>
        ) : teamData ? (
          <>
            <DialogTitle>{teamData.team.name}</DialogTitle>
            <DialogDescription>
              Team Statistics and Performance Overview
            </DialogDescription>

            {/* Team Header */}
            <Card 
              className="relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}05 100%)`
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-6">
                  {/* Team Logo */}
                  <div className="flex-shrink-0">
                    {teamData.team.logo_url ? (
                      <div 
                        className="w-24 h-24 rounded-full bg-background p-4 shadow-lg flex items-center justify-center"
                        style={{ borderColor: primaryColor, borderWidth: '3px', borderStyle: 'solid' }}
                      >
                        <img
                          src={teamData.team.logo_url}
                          alt={teamData.team.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-24 h-24 rounded-full bg-muted flex items-center justify-center shadow-lg"
                        style={{ borderColor: primaryColor, borderWidth: '3px', borderStyle: 'solid' }}
                      >
                        <Trophy className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Team Info */}
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-2">{teamData.team.name}</h2>
                    {teamData.team.short_name && teamData.team.short_name !== teamData.team.name && (
                      <p className="text-lg text-muted-foreground">{teamData.team.short_name}</p>
                    )}
                    
                    {/* Quick Stats */}
                    {seasonStats && (
                      <div className="flex items-center gap-4 mt-3">
                        {seasonStats.win_percentage !== undefined && (
                          <Badge 
                            className="text-white border-0 px-3 py-1"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {seasonStats.win_percentage}% Win Rate
                          </Badge>
                        )}
                        {seasonStats.points !== undefined && (
                          <Badge variant="outline" className="px-3 py-1">
                            {seasonStats.points} Points
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            {seasonStats ? (
              <div className="space-y-4 mt-4">
                {/* Match Record */}
                <Card className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                    <CardTitle>Match Record</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {seasonStats.played !== undefined && (
                        <StatCard
                          icon={Activity}
                          label="Played"
                          value={seasonStats.played}
                        />
                      )}
                      {seasonStats.wins !== undefined && (
                        <StatCard
                          icon={Trophy}
                          label="Wins"
                          value={seasonStats.wins}
                          subValue={seasonStats.played ? `${Math.round((seasonStats.wins / seasonStats.played) * 100)}%` : undefined}
                        />
                      )}
                      {seasonStats.draws !== undefined && (
                        <StatCard
                          icon={Activity}
                          label="Draws"
                          value={seasonStats.draws}
                        />
                      )}
                      {seasonStats.losses !== undefined && (
                        <StatCard
                          icon={Activity}
                          label="Losses"
                          value={seasonStats.losses}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Goals */}
                <Card className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                    <CardTitle>Goals</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {seasonStats.goals_for !== undefined && (
                        <motion.div 
                          className="text-center p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20"
                          whileHover={{ scale: 1.05 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex items-center justify-center mb-2">
                            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                              <Target className="w-6 h-6 text-green-600" />
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">Goals For</p>
                          <p className="text-3xl font-bold text-green-600">{seasonStats.goals_for}</p>
                          {seasonStats.played && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {(seasonStats.goals_for / seasonStats.played).toFixed(1)} per game
                            </p>
                          )}
                        </motion.div>
                      )}
                      {seasonStats.goals_against !== undefined && (
                        <motion.div 
                          className="text-center p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20"
                          whileHover={{ scale: 1.05 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex items-center justify-center mb-2">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                              <Target className="w-6 h-6 text-red-600" />
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">Goals Against</p>
                          <p className="text-3xl font-bold text-red-600">{seasonStats.goals_against}</p>
                          {seasonStats.played && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {(seasonStats.goals_against / seasonStats.played).toFixed(1)} per game
                            </p>
                          )}
                        </motion.div>
                      )}
                      {seasonStats.goal_difference !== undefined && (
                        <motion.div 
                          className={`text-center p-4 rounded-lg bg-gradient-to-br ${
                            seasonStats.goal_difference >= 0 
                              ? 'from-blue-500/10 to-blue-500/5 border border-blue-500/20' 
                              : 'from-orange-500/10 to-orange-500/5 border border-orange-500/20'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex items-center justify-center mb-2">
                            <div className={`w-12 h-12 rounded-full ${
                              seasonStats.goal_difference >= 0 ? 'bg-blue-500/20' : 'bg-orange-500/20'
                            } flex items-center justify-center`}>
                              <TrendingUp className={`w-6 h-6 ${
                                seasonStats.goal_difference >= 0 ? 'text-blue-600' : 'text-orange-600'
                              }`} />
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">Goal Difference</p>
                          <p className={`text-3xl font-bold ${
                            seasonStats.goal_difference >= 0 ? 'text-blue-600' : 'text-orange-600'
                          }`}>
                            {seasonStats.goal_difference > 0 ? '+' : ''}{seasonStats.goal_difference}
                          </p>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                    <CardTitle>Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {seasonStats.avg_possession !== undefined && (
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
                          <p className="text-sm text-muted-foreground mb-1">Avg Possession</p>
                          <p className="text-3xl font-bold text-purple-600">{seasonStats.avg_possession}%</p>
                        </motion.div>
                      )}
                      {seasonStats.pass_accuracy !== undefined && (
                        <motion.div 
                          className="text-center p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20"
                          whileHover={{ scale: 1.05 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex items-center justify-center mb-2">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                              <TrendingUp className="w-6 h-6 text-emerald-600" />
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">Pass Accuracy</p>
                          <p className="text-3xl font-bold text-emerald-600">{seasonStats.pass_accuracy}%</p>
                        </motion.div>
                      )}
                      {seasonStats.clean_sheets !== undefined && (
                        <motion.div 
                          className="text-center p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20"
                          whileHover={{ scale: 1.05 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex items-center justify-center mb-2">
                            <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                              <ShieldCheck className="w-6 h-6 text-cyan-600" />
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">Clean Sheets</p>
                          <p className="text-3xl font-bold text-cyan-600">{seasonStats.clean_sheets}</p>
                          {seasonStats.played && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {Math.round((seasonStats.clean_sheets / seasonStats.played) * 100)}% of games
                            </p>
                          )}
                        </motion.div>
                      )}
                      {seasonStats.shots_per_game !== undefined && (
                        <motion.div 
                          className="text-center p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20"
                          whileHover={{ scale: 1.05 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex items-center justify-center mb-2">
                            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                              <Target className="w-6 h-6 text-amber-600" />
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">Shots Per Game</p>
                          <p className="text-3xl font-bold text-amber-600">{seasonStats.shots_per_game}</p>
                        </motion.div>
                      )}
                      {seasonStats.shots_on_target_per_game !== undefined && (
                        <motion.div 
                          className="text-center p-4 rounded-lg bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border border-indigo-500/20"
                          whileHover={{ scale: 1.05 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex items-center justify-center mb-2">
                            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                              <Target className="w-6 h-6 text-indigo-600" />
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">Shots on Target</p>
                          <p className="text-3xl font-bold text-indigo-600">{seasonStats.shots_on_target_per_game}</p>
                          <p className="text-xs text-muted-foreground mt-1">per game</p>
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
                                {seasonStats.played && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {(seasonStats.yellow_cards / seasonStats.played).toFixed(1)} per game
                                  </p>
                                )}
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
                                {seasonStats.played && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {(seasonStats.red_cards / seasonStats.played).toFixed(2)} per game
                                  </p>
                                )}
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
                  <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No statistics available for this team
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

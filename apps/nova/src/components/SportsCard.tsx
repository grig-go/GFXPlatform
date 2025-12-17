import { useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { SimpleInlineEditField } from "./SimpleInlineEditField";
import { SimpleInlineNumberEdit } from "./SimpleInlineNumberEdit";
import { OverrideIndicator } from "./OverrideIndicator";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SportsNews } from "./SportsNews";
import { Team, Player, Game, Venue, Tournament, SportsEntityWithOverrides, SportsView, FieldOverride, League } from "../types/sports";
import { MoreHorizontal, Users, User, Calendar, MapPin, Clock, Trophy, Target, Activity, Newspaper, Brain, Eye, EyeOff, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

interface SportsCardProps {
  entity: SportsEntityWithOverrides;
  view: SportsView;
  leagues: League[];
  teams?: Team[];
  onUpdate: (entity: SportsEntityWithOverrides) => void;
  onDelete?: (entityId: string) => void;
  showOverrides: boolean;
}

export function SportsCard({ entity, view, leagues, teams = [], onUpdate, onDelete, showOverrides }: SportsCardProps) {
  const [showOverridesDialog, setShowOverridesDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showNewsDialog, setShowNewsDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const handleFieldUpdate = (field: string, value: any, originalValue: any) => {
    const override: FieldOverride = {
      field,
      originalValue,
      overriddenValue: value,
      overriddenAt: new Date().toISOString(),
      overriddenBy: 'current_user',
      provider: entity.primaryProvider
    };

    const updatedEntity = {
      ...entity,
      entity: { ...entity.entity, [field]: value },
      overrides: [
        ...entity.overrides.filter(o => o.field !== field),
        override
      ],
      lastUpdated: new Date().toISOString()
    };

    onUpdate(updatedEntity);
  };

  const handleNestedFieldUpdate = (path: string[], value: any, originalValue: any) => {
    const field = path.join('.');
    const updatedEntity = { ...entity.entity };
    
    // Navigate to the nested property and update it
    let current = updatedEntity;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {};
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;

    const override: FieldOverride = {
      field,
      originalValue,
      overriddenValue: value,
      overriddenAt: new Date().toISOString(),
      overriddenBy: 'current_user',
      provider: entity.primaryProvider
    };

    const updatedFullEntity = {
      ...entity,
      entity: updatedEntity,
      overrides: [
        ...entity.overrides.filter(o => o.field !== field),
        override
      ],
      lastUpdated: new Date().toISOString()
    };

    onUpdate(updatedFullEntity);
  };

  const getOverride = (field: string) => {
    return entity.overrides.find(o => o.field === field);
  };

  const getLeagueName = (leagueId: string) => {
    const league = leagues.find(l => l.id === leagueId);
    return league ? league.abbrev : leagueId;
  };

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : teamId;
  };

  const getTeamAbbrev = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.abbrev : teamId;
  };

  const getTeamLogo = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team?.brand?.logos?.[0]?.url;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'final': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'scheduled': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'postponed': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'injured': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const renderTeamCard = () => {
    const team = entity.entity as Team;
    
    // Calculate record stats if we have them
    const wins = team.stats?.wins || team.stats?.record?.wins || 0;
    const draws = team.stats?.draws || team.stats?.record?.draws || 0;
    const losses = team.stats?.losses || team.stats?.record?.losses || 0;
    const recordFormatted = `${wins}-${draws}-${losses}`;
    
    // Convert last5 string to array for display (e.g., "WWLDW" -> ["W", "W", "L", "D", "W"])
    const last5Results = team.stats?.last5 ? team.stats.last5.split('') : (team.latest_form?.L5 || []);
    
    // Get team brand colors (check both database colors field and brand object)
    const dbColors = (team as any).colors;
    const primaryColor = dbColors?.primary || team.brand?.primary_color || '#000000';
    const secondaryColor = dbColors?.secondary || team.brand?.secondary_color || '#FFFFFF';
    
    // Check if we have valid colors (not defaults)
    const hasCustomColors = primaryColor !== '#000000' || secondaryColor !== '#FFFFFF';
    
    return (
      <Card 
        className={`transition-all duration-200 ${!isActive ? 'opacity-50' : ''}`}
        style={hasCustomColors ? {
          borderTopColor: primaryColor,
          borderTopWidth: '3px',
        } : undefined}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {/* Team Logo with fallback and team color background */}
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: hasCustomColors ? `${primaryColor}15` : undefined,
                  border: hasCustomColors ? `2px solid ${primaryColor}40` : undefined,
                }}
              >
                {(team as any).logo_url || team.brand?.logos?.[0]?.url ? (
                  <ImageWithFallback
                    src={(team as any).logo_url || team.brand.logos[0].url}
                    alt={`${team.name} logo`}
                    className="w-10 h-10 rounded-lg object-contain"
                  />
                ) : (
                  <Users 
                    className="w-6 h-6" 
                    style={{ color: hasCustomColors ? primaryColor : undefined }}
                  />
                )}
              </div>
              
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <SimpleInlineEditField
                    value={team.name}
                    onSave={(value) => handleFieldUpdate('name', value, team.name)}
                    className="font-semibold"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {getLeagueName(team.league_id)}
                  </Badge>
                  {/* Team Colors Indicator */}
                  {hasCustomColors && (
                    <div className="flex items-center gap-1">
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
                        style={{ backgroundColor: primaryColor }}
                        title={`Primary: ${primaryColor}`}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
                        style={{ backgroundColor: secondaryColor }}
                        title={`Secondary: ${secondaryColor}`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsActive(!isActive)}>
                  {isActive ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {isActive ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowNewsDialog(true)}>
                  <Newspaper className="w-4 h-4 mr-2" />
                  News
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAIDialog(true)}>
                  <Brain className="w-4 h-4 mr-2" />
                  AI Insights
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Record and Form Row */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <div className="text-sm text-muted-foreground">Record</div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1">
                  <SimpleInlineNumberEdit
                    value={wins}
                    onSave={(value) => handleNestedFieldUpdate(['stats', 'wins'], value, wins)}
                    className="text-sm font-semibold"
                    style={hasCustomColors ? { color: primaryColor } : undefined}
                  />
                  <span className="text-xs text-muted-foreground">W</span>
                </div>
                <span className="text-sm text-muted-foreground">-</span>
                <div className="flex items-center gap-1">
                  <SimpleInlineNumberEdit
                    value={draws}
                    onSave={(value) => handleNestedFieldUpdate(['stats', 'draws'], value, draws)}
                    className="text-sm"
                  />
                  <span className="text-xs text-muted-foreground">D</span>
                </div>
                <span className="text-sm text-muted-foreground">-</span>
                <div className="flex items-center gap-1">
                  <SimpleInlineNumberEdit
                    value={losses}
                    onSave={(value) => handleNestedFieldUpdate(['stats', 'losses'], value, losses)}
                    className="text-sm"
                  />
                  <span className="text-xs text-muted-foreground">L</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="text-sm text-muted-foreground">Form (L5)</div>
              {team.latest_form?.L5 && team.latest_form.L5.length > 0 ? (
                <div className="flex gap-1">
                  {team.latest_form.L5.map((result, index) => (
                    <span
                      key={index}
                      className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium ${
                        result === 'W' ? 'bg-green-500 text-white' : 
                        result === 'L' ? 'bg-red-500 text-white' : 
                        'bg-gray-400 text-white dark:bg-gray-600'
                      }`}
                    >
                      {result}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No data</div>
              )}
            </div>
          </div>

          {/* Stats Row - Soccer/Football */}
          {team.stats && (
            <div className="grid grid-cols-4 gap-4 pt-3 border-t">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Points</div>
                <SimpleInlineNumberEdit
                  value={team.stats.points || 0}
                  onSave={(value) => handleNestedFieldUpdate(['stats', 'points'], value, team.stats.points)}
                  className="text-sm font-semibold"
                  style={hasCustomColors ? { color: primaryColor } : undefined}
                />
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">GF</div>
                <SimpleInlineNumberEdit
                  value={team.stats.goals_for || team.stats.gf || 0}
                  onSave={(value) => handleNestedFieldUpdate(['stats', 'goals_for'], value, team.stats.goals_for)}
                  className="text-sm"
                />
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">GA</div>
                <SimpleInlineNumberEdit
                  value={team.stats.goals_against || team.stats.ga || 0}
                  onSave={(value) => handleNestedFieldUpdate(['stats', 'goals_against'], value, team.stats.goals_against)}
                  className="text-sm"
                />
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">GD</div>
                <div className="text-sm">
                  {((team.stats.goals_for || team.stats.gf || 0) - (team.stats.goals_against || team.stats.ga || 0)) > 0 && '+'}
                  {(team.stats.goals_for || team.stats.gf || 0) - (team.stats.goals_against || team.stats.ga || 0)}
                </div>
              </div>
            </div>
          )}

          {/* Additional Info - Coach, Venue, Players */}
          {(team.manager || team.venue || (team.roster && team.roster.length > 0)) && (
            <div className="pt-3 border-t space-y-2.5 text-sm">
              {team.manager && (
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Coach:</span>
                  <span className="font-medium">{team.manager.name}</span>
                </div>
              )}
              
              {team.venue && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Venue:</span>
                  <span className="font-medium">{team.venue.name}</span>
                  {team.venue.city && (
                    <span className="text-muted-foreground text-xs">({team.venue.city})</span>
                  )}
                </div>
              )}
              
              {team.roster && team.roster.length > 0 && (
                <div className="flex items-start gap-2">
                  <Users className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="text-muted-foreground mb-1">Key Players:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {team.roster.slice(0, 5).map((player, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {player.name?.display || player.name?.full || 'Unknown'}
                        </Badge>
                      ))}
                      {team.roster.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{team.roster.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPlayerCard = () => {
    const player = entity.entity as Player;
    return (
      <Card className={`transition-all duration-200 ${!isActive ? 'opacity-50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {player.media?.headshots && player.media.headshots[0] && (
                <ImageWithFallback
                  src={player.media.headshots[0].url}
                  alt={`${player.name.display} headshot`}
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <SimpleInlineEditField
                    value={player.name.display}
                    onSave={(value) => handleNestedFieldUpdate(['name', 'display'], value, player.name.display)}
                    className="font-semibold"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{getTeamName(player.team_id)}</Badge>
                  <span>•</span>
                  <Badge variant="outline">{getLeagueName(player.league_id)}</Badge>
                  {player.bio.position && (
                    <>
                      <span>•</span>
                      <Badge>{player.bio.position}</Badge>
                    </>
                  )}
                  {player.bio.number && (
                    <>
                      <span>•</span>
                      <span>#{player.bio.number}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsActive(!isActive)}>
                  {isActive ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {isActive ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowNewsDialog(true)}>
                  <Newspaper className="w-4 h-4 mr-2" />
                  News
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAIDialog(true)}>
                  <Brain className="w-4 h-4 mr-2" />
                  AI Insights
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Physical</div>
              <div className="space-y-1 text-sm">
                {player.bio.height_cm && (
                  <div className="flex justify-between">
                    <span>Height:</span>
                    <SimpleInlineNumberEdit
                      value={player.bio.height_cm}
                      onSave={(value) => handleNestedFieldUpdate(['bio', 'height_cm'], value, player.bio.height_cm)}
                      suffix="cm"
                    />
                  </div>
                )}
                {player.bio.weight_kg && (
                  <div className="flex justify-between">
                    <span>Weight:</span>
                    <SimpleInlineNumberEdit
                      value={player.bio.weight_kg}
                      onSave={(value) => handleNestedFieldUpdate(['bio', 'weight_kg'], value, player.bio.weight_kg)}
                      suffix="kg"
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge className={getStatusColor(player.injury_status?.status || 'active')}>
                {player.injury_status?.status || 'Active'}
              </Badge>
            </div>
          </div>

          {player.stats && Object.keys(player.stats).length > 0 && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              {Object.entries(player.stats).slice(0, 4).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="text-sm text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}
                  </div>
                  <SimpleInlineNumberEdit
                    value={value as number}
                    onSave={(newValue) => handleNestedFieldUpdate(['stats', key], newValue, value)}
                    decimals={key.includes('pct') ? 3 : 1}
                    className="font-semibold"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderGameCard = () => {
    const game = entity.entity as Game;
    return (
      <Card className={`transition-all duration-200 ${!isActive ? 'opacity-50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {game.media?.photos && game.media.photos[0] && (
                <ImageWithFallback
                  src={game.media.photos[0].url}
                  alt={`Game action`}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(game.status)}>
                    {game.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                  <Badge variant="outline">{getLeagueName(game.league_id)}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(game.scheduled)}
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsActive(!isActive)}>
                  {isActive ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {isActive ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowNewsDialog(true)}>
                  <Newspaper className="w-4 h-4 mr-2" />
                  News
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAIDialog(true)}>
                  <Brain className="w-4 h-4 mr-2" />
                  AI Insights
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="flex flex-col h-full">
          <div className="text-center">
            <div className="grid grid-cols-3 items-center gap-4">
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 mb-1">
                  <div className="font-semibold">{getTeamAbbrev(game.teams.away.team_id).replace(/^team_/, '').toUpperCase()}</div>
                  {getTeamLogo(game.teams.away.team_id) && (
                    <ImageWithFallback
                      src={getTeamLogo(game.teams.away.team_id)!}
                      alt={`${getTeamAbbrev(game.teams.away.team_id)} logo`}
                      className="w-6 h-6 rounded object-cover"
                    />
                  )}
                </div>
                <div className="text-sm text-muted-foreground">Away</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <SimpleInlineNumberEdit
                    value={game.teams.away.score}
                    onSave={(value) => handleNestedFieldUpdate(['teams', 'away', 'score'], value, game.teams.away.score)}
                    className="text-xl font-bold"
                  />
                  <span className="text-xl">-</span>
                  <SimpleInlineNumberEdit
                    value={game.teams.home.score}
                    onSave={(value) => handleNestedFieldUpdate(['teams', 'home', 'score'], value, game.teams.home.score)}
                    className="text-xl font-bold"
                  />
                </div>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-semibold">{getTeamAbbrev(game.teams.home.team_id).replace(/^team_/, '').toUpperCase()}</div>
                  {getTeamLogo(game.teams.home.team_id) && (
                    <ImageWithFallback
                      src={getTeamLogo(game.teams.home.team_id)!}
                      alt={`${getTeamAbbrev(game.teams.home.team_id)} logo`}
                      className="w-6 h-6 rounded object-cover"
                    />
                  )}
                </div>
                <div className="text-sm text-muted-foreground">Home</div>
              </div>
            </div>
          </div>

          {game.periods && game.periods.length > 0 && (
            <div className="pt-4 border-t mt-4">
              <div className="text-sm text-muted-foreground mb-2">Period Scores</div>
              <div className="grid grid-cols-4 gap-2 text-sm">
                {game.periods.map((period, index) => (
                  <div key={index} className="text-center">
                    <div className="text-xs text-muted-foreground">{period.label}</div>
                    <div className="flex justify-center gap-1">
                      <span>{period.away}</span>
                      <span>-</span>
                      <span>{period.home}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {game.media?.broadcasters && game.media.broadcasters.length > 0 && (
            <div className="flex items-center gap-2 text-sm mt-auto pt-4">
              <Activity className="w-4 h-4" />
              <span>Broadcast: {game.media.broadcasters.join(', ')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderVenueCard = () => {
    const venue = entity.entity as Venue;
    return (
      <Card className={`transition-all duration-200 ${!isActive ? 'opacity-50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {venue.media?.photos && venue.media.photos[0] && (
                <ImageWithFallback
                  src={venue.media.photos[0].url}
                  alt={`${venue.name} photo`}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="space-y-1">
                <SimpleInlineEditField
                  value={venue.name}
                  onSave={(value) => handleFieldUpdate('name', value, venue.name)}
                  className="font-semibold"
                />
                <div className="text-sm text-muted-foreground">
                  {venue.address.city}, {venue.address.state} {venue.address.country}
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsActive(!isActive)}>
                  {isActive ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {isActive ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowNewsDialog(true)}>
                  <Newspaper className="w-4 h-4 mr-2" />
                  News
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAIDialog(true)}>
                  <Brain className="w-4 h-4 mr-2" />
                  AI Insights
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Capacity</div>
              <SimpleInlineNumberEdit
                value={venue.capacity || 0}
                onSave={(value) => handleFieldUpdate('capacity', value, venue.capacity)}
                className="font-semibold"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Surface</div>
              <SimpleInlineEditField
                value={venue.surface || 'Unknown'}
                onSave={(value) => handleFieldUpdate('surface', value, venue.surface)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Type</div>
              <Badge>{venue.indoor ? 'Indoor' : 'Outdoor'}</Badge>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Timezone</div>
              <div className="text-sm">{venue.timezone}</div>
            </div>
          </div>

          {venue.geo && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{venue.geo.lat.toFixed(3)}, {venue.geo.lng.toFixed(3)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderTournamentCard = () => {
    const tournament = entity.entity as Tournament;
    return (
      <Card className={`transition-all duration-200 ${!isActive ? 'opacity-50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {tournament.brand.logo && (
                <ImageWithFallback
                  src={tournament.brand.logo.url}
                  alt={`${tournament.name} logo`}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: tournament.brand.primary_color }}
                  />
                  <SimpleInlineEditField
                    value={tournament.name}
                    onSave={(value) => handleFieldUpdate('name', value, tournament.name)}
                    className="font-semibold"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{tournament.abbrev}</Badge>
                  <span>•</span>
                  <Badge className={getStatusColor(tournament.status)}>
                    {tournament.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                  <span>•</span>
                  <span>{tournament.season}</span>
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsActive(!isActive)}>
                  {isActive ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {isActive ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowNewsDialog(true)}>
                  <Newspaper className="w-4 h-4 mr-2" />
                  News
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAIDialog(true)}>
                  <Brain className="w-4 h-4 mr-2" />
                  AI Insights
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Format</div>
              <Badge variant="outline" className="text-xs">
                {tournament.format.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Stage</div>
              <Badge variant="outline" className="text-xs">
                {tournament.stage.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            </div>
          </div>

          {tournament.stats && (
            <div className="grid grid-cols-3 gap-4 pt-2 border-t">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Teams</div>
                <SimpleInlineNumberEdit
                  value={tournament.stats.participating_teams_count}
                  onSave={(value) => handleNestedFieldUpdate(['stats', 'participating_teams_count'], value, tournament.stats.participating_teams_count)}
                  className="font-semibold"
                />
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Games</div>
                <div className="font-semibold">
                  {tournament.stats.completed_games} / {tournament.stats.total_games}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Progress</div>
                <div className="font-semibold">
                  {tournament.stats.total_games > 0 
                    ? Math.round((tournament.stats.completed_games / tournament.stats.total_games) * 100)
                    : 0}%
                </div>
              </div>
            </div>
          )}

          {tournament.prizes?.total_prize_pool && (
            <div className="flex items-center gap-2 text-sm pt-2 border-t">
              <Trophy className="w-4 h-4" />
              <span>Prize Pool: ${tournament.prizes.total_prize_pool.toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const getEntityName = () => {
    switch (view) {
      case 'teams': return (entity.entity as Team).name;
      case 'players': return (entity.entity as Player).name;
      case 'games': {
        const game = entity.entity as Game;
        return `${getTeamAbbrev(game.teams.home)} vs ${getTeamAbbrev(game.teams.away)}`;
      }
      case 'venues': return (entity.entity as Venue).name;
      case 'tournaments': return (entity.entity as Tournament).name;
      default: return 'Unknown';
    }
  };

  const getEntityType = (): 'team' | 'player' | 'game' | 'venue' | 'tournament' => {
    return view.slice(0, -1) as 'team' | 'player' | 'game' | 'venue' | 'tournament';
  };

  const renderCard = () => {
    switch (view) {
      case 'teams': return renderTeamCard();
      case 'players': return renderPlayerCard();
      case 'games': return renderGameCard();
      case 'venues': return renderVenueCard();
      case 'tournaments': return renderTournamentCard();
      default: return null;
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20
        }}
        whileHover={{ 
          y: -4,
          transition: { type: "spring", stiffness: 400, damping: 17 }
        }}
        className="h-full"
      >
        {renderCard()}
      </motion.div>

      {/* Sports News Component */}
      <SportsNews
        entityName={getEntityName()}
        entityType={getEntityType()}
        isOpen={showNewsDialog}
        onClose={() => setShowNewsDialog(false)}
      />

      {/* AI Insights Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Insights</DialogTitle>
            <DialogDescription>
              AI-powered insights and analysis for this sports entity
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-muted-foreground text-center py-8">
              AI insights are not currently available.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
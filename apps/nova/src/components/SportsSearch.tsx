import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { Plus, Users, ChevronDown, Trophy } from "lucide-react";
import { SportsView, League, Team, SportsEntityWithOverrides, Provider } from "../types/sports";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";

interface SportsSearchProps {
  view: SportsView;
  leagues: League[];
  onAdd: (entity: SportsEntityWithOverrides) => void;
}

export function SportsSearch({ view, leagues, onAdd }: SportsSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Available leagues and teams from backend
  const [availableLeagues, setAvailableLeagues] = useState<any[]>([]);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  
  // Selected items
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  
  // UI state
  const [leaguesExpanded, setLeaguesExpanded] = useState(true);
  const [teamsExpanded, setTeamsExpanded] = useState(true);

  // Fetch leagues and teams when dialog opens
  useEffect(() => {
    if (isOpen && view === 'teams') {
      fetchLeaguesAndTeams();
    }
  }, [isOpen, view]);

  const fetchLeaguesAndTeams = async () => {
    setIsLoading(true);
    try {
      console.log('[Sports Add] Fetching leagues and teams from backend...');
      
      // Fetch tournaments (leagues)
      const tournamentsResponse = await fetch(
        getEdgeFunctionUrl('sports_dashboard/sports-data/tournaments'),
        {
          headers: { Authorization: `Bearer ${getSupabaseAnonKey()}` }
        }
      );
      
      if (tournamentsResponse.ok) {
        const tournamentsData = await tournamentsResponse.json();
        setAvailableLeagues(tournamentsData.tournaments || []);
        console.log(`[Sports Add] Loaded ${tournamentsData.tournaments?.length || 0} leagues`);
      }
      
      // Fetch all teams
      const teamsResponse = await fetch(
        getEdgeFunctionUrl('sports_dashboard/sports-data/teams'),
        {
          headers: { Authorization: `Bearer ${getSupabaseAnonKey()}` }
        }
      );
      
      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json();
        setAvailableTeams(teamsData.teams || []);
        console.log(`[Sports Add] Loaded ${teamsData.teams?.length || 0} teams`);
      }
    } catch (error) {
      console.error('[Sports Add] Error fetching data:', error);
      toast.error('Failed to load leagues and teams');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeagueToggle = (leagueId: string) => {
    setSelectedLeagues(prev => 
      prev.includes(leagueId) 
        ? prev.filter(id => id !== leagueId)
        : [...prev, leagueId]
    );
  };

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleSelectAllLeagues = () => {
    if (selectedLeagues.length === availableLeagues.length) {
      setSelectedLeagues([]);
    } else {
      setSelectedLeagues(availableLeagues.map(l => l.id));
    }
  };

  const handleSelectAllTeams = () => {
    const filteredTeams = getFilteredTeams();
    if (selectedTeams.length === filteredTeams.length) {
      setSelectedTeams([]);
    } else {
      setSelectedTeams(filteredTeams.map(t => t.id));
    }
  };

  const getFilteredTeams = () => {
    if (selectedLeagues.length === 0) {
      return availableTeams;
    }
    return availableTeams.filter(team => 
      selectedLeagues.includes(team.league_id)
    );
  };

  const handleAddSelectedTeams = () => {
    const teamsToAdd = availableTeams.filter(team => 
      selectedTeams.includes(team.id)
    );
    
    console.log(`[Sports Add] Adding ${teamsToAdd.length} teams to dashboard`);
    
    teamsToAdd.forEach(team => {
      const entityWithOverrides: SportsEntityWithOverrides = {
        entity: team,
        overrides: [],
        lastUpdated: new Date().toISOString(),
        primaryProvider: 'sportradar' as Provider
      };
      onAdd(entityWithOverrides);
    });
    
    toast.success(`Added ${teamsToAdd.length} team${teamsToAdd.length !== 1 ? 's' : ''} to dashboard`);
    
    // Reset and close
    setSelectedLeagues([]);
    setSelectedTeams([]);
    setIsOpen(false);
  };

  const filteredTeams = getFilteredTeams();

  if (view !== 'teams') {
    // For other views, show a placeholder
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add {view.charAt(0).toUpperCase() + view.slice(1, -1)}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {view.charAt(0).toUpperCase() + view.slice(1, -1)}</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            Adding {view} coming soon
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Team
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Add Teams to Dashboard
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select leagues on the left, then select teams on the right to add to your dashboard
          </p>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-muted-foreground">Loading leagues and teams...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Left: Leagues */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setLeaguesExpanded(!leaguesExpanded)}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${leaguesExpanded ? '' : '-rotate-90'}`} />
                  <Trophy className="w-4 h-4" />
                  <span className="font-medium">Leagues</span>
                  <Badge variant="secondary">{selectedLeagues.length}/{availableLeagues.length}</Badge>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllLeagues}
                  className="text-xs"
                >
                  {selectedLeagues.length === availableLeagues.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              
              {leaguesExpanded && (
                <Card>
                  <ScrollArea className="h-[400px]">
                    <CardContent className="p-4 space-y-2">
                      {availableLeagues.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No leagues available. Run "Initialize & Sync" first.
                        </div>
                      ) : (
                        availableLeagues.map((league) => (
                          <div
                            key={league.id}
                            className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => handleLeagueToggle(league.id)}
                          >
                            <Checkbox
                              checked={selectedLeagues.includes(league.id)}
                              onCheckedChange={() => handleLeagueToggle(league.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{league.name}</div>
                              {league.abbrev && (
                                <div className="text-xs text-muted-foreground">{league.abbrev}</div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </ScrollArea>
                </Card>
              )}
            </div>

            {/* Right: Teams */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setTeamsExpanded(!teamsExpanded)}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${teamsExpanded ? '' : '-rotate-90'}`} />
                  <Users className="w-4 h-4" />
                  <span className="font-medium">Teams</span>
                  <Badge variant="secondary">{selectedTeams.length}/{filteredTeams.length}</Badge>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllTeams}
                  className="text-xs"
                  disabled={filteredTeams.length === 0}
                >
                  {selectedTeams.length === filteredTeams.length && filteredTeams.length > 0 ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              
              {teamsExpanded && (
                <Card>
                  <ScrollArea className="h-[400px]">
                    <CardContent className="p-4 space-y-2">
                      {filteredTeams.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {selectedLeagues.length === 0 
                            ? 'Select one or more leagues to see teams'
                            : 'No teams found for selected leagues'}
                        </div>
                      ) : (
                        filteredTeams.map((team) => (
                          <div
                            key={team.id}
                            className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => handleTeamToggle(team.id)}
                          >
                            <Checkbox
                              checked={selectedTeams.includes(team.id)}
                              onCheckedChange={() => handleTeamToggle(team.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {team.brand?.primary_color && (
                                  <div 
                                    className="w-3 h-3 rounded-sm flex-shrink-0"
                                    style={{ backgroundColor: team.brand.primary_color }}
                                  />
                                )}
                                <span className="font-medium truncate">{team.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {team.abbrev && <span>{team.abbrev}</span>}
                                {team.city && (
                                  <>
                                    <span>•</span>
                                    <span>{team.city}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </ScrollArea>
                </Card>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {selectedTeams.length > 0 && (
                <span>{selectedTeams.length} team{selectedTeams.length !== 1 ? 's' : ''} selected</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSelectedTeams}
                disabled={selectedTeams.length === 0}
              >
                Add {selectedTeams.length > 0 ? `${selectedTeams.length} ` : ''}Team{selectedTeams.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
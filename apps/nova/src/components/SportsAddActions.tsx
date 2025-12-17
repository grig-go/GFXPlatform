import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Users, Trophy, Plus, Loader2, CheckCircle2, Trash2, Download } from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";

interface SportsAddActionsProps {
  onAddMultipleEntities: (entities: any[]) => void;
  onRefresh?: () => Promise<void>;
}

export function SportsAddActions({ onAddMultipleEntities, onRefresh }: SportsAddActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingLeague, setIsAddingLeague] = useState<string | null>(null);
  const [isRemovingLeague, setIsRemovingLeague] = useState<string | null>(null);
  
  // Available leagues from database
  const [availableLeagues, setAvailableLeagues] = useState<any[]>([]);
  const [addedLeagues, setAddedLeagues] = useState<Set<string>>(new Set());

  // Fetch leagues when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      fetchAvailableLeagues();
    }
  }, [isDialogOpen]);

  const fetchAvailableLeagues = async () => {
    setIsLoading(true);
    try {
      console.log('[Sports Add] Fetching leagues from sports_leagues table...');
      
      // Fetch leagues directly from sports_leagues database table
      const response = await fetch(
        getRestUrl('sports_leagues?select=id,name,country_name'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            apikey: getSupabaseAnonKey(),
          },
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Sports Add] Failed to load leagues:', response.status, errorText);
        toast.error('Failed to load leagues from database');
        setAvailableLeagues([]);
        return;
      }
      
      const leagues = await response.json();
      console.log('[Sports Add] Loaded leagues from database:', leagues);
      
      // Transform database leagues to internal format
      const formattedLeagues = leagues.map((league: any) => ({
        id: league.id,
        name: league.name,
        sport: 'Football',
        abbrev: league.name.substring(0, 3).toUpperCase(),
        country: league.country_name || 'Unknown',
      }));
      
      setAvailableLeagues(formattedLeagues);
      console.log(`[Sports Add] Loaded ${formattedLeagues.length} leagues`);
      
      if (formattedLeagues.length > 0) {
        toast.success(`Loaded ${formattedLeagues.length} available leagues`);
      }
    } catch (error) {
      console.error('[Sports Add] Error fetching leagues:', error);
      toast.error(
        'Failed to load leagues',
        { 
          description: error instanceof Error ? error.message : 'Unknown error',
          duration: 5000 
        }
      );
      setAvailableLeagues([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLeague = async (league: any) => {
    setIsAddingLeague(league.id);
    try {
      console.log(`[Sports Add] Adding all teams from league: ${league.name} (ID: ${league.id})`);
      
      // Call backend to fetch and add all teams from this league
      const response = await fetch(
        getEdgeFunctionUrl('sports_dashboard/sports/add-league'),
        {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            leagueId: league.id,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Sports Add] Server error response:`, errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const errorMessage = errorData.error || errorData.message || 'Failed to add league';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log(`[Sports Add] Successfully added ${data.teamsAdded || 0} teams from ${league.name}`);
      
      // Mark league as added
      setAddedLeagues(prev => new Set(prev).add(league.id));
      
      // Notify user
      toast.success(`Added ${data.teamsAdded || 0} teams from ${league.name}`);
      
      // Refresh data without closing dialog
      if (onRefresh) {
        await onRefresh();
      }
      
      // Close dialog after successful refresh
      setTimeout(() => {
        setIsDialogOpen(false);
      }, 500);
      
    } catch (error) {
      console.error(`[Sports Add] Error adding league:`, error);
      toast.error(error instanceof Error ? error.message : 'Failed to add league');
    } finally {
      setIsAddingLeague(null);
    }
  };

  const handleRemoveLeague = async (league: any) => {
    setIsRemovingLeague(league.id);
    try {
      console.log(`[Sports Remove] Removing all teams from league: ${league.name} (ID: ${league.id})`);
      
      // Call backend to remove all teams from this league
      const response = await fetch(
        getEdgeFunctionUrl('sports_dashboard/sports/remove-league'),
        {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            leagueId: league.id,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Sports Remove] Server error response:`, errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const errorMessage = errorData.error || errorData.message || 'Failed to remove league teams';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log(`[Sports Remove] Successfully removed ${data.teamsRemoved || 0} teams from ${league.name}`);
      
      // Remove from added leagues set
      setAddedLeagues(prev => {
        const newSet = new Set(prev);
        newSet.delete(league.id);
        return newSet;
      });
      
      // Notify user
      toast.success(`Removed ${data.teamsRemoved || 0} teams from ${league.name}`);
      
      // Refresh data without reloading page
      if (onRefresh) {
        await onRefresh();
      }
      
      // Small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error(`[Sports Remove] Error removing league:`, error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove league teams');
    } finally {
      setIsRemovingLeague(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="gap-2" disabled>
              <Plus className="w-4 h-4" />
              Add League
            </Button>
          </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Add Sports League
          </DialogTitle>
          <DialogDescription>
            Select a league to add all its teams to your dashboard. Team data includes names, stats, and standings.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Loading available leagues...</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {availableLeagues.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No leagues available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Add leagues to the sports_leagues table to see them here
                  </p>
                </div>
              ) : (
                availableLeagues.map((league) => {
                  const isAdded = addedLeagues.has(league.id);
                  const isAdding = isAddingLeague === league.id;
                  const isRemoving = isRemovingLeague === league.id;
                  
                  return (
                    <Card 
                      key={league.id}
                      className={isAdded ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10' : ''}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              {league.name}
                              {isAdded && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                            </CardTitle>
                            {(league.active_season || league.seasonName || league.active_season_name) && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {league.active_season || league.seasonName || league.active_season_name}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">{league.sport}</Badge>
                              <Badge variant="secondary">{league.abbrev}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleAddLeague(league)}
                              disabled={isAdding || isAdded || isRemoving}
                              variant={isAdded ? "outline" : "default"}
                              size="sm"
                              className="gap-2"
                            >
                              {isAdding ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Adding...
                                </>
                              ) : isAdded ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  Added
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4" />
                                  Add All Teams
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => handleRemoveLeague(league)}
                              disabled={isAdding || isRemoving}
                              variant="destructive"
                              size="sm"
                              className="gap-2"
                            >
                              {isRemoving ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Removing...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4" />
                                  Remove
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3" />
                            <span>Adds all teams with current standings and stats</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Competition ID: <code className="bg-muted px-1 rounded">{league.id}</code>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  </div>
  </>
  );
}

import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Card, CardContent } from "./ui/card";
import { Search, Filter } from "lucide-react";
import { SportsFilters, SportsView, League } from "../types/sports";

interface Provider {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  selectedLeagues?: string[];
}

interface SportsFiltersProps {
  filters: SportsFilters;
  onFiltersChange: (filters: SportsFilters) => void;
  currentView: SportsView;
  onViewChange: (view: SportsView) => void;
  leagues: League[];
  totalCount: number;
  filteredCount: number;
  providers?: Provider[];
}

export function SportsFilters({
  filters,
  onFiltersChange,
  currentView,
  onViewChange,
  leagues,
  totalCount,
  filteredCount,
  providers = []
}: SportsFiltersProps) {
  const handleFilterChange = (key: keyof SportsFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const viewLabels: Record<SportsView, string> = {
    teams: 'Teams',
    standings: 'Standings',
    players: 'Players', 
    games: 'Games',
    venues: 'Venues',
    tournaments: 'Tournaments',
    betting: 'Betting & Probabilities'
  };

  const allPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'PG', 'SG', 'SF', 'PF', 'C', 'P', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP', 'LW', 'RW', 'D', 'G', 'GK', 'MID', 'FWD'];
  const positions = [...new Set(allPositions)]; // Remove duplicates

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* View Selector */}
          <div className="space-y-2">
            <Label className="text-sm">View</Label>
            <div className="flex gap-2">
              {(Object.keys(viewLabels) as SportsView[]).map((view) => {
                return (
                  <button
                    key={view}
                    onClick={() => {
                      console.log('[SportsFilters] Button clicked, changing view to:', view);
                      onViewChange(view);
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      currentView === view
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {viewLabels[view]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search and Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search names, teams..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* League Filter */}
            <div className="space-y-2">
              <Label className="text-sm">League</Label>
              <Select value={filters.league || 'all'} onValueChange={(value) => handleFilterChange('league', value === 'all' ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Leagues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leagues</SelectItem>
                  {leagues.map((league) => (
                    <SelectItem key={league.id} value={league.id}>
                      {league.abbrev} - {league.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter (for games) */}
            {currentView === 'games' && (
              <div className="space-y-2">
                <Label className="text-sm">Status</Label>
                <Select 
                  value={filters.status || 'all'} 
                  onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="postponed">Postponed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Position Filter (for players) */}
            {currentView === 'players' && (
              <div className="space-y-2">
                <Label className="text-sm">Position</Label>
                <Select 
                  value={filters.position || 'all'} 
                  onValueChange={(value) => handleFilterChange('position', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Positions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    {positions.map((position) => (
                      <SelectItem key={position} value={position}>
                        {position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Provider Filter */}
            <div className="space-y-2">
              <Label className="text-sm">Provider</Label>
              <Select 
                value={filters.provider} 
                onValueChange={(value) => handleFilterChange('provider', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.type.toLowerCase()}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6">

          </div>

          {/* Results Summary */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-4">
            <Filter className="w-4 h-4" />
            <span>
              Showing {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} {viewLabels[currentView].toLowerCase()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
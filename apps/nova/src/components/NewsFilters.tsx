import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { NewsFilters as NewsFiltersType } from "../types/news";
import { Search, Filter, X, AlertTriangle, Clock, Globe, Database } from "lucide-react";

interface NewsFiltersProps {
  filters: NewsFiltersType;
  onFiltersChange: (filters: NewsFiltersType) => void;
  totalArticles: number;
  filteredCount: number;
}

export function NewsFilters({ 
  filters, 
  onFiltersChange, 
  totalArticles,
  filteredCount
}: NewsFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof NewsFiltersType, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      provider: 'all',
      severity: 'all',
      timeRange: 'all',
      showBreaking: false,
      showOverrides: false
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.provider !== 'all') count++;
    if (filters.severity !== 'all') count++;
    if (filters.timeRange !== 'all') count++;
    if (filters.showBreaking) count++;
    if (filters.showOverrides) count++;
    return count;
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-3 h-3 text-red-600" />;
      case 'high': return <AlertTriangle className="w-3 h-3 text-orange-600" />;
      case 'medium': return <AlertTriangle className="w-3 h-3 text-yellow-600" />;
      case 'low': return <AlertTriangle className="w-3 h-3 text-blue-600" />;
      default: return null;
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'ap_enps': return <Globe className="w-3 h-3 text-blue-600" />;
      case 'newsapi': return <Database className="w-3 h-3 text-green-600" />;
      case 'newsdata': return <Database className="w-3 h-3 text-purple-600" />;
      default: return <Database className="w-3 h-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-5 h-5" />
                News Filters
              </CardTitle>
              {getActiveFilterCount() > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {getActiveFilterCount()} active
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {filteredCount.toLocaleString()} of {totalArticles.toLocaleString()} articles
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Collapse' : 'Expand'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Always visible filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Articles</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search titles, content..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={filters.provider} onValueChange={(value) => updateFilter('provider', value)}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    {getProviderIcon(filters.provider)}
                    <SelectValue placeholder="All providers" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  <SelectItem value="ap_enps">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3 h-3 text-blue-600" />
                      AP ENPS
                    </div>
                  </SelectItem>
                  <SelectItem value="newsapi">
                    <div className="flex items-center gap-2">
                      <Database className="w-3 h-3 text-green-600" />
                      NewsAPI
                    </div>
                  </SelectItem>
                  <SelectItem value="newsdata">
                    <div className="flex items-center gap-2">
                      <Database className="w-3 h-3 text-purple-600" />
                      NewsData
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={filters.severity} onValueChange={(value) => updateFilter('severity', value)}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(filters.severity)}
                    <SelectValue placeholder="All severities" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3 text-red-600" />
                      Critical
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3 text-orange-600" />
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3 text-yellow-600" />
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3 text-blue-600" />
                      Low
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time Range</Label>
              <Select value={filters.timeRange} onValueChange={(value) => updateFilter('timeRange', value)}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="last_hour">Last Hour</SelectItem>
                  <SelectItem value="last_6_hours">Last 6 Hours</SelectItem>
                  <SelectItem value="last_24_hours">Last 24 Hours</SelectItem>
                  <SelectItem value="last_week">Last Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Expandable filters */}
          {isExpanded && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="breaking"
                    checked={filters.showBreaking}
                    onCheckedChange={(checked) => updateFilter('showBreaking', checked)}
                  />
                  <Label htmlFor="breaking" className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Breaking News Only
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="overrides"
                    checked={filters.showOverrides}
                    onCheckedChange={(checked) => updateFilter('showOverrides', checked)}
                  />
                  <Label htmlFor="overrides" className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-600" />
                    Show Overrides Only
                  </Label>
                </div>
              </div>

              {getActiveFilterCount() > 0 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Active filters:</span>
                    <div className="flex flex-wrap gap-1">
                      {filters.search && (
                        <Badge variant="secondary" className="gap-1">
                          Search: {filters.search}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('search', '')} />
                        </Badge>
                      )}
                      {filters.provider !== 'all' && (
                        <Badge variant="secondary" className="gap-1">
                          Provider: {filters.provider}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('provider', 'all')} />
                        </Badge>
                      )}
                      {filters.severity !== 'all' && (
                        <Badge variant="secondary" className="gap-1">
                          Severity: {filters.severity}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('severity', 'all')} />
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
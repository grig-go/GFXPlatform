import { useState } from "react";
import { FinanceSecurityWithSnapshot, SecurityType } from "../types/finance";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Search, Filter, X, BarChart3, Coins, Building2, TrendingUp, TrendingDown, Briefcase, ArrowUpAZ, ArrowDownAZ } from "lucide-react";

interface FinanceFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  securities: FinanceSecurityWithSnapshot[];
  sortOrder: "asc" | "desc";
  onSortChange: (order: "asc" | "desc") => void;
  changeFilter: "all" | "up" | "down";
  onChangeFilterChange: (filter: "all" | "up" | "down") => void;
}

const SECURITY_TYPES: { value: SecurityType | 'STOCKS_INDICES'; label: string; icon: React.ReactNode; color: string; types?: SecurityType[] }[] = [
  { value: 'STOCKS_INDICES', label: 'Stocks & Indices', icon: <Building2 className="w-4 h-4" />, color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', types: ['INDEX', 'EQUITY'] },
  { value: 'CRYPTO', label: 'Crypto', icon: <Coins className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  { value: 'ETF', label: 'ETFs', icon: <TrendingUp className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
];

export function FinanceFilters({
  searchTerm,
  onSearchChange,
  selectedTypes,
  onTypesChange,
  securities,
  sortOrder,
  onSortChange,
  changeFilter,
  onChangeFilterChange
}: FinanceFiltersProps) {
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const toggleType = (type: string) => {
    if (type === 'STOCKS_INDICES') {
      // Handle merged stocks & indices
      const hasStocksOrIndices = selectedTypes.includes('INDEX') || selectedTypes.includes('EQUITY');
      if (hasStocksOrIndices) {
        // Remove both if either is selected
        onTypesChange(selectedTypes.filter(t => t !== 'INDEX' && t !== 'EQUITY'));
      } else {
        // Add both
        onTypesChange([...selectedTypes.filter(t => t !== 'INDEX' && t !== 'EQUITY'), 'INDEX', 'EQUITY']);
      }
    } else if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const clearAllFilters = () => {
    onSearchChange("");
    onTypesChange([]);
    onChangeFilterChange("all");
  };

  const hasActiveFilters = searchTerm !== "" || selectedTypes.length > 0 || changeFilter !== "all";

  // Get counts for each type (with safety checks for malformed data)
  const typeCounts = SECURITY_TYPES.map(type => ({
    ...type,
    count: type.types 
      ? securities.filter(s => s?.security && type.types!.includes(s.security.type)).length
      : securities.filter(s => s?.security && s.security.type === type.value).length
  })).filter(type => type.count > 0);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search and Filter Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by symbol, name, or crypto ID..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSortChange(sortOrder === "asc" ? "desc" : "asc")}
              className="gap-2"
            >
              {sortOrder === "asc" ? (
                <>
                  <ArrowUpAZ className="w-4 h-4" />
                  A-Z
                </>
              ) : (
                <>
                  <ArrowDownAZ className="w-4 h-4" />
                  Z-A
                </>
              )}
            </Button>
            <Button
              variant={changeFilter === "up" ? "default" : "outline"}
              size="sm"
              onClick={() => onChangeFilterChange(changeFilter === "up" ? "all" : "up")}
              className="gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Up
            </Button>
            <Button
              variant={changeFilter === "down" ? "default" : "outline"}
              size="sm"
              onClick={() => onChangeFilterChange(changeFilter === "down" ? "all" : "down")}
              className="gap-2"
            >
              <TrendingDown className="w-4 h-4" />
              Down
            </Button>
            <Button
              variant={isFilterExpanded ? "default" : "outline"}
              size="sm"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {selectedTypes.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {selectedTypes.length}
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Expanded Filters */}
          {isFilterExpanded && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <h4 className="text-sm font-medium mb-3">Security Types</h4>
                <div className="flex flex-wrap gap-2">
                  {typeCounts.map((type) => {
                    const isSelected = type.types
                      ? type.types.some(t => selectedTypes.includes(t))
                      : selectedTypes.includes(type.value);
                    
                    return (
                      <Button
                        key={type.value}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleType(type.value)}
                        className="gap-2"
                      >
                        {type.icon}
                        {type.label}
                        <Badge variant="secondary" className="ml-1">
                          {type.count}
                        </Badge>
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-3">Change Filter</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={changeFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => onChangeFilterChange("all")}
                    className="gap-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    All
                  </Button>
                  <Button
                    variant={changeFilter === "up" ? "default" : "outline"}
                    size="sm"
                    onClick={() => onChangeFilterChange("up")}
                    className="gap-2"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Up
                  </Button>
                  <Button
                    variant={changeFilter === "down" ? "default" : "outline"}
                    size="sm"
                    onClick={() => onChangeFilterChange("down")}
                    className="gap-2"
                  >
                    <TrendingDown className="w-4 h-4" />
                    Down
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Active Filter Tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => onSearchChange("")}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {/* Show Stocks & Indices badge if either is selected */}
              {(selectedTypes.includes('INDEX') || selectedTypes.includes('EQUITY')) && (
                <Badge variant="secondary" className="gap-1">
                  <Building2 className="w-4 h-4" />
                  Stocks & Indices
                  <button
                    onClick={() => toggleType('STOCKS_INDICES')}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {/* Show other filters */}
              {selectedTypes.filter(type => type !== 'INDEX' && type !== 'EQUITY').map((type) => {
                const typeInfo = SECURITY_TYPES.find(t => t.value === type);
                return typeInfo ? (
                  <Badge key={type} variant="secondary" className="gap-1">
                    {typeInfo.icon}
                    {typeInfo.label}
                    <button
                      onClick={() => toggleType(type)}
                      className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ) : null;
              })}
              {/* Show change filter */}
              {changeFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {changeFilter === "up" ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {changeFilter === "up" ? "Up" : "Down"}
                  <button
                    onClick={() => onChangeFilterChange("all")}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
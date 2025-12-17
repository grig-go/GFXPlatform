import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Search, Plus, RefreshCw } from "lucide-react";
import { FeedType, FeedCategory } from "../types/feeds";

interface FeedsFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedType: FeedType | "All";
  onTypeChange: (value: FeedType | "All") => void;
  selectedCategory: FeedCategory | "All";
  onCategoryChange: (value: FeedCategory | "All") => void;
  selectedStatus: "Active" | "Inactive" | "All";
  onStatusChange: (value: "Active" | "Inactive" | "All") => void;
  totalFeeds: number;
  filteredCount: number;
  onAddFeed: () => void;
  onRefresh: () => void;
}

export function FeedsFilters({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  totalFeeds,
  filteredCount,
  onAddFeed,
  onRefresh,
}: FeedsFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search feeds..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={selectedType} onValueChange={onTypeChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              <SelectItem value="REST API">REST API</SelectItem>
              <SelectItem value="Database">Database</SelectItem>
              <SelectItem value="File">File</SelectItem>
              <SelectItem value="Webhook">Webhook</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              <SelectItem value="Elections">Elections</SelectItem>
              <SelectItem value="Finance">Finance</SelectItem>
              <SelectItem value="Sports">Sports</SelectItem>
              <SelectItem value="Weather">Weather</SelectItem>
              <SelectItem value="News">News</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onRefresh} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button onClick={onAddFeed} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Feed
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary">
          {filteredCount} of {totalFeeds} feeds
        </Badge>
      </div>
    </div>
  );
}

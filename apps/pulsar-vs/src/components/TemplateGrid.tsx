import { useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Folder,
  FileText,
  MoreHorizontal,
  Play,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  Filter,
  Calendar,
} from 'lucide-react';
import { Badge } from './ui/badge';

// Types for our content
export interface ContentItem {
  id: string;
  name: string;
  type: 'folder' | 'item';
  createdAt: Date;
  status?: 'Draft' | 'Published' | 'Archived';
  children?: ContentItem[];
}

interface TemplateGridProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  openTabs: string[];
  onCloseTab: (tab: string) => void;
  onOpenTemplateBuilder?: () => void;
  onOpenVSControl?: () => void;
  onContentDataChange?: (data: any[]) => void;
}

// Mock Data Generation
const generateMockData = (): ContentItem[] => [
  {
    id: 'folder-news',
    name: 'News Segments',
    type: 'folder',
    createdAt: new Date('2024-10-15T09:00:00'),
    children: [
      {
        id: 'item-morning',
        name: 'Morning Brief',
        type: 'item',
        status: 'Published',
        createdAt: new Date('2024-10-16T08:30:00'),
      },
      {
        id: 'item-evening',
        name: 'Evening Update',
        type: 'item',
        status: 'Draft',
        createdAt: new Date('2024-10-16T17:00:00'),
      },
      {
        id: 'folder-weather',
        name: 'Weather Reports',
        type: 'folder',
        createdAt: new Date('2024-10-17T10:00:00'),
        children: [
          {
            id: 'item-weather-noon',
            name: 'Noon Forecast',
            type: 'item',
            status: 'Published',
            createdAt: new Date('2024-10-18T11:55:00'),
          }
        ]
      }
    ]
  },
  {
    id: 'folder-sports',
    name: 'Sports Highlights',
    type: 'folder',
    createdAt: new Date('2024-10-19T14:20:00'),
    children: [
      {
        id: 'item-game-recap',
        name: 'Game Recap',
        type: 'item',
        status: 'Published',
        createdAt: new Date('2024-10-20T09:15:00'),
      }
    ]
  },
  {
    id: 'item-breaking',
    name: 'Breaking News Template',
    type: 'item',
    status: 'Archived',
    createdAt: new Date('2024-10-14T15:45:00'),
  },
];

export function TemplateGrid({ 
  activeTab, 
  onTabChange, 
  onOpenVSControl 
}: TemplateGridProps) {
  const [data, setData] = useState<ContentItem[]>(generateMockData());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set(['folder-news']));
  const [searchQuery, setSearchQuery] = useState('');

  // Toggle row expansion
  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Flatten data for table rendering
  const getFlattenedData = (items: ContentItem[], depth = 0): Array<ContentItem & { depth: number }> => {
    let flattened: Array<ContentItem & { depth: number }> = [];
    
    for (const item of items) {
      // Filter based on search
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // If it matches or has children that might match (simplified logic: show if match or just render structure if no search)
      // For proper tree search, logic needs to be more complex (show parents if child matches). 
      // Here we stick to simple filtering: if search is active, we might break tree structure or just show flat list.
      // Let's keep tree structure but filter top level for now or show all if searching is complex to implement quickly in tree.
      // Simple approach: Show item if it matches. If it's a folder and expanded, show children.
      
      if (searchQuery && !matchesSearch && item.type === 'item') {
        continue; 
      }

      flattened.push({ ...item, depth });
      
      if (item.type === 'folder' && item.children && expandedRows.has(item.id)) {
        flattened = [...flattened, ...getFlattenedData(item.children, depth + 1)];
      }
    }
    
    return flattened;
  };

  const flatData = getFlattenedData(data);

  // Actions
  const handlePlay = (item: ContentItem) => {
    if (onOpenVSControl) onOpenVSControl();
    console.log('Playing', item.name);
  };

  const handleEdit = (item: ContentItem) => {
    console.log('Editing', item.name);
  };

  const handleDelete = (id: string) => {
    const deleteFromTree = (items: ContentItem[]): ContentItem[] => {
      return items.filter(item => {
        if (item.id === id) return false;
        if (item.children) {
          item.children = deleteFromTree(item.children);
        }
        return true;
      });
    };
    setData(deleteFromTree(data));
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-card/50">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">Content Library</h2>
          <Badge variant="secondary" className="ml-2">{flatData.length} Items</Badge>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search content..." 
              className="pl-8 h-9 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Item
          </Button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[400px]">Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Creation Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flatData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No content found.
                  </TableCell>
                </TableRow>
              ) : (
                flatData.map((item) => (
                  <TableRow key={item.id} className="group">
                    <TableCell className="py-2">
                      <div 
                        className="flex items-center gap-2" 
                        style={{ paddingLeft: `${item.depth * 24}px` }}
                      >
                        {item.type === 'folder' ? (
                          <button 
                            onClick={() => toggleRow(item.id)}
                            className="p-1 hover:bg-muted rounded-sm transition-colors"
                          >
                            {expandedRows.has(item.id) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        ) : (
                          <span className="w-6" /> // Spacer for alignment
                        )}
                        
                        {item.type === 'folder' ? (
                          <Folder className="h-4 w-4 text-blue-500 fill-blue-500/20" />
                        ) : (
                          <FileText className="h-4 w-4 text-slate-500" />
                        )}
                        
                        <span className={`font-medium ${item.type === 'folder' ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {item.name}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {item.type === 'item' && item.status && (
                        <Badge 
                          variant="outline" 
                          className={`
                            ${item.status === 'Published' ? 'border-green-200 bg-green-50 text-green-700' : ''}
                            ${item.status === 'Draft' ? 'border-amber-200 bg-amber-50 text-amber-700' : ''}
                            ${item.status === 'Archived' ? 'border-slate-200 bg-slate-50 text-slate-700' : ''}
                          `}
                        >
                          {item.status}
                        </Badge>
                      )}
                    </TableCell>
                    
                    <TableCell className="text-muted-foreground text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(item.createdAt, 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.type === 'item' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePlay(item)} title="Play">
                            <Play className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)} title="Edit">
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(item.id)} title="Delete">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                              Properties
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(item.id)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

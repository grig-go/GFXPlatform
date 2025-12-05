import { useState, useMemo } from 'react';
import {
  Input,
  ScrollArea,
  cn,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@emergent-platform/ui';
import {
  Search,
  LayoutTemplate,
  Monitor,
  Tv,
  Radio,
  Type,
  Grid3X3,
  Image,
  Filter,
  X,
} from 'lucide-react';
import { useProjectStore, type Template } from '@/stores/projectStore';
import { usePreviewStore } from '@/stores/previewStore';

const LAYER_TYPE_ICONS: Record<string, React.ElementType> = {
  fullscreen: Monitor,
  'lower-third': Tv,
  lower_third: Tv,
  bug: Radio,
  ticker: Type,
  background: Image,
  custom: Grid3X3,
};

function formatLayerType(type: string): string {
  const typeMap: Record<string, string> = {
    'lower-third': 'Lower Third',
    'lower_third': 'Lower Third',
    'fullscreen': 'Fullscreen',
    'bug': 'Bug',
    'ticker': 'Ticker',
    'background': 'Background',
    'custom': 'Custom',
  };
  return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1).replace(/[-_]/g, ' ');
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function TemplateBrowser() {
  const { templates, currentProject } = useProjectStore();
  const { selectTemplate } = usePreviewStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLayerType, setSelectedLayerType] = useState<string>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Get unique categories (layer names)
  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category));
    return ['all', ...Array.from(cats)];
  }, [templates]);

  // Get unique layer types from templates
  const layerTypes = useMemo(() => {
    const types = new Set(templates.map((t) => t.layerType));
    return ['all', ...Array.from(types)];
  }, [templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || template.category === selectedCategory;
      const matchesLayerType =
        selectedLayerType === 'all' || template.layerType === selectedLayerType;

      return matchesSearch && matchesCategory && matchesLayerType;
    });
  }, [templates, searchQuery, selectedCategory, selectedLayerType]);

  const { loadTemplateElements } = useProjectStore();

  const handleSelectTemplate = async (template: Template) => {
    setSelectedTemplateId(template.id);
    selectTemplate(template.id);
    // Load elements for the selected template
    await loadTemplateElements(template.id);
  };

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <LayoutTemplate className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
          <p className="text-sm">Select a project to browse templates</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with Filters */}
      <div className="p-4 border-b border-border bg-card shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5" />
            Templates
          </h2>
          <span className="text-sm text-muted-foreground">
            {filteredTemplates.length} templates
          </span>
        </div>

        {/* Search with Filter Button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-9"
            />
          </div>

          {/* Filter Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  'h-9 w-9 flex-shrink-0',
                  (selectedCategory !== 'all' || selectedLayerType !== 'all') &&
                    'border-cyan-500 text-cyan-500'
                )}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Category</DropdownMenuLabel>
              {categories.map((cat) => (
                <DropdownMenuCheckboxItem
                  key={cat}
                  checked={selectedCategory === cat}
                  onCheckedChange={() => setSelectedCategory(cat)}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Layer Type</DropdownMenuLabel>
              {layerTypes.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={selectedLayerType === type}
                  onCheckedChange={() => setSelectedLayerType(type)}
                >
                  {type === 'all' ? 'All Types' : formatLayerType(type)}
                </DropdownMenuCheckboxItem>
              ))}
              {(selectedCategory !== 'all' || selectedLayerType !== 'all') && (
                <>
                  <DropdownMenuSeparator />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSelectedLayerType('all');
                    }}
                  >
                    <X className="h-3 w-3 mr-2" />
                    Clear filters
                  </Button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Active Filters Badges */}
        {(selectedCategory !== 'all' || selectedLayerType !== 'all') && (
          <div className="flex flex-wrap gap-1">
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
                {selectedCategory}
                <button onClick={() => setSelectedCategory('all')}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedLayerType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
                {formatLayerType(selectedLayerType)}
                <button onClick={() => setSelectedLayerType('all')}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Template List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {/* Header Row */}
          <div className="grid grid-cols-[auto,1fr,120px,100px] gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30">
            <div className="w-8"></div>
            <div>Name</div>
            <div>Type</div>
            <div>Updated</div>
          </div>

          {filteredTemplates.map((template) => (
            <TemplateRow
              key={template.id}
              template={template}
              isSelected={selectedTemplateId === template.id}
              onSelect={() => handleSelectTemplate(template)}
            />
          ))}

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <LayoutTemplate className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No templates match your filters</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface TemplateRowProps {
  template: Template;
  isSelected: boolean;
  onSelect: () => void;
}

function TemplateRow({ template, isSelected, onSelect }: TemplateRowProps) {
  const LayerIcon = LAYER_TYPE_ICONS[template.layerType] || Grid3X3;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full grid grid-cols-[auto,1fr,120px,100px] gap-3 px-4 py-3 text-left transition-colors',
        isSelected
          ? 'bg-cyan-500/10 border-l-2 border-l-cyan-500'
          : 'hover:bg-muted/50 border-l-2 border-l-transparent'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'w-8 h-8 rounded flex items-center justify-center',
        isSelected ? 'bg-cyan-500/20 text-cyan-500' : 'bg-muted text-muted-foreground'
      )}>
        <LayerIcon className="w-4 h-4" />
      </div>

      {/* Name */}
      <div className="flex flex-col justify-center min-w-0">
        <span className={cn(
          'font-medium truncate text-sm',
          isSelected ? 'text-cyan-500' : 'text-foreground'
        )}>
          {template.name}
        </span>
        <span className="text-xs text-muted-foreground truncate">
          {template.layerName}
        </span>
      </div>

      {/* Type */}
      <div className="flex items-center">
        <span className={cn(
          'text-xs px-2 py-0.5 rounded',
          isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-muted text-muted-foreground'
        )}>
          {formatLayerType(template.layerType)}
        </span>
      </div>

      {/* Updated */}
      <div className="flex items-center text-xs text-muted-foreground">
        {formatRelativeTime(template.updatedAt)}
      </div>
    </button>
  );
}

import { useState, useEffect, useMemo } from 'react';
import {
  Input,
  ScrollArea,
  cn,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@emergent-platform/ui';
import {
  Search,
  FileText,
  Monitor,
  Tv,
  Radio,
  Type,
  Grid3X3,
  Image,
  AlertTriangle,
  GripVertical,
  MoreVertical,
  Trash2,
  Filter,
  X,
} from 'lucide-react';
import { usePageLibraryStore, type LibraryPage } from '@/stores/pageRepositoryStore';
import { useProjectStore, type Template } from '@/stores/projectStore';
import { useConfirm } from '@/hooks/useConfirm';

// Data transfer type for dragging pages to playlist
export const PAGE_DRAG_TYPE = 'application/x-pulsar-page';

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

export function PageList() {
  // Use library store for standalone pages at project level
  const { pages, loadPageLibrary, removeFromLibrary, isLoading } = usePageLibraryStore();
  const { currentProject, templates } = useProjectStore();
  const confirm = useConfirm();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLayerType, setSelectedLayerType] = useState<string>('all');

  // Load page library when project changes
  useEffect(() => {
    if (currentProject?.id) {
      loadPageLibrary(currentProject.id);
    }
  }, [currentProject?.id, loadPageLibrary]);

  // Get unique layer types from pages via templates
  const layerTypes = useMemo(() => {
    const types = new Set<string>();
    pages.forEach((page) => {
      const template = templates.find((t) => t.id === page.templateId);
      if (template) {
        types.add(template.layerType);
      }
    });
    return ['all', ...Array.from(types)];
  }, [pages, templates]);

  // Filter pages by search and layer type
  const filteredPages = pages.filter((page) => {
    const matchesSearch = page.name.toLowerCase().includes(searchQuery.toLowerCase());
    const template = templates.find((t) => t.id === page.templateId);
    const matchesLayerType = selectedLayerType === 'all' || template?.layerType === selectedLayerType;
    return matchesSearch && matchesLayerType;
  });

  // Handle delete page from library
  const handleDeletePage = async (pageId: string) => {
    const confirmed = await confirm({
      title: 'Remove Page',
      description: 'Remove this page from the library? This will also remove it from all playlists.',
      confirmText: 'Remove',
      variant: 'destructive',
    });
    if (confirmed) {
      await removeFromLibrary(pageId);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search Header */}
      <div className="p-2 border-b border-border shrink-0 space-y-1.5">
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pages..."
              className="h-8 pl-8 text-sm"
            />
          </div>

          {/* Filter Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  'h-8 w-8 flex-shrink-0',
                  selectedLayerType !== 'all' && 'border-cyan-500 text-cyan-500'
                )}
              >
                <Filter className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
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
              {selectedLayerType !== 'all' && (
                <>
                  <DropdownMenuSeparator />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => setSelectedLayerType('all')}
                  >
                    <X className="h-3 w-3 mr-2" />
                    Clear filter
                  </Button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Active Filter Badge */}
        {selectedLayerType !== 'all' && (
          <div className="flex flex-wrap gap-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-cyan-500/20 text-cyan-400 rounded-full">
              {formatLayerType(selectedLayerType)}
              <button onClick={() => setSelectedLayerType('all')}>
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          </div>
        )}

        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] text-muted-foreground">
            Drag to playlist
          </span>
          <span className="text-[10px] text-muted-foreground">
            {filteredPages.length} of {pages.length} pages
          </span>
        </div>
      </div>

      {/* Page List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Loading pages...
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filteredPages.map((page) => (
              <PageListItem
                key={page.id}
                page={page}
                template={templates.find((t) => t.id === page.templateId)}
                onDelete={() => handleDeletePage(page.id)}
              />
            ))}

            {filteredPages.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                {searchQuery
                  ? 'No pages match your search'
                  : 'No pages yet. Create pages from templates to add them here.'}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface PageListItemProps {
  page: LibraryPage;
  template?: Template;
  onDelete: () => void;
}

function PageListItem({ page, template, onDelete }: PageListItemProps) {
  const [isDragging, setIsDragging] = useState(false);

  const isMissingTemplate = !template && page.templateId;
  const LayerIcon = isMissingTemplate
    ? AlertTriangle
    : template
    ? (LAYER_TYPE_ICONS[template.layerType] || Grid3X3)
    : FileText;

  // Handle drag start - set page data for transfer
  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    // Set the data transfer with page info including payload
    e.dataTransfer.setData(PAGE_DRAG_TYPE, JSON.stringify({
      libraryPageId: page.id,
      pageName: page.name,
      templateId: page.templateId,
      payload: page.payload,
      duration: page.duration,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        'group flex items-center gap-2 px-3 py-1.5 cursor-grab active:cursor-grabbing transition-colors',
        isMissingTemplate
          ? 'bg-red-500/10 border-l-2 border-l-red-500'
          : 'hover:bg-muted/30 border-l-2 border-l-transparent',
        isDragging && 'opacity-50 ring-2 ring-cyan-500'
      )}
    >
      {/* Drag Handle */}
      <div className="text-muted-foreground hover:text-foreground">
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Icon */}
      <div className={cn(
        'w-5 h-5 rounded flex items-center justify-center shrink-0',
        isMissingTemplate
          ? 'bg-red-500/20 text-red-500'
          : 'bg-muted text-muted-foreground'
      )}>
        <LayerIcon className="w-3 h-3" />
      </div>

      {/* Name and Template */}
      <div className="min-w-0 flex-1">
        <div className={cn(
          'text-sm font-medium truncate',
          isMissingTemplate ? 'text-red-500' : 'text-foreground'
        )}>
          {page.name}
        </div>
        {isMissingTemplate ? (
          <div className="text-[10px] text-red-400 truncate">
            Template deleted
          </div>
        ) : template ? (
          <div className="text-[10px] text-muted-foreground truncate">
            {template.name}
          </div>
        ) : null}
      </div>

      {/* Usage count badge */}
      {page.usageCount > 0 && (
        <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
          {page.usageCount} use{page.usageCount !== 1 ? 's' : ''}
        </span>
      )}

      {/* Layer Badge */}
      {template && (
        <span className="text-[9px] text-muted-foreground bg-muted px-1 py-0.5 rounded shrink-0">
          {template.layerName}
        </span>
      )}

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

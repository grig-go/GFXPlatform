import { useState, useMemo } from 'react';
import {
  Input,
  ScrollArea,
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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

export function TemplateList() {
  const { templates, currentProject, loadTemplateElements } = useProjectStore();
  const { selectTemplate, selectedTemplateId } = usePreviewStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLayerType, setSelectedLayerType] = useState<string>('all');

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
        template.layerName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLayerType =
        selectedLayerType === 'all' || template.layerType === selectedLayerType;

      return matchesSearch && matchesLayerType;
    });
  }, [templates, searchQuery, selectedLayerType]);

  const handleSelectTemplate = async (template: Template) => {
    // selectTemplate already clears selectedPageId in previewStore
    // We don't touch pageStore.selectedPage to keep the playlist selection stable
    selectTemplate(template.id);
    // Load elements for the selected template
    await loadTemplateElements(template.id);
  };

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <LayoutTemplate className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No project selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Templates</h3>
          <span className="text-xs text-muted-foreground">
            {filteredTemplates.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="h-8 pl-8 text-sm"
          />
        </div>

        {/* Layer Type Filter */}
        <Select value={selectedLayerType} onValueChange={setSelectedLayerType}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {layerTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type === 'all' ? 'All Types' : formatLayerType(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template List Header */}
      <div className="grid grid-cols-[auto,1fr,auto] gap-2 px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 bg-muted/20">
        <div className="w-6"></div>
        <div>Name / Layer</div>
        <div className="w-16 text-center">Type</div>
      </div>

      {/* Template List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/30">
          {filteredTemplates.map((template) => (
            <TemplateListItem
              key={template.id}
              template={template}
              isSelected={selectedTemplateId === template.id}
              onSelect={() => handleSelectTemplate(template)}
            />
          ))}

          {filteredTemplates.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {searchQuery ? 'No templates match your search' : 'No templates available'}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface TemplateListItemProps {
  template: Template;
  isSelected: boolean;
  onSelect: () => void;
}

function TemplateListItem({ template, isSelected, onSelect }: TemplateListItemProps) {
  const LayerIcon = LAYER_TYPE_ICONS[template.layerType] || Grid3X3;

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group grid grid-cols-[auto,1fr,auto] gap-2 px-3 py-2 cursor-pointer transition-colors items-center',
        isSelected
          ? 'bg-cyan-500/10 border-l-2 border-l-cyan-500'
          : 'hover:bg-muted/30 border-l-2 border-l-transparent'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'w-6 h-6 rounded flex items-center justify-center',
        isSelected ? 'bg-cyan-500/20 text-cyan-500' : 'bg-muted text-muted-foreground'
      )}>
        <LayerIcon className="w-3.5 h-3.5" />
      </div>

      {/* Name and Layer */}
      <div className="min-w-0">
        <div className={cn(
          'text-sm font-medium truncate',
          isSelected ? 'text-cyan-500' : 'text-foreground'
        )}>
          {template.name}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          {template.layerName}
        </div>
      </div>

      {/* Type Badge */}
      <div className="w-16 flex justify-center">
        <span className={cn(
          'text-[10px] px-1.5 py-0.5 rounded truncate',
          isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-muted text-muted-foreground'
        )}>
          {formatLayerType(template.layerType)}
        </span>
      </div>
    </div>
  );
}

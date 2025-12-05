import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  ScrollArea,
  cn,
} from '@emergent-platform/ui';
import { LayoutTemplate, Check } from 'lucide-react';
import { usePageStore } from '@/stores/pageStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { useProjectStore, type Template } from '@/stores/projectStore';
import { useChannelStore } from '@/stores/channelStore';

interface CreatePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePageDialog({ open, onOpenChange }: CreatePageDialogProps) {
  const { templates } = useProjectStore();
  const { currentPlaylist } = usePlaylistStore();
  const { createPage, selectPage } = usePageStore();
  const { selectedChannel } = useChannelStore();

  const [name, setName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!currentPlaylist || !selectedTemplate || !name.trim()) return;

    setIsCreating(true);
    try {
      const page = await createPage(
        currentPlaylist.id,
        selectedTemplate.id,
        name.trim(),
        {},  // payload
        selectedChannel?.id || null  // use selected channel as default
      );
      selectPage(page.id);
      onOpenChange(false);
      resetForm();
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSelectedTemplate(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    const category = template.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5" />
            Create New Page
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Page Name */}
          <div className="space-y-2">
            <Label htmlFor="page-name">Page Name</Label>
            <Input
              id="page-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter page name..."
            />
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Select Template</Label>
            <ScrollArea className="h-[300px] border border-border rounded-lg">
              <div className="p-3 space-y-4">
                {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
                  <div key={category}>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {category}
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {categoryTemplates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          isSelected={selectedTemplate?.id === template.id}
                          onSelect={() => setSelectedTemplate(template)}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {templates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No templates available. Create templates in Nova GFX first.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || !selectedTemplate || isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Page'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TemplateCardProps {
  template: Template;
  isSelected: boolean;
  onSelect: () => void;
}

function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative aspect-video rounded-lg border-2 overflow-hidden transition-all',
        isSelected
          ? 'border-violet-500 ring-2 ring-violet-500/30'
          : 'border-border hover:border-violet-500/50'
      )}
    >
      {/* Thumbnail */}
      {template.thumbnailUrl ? (
        <img
          src={template.thumbnailUrl}
          alt={template.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <LayoutTemplate className="w-6 h-6 text-muted-foreground" />
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-1 right-1 bg-violet-500 rounded-full p-0.5">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Name Overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <div className="text-xs text-white truncate">{template.name}</div>
        <div className="text-[10px] text-white/60">{template.layerType}</div>
      </div>
    </button>
  );
}

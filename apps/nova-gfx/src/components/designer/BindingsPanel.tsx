import { useState } from 'react';
import { Plus, Trash2, Link2, Type, Image, Hash, Palette, ToggleLeft } from 'lucide-react';
import { Button, Input, ScrollArea, Separator, cn } from '@emergent-platform/ui';
import { useDesignerStore } from '@/stores/designerStore';
import type { Binding, BindingType } from '@emergent-platform/types';

export function BindingsPanel() {
  const { bindings, elements, currentTemplateId } = useDesignerStore();
  const [newBindingKey, setNewBindingKey] = useState('');

  // Group bindings by element
  const bindingsByElement = new Map<string, Binding[]>();
  bindings.forEach((b) => {
    const list = bindingsByElement.get(b.element_id) || [];
    list.push(b);
    bindingsByElement.set(b.element_id, list);
  });

  if (!currentTemplateId) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <Link2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
        Select a template to manage bindings
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border">
        <h3 className="font-medium text-sm">Data Bindings</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Connect template fields to dynamic data
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Bindings List */}
          {bindings.length === 0 ? (
            <div className="text-center py-8">
              <Link2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground mb-2">No bindings yet</p>
              <p className="text-xs text-muted-foreground">
                Add text elements and create bindings for dynamic content
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from(bindingsByElement.entries()).map(([elementId, elementBindings]) => {
                const element = elements.find((e) => e.id === elementId);
                if (!element) return null;

                return (
                  <div key={elementId} className="border border-border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-3 py-2 text-xs font-medium">
                      {element.name}
                    </div>
                    <div className="divide-y divide-border">
                      {elementBindings.map((binding) => (
                        <BindingRow key={binding.id} binding={binding} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Separator />

          {/* Quick Add */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">QUICK ADD</h4>
            <div className="flex flex-wrap gap-2">
              <QuickAddButton
                label="Name"
                icon={<Type className="w-3 h-3" />}
                bindingKey="name"
              />
              <QuickAddButton
                label="Title"
                icon={<Type className="w-3 h-3" />}
                bindingKey="title"
              />
              <QuickAddButton
                label="Score"
                icon={<Hash className="w-3 h-3" />}
                bindingKey="score"
              />
              <QuickAddButton
                label="Logo"
                icon={<Image className="w-3 h-3" />}
                bindingKey="logo"
              />
            </div>
          </div>

          <Separator />

          {/* Test Data */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">TEST DATA</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Preview how your template looks with sample data
            </p>
            {bindings.length > 0 && (
              <div className="space-y-2">
                {bindings.map((binding) => (
                  <div key={binding.id} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 truncate">
                      {binding.binding_key}
                    </span>
                    <Input
                      placeholder={binding.default_value || 'Sample value...'}
                      className="h-7 text-xs flex-1"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

interface BindingRowProps {
  binding: Binding;
}

function BindingRow({ binding }: BindingRowProps) {
  const typeIcons: Record<BindingType, React.ReactNode> = {
    text: <Type className="w-3 h-3" />,
    image: <Image className="w-3 h-3" />,
    number: <Hash className="w-3 h-3" />,
    color: <Palette className="w-3 h-3" />,
    boolean: <ToggleLeft className="w-3 h-3" />,
  };

  return (
    <div className="px-3 py-2 flex items-center gap-2 group">
      <div
        className={cn(
          'w-6 h-6 rounded flex items-center justify-center',
          'bg-violet-500/20 text-violet-400'
        )}
      >
        {typeIcons[binding.binding_type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{binding.binding_key}</div>
        <div className="text-xs text-muted-foreground truncate">
          {binding.target_property}
        </div>
      </div>
      {binding.required && (
        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
          Required
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-3 h-3 text-destructive" />
      </Button>
    </div>
  );
}

interface QuickAddButtonProps {
  label: string;
  icon: React.ReactNode;
  bindingKey: string;
}

function QuickAddButton({ label, icon, bindingKey }: QuickAddButtonProps) {
  const { selectedElementIds, elements, currentTemplateId } = useDesignerStore();

  const handleAdd = () => {
    if (!currentTemplateId || selectedElementIds.length === 0) return;
    // TODO: Create binding via store action
    console.log('Add binding:', bindingKey, 'to', selectedElementIds[0]);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-xs gap-1"
      onClick={handleAdd}
      disabled={selectedElementIds.length === 0}
    >
      {icon}
      {label}
    </Button>
  );
}


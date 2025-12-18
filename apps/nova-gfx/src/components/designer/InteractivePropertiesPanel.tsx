/**
 * Interactive Element Properties Panel
 *
 * Properties editor for interactive elements (buttons, inputs, selects, etc.)
 */

import { useCallback } from 'react';
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Button,
} from '@emergent-platform/ui';
import { Plus, Trash2 } from 'lucide-react';
import { useDesignerStore } from '@/stores/designerStore';
import type { Element } from '@emergent-platform/types';
import type { InteractiveConfig } from '@/components/canvas/InteractiveElement';

// Property Section wrapper component
function PropertySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider">{title}</Label>
      {children}
    </div>
  );
}

interface InteractivePropertiesEditorProps {
  element: Element;
}

export function InteractivePropertiesEditor({ element }: InteractivePropertiesEditorProps) {
  const { updateElement } = useDesignerStore();

  const content = element.content as InteractiveConfig;

  const updateContent = useCallback(
    (updates: Partial<InteractiveConfig>) => {
      updateElement(element.id, {
        content: { ...element.content, ...updates } as Element['content'],
      });
    },
    [element.id, element.content, updateElement]
  );

  if (content.type !== 'interactive') return null;

  const { inputType } = content;

  return (
    <div className="space-y-3 p-2">
      {/* Common Properties */}
      <PropertySection title="Name">
        <Input
          value={content.name || ''}
          onChange={(e) => updateContent({ name: e.target.value })}
          placeholder="Element name"
          className="h-8 text-xs"
        />
      </PropertySection>

      <PropertySection title="Label">
        <Input
          value={content.label || ''}
          onChange={(e) => updateContent({ label: e.target.value })}
          placeholder="Label text"
          className="h-8 text-xs"
        />
      </PropertySection>

      {/* Button-specific properties */}
      {inputType === 'button' && (
        <>
          <PropertySection title="Variant">
            <Select
              value={content.buttonVariant || 'default'}
              onValueChange={(value) =>
                updateContent({
                  buttonVariant: value as InteractiveConfig['buttonVariant'],
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
                <SelectItem value="ghost">Ghost</SelectItem>
                <SelectItem value="destructive">Destructive</SelectItem>
              </SelectContent>
            </Select>
          </PropertySection>

          <PropertySection title="Size">
            <Select
              value={content.buttonSize || 'md'}
              onValueChange={(value) =>
                updateContent({
                  buttonSize: value as InteractiveConfig['buttonSize'],
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
              </SelectContent>
            </Select>
          </PropertySection>
        </>
      )}

      {/* Input-specific properties */}
      {(inputType === 'text-input' ||
        inputType === 'number-input' ||
        inputType === 'textarea') && (
        <>
          <PropertySection title="Placeholder">
            <Input
              value={content.placeholder || ''}
              onChange={(e) => updateContent({ placeholder: e.target.value })}
              placeholder="Placeholder text"
              className="h-8 text-xs"
            />
          </PropertySection>

          <PropertySection title="Default Value">
            <Input
              value={String(content.defaultValue || '')}
              onChange={(e) =>
                updateContent({
                  defaultValue:
                    inputType === 'number-input'
                      ? Number(e.target.value)
                      : e.target.value,
                })
              }
              type={inputType === 'number-input' ? 'number' : 'text'}
              className="h-8 text-xs"
            />
          </PropertySection>

          {inputType === 'text-input' && (
            <PropertySection title="Input Mode">
              <Select
                value={content.inputMode || 'text'}
                onValueChange={(value) =>
                  updateContent({
                    inputMode: value as InteractiveConfig['inputMode'],
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="password">Password</SelectItem>
                  <SelectItem value="tel">Phone</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="search">Search</SelectItem>
                </SelectContent>
              </Select>
            </PropertySection>
          )}

          {inputType === 'number-input' && (
            <PropertySection title="Step">
              <Input
                type="number"
                value={content.step || 1}
                onChange={(e) => updateContent({ step: Number(e.target.value) })}
                className="h-8 text-xs"
              />
            </PropertySection>
          )}
        </>
      )}

      {/* Select/Radio options */}
      {(inputType === 'select' || inputType === 'radio') && (
        <PropertySection title="Options">
          <div className="space-y-2">
            {(content.options || []).map((opt, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  value={opt.value}
                  onChange={(e) => {
                    const newOptions = [...(content.options || [])];
                    newOptions[idx] = { ...newOptions[idx], value: e.target.value };
                    updateContent({ options: newOptions });
                  }}
                  placeholder="Value"
                  className="h-7 text-xs flex-1"
                />
                <Input
                  value={opt.label}
                  onChange={(e) => {
                    const newOptions = [...(content.options || [])];
                    newOptions[idx] = { ...newOptions[idx], label: e.target.value };
                    updateContent({ options: newOptions });
                  }}
                  placeholder="Label"
                  className="h-7 text-xs flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => {
                    const newOptions = (content.options || []).filter((_, i) => i !== idx);
                    updateContent({ options: newOptions });
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => {
                const newOptions = [
                  ...(content.options || []),
                  { value: `option${(content.options?.length || 0) + 1}`, label: `Option ${(content.options?.length || 0) + 1}` },
                ];
                updateContent({ options: newOptions });
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Option
            </Button>
          </div>
        </PropertySection>
      )}

      {/* Slider properties */}
      {inputType === 'slider' && (
        <>
          <PropertySection title="Min Value">
            <Input
              type="number"
              value={content.validation?.min ?? 0}
              onChange={(e) =>
                updateContent({
                  validation: {
                    ...content.validation,
                    min: Number(e.target.value),
                  },
                })
              }
              className="h-8 text-xs"
            />
          </PropertySection>

          <PropertySection title="Max Value">
            <Input
              type="number"
              value={content.validation?.max ?? 100}
              onChange={(e) =>
                updateContent({
                  validation: {
                    ...content.validation,
                    max: Number(e.target.value),
                  },
                })
              }
              className="h-8 text-xs"
            />
          </PropertySection>

          <PropertySection title="Step">
            <Input
              type="number"
              value={content.step || 1}
              onChange={(e) => updateContent({ step: Number(e.target.value) })}
              className="h-8 text-xs"
            />
          </PropertySection>

          <PropertySection title="Default Value">
            <Input
              type="number"
              value={Number(content.defaultValue) || 50}
              onChange={(e) => updateContent({ defaultValue: Number(e.target.value) })}
              className="h-8 text-xs"
            />
          </PropertySection>
        </>
      )}

      {/* Toggle properties */}
      {inputType === 'toggle' && (
        <>
          <PropertySection title="On Label">
            <Input
              value={content.onLabel || 'On'}
              onChange={(e) => updateContent({ onLabel: e.target.value })}
              className="h-8 text-xs"
            />
          </PropertySection>

          <PropertySection title="Off Label">
            <Input
              value={content.offLabel || 'Off'}
              onChange={(e) => updateContent({ offLabel: e.target.value })}
              className="h-8 text-xs"
            />
          </PropertySection>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Show Value</Label>
            <Switch
              checked={content.showValue ?? true}
              onCheckedChange={(checked) => updateContent({ showValue: checked })}
            />
          </div>
        </>
      )}

      {/* Color picker default */}
      {inputType === 'color-picker' && (
        <PropertySection title="Default Color">
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={String(content.defaultValue) || '#3B82F6'}
              onChange={(e) => updateContent({ defaultValue: e.target.value })}
              className="w-8 h-8 rounded border cursor-pointer"
            />
            <Input
              value={String(content.defaultValue) || '#3B82F6'}
              onChange={(e) => updateContent({ defaultValue: e.target.value })}
              className="h-8 text-xs flex-1 font-mono"
            />
          </div>
        </PropertySection>
      )}

      {/* Styling */}
      <PropertySection title="Accent Color">
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={content.accentColor || '#3B82F6'}
            onChange={(e) => updateContent({ accentColor: e.target.value })}
            className="w-8 h-8 rounded border cursor-pointer"
          />
          <Input
            value={content.accentColor || ''}
            onChange={(e) => updateContent({ accentColor: e.target.value })}
            placeholder="Default"
            className="h-8 text-xs flex-1 font-mono"
          />
        </div>
      </PropertySection>

      <PropertySection title="Border Radius">
        <Input
          type="number"
          value={content.borderRadius ?? 4}
          onChange={(e) => updateContent({ borderRadius: Number(e.target.value) })}
          min={0}
          className="h-8 text-xs"
        />
      </PropertySection>

      {/* State Binding */}
      <PropertySection title="Bind to State">
        <Input
          value={content.bindTo || ''}
          onChange={(e) => updateContent({ bindTo: e.target.value })}
          placeholder="State variable name"
          className="h-8 text-xs font-mono"
        />
        <p className="text-[10px] text-muted-foreground">
          Bind this input to a state variable for use in scripts
        </p>
      </PropertySection>

      {/* Common states */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Disabled</Label>
          <Switch
            checked={content.disabled ?? false}
            onCheckedChange={(checked) => updateContent({ disabled: checked })}
          />
        </div>

        {(inputType === 'text-input' ||
          inputType === 'number-input' ||
          inputType === 'textarea') && (
          <div className="flex items-center justify-between">
            <Label className="text-xs">Read Only</Label>
            <Switch
              checked={content.readOnly ?? false}
              onCheckedChange={(checked) => updateContent({ readOnly: checked })}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label className="text-xs">Required</Label>
          <Switch
            checked={content.required ?? false}
            onCheckedChange={(checked) => updateContent({ required: checked })}
          />
        </div>
      </div>
    </div>
  );
}

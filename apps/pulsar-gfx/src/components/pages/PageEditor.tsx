import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Input,
  Label,
  Textarea,
  ScrollArea,
} from '@emergent-platform/ui';
import { Save, Image as ImageIcon, Type, Video, Eye } from 'lucide-react';
import { usePageStore, type Page } from '@/stores/pageStore';
import { useProjectStore, type TemplateElement } from '@/stores/projectStore';
import { usePreviewStore } from '@/stores/previewStore';

interface PageEditorProps {
  page: Page;
}

export function PageEditor({ page }: PageEditorProps) {
  const { updatePage } = usePageStore();
  const { getTemplate } = useProjectStore();
  const { selectPage: selectForPreview, setPreviewPayload } = usePreviewStore();

  const template = getTemplate(page.templateId);

  const [name, setName] = useState(page.name);
  const [localPayload, setLocalPayload] = useState<Record<string, string | null>>(page.payload);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset when page changes
  useEffect(() => {
    setName(page.name);
    setLocalPayload(page.payload);
    setIsDirty(false);
  }, [page.id, page.name, page.payload]);

  // Update preview when payload changes
  useEffect(() => {
    selectForPreview(page.id, localPayload);
    setPreviewPayload(localPayload);
  }, [page.id, localPayload, selectForPreview, setPreviewPayload]);

  const handleFieldChange = useCallback((fieldId: string, value: string | null) => {
    setLocalPayload((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    setIsDirty(true);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePage(page.id, {
        name,
        payload: localPayload,
      });
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    selectForPreview(page.id, localPayload);
  };

  // Get controllable elements from template
  const elements = template?.elements || [];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="font-medium">Edit Page</h3>
          {isDirty && (
            <span className="text-xs text-amber-500">• Unsaved changes</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePreview}
            className="gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Page Name */}
          <div className="space-y-2">
            <Label htmlFor="page-name">Page Name</Label>
            <Input
              id="page-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Enter page name..."
            />
          </div>

          {/* Template Info */}
          {template && (
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <div className="text-xs text-muted-foreground mb-1">Template</div>
              <div className="font-medium">{template.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {template.layerType} • {elements.length} editable fields
              </div>
            </div>
          )}

          {/* Content Fields */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Content Fields</h4>

            {elements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No editable fields in this template
              </div>
            ) : (
              elements.map((element) => (
                <FieldEditor
                  key={element.id}
                  element={element}
                  value={localPayload[element.id] ?? element.content ?? ''}
                  onChange={(value) => handleFieldChange(element.id, value)}
                />
              ))
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

interface FieldEditorProps {
  element: TemplateElement;
  value: string | null;
  onChange: (value: string | null) => void;
}

function FieldEditor({ element, value, onChange }: FieldEditorProps) {
  const getIcon = () => {
    switch (element.elementType) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-blue-400" />;
      case 'video':
        return <Video className="w-4 h-4 text-purple-400" />;
      default:
        return <Type className="w-4 h-4 text-green-400" />;
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {getIcon()}
        <span>{element.name}</span>
        <span className="text-xs text-muted-foreground">({element.elementType})</span>
      </Label>

      {element.elementType === 'text' ? (
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${element.name}...`}
          rows={2}
          className="resize-none"
        />
      ) : (
        <div className="flex gap-2">
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${element.elementType} URL...`}
            className="flex-1"
          />
          <Button size="icon" variant="outline">
            <ImageIcon className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

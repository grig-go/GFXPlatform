import { useState, useMemo, useCallback } from 'react';
import {
  Button,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Input,
  Checkbox,
  Label,
} from '@emergent-platform/ui';
import {
  Database,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Type,
  Image,
  Square,
  FileCode,
  Play,
  Pin,
} from 'lucide-react';
import { useDesignerStore } from '@/stores/designerStore';
import { AddDataModal } from '@/components/dialogs/AddDataModal';
import { extractFieldsFromData, getNestedValue } from '@/data/sampleDataSources';
import { AddressContextMenu } from '@/components/common/AddressContextMenu';
import { buildDataAddress, sanitizeName } from '@/lib/address';

export function DataBindingTab() {
  const [showAddDataModal, setShowAddDataModal] = useState(false);

  const {
    dataSourceId,
    dataSourceName,
    dataPayload,
    currentRecordIndex,
    dataDisplayField,
    clearDataSource,
    setCurrentRecordIndex,
    setDefaultRecordIndex,
    nextRecord,
    prevRecord,
    elements,
    bindings,
    addBinding,
    updateBinding,
    deleteBinding,
    currentTemplateId,
    templates,
  } = useDesignerStore();

  // Get current record
  const currentRecord = useMemo(() => {
    if (!dataPayload || dataPayload.length === 0) return null;
    return dataPayload[currentRecordIndex];
  }, [dataPayload, currentRecordIndex]);

  // Extract fields from data
  const fields = useMemo(() => {
    if (!dataPayload) return [];
    return extractFieldsFromData(dataPayload);
  }, [dataPayload]);

  // Get display value for record selector
  const recordDisplayValue = useMemo(() => {
    if (!currentRecord || !dataDisplayField) return `Record ${currentRecordIndex + 1}`;
    const value = getNestedValue(currentRecord, dataDisplayField);
    return value ? String(value) : `Record ${currentRecordIndex + 1}`;
  }, [currentRecord, dataDisplayField, currentRecordIndex]);

  // Get bindings for current template
  const templateBindings = useMemo(() => {
    if (!currentTemplateId) return [];
    return bindings.filter((b) => b.template_id === currentTemplateId);
  }, [bindings, currentTemplateId]);

  // Get bindable elements (text, image, icon, svg, lottie elements from current template)
  const bindableElements = useMemo(() => {
    if (!currentTemplateId) return [];
    const bindableTypes = ['text', 'image', 'shape', 'icon', 'svg', 'lottie'];
    return elements.filter(
      (e) =>
        e.template_id === currentTemplateId &&
        bindableTypes.includes(e.element_type)
    );
  }, [elements, currentTemplateId]);

  // Get current template name for address building
  const currentTemplateName = useMemo(() => {
    if (!currentTemplateId) return '';
    const template = templates.find(t => t.id === currentTemplateId);
    return template?.name || '';
  }, [currentTemplateId, templates]);

  // Get default record index from current template config
  const defaultRecordIndex = useMemo(() => {
    if (!currentTemplateId) return 0;
    const template = templates.find(t => t.id === currentTemplateId);
    const config = template?.data_source_config as { defaultRecordIndex?: number } | null;
    return config?.defaultRecordIndex ?? 0;
  }, [currentTemplateId, templates]);

  // Check if current record is the default
  const isCurrentDefault = currentRecordIndex === defaultRecordIndex;

  // Get which element is bound to a specific field
  const getBindingForField = (fieldPath: string) => {
    return templateBindings.find((b) => b.binding_key === fieldPath);
  };

  // Handle binding a field to an element
  const handleBindField = (fieldPath: string, elementId: string | null) => {
    if (!currentTemplateId) return;

    // First, remove any existing binding for this field
    const existingBinding = getBindingForField(fieldPath);
    if (existingBinding) {
      deleteBinding(existingBinding.id);
    }

    // If elementId is null or "none", just remove the binding
    if (!elementId || elementId === 'none') return;

    // Find the element to determine target property
    const element = elements.find((e) => e.id === elementId);
    if (!element) return;

    // Determine target property based on element type
    let targetProperty = 'content.text';
    if (element.element_type === 'image' || element.element_type === 'icon' || element.element_type === 'svg') {
      targetProperty = 'content.src';
    } else if (element.element_type === 'lottie') {
      targetProperty = 'content.animationUrl';
    }

    // Determine binding type based on field type
    const field = fields.find((f) => f.path === fieldPath);
    let bindingType: 'text' | 'number' | 'boolean' | 'image' | 'color' = 'text';
    if (field) {
      if (field.type === 'number') bindingType = 'number';
      else if (field.type === 'boolean') bindingType = 'boolean';
      else if (element.element_type === 'image' || element.element_type === 'icon' || element.element_type === 'svg' || element.element_type === 'lottie') {
        bindingType = 'image';
      }
    }

    addBinding(elementId, fieldPath, targetProperty, bindingType);
  };

  // Handle updating prefix/suffix for a binding
  const handleUpdateFormatterOptions = useCallback((bindingId: string, key: 'prefix' | 'suffix', value: string) => {
    const binding = bindings.find(b => b.id === bindingId);
    if (!binding) return;

    const currentOptions = (binding.formatter_options || {}) as { prefix?: string; suffix?: string; hideOnZero?: boolean; hideOnNull?: boolean };
    const newOptions = {
      ...currentOptions,
      [key]: value || undefined, // Remove key if empty
    };

    // Clean up empty values
    if (!newOptions.prefix) delete newOptions.prefix;
    if (!newOptions.suffix) delete newOptions.suffix;

    updateBinding(bindingId, {
      formatter_options: Object.keys(newOptions).length > 0 ? newOptions : null,
    });
  }, [bindings, updateBinding]);

  // Handle toggling hide options (hideOnZero, hideOnNull)
  const handleToggleHideOption = useCallback((bindingId: string, key: 'hideOnZero' | 'hideOnNull', checked: boolean) => {
    const binding = bindings.find(b => b.id === bindingId);
    if (!binding) return;

    const currentOptions = (binding.formatter_options || {}) as { prefix?: string; suffix?: string; hideOnZero?: boolean; hideOnNull?: boolean };
    const newOptions = {
      ...currentOptions,
      [key]: checked || undefined, // Only store if true
    };

    // Clean up false/undefined values
    if (!newOptions.hideOnZero) delete newOptions.hideOnZero;
    if (!newOptions.hideOnNull) delete newOptions.hideOnNull;
    if (!newOptions.prefix) delete newOptions.prefix;
    if (!newOptions.suffix) delete newOptions.suffix;

    updateBinding(bindingId, {
      formatter_options: Object.keys(newOptions).length > 0 ? newOptions : null,
    });
  }, [bindings, updateBinding]);

  // Get element icon based on type
  const getElementIcon = (elementType: string) => {
    switch (elementType) {
      case 'text':
        return <Type className="w-3 h-3" />;
      case 'image':
        return <Image className="w-3 h-3" />;
      case 'icon':
      case 'svg':
        return <FileCode className="w-3 h-3" />;
      case 'lottie':
        return <Play className="w-3 h-3" />;
      default:
        return <Square className="w-3 h-3" />;
    }
  };

  // Format field value for display
  const formatFieldValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return JSON.stringify(value).slice(0, 20) + '...';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return value.toLocaleString();
    const str = String(value);
    return str.length > 20 ? str.slice(0, 20) + '...' : str;
  };

  // No data source connected
  if (!dataSourceId || !dataPayload) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full text-center">
        <Database className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
        <p className="text-sm text-muted-foreground mb-4">
          No data source connected to this template.
        </p>
        <Button size="sm" onClick={() => setShowAddDataModal(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Data Source
        </Button>

        <AddDataModal open={showAddDataModal} onOpenChange={setShowAddDataModal} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Data Source Header */}
      <div className="p-2 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Database className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-xs font-medium truncate">{dataSourceName}</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={clearDataSource}
                >
                  <X className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Disconnect data source</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Record Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={prevRecord}
            disabled={currentRecordIndex === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <AddressContextMenu
            address={`@template.${sanitizeName(currentTemplateName)}.data`}
            label="Template Data"
            className="flex-1"
          >
            <Select
              value={String(currentRecordIndex)}
              onValueChange={(val) => setCurrentRecordIndex(parseInt(val, 10))}
            >
              <SelectTrigger className="h-7 w-full text-xs">
                <SelectValue>
                  {recordDisplayValue}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {dataPayload.map((record, idx) => {
                  const displayVal = dataDisplayField
                    ? getNestedValue(record, dataDisplayField)
                    : null;
                  return (
                    <SelectItem key={idx} value={String(idx)}>
                      {displayVal ? String(displayVal) : `Record ${idx + 1}`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </AddressContextMenu>

          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={nextRecord}
            disabled={currentRecordIndex === dataPayload.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {currentRecordIndex + 1}/{dataPayload.length}
          </span>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isCurrentDefault ? "default" : "outline"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setDefaultRecordIndex(currentRecordIndex)}
                  disabled={isCurrentDefault}
                >
                  <Pin className={`w-3 h-3 ${isCurrentDefault ? 'fill-current' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isCurrentDefault ? 'This is the default record' : 'Set as default record on load'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Fields with Element Dropdowns */}
          <h4 className="text-[10px] font-medium text-muted-foreground mb-2">
            FIELDS → ELEMENTS
          </h4>

          {bindableElements.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              No bindable elements in this template. Add text or image elements first.
            </p>
          ) : (
            <div className="space-y-1">
              {fields.map((field) => {
                const value = currentRecord ? getNestedValue(currentRecord, field.path) : null;
                const binding = getBindingForField(field.path);
                const boundElementId = binding?.element_id || 'none';
                const formatterOptions = (binding?.formatter_options || {}) as { prefix?: string; suffix?: string; hideOnZero?: boolean; hideOnNull?: boolean };
                const boundElement = binding ? elements.find(e => e.id === binding.element_id) : null;
                const isTextBinding = boundElement?.element_type === 'text';
                const fieldAddress = buildDataAddress(field.path);

                return (
                  <AddressContextMenu
                    key={field.path}
                    address={fieldAddress}
                    label="Data Field"
                  >
                    <div className="p-1.5 rounded bg-muted/30 text-xs space-y-1 cursor-context-menu">
                      <div className="flex items-center gap-2">
                        {/* Field name and value */}
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-[10px] truncate" title={field.path}>
                            {field.path}
                          </div>
                          <div className="text-[9px] text-muted-foreground truncate" title={String(value)}>
                            {formatFieldValue(value)}
                          </div>
                        </div>

                      {/* Element dropdown */}
                      <Select
                        value={boundElementId}
                        onValueChange={(elementId) => handleBindField(field.path, elementId)}
                      >
                        <SelectTrigger className="h-6 w-[120px] text-[10px]">
                          <SelectValue placeholder="Not bound" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-muted-foreground">Not bound</span>
                          </SelectItem>
                          {bindableElements.map((element) => (
                            <SelectItem key={element.id} value={element.id}>
                              <div className="flex items-center gap-1">
                                {getElementIcon(element.element_type)}
                                <span className="truncate">{element.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Prefix/Suffix + Hide options row - show when bound */}
                    {binding && (
                      <div className="flex items-center gap-1 pl-1 flex-wrap">
                        {/* Prefix/Suffix - only for text bindings */}
                        {isTextBinding && (
                          <>
                            <Input
                              className="h-5 w-12 text-[10px] px-1"
                              placeholder="prefix"
                              value={formatterOptions.prefix || ''}
                              onChange={(e) => handleUpdateFormatterOptions(binding.id, 'prefix', e.target.value)}
                            />
                            <span className="text-[9px] text-muted-foreground">+</span>
                            <span className="text-[9px] text-primary font-mono truncate max-w-[60px]">{formatFieldValue(value)}</span>
                            <span className="text-[9px] text-muted-foreground">+</span>
                            <Input
                              className="h-5 w-12 text-[10px] px-1"
                              placeholder="suffix"
                              value={formatterOptions.suffix || ''}
                              onChange={(e) => handleUpdateFormatterOptions(binding.id, 'suffix', e.target.value)}
                            />
                            <span className="text-muted-foreground mx-1">|</span>
                          </>
                        )}
                        {/* Hide options - for all bindings */}
                        <div className="flex items-center gap-1">
                          <Checkbox
                            id={`${binding.id}-hide-zero`}
                            className="h-3 w-3"
                            checked={formatterOptions.hideOnZero || false}
                            onCheckedChange={(checked) => handleToggleHideOption(binding.id, 'hideOnZero', checked === true)}
                          />
                          <Label htmlFor={`${binding.id}-hide-zero`} className="text-[8px] text-muted-foreground cursor-pointer">
                            0
                          </Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <Checkbox
                            id={`${binding.id}-hide-null`}
                            className="h-3 w-3"
                            checked={formatterOptions.hideOnNull || false}
                            onCheckedChange={(checked) => handleToggleHideOption(binding.id, 'hideOnNull', checked === true)}
                          />
                          <Label htmlFor={`${binding.id}-hide-null`} className="text-[8px] text-muted-foreground cursor-pointer">
                            empty
                          </Label>
                        </div>
                      </div>
                      )}
                    </div>
                  </AddressContextMenu>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      <AddDataModal open={showAddDataModal} onOpenChange={setShowAddDataModal} />
    </div>
  );
}

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@emergent-platform/ui';
import {
  Database,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  X,
  Type,
  Image,
  Square,
  FileCode,
  Play,
  Pin,
  Settings,
  RefreshCw,
  Loader2,
  Clock,
  Check,
} from 'lucide-react';
import { useDesignerStore } from '@/stores/designerStore';
import { AddDataModal } from '@/components/dialogs/AddDataModal';
import { BindingSettingsModal, FormatterOptions } from '@/components/dialogs/BindingSettingsModal';
import { extractFieldsFromData, getNestedValue } from '@/data/sampleDataSources';
import { AddressContextMenu } from '@/components/common/AddressContextMenu';
import { buildDataAddress, sanitizeName } from '@/lib/address';

export function DataBindingTab() {
  const [showAddDataModal, setShowAddDataModal] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsBindingId, setSettingsBindingId] = useState<string | null>(null);
  const [settingsFieldPath, setSettingsFieldPath] = useState<string>('');
  const [settingsFieldType, setSettingsFieldType] = useState<'string' | 'number' | 'boolean' | 'date' | 'unknown'>('unknown');

  const {
    dataSourceId,
    dataSourceName,
    dataSourceSlug,
    dataPayload,
    currentRecordIndex,
    dataDisplayField,
    dataLastFetched,
    dataLoading,
    dataError,
    clearDataSource,
    refreshDataSource,
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

  // Get all bindings for a specific field (supports multiple elements bound to same field)
  const getBindingsForField = (fieldPath: string) => {
    return templateBindings.filter((b) => b.binding_key === fieldPath);
  };

  // Get array of element IDs bound to a specific field
  const getBoundElementIds = (fieldPath: string): string[] => {
    return getBindingsForField(fieldPath).map(b => b.element_id);
  };

  // Handle toggling a binding for a field to an element (multi-select support)
  const handleToggleBinding = (fieldPath: string, elementId: string) => {
    if (!currentTemplateId || !elementId) return;

    // Check if this element is already bound to this field
    const existingBindings = getBindingsForField(fieldPath);
    const existingBinding = existingBindings.find(b => b.element_id === elementId);

    if (existingBinding) {
      // Already bound - remove this specific binding
      deleteBinding(existingBinding.id);
      return;
    }

    // Not bound - add new binding for this element
    const element = elements.find((e) => e.id === elementId);
    if (!element) return;

    // Determine target property based on element type
    let targetProperty = 'content.text';
    if (element.element_type === 'image' || element.element_type === 'svg') {
      targetProperty = 'content.src';
    } else if (element.element_type === 'icon') {
      targetProperty = 'content.iconName';
    } else if (element.element_type === 'lottie') {
      targetProperty = 'content.animationUrl';
    }

    // Determine binding type based on field type
    const field = fields.find((f) => f.path === fieldPath);
    let bindingType: 'text' | 'number' | 'boolean' | 'image' | 'color' = 'text';
    if (field) {
      if (field.type === 'number') bindingType = 'number';
      else if (field.type === 'boolean') bindingType = 'boolean';
      else if (element.element_type === 'image' || element.element_type === 'svg' || element.element_type === 'lottie') {
        // Icons use text binding for iconName, not image
        bindingType = 'image';
      }
    }

    addBinding(elementId, fieldPath, targetProperty, bindingType);
  };

  // Handle updating prefix/suffix for a binding
  const handleUpdateFormatterOptions = useCallback((bindingId: string, key: 'prefix' | 'suffix', value: string) => {
    const binding = bindings.find(b => b.id === bindingId);
    if (!binding) return;

    const currentOptions = (binding.formatter_options || {}) as FormatterOptions;
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

  // Handle opening settings modal
  const handleOpenSettings = useCallback((bindingId: string, fieldPath: string, fieldType: string) => {
    setSettingsBindingId(bindingId);
    setSettingsFieldPath(fieldPath);
    // Map field type to settings modal type
    let mappedType: 'string' | 'number' | 'boolean' | 'date' | 'unknown' = 'unknown';
    if (fieldType === 'number') mappedType = 'number';
    else if (fieldType === 'boolean') mappedType = 'boolean';
    else if (fieldType === 'string') {
      // Check if it looks like a date
      const field = fields.find(f => f.path === fieldPath);
      if (field) {
        const value = currentRecord ? getNestedValue(currentRecord, fieldPath) : null;
        if (value && typeof value === 'string' && (
          /^\d{4}-\d{2}-\d{2}/.test(value) || // ISO date
          /^\d{2}[/-]\d{2}[/-]\d{4}/.test(value) // Common date formats
        )) {
          mappedType = 'date';
        } else {
          mappedType = 'string';
        }
      }
    }
    setSettingsFieldType(mappedType);
    setSettingsModalOpen(true);
  }, [fields, currentRecord]);

  // Handle saving settings from modal
  const handleSaveSettings = useCallback((options: FormatterOptions) => {
    console.log(`🔧 handleSaveSettings called:`, { settingsBindingId, options });
    if (!settingsBindingId) {
      console.warn(`🔧 No settingsBindingId, aborting save`);
      return;
    }

    const formatterOptions = Object.keys(options).length > 0 ? options : null;
    console.log(`🔧 Calling updateBinding with formatter_options:`, formatterOptions);
    updateBinding(settingsBindingId, {
      formatter_options: formatterOptions,
    });
  }, [settingsBindingId, updateBinding]);

  // Get current binding for settings modal
  const settingsBinding = useMemo(() => {
    if (!settingsBindingId) return null;
    return bindings.find(b => b.id === settingsBindingId);
  }, [settingsBindingId, bindings]);

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

  // Get active settings summary for tooltip
  const getSettingsSummary = (opts: FormatterOptions): string[] => {
    const summary: string[] = [];

    // Text settings
    if (opts.textCase && opts.textCase !== 'none') {
      const caseLabels: Record<string, string> = {
        uppercase: 'UPPERCASE',
        lowercase: 'lowercase',
        capitalize: 'Capitalize',
        titlecase: 'Title Case',
      };
      summary.push(`Case: ${caseLabels[opts.textCase] || opts.textCase}`);
    }

    // Trim settings
    if (opts.trimStart && opts.trimStart > 0) {
      summary.push(`Trim start: ${opts.trimStart}`);
    }
    if (opts.trimEnd && opts.trimEnd > 0) {
      summary.push(`Trim end: ${opts.trimEnd}`);
    }

    // Number settings
    if (opts.numberFormat && opts.numberFormat !== 'none') {
      const formatLabels: Record<string, string> = {
        comma: 'Comma (1,000)',
        space: 'Space (1 000)',
        compact: 'Compact (1K)',
      };
      summary.push(`Format: ${formatLabels[opts.numberFormat] || opts.numberFormat}`);
    }
    if (opts.decimals !== undefined) {
      if (opts.decimals === -1) {
        summary.push('Decimals: Whole');
      } else {
        summary.push(`Decimals: ${opts.decimals}`);
      }
    }
    if (opts.roundTo && opts.roundTo !== 'none') {
      summary.push(`Round to: ${opts.roundTo}`);
    }
    if (opts.padZeros && opts.padZeros > 0) {
      summary.push(`Pad zeros: ${opts.padZeros}`);
    }
    if (opts.showSign) {
      summary.push('Show + sign');
    }

    // Date settings
    if (opts.dateFormat && opts.dateFormat !== 'none') {
      summary.push(`Date: ${opts.dateFormat}`);
    }
    if (opts.timeFormat && opts.timeFormat !== 'none') {
      summary.push(`Time: ${opts.timeFormat}`);
    }

    // Hide conditions
    if (opts.hideOnZero) {
      summary.push('Hide on 0');
    }
    if (opts.hideOnNull) {
      summary.push('Hide on empty');
    }

    return summary;
  };

  // Check if settings are configured (beyond just prefix/suffix)
  const hasAdvancedSettings = (opts: FormatterOptions): boolean => {
    return !!(
      opts.textCase && opts.textCase !== 'none' ||
      opts.trimStart && opts.trimStart > 0 ||
      opts.trimEnd && opts.trimEnd > 0 ||
      opts.numberFormat && opts.numberFormat !== 'none' ||
      opts.decimals !== undefined ||
      opts.roundTo && opts.roundTo !== 'none' ||
      opts.padZeros && opts.padZeros > 0 ||
      opts.showSign ||
      opts.dateFormat && opts.dateFormat !== 'none' ||
      opts.timeFormat && opts.timeFormat !== 'none' ||
      opts.hideOnZero ||
      opts.hideOnNull
    );
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

  // Format "time ago" for last fetched
  const getTimeAgo = (timestamp: number | null): string => {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Data Source Header */}
      <div className="p-2 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Database className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-medium truncate block">{dataSourceName}</span>
              {dataSourceSlug && (
                <span className="text-[9px] text-muted-foreground truncate block">
                  /api/{dataSourceSlug}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Refresh button - only show if we have a slug */}
            {dataSourceSlug && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={refreshDataSource}
                      disabled={dataLoading}
                    >
                      {dataLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {dataLoading ? 'Refreshing...' : 'Refresh data'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
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
        </div>

        {/* Last updated & error info */}
        {(dataLastFetched || dataError) && (
          <div className="flex items-center gap-2 text-[9px]">
            {dataError ? (
              <span className="text-destructive">{dataError}</span>
            ) : dataLastFetched ? (
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                Updated {getTimeAgo(dataLastFetched)}
              </span>
            ) : null}
          </div>
        )}

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
        <div className="p-2 pb-8 space-y-1">
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
                const boundElementIds = getBoundElementIds(field.path);
                const fieldBindings = getBindingsForField(field.path);
                const fieldAddress = buildDataAddress(field.path);

                // Get the first binding for settings (when only one element is bound)
                const firstBinding = fieldBindings[0];
                const firstBoundElement = firstBinding ? elements.find(e => e.id === firstBinding.element_id) : null;
                const isTextBinding = firstBoundElement?.element_type === 'text';
                const formatterOptions = (firstBinding?.formatter_options || {}) as FormatterOptions;

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

                        {/* Multi-select Element Dropdown */}
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <button className="h-6 min-w-[120px] max-w-[140px] px-2 flex items-center justify-between gap-1 text-[10px] border border-input rounded-md bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
                              <span className="truncate">
                                {boundElementIds.length === 0 ? (
                                  <span className="text-muted-foreground">Not bound</span>
                                ) : boundElementIds.length === 1 ? (
                                  <span className="flex items-center gap-1">
                                    {getElementIcon(elements.find(e => e.id === boundElementIds[0])?.element_type || '')}
                                    {elements.find(e => e.id === boundElementIds[0])?.name || 'Element'}
                                  </span>
                                ) : (
                                  <span className="text-primary">{boundElementIds.length} elements</span>
                                )}
                              </span>
                              <ChevronDown className="w-3 h-3 opacity-50 flex-shrink-0" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-[180px] p-1"
                            align="end"
                            onCloseAutoFocus={(e) => e.preventDefault()}
                          >
                            <ScrollArea className="h-[200px]">
                              <div className="space-y-0.5 pr-2">
                                {bindableElements.map((element) => {
                                  const isChecked = boundElementIds.includes(element.id);
                                  return (
                                    <button
                                      key={element.id}
                                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-[10px] rounded hover:bg-accent transition-colors ${
                                        isChecked ? 'bg-accent/50' : ''
                                      }`}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleToggleBinding(field.path, element.id);
                                      }}
                                    >
                                      <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center ${
                                        isChecked ? 'bg-primary border-primary' : 'border-input'
                                      }`}>
                                        {isChecked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                                      </div>
                                      {getElementIcon(element.element_type)}
                                      <span className="truncate flex-1 text-left">{element.name}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Prefix/Suffix + Settings button row - show when at least one element is bound */}
                      {fieldBindings.length > 0 && (
                        <div className="flex items-center gap-1 pl-1 flex-wrap">
                          {/* Show bound elements as chips */}
                          {fieldBindings.length > 1 && (
                            <div className="flex flex-wrap gap-0.5 mr-1">
                              {fieldBindings.map((binding) => {
                                const el = elements.find(e => e.id === binding.element_id);
                                return (
                                  <span
                                    key={binding.id}
                                    className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[8px] bg-primary/20 text-primary rounded"
                                    title={el?.name}
                                  >
                                    {getElementIcon(el?.element_type || '')}
                                    <span className="truncate max-w-[40px]">{el?.name}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {/* Prefix/Suffix - only for text bindings with single element */}
                          {isTextBinding && fieldBindings.length === 1 && (
                            <>
                              <Input
                                className="h-5 w-12 text-[10px] px-1"
                                placeholder="prefix"
                                value={formatterOptions.prefix || ''}
                                onChange={(e) => handleUpdateFormatterOptions(firstBinding.id, 'prefix', e.target.value)}
                              />
                              <span className="text-[9px] text-muted-foreground">+</span>
                              <span className="text-[9px] text-primary font-mono truncate max-w-[60px]">{formatFieldValue(value)}</span>
                              <span className="text-[9px] text-muted-foreground">+</span>
                              <Input
                                className="h-5 w-12 text-[10px] px-1"
                                placeholder="suffix"
                                value={formatterOptions.suffix || ''}
                                onChange={(e) => handleUpdateFormatterOptions(firstBinding.id, 'suffix', e.target.value)}
                              />
                            </>
                          )}
                          {/* Settings button - opens modal with all formatting options (only when single binding) */}
                          {fieldBindings.length === 1 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleOpenSettings(firstBinding.id, field.path, field.type)}
                                    className={`h-5 w-5 flex items-center justify-center rounded hover:bg-muted transition-colors ${
                                      hasAdvancedSettings(formatterOptions)
                                        ? 'text-violet-400'
                                        : 'text-muted-foreground'
                                    }`}
                                  >
                                    <Settings className="w-3 h-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-[200px]">
                                  {(() => {
                                    const summary = getSettingsSummary(formatterOptions);
                                    if (summary.length === 0) {
                                      return <span>Format settings</span>;
                                    }
                                    return (
                                      <div className="space-y-0.5">
                                        <div className="font-medium text-violet-400">Active settings:</div>
                                        {summary.map((item, i) => (
                                          <div key={i} className="text-muted-foreground">{item}</div>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
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

      {/* Binding Settings Modal */}
      <BindingSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        fieldPath={settingsFieldPath}
        fieldType={settingsFieldType}
        currentOptions={(settingsBinding?.formatter_options || {}) as FormatterOptions}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

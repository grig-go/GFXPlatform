import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@emergent-platform/ui';
import { Settings, Type, Hash, Calendar, Plus, Trash2 } from 'lucide-react';
import { cn } from '@emergent-platform/ui';

// Text replacement rule (e.g., true -> "Winner", false -> "")
export interface TextReplacement {
  match: string;    // Value to match (case-insensitive)
  replace: string;  // Replacement text
}

export interface FormatterOptions {
  // Common
  prefix?: string;
  suffix?: string;
  hideOnZero?: boolean;
  hideOnNull?: boolean;

  // Text formatting
  textCase?: 'none' | 'uppercase' | 'lowercase' | 'capitalize' | 'titlecase';
  replacements?: TextReplacement[]; // Text replacement rules

  // Trim characters (works for both text and numbers converted to string)
  trimStart?: number; // Number of characters to remove from start
  trimEnd?: number;   // Number of characters to remove from end

  // Number formatting
  numberFormat?: 'none' | 'comma' | 'space' | 'compact';
  decimals?: number;
  decimalSeparator?: '.' | ',';
  roundTo?: 'none' | '1' | '10' | '100' | '1000';
  showSign?: boolean;
  padZeros?: number;

  // Date formatting
  dateFormat?: 'none' | 'dd-mm-yyyy' | 'mm-dd-yyyy' | 'yyyy-mm-dd' |
               'day-month-year' | 'month-day-year' | 'written-full' |
               'written-short' | 'day-month' | 'month-year' | 'weekday-only' |
               'day-only' | 'month-only' | 'year-only' | 'relative';
  timeFormat?: 'none' | '12h' | '24h';
  showSeconds?: boolean;
}

interface BindingSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldPath: string;
  fieldType: 'string' | 'number' | 'boolean' | 'date' | 'unknown';
  currentOptions: FormatterOptions;
  onSave: (options: FormatterOptions) => void;
}

export function BindingSettingsModal({
  open,
  onOpenChange,
  fieldPath,
  fieldType,
  currentOptions,
  onSave,
}: BindingSettingsModalProps) {
  const [options, setOptions] = useState<FormatterOptions>(currentOptions);

  // Reset options when modal opens
  useEffect(() => {
    if (open) {
      setOptions(currentOptions);
    }
  }, [open, currentOptions]);

  const handleSave = () => {
    // Clean up undefined/default values
    const cleanOptions: FormatterOptions = {};

    if (options.prefix) cleanOptions.prefix = options.prefix;
    if (options.suffix) cleanOptions.suffix = options.suffix;
    if (options.hideOnZero) cleanOptions.hideOnZero = options.hideOnZero;
    if (options.hideOnNull) cleanOptions.hideOnNull = options.hideOnNull;

    if (options.textCase && options.textCase !== 'none') cleanOptions.textCase = options.textCase;
    if (options.replacements && options.replacements.length > 0) {
      // Filter out empty replacements
      const validReplacements = options.replacements.filter(r => r.match.trim() !== '');
      if (validReplacements.length > 0) cleanOptions.replacements = validReplacements;
    }
    if (options.trimStart && options.trimStart > 0) cleanOptions.trimStart = options.trimStart;
    if (options.trimEnd && options.trimEnd > 0) cleanOptions.trimEnd = options.trimEnd;

    if (options.numberFormat && options.numberFormat !== 'none') cleanOptions.numberFormat = options.numberFormat;
    // decimals: -1 = whole/trim, 0 = round to whole, >0 = specific decimal places, undefined = unchanged
    if (options.decimals !== undefined) cleanOptions.decimals = options.decimals;
    if (options.decimalSeparator && options.decimalSeparator !== '.') cleanOptions.decimalSeparator = options.decimalSeparator;
    if (options.roundTo && options.roundTo !== 'none') cleanOptions.roundTo = options.roundTo;
    if (options.showSign) cleanOptions.showSign = options.showSign;
    if (options.padZeros && options.padZeros > 0) cleanOptions.padZeros = options.padZeros;

    if (options.dateFormat && options.dateFormat !== 'none') cleanOptions.dateFormat = options.dateFormat;
    if (options.timeFormat && options.timeFormat !== 'none') cleanOptions.timeFormat = options.timeFormat;
    if (options.showSeconds) cleanOptions.showSeconds = options.showSeconds;

    console.log('🔧 BindingSettingsModal.handleSave:', { rawOptions: options, cleanOptions });
    onSave(cleanOptions);
    onOpenChange(false);
  };

  // Determine which tab to show based on field type
  const defaultTab = fieldType === 'number' ? 'number' :
                     fieldType === 'date' ? 'date' : 'text';

  // Check if specific options are changed from defaults
  const isChanged = useMemo(() => ({
    // Text tab
    textCase: !!(options.textCase && options.textCase !== 'none'),
    replacements: !!(options.replacements && options.replacements.some(r => r.match.trim() !== '')),
    trimStart: !!(options.trimStart && options.trimStart > 0),
    trimEnd: !!(options.trimEnd && options.trimEnd > 0),
    // Number tab
    numberFormat: !!(options.numberFormat && options.numberFormat !== 'none'),
    decimals: options.decimals !== undefined,
    decimalSeparator: !!(options.decimalSeparator && options.decimalSeparator !== '.'),
    roundTo: !!(options.roundTo && options.roundTo !== 'none'),
    padZeros: !!(options.padZeros && options.padZeros > 0),
    showSign: !!options.showSign,
    // Date tab
    dateFormat: !!(options.dateFormat && options.dateFormat !== 'none'),
    timeFormat: !!(options.timeFormat && options.timeFormat !== 'none'),
    showSeconds: !!options.showSeconds,
    // Common
    prefix: !!options.prefix,
    suffix: !!options.suffix,
    hideOnZero: !!options.hideOnZero,
    hideOnNull: !!options.hideOnNull,
  }), [options]);

  // Check if any option in a tab is changed
  const hasTextChanges = isChanged.textCase || isChanged.replacements || isChanged.trimStart || isChanged.trimEnd;
  const hasNumberChanges = isChanged.numberFormat || isChanged.decimals || isChanged.decimalSeparator ||
                           isChanged.roundTo || isChanged.padZeros || isChanged.showSign;
  const hasDateChanges = isChanged.dateFormat || isChanged.timeFormat || isChanged.showSeconds;

  // Style for changed labels
  const changedLabelClass = 'text-violet-400';
  const changedTriggerClass = 'ring-1 ring-violet-400/50 border-violet-400/50';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Binding Settings
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-mono">{fieldPath}</p>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text" className={cn("text-xs", hasTextChanges && "text-violet-400 data-[state=active]:text-violet-400")}>
              <Type className="w-3 h-3 mr-1" />
              Text
              {hasTextChanges && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-violet-400" />}
            </TabsTrigger>
            <TabsTrigger value="number" className={cn("text-xs", hasNumberChanges && "text-violet-400 data-[state=active]:text-violet-400")}>
              <Hash className="w-3 h-3 mr-1" />
              Number
              {hasNumberChanges && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-violet-400" />}
            </TabsTrigger>
            <TabsTrigger value="date" className={cn("text-xs", hasDateChanges && "text-violet-400 data-[state=active]:text-violet-400")}>
              <Calendar className="w-3 h-3 mr-1" />
              Date
              {hasDateChanges && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-violet-400" />}
            </TabsTrigger>
          </TabsList>

          {/* Text Formatting Tab */}
          <TabsContent value="text" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className={cn("text-xs font-medium", isChanged.textCase && changedLabelClass)}>Text Case</Label>
              <Select
                value={options.textCase || 'none'}
                onValueChange={(v) => setOptions({ ...options, textCase: v as FormatterOptions['textCase'] })}
              >
                <SelectTrigger className={cn("h-8 text-xs", isChanged.textCase && changedTriggerClass)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No change</SelectItem>
                  <SelectItem value="uppercase">UPPERCASE</SelectItem>
                  <SelectItem value="lowercase">lowercase</SelectItem>
                  <SelectItem value="capitalize">Capitalize first</SelectItem>
                  <SelectItem value="titlecase">Title Case</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Text Replacements */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className={cn("text-xs font-medium", isChanged.replacements && changedLabelClass)}>
                  Text Replacements
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setOptions({
                    ...options,
                    replacements: [...(options.replacements || []), { match: '', replace: '' }]
                  })}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Rule
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Replace specific values with custom text (e.g., true → Winner)
              </p>
              {(options.replacements || []).length > 0 && (
                <div className="space-y-2 mt-2">
                  {(options.replacements || []).map((replacement, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        className={cn("h-7 text-xs flex-1", replacement.match && changedTriggerClass)}
                        placeholder="Match (e.g., true)"
                        value={replacement.match}
                        onChange={(e) => {
                          const newReplacements = [...(options.replacements || [])];
                          newReplacements[index] = { ...newReplacements[index], match: e.target.value };
                          setOptions({ ...options, replacements: newReplacements });
                        }}
                      />
                      <span className="text-xs text-muted-foreground">→</span>
                      <Input
                        className={cn("h-7 text-xs flex-1", replacement.match && changedTriggerClass)}
                        placeholder="Replace with (e.g., Winner)"
                        value={replacement.replace}
                        onChange={(e) => {
                          const newReplacements = [...(options.replacements || [])];
                          newReplacements[index] = { ...newReplacements[index], replace: e.target.value };
                          setOptions({ ...options, replacements: newReplacements });
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => {
                          const newReplacements = (options.replacements || []).filter((_, i) => i !== index);
                          setOptions({ ...options, replacements: newReplacements });
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={cn("text-xs font-medium", isChanged.trimStart && changedLabelClass)}>Trim from Start</Label>
                <Select
                  value={String(options.trimStart ?? 0)}
                  onValueChange={(v) => setOptions({ ...options, trimStart: parseInt(v) })}
                >
                  <SelectTrigger className={cn("h-8 text-xs", isChanged.trimStart && changedTriggerClass)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    <SelectItem value="1">1 character</SelectItem>
                    <SelectItem value="2">2 characters</SelectItem>
                    <SelectItem value="3">3 characters</SelectItem>
                    <SelectItem value="4">4 characters</SelectItem>
                    <SelectItem value="5">5 characters</SelectItem>
                    <SelectItem value="10">10 characters</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={cn("text-xs font-medium", isChanged.trimEnd && changedLabelClass)}>Trim from End</Label>
                <Select
                  value={String(options.trimEnd ?? 0)}
                  onValueChange={(v) => setOptions({ ...options, trimEnd: parseInt(v) })}
                >
                  <SelectTrigger className={cn("h-8 text-xs", isChanged.trimEnd && changedTriggerClass)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    <SelectItem value="1">1 character</SelectItem>
                    <SelectItem value="2">2 characters</SelectItem>
                    <SelectItem value="3">3 characters</SelectItem>
                    <SelectItem value="4">4 characters</SelectItem>
                    <SelectItem value="5">5 characters</SelectItem>
                    <SelectItem value="10">10 characters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Number Formatting Tab */}
          <TabsContent value="number" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={cn("text-xs font-medium", isChanged.numberFormat && changedLabelClass)}>Thousands Separator</Label>
                <Select
                  value={options.numberFormat || 'none'}
                  onValueChange={(v) => setOptions({ ...options, numberFormat: v as FormatterOptions['numberFormat'] })}
                >
                  <SelectTrigger className={cn("h-8 text-xs", isChanged.numberFormat && changedTriggerClass)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (1000000)</SelectItem>
                    <SelectItem value="comma">Comma (1,000,000)</SelectItem>
                    <SelectItem value="space">Space (1 000 000)</SelectItem>
                    <SelectItem value="compact">Compact (1M)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={cn("text-xs font-medium", isChanged.decimals && changedLabelClass)}>Decimal Places</Label>
                <Select
                  value={options.decimals === undefined ? 'unchanged' : options.decimals === -1 ? 'whole' : String(options.decimals)}
                  onValueChange={(v) => {
                    if (v === 'unchanged') {
                      const { decimals, ...rest } = options;
                      setOptions(rest);
                    } else if (v === 'whole') {
                      setOptions({ ...options, decimals: -1 });
                    } else {
                      setOptions({ ...options, decimals: parseInt(v) });
                    }
                  }}
                >
                  <SelectTrigger className={cn("h-8 text-xs", isChanged.decimals && changedTriggerClass)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unchanged">Unchanged</SelectItem>
                    <SelectItem value="whole">Whole (trim decimals)</SelectItem>
                    <SelectItem value="0">0 (round to whole)</SelectItem>
                    <SelectItem value="1">1 (0.0)</SelectItem>
                    <SelectItem value="2">2 (0.00)</SelectItem>
                    <SelectItem value="3">3 (0.000)</SelectItem>
                    <SelectItem value="4">4 (0.0000)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={cn("text-xs font-medium", isChanged.decimalSeparator && changedLabelClass)}>Decimal Separator</Label>
                <Select
                  value={options.decimalSeparator || '.'}
                  onValueChange={(v) => setOptions({ ...options, decimalSeparator: v as '.' | ',' })}
                >
                  <SelectTrigger className={cn("h-8 text-xs", isChanged.decimalSeparator && changedTriggerClass)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=".">Period (1.00)</SelectItem>
                    <SelectItem value=",">Comma (1,00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={cn("text-xs font-medium", isChanged.roundTo && changedLabelClass)}>Round To</Label>
                <Select
                  value={options.roundTo || 'none'}
                  onValueChange={(v) => setOptions({ ...options, roundTo: v as FormatterOptions['roundTo'] })}
                >
                  <SelectTrigger className={cn("h-8 text-xs", isChanged.roundTo && changedTriggerClass)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No rounding</SelectItem>
                    <SelectItem value="1">Nearest 1</SelectItem>
                    <SelectItem value="10">Nearest 10</SelectItem>
                    <SelectItem value="100">Nearest 100</SelectItem>
                    <SelectItem value="1000">Nearest 1,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={cn("text-xs font-medium", isChanged.padZeros && changedLabelClass)}>Pad with Zeros</Label>
                <Select
                  value={String(options.padZeros ?? 0)}
                  onValueChange={(v) => setOptions({ ...options, padZeros: parseInt(v) })}
                >
                  <SelectTrigger className={cn("h-8 text-xs", isChanged.padZeros && changedTriggerClass)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No padding</SelectItem>
                    <SelectItem value="2">2 digits (01)</SelectItem>
                    <SelectItem value="3">3 digits (001)</SelectItem>
                    <SelectItem value="4">4 digits (0001)</SelectItem>
                    <SelectItem value="5">5 digits (00001)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-5">
                <Checkbox
                  id="showSign"
                  checked={options.showSign || false}
                  onCheckedChange={(checked) => setOptions({ ...options, showSign: checked === true })}
                  className={cn(isChanged.showSign && "border-violet-400 data-[state=checked]:bg-violet-500")}
                />
                <Label htmlFor="showSign" className={cn("text-xs cursor-pointer", isChanged.showSign && changedLabelClass)}>
                  Show + for positive
                </Label>
              </div>
            </div>
          </TabsContent>

          {/* Date Formatting Tab */}
          <TabsContent value="date" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className={cn("text-xs font-medium", isChanged.dateFormat && changedLabelClass)}>Date Format</Label>
              <Select
                value={options.dateFormat || 'none'}
                onValueChange={(v) => setOptions({ ...options, dateFormat: v as FormatterOptions['dateFormat'] })}
              >
                <SelectTrigger className={cn("h-8 text-xs", isChanged.dateFormat && changedTriggerClass)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No formatting</SelectItem>
                  <SelectItem value="dd-mm-yyyy">21-12-2025 (DD-MM-YYYY)</SelectItem>
                  <SelectItem value="mm-dd-yyyy">12-21-2025 (MM-DD-YYYY)</SelectItem>
                  <SelectItem value="yyyy-mm-dd">2025-12-21 (YYYY-MM-DD)</SelectItem>
                  <SelectItem value="written-full">December 21, 2025</SelectItem>
                  <SelectItem value="written-short">Dec 21, 2025</SelectItem>
                  <SelectItem value="day-month-year">21 December 2025</SelectItem>
                  <SelectItem value="month-day-year">December 21, 2025</SelectItem>
                  <SelectItem value="day-month">21 December</SelectItem>
                  <SelectItem value="month-year">December 2025</SelectItem>
                  <SelectItem value="weekday-only">Sunday</SelectItem>
                  <SelectItem value="day-only">21</SelectItem>
                  <SelectItem value="month-only">December</SelectItem>
                  <SelectItem value="year-only">2025</SelectItem>
                  <SelectItem value="relative">2 days ago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={cn("text-xs font-medium", isChanged.timeFormat && changedLabelClass)}>Time Format</Label>
                <Select
                  value={options.timeFormat || 'none'}
                  onValueChange={(v) => setOptions({ ...options, timeFormat: v as FormatterOptions['timeFormat'] })}
                >
                  <SelectTrigger className={cn("h-8 text-xs", isChanged.timeFormat && changedTriggerClass)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No time</SelectItem>
                    <SelectItem value="12h">12-hour (3:30 PM)</SelectItem>
                    <SelectItem value="24h">24-hour (15:30)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-5">
                <Checkbox
                  id="showSeconds"
                  checked={options.showSeconds || false}
                  onCheckedChange={(checked) => setOptions({ ...options, showSeconds: checked === true })}
                  disabled={!options.timeFormat || options.timeFormat === 'none'}
                  className={cn(isChanged.showSeconds && "border-violet-400 data-[state=checked]:bg-violet-500")}
                />
                <Label htmlFor="showSeconds" className={cn("text-xs cursor-pointer", isChanged.showSeconds && changedLabelClass)}>
                  Show seconds
                </Label>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Common Options - Always visible */}
        <div className="border-t pt-4 mt-4 space-y-4">
          <h4 className="text-xs font-medium text-muted-foreground">Common Options</h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={cn("text-xs", isChanged.prefix && changedLabelClass)}>Prefix</Label>
              <Input
                className={cn("h-8 text-xs", isChanged.prefix && changedTriggerClass)}
                placeholder="e.g. $, #, Position: "
                value={options.prefix || ''}
                onChange={(e) => setOptions({ ...options, prefix: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className={cn("text-xs", isChanged.suffix && changedLabelClass)}>Suffix</Label>
              <Input
                className={cn("h-8 text-xs", isChanged.suffix && changedTriggerClass)}
                placeholder="e.g. %, pts, mph"
                value={options.suffix || ''}
                onChange={(e) => setOptions({ ...options, suffix: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hideOnZero"
                checked={options.hideOnZero || false}
                onCheckedChange={(checked) => setOptions({ ...options, hideOnZero: checked === true })}
                className={cn(isChanged.hideOnZero && "border-violet-400 data-[state=checked]:bg-violet-500")}
              />
              <Label htmlFor="hideOnZero" className={cn("text-xs cursor-pointer", isChanged.hideOnZero && changedLabelClass)}>
                Hide element when value is 0
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hideOnNull"
                checked={options.hideOnNull || false}
                onCheckedChange={(checked) => setOptions({ ...options, hideOnNull: checked === true })}
                className={cn(isChanged.hideOnNull && "border-violet-400 data-[state=checked]:bg-violet-500")}
              />
              <Label htmlFor="hideOnNull" className={cn("text-xs cursor-pointer", isChanged.hideOnNull && changedLabelClass)}>
                Hide element when empty/null
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Edit2, Check, X } from "lucide-react";
import { FieldOverride, isFieldOverridden, getFieldValue, createOverride, revertOverride } from "../types/election";
import { OverrideIndicator } from "./OverrideIndicator";

interface BaseInlineEditFieldProps<T> {
  field: T | FieldOverride<T>;
  fieldName: string;
  onUpdate: (newField: T | FieldOverride<T>) => void;
  className?: string;
  children: React.ReactNode;
}

interface TextInlineEditFieldProps extends BaseInlineEditFieldProps<string> {
  type: 'text';
}

interface NumberInlineEditFieldProps extends BaseInlineEditFieldProps<number> {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
}

interface SelectInlineEditFieldProps<T extends string> extends BaseInlineEditFieldProps<T> {
  type: 'select';
  options: { value: T; label: string }[];
}

interface BooleanInlineEditFieldProps extends BaseInlineEditFieldProps<boolean> {
  type: 'boolean';
}

type InlineEditFieldProps<T> = 
  | TextInlineEditFieldProps 
  | NumberInlineEditFieldProps 
  | SelectInlineEditFieldProps<T extends string ? T : never>
  | BooleanInlineEditFieldProps;

export function InlineEditField<T>({ 
  field, 
  fieldName, 
  onUpdate, 
  className = "", 
  children, 
  type,
  ...typeSpecificProps 
}: InlineEditFieldProps<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<T>(getFieldValue(field));
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isEditing) {
      if (type === 'select') {
        selectRef.current?.focus();
      } else if (type !== 'boolean') {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
  }, [isEditing, type]);

  const handleSave = () => {
    const currentValue = getFieldValue(field);
    
    if (editValue !== currentValue) {
      // Create override if value changed
      const newField = isFieldOverridden(field) 
        ? { ...field, overriddenValue: editValue, isOverridden: true }
        : createOverride(currentValue, editValue, `Updated ${fieldName}`);
      onUpdate(newField);
    }
    
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(getFieldValue(field));
    setIsEditing(false);
  };

  const handleRevert = () => {
    if (isFieldOverridden(field)) {
      const revertedValue = revertOverride(field);
      //onUpdate(revertedValue);
      onUpdate(null);
      setEditValue(revertedValue as T);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'select') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const renderEditor = () => {
    switch (type) {
      case 'text':
        return (
          <Input
            ref={inputRef}
            value={editValue as string}
            onChange={(e) => setEditValue(e.target.value as T)}
            onKeyDown={handleKeyDown}
            className="h-6 text-sm py-0 px-1"
          />
        );
      
      case 'number':
        const numProps = typeSpecificProps as Omit<NumberInlineEditFieldProps, keyof BaseInlineEditFieldProps<number>>;
        return (
          <Input
            ref={inputRef}
            type="number"
            value={editValue as number}
            onChange={(e) => setEditValue(Number(e.target.value) as T)}
            onKeyDown={handleKeyDown}
            min={numProps.min}
            max={numProps.max}
            step={numProps.step}
            className="h-6 text-sm py-0 px-1 w-20"
          />
        );
      
      case 'select':
        const selectProps = typeSpecificProps as Omit<SelectInlineEditFieldProps<any>, keyof BaseInlineEditFieldProps<any>>;
        return (
          <Select
            value={editValue as string}
            onValueChange={(value) => setEditValue(value as T)}
          >
            <SelectTrigger ref={selectRef} className="h-6 text-sm py-0 px-1 w-auto min-w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selectProps.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={editValue as boolean}
              onCheckedChange={(checked) => setEditValue(checked as T)}
            />
            <span className="text-sm">{fieldName}</span>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        {renderEditor()}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          className="h-6 w-6 p-0"
        >
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="h-6 w-6 p-0"
        >
          <X className="h-3 w-3 text-red-600" />
        </Button>
        <OverrideIndicator field={field} fieldName={fieldName} onRevert={handleRevert} />
      </div>
    );
  }

  return (
    <div 
      className={`group relative inline-flex items-center gap-1 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      <OverrideIndicator field={field} fieldName={fieldName} onRevert={handleRevert} />
      {isHovered && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="h-4 w-4 p-0 opacity-70 hover:opacity-100 ml-1"
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// Convenience components for common field types
export function InlineTextEdit({ field, fieldName, onUpdate, className, children }: Omit<TextInlineEditFieldProps, 'type'>) {
  return (
    <InlineEditField
      field={field}
      fieldName={fieldName}
      onUpdate={onUpdate}
      className={className}
      type="text"
    >
      {children}
    </InlineEditField>
  );
}

export function InlineNumberEdit({ field, fieldName, onUpdate, className, children, min, max, step }: Omit<NumberInlineEditFieldProps, 'type'>) {
  return (
    <InlineEditField
      field={field}
      fieldName={fieldName}
      onUpdate={onUpdate}
      className={className}
      type="number"
      min={min}
      max={max}
      step={step}
    >
      {children}
    </InlineEditField>
  );
}

export function InlineSelectEdit<T extends string>({ field, fieldName, onUpdate, className, children, options }: Omit<SelectInlineEditFieldProps<T>, 'type'>) {
  return (
    <InlineEditField
      field={field}
      fieldName={fieldName}
      onUpdate={onUpdate}
      className={className}
      type="select"
      options={options}
    >
      {children}
    </InlineEditField>
  );
}

export function InlineBooleanEdit({ field, fieldName, onUpdate, className, children }: Omit<BooleanInlineEditFieldProps, 'type'>) {
  return (
    <InlineEditField
      field={field}
      fieldName={fieldName}
      onUpdate={onUpdate}
      className={className}
      type="boolean"
    >
      {children}
    </InlineEditField>
  );
}

import { useState } from "react";
import { Input } from "./ui/input";
import { FieldOverride } from "../types/finance";
import { OverrideIndicator } from "./OverrideIndicator";

interface InlineNumberEditProps {
  field: FieldOverride<number>;
  fieldName: string;
  onUpdate: (newValue: number) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  children: React.ReactNode;
}

export function InlineNumberEdit({
  field,
  fieldName,
  onUpdate,
  min,
  max,
  step = 1,
  precision = 2,
  prefix = '',
  suffix = '',
  className = '',
  children
}: InlineNumberEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(field.value.toString());

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditValue(field.value.toString());
  };

  const handleSave = () => {
    let newValue = parseFloat(editValue);
    
    if (isNaN(newValue)) {
      setEditValue(field.value.toString());
      setIsEditing(false);
      return;
    }

    if (min !== undefined && newValue < min) newValue = min;
    if (max !== undefined && newValue > max) newValue = max;
    
    // Round to specified precision
    newValue = Math.round(newValue * Math.pow(10, precision)) / Math.pow(10, precision);
    
    onUpdate(newValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(field.value.toString());
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="relative inline-block">
        <Input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-24 h-6 px-1 text-sm"
          min={min}
          max={max}
          step={step}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div 
      className={`relative inline-block cursor-pointer hover:bg-accent/50 rounded px-1 transition-colors ${className}`}
      onClick={handleStartEdit}
      title={`Click to edit ${fieldName}`}
    >
      {children}
      <OverrideIndicator isOverridden={field.isOverridden} />
    </div>
  );
}

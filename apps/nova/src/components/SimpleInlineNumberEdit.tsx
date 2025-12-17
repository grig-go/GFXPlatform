import { useState } from "react";
import { Input } from "./ui/input";

interface SimpleInlineNumberEditProps {
  value: number | undefined;
  onSave: (value: number) => void;
  className?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
}

export function SimpleInlineNumberEdit({
  value,
  onSave,
  className = '',
  decimals = 0,
  prefix = '',
  suffix = '',
  min,
  max
}: SimpleInlineNumberEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const safeValue = value ?? 0;

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditValue(safeValue.toString());
  };

  const handleSave = () => {
    let newValue = parseFloat(editValue);
    
    if (isNaN(newValue)) {
      setEditValue(safeValue.toString());
      setIsEditing(false);
      return;
    }

    if (min !== undefined && newValue < min) newValue = min;
    if (max !== undefined && newValue > max) newValue = max;
    
    // Round to specified decimals
    if (decimals > 0) {
      newValue = Math.round(newValue * Math.pow(10, decimals)) / Math.pow(10, decimals);
    } else {
      newValue = Math.round(newValue);
    }
    
    onSave(newValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(safeValue.toString());
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const formatValue = (num: number) => {
    const formatted = decimals > 0 ? num.toFixed(decimals) : num.toString();
    return `${prefix}${formatted}${suffix}`;
  };

  if (isEditing) {
    return (
      <Input
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`w-20 h-6 px-1 text-sm ${className}`}
        min={min}
        max={max}
        step={decimals > 0 ? 1 / Math.pow(10, decimals) : 1}
        autoFocus
      />
    );
  }

  return (
    <span 
      className={`cursor-pointer hover:bg-accent/50 rounded px-1 transition-colors inline-block ${className}`}
      onClick={handleStartEdit}
      title="Click to edit"
    >
      {formatValue(safeValue)}
    </span>
  );
}
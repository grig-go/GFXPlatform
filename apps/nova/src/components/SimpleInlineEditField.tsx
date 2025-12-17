import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Edit2, Check, X } from "lucide-react";

interface SimpleInlineEditFieldProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function SimpleInlineEditField({ 
  value, 
  onSave, 
  className = "",
  placeholder = "",
  disabled = false
}: SimpleInlineEditFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() !== value) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-6 text-sm py-0 px-1"
        />
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
      </div>
    );
  }

  return (
    <div 
      className={`group relative inline-flex items-center gap-1 ${disabled ? 'cursor-default' : 'cursor-pointer'} ${className}`}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !disabled && setIsEditing(true)}
    >
      <span className={`${className} ${!value ? 'text-muted-foreground' : ''} ${disabled ? 'opacity-50' : ''}`}>
        {value || placeholder || 'Click to edit'}
      </span>
      {isHovered && !disabled && (
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 opacity-70 hover:opacity-100 ml-1"
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

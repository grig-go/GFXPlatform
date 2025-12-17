import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Edit2, Check, X, RotateCcw, Building2, Package, BarChart3, Coins } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { saveCustomName } from "../utils/saveCustomName";

interface StockNameEditProps {
  symbol: string;
  originalName: string;
  customName: string | null;
  type: 'EQUITY' | 'ETF' | 'INDEX' | 'CRYPTO';
  className?: string;
  onUpdate?: (customName: string | null) => void;
}

export function StockNameEdit({ 
  symbol,
  originalName, 
  customName, 
  type,
  className = "",
  onUpdate 
}: StockNameEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(customName || originalName);
  const [isHovered, setIsHovered] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localCustomName, setLocalCustomName] = useState(customName);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = localCustomName || originalName;
  const isCustomized = localCustomName !== null;

  const getTypeIcon = () => {
    switch (type) {
      case 'ETF':
        return <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
      case 'INDEX':
        return <BarChart3 className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
      case 'CRYPTO':
        return <Coins className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
      default:
        return <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
    }
  };

  // Sync local state with prop changes
  useEffect(() => {
    setLocalCustomName(customName);
    setEditValue(customName || originalName);
  }, [customName, originalName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmedValue = editValue.trim();
    
    if (!trimmedValue) {
      toast.error("Name cannot be empty");
      return;
    }

    if (trimmedValue === originalName) {
      // If same as original, remove custom name
      await handleRevert();
      return;
    }

    if (trimmedValue === localCustomName) {
      // No change
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      // Create a mutable row object for optimistic update
      const row = {
        symbol,
        custom_name: localCustomName,
        name: originalName
      };

      // Use drop-in pattern with optimistic update
      const savedName = await saveCustomName(row, trimmedValue);
      
      // Update local state
      setLocalCustomName(savedName);
      setEditValue(savedName);
      setIsEditing(false);
      
      // Notify parent component
      onUpdate?.(savedName);
      
      toast.success("Display name updated");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save display name";
      toast.error(errorMessage);
      console.error("Error saving custom name:", error);
      
      // Revert edit value to current state
      setEditValue(localCustomName || originalName);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = async () => {
    if (!isCustomized) return;

    setIsSaving(true);
    try {
      // Create a mutable row object for optimistic update
      const row = {
        symbol,
        custom_name: localCustomName,
        name: originalName
      };

      // Clear custom name (set to null)
      await saveCustomName(row, '');
      
      // Update local state
      setLocalCustomName(null);
      setEditValue(originalName);
      setIsEditing(false);
      
      // Notify parent component
      onUpdate?.(null);
      
      toast.success("Reverted to original name");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to revert name";
      toast.error(errorMessage);
      console.error("Error reverting name:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(localCustomName || originalName);
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
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={originalName}
          disabled={isSaving}
          className="h-7 text-sm py-0 px-2 flex-1 min-w-0"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="h-7 w-7 p-0 flex-shrink-0"
        >
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isSaving}
          className="h-7 w-7 p-0 flex-shrink-0"
        >
          <X className="h-3 w-3 text-red-600" />
        </Button>
        {isCustomized && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRevert}
            disabled={isSaving}
            className="h-7 w-7 p-0 flex-shrink-0"
            title="Revert to original name"
          >
            <RotateCcw className="h-3 w-3 text-amber-600" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`group relative inline-flex items-center gap-1 cursor-pointer min-w-0 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsEditing(true)}
    >
      <span className="flex items-center gap-2 flex-1 min-w-0" title={displayName}>
        {getTypeIcon()}
        <span className="break-words">{displayName}</span>
      </span>
      {isCustomized && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleRevert();
          }}
          disabled={isSaving}
          className="h-4 w-4 p-0 opacity-70 hover:opacity-100 flex-shrink-0"
          title="Revert to original name"
        >
          <RotateCcw className="h-3 w-3 text-amber-600" />
        </Button>
      )}
      {isHovered && !isCustomized && (
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 opacity-70 hover:opacity-100 ml-1 flex-shrink-0"
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

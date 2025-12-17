import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { RotateCcw } from "lucide-react";
import { FieldOverride, isFieldOverridden } from "../types/election";

interface OverrideIndicatorProps<T> {
  field: T | FieldOverride<T>;
  fieldName: string;
  onRevert?: () => void;
  className?: string;
}

export function OverrideIndicator<T>({ 
  field, 
  fieldName, 
  onRevert, 
  className = "" 
}: OverrideIndicatorProps<T>) {
  
  if (!isFieldOverridden(field)) {
    return null;
  }

  if (!field.isOverridden) {
    return null;
  }

  if (!onRevert) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRevert();
            }}
            className={`h-4 w-4 p-0 opacity-70 hover:opacity-100 flex-shrink-0 ${className}`}
            title={`Revert ${fieldName} to original value`}
          >
            <RotateCcw className="h-3 w-3 text-amber-600" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Revert {fieldName} to original value</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Trash2,
  Edit2,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner@2.0.3";

interface FinanceCardProps {
  id: string;
  symbol: string;
  name: string;
  customName?: string | null;
  type: "EQUITY" | "ETF" | "INDEX" | "CRYPTO";
  price: number;
  change: number;
  changePct: number;
  image?: string;
  onDelete: () => void;
  onCustomNameSave: (customName: string | null) => void;
}

export function FinanceCard({
  id,
  symbol,
  name,
  customName,
  type,
  price,
  change,
  changePct,
  image,
  onDelete,
  onCustomNameSave,
}: FinanceCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(customName || name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const displayName = customName || name;
  const isPositive = changePct > 0;
  const isNegative = changePct < 0;

  const formatPrice = (value: number) => {
    if (value >= 1) {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
    }
  };

  const formatChange = (value: number) => {
    return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
  };

  const formatChangePct = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  const handleSave = () => {
    if (editValue.trim() === name) {
      // Clear custom name if it's the same as original
      onCustomNameSave(null);
    } else if (editValue.trim() !== displayName) {
      onCustomNameSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(customName || name);
    setIsEditing(false);
  };

  const handleClearCustomName = () => {
    setEditValue(name);
    onCustomNameSave(null);
  };

  const typeColors = {
    EQUITY: "bg-blue-100 text-blue-700 border-blue-200",
    ETF: "bg-green-100 text-green-700 border-green-200",
    INDEX: "bg-purple-100 text-purple-700 border-purple-200",
    CRYPTO: "bg-orange-100 text-orange-700 border-orange-200",
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 flex items-start gap-3">
              {image && (
                <img
                  src={image}
                  alt={displayName}
                  className="w-10 h-10 rounded-full flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-8"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave();
                        if (e.key === "Escape") handleCancel();
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={handleSave}
                        className="h-7"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                        className="h-7"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                      {customName && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleClearCustomName}
                          className="h-7 text-amber-600"
                        >
                          Clear Override
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-lg mb-1 flex items-center gap-2">
                      {displayName}
                      {customName && (
                        <span className="text-xs text-amber-600" title="Custom name">
                          ✎
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{symbol}</p>
                    {customName && (
                      <p className="text-xs text-muted-foreground italic">
                        Original: {name}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={typeColors[type]}>{type}</Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Name
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Price */}
            <div>
              <p className="text-3xl">{formatPrice(price)}</p>
            </div>

            {/* Change */}
            <div className="flex items-center gap-2">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : isNegative ? (
                <TrendingDown className="w-4 h-4 text-red-600" />
              ) : null}
              <div
                className={
                  isPositive
                    ? "text-green-600"
                    : isNegative
                    ? "text-red-600"
                    : "text-muted-foreground"
                }
              >
                <span className="font-medium">{formatChangePct(changePct)}</span>
                <span className="text-sm ml-2">({formatChange(change)})</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{displayName}</strong> ({symbol}) from your
              watchlist? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import React, { useState } from "react";
import { FinanceSecurityWithSnapshot, FieldOverride } from "../types/finance";
import { SimpleInlineEditField } from "./SimpleInlineEditField";
import { InlineEditField } from "./InlineEditField";
import { InlineNumberEdit } from "./InlineNumberEdit";
import { OverrideIndicator } from "./OverrideIndicator";
import { SecurityNewsContent } from "./SecurityNews";
import { SecurityChartDialog } from "./SecurityChartDialog";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { TrendingUp, TrendingDown, BarChart3, Coins, Building2, Star, Trash2, MoreHorizontal, CheckCircle, XCircle, Newspaper, Brain, Package, LineChart } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { motion } from "framer-motion";

interface SecurityCardProps {
  security: FinanceSecurityWithSnapshot;
  onUpdate: (security: FinanceSecurityWithSnapshot) => void;
  onDelete: (securityId: string) => void;
  onSaveCustomName?: (symbol: string, customName: string, type: string) => Promise<void>;
  onShowAIInsights?: (securityId: string) => void;
}

export function SecurityCard({ security, onUpdate, onDelete, onSaveCustomName, onShowAIInsights }: SecurityCardProps) {
  const { security: sec, snapshot, analystRating, cryptoProfile } = security;
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [isAIInsightsOpen, setIsAIInsightsOpen] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSavingCustomName, setIsSavingCustomName] = useState(false);

  const getFieldValue = <T,>(field: FieldOverride<T> | undefined): T | undefined => field?.value;

  const updateSecurityField = <K extends keyof typeof sec>(
    field: K,
    newValue: any
  ) => {
    if (typeof sec[field] === 'object' && sec[field] !== null && 'value' in (sec[field] as any)) {
      const currentField = sec[field] as FieldOverride<any>;
      const updatedSecurity = {
        ...security,
        security: {
          ...sec,
          [field]: {
            ...currentField,
            value: newValue,
            isOverridden: newValue !== currentField.original,
          },
        },
      };
      onUpdate(updatedSecurity);
    }
  };

  const updateSnapshotField = <K extends keyof typeof snapshot>(
    field: K,
    newValue: any
  ) => {
    if (typeof snapshot[field] === 'object' && snapshot[field] !== null && 'value' in (snapshot[field] as any)) {
      const currentField = snapshot[field] as FieldOverride<any>;
      const updatedSecurity = {
        ...security,
        snapshot: {
          ...snapshot,
          [field]: {
            ...currentField,
            value: newValue,
            isOverridden: newValue !== currentField.original,
          },
        },
      };
      onUpdate(updatedSecurity);
    }
  };

  const updateAnalystField = <K extends keyof NonNullable<typeof analystRating>>(
    field: K,
    newValue: any
  ) => {
    if (!analystRating) return;
    
    if (typeof analystRating[field] === 'object' && analystRating[field] !== null && 'value' in (analystRating[field] as any)) {
      const currentField = analystRating[field] as FieldOverride<any>;
      const updatedSecurity = {
        ...security,
        analystRating: {
          ...analystRating,
          [field]: {
            ...currentField,
            value: newValue,
            isOverridden: newValue !== currentField.original,
          },
        },
      };
      onUpdate(updatedSecurity);
    }
  };

  const revertSecurityField = <K extends keyof typeof sec>(field: K) => {
    if (typeof sec[field] === 'object' && sec[field] !== null && 'original' in (sec[field] as any)) {
      const currentField = sec[field] as FieldOverride<any>;
      const updatedSecurity = {
        ...security,
        security: {
          ...sec,
          [field]: currentField.original,
        },
      };
      onUpdate(updatedSecurity);
    }
  };

  const revertSnapshotField = <K extends keyof typeof snapshot>(field: K) => {
    if (typeof snapshot[field] === 'object' && snapshot[field] !== null && 'original' in (snapshot[field] as any)) {
      const currentField = snapshot[field] as FieldOverride<any>;
      const updatedSecurity = {
        ...security,
        snapshot: {
          ...snapshot,
          [field]: currentField.original,
        },
      };
      onUpdate(updatedSecurity);
    }
  };

  const revertAnalystField = <K extends keyof NonNullable<typeof analystRating>>(field: K) => {
    if (!analystRating) return;
    
    if (typeof analystRating[field] === 'object' && analystRating[field] !== null && 'original' in (analystRating[field] as any)) {
      const currentField = analystRating[field] as FieldOverride<any>;
      const updatedSecurity = {
        ...security,
        analystRating: {
          ...analystRating,
          [field]: currentField.original,
        },
      };
      onUpdate(updatedSecurity);
    }
  };

  const updateStatus = (newStatus: 'active' | 'inactive') => {
    const currentStatus = sec.status || { value: 'active', original: 'active', isOverridden: false };
    const updatedSecurity = {
      ...security,
      security: {
        ...sec,
        status: {
          ...currentStatus,
          value: newStatus,
          isOverridden: newStatus !== currentStatus.original,
        }
      }
    };
    onUpdate(updatedSecurity);
  };

  const handleShowNews = () => {
    setIsNewsOpen(true);
  };

  const handleShowAIInsights = () => {
    if (onShowAIInsights) {
      // Call the parent handler to open the main AI Insights dialog
      onShowAIInsights(sec.id);
    } else {
      // Fallback to local dialog
      setIsAIInsightsOpen(true);
      toast.info("AI Insights feature coming soon!");
    }
  };

  const handleShowChart = () => {
    setIsChartOpen(true);
  };

  const handleShowDeleteDialog = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleSaveCustomName = async (newName: string) => {
    if (!onSaveCustomName || !sec.symbol) return;
    
    setIsSavingCustomName(true);
    try {
      // Save to backend database (alpaca_stocks.custom_name column)
      await onSaveCustomName(sec.symbol, newName, sec.type);
      
      // Update local state optimistically for immediate UI feedback
      const updatedSecurity = {
        ...security,
        security: {
          ...sec,
          name: {
            value: newName || sec.name.original || sec.name.value,
            original: sec.name.original || sec.name.value,
            isOverridden: !!newName,
          },
        },
      };
      onUpdate(updatedSecurity);
      
      toast.success(`Custom name ${newName ? 'saved' : 'cleared'} successfully`);
    } catch (error) {
      console.error('Error saving custom name:', error);
      toast.error('Failed to save custom name');
    } finally {
      setIsSavingCustomName(false);
    }
  };

  const handleRevertCustomName = async () => {
    if (!onSaveCustomName || !sec.symbol) return;
    
    try {
      // Clear custom_name in database (set to null)
      await onSaveCustomName(sec.symbol, '', sec.type);
      
      // Revert to original name in local state
      const updatedSecurity = {
        ...security,
        security: {
          ...sec,
          name: {
            value: sec.name.original || sec.name.value,
            original: sec.name.original,
            isOverridden: false,
          },
        },
      };
      onUpdate(updatedSecurity);
      
      toast.success('Reverted to original name');
    } catch (error) {
      console.error('Error reverting custom name:', error);
      toast.error('Failed to revert name');
    }
  };

  const getTypeIcon = () => {
    switch (sec.type) {
      case 'INDEX':
        return <BarChart3 className="w-4 h-4" />;
      case 'CRYPTO':
        return <Coins className="w-4 h-4" />;
      case 'EQUITY':
        return <Building2 className="w-4 h-4" />;
      case 'ETF':
        return <Package className="w-4 h-4" />;
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getTypeColor = () => {
    switch (sec.type) {
      case 'INDEX':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'CRYPTO':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      case 'EQUITY':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    }
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-green-600 dark:text-green-400';
    if (value < 0) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null || isNaN(price)) {
      return 'N/A';
    }
    if (sec.type === 'CRYPTO' && price < 1) {
      return price.toFixed(4);
    }
    return price.toLocaleString(undefined, { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
  };

  const formatChange = (change: number | undefined, isPercent = false) => {
    if (change === undefined || change === null || isNaN(change)) {
      return 'N/A';
    }
    const formatted = isPercent 
      ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`
      : `${change >= 0 ? '+' : ''}${change.toFixed(2)}`;
    return formatted;
  };

  // Safety check: if no snapshot data, show minimal card
  if (!snapshot) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getTypeColor()}>
                {getTypeIcon()}
                <span className="ml-1">{sec.type}</span>
              </Badge>
              <h3>{sec.name.value}</h3>
            </div>
            <p className="text-sm text-muted-foreground">No snapshot data available</p>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  const changeValue = getFieldValue(snapshot.changePct) || 0;
  const isPositive = changeValue > 0;
  const isNegative = changeValue < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 group">
        {/* Animated background gradient on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          initial={false}
        />
        
        {/* Pulse animation for significant changes */}
        {Math.abs(changeValue) > 5 && (
          <motion.div
            className={`absolute inset-0 ${isPositive ? 'bg-green-500/10' : 'bg-red-500/10'}`}
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
        
        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {cryptoProfile && (
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20 transition-all group-hover:ring-primary/40">
                    <AvatarImage src={cryptoProfile.cgImage} alt={cryptoProfile.cgSymbol} />
                    <AvatarFallback>
                      {sec.symbol?.slice(0, 2) || sec.name.value.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getTypeIcon()}
                  <SimpleInlineEditField
                    value={getFieldValue(sec.name)}
                    onSave={handleSaveCustomName}
                    disabled={isSavingCustomName}
                  />
                  <OverrideIndicator 
                    field={sec.name} 
                    fieldName="Name" 
                    onRevert={handleRevertCustomName} 
                  />
                </div>
                {sec.symbol && (
                  <p className="text-sm text-muted-foreground font-mono">{sec.symbol}</p>
                )}
                {cryptoProfile && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Rank #{cryptoProfile.cgRank}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`gap-1 ${getTypeColor()}`}>
                {getTypeIcon()}
                {sec.type}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 relative z-10">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => updateStatus('active')}
                    className={(getFieldValue(sec.status) || 'active') === 'active' ? 'bg-accent' : ''}
                  >
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Active
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleShowNews}
                  >
                    <Newspaper className="w-4 h-4 mr-2 text-blue-600" />
                    News
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleShowAIInsights}
                  >
                    <Brain className="w-4 h-4 mr-2 text-purple-600" />
                    AI Insights
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleShowChart}
                  >
                    <LineChart className="w-4 h-4 mr-2 text-blue-600" />
                    Chart
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleShowDeleteDialog}
                    className="text-destructive cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Price */}
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Price</span>
            <div className="flex items-center gap-1">
              <InlineNumberEdit
                field={snapshot.last}
                fieldName="Last Price"
                onUpdate={(newPrice) => updateSnapshotField('last', newPrice)}
                min={0}
                step={sec.type === 'CRYPTO' ? 0.0001 : 0.01}
              >
                <span className="text-2xl font-semibold">
                  ${formatPrice(getFieldValue(snapshot.last))}
                </span>
              </InlineNumberEdit>
              <OverrideIndicator field={snapshot.last} fieldName="Last Price" onRevert={() => revertSnapshotField('last')} />
            </div>
          </div>

          {/* Change */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Change</span>
            <div className="flex items-center gap-2">
              <InlineNumberEdit
                field={snapshot.changePct}
                fieldName="Change %"
                onUpdate={(newPct) => updateSnapshotField('changePct', newPct)}
                step={0.01}
              >
                <div className={`flex items-center gap-1 ${getChangeColor(getFieldValue(snapshot.changePct))}`}>
                  {getFieldValue(snapshot.changePct) > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : getFieldValue(snapshot.changePct) < 0 ? (
                    <TrendingDown className="w-4 h-4" />
                  ) : null}
                  <span className="font-semibold">
                    {formatChange(getFieldValue(snapshot.changePct), true)}
                  </span>
                </div>
              </InlineNumberEdit>
              <OverrideIndicator field={snapshot.changePct} fieldName="Change %" onRevert={() => revertSnapshotField('changePct')} />
              
              <InlineNumberEdit
                field={snapshot.changeAbs}
                fieldName="Change $"
                onUpdate={(newAbs) => updateSnapshotField('changeAbs', newAbs)}
                step={0.01}
              >
                <span className={`text-sm ${getChangeColor(getFieldValue(snapshot.changeAbs))}`}>
                  ({formatChange(getFieldValue(snapshot.changeAbs))})
                </span>
              </InlineNumberEdit>
              <OverrideIndicator field={snapshot.changeAbs} fieldName="Change Abs" onRevert={() => revertSnapshotField('changeAbs')} />
            </div>
          </div>

          {/* Performance Metrics */}
          {(snapshot.change1wPct || snapshot.change1yPct) && (
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Performance</h4>
              <div className="grid grid-cols-2 gap-3">
                {snapshot.change1wPct && (
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground mb-1">1W</span>
                    <span className={`font-semibold ${getChangeColor(getFieldValue(snapshot.change1wPct))}`}>
                      {formatChange(getFieldValue(snapshot.change1wPct), true)}
                    </span>
                  </div>
                )}
                {snapshot.change1yPct && (
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground mb-1">1Y</span>
                    <span className={`font-semibold ${getChangeColor(getFieldValue(snapshot.change1yPct))}`}>
                      {formatChange(getFieldValue(snapshot.change1yPct), true)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analyst Rating (for stocks) */}
          {analystRating && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <h4 className="text-sm font-medium">Analyst Rating</h4>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rating</span>
                  <div className="flex items-center gap-1">
                    <InlineEditField
                      field={analystRating.rating}
                      fieldName="Rating"
                      onUpdate={(newRating) => updateAnalystField('rating', newRating)}
                    >
                      <span className="font-medium">{getFieldValue(analystRating.rating)}</span>
                    </InlineEditField>
                    <OverrideIndicator field={analystRating.rating} fieldName="Rating" onRevert={() => revertAnalystField('rating')} />
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target</span>
                  <div className="flex items-center gap-1">
                    <InlineNumberEdit
                      field={analystRating.targetPrice}
                      fieldName="Target Price"
                      onUpdate={(newTarget) => updateAnalystField('targetPrice', newTarget)}
                      min={0}
                      step={0.01}
                    >
                      <span className="font-medium">
                        ${getFieldValue(analystRating.targetPrice).toFixed(2)}
                      </span>
                    </InlineNumberEdit>
                    <OverrideIndicator field={analystRating.targetPrice} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 52-Week Range */}
          {(snapshot.yearHigh || snapshot.yearLow) && (
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">52-Week Range</h4>
              <div className="grid grid-cols-2 gap-3">
                {snapshot.yearLow && (
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground mb-1">Low</span>
                    <span className="font-semibold">
                      ${formatPrice(getFieldValue(snapshot.yearLow))}
                    </span>
                  </div>
                )}
                {snapshot.yearHigh && (
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground mb-1">High</span>
                    <span className="font-semibold">
                      ${formatPrice(getFieldValue(snapshot.yearHigh))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>

        {/* News Dialog */}
        <Dialog open={isNewsOpen} onOpenChange={setIsNewsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Newspaper className="w-5 h-5" />
                News for {getFieldValue(sec.name)}
              </DialogTitle>
              <DialogDescription>
                Latest news and updates for {sec.symbol || sec.uniqueKey}
              </DialogDescription>
            </DialogHeader>
            <SecurityNewsContent 
              symbol={sec.symbol || sec.uniqueKey} 
              name={getFieldValue(sec.name)} 
            />
          </DialogContent>
        </Dialog>

        {/* AI Insights Dialog */}
        <Dialog open={isAIInsightsOpen} onOpenChange={setIsAIInsightsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Insights for {getFieldValue(sec.name)}
              </DialogTitle>
              <DialogDescription>
                AI-powered analysis and insights for {sec.symbol || sec.uniqueKey}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-center py-8">
                <Brain className="w-12 h-12 mx-auto mb-4 text-purple-500" />
                <h3 className="text-lg font-semibold mb-2">AI Insights Coming Soon</h3>
                <p className="text-muted-foreground">
                  Advanced AI-powered analysis, sentiment tracking, and predictive insights 
                  will be available here soon.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Chart Dialog */}
        <SecurityChartDialog
          open={isChartOpen}
          onOpenChange={setIsChartOpen}
          symbol={sec.symbol || sec.uniqueKey}
          name={getFieldValue(sec.name)}
          type={sec.type}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Security</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {getFieldValue(sec.name)} ({sec.symbol})?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  onDelete(sec.id);
                  setIsDeleteDialogOpen(false);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </motion.div>
  );
}
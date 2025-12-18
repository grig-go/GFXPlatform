import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ScrollArea,
  cn,
} from '@emergent-platform/ui';
import { Database, Check } from 'lucide-react';
import { useDesignerStore } from '@/stores/designerStore';
import {
  getCategories,
  getDataSourcesForCategory,
  type DataSourceConfig,
} from '@/data/sampleDataSources';

interface AddDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDataModal({ open, onOpenChange }: AddDataModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDataSource, setSelectedDataSource] = useState<DataSourceConfig | null>(null);

  const { setDataSource, dataSourceId } = useDesignerStore();

  const categories = useMemo(() => getCategories(), []);

  const dataSources = useMemo(() => {
    if (!selectedCategory) return [];
    return getDataSourcesForCategory(selectedCategory);
  }, [selectedCategory]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedDataSource(null);
  };

  const handleApply = () => {
    if (selectedDataSource) {
      setDataSource(
        selectedDataSource.id,
        selectedDataSource.name,
        selectedDataSource.data,
        selectedDataSource.displayField
      );
      onOpenChange(false);
      // Reset selections for next time
      setSelectedCategory('');
      setSelectedDataSource(null);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedCategory('');
    setSelectedDataSource(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Add Data Source
          </DialogTitle>
          <DialogDescription>
            Connect a data source from Nova to bind template elements to dynamic data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Category Selection */}
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data Source List */}
          {dataSources.length > 0 && (
            <div className="grid gap-2">
              <Label>Available Data Sources</Label>
              <ScrollArea className="h-[200px] rounded-md border">
                <div className="p-2 space-y-1">
                  {dataSources.map((ds) => (
                    <button
                      key={ds.id}
                      onClick={() => setSelectedDataSource(ds)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-md text-left transition-colors",
                        "hover:bg-accent",
                        selectedDataSource?.id === ds.id
                          ? "bg-accent border border-primary"
                          : "bg-muted/50"
                      )}
                    >
                      <div>
                        <div className="font-medium text-sm">{ds.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {ds.type} • {ds.data.length} records
                          {ds.subCategory && ` • ${ds.subCategory}`}
                        </div>
                      </div>
                      {selectedDataSource?.id === ds.id && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                      {dataSourceId === ds.id && selectedDataSource?.id !== ds.id && (
                        <span className="text-xs text-muted-foreground">Currently connected</span>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Preview of selected data source */}
          {selectedDataSource && (
            <div className="grid gap-2">
              <Label>Preview (First Record)</Label>
              <ScrollArea className="h-[120px] rounded-md border bg-muted/30">
                <pre className="p-3 text-xs font-mono">
                  {JSON.stringify(selectedDataSource.data[0], null, 2)}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!selectedDataSource}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

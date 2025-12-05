import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { TableColumn, TableRow } from '@/types/database';

interface TableEditorProps {
  columns: TableColumn[];
  data: TableRow[];
  showHeader?: boolean;
  striped?: boolean;
  bordered?: boolean;
  compact?: boolean;
  onColumnsChange: (columns: TableColumn[]) => void;
  onDataChange: (data: TableRow[]) => void;
  onOptionsChange: (options: {
    showHeader?: boolean;
    striped?: boolean;
    bordered?: boolean;
    compact?: boolean;
    headerBackgroundColor?: string;
    headerTextColor?: string;
    rowBackgroundColor?: string;
    rowTextColor?: string;
    stripedRowBackgroundColor?: string;
    borderColor?: string;
    showRowBorders?: boolean;
    showColumnBorders?: boolean;
    showOuterBorder?: boolean;
    solidBackgroundColor?: string;
  }) => void;
}

export function TableEditor({
  columns,
  data,
  showHeader = true,
  striped = false,
  bordered = false,
  compact = false,
  headerBackgroundColor,
  headerTextColor,
  rowBackgroundColor,
  rowTextColor,
  stripedRowBackgroundColor,
  borderColor,
  showRowBorders,
  showColumnBorders,
  showOuterBorder,
  solidBackgroundColor,
  onColumnsChange,
  onDataChange,
  onOptionsChange,
}: TableEditorProps & {
  headerBackgroundColor?: string;
  headerTextColor?: string;
  rowBackgroundColor?: string;
  rowTextColor?: string;
  stripedRowBackgroundColor?: string;
  borderColor?: string;
  showRowBorders?: boolean;
  showColumnBorders?: boolean;
  showOuterBorder?: boolean;
  solidBackgroundColor?: string;
}) {
  const [activeTab, setActiveTab] = useState<'columns' | 'data' | 'options'>('columns');

  const addColumn = () => {
    const newColumn: TableColumn = {
      id: `col-${Date.now()}`,
      header: `Column ${columns.length + 1}`,
      accessorKey: `col${columns.length + 1}`,
      width: 150,
      align: 'left',
      format: 'text',
    };
    onColumnsChange([...columns, newColumn]);
  };

  const updateColumn = (index: number, updates: Partial<TableColumn>) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], ...updates };
    onColumnsChange(newColumns);
  };

  const deleteColumn = (index: number) => {
    const newColumns = columns.filter((_, i) => i !== index);
    onColumnsChange(newColumns);
    // Also remove this column's data from all rows
    const columnId = columns[index].id;
    const newData = data.map((row) => {
      const { [columnId]: _, ...rest } = row;
      return rest;
    });
    onDataChange(newData);
  };

  const addRow = () => {
    const newRow: TableRow = {
      id: `row-${Date.now()}`,
      ...columns.reduce((acc, col) => {
        acc[col.accessorKey || col.id] = '';
        return acc;
      }, {} as Record<string, string | number>),
    };
    onDataChange([...data, newRow]);
  };

  const updateRow = (index: number, updates: Partial<TableRow>) => {
    const newData = [...data];
    newData[index] = { ...newData[index], ...updates };
    onDataChange(newData);
  };

  const deleteRow = (index: number) => {
    onDataChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab('columns')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === 'columns'
              ? 'border-b-2 border-violet-500 text-violet-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Columns
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === 'data'
              ? 'border-b-2 border-violet-500 text-violet-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Data
        </button>
        <button
          onClick={() => setActiveTab('options')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === 'options'
              ? 'border-b-2 border-violet-500 text-violet-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Options
        </button>
      </div>

      {/* Columns Tab */}
      {activeTab === 'columns' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">Table Columns</span>
            <Button variant="outline" size="sm" onClick={addColumn} className="h-7 text-xs">
              <Plus className="w-3 h-3 mr-1" />
              Add Column
            </Button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {columns.map((column, index) => (
              <div key={column.id} className="p-2 border border-border rounded bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <Input
                    value={column.header}
                    onChange={(e) => updateColumn(index, { header: e.target.value })}
                    placeholder="Column Header"
                    className="flex-1 h-7 text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => deleteColumn(index)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Width</label>
                    <Input
                      type="number"
                      value={column.width || 150}
                      onChange={(e) => updateColumn(index, { width: parseFloat(e.target.value) || 150 })}
                      className="h-7 text-xs"
                      min={50}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Align</label>
                    <select
                      value={column.align || 'left'}
                      onChange={(e) => updateColumn(index, { align: e.target.value as 'left' | 'center' | 'right' })}
                      className="w-full h-7 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Format</label>
                    <select
                      value={column.format || 'text'}
                      onChange={(e) => updateColumn(index, { format: e.target.value as any })}
                      className="w-full h-7 text-xs bg-muted border border-input rounded-md px-2 cursor-pointer"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="currency">Currency</option>
                      <option value="percentage">Percentage</option>
                      <option value="date">Date</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Accessor Key</label>
                    <Input
                      value={column.accessorKey || column.id}
                      onChange={(e) => updateColumn(index, { accessorKey: e.target.value })}
                      placeholder="accessorKey"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Tab */}
      {activeTab === 'data' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">Table Data</span>
            <Button variant="outline" size="sm" onClick={addRow} className="h-7 text-xs">
              <Plus className="w-3 h-3 mr-1" />
              Add Row
            </Button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.map((row, rowIndex) => (
              <div key={row.id} className="p-2 border border-border rounded bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground w-8">#{rowIndex + 1}</span>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    {columns.map((column) => {
                      const accessorKey = column.accessorKey || column.id;
                      return (
                        <div key={column.id}>
                          <label className="text-[10px] text-muted-foreground mb-1 block">
                            {column.header}
                          </label>
                          <Input
                            value={String(row[accessorKey] || '')}
                            onChange={(e) => {
                              const value = column.format === 'number' || column.format === 'percentage'
                                ? parseFloat(e.target.value) || 0
                                : e.target.value;
                              updateRow(rowIndex, { [accessorKey]: value });
                            }}
                            type={column.format === 'number' || column.format === 'percentage' ? 'number' : 'text'}
                            className="h-7 text-xs"
                            placeholder={column.header}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => deleteRow(rowIndex)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Options Tab */}
      {activeTab === 'options' && (
        <div className="space-y-4">
          {/* Basic Options */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Display
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={showHeader}
                onChange={(e) => onOptionsChange({ showHeader: e.target.checked })}
                className="rounded"
              />
              <span>Show Header</span>
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={striped}
                onChange={(e) => onOptionsChange({ striped: e.target.checked })}
                className="rounded"
              />
              <span>Striped Rows</span>
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={compact}
                onChange={(e) => onOptionsChange({ compact: e.target.checked })}
                className="rounded"
              />
              <span>Compact Mode</span>
            </label>
          </div>

          <div className="border-t border-border pt-3" />

          {/* Border Controls */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Outlines
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={bordered}
                onChange={(e) => onOptionsChange({ 
                  bordered: e.target.checked,
                  showRowBorders: e.target.checked,
                  showColumnBorders: e.target.checked,
                  showOuterBorder: e.target.checked
                })}
                className="rounded"
              />
              <span>All Borders</span>
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={showRowBorders ?? bordered}
                onChange={(e) => onOptionsChange({ showRowBorders: e.target.checked })}
                className="rounded"
              />
              <span>Row Borders</span>
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={showColumnBorders ?? bordered}
                onChange={(e) => onOptionsChange({ showColumnBorders: e.target.checked })}
                className="rounded"
              />
              <span>Column Borders</span>
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={showOuterBorder ?? bordered}
                onChange={(e) => onOptionsChange({ showOuterBorder: e.target.checked })}
                className="rounded"
              />
              <span>Outer Border</span>
            </label>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Border Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={borderColor || '#FFFFFF'}
                  onChange={(e) => onOptionsChange({ borderColor: e.target.value })}
                  className="h-7 w-16 rounded border border-input cursor-pointer"
                />
                <Input
                  type="text"
                  value={borderColor || '#FFFFFF'}
                  onChange={(e) => onOptionsChange({ borderColor: e.target.value })}
                  placeholder="#FFFFFF"
                  className="flex-1 h-7 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-3" />

          {/* Color Controls */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Colors
            </div>
            
            {/* Header Colors */}
            {showHeader && (
              <div className="space-y-2 pl-2 border-l-2 border-violet-500/30">
                <div className="text-[10px] text-muted-foreground uppercase">Header</div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value="#000000"
                      onChange={(e) => onOptionsChange({ headerBackgroundColor: e.target.value })}
                      className="h-7 w-16 rounded border border-input cursor-pointer"
                    />
                    <Input
                      type="text"
                      value="#000000"
                      onChange={(e) => onOptionsChange({ headerBackgroundColor: e.target.value })}
                      placeholder="#000000"
                      className="flex-1 h-7 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Text</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value="#FFFFFF"
                      onChange={(e) => onOptionsChange({ headerTextColor: e.target.value })}
                      className="h-7 w-16 rounded border border-input cursor-pointer"
                    />
                    <Input
                      type="text"
                      value="#FFFFFF"
                      onChange={(e) => onOptionsChange({ headerTextColor: e.target.value })}
                      placeholder="#FFFFFF"
                      className="flex-1 h-7 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Row Colors */}
            <div className="space-y-2 pl-2 border-l-2 border-violet-500/30">
              <div className="text-[10px] text-muted-foreground uppercase">Rows</div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={rowBackgroundColor || 'transparent'}
                    onChange={(e) => onOptionsChange({ rowBackgroundColor: e.target.value })}
                    className="h-7 w-16 rounded border border-input cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={rowBackgroundColor || 'transparent'}
                    onChange={(e) => onOptionsChange({ rowBackgroundColor: e.target.value })}
                    placeholder="transparent"
                    className="flex-1 h-7 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Text</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={rowTextColor || '#FFFFFF'}
                    onChange={(e) => onOptionsChange({ rowTextColor: e.target.value })}
                    className="h-7 w-16 rounded border border-input cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={rowTextColor || '#FFFFFF'}
                    onChange={(e) => onOptionsChange({ rowTextColor: e.target.value })}
                    placeholder="#FFFFFF"
                    className="flex-1 h-7 text-xs"
                  />
                </div>
              </div>
              {striped && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Striped Row Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={stripedRowBackgroundColor || 'rgba(255,255,255,0.05)'}
                      onChange={(e) => onOptionsChange({ stripedRowBackgroundColor: e.target.value })}
                      className="h-7 w-16 rounded border border-input cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={stripedRowBackgroundColor || 'rgba(255,255,255,0.05)'}
                      onChange={(e) => onOptionsChange({ stripedRowBackgroundColor: e.target.value })}
                      placeholder="rgba(255,255,255,0.05)"
                      className="flex-1 h-7 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Solid Background */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Table Background</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={solidBackgroundColor || 'transparent'}
                  onChange={(e) => onOptionsChange({ solidBackgroundColor: e.target.value })}
                  className="h-7 w-16 rounded border border-input cursor-pointer"
                />
                <Input
                  type="text"
                  value={solidBackgroundColor || 'transparent'}
                  onChange={(e) => onOptionsChange({ solidBackgroundColor: e.target.value })}
                  placeholder="transparent"
                  className="flex-1 h-7 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


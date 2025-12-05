import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import type { TableColumn, TableRow } from '@/types/database';

interface TableElementProps {
  content: {
    type: 'table';
    columns: TableColumn[];
    data: TableRow[];
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
  };
  width: number | null;
  height: number | null;
  isSelected?: boolean;
}

export function TableElement({
  content,
  width,
  height,
  isSelected = false,
}: TableElementProps) {
  const elementWidth = width || 600;
  const elementHeight = height || 300;

  // Format cell value based on column format
  const formatValue = (value: string | number | null | undefined, format?: string): string => {
    if (value === null || value === undefined) return '-';
    
    switch (format) {
      case 'number':
        return typeof value === 'number' ? value.toString() : String(value);
      case 'currency':
        return typeof value === 'number' ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : String(value);
      case 'percentage':
        return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : String(value);
      case 'date':
        return value instanceof Date ? value.toLocaleDateString() : String(value);
      default:
        return String(value);
    }
  };

  // Convert our table format to TanStack Table format
  const columns = useMemo<ColumnDef<TableRow>[]>(() => {
    return content.columns.map((col) => ({
      id: col.id,
      header: col.header,
      accessorKey: col.accessorKey || col.id,
      size: col.width || 100,
      cell: ({ getValue }) => {
        const value = getValue();
        return formatValue(value as string | number | null | undefined, col.format);
      },
    }));
  }, [content.columns]);

  const table = useReactTable({
    data: content.data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;

  const borderColor = content.borderColor || 'rgba(255, 255, 255, 0.2)';
  const showRowBorders = content.showRowBorders ?? content.bordered ?? false;
  const showColumnBorders = content.showColumnBorders ?? content.bordered ?? false;
  const showOuterBorder = content.showOuterBorder ?? content.bordered ?? false;

  return (
    <div
      className="relative overflow-auto"
      style={{
        width: elementWidth,
        height: elementHeight,
        fontSize: content.compact ? '12px' : '14px',
        backgroundColor: content.solidBackgroundColor || 'transparent',
        border: showOuterBorder ? `1px solid ${borderColor}` : 'none',
      }}
    >
      <table
        className="w-full border-collapse"
        style={{
          borderSpacing: 0,
        }}
      >
        {content.showHeader && (
          <thead>
            {headerGroups.map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const col = content.columns.find((c) => c.id === header.id);
                  const align = col?.align || 'left';
                  
                  return (
                    <th
                      key={header.id}
                      className={`
                        font-semibold
                        ${showColumnBorders ? 'border-r' : ''}
                        ${content.compact ? 'px-2 py-1' : 'px-4 py-2'}
                      `}
                      style={{
                        textAlign: align,
                        width: col?.width || 'auto',
                        minWidth: col?.width || 'auto',
                        backgroundColor: content.headerBackgroundColor || 'rgba(0, 0, 0, 0.4)',
                        color: content.headerTextColor || 'rgba(255, 255, 255, 0.9)',
                        borderRightColor: showColumnBorders ? borderColor : 'transparent',
                        borderRightWidth: showColumnBorders ? '1px' : '0',
                        borderRightStyle: showColumnBorders ? 'solid' : 'none',
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
        )}
        <tbody>
          {rows.map((row, rowIndex) => {
            const isStriped = content.striped && rowIndex % 2 === 1;
            const rowBg = isStriped 
              ? (content.stripedRowBackgroundColor || 'rgba(255, 255, 255, 0.05)')
              : (content.rowBackgroundColor || 'transparent');
            
            return (
              <tr
                key={row.id}
                style={{
                  backgroundColor: rowBg,
                  borderBottom: showRowBorders ? `1px solid ${borderColor}` : 'none',
                }}
              >
                {row.getVisibleCells().map((cell) => {
                  const col = content.columns.find((c) => c.id === cell.column.id);
                  const align = col?.align || 'left';
                  
                  return (
                    <td
                      key={cell.id}
                      className={`
                        ${content.compact ? 'px-2 py-1' : 'px-4 py-2'}
                      `}
                      style={{
                        textAlign: align,
                        width: col?.width || 'auto',
                        minWidth: col?.width || 'auto',
                        color: content.rowTextColor || 'rgba(255, 255, 255, 0.9)',
                        borderRightColor: showColumnBorders ? borderColor : 'transparent',
                        borderRightWidth: showColumnBorders ? '1px' : '0',
                        borderRightStyle: showColumnBorders ? 'solid' : 'none',
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


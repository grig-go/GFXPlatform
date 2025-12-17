import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import {
  AlertCircle,
  Database,
  RefreshCw,
  Table as TableIcon,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_FUSION_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const publicAnonKey = import.meta.env.VITE_FUSION_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface TableInfo {
  name: string;
  description: string;
  type: string;
}

export function TableViewer() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTables, setLoadingTables] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Fetch list of available tables
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/map_data/tables`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setTables(result.tables || []);
      } catch (err: any) {
        console.error('Error fetching tables:', err);
        setError('Failed to load table list');
      } finally {
        setLoadingTables(false);
      }
    };

    fetchTables();
  }, []);

  // Fetch data for selected table
  const fetchTableData = async (tableName: string) => {
    if (!tableName) return;

    setLoading(true);
    setError(null);
    setTableData(null);
    setExpandedRows(new Set());

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/table/${tableName}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setTableData(result);
    } catch (err: any) {
      console.error('Error fetching table data:', err);
      setError(err.message || 'Failed to fetch table data');
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    fetchTableData(tableName);
  };

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const getTableTypeColor = (type: string) => {
    switch (type) {
      case 'weather':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'system':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'ai':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'news':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-gray-900">Database Table Viewer</h2>
        <p className="text-gray-600 text-sm mt-1">
          Select a table to view its contents
        </p>
      </div>

      {/* Table Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-gray-600" />
            Select Table
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingTables ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={selectedTable} onValueChange={handleTableSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a table to query..." />
              </SelectTrigger>
              <SelectContent>
                {tables.map((table) => (
                  <SelectItem key={table.name} value={table.name}>
                    <div className="flex items-center gap-2">
                      <TableIcon className="h-4 w-4 text-gray-500" />
                      <span>{table.name}</span>
                      <Badge 
                        variant="outline" 
                        className={`ml-2 text-xs ${getTableTypeColor(table.type)}`}
                      >
                        {table.type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedTable && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Database className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-blue-900">{selectedTable}</div>
                <div className="text-sm text-blue-700 mt-1">
                  {tables.find(t => t.name === selectedTable)?.description}
                </div>
              </div>
              <Button
                onClick={() => fetchTableData(selectedTable)}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table Data Display */}
      {!loading && tableData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Table Data</span>
              <Badge variant="outline" className="text-sm">
                {tableData.count} row{tableData.count !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
            <CardDescription>
              Showing data from <span className="font-mono">{tableData.table}</span>
              {tableData.count === 100 && ' (limited to 100 rows)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tableData.data && tableData.data.length > 0 ? (
              <div className="space-y-3">
                {/* Schema Info */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Columns ({Object.keys(tableData.data[0]).length}):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(tableData.data[0]).map((column) => (
                      <Badge key={column} variant="secondary" className="font-mono text-xs">
                        {column}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Data Rows */}
                <div className="space-y-2">
                  {tableData.data.map((row: any, index: number) => {
                    const isExpanded = expandedRows.has(index);
                    return (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
                      >
                        <button
                          onClick={() => toggleRowExpansion(index)}
                          className="w-full p-3 bg-white hover:bg-gray-50 flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                            <span className="text-sm font-medium text-gray-700">
                              Row {index + 1}
                            </span>
                            {/* Show preview of first few columns */}
                            <div className="flex gap-2 text-xs text-gray-500">
                              {Object.entries(row).slice(0, 3).map(([key, value]) => (
                                <span key={key} className="truncate max-w-32">
                                  <span className="font-semibold">{key}:</span>{' '}
                                  {String(value).substring(0, 30)}
                                  {String(value).length > 30 ? '...' : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="p-4 bg-gray-50 border-t border-gray-200">
                            <div className="space-y-2">
                              {Object.entries(row).map(([key, value]) => (
                                <div key={key} className="flex gap-3 text-sm">
                                  <div className="font-mono font-semibold text-gray-600 min-w-[150px]">
                                    {key}:
                                  </div>
                                  <div className="flex-1 text-gray-800 break-all">
                                    {value === null ? (
                                      <span className="italic text-gray-400">null</span>
                                    ) : typeof value === 'object' ? (
                                      <pre className="bg-white p-2 rounded border border-gray-200 overflow-auto text-xs">
                                        {JSON.stringify(value, null, 2)}
                                      </pre>
                                    ) : (
                                      <span>{String(value)}</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Full JSON View */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 font-medium p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    View Complete JSON
                  </summary>
                  <pre className="mt-2 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-xs max-h-96">
                    {JSON.stringify(tableData.data, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No data in this table</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Initial State */}
      {!loading && !tableData && !error && selectedTable === '' && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <TableIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Select a table above to view its data</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
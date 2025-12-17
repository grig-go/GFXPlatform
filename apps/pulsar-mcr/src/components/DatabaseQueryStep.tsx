// components/DatabaseQueryStep.tsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  FormGroup,
  HTMLSelect,
  TextArea,
  Button,
  RadioGroup,
  Radio,
  InputGroup,
  NumericInput,
  Tag,
  Callout,
  Intent,
  Icon,
  Tabs,
  Tab,
  Dialog,
  Classes,
  ControlGroup,
  Toaster
} from '@blueprintjs/core';
import { FieldMapping, DatabaseQuery, DatabaseQueryStepProps, SimpleQuery } from '../types/api';

const toaster = Toaster.create({
  position: 'top',
});

const FieldMappingRow: React.FC<{
  templateField: string;
  mapping: FieldMapping;
  parentColumns: string[];
  childColumns: string[];
  existingKeys: string[];
  onUpdate: (oldKey: string, newKey: string, mapping: FieldMapping) => void;
  onDelete: (key: string) => void;
}> = ({ templateField, mapping, parentColumns, childColumns, existingKeys, onUpdate, onDelete }) => {
  const [localTemplateField, setLocalTemplateField] = useState(
    templateField.startsWith('field_') ? '' : templateField
  );
  const [error, setError] = useState('');
  
  // Validate template field name
  const validateTemplateField = (value: string): boolean => {
    if (!value.trim()) {
      setError('Field name is required');
      return false;
    }
    
    // Check for duplicates (excluding current field)
    if (value !== templateField && existingKeys.includes(value)) {
      setError('This field name already exists');
      return false;
    }
    
    // Check for valid field name (alphanumeric, underscore)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
      setError('Field name must start with letter and contain only letters, numbers, underscore');
      return false;
    }
    
    setError('');
    return true;
  };
  
  // Handle template field change - THIS WAS MISSING!
  const handleTemplateFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalTemplateField(value);
    
    // Live validation for immediate feedback
    if (value) {
      validateTemplateField(value);
    } else {
      setError('');
    }
  };
  
  // Update parent state on blur
  const handleTemplateFieldBlur = () => {
    const trimmedValue = localTemplateField.trim();
    
    if (trimmedValue && validateTemplateField(trimmedValue)) {
      if (trimmedValue !== templateField) {
        onUpdate(templateField, trimmedValue, mapping);
      }
    } else if (!trimmedValue && !templateField.startsWith('field_')) {
      // Revert to original if empty
      setLocalTemplateField(templateField);
      setError('');
    }
  };
  
  return (
    <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #e1e8ed', borderRadius: '3px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        
        {/* Source type selector */}
        <HTMLSelect
          value={mapping.source || 'parent'}
          onChange={(e) => {
            const newSource = e.target.value as 'parent' | 'child' | 'child-dynamic' | 'literal';
            onUpdate(templateField, templateField, {
              ...mapping,
              source: newSource,
              field: '',
              value: '',
              childIndex: newSource === 'child' ? 0 : undefined,
              indexPattern: newSource === 'child-dynamic' ? '{i}' : undefined,
              indexOffset: newSource === 'child-dynamic' ? 0 : undefined
            });
          }}
          style={{ minWidth: '120px' }}
        >
          <option value="parent">Parent</option>
          <option value="child">Child[n]</option>
          <option value="child-dynamic">Child[{"{i}"}]</option>
          <option value="literal">Literal</option>
        </HTMLSelect>
        
        {/* Parent field selector */}
        {mapping.source === 'parent' && (
          <HTMLSelect
            value={mapping.field || ''}
            onChange={(e) => {
              onUpdate(templateField, templateField, {
                ...mapping,
                field: e.target.value
              });
            }}
            disabled={parentColumns.length === 0}
            style={{ flex: '1 1 200px', minWidth: '150px' }}
          >
            <option value="">
              {parentColumns.length === 0 ?
                'Test query to see columns' :
                'Select parent field...'}
            </option>
            {parentColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </HTMLSelect>
        )}
        
        {/* Static child index selector */}
        {mapping.source === 'child' && (
          <div style={{ display: 'flex', gap: '5px', flex: '1 1 250px' }}>
            <HTMLSelect
              value={mapping.field || ''}
              onChange={(e) => {
                onUpdate(templateField, templateField, {
                  ...mapping,
                  field: e.target.value
                });
              }}
              disabled={childColumns.length === 0}
              style={{ flex: 1 }}
            >
              <option value="">
                {childColumns.length === 0 ?
                  'Test query to see columns' :
                  'Select child field...'}
              </option>
              {childColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </HTMLSelect>
            
            <NumericInput
              value={mapping.childIndex ?? 0}
              onValueChange={(value) => {
                onUpdate(templateField, templateField, {
                  ...mapping,
                  childIndex: value
                });
              }}
              min={0}
              max={9}
              placeholder="Index"
              style={{ width: '80px' }}
            />
          </div>
        )}
        
        {/* Dynamic child selector */}
        {mapping.source === 'child-dynamic' && (
          <div style={{ display: 'flex', gap: '5px', flex: '1 1 300px', alignItems: 'center' }}>
            <HTMLSelect
              value={mapping.field || ''}
              onChange={(e) => {
                onUpdate(templateField, templateField, {
                  ...mapping,
                  field: e.target.value
                });
              }}
              disabled={childColumns.length === 0}
              style={{ flex: 1 }}
            >
              <option value="">
                {childColumns.length === 0 ? 'Run test query first' : 'Select child field...'}
              </option>
              {childColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </HTMLSelect>
            
            <Tag minimal intent={Intent.PRIMARY}>
              {mapping.indexPattern || '{i}'}
            </Tag>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '12px', color: '#5c7080' }}>Offset:</span>
              <NumericInput
                value={mapping.indexOffset ?? 0}
                onValueChange={(value) => {
                  onUpdate(templateField, templateField, {
                    ...mapping,
                    indexOffset: value
                  });
                }}
                min={-10}
                max={10}
                placeholder="0"
                style={{ width: '60px' }}
                buttonPosition="none"
              />
            </div>
          </div>
        )}
        
        {/* Literal value input */}
        {mapping.source === 'literal' && (
          <InputGroup
            placeholder="Enter value..."
            value={mapping.value || ''}
            onChange={(e) => {
              onUpdate(templateField, templateField, {
                ...mapping,
                value: e.target.value
              });
            }}
            style={{ flex: '1 1 200px' }}
          />
        )}
        
        <Icon icon="arrow-right" style={{ flexShrink: 0 }} />
        
        {/* Template field name */}
        <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
          <InputGroup
            placeholder="Template field name"
            value={localTemplateField}
            onChange={handleTemplateFieldChange}  // NOW IT'S DEFINED!
            onBlur={handleTemplateFieldBlur}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleTemplateFieldBlur();
              }
            }}
            intent={error ? Intent.DANGER : Intent.NONE}
          />
          {error && (
            <div style={{ color: '#d13913', fontSize: '11px', marginTop: '2px' }}>
              {error}
            </div>
          )}
        </div>
        
        <Button
          icon="trash"
          minimal
          onClick={() => onDelete(templateField)}
          style={{ flexShrink: 0 }}
        />
      </div>
      
      {/* Help text for dynamic child mapping */}
      {mapping.source === 'child-dynamic' && (
        <div style={{ marginTop: '8px', paddingLeft: '10px', fontSize: '12px', color: '#5c7080' }}>
          <Icon icon="info-sign" size={12} style={{ marginRight: '5px' }} />
          This will map to {localTemplateField || 'fieldName'} with dynamic index.
          {(mapping.indexOffset ?? 0) > 0 && ` Index will be offset by +${mapping.indexOffset}.`}
          {(mapping.indexOffset ?? 0) < 0 && ` Index will be offset by ${mapping.indexOffset}.`}
          {' '}Example: {mapping.field || 'fieldName'}[0] → {localTemplateField || 'templateField'} (with offset: {0 + (mapping.indexOffset ?? 0)})
        </div>
      )}
    </div>
  );
};

const IndexedFieldMappingRow: React.FC<{
  templatePattern: string;
  mapping: any;
  childColumns: string[];
  onUpdate: (oldKey: string, newKey: string, mapping: any) => void;
  onDelete: (key: string) => void;
}> = ({ templatePattern, mapping, childColumns, onUpdate, onDelete }) => {
  const [localTemplatePattern, setLocalTemplatePattern] = useState(
    templatePattern.startsWith('indexed_') ? '' : templatePattern
  );
  
  const handleTemplatePatternBlur = () => {
    if (localTemplatePattern !== templatePattern && localTemplatePattern.trim() !== '') {
      onUpdate(templatePattern, localTemplatePattern, mapping);
    }
  };
  
  return (
    <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #e1e8ed', borderRadius: '3px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        
        <HTMLSelect
          value={mapping.field || ''}
          onChange={(e) => {
            onUpdate(templatePattern, templatePattern, {
              ...mapping,
              field: e.target.value
            });
          }}
          disabled={childColumns.length === 0}
          style={{ flex: 1 }}
        >
          <option value="">
            {childColumns.length === 0 ? 'Run test query first' : 'Select child field...'}
          </option>
          {childColumns.map(col => (
            <option key={col} value={col}>{col}</option>
          ))}
        </HTMLSelect>
        
        <Icon icon="arrow-right" />
        
        <InputGroup
          placeholder="Template pattern (e.g., firstName{i})"
          value={localTemplatePattern}
          onChange={(e) => setLocalTemplatePattern(e.target.value)}
          onBlur={handleTemplatePatternBlur}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleTemplatePatternBlur();
            }
          }}
          style={{ flex: 1 }}
        />
        
        <Button
          icon="trash"
          minimal
          onClick={() => onDelete(templatePattern)}
        />
      </div>
    </div>
  );
};

export const DatabaseQueryStep: React.FC<DatabaseQueryStepProps> = ({
  connections,
  queries,
  templates,
  onQueriesChange,
  onTestQuery
}) => {
  const [queryMode, setQueryMode] = useState<'simple' | 'parent-child'>('simple');
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [showQueryBuilder, setShowQueryBuilder] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'static' | 'indexed'>('static');

  useEffect(() => {
    // Pre-populate test results from column metadata
    const cachedResults: Record<string, any> = {};
    
    Object.entries(queries).forEach(([queryId, query]) => {
      // Check if query has columnMetadata (from previous tests)
      if ((query as any).columnMetadata) {
        const metadata = (query as any).columnMetadata;
        cachedResults[queryId] = {
          success: true,
          parentColumns: metadata.parentColumns || [],
          childColumns: metadata.childColumns || [],
          fromCache: true,
          lastTested: metadata.lastTested
        };
      }
    });
    
    // Only update if we have cached results and they're not already in state
    if (Object.keys(cachedResults).length > 0) {
      setTestResults(prev => {
        // Merge cached results with existing, preserving any fresh test results
        const merged = { ...cachedResults };
        Object.keys(prev).forEach(key => {
          if (prev[key] && !prev[key].fromCache) {
            merged[key] = prev[key]; // Keep fresh results
          }
        });
        return merged;
      });
    }
  }, [queries]);

  // Get selected query
  const selectedQuery = selectedQueryId ? queries[selectedQueryId] : null;

  // Handle adding a new query
  const handleAddQuery = () => {
    const id = `query_${Date.now()}`;
    const newQuery: DatabaseQuery = queryMode === 'simple' ? {
      id,
      name: 'New Query',
      mode: 'simple',
      connectionId: Object.keys(connections)[0] || '',
      sql: '',
      type: 'raw'
    } : {
      id,
      name: 'New Parent-Child Query',
      mode: 'parent-child',
      parentQuery: {
        connectionId: Object.keys(connections)[0] || '',
        sql: '',
        parameters: []
      },
      childQuery: {
        connectionId: Object.keys(connections)[0] || '',
        sql: '',
        parentKeyField: '',
        maxResults: 10
      },
      templateSelection: {
        mode: 'static',
        templateId: ''
      },
      fieldMappings: {
        staticFields: {},
        indexedFields: {}
      }
    };

    onQueriesChange({
      ...queries,
      [id]: newQuery
    });
    setSelectedQueryId(id);
    setShowQueryBuilder(false);
  };

  // Handle updating a query
  const handleQueryUpdate = (queryId: string, updates: Partial<DatabaseQuery>) => {
    onQueriesChange({
      ...queries,
      [queryId]: {
        ...queries[queryId],
        ...updates
      } as DatabaseQuery
    });
  };

  // Handle deleting a query
  const handleDeleteQuery = (queryId: string) => {
    const newQueries = { ...queries };
    delete newQueries[queryId];
    onQueriesChange(newQueries);
    if (selectedQueryId === queryId) {
      setSelectedQueryId(null);
    }
  };

  // Test database query
  const testQuery = async (queryId: string) => {
    try {
      setTestResults(prev => ({
        ...prev,
        [queryId]: { testing: true }
      }));
  
      const result = onTestQuery ? await onTestQuery(queryId) : null;
      
      console.log('Test query result:', result); // Debug log
      
      // Store the full result structure
      setTestResults(prev => ({
        ...prev,
        [queryId]: {
          success: true,
          testing: false,
          fromCache: false, // Mark as fresh result
          ...(result as any)  // Spread all the result fields
        }
      }));

      toaster.show({
        message: 'Query tested successfully',
        intent: Intent.SUCCESS,
        icon: 'tick',
      });

    } catch (error: any) {
      console.error('Test query error:', error);
      setTestResults(prev => ({
        ...prev,
        [queryId]: { success: false, error: error.message, testing: false }
      }));
    }
  };
  // Render query list sidebar
  const renderQueryList = () => (
    <Card style={{ padding: '15px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h4 style={{ margin: 0 }}>Queries</h4>
        <Button icon="add" small text="New" onClick={() => setShowQueryBuilder(true)} />
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <ControlGroup fill>
          <Button 
            text="Simple" 
            active={queryMode === 'simple'}
            onClick={() => setQueryMode('simple')}
            small
          />
          <Button 
            text="Parent-Child" 
            active={queryMode === 'parent-child'}
            onClick={() => setQueryMode('parent-child')}
            small
          />
        </ControlGroup>
      </div>
      
      {Object.values(queries)
        .filter(q => q.mode === queryMode)
        .map(query => (
          <Card
            key={query.id}
            interactive
            style={{ 
              marginBottom: '10px', 
              padding: '10px',
              border: selectedQueryId === query.id ? '2px solid #137cbd' : '1px solid #e1e8ed'
            }}
            onClick={() => setSelectedQueryId(query.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icon icon={query.mode === 'parent-child' ? 'git-branch' : 'database'} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>{query.name}</div>
                <div style={{ fontSize: '12px', color: '#5c7080' }}>
                  {query.mode === 'parent-child' ? 'Parent-Child Query' : 'Simple Query'}
                </div>
              </div>
              {testResults[query.id]?.success && (
                <Tag 
                  intent={Intent.SUCCESS} 
                  minimal
                  icon={testResults[query.id]?.fromCache ? "history" : "tick"}
                >
                  {testResults[query.id]?.fromCache ? "Cached" : "Tested"}
                </Tag>
              )}
            </div>
          </Card>
        ))}
      
      {Object.values(queries).filter(q => q.mode === queryMode).length === 0 && (
        <Callout intent={Intent.PRIMARY} style={{ marginTop: '10px' }}>
          No {queryMode} queries yet. Click "New" to create one.
        </Callout>
      )}
    </Card>
  );

  // Render configuration based on query type
  const renderQueryConfig = () => {
    if (!selectedQuery) {
      return (
        <Card style={{ padding: '40px', textAlign: 'center' }}>
          <Icon icon="database" size={40} style={{ marginBottom: '20px', opacity: 0.3 }} />
          <h3>Select or Create a Query</h3>
          <p style={{ color: '#5c7080' }}>
            Choose an existing query from the list or create a new one to get started.
          </p>
          <Button icon="add" text="Create New Query" onClick={() => setShowQueryBuilder(true)} />
        </Card>
      );
    }

    if (selectedQuery.mode === 'simple') {
      return renderSimpleQueryConfig(selectedQuery);
    }

    return renderParentChildConfig(selectedQuery);
  };

  // Render simple query configuration
  const renderSimpleQueryConfig = (query: SimpleQuery) => (
    <Card style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>{query.name}</h3>
        <Button
          icon="trash"
          intent={Intent.DANGER}
          minimal
          onClick={() => handleDeleteQuery(query.id)}
        />
      </div>

      <FormGroup label="Query Name">
        <InputGroup
          value={query.name}
          onChange={(e) => handleQueryUpdate(query.id, { name: e.target.value })}
          placeholder="e.g., Get Election Results"
        />
      </FormGroup>

      <FormGroup label="Connection">
        <HTMLSelect
          value={query.connectionId}
          onChange={(e) => handleQueryUpdate(query.id, { connectionId: e.target.value })}
          fill
        >
          <option value="">Select connection...</option>
          {Object.values(connections).map(conn => (
            <option key={conn.id} value={conn.id}>{conn.name}</option>
          ))}
        </HTMLSelect>
      </FormGroup>

      <FormGroup label="SQL Query">
        <TextArea
          value={query.sql}
          onChange={(e) => handleQueryUpdate(query.id, { sql: e.target.value })}
          placeholder="SELECT * FROM table_name"
          rows={8}
          fill
          growVertically
          style={{ fontFamily: 'monospace' }}
        />
      </FormGroup>

      <Button
        icon="play"
        text={testResults[query.id]?.fromCache ? "Re-test Query" : "Test Query"}
        intent={Intent.PRIMARY}
        onClick={() => testQuery(query.id)}
        loading={testResults[query.id]?.testing}
        disabled={!query.sql}
      />

      {testResults[query.id]?.success && (
        <Callout intent={Intent.SUCCESS} style={{ marginTop: '10px' }}>
          Query executed successfully
        </Callout>
      )}
    </Card>
  );

  // Render parent-child configuration
  const renderParentChildConfig = (query: DatabaseQuery & { mode: 'parent-child' }) => {
    const typedQuery = query as any & { id: string; name: string; mode: 'parent-child' };
    
    return (
      <div style={{ display: 'grid', gap: '20px' }}>
        {/* Basic Info */}
        <Card style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>{typedQuery.name}</h3>
            <Button
              icon="trash"
              intent={Intent.DANGER}
              minimal
              onClick={() => handleDeleteQuery(typedQuery.id)}
            />
          </div>
  
          <FormGroup label="Query Name">
            <InputGroup
              value={typedQuery.name}
              onChange={(e) => handleQueryUpdate(typedQuery.id, { name: e.target.value })}
              placeholder="e.g., Election Results with Candidates"
            />
          </FormGroup>

          {testResults[typedQuery.id]?.fromCache && testResults[typedQuery.id]?.lastTested && (
            <Callout
              intent="none"
              icon="info-sign"
              style={{ marginBottom: '15px' }}
            >
              Using column information from test on {new Date((testResults[typedQuery.id] as any).lastTested).toLocaleDateString()}.
              Re-test the query if columns have changed.
            </Callout>
          )}
        </Card>
  
        {/* Parent Query Configuration */}
        <Card style={{ padding: '20px' }}>
          <h4 style={{ marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon icon="database" />
            Parent Query
            <Tag minimal>Fetches main records</Tag>
          </h4>
          
          <FormGroup label="Connection">
            <HTMLSelect
              value={typedQuery.parentQuery.connectionId}
              onChange={(e) => handleQueryUpdate(typedQuery.id, {
                parentQuery: { ...typedQuery.parentQuery, connectionId: e.target.value }
              })}
              fill
            >
              <option value="">Select connection...</option>
              {Object.values(connections).map(conn => (
                <option key={conn.id} value={conn.id}>{conn.name}</option>
              ))}
            </HTMLSelect>
          </FormGroup>
  
          <FormGroup label="SQL Query">
            <TextArea
              value={typedQuery.parentQuery.sql}
              onChange={(e) => handleQueryUpdate(typedQuery.id, {
                parentQuery: { ...typedQuery.parentQuery, sql: e.target.value }
              })}
              placeholder="SELECT RaceID, race_name, race_type FROM races WHERE region = ?"
              rows={6}
              fill
              style={{ fontFamily: 'monospace' }}
            />
          </FormGroup>
        </Card>
  
        {/* Child Query Configuration */}
        <Card style={{ padding: '20px' }}>
          <h4 style={{ marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon icon="git-branch" />
            Child Query
            <Tag minimal>Fetches related records for each parent</Tag>
          </h4>
          
          <FormGroup label="Connection">
            <HTMLSelect
              value={typedQuery.childQuery.connectionId}
              onChange={(e) => handleQueryUpdate(typedQuery.id, {
                childQuery: { ...typedQuery.childQuery, connectionId: e.target.value }
              })}
              fill
            >
              <option value="">Select connection...</option>
              {Object.values(connections).map(conn => (
                <option key={conn.id} value={conn.id}>{conn.name}</option>
              ))}
            </HTMLSelect>
          </FormGroup>
  
          <FormGroup label="Parent Key Field" labelInfo="(field from parent query to use as parameter)">
            <InputGroup
              value={typedQuery.childQuery.parentKeyField}
              onChange={(e) => handleQueryUpdate(typedQuery.id, {
                childQuery: { ...typedQuery.childQuery, parentKeyField: e.target.value }
              })}
              placeholder="RaceID"
            />
          </FormGroup>
  
          <FormGroup label="SQL Query" labelInfo="(use ? for parent key)">
            <TextArea
              value={typedQuery.childQuery.sql}
              onChange={(e) => handleQueryUpdate(typedQuery.id, {
                childQuery: { ...typedQuery.childQuery, sql: e.target.value }
              })}
              placeholder="SELECT * FROM candidates WHERE RaceID = ? ORDER BY votes DESC"
              rows={6}
              fill
              style={{ fontFamily: 'monospace' }}
            />
          </FormGroup>
  
          <FormGroup label="Max Results Per Parent">
            <NumericInput
              value={typedQuery.childQuery.maxResults || 10}
              onValueChange={(value) => handleQueryUpdate(typedQuery.id, {
                childQuery: { ...typedQuery.childQuery, maxResults: value }
              })}
              min={1}
              max={100}
              placeholder="10"
            />
          </FormGroup>
        </Card>
  
        {/* Template Selection */}
        <Card style={{ padding: '20px' }}>
          <h4 style={{ marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon icon="document" />
            Template Selection
          </h4>
          
          <FormGroup label="Template Mode">
            <RadioGroup
              selectedValue={typedQuery.templateSelection.mode}
              onChange={(e: any) => handleQueryUpdate(typedQuery.id, {
                templateSelection: {
                  ...typedQuery.templateSelection,
                  mode: e.target.value as 'static' | 'dynamic' | 'conditional'
                }
              })}
            >
              <Radio value="static" label="Static Template" />
              <Radio value="dynamic" label="Dynamic Template Pattern" />
              <Radio value="conditional" label="Conditional Rules" />
            </RadioGroup>
          </FormGroup>
  
          {typedQuery.templateSelection.mode === 'static' && (
            <FormGroup label="Template">
              <HTMLSelect
                value={typedQuery.templateSelection.templateId || ''}
                onChange={(e) => handleQueryUpdate(typedQuery.id, {
                  templateSelection: { 
                    ...typedQuery.templateSelection, 
                    templateId: e.target.value 
                  }
                })}
                fill
              >
                <option value="">Select template...</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </HTMLSelect>
            </FormGroup>
          )}
  
          {typedQuery.templateSelection.mode === 'dynamic' && (
            <FormGroup label="Template Pattern" labelInfo="Use {field_name} for dynamic values">
              <InputGroup
                value={typedQuery.templateSelection.templatePattern || ''}
                onChange={(e) => handleQueryUpdate(typedQuery.id, {
                  templateSelection: { 
                    ...typedQuery.templateSelection, 
                    templatePattern: e.target.value 
                  }
                })}
                placeholder="VOTE_{candidate_count}HEADS"
              />
            </FormGroup>
          )}
  
          {typedQuery.templateSelection.mode === 'conditional' && (
            <div>
              <Button 
                icon="add" 
                text="Add Rule" 
                small
                onClick={() => {
                  const newRules = [...(typedQuery.templateSelection.rules || []), {
                    conditions: [{ field: '', operator: '=' as const, value: '', source: 'parent' as const }],
                    templateId: '',
                    childLimit: undefined
                  }];
                  handleQueryUpdate(typedQuery.id, {
                    templateSelection: { 
                      ...typedQuery.templateSelection, 
                      rules: newRules 
                    }
                  });
                }}
              />
              
              {typedQuery.templateSelection.rules?.map((rule: any, ruleIndex: number) => (
                <Card key={ruleIndex} style={{ marginTop: '10px', padding: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h5 style={{ margin: 0 }}>Rule {ruleIndex + 1}</h5>
                    <Button
                      icon="trash"
                      minimal
                      small
                      onClick={() => {
                        const newRules = typedQuery.templateSelection.rules!.filter((_: any, i: number) => i !== ruleIndex);
                        handleQueryUpdate(typedQuery.id, {
                          templateSelection: { 
                            ...typedQuery.templateSelection, 
                            rules: newRules 
                          }
                        });
                      }}
                    />
                  </div>
                  
                  {rule.conditions.map((condition: any, condIndex: number) => (
                    <div key={condIndex} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <HTMLSelect 
                        value={condition.source}
                        onChange={(e) => {
                          const newRules = [...typedQuery.templateSelection.rules!];
                          newRules[ruleIndex].conditions[condIndex].source = e.target.value as 'parent' | 'childCount';
                          handleQueryUpdate(typedQuery.id, {
                            templateSelection: { ...typedQuery.templateSelection, rules: newRules }
                          });
                        }}
                      >
                        <option value="parent">Parent Field</option>
                        <option value="childCount">Child Count</option>
                      </HTMLSelect>
                      
                      <InputGroup
                        placeholder="Field name"
                        value={condition.field}
                        onChange={(e) => {
                          const newRules = [...typedQuery.templateSelection.rules!];
                          newRules[ruleIndex].conditions[condIndex].field = e.target.value;
                          handleQueryUpdate(typedQuery.id, {
                            templateSelection: { ...typedQuery.templateSelection, rules: newRules }
                          });
                        }}
                      />
                      
                      <HTMLSelect 
                        value={condition.operator}
                        onChange={(e) => {
                          const newRules = [...typedQuery.templateSelection.rules!];
                          newRules[ruleIndex].conditions[condIndex].operator = e.target.value as any;
                          handleQueryUpdate(typedQuery.id, {
                            templateSelection: { ...typedQuery.templateSelection, rules: newRules }
                          });
                        }}
                      >
                        <option value="=">=</option>
                        <option value="!=">!=</option>
                        <option value={"<"}>{"<"}</option>
                        <option value={">"}>{">"}</option>
                        <option value="in">in</option>
                      </HTMLSelect>
                      
                      <InputGroup
                        placeholder="Value"
                        value={condition.value}
                        onChange={(e) => {
                          const newRules = [...typedQuery.templateSelection.rules!];
                          newRules[ruleIndex].conditions[condIndex].value = e.target.value;
                          handleQueryUpdate(typedQuery.id, {
                            templateSelection: { ...typedQuery.templateSelection, rules: newRules }
                          });
                        }}
                      />
                    </div>
                  ))}
                  
                  <FormGroup label="Template" style={{ marginTop: '10px' }}>
                    <HTMLSelect
                      value={rule.templateId}
                      onChange={(e) => {
                        const newRules = [...typedQuery.templateSelection.rules!];
                        newRules[ruleIndex].templateId = e.target.value;
                        handleQueryUpdate(typedQuery.id, {
                          templateSelection: { ...typedQuery.templateSelection, rules: newRules }
                        });
                      }}
                      fill
                    >
                      <option value="">Select template...</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </HTMLSelect>
                  </FormGroup>
                </Card>
              ))}
            </div>
          )}
        </Card>
  
        {/* Field Mappings */}
        <Card style={{ padding: '20px' }}>
          <h4 style={{ marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon icon="flows" />
            Field Mappings
          </h4>

          {!testResults[typedQuery.id]?.success && (
            <Callout intent={Intent.WARNING} icon="info-sign" style={{ marginBottom: '15px' }}>
              Run the test query first to see available fields for mapping
            </Callout>
          )}
          
          <Tabs
            selectedTabId={activeTab}
            onChange={(newTabId) => setActiveTab(newTabId as 'static' | 'indexed')}
          >
            <Tab id="static" title="Static Fields" panel={
              <div style={{ paddingTop: '15px' }}>
                <Button 
                  icon="add" 
                  text="Add Static Field" 
                  small
                  onClick={() => {
                    // Generate unique key that won't conflict
                    let tempKey = `field_${Date.now()}`;
                    const existingKeys = Object.keys(typedQuery.fieldMappings.staticFields);
                    
                    // Ensure uniqueness
                    while (existingKeys.includes(tempKey)) {
                      tempKey = `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    }
                    
                    handleQueryUpdate(typedQuery.id, {
                      fieldMappings: {
                        ...typedQuery.fieldMappings,
                        staticFields: {
                          ...typedQuery.fieldMappings.staticFields,
                          [tempKey]: { source: 'parent', field: '' }
                        }
                      }
                    });
                  }}
                />
                
                {Object.entries(typedQuery.fieldMappings.staticFields).map(([templateField, mapping]) => {
                  const parentColumns = testResults[typedQuery.id]?.parentColumns || [];
                  const childColumns = testResults[typedQuery.id]?.childColumns || [];
                  const existingKeys = Object.keys(typedQuery.fieldMappings.staticFields);
                  
                  return (
                    <FieldMappingRow
                      key={templateField}
                      templateField={templateField}
                      mapping={mapping as FieldMapping}
                      parentColumns={parentColumns}
                      childColumns={childColumns}
                      existingKeys={existingKeys} // Pass existing keys for validation
                      onUpdate={(oldKey, newKey, newMapping) => {
                        // Prevent updates if key already exists (double-check)
                        if (oldKey !== newKey && existingKeys.includes(newKey)) {
                          toaster.show({
                            message: `Field name "${newKey}" already exists`,
                            intent: Intent.DANGER,
                            icon: 'error',
                          });
                          return;
                        }
                        
                        const newStaticFields = { ...typedQuery.fieldMappings.staticFields };
                        if (oldKey !== newKey) {
                          delete newStaticFields[oldKey];
                        }
                        newStaticFields[newKey] = newMapping;
                        
                        handleQueryUpdate(typedQuery.id, {
                          fieldMappings: {
                            ...typedQuery.fieldMappings,
                            staticFields: newStaticFields
                          }
                        });
                      }}
                      onDelete={(key) => {
                        const newStaticFields = { ...typedQuery.fieldMappings.staticFields };
                        delete newStaticFields[key];
                        handleQueryUpdate(typedQuery.id, {
                          fieldMappings: {
                            ...typedQuery.fieldMappings,
                            staticFields: newStaticFields
                          }
                        });
                      }}
                    />
                  );
                })}
                
                {Object.keys(typedQuery.fieldMappings.staticFields).length === 0 && (
                  <Callout intent={Intent.PRIMARY} style={{ marginTop: '10px' }}>
                    Click "Add Static Field" to map fields to template.
                  </Callout>
                )}
              </div>
            } />
            
            <Tab id="indexed" title="Indexed Fields" panel={
              <div style={{ paddingTop: '15px' }}>
                <Callout intent={Intent.PRIMARY} style={{ marginBottom: '15px' }}>
                  Indexed fields map child records to numbered template fields (e.g., candidate1, candidate2)
                </Callout>
                
                <Button 
                  icon="add" 
                  text="Add Indexed Field" 
                  small
                  onClick={() => {
                    const tempKey = `indexed_${Date.now()}`;
                    handleQueryUpdate(typedQuery.id, {
                      fieldMappings: {
                        ...typedQuery.fieldMappings,
                        indexedFields: {
                          ...typedQuery.fieldMappings.indexedFields,
                          [tempKey]: { source: 'child', field: '' }
                        }
                      }
                    });
                  }}
                />
                
                {/* Similar implementation for indexed fields - create IndexedFieldMappingRow component */}
                {Object.entries(typedQuery.fieldMappings.indexedFields).map(([templatePattern, mapping]) => {
                  const childColumns = testResults[typedQuery.id]?.childColumns || [];
                  
                  return (
                    <IndexedFieldMappingRow
                      key={templatePattern}
                      templatePattern={templatePattern}
                      mapping={mapping}
                      childColumns={childColumns}
                      onUpdate={(oldKey, newKey, newMapping) => {
                        const newIndexedFields = { ...typedQuery.fieldMappings.indexedFields };
                        if (oldKey !== newKey) {
                          delete newIndexedFields[oldKey];
                        }
                        newIndexedFields[newKey] = newMapping;
                        
                        handleQueryUpdate(typedQuery.id, {
                          fieldMappings: {
                            ...typedQuery.fieldMappings,
                            indexedFields: newIndexedFields
                          }
                        });
                      }}
                      onDelete={(key) => {
                        const newIndexedFields = { ...typedQuery.fieldMappings.indexedFields };
                        delete newIndexedFields[key];
                        handleQueryUpdate(typedQuery.id, {
                          fieldMappings: {
                            ...typedQuery.fieldMappings,
                            indexedFields: newIndexedFields
                          }
                        });
                      }}
                    />
                  );
                })}
                
                {Object.keys(typedQuery.fieldMappings.indexedFields).length === 0 && (
                  <Callout intent={Intent.PRIMARY} style={{ marginTop: '10px' }}>
                    Click "Add Indexed Field" to map child query fields to template patterns. Use {"{i}"} for the index placeholder.
                  </Callout>
                )}
              </div>
            } />
          </Tabs>
        </Card>
  
        {/* Test Button */}
        <div>
          <Button
            icon="play"
            text={(query as any).columnMetadata ? "Re-test Query" : "Test Query"}
            intent={Intent.PRIMARY}
            onClick={() => testQuery(typedQuery.id)}
            loading={testResults[typedQuery.id]?.testing}
            disabled={!typedQuery.parentQuery.sql || !typedQuery.childQuery.sql}
          />
          
          {testResults[typedQuery.id]?.success && (
            <Callout intent={Intent.SUCCESS} style={{ marginTop: '10px' }}>
              <strong>Test successful!</strong>
              <p>Parent rows: {testResults[typedQuery.id].parentRows}</p>
              <p>Child rows per parent: {testResults[typedQuery.id].childRows?.join(', ')}</p>
            </Callout>
          )}
        </div>
      </div>
    );
  };
      
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', height: '600px' }}>
      {renderQueryList()}
      <div style={{ overflowY: 'auto' }}>
        {renderQueryConfig()}
      </div>
      
      {/* Query Builder Dialog */}
      <Dialog
        isOpen={showQueryBuilder}
        onClose={() => setShowQueryBuilder(false)}
        title="Create New Query"
        style={{ width: '500px' }}
      >
        <div className={Classes.DIALOG_BODY}>
          <FormGroup label="Query Type">
            <RadioGroup selectedValue={queryMode} onChange={(e: any) => setQueryMode(e.target.value as 'simple' | 'parent-child')}>
              <Radio value="simple" label="Simple Query" />
              <Radio value="parent-child" label="Parent-Child Query" />
            </RadioGroup>
          </FormGroup>
          
          {queryMode === 'parent-child' && (
            <Callout intent={Intent.PRIMARY} icon="info-sign">
              Parent-Child queries are perfect for hierarchical data like elections with candidates,
              categories with items, or any one-to-many relationship.
            </Callout>
          )}
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={() => setShowQueryBuilder(false)}>Cancel</Button>
            <Button intent={Intent.PRIMARY} onClick={handleAddQuery}>
              Create Query
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default DatabaseQueryStep;
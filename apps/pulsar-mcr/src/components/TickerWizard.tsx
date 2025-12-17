import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  DialogStep,
  MultistepDialog,
  Button,
  FileInput,
  FormGroup,
  InputGroup,
  RadioGroup,
  Radio,
  Callout,
  Intent,
  Toaster,
  Spinner
} from '@blueprintjs/core';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useTemplates } from '../contexts/TemplatesContext';
import { supabase } from '../lib/supabase';

// Global toaster instance for notifications
const toaster = Toaster.create({
  position: 'top',
});

interface TickerWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

type WizardOption = 'connect' | 'upload' | null;

// Removed unused ShowNode interface

export const TickerWizard: React.FC<TickerWizardProps> = ({ isOpen, onClose }) => {
  const [selectedOption, setSelectedOption] = useState<WizardOption>(null);
  const [hostname, setHostname] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rowData, setRowData] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [templateDetails, setTemplateDetails] = useState<any[]>([]);
  const [currentStepId, setCurrentStepId] = useState<string>('choose');
  const [importing, setImporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState<boolean>(false);
  const { refreshTemplates, createTemplateWithTabfields, updateTemplate } = useTemplates();
  
  // Create persistent refs to maintain grid API references across renders
  const uploadGridApiRef = useRef<any>(null);
  
  // Flag to ignore selection cleared events during navigation
  const isNavigatingRef = useRef(false);
  
  // This effect helps us debug the selected rows state changes
  useEffect(() => {
    console.log('selectedRows updated:', selectedRows);
  }, [selectedRows]);

  // Filter only template nodes, not show nodes
  const selectedTemplateNodes = selectedRows.filter(row => row.type === 'template');

  // Debug logging for review step
  useEffect(() => {
    if (currentStepId === 'review') {
      console.log('Review step - Selected templates:', selectedTemplateNodes);
      console.log('Template details available:', templateDetails.length);
    }
  }, [currentStepId, selectedTemplateNodes, templateDetails]);

  // Renderers and column definitions remain unchanged.
  const NameCellRenderer = (props: any) => {
    const icon =
      props.data.type === 'show' ? (
        <FolderIcon style={{ marginRight: '5px', color: 'var(--icon-warning)' }} />
      ) : (
        <InsertDriveFileIcon style={{ marginRight: '5px', color: 'var(--icon-success)' }} />
      );
    return (
      <span style={{ display: 'flex', alignItems: 'center' }}>
        {icon}
        {props.value}
      </span>
    );
  };

  const autoGroupColumnDef = useMemo(
    () => ({
      headerName: 'Name',
      minWidth: 300,
      flex: 1,
      field: 'name',
      headerCheckboxSelection: true,
      cellRendererParams: {
        suppressCount: true,
        checkbox: true,
        innerRenderer: NameCellRenderer
      }
    }),
    []
  );

  const columnDefs: any[] = [];

  const defaultColDef = {
    sortable: false,
    filter: false,
    editable: false
  };

  // We don't need these anymore since we're using a custom table layout
  // instead of AG Grid for the review step

  // Capture current grid selections explicitly - used before navigation
  const captureCurrentSelections = () => {
    if (!uploadGridApiRef.current) return [];
    
    const selectedNodes = uploadGridApiRef.current.getSelectedNodes();
    return selectedNodes.map((node: any) => node.data);
  };

  // Modified selection handler that guards against navigation-triggered changes
  const onSelectionChanged = (event: any) => {
    // If we're in the middle of navigation, don't process this event
    if (isNavigatingRef.current) {
      console.log('Ignoring selection change during navigation');
      return;
    }
    
    // Extract all selected nodes and their data
    const selectedNodes = event.api.getSelectedNodes();
    const selectedTemplates = selectedNodes.map((node: any) => node.data);
    
    console.log('Selection changed normally:', selectedTemplates);
    
    // Update our state with the selection
    setSelectedRows([...selectedTemplates]);
  };

  // Enhanced grid ready handler
  const onGridReady = (params: any) => {
    console.log('Grid ready called');
    
    // Store the grid API in our ref
    uploadGridApiRef.current = params.api;
    
    // Restore selections after a short delay
    setTimeout(() => {
      if (uploadGridApiRef.current && selectedRows.length > 0) {
        console.log('Restoring selections in grid:', selectedRows);
        
        // Get all row node IDs to select
        const idsToSelect = selectedRows.map(row => row.id);
        
        // Flag to prevent circular selection events
        isNavigatingRef.current = true;
        
        // For each node in the grid, check if it should be selected
        uploadGridApiRef.current.forEachNode((node: any) => {
          if (node.data && idsToSelect.includes(node.data.id)) {
            node.setSelected(true);
          }
        });
        
        // Reset flag after selection is complete
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 50);
      }
    }, 100);
  };

  const handleConnect = () => {
    console.log('Connecting to:', hostname);
    // Implement connection logic here
  };

  const parseXMLContent = (content: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');

    const showsEntry = xmlDoc.querySelector('entry[name="shows"]');
    if (!showsEntry) return [];

    const rows: any[] = [];
    const details: any[] = [];

    // Parse structure: shows -> <carousel> -> mastertemplates -> <template>
    // The children of showsEntry are the carousels directly
    Array.from(showsEntry.children).forEach((carouselEntry) => {
      const carouselName = carouselEntry.getAttribute('name');
      if (!carouselName || carouselEntry.tagName !== 'entry') return;

      console.log(`Processing carousel: "${carouselName}"`);

      // Look for mastertemplates inside this carousel
      const masterTemplatesEntry = carouselEntry.querySelector(
        'entry[name="mastertemplates"]'
      );

      if (masterTemplatesEntry) {
        // Add the carousel as a row
        rows.push({
          id: carouselName,
          name: carouselName,
          type: 'show', // Using 'show' type for folder icon
          treePath: [carouselName]
        });

        console.log(`Found mastertemplates in carousel "${carouselName}", children:`, masterTemplatesEntry.children.length);

        // Templates are <element> tags, not <entry> tags
        Array.from(masterTemplatesEntry.querySelectorAll('element[name]')).forEach((template) => {
          const templateName = template.getAttribute('name');
          if (templateName) {
            const tabfields: { name: string; value: string }[] = [];
            const tabfieldsEntry = template.querySelector(
              'entry[name="tabfields"]'
            );
            if (tabfieldsEntry) {
              Array.from(tabfieldsEntry.children).forEach((tabfield) => {
                const tabfieldName = tabfield.getAttribute('name');
                const tabfieldValue = tabfield.textContent || '';
                if (tabfieldName) {
                  tabfields.push({ name: tabfieldName, value: tabfieldValue });
                  details.push({
                    template: templateName,
                    tabfield: tabfieldName,
                    value: tabfieldValue
                  });
                }
              });
            }

            console.log(`Template "${templateName}" - carouselName: "${carouselName}" (from parent carousel)`);

            rows.push({
              id: `${carouselName}/${templateName}`,
              name: templateName,
              type: 'template',
              treePath: [carouselName, templateName],
              tabfields,
              carouselName, // Store the parent carousel's name
              showName: carouselName
            });
          }
        });
      }
    });

    setTemplateDetails(details);
    return rows;
  };

  const handleClose = () => {
    setSelectedOption(null);
    setHostname('');
    setSelectedFile(null);
    setRowData([]);
    setSelectedRows([]);
    setTemplateDetails([]);
    setCurrentStepId('choose');
    setError(null);
    uploadGridApiRef.current = null;
    onClose();
  };

  const handleFinish = async () => {
    if (importing) return; // Prevent double submission
    setImporting(true);

    try {
      // Fetch fresh templates directly from the database to ensure we have the latest state
      const { data: freshTemplates, error: fetchError } = await supabase
        .from('templates')
        .select('*')
        .order('order');

      if (fetchError) {
        console.error('Error fetching templates:', fetchError);
        throw fetchError;
      }

      const importResults: { template: string; status: string; id?: string; error?: any }[] = [];
      const skippedTemplates: string[] = [];

      // Process each selected template
      for (const template of selectedTemplateNodes) {
        console.log(`Processing template: ${template.name}`);

        // Get tabfields for this template
        const tabfields = templateDetails
          .filter(detail => detail.template === template.name)
          .map(detail => ({
            name: detail.tabfield,
            value: detail.value
          }));

        // Check if template exists by name (use fresh templates from database)
        const existingTemplate = freshTemplates?.find(t =>
          t.type === 'template' && t.name === template.name
        );

        if (existingTemplate) {
          // Template exists - check if we need to update carousel_name
          if (!existingTemplate.carousel_name && template.carouselName) {
            console.log(`Updating carousel_name for existing template: ${template.name} -> ${template.carouselName}`);
            await updateTemplate(existingTemplate.id, { carousel_name: template.carouselName });
            importResults.push({
              template: template.name,
              status: 'updated'
            });
          } else {
            console.log(`Skipping existing template: ${template.name}`);
            skippedTemplates.push(template.name);
            importResults.push({
              template: template.name,
              status: 'skipped'
            });
          }
        } else {
          console.log(`Creating new template: ${template.name}, carousel_name: ${template.carouselName}`);

          // Use the enhanced function from context to create template with tabfields
          const templateData = {
            name: template.name,
            type: 'template' as const,
            active: true,
            order: (freshTemplates || []).filter(t => !t.parent_id).length,
            carousel_name: template.carouselName // Include carousel name from parsed XML
          };
          console.log('Template data being sent:', templateData);

          const { data: newTemplate, error } = await createTemplateWithTabfields(
            templateData,
            tabfields
          );

          if (error) {
            console.error(`Error creating template ${template.name}:`, error);
            importResults.push({
              template: template.name,
              status: 'error',
              error
            });
          } else {
            importResults.push({
              template: template.name,
              status: 'created',
              id: newTemplate?.id
            });
          }
        }
      }

      console.log('Import results:', importResults);

      // Build success message
      const createdCount = importResults.filter(r => r.status === 'created').length;
      const updatedCount = importResults.filter(r => r.status === 'updated').length;
      const skippedCount = skippedTemplates.length;
      const messageParts: string[] = [];

      if (createdCount > 0) {
        messageParts.push(`Created ${createdCount} new template(s)`);
      }
      if (updatedCount > 0) {
        messageParts.push(`Updated carousel for ${updatedCount} template(s)`);
      }
      if (skippedCount > 0) {
        messageParts.push(`Skipped ${skippedCount} existing template(s)`);
      }

      const message = messageParts.length > 0 ? messageParts.join('. ') + '.' : 'No templates were imported.';

      // Show a success toast
      const hasChanges = createdCount > 0 || updatedCount > 0;
      toaster.show({
        message,
        intent: hasChanges ? Intent.SUCCESS : Intent.WARNING,
        icon: hasChanges ? "tick" : "info-sign",
        timeout: 5000
      });
      
      // Log for debugging
      console.log("Templates imported and refreshed successfully");
      
      // Perform an explicit and forceful refresh of templates data
      console.log('Forcing template refresh...');
      
      // Use a small delay before refreshing to ensure all DB operations have settled
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Force a complete refresh of templates from DB
      await refreshTemplates();
      
      // Add a small delay after refresh to ensure state updates have propagated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('Template refresh completed');
      
      // Close the wizard only after the refresh has completed
      handleClose();
      
    } catch (error: any) {
      console.error('Error importing templates:', error);
      // setImportError removed - not in state

      // Show error toast
      toaster.show({
        message: `Import failed: ${error.message || 'Unknown error'}`,
        intent: Intent.DANGER,
        icon: "error",
        timeout: 4000
      });
    } finally {
      setImporting(false);
      // Don't call handleClose() here, as it would clear importError
      // Let the success path call handleClose() directly
    }    
  };

  const validateFileType = (file: File | null) => {
    if (!file) return false;
    return file.name.toLowerCase() === 'default.xml';
  };

  const getDataPath = (data: any) => {
    return data.treePath;
  };

  // Handle step change with pre-navigation capture
  const handleStepChange = (nextStepId: string) => {
    // Only do special handling when leaving the upload step
    if (currentStepId === 'upload' && nextStepId !== 'upload') {
      console.log(`Navigating from upload to ${nextStepId}`);
      
      // First capture the current selections
      const currentSelections = captureCurrentSelections();
      
      if (currentSelections.length > 0) {
        console.log('Pre-navigation capture:', currentSelections);
        
        // Set flag to prevent selection cleared events from processing
        isNavigatingRef.current = true;
        
        // Update our selection state
        setSelectedRows([...currentSelections]);
      }
      
      // Let the navigation proceed, but maintain our flag
      setCurrentStepId(nextStepId);
      
      // Reset the navigation flag after a delay
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 100);
      
      // We've handled the navigation ourselves
      return;
    }
    
    // For all other transitions, use normal behavior
    setCurrentStepId(nextStepId);
  };

  // This special effect ensures selections are restored when returning to the upload step
  useEffect(() => {
    if (currentStepId === 'upload' && uploadGridApiRef.current && selectedRows.length > 0) {
      console.log('Returning to upload step, restoring selections');
      
      // Get all IDs to select
      const idsToSelect = selectedRows.map(row => row.id);
      
      // Set flag to prevent selection events
      isNavigatingRef.current = true;
      
      // Small delay to ensure the grid is ready
      setTimeout(() => {
        // Ensure grid API is still available
        if (uploadGridApiRef.current) {
          uploadGridApiRef.current.forEachNode((node: any) => {
            if (node.data && idsToSelect.includes(node.data.id)) {
              node.setSelected(true);
            }
          });
        }
        
        // Reset flag
        isNavigatingRef.current = false;
      }, 100);
    }
  }, [currentStepId, selectedRows]);

  return (
    (<MultistepDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Ticker Wizard"
      icon="cog"
      navigationPosition="top"
      onChange={handleStepChange}
      canOutsideClickClose={false}
      finalButtonProps={{ 
        text: 'Finish', 
        intent: 'primary',
        disabled: currentStepId !== 'review' || selectedTemplateNodes.length === 0 || importing,
        loading: importing,
        onClick: handleFinish
      }}
      backButtonProps={{ 
        text: 'Previous',
        disabled: currentStepId === 'choose'
      }}
      nextButtonProps={{ 
        text: 'Next',
        disabled: selectedOption === null && currentStepId === 'choose'
      }}
    >
      {error && (
        <Callout intent="danger" style={{ margin: '10px' }}>
          {error}
        </Callout>
      )}
      <DialogStep
        id="choose"
        title="Choose Option"
        panel={
          <div style={{ padding: '20px' }}>
            <FormGroup label="Choose an option">
              <RadioGroup
                selectedValue={selectedOption as any}
                onChange={(e) =>
                  setSelectedOption(e.currentTarget.value as WizardOption)
                }
              >
                <Radio value="connect" label="Connect to Media Sequencer" />
                <Radio value="upload" label="Upload default.xml" />
              </RadioGroup>
            </FormGroup>
          </div>
        }
      />
      {selectedOption === 'connect' && (
        <DialogStep
          id="connect"
          title="Connect"
          panel={
            <div style={{ padding: '20px' }}>
              <FormGroup label="Hostname or IP" labelFor="hostname">
                <InputGroup
                  id="hostname"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  placeholder="Enter hostname or IP address..."
                />
              </FormGroup>
              <Button
                intent="primary"
                onClick={handleConnect}
                disabled={!hostname}
                style={{ marginTop: '10px' }}
              >
                Test Connection
              </Button>
            </div>
          }
        />
      )}
      {selectedOption === 'upload' && (
        <DialogStep
          id="upload"
          title="Upload"
          panel={
            <div
              style={{
                padding: '20px',
                height: 'calc(70vh - 120px)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <FormGroup
                label="Upload default.xml"
                labelFor="file-input"
                helperText={
                  selectedFile && !validateFileType(selectedFile)
                    ? 'Only default.xml file is allowed'
                    : undefined
                }
                intent={
                  selectedFile && !validateFileType(selectedFile)
                    ? 'danger'
                    : 'none'
                }
              >
                <FileInput
                  id="file-input"
                  text={selectedFile?.name || 'Choose file...'}
                  disabled={loadingFile}
                  onInputChange={(e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file && validateFileType(file)) {
                      setSelectedFile(file);
                      setLoadingFile(true);
                      setRowData([]);
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        const content = e.target?.result as string;
                        const rows = parseXMLContent(content);
                        setRowData(rows);
                        setLoadingFile(false);
                      };
                      reader.onerror = () => {
                        setError('Failed to read file');
                        setLoadingFile(false);
                      };
                      reader.readAsText(file);
                    } else {
                      setSelectedFile(file || null);
                    }
                  }}
                  inputProps={{
                    accept: '.xml'
                  }}
                />
              </FormGroup>
              {loadingFile && (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <Spinner size={40} />
                  <span>Loading templates...</span>
                </div>
              )}
              {!loadingFile && rowData.length > 0 && (
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    border: '1px solid var(--border-gray)',
                    borderRadius: '3px'
                  }}
                >
                  <AgGridReact
                    className="ag-theme-alpine"
                    theme="legacy"
                    rowData={rowData}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    autoGroupColumnDef={autoGroupColumnDef}
                    treeData={true}
                    groupDefaultExpanded={-1}
                    getDataPath={getDataPath}
                    rowSelection={{
                      mode: 'multiRow',
                      enableClickSelection: false,
                      groupSelects: 'descendants'
                    }}
                    onSelectionChanged={onSelectionChanged}
                    onGridReady={onGridReady}
                    domLayout="normal"
                    popupParent={document.body}
                  />
                </div>
              )}
            </div>
          }
        />
      )}
      {selectedOption === 'upload' && rowData.length > 0 && (
        <DialogStep
          id="review"
          title="Review"
          panel={
            <div
              style={{
                padding: '20px',
                height: 'calc(70vh - 120px)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <h3>Selected Templates and Tabfields</h3>
              
              {selectedTemplateNodes.length === 0 ? (
                <div className="bp3-callout bp3-intent-warning">
                  <h4>No templates selected</h4>
                  <p>Please go back to the Upload step and select at least one template.</p>
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {selectedTemplateNodes.map((template) => (
                    <div
                      key={template.id}
                      style={{
                        marginBottom: '20px',
                        border: '1px solid var(--border-gray)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{
                        padding: '10px',
                        backgroundColor: 'var(--bg-medium-gray)',
                        fontWeight: 'bold',
                        borderBottom: '1px solid var(--border-gray)'
                      }}>
                        {template.name}
                      </div>

                      <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{
                                padding: '8px',
                                textAlign: 'left',
                                borderBottom: '1px solid var(--border-gray)',
                                backgroundColor: 'var(--bg-light-gray)',
                                width: '100%'
                              }}>
                                Tabfield
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {templateDetails
                              .filter(detail => detail.template === template.name)
                              .map((detail, detailIndex) => (
                                <tr key={`${template.id}-${detailIndex}`}>
                                  <td style={{
                                    padding: '8px',
                                    borderBottom: '1px solid var(--border-light)'
                                  }}>
                                    {detail.tabfield}
                                  </td>
                                </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          }
        />
      )}
    </MultistepDialog>)
  );
};
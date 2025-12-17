import React, { useState, useEffect } from 'react';
import {
  DialogStep,
  MultistepDialog,
  Button,
  FormGroup,
  InputGroup,
  Callout,
  Intent,
  Toaster,
  HTMLSelect,
  Card,
  Elevation,
  Icon
} from '@blueprintjs/core';
import { supabase, ensureAuth } from '../lib/supabase';
import { createUE5WidgetContent } from '../types/widget';

// Global toaster instance for notifications
const toaster = Toaster.create({
  position: 'top',
});

interface WidgetWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (widgetId: string, widgetName: string) => void;
}

interface RCPPreset {
  Name: string;
  ID: string;
  Path: string;
  fieldCount?: number;
  fields?: RCPField[];
}

interface RCPField {
  name: string;
  type: string;
  defaultValue?: any;
  description?: string;
  presetId: string;
  presetName: string;
}

export const WidgetWizard: React.FC<WidgetWizardProps> = ({ isOpen, onClose, onComplete }) => {
  const [currentStepId, setCurrentStepId] = useState<string>('widget-setup');
  const [widgetName, setWidgetName] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [rcpPresets, setRcpPresets] = useState<RCPPreset[]>([]);
  const [selectedRcps, setSelectedRcps] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [creatingWidget, setCreatingWidget] = useState<boolean>(false);
  
  // Mock channels for now - will be replaced with real channel data later
  const [availableChannels] = useState([
    { id: '1', name: 'UE5 Channel 1', host: 'http://localhost', port: 30010 },
    { id: '2', name: 'UE5 Channel 2', host: 'http://192.168.1.100', port: 30010 },
    { id: '3', name: 'UE5 Channel 3', host: 'http://localhost', port: 30011 }
  ]);


  // Reset state when dialog opens - ALWAYS reset for fresh start
  useEffect(() => {
    if (isOpen) {
      setCurrentStepId('widget-setup');
      setWidgetName('');
      setSelectedChannel(null);
      setRcpPresets([]);
      setSelectedRcps([]);
      setScanError(null);
      setIsScanning(false);
      setCreatingWidget(false);
    }
  }, [isOpen]);

  // Handle step changes
  const handleStepChange = (newStepId: string) => {
    setCurrentStepId(newStepId);
  };

  // RCP Scanning and Selection
  const handleScanRCPs = async () => {
    if (!selectedChannel) {
      setScanError('Please select a channel first');
      return;
    }

    const channel = availableChannels.find(c => c.id === selectedChannel);
    if (!channel) {
      setScanError('Selected channel not found');
      return;
    }

    setIsScanning(true);
    setScanError(null);

    try {
      const baseUrl = `${channel.host}:${channel.port}`;
      const response = await fetch(`${baseUrl}/remote/presets`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.Presets && Array.isArray(data.Presets)) {
          // Get field count for each preset
          const presetsWithFieldCount = await Promise.all(
            data.Presets.map(async (preset: RCPPreset) => {
              try {
                const schemaResponse = await fetch(`${baseUrl}/remote/preset/${preset.Name}`, {
                  method: 'GET',
                  headers: { 'Content-Type': 'application/json' }
                });
                
                if (schemaResponse.ok) {
                  const schema = await schemaResponse.json();
                  
                  // Parse UE5 Remote Control API structure
                  let fieldCount = 0;
                  if (schema.Preset && schema.Preset.Groups && Array.isArray(schema.Preset.Groups)) {
                    // Count all ExposedProperties across all Groups
                    fieldCount = schema.Preset.Groups.reduce((total: number, group: any) => {
                      if (group.ExposedProperties && Array.isArray(group.ExposedProperties)) {
                        return total + group.ExposedProperties.length;
                      }
                      return total;
                    }, 0);
                  }
                  
                  return { ...preset, fieldCount };
                }
              } catch (error) {
                console.warn(`Failed to get schema for preset ${preset.Name}:`, error);
              }
              return { ...preset, fieldCount: 0 };
            })
          );
        
        setRcpPresets(presetsWithFieldCount);
        setSelectedRcps([]); // Reset selection
        console.log('RCP presets loaded:', presetsWithFieldCount);
        
        toaster.show({
          message: `Found ${presetsWithFieldCount.length} RCP presets`,
          intent: Intent.SUCCESS,
          timeout: 3000,
        });
      } else {
        throw new Error('Invalid response format from UE5 server');
      }
    } catch (error) {
      console.error('Error scanning RCPs:', error);
      setScanError(error instanceof Error ? error.message : 'Unknown error occurred');
      
      toaster.show({
        message: `Failed to scan RCPs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        intent: Intent.DANGER,
        timeout: 5000,
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleRcpSelection = (rcpId: string, isSelected: boolean) => {
    console.log(`RCP ${isSelected ? 'selected' : 'deselected'}: ${rcpId}`);
    if (isSelected) {
      setSelectedRcps(prev => [...prev, rcpId]);
    } else {
      setSelectedRcps(prev => prev.filter(id => id !== rcpId));
    }
  };

  const handleSelectAllRcps = () => {
      const allRcpIds = rcpPresets.map(preset => preset.ID);
      console.log('Selecting all RCPs:', allRcpIds);
      setSelectedRcps(allRcpIds);
  };

  // Map UE5 types to our field types
  const mapUE5TypeToFieldType = (ue5Type: string): string => {
    switch (ue5Type) {
      case 'FString':
        return 'string';
      case 'FText':
        return 'string';
      case 'FName':
        return 'string';
      case 'FInt32':
      case 'FInt64':
      case 'FInt16':
      case 'FInt8':
        return 'number';
      case 'FFloat':
      case 'FDouble':
        return 'number';
      case 'FBool':
        return 'boolean';
      default:
        return 'string'; // Default to string for unknown types
    }
  };

  // Fetch fields for selected RCP presets
  const fetchRCPFields = async (selectedRcpIds: string[]) => {
    if (!selectedChannel || selectedRcpIds.length === 0) return [];

    const channel = availableChannels.find(c => c.id === selectedChannel);
    if (!channel) return [];

    const allFields: RCPField[] = [];

    try {
      // Fetch fields for each selected RCP preset
      for (const rcpId of selectedRcpIds) {
        const preset = rcpPresets.find(p => p.ID === rcpId);
        if (!preset) continue;

        const response = await fetch(`${channel.host}:${channel.port}/remote/preset/${preset.Name}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const schema = await response.json();
          
          // Parse UE5 Remote Control API structure
          if (schema.Preset && schema.Preset.Groups && Array.isArray(schema.Preset.Groups)) {
            schema.Preset.Groups.forEach((group: any) => {
              if (group.ExposedProperties && Array.isArray(group.ExposedProperties)) {
                group.ExposedProperties.forEach((exposedProp: any) => {
                  allFields.push({
                    name: exposedProp.DisplayName || exposedProp.UnderlyingProperty?.Name || 'Unknown',
                    type: mapUE5TypeToFieldType(exposedProp.UnderlyingProperty?.Type || 'FString'),
                    defaultValue: '', // UE5 doesn't provide default values in this API
                    description: exposedProp.UnderlyingProperty?.Description || '',
                    presetId: rcpId,
                    presetName: preset.Name
                  });
                });
              }
            });
          }
        } else {
          console.warn(`Failed to fetch fields for preset ${preset.Name}: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Error fetching RCP fields:', error);
    }

    return allFields;
  };

  // Widget Creation
  const handleCreateWidget = async () => {
    if (creatingWidget) {
      return;
    }
    
    setCreatingWidget(true);

    try {
      await ensureAuth();
      
      if (!widgetName.trim()) {
        throw new Error('Please enter a widget name');
      }
      
      if (!selectedChannel) {
        throw new Error('Please select a channel');
      }
      
      if (selectedRcps.length === 0) {
        throw new Error('Please select at least one RCP preset');
      }

      const channel = availableChannels.find(c => c.id === selectedChannel);
      if (!channel) {
        throw new Error('Selected channel not found');
      }

      console.log('Fetching RCP fields...');
      // Fetch all fields from selected RCP presets
      const rcpFields = await fetchRCPFields(selectedRcps);
      
      if (rcpFields.length === 0) {
        throw new Error('No fields found in selected RCP presets');
      }

      console.log(`Found ${rcpFields.length} fields from ${selectedRcps.length} presets`);

      // Create content item for the widget using proper types
      const contentData = createUE5WidgetContent(
        widgetName,
        'unreal', // Default to unreal for now
        {
          host: channel.host,
          port: channel.port,
          timeout: 5000,
          retryAttempts: 3
        },
        rcpPresets,
        selectedRcps,
        rcpFields,
        null // Widgets are shared amongst all users, not user-specific
      );

      console.log('Creating widget in database...', contentData);

      const { data: newContent, error: contentError } = await supabase
        .from('content')
        .insert(contentData)
        .select()
        .single();

      if (contentError) {
        console.error('Content creation error:', contentError);
        throw contentError;
      }

      console.log('Widget created successfully:', newContent);

      // Show success message
      toaster.show({
        message: `Widget "${widgetName}" created successfully! Found ${rcpFields.length} fields from ${selectedRcps.length} presets. Opening Widget Builder...`,
        intent: Intent.SUCCESS,
        icon: "tick",
        timeout: 4000
      });
      
      // Call the completion callback with the created widget ID and name
      if (onComplete) {
        try {
          onComplete(newContent.id, widgetName);
        } catch (callbackError) {
          console.error('Error in onComplete callback:', callbackError);
        }
      }
      
      // Close the wizard
      onClose();
      
    } catch (error) {
      console.error('Error creating widget:', error);
      toaster.show({
        message: `Failed to create widget: ${error instanceof Error ? error.message : 'Unknown error'}`,
        intent: Intent.DANGER,
        timeout: 5000,
      });
    } finally {
      setCreatingWidget(false);
    }
  };


  return (
    <>
      <MultistepDialog
        {...({
          isOpen,
          onClose,
          title: "Widget Wizard",
          icon: "widget",
          className: "widget-wizard-dialog",
          navigationPosition: "top",
          currentStepId,
          onChange: handleStepChange,
          canOutsideClickClose: false,
          finalButtonProps: {
            text: 'Create Widget',
            intent: Intent.PRIMARY,
            disabled: currentStepId !== 'rcp-selection' || selectedRcps.length === 0 || creatingWidget,
            loading: creatingWidget,
            onClick: () => {
              handleCreateWidget();
            }
          },
          nextButtonProps: {
            text: 'Next',
            intent: Intent.PRIMARY,
            disabled: !widgetName.trim() || !selectedChannel || rcpPresets.length === 0
          }
        } as any)}
      >
      {/* Step 1: Widget Name and Channel Selection */}
      <DialogStep
        id="widget-setup"
        title="Widget Setup"
        panel={
          <div style={{ padding: '20px' }}>
            <Callout intent={Intent.PRIMARY} style={{ marginBottom: '20px' }}>
              Enter a name for your widget and select the UE5 channel to connect to.
            </Callout>
            
            <FormGroup label="Widget Name" labelFor="widget-name">
              <InputGroup
                id="widget-name"
                value={widgetName}
                onChange={(e) => setWidgetName(e.target.value)}
                placeholder="Enter widget name"
                leftIcon="widget"
              />
            </FormGroup>

            <FormGroup label="Select Channel" labelFor="channel-select">
              <HTMLSelect
                id="channel-select"
                value={selectedChannel || ''}
                onChange={(e) => setSelectedChannel(e.target.value || null)}
                fill
              >
                <option value="">Choose a channel...</option>
                {availableChannels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name} ({channel.host}:{channel.port})
                  </option>
                ))}
              </HTMLSelect>
            </FormGroup>

            {selectedChannel && (
                  <div style={{ marginTop: '20px' }}>
                    <Button
                  text="Scan RCP Presets"
                      icon="search"
                      intent={Intent.PRIMARY}
                      onClick={handleScanRCPs}
                      loading={isScanning}
                    />
                
                  {scanError && (
                  <Callout intent={Intent.DANGER} style={{ marginTop: '10px' }}>
                    <strong>Scan Error:</strong> {scanError}
              </Callout>
                  )}
                </div>
            )}

            </div>
          }
          nextButtonProps={{
          text: 'Next',
          intent: Intent.PRIMARY,
          disabled: !widgetName.trim() || !selectedChannel || rcpPresets.length === 0
          }}
        />

      {/* Step 2: RCP Selection */}
      <DialogStep
        id="rcp-selection"
        title="Select RCP Presets"
        panel={
          <div style={{ padding: '20px' }}>
            <Callout intent={Intent.PRIMARY} style={{ marginBottom: '20px' }}>
              Choose which Remote Control Presets (RCPs) you want to include in your widget. You can select multiple presets.
            </Callout>

            {rcpPresets.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <Button
                  text="Select All"
                  icon="tick"
                  minimal
                  onClick={handleSelectAllRcps}
                  disabled={selectedRcps.length === rcpPresets.length}
                />
                <Button
                  text="Deselect All"
                  icon="cross"
                  minimal
                  onClick={() => setSelectedRcps([])}
                  disabled={selectedRcps.length === 0}
                  style={{ marginLeft: '8px' }}
                />
              </div>
            )}

            <Card elevation={Elevation.ONE} style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {rcpPresets.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Icon icon="warning-sign" size={24} style={{ marginBottom: '8px' }} />
                  <div>No RCP presets found. Click "Scan RCP Presets" to detect available presets.</div>
                </div>
              ) : (
                <>
                  <div style={{ padding: '16px', borderBottom: '1px solid var(--border-gray)' }}>
                    <strong>Available RCP Presets ({rcpPresets.length})</strong>
                  </div>
                  <div style={{ padding: '16px' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {rcpPresets.map((preset) => (
                        <li key={preset.ID} style={{ marginBottom: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={selectedRcps.includes(preset.ID)}
                              onChange={(e) => handleRcpSelection(preset.ID, e.target.checked)}
                              style={{ marginRight: '8px' }}
                            />
                            {preset.Name} ({preset.fieldCount || 0} Fields)
                          </label>
                          </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </Card>



          </div>
        }
      />

    </MultistepDialog>
    </>
  );
};
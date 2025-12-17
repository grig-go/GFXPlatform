// Database types for UE5 Widget configuration
// This file defines the proper structure for storing widget data in Supabase

export interface UE5WidgetConfig {
  widgetType: 'unreal' | 'viz';
  connectionSettings: {
    host: string;
    port: number;
    timeout?: number;
    retryAttempts?: number;
    passphrase?: string; // RCP API passphrase for batch requests
  };
  rcpPresets: RCPPreset[];
  selectedRcps: string[];
  rcpFields?: RCPField[];
  formFields?: any[]; // Form field definitions
  formValues?: Record<string, any>; // Saved form values from Preview tab
}

export interface RCPPreset {
  Name: string;
  ID: string;
  Path: string;
  Type?: string;
  Description?: string;
}

export interface RCPField {
  name: string;
  type: string;
  defaultValue?: any;
  description?: string;
  presetId: string;
  presetName: string;
}

export interface ContentItem {
  id: string;
  name: string;
  type: 'bucket' | 'template' | 'widget';
  active: boolean;
  order: number;
  parent_id?: string | null;
  user_id?: string | null; // Allow null for shared widgets
  created_at?: string;
  updated_at?: string;

  // Widget-specific fields
  config?: string; // JSON string of UE5WidgetConfig
  widget_type?: 'unreal' | 'viz';
  connection_settings?: string; // JSON string
  rcp_presets?: string; // JSON string
  rcp_fields?: string; // JSON string of RCPField[]
}

// New Channel type - represents the main channels table
export interface Channel {
  id: string;
  name: string;
  type: 'Unreal' | 'Vizrt' | 'Pixera' | 'Web';
  active?: boolean;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Channel Playlist type - represents the channel_playlists table (formerly channels)
export interface ChannelPlaylistItem {
  id: string;
  name: string;
  type: 'channel' | 'playlist' | 'bucket';
  active: boolean;
  order: number;
  parent_id?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  schedule?: string;
  content_id?: string;
  display_name?: string;
  carousel_name?: string;
  carousel_type?: string;
  channel_id?: string; // Foreign key to channels table
}

// Keep the old name for compatibility
export interface ChannelItem extends ChannelPlaylistItem {}

export interface TemplateItem {
  id: string;
  name: string;
  type: 'templateFolder' | 'template';
  active: boolean;
  order: number;
  parent_id?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TabField {
  id: string;
  template_id: string;
  name: string;
  value: string;
  options?: {
    type?: string;
    label?: string;
    required?: boolean;
    placeholder?: string;
    description?: string;
    choices?: Array<{ label: string; value: string }>;
  };
}

// Helper functions for working with widget configurations
export const parseWidgetConfig = (configString: string | any): UE5WidgetConfig | null => {
  try {
    // If it's already an object, return it
    if (typeof configString === 'object' && configString !== null) {
      return configString as UE5WidgetConfig;
    }
    // If it's a string, parse it
    if (typeof configString === 'string') {
      return JSON.parse(configString);
    }
    return null;
  } catch (error) {
    console.error('Failed to parse widget config:', error);
    return null;
  }
};

export const stringifyWidgetConfig = (config: UE5WidgetConfig): string => {
  return JSON.stringify(config);
};

export const createUE5WidgetContent = (
  name: string,
  widgetType: 'unreal' | 'viz',
  connectionSettings: UE5WidgetConfig['connectionSettings'],
  rcpPresets: RCPPreset[],
  selectedRcps: string[],
  rcpFields?: RCPField[],
  _userId?: string | null
): Partial<ContentItem> => {
  // Auto-generate formFields from rcpFields for new widgets
  const formFields = rcpFields ? rcpFields.map((rcpField, index) => {
    const isImageGenField = rcpField.name.startsWith('*');
    
    // Map RCP type to form field type
    const getFieldType = (rcpType: string): 'text' | 'number' | 'boolean' | 'select' | 'textarea' => {
      const type = rcpType.toLowerCase();
      if (type.includes('bool')) return 'boolean';
      if (type.includes('int') || type.includes('float') || type.includes('double')) return 'number';
      return 'text';
    };
    
    return {
      id: `field_${Date.now()}_${index}`,
      name: rcpField.name,
      label: `${rcpField.presetName} - ${rcpField.name}`,
      type: isImageGenField ? 'text' : getFieldType(rcpField.type),
      required: false,
      placeholder: isImageGenField ? 'Image URL (Generate with AI)' : `Enter ${rcpField.name}`,
      defaultValue: rcpField.defaultValue,
      rcpVariable: {
        ...rcpField,
        type: isImageGenField ? 'Image Generation' : rcpField.type
      }
    };
  }) : [];

  const config: UE5WidgetConfig = {
    widgetType,
    connectionSettings,
    rcpPresets: rcpPresets.filter(preset => selectedRcps.includes(preset.ID)),
    selectedRcps,
    rcpFields,
    formFields, // Auto-save form fields on creation
    formValues: {} // Initialize empty form values
  };

  return {
    name,
    type: 'widget',
    active: true,
    order: 0,
    parent_id: null,
    user_id: null, // Set to null for shared widgets
    config: stringifyWidgetConfig(config),
    widget_type: widgetType,
    connection_settings: JSON.stringify(connectionSettings),
    rcp_presets: JSON.stringify(rcpPresets.filter(preset => selectedRcps.includes(preset.ID))),
    rcp_fields: rcpFields ? JSON.stringify(rcpFields) : undefined
  };
};


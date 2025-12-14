// types/project.ts
// Project system types and interfaces

export interface Project {
  id: string;
  name: string;
  description?: string;
  default_channel_id?: string;
  default_instance_id?: string;
  settings: ProjectSettings;
  color: string;
  icon: string;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  
  // Joined data
  channel_name?: string;
  channel_config?: any;
  instance_name?: string;
  set_manager_json?: any;
}

// AI instruction aliases for scene configuration
export interface AIFieldAlias {
  alias: string;           // What the user says (e.g., "Top", "Background", "Pattern")
  field: string;           // The actual field name (e.g., "ElementTop", "environment_background", "BaseTop")
  options?: Record<string, string>; // Map of friendly names to actual option IDs
}

export interface AIInstructions {
  enabled?: boolean;
  aliases?: AIFieldAlias[];
  custom_instructions?: string;  // Free-form instructions for the AI
}

export interface ProjectSettings {
  auto_load_instance?: boolean;
  auto_apply_scene?: boolean;
  default_aspect_ratio?: string;
  project_type?: string;  // 'VirtualSet', 'Airport', etc.
  ai_instructions?: AIInstructions;
}

export interface CreateProjectParams {
  name: string;
  description?: string;
  default_channel_id?: string;
  default_instance_id?: string;
  color?: string;
  icon?: string;
  settings?: ProjectSettings;
}

export interface UpdateProjectParams extends Partial<CreateProjectParams> {
  id: string;
}

// Color options for project badges
export const PROJECT_COLORS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'green', label: 'Green', class: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'red', label: 'Red', class: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-100 text-pink-800 border-pink-300' },
  { value: 'gray', label: 'Gray', class: 'bg-gray-100 text-gray-800 border-gray-300' },
];

// Icon options for projects
export const PROJECT_ICONS = [
  '📁', '🎬', '🎥', '📺', '🖥️', '🎨', '🎭', '🏠', '🌆', '🌅', 
  '🎪', '🎯', '⚡', '🔥', '💎', '🚀', '🌟', '✨', '🎮', '🎤'
];

export function getColorClass(color: string): string {
  const found = PROJECT_COLORS.find(c => c.value === color);
  return found?.class || PROJECT_COLORS[0].class;
}

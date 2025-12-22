// Settings UI types

export type SettingsTab = 'profile' | 'organization' | 'admin' | 'tickets';

export interface SettingsPageProps {
  /** Available tabs to show (default: all tabs user has access to) */
  availableTabs?: SettingsTab[];
  /** Whether to show AI settings in profile (default: false) */
  showAISettings?: boolean;
  /** Callback when navigating back */
  onBack?: () => void;
  /** Callback when tab changes */
  onTabChange?: (tab: SettingsTab) => void;
  /** Initial tab to show */
  initialTab?: SettingsTab;
  /** Custom base path for navigation (default: /settings) */
  basePath?: string;
}

export interface ProfileSettingsProps {
  /** Whether to show AI settings section */
  showAISettings?: boolean;
}

export interface OrganizationSettingsProps {
  /** Whether user can edit organization settings */
  canEdit?: boolean;
}

export interface AdminPanelProps {
  /** Callback when user is invited */
  onUserInvited?: () => void;
  /** Callback when member role is updated */
  onMemberRoleUpdated?: () => void;
}

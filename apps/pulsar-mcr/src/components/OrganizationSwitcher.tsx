/**
 * Organization Switcher Component
 *
 * Allows superusers to impersonate different organizations.
 * Shows in the Settings menu when logged in as a superuser.
 */

import { MenuItem, MenuDivider } from '@blueprintjs/core';
import BusinessIcon from '@mui/icons-material/Business';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ClearIcon from '@mui/icons-material/Clear';
import { useAuth } from '../contexts/AuthContext';

interface OrganizationSwitcherProps {
  /** Called when an organization is selected or cleared */
  onSelect?: () => void;
}

export function OrganizationSwitcher({ onSelect }: OrganizationSwitcherProps) {
  const {
    isSuperuser,
    availableOrganizations,
    effectiveOrganization,
    impersonatedOrganization,
    impersonateOrganization,
    clearImpersonation,
  } = useAuth();

  // Only render for superusers
  if (!isSuperuser) {
    return null;
  }

  const handleSelectOrganization = (org: typeof availableOrganizations[0]) => {
    impersonateOrganization(org);
    onSelect?.();
  };

  const handleClearImpersonation = () => {
    clearImpersonation();
    onSelect?.();
  };

  return (
    <>
      <MenuDivider title="Organization Context" />
      {impersonatedOrganization && (
        <MenuItem
          icon={<ClearIcon style={{ width: 16, height: 16, color: '#f57c00' }} />}
          text="Clear Impersonation"
          labelElement={
            <span style={{ fontSize: '11px', opacity: 0.7, color: '#f57c00' }}>
              {impersonatedOrganization.name}
            </span>
          }
          onClick={handleClearImpersonation}
        />
      )}
      {availableOrganizations.length === 0 ? (
        <MenuItem
          icon={<BusinessIcon style={{ width: 16, height: 16 }} />}
          text="No organizations available"
          disabled
        />
      ) : (
        <MenuItem
          icon={<SwapHorizIcon style={{ width: 16, height: 16 }} />}
          text="Switch Organization"
        >
          {availableOrganizations.map((org) => (
            <MenuItem
              key={org.id}
              icon={<BusinessIcon style={{ width: 16, height: 16 }} />}
              text={org.name}
              labelElement={
                effectiveOrganization?.id === org.id ? (
                  <span style={{ fontSize: '11px', color: '#4caf50' }}>Active</span>
                ) : undefined
              }
              onClick={() => handleSelectOrganization(org)}
              active={effectiveOrganization?.id === org.id}
            />
          ))}
        </MenuItem>
      )}
    </>
  );
}

export default OrganizationSwitcher;

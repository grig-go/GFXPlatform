import React from 'react';

interface AgCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * A checkbox component that matches AG Grid's built-in checkbox styling.
 * Uses AG Grid's CSS classes for consistent appearance.
 */
const AgCheckbox: React.FC<AgCheckboxProps> = ({ checked, onChange, disabled = false }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%'
      }}
    >
      <div
        className={`ag-checkbox-input-wrapper${checked ? ' ag-checked' : ''}${disabled ? ' ag-disabled' : ''}`}
        role="presentation"
        style={{ cursor: disabled ? 'default' : 'pointer', position: 'relative' }}
        onClick={(e) => {
          if (!disabled) {
            e.stopPropagation();
            onChange(!checked);
          }
        }}
      >
        <input
          type="checkbox"
          className="ag-input-field-input ag-checkbox-input"
          checked={checked}
          disabled={disabled}
          onChange={() => {}} // Handled by wrapper click
          style={{ cursor: disabled ? 'default' : 'pointer' }}
        />
      </div>
    </div>
  );
};

export default AgCheckbox;

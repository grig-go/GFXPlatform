import React from 'react';
import {
  HTMLSelect,
  Navbar,
  NavbarGroup,
  NavbarHeading,
  Alignment,
  Icon,
} from '@blueprintjs/core';
import { ElectionYear, ElectionType, getAvailableYears } from './data/electionData';

interface ElectionNavbarProps {
  selectedYear: ElectionYear;
  selectedType: ElectionType;
  onYearChange: (year: ElectionYear) => void;
  onTypeChange: (type: ElectionType) => void;
  onSettingsClick: () => void;
}

export function ElectionNavbar({ selectedYear, selectedType, onYearChange, onTypeChange, onSettingsClick }: ElectionNavbarProps) {
  const availableYears = getAvailableYears(selectedType);
  
  // Ensure selected year is valid for the current type
  React.useEffect(() => {
    console.log('ElectionNavbar effect - selectedType:', selectedType, 'selectedYear:', selectedYear);
    if (!availableYears.includes(selectedYear)) {
      console.log('Year not available for type, changing to:', availableYears[0]);
      onYearChange(availableYears[0] as ElectionYear);
    }
  }, [selectedType, selectedYear, availableYears, onYearChange]);

  return (
    <Navbar className="dark:bg-gray-800 shadow-sm !z-40 !bg-[#1c1919]">
      <NavbarGroup align={Alignment.LEFT}>
        <NavbarHeading className="flex items-center gap-2" style={{ color: '#ffffff' }}>
          <Icon icon="map" size={24} style={{ color: '#ffffff' }} />
          US {selectedType === 'presidential' ? 'Presidential' : 'Senate'} Elections
        </NavbarHeading>
      </NavbarGroup>
      <NavbarGroup align={Alignment.RIGHT}>        
        <HTMLSelect
          value={selectedType}
          onChange={(e) => onTypeChange(e.target.value as ElectionType)}
          className="mr-4"
        >
          <option value="presidential">Presidential</option>
          <option value="senate">Senate</option>
          <option value="house">House</option>
        </HTMLSelect>
        <HTMLSelect
          value={selectedYear}
          onChange={(e) => onYearChange(parseInt(e.target.value) as ElectionYear)}
        >
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </HTMLSelect>
        <button
          onClick={onSettingsClick}
          className="ml-4 rounded-full hover:bg-gray-700/50 transition-colors"
          aria-label="Settings"
        >
          <Icon icon="cog" size={20} style={{ color: '#ffffff' }} />
        </button>
      </NavbarGroup>
    </Navbar>
  );
}
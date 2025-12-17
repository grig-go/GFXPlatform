import React from 'react';
import { X } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  telestratorEnabled: boolean;
  onTelestratorToggle: (enabled: boolean) => void;
  telestratorColor: string;
  onColorChange: (color: string) => void;
}

const colorOptions = [
  { name: 'Black', value: '#000000' },
  { name: 'Red', value: '#DC2626' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Green', value: '#16A34A' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Purple', value: '#9333EA' },
  { name: 'Orange', value: '#EA580C' },
  { name: 'White', value: '#FFFFFF' },
];

export function SettingsPanel({ 
  isOpen, 
  onClose, 
  telestratorEnabled, 
  onTelestratorToggle, 
  telestratorColor, 
  onColorChange 
}: SettingsPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Settings Panel */}
      <div className="relative bg-[#1e1b1b] dark:bg-gray-800/95 backdrop-blur-lg shadow-xl border border-gray-200/50 dark:border-gray-600/50 rounded-l-xl w-80 h-full overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white dark:text-white">Settings</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:text-white dark:text-white transition-colors"
              aria-label="Close settings"
            >
              <X className="w-5 h-5 text-white dark:text-white" />
            </button>
          </div>

          {/* Telestrator Section */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
              <h3 className="text-lg font-semibold text-white dark:text-white mb-3">
                Telestrator
              </h3>
              
              {/* Toggle Switch */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-white dark:text-white">
                  Enable Drawing
                </span>
                <button
                  onClick={() => onTelestratorToggle(!telestratorEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    telestratorEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      telestratorEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Color Picker */}
              {telestratorEnabled && (
                <div>
                  <label className="block text-sm font-medium text-white dark:text-white mb-2">
                    Drawing Color
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => onColorChange(color.value)}
                        className={`w-12 h-12 rounded-lg border-2 transition-all hover:scale-105 ${
                          telestratorColor === color.value
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      >
                        {color.value === '#FFFFFF' && (
                          <div className="w-full h-full rounded-md border border-gray-300" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            {telestratorEnabled && (
              <div className="bg-[#aec9ed] dark:bg-blue-900/20 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>How to use:</strong> Click and drag on the map to draw.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
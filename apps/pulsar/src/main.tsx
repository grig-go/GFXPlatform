import React from 'react';
import ReactDOM from 'react-dom/client';
import { AllEnterpriseModule, LicenseManager, ModuleRegistry } from 'ag-grid-enterprise';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

// Set the license key from environment variable
if (import.meta.env.VITE_AG_GRID_LICENSE_KEY) {
  ModuleRegistry.registerModules([AllEnterpriseModule]);
  LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE_KEY);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
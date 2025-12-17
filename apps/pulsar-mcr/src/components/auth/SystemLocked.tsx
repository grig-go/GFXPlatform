/**
 * System Locked Component for Pulsar
 *
 * Displayed when no superuser exists in the system.
 * Instructs users to run the create-superuser script.
 */

import React from 'react';
import { Card, Callout, Intent, Code } from '@blueprintjs/core';

export const SystemLocked: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#1c2127',
        padding: '20px',
      }}
    >
      <Card
        elevation={3}
        style={{
          width: '100%',
          maxWidth: '500px',
          padding: '30px',
          backgroundColor: '#252a31',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              backgroundColor: 'rgba(217, 130, 43, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <span style={{ fontSize: '40px' }}>🔒</span>
          </div>
          <h2 style={{ margin: '0 0 10px', color: '#f5f8fa' }}>System Not Initialized</h2>
          <p style={{ margin: 0, color: '#a7b6c2', fontSize: '14px' }}>
            Pulsar requires a superuser account to be created before use.
          </p>
        </div>

        <Callout intent={Intent.WARNING} title="Setup Required" style={{ marginBottom: '20px' }}>
          No superuser account exists. A system administrator must create one before anyone can
          access the application.
        </Callout>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#f5f8fa', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💻</span> To create a superuser:
          </h4>
          <div
            style={{
              backgroundColor: '#1c2127',
              borderRadius: '6px',
              padding: '15px',
              fontFamily: 'monospace',
            }}
          >
            <Code>npm run create-superuser</Code>
          </div>
          <p style={{ color: '#a7b6c2', fontSize: '13px', marginTop: '10px' }}>
            Run this command in the project directory. You'll be prompted to enter an email address
            and password for the superuser account.
          </p>
        </div>

        <div
          style={{
            borderTop: '1px solid #394b59',
            paddingTop: '15px',
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#a7b6c2', fontSize: '13px', margin: 0 }}>
            Once the superuser is created, refresh this page to access the login screen.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default SystemLocked;

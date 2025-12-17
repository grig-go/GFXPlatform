/**
 * System Locked Component
 *
 * Displayed when no superuser exists in the system.
 * Instructs users to run the create-superuser script.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Terminal, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface SystemLockedProps {
  appName?: 'Nova' | 'Pulsar';
}

export function SystemLocked({ appName = 'Nova' }: SystemLockedProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <motion.div
                className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center"
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </motion.div>
            </div>
            <CardTitle className="text-2xl">System Not Initialized</CardTitle>
            <CardDescription>
              {appName} requires a superuser account to be created before use.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Setup Required</AlertTitle>
              <AlertDescription>
                No superuser account exists. A system administrator must create one before anyone can access the application.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                To create a superuser:
              </h4>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <code>npm run create-superuser</code>
              </div>
              <p className="text-sm text-muted-foreground">
                Run this command in the project directory. You'll be prompted to enter an email address and password for the superuser account.
              </p>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground text-center">
                Once the superuser is created, refresh this page to access the login screen.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

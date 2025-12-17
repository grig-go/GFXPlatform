import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { AlertCircle } from 'lucide-react';

interface WeatherErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error: string | null;
  details?: any;
}

export function WeatherErrorDialog({ open, onOpenChange, error, details }: WeatherErrorDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <AlertDialogTitle>Weather Data Error</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-base">{error || 'Failed to load weather data'}</p>
              
              {details && (
                <div className="mt-4 rounded-md bg-gray-100 p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Technical Details:</p>
                  <pre className="text-xs text-gray-600 overflow-auto max-h-60">
                    {JSON.stringify(details, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <p className="font-semibold">How to add weather locations:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Go to the Backend Data Viewer (Database button in the sidebar)</li>
                  <li>Click on the "Location Search" tab</li>
                  <li>Search for and add cities you want to track</li>
                  <li>Locations will be saved to the weather_locations table</li>
                  <li>Come back and enable the weather checkbox to see them on the map</li>
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            Close
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
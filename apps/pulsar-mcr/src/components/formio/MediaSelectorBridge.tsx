import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MediaSelector } from '../MediaSelector';
import { setMediaSelectorCallback } from './ImageComponent';
import type { MediaAsset, MediaType } from '../../types/sponsor';

interface PendingSelection {
  componentId: string;
  allowedTypes: MediaType[];
  onSelect: (media: MediaAsset) => void;
}

/**
 * MediaSelectorBridge
 *
 * This component bridges the FormIO ImageUploadComponent (vanilla JS) with the
 * React-based MediaSelector component. It sets up a global callback that FormIO
 * components can use to open the media library dialog.
 *
 * Usage: Mount this component once in your app (e.g., in FormEditor or a parent component)
 * to enable the "Browse Media Library" functionality in FormIO image upload components.
 *
 * Example:
 * ```tsx
 * <FormEditor ... />
 * <MediaSelectorBridge />
 * ```
 */
export const MediaSelectorBridge: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [allowedTypes, setAllowedTypes] = useState<MediaType[]>(['image']);
  const pendingSelectionRef = useRef<PendingSelection | null>(null);

  // Set up the global callback when the component mounts
  useEffect(() => {
    const handleOpenMediaSelector = (
      componentId: string,
      types: string[],
      onSelect: (media: MediaAsset) => void
    ) => {
      // Store the pending selection info
      pendingSelectionRef.current = {
        componentId,
        allowedTypes: types as MediaType[],
        onSelect
      };

      // Update state to open the dialog
      setAllowedTypes(types as MediaType[]);
      setOpen(true);
    };

    // Register the callback
    setMediaSelectorCallback(handleOpenMediaSelector);

    // Cleanup on unmount
    return () => {
      setMediaSelectorCallback(null);
    };
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    pendingSelectionRef.current = null;
  }, []);

  const handleSelect = useCallback((media: MediaAsset) => {
    // Call the pending selection callback
    if (pendingSelectionRef.current?.onSelect) {
      pendingSelectionRef.current.onSelect(media);
    }

    // Close the dialog
    setOpen(false);
    pendingSelectionRef.current = null;
  }, []);

  return (
    <MediaSelector
      open={open}
      onClose={handleClose}
      onSelect={handleSelect}
      allowedTypes={allowedTypes}
      title="Select Image from Media Library"
      zIndex={10100}
    />
  );
};

export default MediaSelectorBridge;

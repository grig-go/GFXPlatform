import { create } from 'zustand';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';

interface ConfirmOptions {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  options: null,
  resolve: null,

  confirm: (options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        options,
        resolve,
      });
    });
  },

  handleConfirm: () => {
    const { resolve } = get();
    if (resolve) {
      resolve(true);
    }
    set({ isOpen: false, options: null, resolve: null });
  },

  handleCancel: () => {
    const { resolve } = get();
    if (resolve) {
      resolve(false);
    }
    set({ isOpen: false, options: null, resolve: null });
  },
}));

// Hook for easy access to confirm function
export function useConfirm() {
  const confirm = useConfirmStore((state) => state.confirm);
  return confirm;
}

// Provider component to render the dialog
export function ConfirmProvider() {
  const { isOpen, options, handleConfirm, handleCancel } = useConfirmStore();

  if (!options) return null;

  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
      title={options.title}
      description={options.description}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
      variant={options.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}

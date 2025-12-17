import { toast as sonnerToast } from 'sonner';

interface Toast {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = (newToast: Toast) => {
    const message = newToast.description
      ? `${newToast.title}: ${newToast.description}`
      : newToast.title;

    if (newToast.variant === 'destructive') {
      sonnerToast.error(message);
    } else {
      sonnerToast.success(message);
    }
  };

  return { toast };
}
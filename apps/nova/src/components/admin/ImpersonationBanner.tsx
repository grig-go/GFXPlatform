import { AlertCircle, X } from 'lucide-react';
import { Button } from '../ui/button';

interface ImpersonationBannerProps {
  organizationName: string;
  onEndImpersonation: () => void;
}

export function ImpersonationBanner({ organizationName, onEndImpersonation }: ImpersonationBannerProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 py-2 px-4 flex items-center justify-center gap-4 shadow-md">
      <AlertCircle className="w-5 h-5" />
      <span className="font-medium">
        Viewing as: <strong>{organizationName}</strong>
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onEndImpersonation}
        className="ml-4 bg-amber-600 hover:bg-amber-700 text-white border-amber-700"
      >
        <X className="w-4 h-4 mr-1" />
        Exit
      </Button>
    </div>
  );
}

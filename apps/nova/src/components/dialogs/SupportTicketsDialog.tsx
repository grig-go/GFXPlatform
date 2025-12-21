/**
 * Support Tickets Dialog
 *
 * Standalone modal for viewing and managing support tickets.
 * Only visible to users with @emergent.new email domain.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { SupportTicketsPanel } from "../settings/SupportTicketsPanel";

interface SupportTicketsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportTicketsDialog({
  open,
  onOpenChange,
}: SupportTicketsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Support Tickets</DialogTitle>
          <DialogDescription>
            View and manage support tickets from all applications.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[calc(85vh-120px)]">
          <SupportTicketsPanel />
        </div>
      </DialogContent>
    </Dialog>
  );
}

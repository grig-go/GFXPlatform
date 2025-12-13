import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Textarea,
  cn,
} from '@emergent-platform/ui';
import { Bug, Lightbulb, HelpCircle, MoreHorizontal, Send, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@emergent-platform/supabase-client';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';

type TicketType = 'bug' | 'feature' | 'question' | 'other';

interface SupportRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: TicketType;
}

const ticketTypeConfig: Record<TicketType, { label: string; icon: React.ReactNode; color: string }> = {
  bug: {
    label: 'Bug Report',
    icon: <Bug className="w-4 h-4" />,
    color: 'text-red-400',
  },
  feature: {
    label: 'Feature Request',
    icon: <Lightbulb className="w-4 h-4" />,
    color: 'text-amber-400',
  },
  question: {
    label: 'Question',
    icon: <HelpCircle className="w-4 h-4" />,
    color: 'text-blue-400',
  },
  other: {
    label: 'Other',
    icon: <MoreHorizontal className="w-4 h-4" />,
    color: 'text-muted-foreground',
  },
};

export function SupportRequestDialog({
  open,
  onOpenChange,
  defaultType = 'bug',
}: SupportRequestDialogProps) {
  const { user } = useAuthStore();
  const { currentProject } = useProjectStore();

  const [type, setType] = useState<TicketType>(defaultType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setType(defaultType);
      setTitle('');
      setDescription('');
      setError(null);
      setIsSuccess(false);
    }
  }, [open, defaultType]);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get browser info for debugging
      const browserInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        url: window.location.href,
        app: 'Pulsar GFX',
      };

      const { data: insertedTicket, error: submitError } = await supabase
        .from('gfx_support_tickets')
        .insert({
          type,
          title: title.trim(),
          description: description.trim(),
          user_id: user?.id || null,
          user_email: user?.email || 'anonymous',
          user_name: user?.name || null,
          organization_id: user?.organizationId || null,
          project_id: currentProject?.id || null,
          project_name: currentProject?.name || null,
          user_agent: navigator.userAgent,
          browser_info: browserInfo,
        })
        .select('id')
        .single();

      if (submitError) throw submitError;

      // Send admin notification email
      try {
        await supabase.functions.invoke('send-new-ticket-email', {
          body: {
            ticketId: insertedTicket.id,
            ticketTitle: title.trim(),
            ticketType: type,
            ticketPriority: 'medium',
            ticketDescription: description.trim(),
            userEmail: user?.email || 'anonymous',
            userName: user?.name,
            projectName: currentProject?.name,
            app: 'Pulsar GFX',
          },
        });
      } catch (emailErr) {
        console.error('Failed to send admin notification:', emailErr);
        // Don't fail the ticket creation if email fails
      }

      setIsSuccess(true);

      // Close dialog after showing success message
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to submit support ticket:', err);
      setError('Failed to submit your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <DialogTitle className="text-xl mb-2">Thank You!</DialogTitle>
            <DialogDescription>
              Your {ticketTypeConfig[type].label.toLowerCase()} has been submitted successfully.
              We'll review it and get back to you soon.
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            Contact Support
          </DialogTitle>
          <DialogDescription>
            Report a bug, request a feature, or ask a question. We're here to help!
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Type Selection */}
          <div className="grid gap-2">
            <Label>Type</Label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(ticketTypeConfig) as TicketType[]).map((ticketType) => {
                const config = ticketTypeConfig[ticketType];
                return (
                  <button
                    key={ticketType}
                    type="button"
                    onClick={() => setType(ticketType)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-lg border transition-all',
                      type === ticketType
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
                    )}
                  >
                    <span className={cn(config.color)}>{config.icon}</span>
                    <span className="text-[10px] text-muted-foreground">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="ticket-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ticket-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === 'bug'
                  ? 'Brief description of the issue'
                  : type === 'feature'
                  ? 'What feature would you like?'
                  : 'Your question in brief'
              }
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="ticket-description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="ticket-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'bug'
                  ? 'What happened? What did you expect to happen? Steps to reproduce...'
                  : type === 'feature'
                  ? 'Describe the feature and how it would help you...'
                  : 'Provide more details about your question...'
              }
              rows={5}
              maxLength={2000}
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {description.length}/2000
            </p>
          </div>

          {/* Context info (read-only) */}
          {(user || currentProject) && (
            <div className="rounded-lg bg-muted/30 p-3 space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">
                Context (automatically included)
              </p>
              {user && (
                <p className="text-xs text-muted-foreground">
                  User: {user.email}
                </p>
              )}
              {currentProject && (
                <p className="text-xs text-muted-foreground">
                  Project: {currentProject.name}
                </p>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !description.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import {
  Loader2,
  RefreshCw,
  Trash2,
  Ticket,
  Bug,
  Lightbulb,
  HelpCircle,
  MoreHorizontal,
} from 'lucide-react';
import {
  Button,
  Separator,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Textarea,
  cn,
} from '@emergent-platform/ui';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/hooks/useConfirm';
import { supabase } from '@emergent-platform/supabase-client';

// Support ticket types
type TicketType = 'bug' | 'feature' | 'question' | 'other';
type TicketStatus = 'open' | 'in_progress' | 'resolved';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

interface SupportTicket {
  id: string;
  type: TicketType;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  user_id: string | null;
  user_email: string;
  user_name: string | null;
  organization_id: string | null;
  project_id: string | null;
  project_name: string | null;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  browser_info?: {
    app?: string;
  };
}

export function SupportTicketsPanel() {
  const { user } = useAuthStore();
  const confirm = useConfirm();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<'all' | TicketStatus>('all');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setTicketsLoading(true);
    try {
      const { data, error } = await supabase
        .from('gfx_support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      console.error('Failed to load support tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: TicketStatus) => {
    try {
      // Find the ticket to get the user email
      const ticket = tickets.find(t => t.id === ticketId);

      const updateData: Partial<SupportTicket> = { status };
      if (status === 'resolved') {
        updateData.resolved_by = user?.id || null;
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('gfx_support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      // Send email notification when ticket is resolved
      if (status === 'resolved' && ticket?.user_email) {
        try {
          await supabase.functions.invoke('send-ticket-resolved-email', {
            body: {
              to: ticket.user_email,
              ticketTitle: ticket.title,
              ticketId: ticket.id,
              userName: ticket.user_name,
            },
          });
        } catch (emailErr) {
          console.error('Failed to send resolution email:', emailErr);
          // Don't fail the status update if email fails
        }
      }

      loadTickets();
    } catch (err) {
      console.error('Failed to update ticket:', err);
    }
  };

  const updateTicketPriority = async (ticketId: string, priority: TicketPriority) => {
    try {
      const { error } = await supabase
        .from('gfx_support_tickets')
        .update({ priority })
        .eq('id', ticketId);

      if (error) throw error;
      loadTickets();
    } catch (err) {
      console.error('Failed to update ticket priority:', err);
    }
  };

  const updateAdminNotes = async (ticketId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('gfx_support_tickets')
        .update({ admin_notes: notes })
        .eq('id', ticketId);

      if (error) throw error;
      loadTickets();
    } catch (err) {
      console.error('Failed to update admin notes:', err);
    }
  };

  const deleteTicket = async (ticketId: string) => {
    const confirmed = await confirm({
      title: 'Delete Ticket',
      description: 'Are you sure you want to delete this support ticket? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('gfx_support_tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;
      loadTickets();
    } catch (err) {
      console.error('Failed to delete ticket:', err);
    }
  };

  // Filter tickets based on selected filter
  const filteredTickets = ticketFilter === 'all'
    ? tickets
    : tickets.filter(t => t.status === ticketFilter);

  // Ticket counts by status
  const ticketCounts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  // Helper function for ticket type icon
  const getTicketTypeIcon = (type: TicketType) => {
    switch (type) {
      case 'bug': return <Bug className="w-4 h-4 text-red-400" />;
      case 'feature': return <Lightbulb className="w-4 h-4 text-amber-400" />;
      case 'question': return <HelpCircle className="w-4 h-4 text-blue-400" />;
      default: return <MoreHorizontal className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Helper function for status badge
  const getStatusBadge = (status: TicketStatus) => {
    const config: Record<TicketStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      open: { label: 'Open', variant: 'destructive' },
      in_progress: { label: 'In Progress', variant: 'default' },
      resolved: { label: 'Resolved', variant: 'secondary' },
    };
    return config[status];
  };

  // Helper function for priority badge
  const getPriorityBadge = (priority: TicketPriority) => {
    const config: Record<TicketPriority, { label: string; className: string }> = {
      low: { label: 'Low', className: 'bg-slate-500/20 text-slate-400' },
      medium: { label: 'Medium', className: 'bg-blue-500/20 text-blue-400' },
      high: { label: 'High', className: 'bg-amber-500/20 text-amber-400' },
      critical: { label: 'Critical', className: 'bg-red-500/20 text-red-400' },
    };
    return config[priority];
  };

  // Helper to get app badge
  const getAppBadge = (ticket: SupportTicket) => {
    const app = ticket.browser_info?.app;
    if (!app) return null;
    const config: Record<string, { label: string; className: string }> = {
      'Nova': { label: 'Nova', className: 'bg-emerald-500/20 text-emerald-400' },
      'Nova GFX': { label: 'Nova GFX', className: 'bg-violet-500/20 text-violet-400' },
      'Nexus': { label: 'Nexus', className: 'bg-orange-500/20 text-orange-400' },
      'Pulsar VS': { label: 'Pulsar VS', className: 'bg-pink-500/20 text-pink-400' },
      'Pulsar GFX': { label: 'Pulsar GFX', className: 'bg-cyan-500/20 text-cyan-400' },
      'Pulsar MSC': { label: 'Pulsar MSC', className: 'bg-amber-500/20 text-amber-400' },
      'Fusion': { label: 'Fusion', className: 'bg-rose-500/20 text-rose-400' },
    };
    const appConfig = config[app];
    if (!appConfig) return null;
    return (
      <span className={cn("text-[10px] px-1.5 py-0.5 rounded", appConfig.className)}>
        {appConfig.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Support Tickets</h2>
        <p className="text-sm text-muted-foreground">
          View and manage support tickets from all apps
        </p>
      </div>

      <Separator />

      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-cyan-400" />
          <span className="font-medium">All Tickets</span>
          {ticketCounts.open > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {ticketCounts.open} open
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={loadTickets} disabled={ticketsLoading}>
          <RefreshCw className={`w-4 h-4 ${ticketsLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {(['all', 'open', 'in_progress', 'resolved'] as const).map((filter) => (
          <Button
            key={filter}
            variant={ticketFilter === filter ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setTicketFilter(filter)}
          >
            {filter === 'all' ? 'All' : filter === 'in_progress' ? 'In Progress' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            <span className="ml-1 text-[10px] opacity-70">({ticketCounts[filter]})</span>
          </Button>
        ))}
      </div>

      {ticketsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          {ticketFilter === 'all' ? 'No support tickets yet' : `No ${ticketFilter.replace('_', ' ')} tickets`}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTickets.map((ticket) => {
            const statusConfig = getStatusBadge(ticket.status);
            const priorityConfig = getPriorityBadge(ticket.priority);
            const isExpanded = expandedTicket === ticket.id;

            return (
              <div
                key={ticket.id}
                className={cn(
                  "rounded-lg border border-border transition-all",
                  isExpanded ? "bg-card" : "hover:bg-muted/30"
                )}
              >
                {/* Ticket Header */}
                <div
                  className="flex items-start gap-3 p-3 cursor-pointer"
                  onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)}
                >
                  <div className="mt-0.5">{getTicketTypeIcon(ticket.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{ticket.title}</p>
                      <Badge variant={statusConfig.variant} className="text-[10px]">
                        {statusConfig.label}
                      </Badge>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded", priorityConfig.className)}>
                        {priorityConfig.label}
                      </span>
                      {getAppBadge(ticket)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{ticket.user_email}</span>
                      <span>-</span>
                      <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                      {ticket.project_name && (
                        <>
                          <span>-</span>
                          <span className="truncate max-w-[150px]">{ticket.project_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTicket(ticket.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-4 border-t border-border pt-3">
                    {/* Description */}
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                      <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                        <Select
                          value={ticket.status}
                          onValueChange={(value) => updateTicketStatus(ticket.id, value as TicketStatus)}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Priority</p>
                        <Select
                          value={ticket.priority}
                          onValueChange={(value) => updateTicketPriority(ticket.id, value as TicketPriority)}
                        >
                          <SelectTrigger className="w-[100px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Admin Notes */}
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Admin Notes</p>
                      <Textarea
                        value={ticket.admin_notes || ''}
                        onChange={(e) => {
                          // Update local state immediately
                          setTickets(prev => prev.map(t =>
                            t.id === ticket.id ? { ...t, admin_notes: e.target.value } : t
                          ));
                        }}
                        onBlur={(e) => {
                          // Save on blur
                          if (e.target.value !== ticket.admin_notes) {
                            updateAdminNotes(ticket.id, e.target.value);
                          }
                        }}
                        placeholder="Add internal notes..."
                        rows={2}
                        className="text-xs"
                      />
                    </div>

                    {/* Metadata */}
                    <div className="text-[10px] text-muted-foreground space-y-1">
                      <p>Submitted: {new Date(ticket.created_at).toLocaleString()}</p>
                      {ticket.resolved_at && (
                        <p>Resolved: {new Date(ticket.resolved_at).toLocaleString()}</p>
                      )}
                      {ticket.user_name && <p>Name: {ticket.user_name}</p>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Support Tickets Panel Component
 *
 * Admin panel for viewing and managing support tickets from all apps.
 * Only visible to superusers.
 */

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
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../ui/utils';

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
  const { user } = useAuth();

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
      toast.error('Failed to load support tickets');
    } finally {
      setTicketsLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: TicketStatus) => {
    try {
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
        }
      }

      toast.success('Ticket status updated');
      loadTickets();
    } catch (err) {
      console.error('Failed to update ticket:', err);
      toast.error('Failed to update ticket status');
    }
  };

  const updateTicketPriority = async (ticketId: string, priority: TicketPriority) => {
    try {
      const { error } = await supabase
        .from('gfx_support_tickets')
        .update({ priority })
        .eq('id', ticketId);

      if (error) throw error;
      toast.success('Ticket priority updated');
      loadTickets();
    } catch (err) {
      console.error('Failed to update ticket priority:', err);
      toast.error('Failed to update ticket priority');
    }
  };

  const updateAdminNotes = async (ticketId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('gfx_support_tickets')
        .update({ admin_notes: notes })
        .eq('id', ticketId);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to update admin notes:', err);
      toast.error('Failed to save admin notes');
    }
  };

  const deleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this support ticket? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('gfx_support_tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;
      toast.success('Ticket deleted');
      loadTickets();
    } catch (err) {
      console.error('Failed to delete ticket:', err);
      toast.error('Failed to delete ticket');
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
      case 'bug': return <Bug className="w-4 h-4 text-red-500" />;
      case 'feature': return <Lightbulb className="w-4 h-4 text-amber-500" />;
      case 'question': return <HelpCircle className="w-4 h-4 text-blue-500" />;
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
      low: { label: 'Low', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
      medium: { label: 'Medium', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
      high: { label: 'High', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
      critical: { label: 'Critical', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
    };
    return config[priority];
  };

  // Helper to get app badge
  const getAppBadge = (ticket: SupportTicket) => {
    const app = ticket.browser_info?.app;
    if (!app) return null;
    const config: Record<string, { label: string; className: string }> = {
      'Nova': { label: 'Nova', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
      'Nova GFX': { label: 'Nova GFX', className: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' },
      'Nexus': { label: 'Nexus', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
      'Pulsar VS': { label: 'Pulsar VS', className: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300' },
      'Pulsar GFX': { label: 'Pulsar GFX', className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
      'Pulsar MSC': { label: 'Pulsar MSC', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
      'Fusion': { label: 'Fusion', className: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300' },
    };
    const appConfig = config[app];
    if (!appConfig) return null;
    return (
      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", appConfig.className)}>
        {appConfig.label}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Support Tickets
            </CardTitle>
            <CardDescription>
              View and manage support tickets from all apps
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={loadTickets} disabled={ticketsLoading}>
            <RefreshCw className={cn("w-4 h-4", ticketsLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex items-center gap-2 text-sm">
          {ticketCounts.open > 0 && (
            <Badge variant="destructive">
              {ticketCounts.open} open
            </Badge>
          )}
          {ticketCounts.in_progress > 0 && (
            <Badge variant="default">
              {ticketCounts.in_progress} in progress
            </Badge>
          )}
          <span className="text-muted-foreground">
            {ticketCounts.resolved} resolved
          </span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 flex-wrap">
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

        <Separator />

        {ticketsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            {ticketFilter === 'all' ? 'No support tickets yet' : `No ${ticketFilter.replace('_', ' ')} tickets`}
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredTickets.map((ticket) => {
              const statusConfig = getStatusBadge(ticket.status);
              const priorityConfig = getPriorityBadge(ticket.priority);
              const isExpanded = expandedTicket === ticket.id;

              return (
                <div
                  key={ticket.id}
                  className={cn(
                    "rounded-lg border transition-all",
                    isExpanded ? "bg-muted/50" : "hover:bg-muted/30"
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
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", priorityConfig.className)}>
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
                    <div className="px-3 pb-3 space-y-4 border-t pt-3">
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
                            setTickets(prev => prev.map(t =>
                              t.id === ticket.id ? { ...t, admin_notes: e.target.value } : t
                            ));
                          }}
                          onBlur={(e) => {
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
      </CardContent>
    </Card>
  );
}

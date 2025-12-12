import { useState, useEffect } from 'react';
import {
  Send,
  Loader2,
  RefreshCw,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Users,
  Mail,
  Ticket,
  Bug,
  Lightbulb,
  HelpCircle,
  MoreHorizontal,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import {
  Button,
  Input,
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
import { useAuthStore, type Invitation, type AppUser } from '@/stores/authStore';
import { useConfirm } from '@/hooks/useConfirm';
import { supabase } from '@emergent-platform/supabase-client';

// Support ticket types
type TicketType = 'bug' | 'feature' | 'question' | 'other';
type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
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
}

export function AdminPanel() {
  const {
    user,
    organization,
    sendInvitation,
    getInvitations,
    revokeInvitation,
    resendInvitation,
    getOrganizationMembers,
    updateMemberRole,
    removeMember,
  } = useAuthStore();
  const confirm = useConfirm();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('member');
  const [isSending, setIsSending] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [members, setMembers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Support tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<'all' | TicketStatus>('all');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadTickets();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [inviteData, memberData] = await Promise.all([
      getInvitations(),
      getOrganizationMembers(),
    ]);
    setInvitations(inviteData);
    setMembers(memberData);
    setIsLoading(false);
  };

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
      const updateData: Partial<SupportTicket> = { status };
      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_by = user?.id || null;
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('gfx_support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;
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

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsSending(true);
    setMessage(null);

    const result = await sendInvitation(inviteEmail, inviteRole);

    if (result.success) {
      setMessage({ type: 'success', text: `Invitation sent to ${inviteEmail}` });
      setInviteEmail('');
      loadData();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to send invitation' });
    }

    setIsSending(false);
  };

  const handleRevoke = async (id: string) => {
    const result = await revokeInvitation(id);
    if (result.success) {
      loadData();
    }
  };

  const handleResend = async (id: string) => {
    const result = await resendInvitation(id);
    if (result.success) {
      setMessage({ type: 'success', text: 'Invitation resent' });
      loadData();
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    // Optimistically update the UI immediately
    setMembers(prev => prev.map(m =>
      m.id === userId ? { ...m, role: newRole as AppUser['role'] } : m
    ));

    const result = await updateMemberRole(userId, newRole);
    if (!result.success) {
      // Revert on failure
      loadData();
      setMessage({ type: 'error', text: result.error || 'Failed to update role' });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const confirmed = await confirm({
      title: 'Remove Member',
      description: 'Are you sure you want to remove this member from the organization?',
      confirmText: 'Remove',
      variant: 'destructive',
    });
    if (!confirmed) return;
    const result = await removeMember(userId);
    if (result.success) {
      loadData();
    }
  };

  const pendingInvitations = invitations.filter(i => !i.acceptedAt);

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
    closed: tickets.filter(t => t.status === 'closed').length,
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
      closed: { label: 'Closed', variant: 'outline' },
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Admin Panel</h2>
        <p className="text-sm text-muted-foreground">
          Manage users and invitations for {organization?.name}
        </p>
      </div>

      <Separator />

      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {message.text}
        </div>
      )}

      {/* Invite User */}
      <div className="p-4 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4 text-violet-400" />
          <h3 className="font-medium">Invite User</h3>
        </div>

        <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={isSending}
            />
          </div>
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={isSending || !inviteEmail}>
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Invite
              </>
            )}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-2">
          Invitations expire after 7 days
        </p>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Pending Invitations</h3>
            <span className="text-xs text-muted-foreground">
              ({pendingInvitations.length})
            </span>
          </div>

          <div className="space-y-2">
            {pendingInvitations.map((invite) => {
              const isExpired = new Date(invite.expiresAt) < new Date();
              const expiresIn = Math.ceil(
                (new Date(invite.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );

              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{invite.email}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{invite.role}</span>
                        <span>-</span>
                        {isExpired ? (
                          <span className="text-destructive">Expired</span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expires in {expiresIn} day{expiresIn !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResend(invite.id)}
                      title="Resend invitation"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(invite.id)}
                      className="text-destructive hover:text-destructive"
                      title="Revoke invitation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Organization Members */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Organization Members</h3>
            <span className="text-xs text-muted-foreground">
              ({members.length})
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">
            No members found
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {member.name
                      ? member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : member.email.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {member.name || member.email}
                      {member.id === user?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={member.role}
                    onValueChange={(value) => handleRoleChange(member.id, value)}
                    disabled={member.id === user?.id} // Can't change own role
                  >
                    <SelectTrigger className="w-[100px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  {member.id !== user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-destructive hover:text-destructive"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Support Tickets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-violet-400" />
            <h3 className="font-medium">Support Tickets</h3>
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
        <div className="flex gap-1 mb-4 overflow-x-auto">
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((filter) => (
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
                              <SelectItem value="closed">Closed</SelectItem>
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
    </div>
  );
}

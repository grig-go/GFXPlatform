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
} from '@emergent-platform/ui';
import { useAuthStore, type Invitation, type AppUser } from '@/stores/authStore';
import { useConfirm } from '@/hooks/useConfirm';

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

  useEffect(() => {
    loadData();
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
          <UserPlus className="w-4 h-4 text-cyan-400" />
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
    </div>
  );
}

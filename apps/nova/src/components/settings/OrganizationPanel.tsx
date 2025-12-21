/**
 * Organization Panel Component
 *
 * Displays organization info, members, and invitation management for org admins.
 */

import { useState, useEffect } from 'react';
import { Building2, Users, Mail, Copy, Trash2, Send, Loader2, Crown, UserPlus } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import type { AppUser, Invitation, OrgRole } from '../../types/permissions';

export function OrganizationPanel() {
  const {
    user,
    organization,
    isOrgAdmin,
    getOrganizationMembers,
    getInvitations,
    sendInvitation,
    revokeInvitation,
  } = useAuth();

  const [members, setMembers] = useState<AppUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);

  // Invitation form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('member');
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  useEffect(() => {
    loadMembers();
    if (isOrgAdmin) {
      loadInvitations();
    }
  }, [isOrgAdmin]);

  const loadMembers = async () => {
    setIsLoadingMembers(true);
    const data = await getOrganizationMembers();
    setMembers(data);
    setIsLoadingMembers(false);
  };

  const loadInvitations = async () => {
    setIsLoadingInvitations(true);
    const data = await getInvitations();
    setInvitations(data);
    setIsLoadingInvitations(false);
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail) return;

    setIsSendingInvite(true);
    const { error, invitation } = await sendInvitation(inviteEmail, inviteRole);

    if (error) {
      toast.error(error.message || 'Failed to send invitation');
    } else {
      toast.success('Invitation sent successfully');
      setInviteEmail('');
      setInviteRole('member');
      loadInvitations();
    }
    setIsSendingInvite(false);
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    const { error } = await revokeInvitation(invitationId);
    if (error) {
      toast.error('Failed to revoke invitation');
    } else {
      toast.success('Invitation revoked');
      loadInvitations();
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/signup?invite=${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied to clipboard');
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getRoleBadgeColor = (role: OrgRole) => {
    switch (role) {
      case 'owner': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'admin': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'member': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'viewer': return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default: return '';
    }
  };

  if (!organization) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No organization found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization
          </CardTitle>
          <CardDescription>
            Your organization details and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-violet-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{organization.name}</h3>
              <p className="text-sm text-muted-foreground">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </p>
              {user?.org_role && (
                <Badge className={`mt-1 ${getRoleBadgeColor(user.org_role)}`}>
                  {user.org_role.charAt(0).toUpperCase() + user.org_role.slice(1)}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members
          </CardTitle>
          <CardDescription>
            People in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMembers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No members found</p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email}`}
                          alt={member.full_name || member.email}
                        />
                        <AvatarFallback>
                          {getInitials(member.full_name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2">
                          {member.full_name || member.email}
                          {member.id === user?.id && (
                            <span className="text-xs text-muted-foreground">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getRoleBadgeColor(member.org_role)}>
                        {member.org_role === 'owner' && <Crown className="w-3 h-3 mr-1" />}
                        {member.org_role}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Invitations (Admin Only) */}
      {isOrgAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Members
            </CardTitle>
            <CardDescription>
              Send invitations to add new members to your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Invite Form */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={isSendingInvite}
                />
              </div>
              <Select
                value={inviteRole}
                onValueChange={(value: OrgRole) => setInviteRole(value)}
                disabled={isSendingInvite}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleSendInvitation}
                disabled={!inviteEmail || isSendingInvite}
              >
                {isSendingInvite ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            <Separator />

            {/* Pending Invitations */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Pending Invitations</Label>
              {isLoadingInvitations ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : invitations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No pending invitations</p>
              ) : (
                <div className="space-y-2">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{invitation.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Expires {new Date(invitation.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleBadgeColor(invitation.role)}>
                          {invitation.role}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyInviteLink(invitation.token)}
                          title="Copy invite link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRevokeInvitation(invitation.id)}
                          className="text-destructive hover:text-destructive"
                          title="Revoke invitation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isOrgAdmin && (
        <p className="text-sm text-muted-foreground text-center">
          Contact an admin to manage organization settings and invitations.
        </p>
      )}
    </div>
  );
}

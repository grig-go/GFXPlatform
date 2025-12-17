import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import {
  Users,
  UserPlus,
  UsersRound,
  Shield,
  Search,
  Filter,
  Sparkles,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Mail,
  Calendar,
  Eye,
  Edit,
  Trash2,
  UserCog,
  KeyRound,
  Camera,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  Crown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner@2.0.3";
import { supabase } from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import type { AppUser, Group, Permission as DbPermission } from "../types/permissions";
import { getPermissionKey, getPermissionDisplayName } from "../types/permissions";

// Types for the component
interface DisplayUser {
  id: string;
  auth_user_id: string;
  avatar: string;
  full_name: string;
  email: string;
  status: 'Active' | 'Pending' | 'Inactive';
  is_superuser: boolean;
  last_login: string | null;
  groups: string[];
  permissions: string[];
  created_at: string;
}

interface DisplayGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  is_system: boolean;
  members: string[];
  permissions: string[];
  created_at: string;
}

interface DisplayPermission {
  key: string;
  label: string;
  description?: string;
  app_key: string;
  resource: string;
  action: string;
}

export function UsersGroupsPage() {
  const { user: currentAuthUser } = useAuth();
  const { isSuperuser, isAdmin } = usePermissions();

  // Data state
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [groups, setGroups] = useState<DisplayGroup[]>([]);
  const [permissions, setPermissions] = useState<DisplayPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DisplayUser | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editedUser, setEditedUser] = useState<DisplayUser | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [isNewGroupDialogOpen, setIsNewGroupDialogOpen] = useState(false);
  const [newGroup, setNewGroup] = useState<DisplayGroup | null>(null);
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DisplayGroup | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // New user state
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserGroups, setNewUserGroups] = useState<string[]>([]);
  const [newUserStatus, setNewUserStatus] = useState<'active' | 'pending'>('active');
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);

  // Avatar options
  const avatarOptions = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sara",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Robert",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jennifer",
  ];

  // Color options for groups
  const colorOptions = [
    "#FF6B6B", "#4ECDC4", "#95E1D3", "#F38181",
    "#A8E6CF", "#FFD93D", "#6C5CE7", "#FD79A8",
    "#74B9FF", "#A29BFE", "#FD9644", "#55EFC4",
    "#81ECEC", "#FDCB6E", "#E17055", "#00B894"
  ];

  // Fetch data from Supabase
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('u_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('u_groups')
        .select('*')
        .order('name');

      if (groupsError) throw groupsError;

      // Fetch permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('u_permissions')
        .select('*')
        .order('app_key')
        .order('resource')
        .order('action');

      if (permissionsError) throw permissionsError;

      // Fetch group members
      const { data: groupMembersData, error: groupMembersError } = await supabase
        .from('u_group_members')
        .select('*');

      if (groupMembersError) throw groupMembersError;

      // Fetch group permissions with full permission data
      const { data: groupPermsData, error: groupPermsError } = await supabase
        .from('u_group_permissions')
        .select('group_id, permission_id, u_permissions(id, app_key, resource, action)');

      if (groupPermsError) throw groupPermsError;

      // Fetch user permissions (direct) with full permission data
      const { data: userPermsData, error: userPermsError } = await supabase
        .from('u_user_permissions')
        .select('user_id, permission_id, u_permissions(id, app_key, resource, action)');

      if (userPermsError) throw userPermsError;

      // Helper to get permission key from joined data
      const getPermKey = (perm: any): string | null => {
        if (!perm?.u_permissions) return null;
        const p = perm.u_permissions;
        return `${p.app_key}.${p.resource}.${p.action}`;
      };

      // Transform users data
      const transformedUsers: DisplayUser[] = (usersData || []).map((u: AppUser) => {
        // Get user's groups
        const userGroupIds = (groupMembersData || [])
          .filter((gm: any) => gm.user_id === u.id)
          .map((gm: any) => gm.group_id);

        // Get user's direct permissions
        const userDirectPerms = (userPermsData || [])
          .filter((up: any) => up.user_id === u.id)
          .map((up: any) => getPermKey(up))
          .filter(Boolean) as string[];

        // Get permissions from groups
        const groupPerms = (groupPermsData || [])
          .filter((gp: any) => userGroupIds.includes(gp.group_id))
          .map((gp: any) => getPermKey(gp))
          .filter(Boolean) as string[];

        // Combine permissions
        const allPerms = [...new Set([...userDirectPerms, ...groupPerms])];

        return {
          id: u.id,
          auth_user_id: u.auth_user_id,
          avatar: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
          full_name: u.full_name || u.email.split('@')[0],
          email: u.email,
          status: (u.status.charAt(0).toUpperCase() + u.status.slice(1)) as 'Active' | 'Pending' | 'Inactive',
          is_superuser: u.is_superuser,
          last_login: null, // We'd need to get this from auth.users or track separately
          groups: userGroupIds,
          permissions: u.is_superuser ? ['*'] : allPerms,
          created_at: u.created_at,
        };
      });

      // Transform groups data
      const transformedGroups: DisplayGroup[] = (groupsData || []).map((g: any) => {
        const memberIds = (groupMembersData || [])
          .filter((gm: any) => gm.group_id === g.id)
          .map((gm: any) => gm.user_id);

        const groupPermKeys = (groupPermsData || [])
          .filter((gp: any) => gp.group_id === g.id)
          .map((gp: any) => getPermKey(gp))
          .filter(Boolean) as string[];

        return {
          id: g.id,
          name: g.name,
          description: g.description || '',
          color: g.color || '#6C5CE7',
          is_system: g.is_system,
          members: memberIds,
          permissions: groupPermKeys,
          created_at: g.created_at,
        };
      });

      // Transform permissions data
      const transformedPermissions: DisplayPermission[] = (permissionsData || []).map((p: DbPermission) => ({
        key: getPermissionKey(p),
        label: getPermissionDisplayName(p),
        description: p.description || undefined,
        app_key: p.app_key,
        resource: p.resource,
        action: p.action,
      }));

      setUsers(transformedUsers);
      setGroups(transformedGroups);
      setPermissions(transformedPermissions);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper functions
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusIcon = (status: DisplayUser['status']) => {
    switch (status) {
      case 'Active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Pending':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'Inactive':
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: DisplayUser['status']) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Pending':
        return 'secondary';
      case 'Inactive':
        return 'outline';
    }
  };

  const getDaysSinceCreated = (createdAt: string) => {
    const days = Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const getQuickActionBadge = (user: DisplayUser) => {
    const daysSinceCreated = getDaysSinceCreated(user.created_at);

    if (daysSinceCreated <= 7) {
      return (
        <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
          <Sparkles className="w-3 h-3" />
          New
        </Badge>
      );
    }

    return null;
  };

  const getUserGroups = (user: DisplayUser) => {
    return user.groups.map(groupId => groups.find(g => g.id === groupId)).filter(Boolean) as DisplayGroup[];
  };

  const getGroupMembers = (group: DisplayGroup) => {
    return group.members.map(userId => users.find(u => u.id === userId)).filter(Boolean) as DisplayUser[];
  };

  const getPermissionDetails = (permissionKey: string) => {
    return permissions.find(p => p.key === permissionKey);
  };

  // Update user status
  const updateUserStatus = async (userId: string, newStatus: 'active' | 'pending' | 'inactive') => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('u_users')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Error updating user status:', err);
      toast.error('Failed to update user status');
    } finally {
      setIsSaving(false);
    }
  };

  // Add user to group
  const addUserToGroup = async (userId: string, groupId: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('u_group_members')
        .insert({ user_id: userId, group_id: groupId });

      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Error adding user to group:', err);
      toast.error('Failed to add user to group');
    } finally {
      setIsSaving(false);
    }
  };

  // Remove user from group
  const removeUserFromGroup = async (userId: string, groupId: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('u_group_members')
        .delete()
        .eq('user_id', userId)
        .eq('group_id', groupId);

      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Error removing user from group:', err);
      toast.error('Failed to remove user from group');
    } finally {
      setIsSaving(false);
    }
  };

  // Create new group
  const createGroup = async () => {
    if (!newGroup || !newGroup.name) return;

    setIsSaving(true);
    try {
      // Insert group
      const { data: groupData, error: groupError } = await supabase
        .from('u_groups')
        .insert({
          name: newGroup.name,
          description: newGroup.description,
          color: newGroup.color,
          is_system: false,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add permissions to group
      if (newGroup.permissions.length > 0 && !newGroup.permissions.includes('*')) {
        const permissionIds = permissions
          .filter(p => newGroup.permissions.includes(p.key))
          .map(p => p.key);

        // Get permission IDs from keys
        const { data: permData } = await supabase
          .from('u_permissions')
          .select('id, key')
          .in('key', permissionIds);

        if (permData) {
          const groupPermInserts = permData.map((p: any) => ({
            group_id: groupData.id,
            permission_id: p.id,
          }));

          await supabase.from('u_group_permissions').insert(groupPermInserts);
        }
      }

      // Add members to group
      if (newGroup.members.length > 0) {
        const memberInserts = newGroup.members.map(userId => ({
          group_id: groupData.id,
          user_id: userId,
        }));

        await supabase.from('u_group_members').insert(memberInserts);
      }

      setIsNewGroupDialogOpen(false);
      setNewGroup(null);
      await fetchData();
    } catch (err) {
      console.error('Error creating group:', err);
      toast.error('Failed to create group');
    } finally {
      setIsSaving(false);
    }
  };

  // Update existing group
  const updateGroup = async () => {
    if (!editingGroup || !editingGroup.name) return;

    setIsSaving(true);
    try {
      // Update group details
      const { error: groupError } = await supabase
        .from('u_groups')
        .update({
          name: editingGroup.name,
          description: editingGroup.description,
          color: editingGroup.color,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingGroup.id);

      if (groupError) throw groupError;

      // Get permission IDs for the selected permission keys
      const { data: allPermsData } = await supabase
        .from('u_permissions')
        .select('id, app_key, resource, action');

      const permissionIdMap = new Map<string, string>();
      (allPermsData || []).forEach((p: any) => {
        const key = `${p.app_key}.${p.resource}.${p.action}`;
        permissionIdMap.set(key, p.id);
      });

      // Delete existing group permissions
      await supabase
        .from('u_group_permissions')
        .delete()
        .eq('group_id', editingGroup.id);

      // Insert new permissions
      if (editingGroup.permissions.length > 0) {
        const groupPermInserts = editingGroup.permissions
          .map(permKey => {
            const permId = permissionIdMap.get(permKey);
            if (!permId) return null;
            return {
              group_id: editingGroup.id,
              permission_id: permId,
            };
          })
          .filter(Boolean);

        if (groupPermInserts.length > 0) {
          const { error: permError } = await supabase
            .from('u_group_permissions')
            .insert(groupPermInserts);

          if (permError) throw permError;
        }
      }

      // Update group members - get current members first
      const { data: currentMembers } = await supabase
        .from('u_group_members')
        .select('user_id')
        .eq('group_id', editingGroup.id);

      const currentMemberIds = (currentMembers || []).map((m: any) => m.user_id);
      const newMemberIds = editingGroup.members;

      // Members to add
      const membersToAdd = newMemberIds.filter(id => !currentMemberIds.includes(id));
      // Members to remove
      const membersToRemove = currentMemberIds.filter(id => !newMemberIds.includes(id));

      // Add new members
      if (membersToAdd.length > 0) {
        const memberInserts = membersToAdd.map(userId => ({
          group_id: editingGroup.id,
          user_id: userId,
        }));
        await supabase.from('u_group_members').insert(memberInserts);
      }

      // Remove old members
      if (membersToRemove.length > 0) {
        await supabase
          .from('u_group_members')
          .delete()
          .eq('group_id', editingGroup.id)
          .in('user_id', membersToRemove);
      }

      setIsEditGroupDialogOpen(false);
      setEditingGroup(null);
      await fetchData();
      toast.success('Group updated successfully');
    } catch (err) {
      console.error('Error updating group:', err);
      toast.error('Failed to update group');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete group
  const deleteGroup = async (groupId: string) => {
    setIsSaving(true);
    try {
      // Delete group (will cascade to memberships and permissions)
      const { error } = await supabase
        .from('u_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      setIsEditGroupDialogOpen(false);
      setEditingGroup(null);
      await fetchData();
      toast.success('Group deleted successfully');
    } catch (err) {
      console.error('Error deleting group:', err);
      toast.error('Failed to delete group');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete user
  const deleteUser = async (userId: string, authUserId: string) => {
    setIsSaving(true);
    try {
      // Delete from u_users (will cascade to memberships)
      const { error: deleteError } = await supabase
        .from('u_users')
        .delete()
        .eq('id', userId);

      if (deleteError) throw deleteError;

      // Note: Deleting from auth.users requires admin API which isn't available client-side
      // The user will remain in auth but won't be able to access the app

      await fetchData();
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user');
    } finally {
      setIsSaving(false);
    }
  };

  // Create new user
  const createUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast.error('Email and password are required');
      return;
    }

    if (newUserPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSaving(true);
    try {
      // Call edge function to create user (requires service role)
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserEmail,
          password: newUserPassword,
          fullName: newUserFullName,
          status: newUserStatus,
          groupIds: newUserGroups,
          sendWelcomeEmail: sendWelcomeEmail,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Reset form
      setNewUserEmail('');
      setNewUserFullName('');
      setNewUserPassword('');
      setNewUserGroups([]);
      setNewUserStatus('active');
      setSendWelcomeEmail(true);
      setIsNewUserDialogOpen(false);

      await fetchData();
      toast.success('User created successfully' + (sendWelcomeEmail ? '. Welcome email sent.' : ''));
    } catch (err) {
      console.error('Error creating user:', err);
      toast.error('Failed to create user: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Generate random password
  const generatePassword = (setter?: (pw: string) => void) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (setter) {
      setter(password);
    } else {
      setNewUserPassword(password);
    }
    return password;
  };

  // Reset password state
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);

  // Reset user password
  const resetPassword = async () => {
    if (!resetPasswordUserId || !resetPasswordValue) {
      toast.error('Password is required');
      return;
    }

    if (resetPasswordValue.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: {
          userId: resetPasswordUserId,
          newPassword: resetPasswordValue,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setIsResetPasswordOpen(false);
      setResetPasswordUserId(null);
      setResetPasswordValue('');
      toast.success('Password reset successfully');
    } catch (err) {
      console.error('Error resetting password:', err);
      toast.error('Failed to reset password: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Open reset password dialog
  const openResetPassword = (userId: string) => {
    setResetPasswordUserId(userId);
    setResetPasswordValue('');
    setIsResetPasswordOpen(true);
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        user =>
          user.full_name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    // Group filter
    if (groupFilter !== 'all') {
      filtered = filtered.filter(user => user.groups.includes(groupFilter));
    }

    // Unassigned filter
    if (showUnassigned) {
      filtered = filtered.filter(user => user.groups.length === 0);
    }

    return filtered;
  }, [users, searchQuery, statusFilter, groupFilter, showUnassigned]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading users and groups...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
          <p className="text-destructive">{error}</p>
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Users & Groups
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage user accounts, group memberships, and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {/* New User Dialog */}
          <Dialog open={isNewUserDialogOpen} onOpenChange={(open) => {
            setIsNewUserDialogOpen(open);
            if (!open) {
              setNewUserEmail('');
              setNewUserFullName('');
              setNewUserPassword('');
              setNewUserGroups([]);
              setNewUserStatus('active');
              setSendWelcomeEmail(true);
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <UserPlus className="w-4 h-4" />
                New User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Create New User
                </DialogTitle>
                <DialogDescription>
                  Create a new user account with email and password.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    placeholder="John Doe"
                    value={newUserFullName}
                    onChange={(e) => setNewUserFullName(e.target.value)}
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password *</label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Minimum 6 characters"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={generatePassword}>
                      Generate
                    </Button>
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Initial Status</label>
                  <Select value={newUserStatus} onValueChange={(v) => setNewUserStatus(v as 'active' | 'pending')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending (read-only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Groups */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Groups</label>
                  <div className="flex flex-wrap gap-2">
                    {newUserGroups.map(groupId => {
                      const group = groups.find(g => g.id === groupId);
                      if (!group) return null;
                      return (
                        <Badge key={group.id} variant="secondary" className="gap-1 pr-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: group.color }}
                          />
                          {group.name}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => setNewUserGroups(newUserGroups.filter(id => id !== groupId))}
                          >
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </Badge>
                      );
                    })}
                    <Select
                      value=""
                      onValueChange={(groupId) => {
                        if (!newUserGroups.includes(groupId)) {
                          setNewUserGroups([...newUserGroups, groupId]);
                        }
                      }}
                    >
                      <SelectTrigger className="w-auto h-8 gap-1">
                        <SelectValue placeholder="+ Add to Group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.filter(g => !newUserGroups.includes(g.id)).map(group => (
                          <SelectItem key={group.id} value={group.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: group.color }}
                              />
                              {group.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Send Welcome Email */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sendWelcomeEmail"
                    checked={sendWelcomeEmail}
                    onCheckedChange={(checked) => setSendWelcomeEmail(!!checked)}
                  />
                  <label htmlFor="sendWelcomeEmail" className="text-sm">
                    Send welcome email with login credentials
                  </label>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsNewUserDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createUser} disabled={isSaving || !newUserEmail || !newUserPassword}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create User'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {/* New Group Dialog */}
          <Dialog open={isNewGroupDialogOpen} onOpenChange={(open) => {
            setIsNewGroupDialogOpen(open);
            if (!open) setNewGroup(null);
          }}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setNewGroup({
                    id: '',
                    name: "",
                    description: "",
                    color: colorOptions[0],
                    is_system: false,
                    members: [],
                    permissions: [],
                    created_at: new Date().toISOString()
                  });
                  setIsNewGroupDialogOpen(true);
                }}
              >
                <UsersRound className="w-4 h-4" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              {newGroup && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: newGroup.color }}
                      >
                        <UsersRound className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Group Name"
                          value={newGroup.name}
                          onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                          className="font-medium"
                        />
                      </div>
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6 mt-4">
                    {/* Description */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        placeholder="Describe the purpose of this group..."
                        value={newGroup.description}
                        onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                        rows={2}
                      />
                    </div>

                    {/* Color Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Group Color</label>
                      <div className="grid grid-cols-8 gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            onClick={() => setNewGroup({ ...newGroup, color })}
                            className="relative w-8 h-8 rounded-full hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                          >
                            {newGroup.color === color && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-white drop-shadow-md" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Members */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Members</label>
                      <div className="flex flex-wrap gap-2">
                        {newGroup.members.map(userId => {
                          const user = users.find(u => u.id === userId);
                          if (!user) return null;
                          return (
                            <Badge key={user.id} variant="secondary" className="gap-2 pr-1">
                              <Avatar className="w-4 h-4">
                                <AvatarImage src={user.avatar} alt={user.full_name} />
                                <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                              </Avatar>
                              {user.full_name}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 hover:bg-transparent"
                                onClick={() => setNewGroup({
                                  ...newGroup,
                                  members: newGroup.members.filter(uId => uId !== userId)
                                })}
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                            </Badge>
                          );
                        })}
                        <Select
                          value=""
                          onValueChange={(userId) => {
                            if (!newGroup.members.includes(userId)) {
                              setNewGroup({
                                ...newGroup,
                                members: [...newGroup.members, userId]
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="w-auto h-8 gap-1">
                            <SelectValue placeholder="+ Add Member" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.filter(u => !newGroup.members.includes(u.id) && !u.is_superuser).map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-5 h-5">
                                    <AvatarImage src={user.avatar} alt={user.full_name} />
                                    <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                                  </Avatar>
                                  {user.full_name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Permissions */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Permissions</label>
                      <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-3">
                        {/* Group by app_key */}
                        {['system', 'nova', 'pulsar'].map(appKey => {
                          const appPermissions = permissions.filter(p => p.app_key === appKey);
                          if (appPermissions.length === 0) return null;
                          return (
                            <div key={appKey} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase text-muted-foreground">
                                  {appKey}
                                </span>
                                <Separator className="flex-1" />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {appPermissions.map(perm => (
                                  <label
                                    key={perm.key}
                                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                                  >
                                    <Checkbox
                                      checked={newGroup.permissions.includes(perm.key)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setNewGroup({
                                            ...newGroup,
                                            permissions: [...newGroup.permissions, perm.key]
                                          });
                                        } else {
                                          setNewGroup({
                                            ...newGroup,
                                            permissions: newGroup.permissions.filter(p => p !== perm.key)
                                          });
                                        }
                                      }}
                                    />
                                    <span className="truncate" title={perm.description || perm.key}>
                                      {perm.label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {newGroup.permissions.length} permission(s) selected
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        variant="default"
                        className="gap-2"
                        onClick={createGroup}
                        disabled={!newGroup.name || isSaving}
                      >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Create Group
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsNewGroupDialogOpen(false);
                          setNewGroup(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

          {/* Reset Password Dialog */}
          <Dialog open={isResetPasswordOpen} onOpenChange={(open) => {
            setIsResetPasswordOpen(open);
            if (!open) {
              setResetPasswordUserId(null);
              setResetPasswordValue('');
            }
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5" />
                  Reset Password
                </DialogTitle>
                <DialogDescription>
                  {resetPasswordUserId && (
                    <>Set a new password for <span className="font-medium">{users.find(u => u.id === resetPasswordUserId)?.full_name || users.find(u => u.id === resetPasswordUserId)?.email}</span></>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password *</label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Minimum 6 characters"
                      value={resetPasswordValue}
                      onChange={(e) => setResetPasswordValue(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => generatePassword(setResetPasswordValue)}
                    >
                      Generate
                    </Button>
                  </div>
                  {resetPasswordValue && (
                    <p className="text-xs text-muted-foreground">
                      Make sure to copy this password before closing - it won't be shown again.
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={resetPassword} disabled={isSaving || !resetPasswordValue || resetPasswordValue.length < 6}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Group Dialog */}
          <Dialog open={isEditGroupDialogOpen} onOpenChange={(open) => {
            setIsEditGroupDialogOpen(open);
            if (!open) setEditingGroup(null);
          }}>
            <DialogContent className="max-w-2xl">
              {editingGroup && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: editingGroup.color }}
                      >
                        <UsersRound className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Group Name"
                          value={editingGroup.name}
                          onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                          className="font-medium"
                          disabled={editingGroup.is_system}
                        />
                      </div>
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6 mt-4">
                    {/* Description */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        placeholder="Describe the purpose of this group..."
                        value={editingGroup.description}
                        onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                        rows={2}
                        disabled={editingGroup.is_system}
                      />
                    </div>

                    {/* Color Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Group Color</label>
                      <div className="grid grid-cols-8 gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            onClick={() => setEditingGroup({ ...editingGroup, color })}
                            className="relative w-8 h-8 rounded-full hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: color }}
                            disabled={editingGroup.is_system}
                          >
                            {editingGroup.color === color && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-white drop-shadow-md" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Members */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Members ({editingGroup.members.length})</label>
                      <div className="flex flex-wrap gap-2">
                        {editingGroup.members.map(userId => {
                          const user = users.find(u => u.id === userId);
                          if (!user) return null;
                          return (
                            <Badge key={user.id} variant="secondary" className="gap-2 pr-1">
                              <Avatar className="w-4 h-4">
                                <AvatarImage src={user.avatar} alt={user.full_name} />
                                <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                              </Avatar>
                              {user.full_name}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 hover:bg-transparent"
                                onClick={() => setEditingGroup({
                                  ...editingGroup,
                                  members: editingGroup.members.filter(uId => uId !== userId)
                                })}
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                            </Badge>
                          );
                        })}
                        <Select
                          value=""
                          onValueChange={(userId) => {
                            if (!editingGroup.members.includes(userId)) {
                              setEditingGroup({
                                ...editingGroup,
                                members: [...editingGroup.members, userId]
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="w-auto h-8 gap-1">
                            <SelectValue placeholder="+ Add Member" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.filter(u => !editingGroup.members.includes(u.id) && !u.is_superuser).map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-5 h-5">
                                    <AvatarImage src={user.avatar} alt={user.full_name} />
                                    <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                                  </Avatar>
                                  {user.full_name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Permissions */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Permissions</label>
                      <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-3">
                        {/* Group by app_key */}
                        {['system', 'nova', 'pulsar'].map(appKey => {
                          const appPermissions = permissions.filter(p => p.app_key === appKey);
                          if (appPermissions.length === 0) return null;
                          return (
                            <div key={appKey} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase text-muted-foreground">
                                  {appKey}
                                </span>
                                <Separator className="flex-1" />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {appPermissions.map(perm => (
                                  <label
                                    key={perm.key}
                                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                                  >
                                    <Checkbox
                                      checked={editingGroup.permissions.includes(perm.key)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setEditingGroup({
                                            ...editingGroup,
                                            permissions: [...editingGroup.permissions, perm.key]
                                          });
                                        } else {
                                          setEditingGroup({
                                            ...editingGroup,
                                            permissions: editingGroup.permissions.filter(p => p !== perm.key)
                                          });
                                        }
                                      }}
                                    />
                                    <span className="truncate" title={perm.description || perm.key}>
                                      {perm.label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {editingGroup.permissions.length} permission(s) selected
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center pt-4 border-t">
                      {!editingGroup.is_system && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" className="gap-2 text-destructive">
                              <Trash2 className="w-4 h-4" />
                              Delete Group
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Group</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <span className="font-medium">{editingGroup.name}</span>?
                                This will remove all group memberships and permissions.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteGroup(editingGroup.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <div className="ml-auto flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditGroupDialogOpen(false);
                            setEditingGroup(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="default"
                          className="gap-2"
                          onClick={updateGroup}
                          disabled={!editingGroup.name || isSaving}
                        >
                          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <UsersRound className="w-4 h-4" />
            Groups ({groups.length})
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                          {group.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <Button
                  variant={showUnassigned ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowUnassigned(!showUnassigned)}
                  className="gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Unassigned ({users.filter(u => u.groups.length === 0 && !u.is_superuser).length})
                </Button>
                <div className="text-sm text-muted-foreground">
                  Showing {filteredUsers.length} of {users.length} users
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Groups</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => {
                      const userGroups = getUserGroups(user);
                      const quickBadge = getQuickActionBadge(user);
                      const isCurrentUser = currentAuthUser?.id === user.id;

                      return (
                        <TableRow key={user.id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={user.avatar} alt={user.full_name} />
                                <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {user.full_name}
                                  {user.is_superuser && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Crown className="w-4 h-4 text-amber-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>Superuser</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  {isCurrentUser && (
                                    <Badge variant="outline" className="text-xs">You</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(user.status)}
                              <Badge variant={getStatusBadgeVariant(user.status)}>
                                {user.status}
                              </Badge>
                              {quickBadge}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 flex-wrap">
                              {user.is_superuser ? (
                                <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200">
                                  <Crown className="w-3 h-3" />
                                  All Access
                                </Badge>
                              ) : userGroups.length > 0 ? (
                                userGroups.map(group => (
                                  <Badge
                                    key={group.id}
                                    variant="secondary"
                                    className="gap-1"
                                    style={{
                                      backgroundColor: `${group.color}20`,
                                      borderColor: group.color,
                                      color: group.color
                                    }}
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: group.color }}
                                    />
                                    {group.name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground">No groups</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Edit user dialog */}
                              <Dialog open={isDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                                setIsDialogOpen(open);
                                if (!open) {
                                  setSelectedUser(null);
                                  setEditedUser(null);
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setEditedUser(user);
                                      setIsDialogOpen(true);
                                    }}
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  {editedUser && (
                                    <>
                                      <DialogHeader>
                                        <DialogTitle className="flex items-center gap-3">
                                          <Avatar className="w-12 h-12">
                                            <AvatarImage src={editedUser.avatar} alt={editedUser.full_name} />
                                            <AvatarFallback>{getInitials(editedUser.full_name)}</AvatarFallback>
                                          </Avatar>
                                          <div>
                                            <div className="flex items-center gap-2">
                                              {editedUser.full_name}
                                              {editedUser.is_superuser && <Crown className="w-4 h-4 text-amber-500" />}
                                            </div>
                                            <div className="text-sm font-normal text-muted-foreground">
                                              {editedUser.email}
                                            </div>
                                          </div>
                                        </DialogTitle>
                                      </DialogHeader>

                                      <div className="space-y-6 mt-4">
                                        {/* Status */}
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium">Status</label>
                                          <Select
                                            value={editedUser.status.toLowerCase()}
                                            onValueChange={(value) => {
                                              updateUserStatus(editedUser.id, value as 'active' | 'pending' | 'inactive');
                                              setEditedUser({
                                                ...editedUser,
                                                status: (value.charAt(0).toUpperCase() + value.slice(1)) as any
                                              });
                                            }}
                                            disabled={editedUser.is_superuser || isSaving}
                                          >
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="active">Active</SelectItem>
                                              <SelectItem value="pending">Pending</SelectItem>
                                              <SelectItem value="inactive">Inactive</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          {editedUser.is_superuser && (
                                            <p className="text-xs text-muted-foreground">
                                              Superuser status cannot be changed
                                            </p>
                                          )}
                                        </div>

                                        {/* Groups */}
                                        {!editedUser.is_superuser && (
                                          <div className="space-y-2">
                                            <label className="text-sm font-medium">Groups</label>
                                            <div className="flex flex-wrap gap-2">
                                              {editedUser.groups.map(groupId => {
                                                const group = groups.find(g => g.id === groupId);
                                                if (!group) return null;
                                                return (
                                                  <Badge
                                                    key={group.id}
                                                    variant="secondary"
                                                    className="gap-2 pr-1"
                                                    style={{
                                                      backgroundColor: `${group.color}20`,
                                                      borderColor: group.color,
                                                      color: group.color
                                                    }}
                                                  >
                                                    <div
                                                      className="w-2 h-2 rounded-full"
                                                      style={{ backgroundColor: group.color }}
                                                    />
                                                    {group.name}
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-4 w-4 p-0 hover:bg-transparent"
                                                      onClick={() => removeUserFromGroup(editedUser.id, groupId)}
                                                      disabled={isSaving}
                                                    >
                                                      <XCircle className="w-3 h-3" />
                                                    </Button>
                                                  </Badge>
                                                );
                                              })}
                                              <Select
                                                value=""
                                                onValueChange={(groupId) => {
                                                  addUserToGroup(editedUser.id, groupId);
                                                  setEditedUser({
                                                    ...editedUser,
                                                    groups: [...editedUser.groups, groupId]
                                                  });
                                                }}
                                                disabled={isSaving}
                                              >
                                                <SelectTrigger className="w-auto h-8 gap-1">
                                                  <SelectValue placeholder="+ Add to Group" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {groups.filter(g => !editedUser.groups.includes(g.id)).map(group => (
                                                    <SelectItem key={group.id} value={group.id}>
                                                      <div className="flex items-center gap-2">
                                                        <div
                                                          className="w-2 h-2 rounded-full"
                                                          style={{ backgroundColor: group.color }}
                                                        />
                                                        {group.name}
                                                      </div>
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          </div>
                                        )}

                                        {/* Info */}
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                          <div>
                                            <div className="text-sm text-muted-foreground">Created</div>
                                            <div className="text-sm font-medium flex items-center gap-1 mt-1">
                                              <Calendar className="w-3 h-3" />
                                              {formatDistanceToNow(new Date(editedUser.created_at), { addSuffix: true })}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-sm text-muted-foreground">User ID</div>
                                            <div className="text-sm font-mono mt-1 truncate">
                                              {editedUser.id.slice(0, 8)}...
                                            </div>
                                          </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex justify-between items-center pt-4 border-t">
                                          {!editedUser.is_superuser && !isCurrentUser && (
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button variant="outline" className="gap-2 text-destructive">
                                                  <Trash2 className="w-4 h-4" />
                                                  Delete User
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    Are you sure you want to delete <span className="font-medium">{editedUser.full_name}</span>?
                                                    This will remove their account and all group memberships.
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                  <AlertDialogAction
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    onClick={() => {
                                                      deleteUser(editedUser.id, editedUser.auth_user_id);
                                                      setIsDialogOpen(false);
                                                    }}
                                                  >
                                                    Delete
                                                  </AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          )}
                                          <div className="ml-auto">
                                            <Button
                                              variant="outline"
                                              onClick={() => setIsDialogOpen(false)}
                                            >
                                              Close
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </DialogContent>
                              </Dialog>

                              {/* Reset Password button (quick action) */}
                              {!isCurrentUser && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Reset Password"
                                  onClick={() => openResetPassword(user.id)}
                                >
                                  <KeyRound className="w-4 h-4" />
                                </Button>
                              )}

                              {/* Delete button (quick action) */}
                              {!user.is_superuser && !isCurrentUser && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete <span className="font-medium">{user.full_name}</span>?
                                        This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => deleteUser(user.id, user.auth_user_id)}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {groups.map(group => {
              const members = getGroupMembers(group);
              return (
                <Card key={group.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {group.name}
                            {group.is_system && (
                              <Badge variant="outline" className="text-xs">System</Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {group.description || 'No description'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingGroup({ ...group });
                          setIsEditGroupDialogOpen(true);
                        }}
                        title="Edit Group"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Members</span>
                        <span className="font-medium">{members.length}</span>
                      </div>

                      {/* Member Avatars */}
                      {members.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {members.slice(0, 4).map(member => (
                              <Avatar key={member.id} className="w-8 h-8 border-2 border-background">
                                <AvatarImage src={member.avatar} alt={member.full_name} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(member.full_name)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          {members.length > 4 && (
                            <span className="text-sm text-muted-foreground">
                              +{members.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Permissions count */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Permissions</span>
                        <Badge variant="outline">{group.permissions.length}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

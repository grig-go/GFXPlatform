import { useState, useEffect } from 'react';
import {
  Users,
  MoreHorizontal,
  Building2,
  Pencil,
  Loader2,
  Search,
  ArrowLeft,
  UserX,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  name: string | null;
  organizationId: string | null;
  organizationName: string | null;
  role: string;
  createdAt: string;
  lastLogin: string | null;
  status: string;
}

interface Organization {
  id: string;
  name: string;
}

interface UserListProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export function UserList({ onNavigate }: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('member');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!supabase) return;

    try {
      setLoading(true);

      // Load users
      const { data: usersData, error: usersError } = await supabase.rpc('get_all_users');
      if (usersError) throw usersError;

      setUsers(
        (usersData || []).map((u: any) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          organizationId: u.organization_id,
          organizationName: u.organization_name,
          role: u.role || 'member',
          createdAt: u.created_at,
          lastLogin: u.last_login,
          status: u.status || 'active',
        }))
      );

      // Load organizations for filter and assignment
      const { data: orgsData, error: orgsError } = await supabase.rpc('get_all_organizations');
      if (orgsError) throw orgsError;

      setOrganizations(
        (orgsData || []).map((o: any) => ({
          id: o.id,
          name: o.name,
        }))
      );
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = async () => {
    if (!supabase || !assignDialog.user || !selectedOrg) return;

    try {
      setAssigning(true);
      const { data, error } = await supabase.rpc('assign_user_to_organization', {
        p_user_id: assignDialog.user.id,
        p_org_id: selectedOrg,
        p_role: selectedRole,
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('User assigned to organization');
        setAssignDialog({ open: false, user: null });
        setSelectedOrg('');
        setSelectedRole('member');
        loadData();
      } else {
        throw new Error(data?.error || 'Failed to assign user');
      }
    } catch (err) {
      console.error('Failed to assign user:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to assign user');
    } finally {
      setAssigning(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesOrg =
      orgFilter === 'all' ||
      (orgFilter === 'orphaned' && !user.organizationId) ||
      user.organizationId === orgFilter;

    return matchesSearch && matchesOrg;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => onNavigate('admin')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-muted-foreground">
            Manage all users across organizations
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={orgFilter} onValueChange={setOrgFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Organizations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organizations</SelectItem>
            <SelectItem value="orphaned">Orphaned Users</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {searchQuery || orgFilter !== 'all'
                    ? 'No users match your filters'
                    : 'No users found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.name || 'No name'}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.organizationName ? (
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {user.organizationName}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <UserX className="w-4 h-4" />
                        Orphaned
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.status === 'active' ? 'default' : 'secondary'}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleDateString()
                      : 'Never'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setAssignDialog({ open: true, user });
                            setSelectedOrg(user.organizationId || '');
                            setSelectedRole(user.role);
                          }}
                        >
                          <Building2 className="w-4 h-4 mr-2" />
                          Assign to Organization
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Assign to Organization Dialog */}
      <Dialog
        open={assignDialog.open}
        onOpenChange={(open) => setAssignDialog({ open, user: assignDialog.user })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Organization</DialogTitle>
            <DialogDescription>
              Assign {assignDialog.user?.email} to an organization with a specific role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization</label>
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialog({ open: false, user: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleAssignUser} disabled={assigning || !selectedOrg}>
              {assigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

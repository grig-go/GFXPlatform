import { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  FolderKanban,
  Plus,
  MoreHorizontal,
  LogIn,
  Pencil,
  Trash2,
  Loader2,
  Search,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  slug: string;
  userCount: number;
  projectCount: number;
  maxProjects: number;
  maxStorageMb: number;
  createdAt: string;
}

interface OrganizationListProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
  onImpersonate: (orgId: string, orgName: string) => void;
}

export function OrganizationList({ onNavigate, onImpersonate }: OrganizationListProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; org: Organization | null }>({
    open: false,
    org: null,
  });
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', slug: '', maxProjects: 10, maxStorageMb: 5000 });

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    if (!supabase) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_all_organizations');

      if (error) throw error;

      setOrganizations(
        (data || []).map((org: any) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          userCount: org.user_count || 0,
          projectCount: org.project_count || 0,
          maxProjects: org.max_projects || 10,
          maxStorageMb: org.max_storage_mb || 5000,
          createdAt: org.created_at,
        }))
      );
    } catch (err) {
      console.error('Failed to load organizations:', err);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (!supabase || !newOrg.name || !newOrg.slug) return;

    try {
      setCreating(true);
      const { data, error } = await supabase.rpc('create_organization', {
        p_name: newOrg.name,
        p_slug: newOrg.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        p_max_projects: newOrg.maxProjects,
        p_max_storage_mb: newOrg.maxStorageMb,
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Organization created successfully');
        setCreateDialog(false);
        setNewOrg({ name: '', slug: '', maxProjects: 10, maxStorageMb: 5000 });
        loadOrganizations();
      } else {
        throw new Error(data?.error || 'Failed to create organization');
      }
    } catch (err) {
      console.error('Failed to create organization:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!supabase || !deleteDialog.org || deleteConfirmName !== deleteDialog.org.name) return;

    try {
      setDeleting(true);
      const { data, error } = await supabase.rpc('delete_organization', {
        p_org_id: deleteDialog.org.id,
        p_confirm_name: deleteConfirmName,
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Organization deleted. ${data.users_orphaned} users orphaned.`);
        setDeleteDialog({ open: false, org: null });
        setDeleteConfirmName('');
        loadOrganizations();
      } else {
        throw new Error(data?.error || 'Failed to delete organization');
      }
    } catch (err) {
      console.error('Failed to delete organization:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete organization');
    } finally {
      setDeleting(false);
    }
  };

  const filteredOrgs = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => onNavigate('admin')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Organizations</h1>
            <p className="text-muted-foreground">
              Manage all organizations in the system
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Organization
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Projects</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {searchQuery ? 'No organizations match your search' : 'No organizations found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredOrgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{org.name}</div>
                      <div className="text-sm text-muted-foreground">{org.slug}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      {org.userCount}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <FolderKanban className="w-4 h-4 text-muted-foreground" />
                      {org.projectCount} / {org.maxProjects}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(org.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onImpersonate(org.id, org.name)}>
                          <LogIn className="w-4 h-4 mr-2" />
                          Impersonate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onNavigate('admin-organization-detail', { id: org.id })}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteDialog({ open: true, org })}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
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

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>
              Create a new organization. You can assign users to it after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newOrg.name}
                onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                placeholder="Acme Corporation"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Slug</label>
              <Input
                value={newOrg.slug}
                onChange={(e) => setNewOrg({ ...newOrg, slug: e.target.value })}
                placeholder="acme-corp"
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier. Will be converted to lowercase.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Projects</label>
                <Input
                  type="number"
                  value={newOrg.maxProjects}
                  onChange={(e) => setNewOrg({ ...newOrg, maxProjects: parseInt(e.target.value) || 10 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Storage (MB)</label>
                <Input
                  type="number"
                  value={newOrg.maxStorageMb}
                  onChange={(e) => setNewOrg({ ...newOrg, maxStorageMb: parseInt(e.target.value) || 5000 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrganization} disabled={creating || !newOrg.name || !newOrg.slug}>
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, org: deleteDialog.org })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Organization</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All projects and related data will be permanently deleted.
              Users will be orphaned (not deleted).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-destructive/10 rounded-md text-sm">
              <p className="font-medium mb-2">This will:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Orphan {deleteDialog.org?.userCount || 0} users</li>
                <li>Delete {deleteDialog.org?.projectCount || 0} projects</li>
                <li>Remove all playlists, channels, and templates</li>
              </ul>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type "{deleteDialog.org?.name}" to confirm
              </label>
              <Input
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={deleteDialog.org?.name}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialog({ open: false, org: null });
                setDeleteConfirmName('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOrganization}
              disabled={deleting || deleteConfirmName !== deleteDialog.org?.name}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

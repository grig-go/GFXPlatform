import { useState, useEffect } from 'react';
import { Building2, Users, FolderKanban, Activity, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { supabase } from '@/lib/supabase';

interface DashboardStats {
  organizations: {
    total: number;
    createdLast30Days: number;
  };
  users: {
    total: number;
    active: number;
    orphaned: number;
  };
  projects: {
    total: number;
    live: number;
    archived: number;
  };
  recentActivity: Array<{
    id: string;
    userEmail: string;
    action: string;
    resourceType: string;
    resourceName: string;
    createdAt: string;
  }>;
}

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (!supabase) {
      setError('Supabase not configured');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: rpcError } = await supabase.rpc('get_admin_dashboard_stats');

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (data) {
        setStats({
          organizations: {
            total: data.organizations?.total || 0,
            createdLast30Days: data.organizations?.created_last_30_days || 0,
          },
          users: {
            total: data.users?.total || 0,
            active: data.users?.active || 0,
            orphaned: data.users?.orphaned || 0,
          },
          projects: {
            total: data.projects?.total || 0,
            live: data.projects?.live || 0,
            archived: data.projects?.archived || 0,
          },
          recentActivity: (data.recent_activity || []).map((a: any) => ({
            id: a.id,
            userEmail: a.user_email,
            action: a.action,
            resourceType: a.resource_type,
            resourceName: a.resource_name,
            createdAt: a.created_at,
          })),
        });
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
        <p className="text-muted-foreground mt-2">
          Make sure you have superuser access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          System-wide overview and management
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate('admin-organizations')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.organizations.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.organizations.createdLast30Days || 0} in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate('admin-users')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.users.active || 0} active, {stats?.users.orphaned || 0} orphaned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderKanban className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.projects.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.projects.live || 0} live, {stats?.projects.archived || 0} archived
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 text-sm">
                  <div className="flex-1">
                    <p>
                      <span className="font-medium">{activity.userEmail}</span>{' '}
                      <span className="text-muted-foreground">{activity.action}</span>{' '}
                      <span className="font-medium">{activity.resourceName || activity.resourceType}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

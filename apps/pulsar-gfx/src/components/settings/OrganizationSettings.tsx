import { useState, useEffect } from 'react';
import { Building2, Users } from 'lucide-react';
import {
  Separator,
} from '@emergent-platform/ui';
import { useAuthStore, type AppUser } from '@/stores/authStore';

export function OrganizationSettings() {
  const { user, organization, getOrganizationMembers } = useAuthStore();
  const [members, setMembers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setIsLoading(true);
    const data = await getOrganizationMembers();
    setMembers(data);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Organization</h2>
        <p className="text-sm text-muted-foreground">
          View your organization details
        </p>
      </div>

      <Separator />

      {/* Organization Info */}
      <div className="p-4 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-medium">{organization?.name || 'No Organization'}</h3>
            <p className="text-sm text-muted-foreground">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-medium">Members</h3>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="text-sm text-muted-foreground">No members found</div>
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
                  <span className="px-2 py-1 text-xs rounded-full bg-muted capitalize">
                    {member.role}
                  </span>
                  {member.isEmergentUser && (
                    <span className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-400">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!user?.isEmergentUser && (
        <p className="text-sm text-muted-foreground">
          Contact an admin to manage organization settings.
        </p>
      )}
    </div>
  );
}

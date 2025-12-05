import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  Building2,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@emergent-platform/ui';
import { useAuthStore } from '@/stores/authStore';
import { ProfileSettings } from './ProfileSettings';
import { OrganizationSettings } from './OrganizationSettings';
import { AdminPanel } from './AdminPanel';

type SettingsTab = 'profile' | 'organization' | 'admin';

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  // Determine initial tab from URL
  const getInitialTab = (): SettingsTab => {
    if (location.pathname.includes('/admin')) return 'admin';
    if (location.pathname.includes('/organization')) return 'organization';
    return 'profile';
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>(getInitialTab());

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as SettingsTab);
    if (tab === 'profile') {
      navigate('/settings', { replace: true });
    } else {
      navigate(`/settings/${tab}`, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="organization" className="gap-2">
              <Building2 className="w-4 h-4" />
              Organization
            </TabsTrigger>
            {user?.isEmergentUser && (
              <TabsTrigger value="admin" className="gap-2">
                <Shield className="w-4 h-4" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="organization">
            <OrganizationSettings />
          </TabsContent>

          {user?.isEmergentUser && (
            <TabsContent value="admin">
              <AdminPanel />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

/**
 * Create Organization Wizard Component
 *
 * Multi-step wizard for superusers to create new organizations
 * with seed data selection and admin invitation.
 */

import { useState, useEffect } from 'react';
import {
  Building2,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Database,
  UserPlus,
  Sparkles,
  Globe,
  Cloud,
  TrendingUp,
  Trophy,
  Vote,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabase';

interface CreateOrgWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (orgId: string) => void;
}

interface SeedCategory {
  category: string;
  table_name: string;
  item_count: number;
}

interface SeedItem {
  id: string;
  name: string;
  description: string | null;
}

// Dashboard data item types
interface WeatherLocation {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
}

interface StockItem {
  id: string;
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

interface SportsLeague {
  id: string;
  name: string;
  sport: string;
  type: string;
  active: boolean;
}

interface Election {
  id: string;
  name: string;
  year: number;
  type: string;
  level: string;
  status: string;
  election_date: string;
}

interface DashboardData {
  weather_locations: WeatherLocation[];
  stocks: StockItem[];
  sports_leagues: SportsLeague[];
  elections: Election[];
}

type WizardStep = 'details' | 'seed' | 'dashboard' | 'admin' | 'complete';

// Map database category names to user-friendly display names and descriptions
const CATEGORY_CONFIG: Record<string, { name: string; description: string }> = {
  api_endpoints: {
    name: 'Agents',
    description: 'Data endpoints for weather, sports, elections, stocks, and other dashboards',
  },
  agents: {
    name: 'Tasks',
    description: 'Scheduled automation tasks that run periodically',
  },
  data_providers: {
    name: 'Data Providers',
    description: 'External data sources like weather APIs, sports feeds, etc.',
  },
  feeds: {
    name: 'Feeds',
    description: 'RSS feeds, news sources, and content streams',
  },
  ai_providers: {
    name: 'AI Providers',
    description: 'AI model configurations (API keys not copied)',
  },
  gfx_projects: {
    name: 'GFX Projects',
    description: 'Broadcast graphics projects with all templates and elements',
  },
  templates: {
    name: 'Templates',
    description: 'Reusable template configurations',
  },
  pulsar_channels: {
    name: 'Channels',
    description: 'Pulsar broadcast channels',
  },
  data_sources: {
    name: 'Data Sources',
    description: 'Data tables (auto-included with selected Agents)',
  },
};

const getCategoryDisplayName = (category: string): string => {
  return CATEGORY_CONFIG[category]?.name || category.replace(/_/g, ' ');
};

const getCategoryDescription = (category: string): string => {
  return CATEGORY_CONFIG[category]?.description || '';
};

// Categories hidden from user (auto-managed based on dependencies)
const HIDDEN_CATEGORIES = ['data_sources'];

export function CreateOrgWizard({ open, onOpenChange, onSuccess }: CreateOrgWizardProps) {
  const [step, setStep] = useState<WizardStep>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSeed, setIsLoadingSeed] = useState(false);

  // Step 1: Organization Details
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [allowedDomains, setAllowedDomains] = useState('');

  // Step 2: Seed Data
  const [seedCategories, setSeedCategories] = useState<SeedCategory[]>([]);
  const [seedItems, setSeedItems] = useState<Record<string, SeedItem[]>>({});
  const [selectedSeeds, setSelectedSeeds] = useState<Record<string, string[]>>({});
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Step 3: Dashboard Data
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [selectedDashboardData, setSelectedDashboardData] = useState<{
    weather_locations: string[];
    stocks: string[];
    sports_leagues: string[];
    elections: string[];
  }>({
    weather_locations: [],
    stocks: [],
    sports_leagues: [],
    elections: [],
  });
  const [expandedDashboard, setExpandedDashboard] = useState<string | null>(null);

  // Step 4: Admin Invitation
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');

  // Result
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('details');
        setOrgName('');
        setOrgSlug('');
        setAllowedDomains('');
        setSelectedSeeds({});
        setSelectedDashboardData({
          weather_locations: [],
          stocks: [],
          sports_leagues: [],
          elections: [],
        });
        setAdminEmail('');
        setAdminName('');
        setCreatedOrgId(null);
        setInvitationToken(null);
      }, 200);
    }
  }, [open]);

  // Auto-generate slug from name
  useEffect(() => {
    if (orgName && !orgSlug) {
      setOrgSlug(
        orgName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      );
    }
  }, [orgName]);

  // Load seed categories when entering seed step
  useEffect(() => {
    if (step === 'seed' && seedCategories.length === 0) {
      loadSeedCategories();
    }
  }, [step]);

  // Load dashboard data when entering dashboard step
  useEffect(() => {
    if (step === 'dashboard' && !dashboardData) {
      loadDashboardData();
    }
  }, [step]);

  // Auto-select data source dependencies when API endpoints selection changes
  useEffect(() => {
    if (step === 'seed') {
      fetchAndSelectDependencies();
    }
  }, [selectedSeeds['api_endpoints']]);

  const loadSeedCategories = async () => {
    setIsLoadingSeed(true);
    try {
      const { data, error } = await supabase.rpc('get_seedable_data_summary');
      if (error) throw error;
      setSeedCategories(data || []);
    } catch (err) {
      console.error('Error loading seed categories:', err);
      toast.error('Failed to load seed data options');
    } finally {
      setIsLoadingSeed(false);
    }
  };

  const loadDashboardData = async () => {
    setIsLoadingDashboard(true);
    try {
      const { data, error } = await supabase.rpc('get_seedable_dashboard_data');
      if (error) throw error;
      setDashboardData(data || { weather_locations: [], stocks: [], sports_leagues: [], elections: [] });
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      toast.error('Failed to load dashboard data options');
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const toggleDashboardItem = (category: keyof typeof selectedDashboardData, itemId: string) => {
    setSelectedDashboardData(prev => {
      const current = prev[category];
      const newSelection = current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : [...current, itemId];
      return { ...prev, [category]: newSelection };
    });
  };

  const selectAllDashboardItems = (category: keyof typeof selectedDashboardData) => {
    if (!dashboardData) return;
    const items = dashboardData[category] || [];
    setSelectedDashboardData(prev => ({
      ...prev,
      [category]: items.map(item => item.id),
    }));
  };

  const deselectAllDashboardItems = (category: keyof typeof selectedDashboardData) => {
    setSelectedDashboardData(prev => ({
      ...prev,
      [category]: [],
    }));
  };

  const getTotalDashboardSelectedCount = () => {
    return Object.values(selectedDashboardData).reduce((sum, ids) => sum + ids.length, 0);
  };

  const loadSeedItems = async (category: string) => {
    if (seedItems[category]) return;

    try {
      const { data, error } = await supabase.rpc('get_seedable_items', { p_category: category });
      if (error) throw error;
      setSeedItems(prev => ({ ...prev, [category]: data || [] }));
    } catch (err) {
      console.error('Error loading seed items:', err);
    }
  };

  const toggleCategory = async (category: string) => {
    if (expandedCategory === category) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(category);
      await loadSeedItems(category);
    }
  };

  const toggleSeedItem = (category: string, itemId: string) => {
    setSelectedSeeds(prev => {
      const current = prev[category] || [];
      const newSelection = current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : [...current, itemId];
      return { ...prev, [category]: newSelection };
    });
  };

  const selectAllInCategory = (category: string) => {
    const items = seedItems[category] || [];
    setSelectedSeeds(prev => ({
      ...prev,
      [category]: items.map(item => item.id),
    }));
  };

  const deselectAllInCategory = (category: string) => {
    setSelectedSeeds(prev => ({
      ...prev,
      [category]: [],
    }));
  };

  const handleNext = () => {
    if (step === 'details') {
      if (!orgName.trim() || !orgSlug.trim()) {
        toast.error('Please fill in organization name and slug');
        return;
      }
      setStep('seed');
    } else if (step === 'seed') {
      setStep('dashboard');
    } else if (step === 'dashboard') {
      setStep('admin');
    } else if (step === 'admin') {
      createOrganization();
    }
  };

  const handleBack = () => {
    if (step === 'seed') setStep('details');
    else if (step === 'dashboard') setStep('seed');
    else if (step === 'admin') setStep('dashboard');
  };

  const createOrganization = async () => {
    setIsLoading(true);
    try {
      // Build seed config from selections
      const seedConfig: Record<string, string[]> = {};
      Object.entries(selectedSeeds).forEach(([category, ids]) => {
        if (ids.length > 0) {
          seedConfig[category] = ids;
        }
      });

      // Build dashboard data config
      const dashboardConfig: Record<string, string[]> = {};
      Object.entries(selectedDashboardData).forEach(([category, ids]) => {
        if (ids.length > 0) {
          dashboardConfig[category] = ids;
        }
      });

      // Parse allowed domains
      const domains = allowedDomains
        .split(',')
        .map(d => d.trim().toLowerCase())
        .filter(d => d.length > 0);

      // Call RPC function to create org with seed data
      const { data, error } = await supabase.rpc('create_organization_with_seed', {
        p_name: orgName,
        p_slug: orgSlug,
        p_allowed_domains: domains,
        p_admin_email: adminEmail || null,
        p_seed_config: Object.keys(seedConfig).length > 0 ? seedConfig : null,
        p_dashboard_config: Object.keys(dashboardConfig).length > 0 ? dashboardConfig : null,
      });

      if (error) {
        if (error.message.includes('slug already exists')) {
          toast.error('Organization slug already exists. Please choose a different one.');
          setStep('details');
          return;
        }
        throw error;
      }

      setCreatedOrgId(data.organization_id);
      setInvitationToken(data.invitation_token);
      setStep('complete');
      toast.success('Organization created successfully!');
      onSuccess?.(data.organization_id);
    } catch (err) {
      console.error('Error creating organization:', err);
      toast.error('Failed to create organization');
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (invitationToken) {
      const link = `${window.location.origin}/signup?invite=${invitationToken}`;
      navigator.clipboard.writeText(link);
      toast.success('Invite link copied to clipboard');
    }
  };

  const getTotalSelectedCount = () => {
    // Only count visible categories (exclude hidden ones like data_sources)
    return Object.entries(selectedSeeds)
      .filter(([category]) => !HIDDEN_CATEGORIES.includes(category))
      .reduce((sum, [, ids]) => sum + ids.length, 0);
  };

  // Fetch and auto-select data source dependencies for selected API endpoints
  const fetchAndSelectDependencies = async () => {
    const selectedEndpoints = selectedSeeds['api_endpoints'] || [];
    if (selectedEndpoints.length === 0) {
      // Clear auto-selected data sources if no endpoints selected
      setSelectedSeeds(prev => ({ ...prev, data_sources: [] }));
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_api_endpoint_dependencies', {
        p_endpoint_ids: selectedEndpoints,
      });

      if (error) {
        console.error('Error fetching dependencies:', error);
        return;
      }

      // Extract unique data source IDs
      const dataSourceIds = [...new Set((data || []).map((d: { data_source_id: string }) => d.data_source_id))];

      // Auto-select these data sources
      setSelectedSeeds(prev => ({
        ...prev,
        data_sources: dataSourceIds,
      }));
    } catch (err) {
      console.error('Error fetching dependencies:', err);
    }
  };

  const STEPS: WizardStep[] = ['details', 'seed', 'dashboard', 'admin', 'complete'];

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              s === step
                ? 'bg-primary text-primary-foreground'
                : step === 'complete' || (i < STEPS.indexOf(step))
                ? 'bg-green-500 text-white'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {step === 'complete' || (i < STEPS.indexOf(step)) ? (
              <Check className="w-4 h-4" />
            ) : (
              i + 1
            )}
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-8 h-0.5 ${
                i < STEPS.indexOf(step)
                  ? 'bg-green-500'
                  : 'bg-muted'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create New Organization
          </DialogTitle>
          <DialogDescription>
            {step === 'details' && 'Enter organization details'}
            {step === 'seed' && 'Select data templates to copy from Emergent'}
            {step === 'dashboard' && 'Select dashboard data to seed (weather, sports, elections, stocks)'}
            {step === 'admin' && 'Invite the first admin'}
            {step === 'complete' && 'Organization created successfully!'}
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        <ScrollArea className="h-[400px] pr-4">
          {/* Step 1: Organization Details */}
          {step === 'details' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name *</Label>
                <Input
                  id="orgName"
                  placeholder="WXYZ News"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgSlug">Slug *</Label>
                <Input
                  id="orgSlug"
                  placeholder="wxyz-news"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                />
                <p className="text-xs text-muted-foreground">
                  Used in URLs and as a unique identifier
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="domains">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Allowed Email Domains
                  </div>
                </Label>
                <Input
                  id="domains"
                  placeholder="wxyz.com, wxyz.tv"
                  value={allowedDomains}
                  onChange={(e) => setAllowedDomains(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated domains for self-signup (optional)
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Seed Data Selection */}
          {step === 'seed' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Select data templates to copy from Emergent organization
                </p>
                <Badge variant="secondary">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {getTotalSelectedCount()} items selected
                </Badge>
              </div>

              {isLoadingSeed ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : seedCategories.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Database className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No seed data available</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {seedCategories
                    .filter((cat) => !HIDDEN_CATEGORIES.includes(cat.category))
                    .map((cat) => (
                    <Card key={cat.category} className="overflow-hidden">
                      <CardHeader
                        className="py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleCategory(cat.category)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4 text-muted-foreground" />
                              <CardTitle className="text-sm font-medium">
                                {getCategoryDisplayName(cat.category)}
                              </CardTitle>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 ml-6">
                              {getCategoryDescription(cat.category)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{cat.item_count} items</Badge>
                            {(selectedSeeds[cat.category]?.length || 0) > 0 && (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                                {selectedSeeds[cat.category].length} selected
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      {expandedCategory === cat.category && (
                        <CardContent className="pt-0" onClick={(e) => e.stopPropagation()}>
                          <Separator className="mb-3" />
                          <div className="flex justify-end gap-2 mb-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectAllInCategory(cat.category);
                              }}
                            >
                              Select All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deselectAllInCategory(cat.category);
                              }}
                            >
                              Clear
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {(seedItems[cat.category] || []).map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSeedItem(cat.category, item.id);
                                }}
                              >
                                <Checkbox
                                  id={item.id}
                                  checked={(selectedSeeds[cat.category] || []).includes(item.id)}
                                  onCheckedChange={() => toggleSeedItem(cat.category, item.id)}
                                />
                                <div className="flex-1">
                                  <label
                                    htmlFor={item.id}
                                    className="text-sm font-medium cursor-pointer"
                                  >
                                    {item.name}
                                  </label>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Dashboard Data Selection */}
          {step === 'dashboard' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Select dashboard data to copy for weather, sports, elections, and finance
                </p>
                <Badge variant="secondary">
                  <Database className="w-3 h-3 mr-1" />
                  {getTotalDashboardSelectedCount()} items selected
                </Badge>
              </div>

              {isLoadingDashboard ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !dashboardData ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Database className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No dashboard data available</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {/* Weather Locations */}
                  <Card className="overflow-hidden">
                    <CardHeader
                      className="py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedDashboard(expandedDashboard === 'weather' ? null : 'weather')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cloud className="h-4 w-4 text-blue-500" />
                          <CardTitle className="text-sm font-medium">Weather Locations</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{dashboardData.weather_locations.length} locations</Badge>
                          {selectedDashboardData.weather_locations.length > 0 && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                              {selectedDashboardData.weather_locations.length} selected
                            </Badge>
                          )}
                          {expandedDashboard === 'weather' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </CardHeader>
                    {expandedDashboard === 'weather' && (
                      <CardContent className="pt-0" onClick={(e) => e.stopPropagation()}>
                        <Separator className="mb-3" />
                        <div className="flex justify-end gap-2 mb-2">
                          <Button variant="ghost" size="sm" onClick={() => selectAllDashboardItems('weather_locations')}>Select All</Button>
                          <Button variant="ghost" size="sm" onClick={() => deselectAllDashboardItems('weather_locations')}>Clear</Button>
                        </div>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {dashboardData.weather_locations.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                              onClick={() => toggleDashboardItem('weather_locations', item.id)}
                            >
                              <Checkbox
                                checked={selectedDashboardData.weather_locations.includes(item.id)}
                                onCheckedChange={() => toggleDashboardItem('weather_locations', item.id)}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.location}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Stocks/Finance */}
                  <Card className="overflow-hidden">
                    <CardHeader
                      className="py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedDashboard(expandedDashboard === 'stocks' ? null : 'stocks')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <CardTitle className="text-sm font-medium">Stocks & Crypto</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{dashboardData.stocks.length} symbols</Badge>
                          {selectedDashboardData.stocks.length > 0 && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                              {selectedDashboardData.stocks.length} selected
                            </Badge>
                          )}
                          {expandedDashboard === 'stocks' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </CardHeader>
                    {expandedDashboard === 'stocks' && (
                      <CardContent className="pt-0" onClick={(e) => e.stopPropagation()}>
                        <Separator className="mb-3" />
                        <div className="flex justify-end gap-2 mb-2">
                          <Button variant="ghost" size="sm" onClick={() => selectAllDashboardItems('stocks')}>Select All</Button>
                          <Button variant="ghost" size="sm" onClick={() => deselectAllDashboardItems('stocks')}>Clear</Button>
                        </div>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {dashboardData.stocks.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                              onClick={() => toggleDashboardItem('stocks', item.id)}
                            >
                              <Checkbox
                                checked={selectedDashboardData.stocks.includes(item.id)}
                                onCheckedChange={() => toggleDashboardItem('stocks', item.id)}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{item.symbol}</p>
                                <p className="text-xs text-muted-foreground">{item.name} ({item.type})</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Sports Leagues */}
                  <Card className="overflow-hidden">
                    <CardHeader
                      className="py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedDashboard(expandedDashboard === 'sports' ? null : 'sports')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <CardTitle className="text-sm font-medium">Sports Leagues</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{dashboardData.sports_leagues.length} leagues</Badge>
                          {selectedDashboardData.sports_leagues.length > 0 && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                              {selectedDashboardData.sports_leagues.length} selected
                            </Badge>
                          )}
                          {expandedDashboard === 'sports' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </CardHeader>
                    {expandedDashboard === 'sports' && (
                      <CardContent className="pt-0" onClick={(e) => e.stopPropagation()}>
                        <Separator className="mb-3" />
                        <div className="flex justify-end gap-2 mb-2">
                          <Button variant="ghost" size="sm" onClick={() => selectAllDashboardItems('sports_leagues')}>Select All</Button>
                          <Button variant="ghost" size="sm" onClick={() => deselectAllDashboardItems('sports_leagues')}>Clear</Button>
                        </div>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {dashboardData.sports_leagues.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                              onClick={() => toggleDashboardItem('sports_leagues', item.id)}
                            >
                              <Checkbox
                                checked={selectedDashboardData.sports_leagues.includes(item.id)}
                                onCheckedChange={() => toggleDashboardItem('sports_leagues', item.id)}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.sport} • {item.type}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Elections */}
                  <Card className="overflow-hidden">
                    <CardHeader
                      className="py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedDashboard(expandedDashboard === 'elections' ? null : 'elections')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Vote className="h-4 w-4 text-purple-500" />
                          <CardTitle className="text-sm font-medium">Elections</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{dashboardData.elections.length} elections</Badge>
                          {selectedDashboardData.elections.length > 0 && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                              {selectedDashboardData.elections.length} selected
                            </Badge>
                          )}
                          {expandedDashboard === 'elections' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </CardHeader>
                    {expandedDashboard === 'elections' && (
                      <CardContent className="pt-0" onClick={(e) => e.stopPropagation()}>
                        <Separator className="mb-3" />
                        <div className="flex justify-end gap-2 mb-2">
                          <Button variant="ghost" size="sm" onClick={() => selectAllDashboardItems('elections')}>Select All</Button>
                          <Button variant="ghost" size="sm" onClick={() => deselectAllDashboardItems('elections')}>Clear</Button>
                        </div>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {dashboardData.elections.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                              onClick={() => toggleDashboardItem('elections', item.id)}
                            >
                              <Checkbox
                                checked={selectedDashboardData.elections.includes(item.id)}
                                onCheckedChange={() => toggleDashboardItem('elections', item.id)}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.year} • {item.type} • {item.level}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Admin Invitation */}
          {step === 'admin' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserPlus className="h-5 w-5" />
                    Invite First Admin
                  </CardTitle>
                  <CardDescription>
                    Send an invitation to the person who will manage this organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Admin Email</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      placeholder="admin@example.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminName">Admin Name (optional)</Label>
                    <Input
                      id="adminName"
                      placeholder="John Smith"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <p className="text-sm text-muted-foreground text-center">
                You can skip this step and invite admins later
              </p>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && (
            <div className="space-y-4">
              <Card className="border-green-500/50">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                    <Check className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{orgName} Created!</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    The organization has been created successfully
                    {(getTotalSelectedCount() > 0 || getTotalDashboardSelectedCount() > 0) &&
                      ` with ${getTotalSelectedCount() + getTotalDashboardSelectedCount()} seed items`}
                  </p>

                  {invitationToken && (
                    <div className="w-full p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Admin Invitation Link:</p>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={`${window.location.origin}/signup?invite=${invitationToken}`}
                          className="text-xs"
                        />
                        <Button size="sm" onClick={copyInviteLink}>
                          Copy
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Share this link with the admin to complete their account setup
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between pt-4 border-t mt-4">
          {step === 'complete' ? (
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={step === 'details' ? () => onOpenChange(false) : handleBack}
                disabled={isLoading}
              >
                {step === 'details' ? (
                  'Cancel'
                ) : (
                  <>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </>
                )}
              </Button>
              <Button onClick={handleNext} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : step === 'admin' ? (
                  <>
                    Create Organization
                    <Check className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

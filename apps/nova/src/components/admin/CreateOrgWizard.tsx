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

type WizardStep = 'details' | 'seed' | 'admin' | 'complete';

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

  // Step 3: Admin Invitation
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
      setStep('admin');
    } else if (step === 'admin') {
      createOrganization();
    }
  };

  const handleBack = () => {
    if (step === 'seed') setStep('details');
    else if (step === 'admin') setStep('seed');
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
    return Object.values(selectedSeeds).reduce((sum, ids) => sum + ids.length, 0);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {(['details', 'seed', 'admin', 'complete'] as WizardStep[]).map((s, i) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              s === step
                ? 'bg-primary text-primary-foreground'
                : step === 'complete' || (i < ['details', 'seed', 'admin', 'complete'].indexOf(step))
                ? 'bg-green-500 text-white'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {step === 'complete' || (i < ['details', 'seed', 'admin', 'complete'].indexOf(step)) ? (
              <Check className="w-4 h-4" />
            ) : (
              i + 1
            )}
          </div>
          {i < 3 && (
            <div
              className={`w-12 h-0.5 ${
                i < ['details', 'seed', 'admin', 'complete'].indexOf(step)
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
            {step === 'seed' && 'Select data to seed from Emergent'}
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
                  {seedCategories.map((cat) => (
                    <Card key={cat.category} className="overflow-hidden">
                      <CardHeader
                        className="py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleCategory(cat.category)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-medium capitalize">
                              {cat.category.replace(/_/g, ' ')}
                            </CardTitle>
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
                        <CardContent className="pt-0">
                          <Separator className="mb-3" />
                          <div className="flex justify-end gap-2 mb-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => selectAllInCategory(cat.category)}
                            >
                              Select All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deselectAllInCategory(cat.category)}
                            >
                              Clear
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {(seedItems[cat.category] || []).map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
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

          {/* Step 3: Admin Invitation */}
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

          {/* Step 4: Complete */}
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
                    {getTotalSelectedCount() > 0 && ` with ${getTotalSelectedCount()} seed items`}
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

import { supabase, getCurrentUser } from '../client';
import type { Organization, User } from '@emergent-platform/types';

/**
 * Get the current user's organization
 */
export async function getCurrentOrganization(): Promise<Organization | null> {
  if (!supabase) return null;

  const user = getCurrentUser();
  if (!user) return null;

  // First get the user's organization_id
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (userError || !userData?.organization_id) {
    console.error('Error fetching user organization:', userError);
    return null;
  }

  // Then get the organization
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', userData.organization_id)
    .single();

  if (error) {
    console.error('Error fetching organization:', error);
    return null;
  }

  return data;
}

/**
 * Get an organization by ID
 */
export async function getOrganization(organizationId: string): Promise<Organization | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();

  if (error) {
    console.error('Error fetching organization:', error);
    return null;
  }

  return data;
}

/**
 * Update an organization
 */
export async function updateOrganization(organizationId: string, updates: Partial<Organization>): Promise<Organization | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('organizations')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating organization:', error);
    return null;
  }

  return data;
}

/**
 * Get all users in an organization
 */
export async function getOrganizationUsers(organizationId: string): Promise<User[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error fetching organization users:', error);
    return [];
  }

  return data || [];
}

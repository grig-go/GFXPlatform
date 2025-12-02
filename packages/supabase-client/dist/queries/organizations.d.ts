import type { Organization, User } from '@emergent-platform/types';
/**
 * Get the current user's organization
 */
export declare function getCurrentOrganization(): Promise<Organization | null>;
/**
 * Get an organization by ID
 */
export declare function getOrganization(organizationId: string): Promise<Organization | null>;
/**
 * Update an organization
 */
export declare function updateOrganization(organizationId: string, updates: Partial<Organization>): Promise<Organization | null>;
/**
 * Get all users in an organization
 */
export declare function getOrganizationUsers(organizationId: string): Promise<User[]>;
//# sourceMappingURL=organizations.d.ts.map
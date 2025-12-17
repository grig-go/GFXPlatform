export interface User {
  id: string;
  avatar: string;
  full_name: string;
  email: string;
  role: string;
  status: 'Active' | 'Pending' | 'Inactive';
  last_login: string | null;
  groups: string[];
  permissions: string[];
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  color: string;
  members: string[];
  permissions: string[];
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface Permission {
  key: string;
  label: string;
  description?: string;
}

export interface UsersGroupsData {
  users: User[];
  groups: Group[];
  roles: Role[];
  permissions: Permission[];
  lastUpdated: string;
}

import { UsersGroupsData } from "../types/users";

export const mockUsersData: UsersGroupsData = {
  users: [
    {
      id: "usr_001",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
      full_name: "John Doe",
      email: "john.doe@app.com",
      role: "Admin",
      status: "Active",
      last_login: "2025-10-07T13:25:00Z",
      groups: ["grp_001", "grp_002"],
      permissions: ["read", "write", "manage_users"],
      created_at: "2024-11-02T09:00:00Z"
    },
    {
      id: "usr_002",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sara",
      full_name: "Sara Lee",
      email: "sara.lee@app.com",
      role: "Editor",
      status: "Pending",
      last_login: null,
      groups: ["grp_002"],
      permissions: ["read", "write"],
      created_at: "2025-01-14T09:00:00Z"
    },
    {
      id: "usr_003",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
      full_name: "Mike Johnson",
      email: "mike.johnson@app.com",
      role: "Editor",
      status: "Active",
      last_login: "2025-10-06T08:15:00Z",
      groups: ["grp_002", "grp_003"],
      permissions: ["read", "write"],
      created_at: "2024-12-15T10:30:00Z"
    },
    {
      id: "usr_004",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
      full_name: "Emma Wilson",
      email: "emma.wilson@app.com",
      role: "Viewer",
      status: "Active",
      last_login: "2025-09-08T14:20:00Z",
      groups: ["grp_003"],
      permissions: ["read"],
      created_at: "2025-02-10T11:00:00Z"
    },
    {
      id: "usr_005",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
      full_name: "Alex Chen",
      email: "alex.chen@app.com",
      role: "Admin",
      status: "Active",
      last_login: "2025-10-07T09:45:00Z",
      groups: ["grp_001"],
      permissions: ["read", "write", "delete", "manage_users", "manage_settings"],
      created_at: "2024-10-05T08:00:00Z"
    },
    {
      id: "usr_006",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
      full_name: "Lisa Martinez",
      email: "lisa.martinez@app.com",
      role: "Viewer",
      status: "Inactive",
      last_login: "2025-08-15T16:30:00Z",
      groups: [],
      permissions: ["read"],
      created_at: "2025-03-01T12:00:00Z"
    },
    {
      id: "usr_007",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
      full_name: "David Park",
      email: "david.park@app.com",
      role: "Editor",
      status: "Active",
      last_login: "2025-10-07T11:00:00Z",
      groups: ["grp_002"],
      permissions: ["read", "write"],
      created_at: "2025-01-20T09:30:00Z"
    },
    {
      id: "usr_008",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie",
      full_name: "Sophie Anderson",
      email: "sophie.anderson@app.com",
      role: "Viewer",
      status: "Pending",
      last_login: null,
      groups: [],
      permissions: ["read"],
      created_at: "2025-10-01T14:00:00Z"
    }
  ],
  groups: [
    {
      id: "grp_001",
      name: "Admins",
      description: "Full access to all app features and settings",
      color: "#FF6B6B",
      members: ["usr_001", "usr_005"],
      permissions: ["*"],
      created_at: "2024-10-02T10:00:00Z"
    },
    {
      id: "grp_002",
      name: "Content Editors",
      description: "Manage posts, data, and user-generated content",
      color: "#4ECDC4",
      members: ["usr_001", "usr_002", "usr_003", "usr_007"],
      permissions: ["read", "write"],
      created_at: "2025-02-20T10:00:00Z"
    },
    {
      id: "grp_003",
      name: "Analytics Team",
      description: "View and analyze app metrics and user data",
      color: "#95E1D3",
      members: ["usr_003", "usr_004"],
      permissions: ["read"],
      created_at: "2024-11-10T11:00:00Z"
    },
    {
      id: "grp_004",
      name: "Data Managers",
      description: "Import, export, and manage data sources",
      color: "#F38181",
      members: [],
      permissions: ["read", "write", "delete"],
      created_at: "2025-03-15T10:00:00Z"
    }
  ],
  roles: [
    {
      id: "role_admin",
      name: "Admin",
      permissions: ["read", "write", "delete", "manage_users", "manage_settings"]
    },
    {
      id: "role_editor",
      name: "Editor",
      permissions: ["read", "write"]
    },
    {
      id: "role_viewer",
      name: "Viewer",
      permissions: ["read"]
    }
  ],
  permissions: [
    { 
      key: "read", 
      label: "View Data",
      description: "Access and view all data, reports, and dashboards"
    },
    { 
      key: "write", 
      label: "Create & Edit Data",
      description: "Create new entries and modify existing data"
    },
    { 
      key: "delete", 
      label: "Delete Data",
      description: "Remove data entries and records permanently"
    },
    { 
      key: "manage_users", 
      label: "Manage Users & Roles",
      description: "Add, edit, and remove users; assign roles and permissions"
    },
    { 
      key: "manage_settings", 
      label: "Access App Settings",
      description: "Configure application settings, integrations, and preferences"
    }
  ],
  lastUpdated: new Date().toISOString()
};

---
sidebar_position: 10
---

# Permissions & Users

Nova provides granular permission control for users and groups.

## Overview

The permission system includes:
- Role-based access control
- Granular resource permissions
- Group management
- Channel-specific access

## User Roles

| Role | Description |
|------|-------------|
| Superuser | Full system access, can manage all settings |
| Admin | User and permission management |
| Active User | Access based on assigned permissions |
| Pending User | Read-only access until approved |
| Inactive | No access |

## Permission Model

Permissions follow the pattern: `{app}.{resource}.{action}`

### Apps
- `system` - System-wide permissions
- `nova` - Nova data dashboard
- `pulsar` - Pulsar playout

### Resources
| Resource | Description |
|----------|-------------|
| `election` | Election dashboard |
| `finance` | Finance dashboard |
| `sports` | Sports dashboard |
| `weather` | Weather dashboard |
| `news` | News dashboard |
| `school_closings` | School closings |
| `media` | Media library |
| `agents` | AI agents |
| `users` | User management |
| `channels` | Output channels |

### Actions
| Action | Description |
|--------|-------------|
| `read` | View data |
| `write` | Edit data |
| `admin` | Full control |

### Examples
```
nova.election.read     # View election data
nova.election.write    # Edit election data
nova.media.admin       # Full media library control
system.users.admin     # Manage users
pulsar.channels.write  # Control output channels
```

## Users

### User Properties
| Field | Description |
|-------|-------------|
| Email | Login email |
| Display Name | Name shown in UI |
| Role | User role |
| Status | Active, Pending, Inactive |
| Groups | Assigned groups |
| Permissions | Direct permissions |

### Creating Users

1. Navigate to Users & Groups
2. Click "Add User"
3. Enter email and name
4. Select role
5. Assign to groups
6. Grant direct permissions (optional)
7. Save

### User Status

**Pending**
- New users start as pending
- Read-only access
- Admin approval required

**Active**
- Full access per permissions
- Can perform assigned actions

**Inactive**
- No access
- Login blocked

## Groups

Groups simplify permission management:
- Assign users to groups
- Permissions apply to all group members
- Users inherit from all groups

### Creating Groups

1. Navigate to Users & Groups
2. Click "Add Group"
3. Enter group name and description
4. Assign permissions
5. Add members
6. Save

### Common Groups

| Group | Typical Permissions |
|-------|---------------------|
| Editors | Read/write on all dashboards |
| Producers | Read/write plus media |
| Engineers | Read on all, write on channels |
| Viewers | Read-only access |

## Channel Access

Control who can control output channels:

### Per-Channel Permissions
Each channel can have specific access rules:
- Users with write access
- Groups with write access
- Block specific users

### Channel Permissions
```
pulsar.channels.write          # General channel access
pulsar.channel.{id}.write      # Specific channel access
```

## First-Time Setup

### Create Superuser

Run the CLI command:
```bash
npm run create-superuser
```

Follow prompts to create the first admin account.

### Initial Configuration

1. Login as superuser
2. Create groups for common roles
3. Assign permissions to groups
4. Create user accounts
5. Assign users to groups
6. Activate users

## Permission Checks

### In Code
```typescript
// Check read access
if (canReadPage('election')) {
  // Show election dashboard
}

// Check write access
if (canWritePage('finance')) {
  // Enable edit buttons
}

// Check specific permission
if (hasPermission('nova.media.admin')) {
  // Show admin controls
}

// Check channel access
if (canWriteChannel(channelId)) {
  // Enable channel controls
}
```

### In UI
- Buttons disabled for insufficient permissions
- Menu items hidden for no access
- Warning messages for blocked actions

## Best Practices

### Group Strategy
- Create role-based groups
- Avoid excessive direct permissions
- Document group purposes
- Review regularly

### Security
- Use least-privilege principle
- Audit permission changes
- Disable unused accounts
- Rotate credentials

### Organization
- Consistent naming conventions
- Clear group descriptions
- Document permission requirements
- Track access requests

## Audit Log

Track permission-related events:
- User creation/modification
- Group changes
- Permission grants/revokes
- Login attempts

## Troubleshooting

### User Can't Access Dashboard
1. Check user status (must be Active)
2. Verify dashboard permission
3. Check group memberships
4. Test with direct permission

### Permission Not Working
1. Clear browser cache
2. Re-login to refresh session
3. Check for conflicting permissions
4. Verify permission syntax

### Locked Out
1. Contact superuser
2. Reset password via email
3. Check account status
4. Verify organization access

## Next Steps

- [Data Sources](/nova/data-sources) - Configure providers
- [AI Agents](/nova/agents) - Automated data collection
- [Graphics Projects](/nova/graphics) - Manage graphics

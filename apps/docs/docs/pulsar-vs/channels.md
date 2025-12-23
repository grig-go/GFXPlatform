---
sidebar_position: 3
---

# Channels

Channels in Pulsar VS represent output connections to Unreal Engine instances and other rendering targets.

## Overview

Channels enable:
- Connection to multiple Unreal Engine render nodes
- Different output configurations per channel
- Parallel control of multiple virtual sets
- Flexible routing for complex productions

## Channel Types

### Unreal Engine

Direct WebSocket connection to Unreal Engine:

| Property | Description |
|----------|-------------|
| **Host** | IP address or hostname |
| **Port** | WebSocket port (default: 8080) |
| **Project** | UE project identifier |

### Browser

HTML5 output for web-based displays:

| Property | Description |
|----------|-------------|
| **URL** | Browser source URL |
| **Resolution** | Output dimensions |
| **Background** | Transparent or solid |

### NDI

Network Device Interface output:

| Property | Description |
|----------|-------------|
| **Source Name** | NDI source identifier |
| **Resolution** | Output resolution |
| **Frame Rate** | Frames per second |

## Channel Management

### Accessing Channels

Navigate to **Tools > Channels** to open the Channels Manager.

### Channel List

```
┌─────────────────────────────────────────────────────────────┐
│  Channels                                        [+ Add]    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ● Main Studio                          Unreal Engine   ││
│  │   192.168.1.100:8080                   Connected       ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ○ Backup Studio                        Unreal Engine   ││
│  │   192.168.1.101:8080                   Disconnected    ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ● Web Preview                          Browser         ││
│  │   http://localhost:5173/preview        Active          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Creating Channels

### Add New Channel

1. Click **Add Channel**
2. Select channel type
3. Enter connection details
4. Test the connection
5. Save channel

### Configuration Fields

#### Unreal Engine Channel

```yaml
Name: Main Studio
Type: Unreal Engine
Host: 192.168.1.100
Port: 8080
Auto-connect: Yes
Reconnect Interval: 5s
```

#### Browser Channel

```yaml
Name: Web Preview
Type: Browser
URL: http://localhost:5173/preview
Resolution: 1920x1080
Background: Transparent
```

## Connection Status

### Status Indicators

| Indicator | Status | Description |
|-----------|--------|-------------|
| ● Green | Connected | Active connection |
| ○ Gray | Disconnected | No connection |
| ◐ Yellow | Connecting | Attempting connection |
| ● Red | Error | Connection failed |

### Auto-Reconnect

Channels automatically attempt reconnection:
- Configurable reconnect interval
- Maximum retry attempts
- Manual reconnect option

## Using Channels

### Assigning to Items

Each playlist item can be assigned a channel:

1. Select the playlist item
2. Choose channel from dropdown
3. Item will output to selected channel

### Default Channel

Set a project-wide default channel:
- New items use default channel
- Override per-item as needed
- Change default in project settings

### Multi-Channel Output

Send same content to multiple channels:
- Select multiple channels per item
- Useful for backup/redundancy
- Different resolutions supported

## Channel Groups

### Creating Groups

Organize channels for easier management:

1. Create a new group
2. Drag channels into group
3. Apply settings to group

### Group Operations

| Operation | Description |
|-----------|-------------|
| **Connect All** | Connect all channels in group |
| **Disconnect All** | Disconnect all channels |
| **Test All** | Test connections |

## Unreal Engine Setup

### UE Project Requirements

Your Unreal Engine project needs:
- WebSocket plugin enabled
- Pulsar receiver component
- Proper firewall configuration

### Connection Protocol

Communication uses WebSocket JSON messages:

```json
{
  "type": "set_property",
  "target": "VirtualSet",
  "property": "Floor",
  "value": "Concrete_01"
}
```

### Supported Commands

| Command | Description |
|---------|-------------|
| `set_property` | Change set property |
| `switch_camera` | Change active camera |
| `play_animation` | Trigger animation |
| `reset_scene` | Reset to defaults |

## Network Configuration

### Firewall Rules

Ensure these ports are open:

| Port | Protocol | Usage |
|------|----------|-------|
| 8080 | TCP | WebSocket (default) |
| 5960+ | UDP | NDI streams |

### Network Best Practices

- Use dedicated VLAN for production
- Minimize network hops
- Use wired connections (avoid WiFi)
- Monitor network latency

## Testing Channels

### Connection Test

1. Click test icon on channel
2. Verify connection established
3. Check round-trip latency
4. Confirm command receipt

### Latency Monitoring

View real-time latency metrics:
- Round-trip time (RTT)
- Packet loss percentage
- Connection stability

## Troubleshooting

### Cannot Connect

1. Verify host/port are correct
2. Check firewall settings
3. Confirm UE project is running
4. Test network connectivity

```bash
# Test connectivity
ping 192.168.1.100

# Test WebSocket port
telnet 192.168.1.100 8080
```

### Connection Drops

1. Check network stability
2. Increase reconnect interval
3. Review UE project logs
4. Monitor system resources

### High Latency

1. Reduce network traffic
2. Use dedicated network
3. Check for packet loss
4. Optimize UE project

## Best Practices

### Production Setup

- Configure primary and backup channels
- Test all connections before show
- Document IP addresses and ports
- Have manual control fallback

### Channel Naming

- Use descriptive names
- Include location/purpose
- Consistent naming convention
- Avoid special characters

### Maintenance

- Regularly test connections
- Update channel configurations
- Archive unused channels
- Document network topology

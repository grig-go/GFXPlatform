# Nova Media Gateway - Implementation Plan

## Overview

Build a standalone media gateway service using GStreamer that accepts RTP streams (with future NDI/SRT support) and outputs WebRTC for browser consumption. The service exposes a REST API for stream management and WebSocket for WebRTC signaling. Nova will serve as the admin interface, while a shared client SDK allows any app (Nova GFX, Fusion, Pulsar) to consume streams.

---

## Tech Stack

- Node.js + TypeScript for the control server
- GStreamer 1.20+ for media pipelines (using gstreamer-superficial or node-gstreamer bindings)
- WebSocket (ws library) for signaling
- Express for REST API
- GStreamer's webrtcsink element for WebRTC output

---

## GStreamer Installation (Windows)

### Download
Get both installers from: https://gstreamer.freedesktop.org/data/pkg/windows/

For 64-bit Windows (MSVC version recommended):
- `gstreamer-1.0-msvc-x86_64-X.XX.X.msi` (Runtime)
- `gstreamer-1.0-devel-msvc-x86_64-X.XX.X.msi` (Development)

### Install Steps
1. Run both MSI installers
2. Choose **Complete** installation to get all plugins
3. Note the install path (default: `C:\gstreamer\1.0\msvc_x86_64`)

### Environment Variables
Add to System PATH:
```
C:\gstreamer\1.0\msvc_x86_64\bin
```

Or set environment variable:
```
GSTREAMER_1_0_ROOT_MSVC_X86_64=C:\gstreamer\1.0\msvc_x86_64\
```

### Verify Installation
Open Command Prompt and run:
```cmd
gst-inspect-1.0 --version
gst-inspect-1.0 webrtcsink
gst-inspect-1.0 udpsrc
```

---

## Test Streams for Development

### Option 1: FFmpeg Test Pattern (Local)
Generate a local test stream - best for development:

```cmd
ffmpeg -re -f lavfi -i testsrc=size=1920x1080:rate=30 -c:v libx264 -profile:v baseline -tune zerolatency -f rtp rtp://127.0.0.1:5004
```

With audio:
```cmd
ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 -f lavfi -i sine=frequency=1000:sample_rate=48000 -c:v libx264 -profile:v baseline -tune zerolatency -c:a aac -f rtp_mpegts rtp://127.0.0.1:5004
```

### Option 2: GStreamer Test Pattern (Local)
```cmd
gst-launch-1.0 videotestsrc ! x264enc tune=zerolatency ! rtph264pay ! udpsink host=127.0.0.1 port=5004
```

### Option 3: Loop a Video File (Local)
```cmd
ffmpeg -re -stream_loop -1 -i your_video.mp4 -c:v libx264 -profile:v baseline -tune zerolatency -f rtp rtp://127.0.0.1:5004
```

### Option 4: OBS Studio (Local)
1. Settings → Stream → Service: Custom
2. Server: `rtp://127.0.0.1:5004`
3. Or use SRT output: `srt://127.0.0.1:9000`

### Option 5: Public RTSP Test Streams (Remote)
Use these for testing RTSP input (wraps RTP):

**Wowza Test Stream:**
```
rtsp://716f898c7b71.entrypoint.cloud.wowza.com:1935/app-8F9K44lJ/304679fe_stream2
```

**Highway Camera:**
```
rtsp://170.93.143.139/rtplive/470011e600ef003a004ee33696235daa
```

**Canal Water Stream:**
```
rtsp://807e9439d5ca.entrypoint.cloud.wowza.com:1935/app-rC94792j/068b9c9a_stream2
```

> Note: Public streams may go offline. Always have a local FFmpeg fallback ready.

### Option 6: NDI Test Sources (Future)
Install NDI Tools from NewTek (free): https://ndi.video/tools/
- NDI Test Patterns app generates test signals
- NDI Virtual Input for routing other sources

---

## Directory Structure

```
nova-media-gateway/
├── src/
│   ├── index.ts                 # Entry point
│   ├── config.ts                # Environment config (ports, IPs)
│   ├── api/
│   │   ├── routes.ts            # REST endpoints
│   │   └── handlers.ts          # Route handlers
│   ├── signaling/
│   │   └── websocket.ts         # WebRTC signaling server
│   ├── pipeline/
│   │   ├── manager.ts           # Pipeline lifecycle management
│   │   ├── factory.ts           # Creates GStreamer pipelines by input type
│   │   └── types.ts             # Input type definitions (RTP, future NDI/SRT)
│   └── utils/
│       └── logger.ts            # Logging utility
├── package.json
├── tsconfig.json
└── README.md
```

---

## Phase 1: Project Setup

1. Initialize Node.js project with TypeScript
2. Install dependencies: express, ws, uuid, dotenv
3. Set up tsconfig with ES modules, strict mode
4. Create config.ts that reads from environment:
   - API_PORT (default 3500)
   - RTP_PORT_RANGE_START (default 5004)
   - RTP_PORT_RANGE_END (default 5100)
   - ANNOUNCED_IP (default 127.0.0.1 for local dev)
   - LOG_LEVEL (default info)
5. Create basic Express server with health check endpoint
6. Create WebSocket server attached to same HTTP server

---

## Phase 2: GStreamer Integration

1. Verify GStreamer installation and webrtcsink element availability
2. Create pipeline/types.ts with interfaces:
   ```typescript
   interface StreamConfig {
     id: string;
     name: string;
     inputType: InputType;
     inputParams: RtpInputParams | RtspInputParams;
     status: 'idle' | 'running' | 'error';
   }
   
   enum InputType {
     RTP = 'rtp',
     RTSP = 'rtsp',
     NDI = 'ndi',   // future
     SRT = 'srt'    // future
   }
   
   interface RtpInputParams {
     port: number;
     codec: 'H264' | 'VP8';
     clockRate?: number;
     ssrc?: number;  // optional, for comedia mode
   }
   
   interface RtspInputParams {
     url: string;
     username?: string;
     password?: string;
   }
   ```

3. Create pipeline/factory.ts:
   - Function buildRtpToWebRtcPipeline(config: StreamConfig): string
   - Returns GStreamer pipeline string for RTP input to webrtcsink
   - Template:
     ```
     udpsrc port={port} caps="application/x-rtp,media=video,encoding-name=H264,clock-rate=90000" ! 
     rtph264depay ! h264parse ! 
     webrtcsink name=ws signaler::uri=ws://localhost:{signalingPort}/ws/{streamId}
     ```

4. Create pipeline/manager.ts:
   - Class PipelineManager
   - Map of active pipelines by stream ID
   - Methods: createStream(config), destroyStream(id), getStream(id), listStreams()
   - Spawns GStreamer process using child_process
   - Tracks pipeline state and handles cleanup

---

## Phase 3: REST API

1. Create api/routes.ts with endpoints:
   - GET /health - service health
   - GET /streams - list all streams
   - GET /streams/:id - get stream details
   - POST /streams - create new stream
   - DELETE /streams/:id - destroy stream

2. Create api/handlers.ts implementing each route

3. POST /streams request body schema:
   ```typescript
   {
     name: string,
     inputType: "rtp" | "rtsp",
     inputParams: {
       // For RTP:
       port: number,
       codec: "H264" | "VP8",
       clockRate?: number
       // For RTSP:
       url: string,
       username?: string,
       password?: string
     }
   }
   ```

4. Response includes stream ID and signaling URL path

---

## Phase 4: WebRTC Signaling

1. Create signaling/websocket.ts:
   - Handle WebSocket connections at path /signaling/:streamId
   - Validate stream exists and is active
   - Relay SDP offers/answers between webrtcsink and browser
   - Handle ICE candidate exchange

2. GStreamer's webrtcsink has a signaling interface - use its built-in signaler or implement custom one that bridges to our WebSocket

3. Support multiple viewers per stream (webrtcsink handles this)

---

## Phase 5: Client SDK

Create a separate package that apps import:

```
nova-media-client/
├── src/
│   ├── index.ts
│   ├── client.ts        # Main MediaGatewayClient class
│   ├── player.ts        # WebRTC connection handler
│   └── types.ts         # Shared types
├── package.json
└── tsconfig.json
```

### MediaGatewayClient class:
- Constructor takes gateway base URL
- Methods: listStreams(), getStream(id), connectToStream(id)

### connectToStream returns a MediaStream that can be attached to video element

### Handles WebSocket signaling, ICE candidates, reconnection logic

### Export React hook:
```typescript
function useMediaGateway(gatewayUrl: string, streamId: string): {
  stream: MediaStream | null;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: Error | null;
}
```

---

## Phase 6: Testing Setup

1. Create test script that launches FFmpeg test pattern:
   ```cmd
   ffmpeg -re -f lavfi -i testsrc=size=1920x1080:rate=30 -c:v libx264 -profile:v baseline -tune zerolatency -f rtp rtp://127.0.0.1:5004
   ```

2. Create simple HTML test page that uses the client SDK to view stream

3. Test workflow:
   - Start gateway service
   - Create stream via API pointing to port 5004
   - Start FFmpeg test pattern
   - Open test page, verify video plays

---

## Phase 7: Nova Integration

1. Add Media Gateway settings in Nova admin:
   - Gateway URL configuration
   - UI to create/manage RTP streams

2. Add RTP as stream source option alongside YouTube in Nova GFX

3. Use nova-media-client SDK in player component

---

## Future Phases (Not Implemented Now)

- **Phase 8:** NDI input support (add NDI plugin, new pipeline factory method)
- **Phase 9:** SRT input support (add SRT plugin, new pipeline factory method)
- **Phase 10:** Docker containerization
- **Phase 11:** Stream recording/clipping
- **Phase 12:** Transcoding options (resolution, bitrate)

---

## Environment Variables

```env
API_PORT=3500
ANNOUNCED_IP=127.0.0.1
RTP_PORT_RANGE_START=5004
RTP_PORT_RANGE_END=5100
LOG_LEVEL=info
```

---

## Success Criteria

- [ ] Gateway starts and exposes REST API
- [ ] Can create RTP stream via POST /streams
- [ ] FFmpeg test pattern streams to gateway
- [ ] Browser connects via SDK and displays video
- [ ] Multiple browser tabs can view same stream
- [ ] Stream cleanup works when deleted
- [ ] RTSP input works with public test streams

---

## Useful GStreamer Commands for Testing

### Test RTP receive pipeline:
```cmd
gst-launch-1.0 udpsrc port=5004 caps="application/x-rtp,media=video,encoding-name=H264,clock-rate=90000" ! rtph264depay ! h264parse ! avdec_h264 ! autovideosink
```

### Test RTSP receive:
```cmd
gst-launch-1.0 rtspsrc location="rtsp://your-stream-url" ! decodebin ! autovideosink
```

### Test WebRTC output (with built-in signaler):
```cmd
gst-launch-1.0 videotestsrc ! x264enc tune=zerolatency ! webrtcsink
```

### List available elements:
```cmd
gst-inspect-1.0 | findstr webrtc
gst-inspect-1.0 | findstr rtp
```

---

## Deployment Notes

### Local Development
- Everything runs on localhost
- announcedIp in config points to 127.0.0.1
- Start gateway, FFmpeg source, and frontend together

### On-Premises Deployment
- Same Docker image or native install
- Configure firewall to allow UDP port range
- Set ANNOUNCED_IP to machine's LAN/public IP

---

## Cloud Deployment

### Why Standard Serverless Won't Work

The media gateway requires:
- **Long-running processes** - GStreamer pipelines must stay alive
- **UDP traffic** - Both RTP ingress and WebRTC ICE need UDP
- **Persistent WebSocket connections** - For signaling
- **Predictable IP/ports** - For ICE candidate exchange

**Not compatible:** Netlify, Vercel, AWS Lambda, Google Cloud Functions, Cloudflare Workers

### Recommended Cloud Platforms

#### Option 1: Fly.io (Recommended for Starting)

**Pros:** Easy setup, supports UDP, global edge deployment, generous free tier
**Cons:** Less control than raw VM

```toml
# fly.toml
app = "nova-media-gateway"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  API_PORT = "3500"
  LOG_LEVEL = "info"

[http_service]
  internal_port = 3500
  force_https = true

[[services]]
  protocol = "udp"
  internal_port = 5004

  [[services.ports]]
    port = 5004

[[services]]
  protocol = "udp"
  internal_port = 5005

  [[services.ports]]
    port = 5005

# Add more UDP ports as needed for RTP range
```

**Deploy:**
```bash
fly launch
fly deploy
fly ips allocate-v4  # Get dedicated IP for UDP
```

#### Option 2: Railway

**Pros:** Simple Git-based deploys, good DX
**Cons:** UDP support requires some config

```json
// railway.json
{
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

#### Option 3: DigitalOcean Droplet / AWS Lightsail

**Pros:** Full control, predictable pricing, easy firewall config
**Cons:** More manual setup

**DigitalOcean setup:**
```bash
# Create droplet (Ubuntu 22.04, $6/mo minimum)
doctl compute droplet create nova-gateway \
  --image ubuntu-22-04-x64 \
  --size s-1vcpu-1gb \
  --region nyc1

# Configure firewall
doctl compute firewall create nova-gateway-fw \
  --inbound-rules "protocol:tcp,ports:3500,address:0.0.0.0/0" \
  --inbound-rules "protocol:udp,ports:5004-5100,address:0.0.0.0/0" \
  --inbound-rules "protocol:udp,ports:10000-10100,address:0.0.0.0/0"
```

**AWS Lightsail setup:**
```bash
# Create instance
aws lightsail create-instances \
  --instance-names nova-gateway \
  --availability-zone us-east-1a \
  --blueprint-id ubuntu_22_04 \
  --bundle-id nano_2_0

# Open ports in Lightsail console:
# - TCP 3500 (API/WebSocket)
# - UDP 5004-5100 (RTP ingress)
# - UDP 10000-10100 (WebRTC ICE)
```

#### Option 4: AWS EC2 with Elastic IP

**Pros:** Most scalable, can use auto-scaling groups
**Cons:** More complex, higher cost

```yaml
# cloudformation snippet
Resources:
  MediaGatewayInstance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: t3.small
      ImageId: ami-0c55b159cbfafe1f0  # Ubuntu 22.04
      SecurityGroups:
        - !Ref MediaGatewaySecurityGroup

  MediaGatewaySecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Nova Media Gateway
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 3500
          ToPort: 3500
          CidrIp: 0.0.0.0/0
        - IpProtocol: udp
          FromPort: 5004
          ToPort: 5100
          CidrIp: 0.0.0.0/0
        - IpProtocol: udp
          FromPort: 10000
          ToPort: 10100
          CidrIp: 0.0.0.0/0

  MediaGatewayEIP:
    Type: AWS::EC2::EIP
    Properties:
      InstanceId: !Ref MediaGatewayInstance
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM ubuntu:22.04

# Install GStreamer
RUN apt-get update && apt-get install -y \
    gstreamer1.0-tools \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

# Expose ports
EXPOSE 3500/tcp
EXPOSE 5004-5100/udp
EXPOSE 10000-10100/udp

ENV NODE_ENV=production
ENV API_PORT=3500

CMD ["node", "dist/index.js"]
```

### Cloud Environment Variables

```env
# Production environment
NODE_ENV=production
API_PORT=3500

# Set to your cloud instance's public IP
ANNOUNCED_IP=203.0.113.50

# RTP ingress port range
RTP_PORT_RANGE_START=5004
RTP_PORT_RANGE_END=5100

# WebRTC ICE port range
WEBRTC_PORT_RANGE_START=10000
WEBRTC_PORT_RANGE_END=10100

# STUN/TURN for NAT traversal (optional but recommended)
STUN_SERVER=stun:stun.l.google.com:19302
# TURN_SERVER=turn:your-turn-server.com:3478
# TURN_USERNAME=user
# TURN_PASSWORD=pass

LOG_LEVEL=info
```

### Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLOUD DEPLOYMENT                         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Nova Media Gateway                      │   │
│  │                                                      │   │
│  │  ┌──────────────┐    ┌──────────────────────────┐  │   │
│  │  │ REST API     │    │ GStreamer Pipelines      │  │   │
│  │  │ :3500/tcp    │    │                          │  │   │
│  │  └──────────────┘    │  RTP In: 5004-5100/udp   │  │   │
│  │                      │  WebRTC: 10000-10100/udp │  │   │
│  │  ┌──────────────┐    └──────────────────────────┘  │   │
│  │  │ WebSocket    │                                   │   │
│  │  │ Signaling    │                                   │   │
│  │  │ :3500/tcp    │                                   │   │
│  │  └──────────────┘                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
   ┌─────────────────┐            ┌─────────────────┐
   │  RTP Sources    │            │  Browser/Apps   │
   │  (cameras,      │            │  (WebRTC)       │
   │   encoders)     │            │                 │
   └─────────────────┘            └─────────────────┘
```

### TURN Server (For Restrictive NATs)

If viewers are behind strict corporate firewalls, you may need a TURN server. Options:

**Coturn (self-hosted):**
```bash
# Install on same or separate server
apt install coturn

# /etc/turnserver.conf
listening-port=3478
fingerprint
lt-cred-mech
user=nova:secretpassword
realm=nova-gateway
```

**Managed TURN services:**
- Twilio Network Traversal Service
- Xirsys
- Metered TURN servers

### Scaling Considerations

**Single instance handles:**
- ~50-100 concurrent viewers per stream (depending on instance size)
- ~10-20 simultaneous input streams

**For higher scale:**
1. **Horizontal scaling:** Multiple gateway instances behind load balancer (sticky sessions for WebSocket)
2. **CDN integration:** Output to HLS/DASH for massive viewer counts (adds latency)
3. **Regional deployment:** Deploy gateways in multiple regions, route based on viewer location

### Monitoring & Health Checks

Add to your gateway:

```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    uptime: process.uptime(),
    streams: {
      active: pipelineManager.getActiveCount(),
      total: pipelineManager.getTotalCount()
    },
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  };
  res.json(health);
});
```

**Cloud monitoring integration:**
- Fly.io: Built-in metrics
- AWS: CloudWatch
- DigitalOcean: Built-in monitoring
- Add Prometheus metrics endpoint for custom dashboards

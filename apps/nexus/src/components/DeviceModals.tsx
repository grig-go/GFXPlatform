import { useState } from 'react';
import { X, Edit, RotateCw, FileText, Gauge, Wifi, Cpu, HardDrive, CheckCircle, AlertCircle, XCircle, Clock, Server, AlertTriangle, MonitorPlay, Film, Network, Lightbulb, Volume2, Zap, Signal, Thermometer, Video, Camera, Users, Mic } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface Device {
  id: string;
  name: string;
  type: string;
  status: "online" | "warning" | "offline";
  uptime: string;
  location?: string;
  specs?: string;
}

interface DeviceModalsProps {
  device: Device | null;
  systemName: string;
  modalType: 'edit' | 'restart' | 'logs' | 'health' | null;
  onClose: () => void;
}

// Helper to generate realistic system health data
function getSystemHealth(device: Device, systemName: string) {
  const isLighting = systemName === "Lighting";
  const isAudio = systemName === "Audio";
  const isPaging = systemName === "Paging";
  const isCCTV = systemName === "CCTV";
  const isQueueSensor = systemName === "Queue Sensors";
  const isShowPlayback = systemName === "Show Playback";
  const hasGPU = isShowPlayback || systemName === "LED Displays" || systemName === "Digital Menus";
  
  const baseHealth = {
    connectivity: {
      status: device.status === "offline" ? "offline" : device.status === "warning" ? "degraded" : "online",
      latency: device.status === "offline" ? "N/A" : `${Math.floor(Math.random() * 10) + 2}ms`,
      bandwidth: device.status === "offline" ? "N/A" : `${Math.floor(Math.random() * 500) + 500} Mbps`,
      ipAddress: `10.20.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    }
  };

  // CCTV-specific health data
  if (isCCTV) {
    return {
      ...baseHealth,
      cctv: {
        videoSignal: device.status === "offline" ? "no signal" : device.status === "warning" ? "degraded" : "excellent",
        frameRate: device.status === "offline" ? 0 : device.status === "warning" ? Math.floor(Math.random() * 10) + 15 : 30,
        targetFPS: 30,
        resolution: device.specs || "3840×2160",
        bitrate: device.status === "offline" ? 0 : Math.floor(Math.random() * 5000) + 8000, // kbps
        recording: device.status === "offline" ? "stopped" : "active",
        storageUsed: Math.floor(Math.random() * 30) + 60, // %
        storageTotal: 8000, // GB
        ptzStatus: device.type.includes("PTZ") ? (device.status === "offline" ? "unavailable" : "operational") : "N/A",
        nightVision: device.status === "offline" ? "off" : "auto",
        motion: device.status === "warning" ? "detected" : "none",
        temperature: device.status === "offline" ? 0 : Math.floor(Math.random() * 15) + 30,
        lens: "Clear",
      }
    };
  }

  // Queue Sensor-specific health data
  if (isQueueSensor) {
    return {
      ...baseHealth,
      queueSensor: {
        detectionStatus: device.status === "offline" ? "inactive" : device.status === "warning" ? "degraded" : "active",
        accuracy: device.status === "offline" ? 0 : device.status === "warning" ? Math.floor(Math.random() * 15) + 75 : Math.floor(Math.random() * 5) + 95, // %
        sensorRange: device.status === "offline" ? 0 : Math.floor(Math.random() * 5) + 10, // meters
        currentCount: device.status === "offline" ? 0 : Math.floor(Math.random() * 50) + 10,
        avgWaitTime: device.status === "offline" ? "N/A" : `${Math.floor(Math.random() * 10) + 3}m ${Math.floor(Math.random() * 60)}s`,
        calibrationStatus: device.status === "warning" ? "needs calibration" : "calibrated",
        lastCalibration: "2 days ago",
        signalStrength: device.status === "offline" ? 0 : device.status === "warning" ? Math.floor(Math.random() * 30) + 40 : Math.floor(Math.random() * 20) + 80, // %
        batteryLevel: device.status === "offline" ? 0 : Math.floor(Math.random() * 40) + 60, // %
        interference: device.status === "warning" ? "detected" : "none",
        temperature: device.status === "offline" ? 0 : Math.floor(Math.random() * 10) + 25,
      }
    };
  }

  // Paging-specific health data (specialized audio)
  if (isPaging) {
    return {
      ...baseHealth,
      paging: {
        signalLevel: device.status === "offline" ? 0 : device.status === "warning" ? Math.floor(Math.random() * 20) - 30 : Math.floor(Math.random() * 10) - 12, // dBFS
        audioQuality: device.status === "offline" ? "no signal" : device.status === "warning" ? "poor" : "excellent",
        impedance: device.status === "offline" ? 0 : Math.floor(Math.random() * 2) + 8, // Ohms
        powerOutput: device.status === "offline" ? 0 : Math.floor(Math.random() * 30) + 20, // Watts
        maxPower: 100,
        zones: ["A", "B", "C"],
        activeZones: device.status === "offline" ? [] : device.status === "warning" ? ["A"] : ["A", "B", "C"],
        priorityLevel: "High",
        micStatus: device.status === "offline" ? "disconnected" : "connected",
        emergencyOverride: "Ready",
        lastAnnouncement: "12 minutes ago",
        protocol: "IP-Based",
        temperature: device.status === "offline" ? 0 : Math.floor(Math.random() * 15) + 30,
      }
    };
  }

  // Lighting-specific health data
  if (isLighting) {
    return {
      ...baseHealth,
      lighting: {
        powerDraw: device.status === "offline" ? 0 : Math.floor(Math.random() * 50) + 80, // Watts
        maxPower: 150, // Watts
        brightness: device.status === "offline" ? 0 : device.status === "warning" ? Math.floor(Math.random() * 30) + 40 : Math.floor(Math.random() * 30) + 70,
        colorTemp: device.status === "offline" ? 0 : Math.floor(Math.random() * 2000) + 3000, // Kelvin
        lampHours: Math.floor(Math.random() * 5000) + 15000,
        ratedLife: 50000,
        controlSignal: device.status === "offline" ? "none" : device.status === "warning" ? "unstable" : "stable",
        protocol: "DMX512",
        universe: Math.floor(Math.random() * 8) + 1,
        address: Math.floor(Math.random() * 500) + 1,
        temperature: device.status === "offline" ? 0 : Math.floor(Math.random() * 15) + 35, // Celsius
      }
    };
  }

  // Audio-specific health data
  if (isAudio) {
    return {
      ...baseHealth,
      audio: {
        signalLevel: device.status === "offline" ? 0 : device.status === "warning" ? Math.floor(Math.random() * 20) - 30 : Math.floor(Math.random() * 10) - 12, // dBFS
        peakLevel: device.status === "offline" ? 0 : Math.floor(Math.random() * 5) - 3,
        impedance: device.status === "offline" ? 0 : Math.floor(Math.random() * 2) + 8, // Ohms
        powerOutput: device.status === "offline" ? 0 : Math.floor(Math.random() * 50) + 30, // Watts
        maxPower: 150,
        signalToNoise: device.status === "offline" ? 0 : Math.floor(Math.random() * 10) + 90, // dB
        channels: "Stereo",
        frequency: "20Hz - 20kHz",
        protocol: "Dante",
        temperature: device.status === "offline" ? 0 : Math.floor(Math.random() * 15) + 30,
        clip: device.status === "warning" ? "detected" : "none",
      }
    };
  }

  // Computer-based systems
  const computerHealth = {
    ...baseHealth,
    cpu: {
      usage: device.status === "offline" ? 0 : device.status === "warning" ? Math.floor(Math.random() * 30) + 60 : Math.floor(Math.random() * 40) + 10,
      cores: isShowPlayback ? 16 : 8,
      temp: device.status === "offline" ? 0 : Math.floor(Math.random() * 20) + 45
    },
    memory: {
      used: device.status === "offline" ? 0 : Math.floor(Math.random() * 40) + 30,
      total: isShowPlayback ? 64 : 16
    },
    disk: {
      used: Math.floor(Math.random() * 30) + 40,
      total: isShowPlayback ? 2000 : 500,
      readSpeed: device.status === "offline" ? 0 : Math.floor(Math.random() * 200) + 300,
      writeSpeed: device.status === "offline" ? 0 : Math.floor(Math.random() * 150) + 200
    }
  };

  if (hasGPU) {
    return {
      ...computerHealth,
      gpu: {
        usage: device.status === "offline" ? 0 : device.status === "warning" ? Math.floor(Math.random() * 40) + 50 : Math.floor(Math.random() * 30) + 15,
        memory: device.status === "offline" ? 0 : Math.floor(Math.random() * 40) + 30,
        temp: device.status === "offline" ? 0 : Math.floor(Math.random() * 25) + 50,
        model: isShowPlayback ? "NVIDIA RTX A6000" : "NVIDIA RTX 4060"
      }
    };
  }

  return computerHealth;
}

// Helper to generate Show Playback software status
function getShowPlaybackSoftware(device: Device) {
  const softwareStatus = [
    {
      name: "Show Playback Core",
      version: "2.8.1.457",
      status: device.status === "offline" ? "offline" : device.status === "warning" ? "warning" : "running",
      uptime: device.status === "offline" ? "0h" : "127h 43m"
    },
    {
      name: "Unreal Engine",
      version: "5.3.2",
      status: device.status === "offline" ? "offline" : "running",
      uptime: device.status === "offline" ? "0h" : "127h 43m"
    },
    {
      name: "Media Transfer",
      version: "1.2.8",
      status: device.status === "offline" ? "offline" : "running",
      uptime: device.status === "offline" ? "0h" : "127h 43m",
      transferRate: device.status === "offline" ? "0 MB/s" : "0.2 MB/s"
    },
    {
      name: "Timeline Sync",
      version: "3.1.4",
      status: device.status === "offline" ? "offline" : device.status === "warning" ? "warning" : "running",
      uptime: device.status === "offline" ? "0h" : "127h 43m",
      drift: device.status === "warning" ? "+12ms" : "+0.3ms"
    },
    {
      name: "Output Manager",
      version: "2.5.1",
      status: device.status === "offline" ? "offline" : "running",
      uptime: device.status === "offline" ? "0h" : "127h 43m",
      outputs: "4 active"
    }
  ];

  return softwareStatus;
}

// Generate mock logs
function generateLogs(device: Device) {
  const now = Date.now();
  const logs = [];
  
  if (device.status === "offline") {
    logs.push({
      timestamp: new Date(now - 120000).toISOString(),
      level: "error",
      message: "Connection lost to device"
    });
    logs.push({
      timestamp: new Date(now - 125000).toISOString(),
      level: "warning",
      message: "Network timeout after 30s"
    });
  } else if (device.status === "warning") {
    logs.push({
      timestamp: new Date(now - 300000).toISOString(),
      level: "warning",
      message: "Performance degradation detected"
    });
    logs.push({
      timestamp: new Date(now - 600000).toISOString(),
      level: "info",
      message: "System health check completed"
    });
  }
  
  logs.push({
    timestamp: new Date(now - 3600000).toISOString(),
    level: "info",
    message: "Device configuration updated"
  });
  logs.push({
    timestamp: new Date(now - 7200000).toISOString(),
    level: "info",
    message: "Firmware check: up to date"
  });
  logs.push({
    timestamp: new Date(now - 86400000).toISOString(),
    level: "info",
    message: "Device started successfully"
  });

  return logs;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "online":
    case "running":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "warning":
    case "degraded":
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    case "offline":
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <AlertCircle className="w-4 h-4 text-slate-400" />;
  }
}

function getMetricColor(value: number, threshold: { warning: number; critical: number }) {
  if (value >= threshold.critical) return "text-red-600 dark:text-red-400";
  if (value >= threshold.warning) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

export function DeviceModals({ device, systemName, modalType, onClose }: DeviceModalsProps) {
  const [restartConfirm, setRestartConfirm] = useState(false);

  if (!device || !modalType) return null;

  const health = getSystemHealth(device, systemName);
  const isShowPlayback = systemName === "Show Playback";
  const logs = generateLogs(device);

  return (
    <>
      {/* Edit Modal */}
      <Dialog open={modalType === 'edit'} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Device Settings
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-700 dark:text-slate-300 text-sm">Device Name</label>
                <input
                  type="text"
                  defaultValue={device.name}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-700 dark:text-slate-300 text-sm">Device Type</label>
                <input
                  type="text"
                  defaultValue={device.type}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-700 dark:text-slate-300 text-sm">Location</label>
                <input
                  type="text"
                  defaultValue={device.location}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-700 dark:text-slate-300 text-sm">IP Address</label>
                <input
                  type="text"
                  defaultValue={health.connectivity.ipAddress}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {device.specs && (
              <div>
                <label className="text-slate-700 dark:text-slate-300 text-sm">Specifications</label>
                <input
                  type="text"
                  defaultValue={device.specs}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            )}

            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="auto-restart" className="rounded" />
              <label htmlFor="auto-restart" className="text-slate-700 dark:text-slate-300 text-sm">
                Enable auto-restart on failure
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="monitoring" className="rounded" defaultChecked />
              <label htmlFor="monitoring" className="text-slate-700 dark:text-slate-300 text-sm">
                Enable health monitoring
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restart Modal */}
      <Dialog open={modalType === 'restart'} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCw className="w-5 h-5" />
              Restart Device
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-900 dark:text-slate-100">
                    Are you sure you want to restart this device?
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                    This will cause a temporary interruption in service.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Device:</span>
                <span className="text-slate-900 dark:text-slate-100">{device.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Type:</span>
                <span className="text-slate-900 dark:text-slate-100">{device.type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Current Status:</span>
                <span className="text-slate-900 dark:text-slate-100 capitalize">{device.status}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Est. Downtime:</span>
                <span className="text-slate-900 dark:text-slate-100">~30 seconds</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="confirm-restart" 
                className="rounded"
                checked={restartConfirm}
                onChange={(e) => setRestartConfirm(e.target.checked)}
              />
              <label htmlFor="confirm-restart" className="text-slate-700 dark:text-slate-300 text-sm">
                I understand this will interrupt service
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button 
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                disabled={!restartConfirm}
              >
                Restart Device
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logs Modal */}
      <Dialog open={modalType === 'logs'} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Device Logs - {device.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-400 text-sm">
                  Last 24 hours
                </span>
              </div>
              <Button variant="outline" size="sm">
                Export Logs
              </Button>
            </div>

            <div className="bg-slate-900 dark:bg-black rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm">
              {logs.map((log, i) => (
                <div 
                  key={i} 
                  className={`py-1 ${
                    log.level === 'error' ? 'text-red-400' : 
                    log.level === 'warning' ? 'text-yellow-400' : 
                    'text-slate-300'
                  }`}
                >
                  <span className="text-slate-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  {' '}
                  <span className={
                    log.level === 'error' ? 'text-red-400' : 
                    log.level === 'warning' ? 'text-yellow-400' : 
                    'text-blue-400'
                  }>
                    [{log.level.toUpperCase()}]
                  </span>
                  {' '}
                  {log.message}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* System Health Modal */}
      <Dialog open={modalType === 'health'} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5" />
              System Health - {device.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Connectivity */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wifi className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-slate-900 dark:text-slate-100">Connectivity</h3>
                {getStatusIcon(health.connectivity.status)}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-slate-600 dark:text-slate-400 text-sm">Status</div>
                  <div className="text-slate-900 dark:text-slate-100 capitalize">{health.connectivity.status}</div>
                </div>
                <div>
                  <div className="text-slate-600 dark:text-slate-400 text-sm">Latency</div>
                  <div className="text-slate-900 dark:text-slate-100">{health.connectivity.latency}</div>
                </div>
                <div>
                  <div className="text-slate-600 dark:text-slate-400 text-sm">Bandwidth</div>
                  <div className="text-slate-900 dark:text-slate-100">{health.connectivity.bandwidth}</div>
                </div>
                <div className="col-span-3">
                  <div className="text-slate-600 dark:text-slate-400 text-sm">IP Address</div>
                  <div className="text-slate-900 dark:text-slate-100 font-mono text-sm">{health.connectivity.ipAddress}</div>
                </div>
              </div>
            </div>

            {/* CPU */}
            {health.cpu && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Cpu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-slate-900 dark:text-slate-100">CPU</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-slate-400">Usage</span>
                      <span className={getMetricColor(health.cpu.usage, { warning: 70, critical: 90 })}>
                        {health.cpu.usage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          health.cpu.usage >= 90 ? 'bg-red-500' :
                          health.cpu.usage >= 70 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${health.cpu.usage}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Cores</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.cpu.cores}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Temperature</div>
                      <div className={getMetricColor(health.cpu.temp, { warning: 70, critical: 85 })}>
                        {health.cpu.temp}°C
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* GPU (if applicable) */}
            {health.gpu && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MonitorPlay className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-slate-900 dark:text-slate-100">GPU</h3>
                </div>
                <div className="space-y-3">
                  <div className="text-slate-600 dark:text-slate-400 text-sm mb-2">{health.gpu.model}</div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-slate-400">Usage</span>
                      <span className={getMetricColor(health.gpu.usage, { warning: 80, critical: 95 })}>
                        {health.gpu.usage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          health.gpu.usage >= 95 ? 'bg-red-500' :
                          health.gpu.usage >= 80 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${health.gpu.usage}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-slate-400">Memory</span>
                      <span className={getMetricColor(health.gpu.memory, { warning: 80, critical: 95 })}>
                        {health.gpu.memory}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          health.gpu.memory >= 95 ? 'bg-red-500' :
                          health.gpu.memory >= 80 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${health.gpu.memory}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-600 dark:text-slate-400 text-sm">Temperature</div>
                    <div className={getMetricColor(health.gpu.temp, { warning: 75, critical: 85 })}>
                      {health.gpu.temp}°C
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Memory */}
            {health.memory && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Server className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-slate-900 dark:text-slate-100">Memory</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-slate-400">Usage</span>
                      <span className={getMetricColor(health.memory.used, { warning: 80, critical: 95 })}>
                        {health.memory.used}% ({((health.memory.total * health.memory.used) / 100).toFixed(1)} GB / {health.memory.total} GB)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          health.memory.used >= 95 ? 'bg-red-500' :
                          health.memory.used >= 80 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${health.memory.used}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Disk */}
            {health.disk && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <HardDrive className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-slate-900 dark:text-slate-100">Disk</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-slate-400">Usage</span>
                      <span className={getMetricColor(health.disk.used, { warning: 80, critical: 90 })}>
                        {health.disk.used}% ({((health.disk.total * health.disk.used) / 100).toFixed(0)} GB / {health.disk.total} GB)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          health.disk.used >= 90 ? 'bg-red-500' :
                          health.disk.used >= 80 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${health.disk.used}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Read Speed</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.disk.readSpeed} MB/s</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Write Speed</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.disk.writeSpeed} MB/s</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Lighting Health */}
            {health.lighting && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-slate-900 dark:text-slate-100">Lighting</h3>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Power Draw</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.lighting.powerDraw} W</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Max Power</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.lighting.maxPower} W</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Brightness</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.lighting.brightness}%</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Color Temperature</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.lighting.colorTemp} K</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Lamp Hours</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.lighting.lampHours} hours</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Rated Life</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.lighting.ratedLife} hours</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Control Signal</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.lighting.controlSignal}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Protocol</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.lighting.protocol}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Universe</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.lighting.universe}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Address</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.lighting.address}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Temperature</div>
                      <div className={getMetricColor(health.lighting.temperature, { warning: 40, critical: 50 })}>
                        {health.lighting.temperature}°C
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CCTV Health */}
            {health.cctv && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Video className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-slate-900 dark:text-slate-100">CCTV Camera</h3>
                  {getStatusIcon(health.cctv.videoSignal === "excellent" ? "online" : health.cctv.videoSignal === "degraded" ? "warning" : "offline")}
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Video Signal</div>
                      <div className="text-slate-900 dark:text-slate-100 capitalize">{health.cctv.videoSignal}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Recording</div>
                      <div className="text-slate-900 dark:text-slate-100 capitalize">{health.cctv.recording}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Frame Rate</div>
                      <div className={getMetricColor(health.cctv.targetFPS - health.cctv.frameRate, { warning: 5, critical: 10 })}>
                        {health.cctv.frameRate} / {health.cctv.targetFPS} FPS
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Resolution</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.cctv.resolution}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Bitrate</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.cctv.bitrate} kbps</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Storage Used</div>
                      <div className={getMetricColor(health.cctv.storageUsed, { warning: 80, critical: 90 })}>
                        {health.cctv.storageUsed}% ({((health.cctv.storageTotal * health.cctv.storageUsed) / 100).toFixed(0)} GB / {health.cctv.storageTotal} GB)
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">PTZ Status</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.cctv.ptzStatus}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Night Vision</div>
                      <div className="text-slate-900 dark:text-slate-100 capitalize">{health.cctv.nightVision}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Motion Detection</div>
                      <div className="text-slate-900 dark:text-slate-100 capitalize">{health.cctv.motion}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Lens Condition</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.cctv.lens}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Temperature</div>
                      <div className={getMetricColor(health.cctv.temperature, { warning: 40, critical: 50 })}>
                        {health.cctv.temperature}°C
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Queue Sensor Health */}
            {health.queueSensor && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-slate-900 dark:text-slate-100">Queue Sensor</h3>
                  {getStatusIcon(health.queueSensor.detectionStatus)}
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Detection Status</div>
                      <div className="text-slate-900 dark:text-slate-100 capitalize">{health.queueSensor.detectionStatus}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Current Count</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.queueSensor.currentCount} people</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Accuracy</div>
                      <div className={getMetricColor(100 - health.queueSensor.accuracy, { warning: 10, critical: 20 })}>
                        {health.queueSensor.accuracy}%
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Avg Wait Time</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.queueSensor.avgWaitTime}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Sensor Range</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.queueSensor.sensorRange} meters</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Signal Strength</div>
                      <div className={getMetricColor(100 - health.queueSensor.signalStrength, { warning: 30, critical: 50 })}>
                        {health.queueSensor.signalStrength}%
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Calibration Status</div>
                      <div className="text-slate-900 dark:text-slate-100 capitalize">{health.queueSensor.calibrationStatus}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Last Calibration</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.queueSensor.lastCalibration}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Battery Level</div>
                      <div className={getMetricColor(100 - health.queueSensor.batteryLevel, { warning: 30, critical: 50 })}>
                        {health.queueSensor.batteryLevel}%
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Interference</div>
                      <div className="text-slate-900 dark:text-slate-100 capitalize">{health.queueSensor.interference}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Temperature</div>
                      <div className={getMetricColor(health.queueSensor.temperature, { warning: 35, critical: 45 })}>
                        {health.queueSensor.temperature}°C
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Paging Health */}
            {health.paging && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Mic className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-slate-900 dark:text-slate-100">Paging System</h3>
                  {getStatusIcon(health.paging.audioQuality === "excellent" ? "online" : health.paging.audioQuality === "poor" ? "warning" : "offline")}
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Audio Quality</div>
                      <div className="text-slate-900 dark:text-slate-100 capitalize">{health.paging.audioQuality}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Signal Level</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.paging.signalLevel} dBFS</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Power Output</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.paging.powerOutput} W</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Max Power</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.paging.maxPower} W</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Impedance</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.paging.impedance} Ω</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Protocol</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.paging.protocol}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Active Zones</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.paging.activeZones.join(", ") || "None"}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">All Zones</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.paging.zones.join(", ")}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Priority Level</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.paging.priorityLevel}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Microphone Status</div>
                      <div className="text-slate-900 dark:text-slate-100 capitalize">{health.paging.micStatus}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Emergency Override</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.paging.emergencyOverride}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Last Announcement</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.paging.lastAnnouncement}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Temperature</div>
                      <div className={getMetricColor(health.paging.temperature, { warning: 40, critical: 50 })}>
                        {health.paging.temperature}°C
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Audio Health */}
            {health.audio && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Volume2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-slate-900 dark:text-slate-100">Audio</h3>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Signal Level</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.audio.signalLevel} dBFS</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Peak Level</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.audio.peakLevel} dBFS</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Impedance</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.audio.impedance} Ω</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Power Output</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.audio.powerOutput} W</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Max Power</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.audio.maxPower} W</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Signal to Noise</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.audio.signalToNoise} dB</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Channels</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.audio.channels}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Frequency</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.audio.frequency}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Protocol</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.audio.protocol}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Temperature</div>
                      <div className={getMetricColor(health.audio.temperature, { warning: 40, critical: 50 })}>
                        {health.audio.temperature}°C
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm">Clip</div>
                      <div className="text-slate-900 dark:text-slate-100">{health.audio.clip}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Show Playback Software Status */}
            {isShowPlayback && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Film className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-slate-900 dark:text-slate-100">Software Status</h3>
                </div>
                <div className="space-y-3">
                  {getShowPlaybackSoftware(device).map((software, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(software.status)}
                        <div>
                          <div className="text-slate-900 dark:text-slate-100">{software.name}</div>
                          <div className="text-slate-600 dark:text-slate-400 text-xs">
                            v{software.version} • Uptime: {software.uptime}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {software.transferRate && (
                          <div className="text-slate-600 dark:text-slate-400 text-xs">
                            {software.transferRate}
                          </div>
                        )}
                        {software.drift && (
                          <div className={software.drift.includes('+') && parseFloat(software.drift) > 10 ? 'text-yellow-600 dark:text-yellow-400 text-xs' : 'text-slate-600 dark:text-slate-400 text-xs'}>
                            Drift: {software.drift}
                          </div>
                        )}
                        {software.outputs && (
                          <div className="text-slate-600 dark:text-slate-400 text-xs">
                            {software.outputs}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Export Health Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
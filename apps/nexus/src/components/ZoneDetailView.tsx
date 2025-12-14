import { ArrowLeft, Lightbulb, Monitor, Volume2, SignpostBig, Thermometer, Shield, Video, Activity, RotateCw, TestTube, Power, Edit, FileText, Settings, Gauge, Wifi, Cpu, HardDrive, Zap, CheckCircle, AlertCircle, XCircle, Clock, Server } from "lucide-react";
import { TopBar } from "./TopBar";
import { NavigationToolbar } from "./NavigationToolbar";
import { Button } from "./ui/button";
import { zones } from "./ZoneListPanel";
import { ZoneAISummary } from "./ZoneAISummary";
import { DeviceModals } from "./DeviceModals";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ZoneDetailViewProps {
  zoneId: string;
  onBack: () => void;
  onNavigateToMain: () => void;
  onNavigateToDevices: () => void;
  onNavigateToWorkflows?: () => void;
  onNavigateToTimeline?: () => void;
}

interface Device {
  id: string;
  name: string;
  type: string;
  status: "online" | "warning" | "offline";
  uptime: string;
  location?: string;
  specs?: string;
}

// Mock device data for each system
const devicesByZone: Record<string, Record<string, Device[]>> = {
  "gate-a10-a18": {
    "Lighting": Array.from({ length: 48 }, (_, i) => ({
      id: `light-${i + 1}`,
      name: `Light Fixture ${i + 1}`,
      type: "LED Panel",
      status: "online" as const,
      uptime: "99.7%",
      location: `Gate A${10 + Math.floor(i / 5)}`
    })),
    "Audio": Array.from({ length: 18 }, (_, i) => ({
      id: `audio-${i + 1}`,
      name: `Speaker ${i + 1}`,
      type: "PA System",
      status: i === 16 ? "offline" as const : "online" as const,
      uptime: i === 16 ? "0%" : "98.1%",
      location: `Gate A${10 + Math.floor(i / 2)}`
    })),
    "LED Displays": Array.from({ length: 27 }, (_, i) => ({
      id: `led-${i + 1}`,
      name: `LED Display ${i + 1}`,
      type: "4K Display",
      status: i === 13 ? "warning" as const : "online" as const,
      uptime: i === 13 ? "92.3%" : "96.3%",
      location: `Gate A${10 + Math.floor(i / 3)}`,
      specs: "1920×1080"
    })),
    "Signage": Array.from({ length: 34 }, (_, i) => ({
      id: `sign-${i + 1}`,
      name: `Digital Sign ${i + 1}`,
      type: "Info Display",
      status: "online" as const,
      uptime: "100%",
      location: `Gate A${10 + Math.floor(i / 4)}`
    })),
    "Show Playback": Array.from({ length: 9 }, (_, i) => ({
      id: `playback-${i + 1}`,
      name: `Pixera ${i + 1}`,
      type: "Media Server",
      status: "online" as const,
      uptime: "99.9%",
      location: `Gate A${10 + Math.floor(i)}`
    })),
  },
  "security-a": {
    "Lighting": Array.from({ length: 32 }, (_, i) => ({
      id: `sec-light-${i + 1}`,
      name: `Light Fixture ${i + 1}`,
      type: "LED Panel",
      status: "online" as const,
      uptime: "99.8%",
      location: "Security Checkpoint A"
    })),
    "Paging": Array.from({ length: 12 }, (_, i) => ({
      id: `sec-page-${i + 1}`,
      name: `Paging Speaker ${i + 1}`,
      type: "PA System",
      status: "online" as const,
      uptime: "99.5%",
      location: "Security Checkpoint A"
    })),
    "CCTV": Array.from({ length: 24 }, (_, i) => ({
      id: `sec-cctv-${i + 1}`,
      name: `Camera ${i + 1}`,
      type: "4K PTZ",
      status: "online" as const,
      uptime: "99.9%",
      location: "Security Checkpoint A",
      specs: "30fps"
    })),
    "Queue Sensors": Array.from({ length: 8 }, (_, i) => ({
      id: `sec-sensor-${i + 1}`,
      name: `Queue Sensor ${i + 1}`,
      type: "Occupancy Sensor",
      status: "online" as const,
      uptime: "100%",
      location: "Security Checkpoint A"
    })),
  },
  "immigration-a": {
    "Lighting": Array.from({ length: 28 }, (_, i) => ({
      id: `imm-light-${i + 1}`,
      name: `Light Fixture ${i + 1}`,
      type: "LED Panel",
      status: "online" as const,
      uptime: "99.7%",
      location: "Immigration Hall A"
    })),
    "Signage": Array.from({ length: 16 }, (_, i) => ({
      id: `imm-sign-${i + 1}`,
      name: `Digital Sign ${i + 1}`,
      type: "Info Display",
      status: "online" as const,
      uptime: "99.9%",
      location: "Immigration Hall A"
    })),
    "Environmental": Array.from({ length: 12 }, (_, i) => ({
      id: `imm-env-${i + 1}`,
      name: `Sensor ${i + 1}`,
      type: "Temp/Humidity",
      status: "online" as const,
      uptime: "100%",
      location: "Immigration Hall A"
    })),
    "LED Displays": Array.from({ length: 8 }, (_, i) => ({
      id: `imm-led-${i + 1}`,
      name: `LED Display ${i + 1}`,
      type: "4K Display",
      status: "online" as const,
      uptime: "98.7%",
      location: "Immigration Hall A",
      specs: "1920×1080"
    })),
  },
  "baggage-a": {
    "Audio": Array.from({ length: 24 }, (_, i) => ({
      id: `bag-audio-${i + 1}`,
      name: `Speaker ${i + 1}`,
      type: "PA System",
      status: "online" as const,
      uptime: "99.2%",
      location: "Baggage Claim A"
    })),
    "LED Displays": Array.from({ length: 12 }, (_, i) => ({
      id: `bag-led-${i + 1}`,
      name: `LED Display ${i + 1}`,
      type: "4K Display",
      status: "online" as const,
      uptime: "97.8%",
      location: "Baggage Claim A",
      specs: "1920×1080"
    })),
    "Conveyor Status": Array.from({ length: 6 }, (_, i) => ({
      id: `bag-conv-${i + 1}`,
      name: `Conveyor ${i + 1}`,
      type: "Status Monitor",
      status: "online" as const,
      uptime: "98.5%",
      location: `Carousel ${i + 1}`
    })),
    "Show Playback": Array.from({ length: 4 }, (_, i) => ({
      id: `bag-playback-${i + 1}`,
      name: `Pixera ${i + 1}`,
      type: "Media Server",
      status: "online" as const,
      uptime: "99.9%",
      location: "Baggage Claim A"
    })),
  },
  "food-court-a": {
    "Lighting": Array.from({ length: 36 }, (_, i) => ({
      id: `food-light-${i + 1}`,
      name: `Light Fixture ${i + 1}`,
      type: "LED Panel",
      status: "online" as const,
      uptime: "99.6%",
      location: "Food Court A"
    })),
    "HVAC": Array.from({ length: 8 }, (_, i) => ({
      id: `food-hvac-${i + 1}`,
      name: `HVAC Unit ${i + 1}`,
      type: "Climate Control",
      status: "online" as const,
      uptime: "99.1%",
      location: `Zone ${i + 1}`
    })),
    "Digital Menus": Array.from({ length: 18 }, (_, i) => ({
      id: `food-menu-${i + 1}`,
      name: `Menu Display ${i + 1}`,
      type: "Digital Signage",
      status: "online" as const,
      uptime: "98.9%",
      location: `Vendor ${Math.floor(i / 2) + 1}`,
      specs: "1080×1920"
    })),
    "Audio": Array.from({ length: 12 }, (_, i) => ({
      id: `food-audio-${i + 1}`,
      name: `Speaker ${i + 1}`,
      type: "Background Audio",
      status: "online" as const,
      uptime: "99.4%",
      location: "Food Court A"
    })),
  },
  "retail-a": {
    "LED Displays": Array.from({ length: 32 }, (_, i) => ({
      id: `retail-led-${i + 1}`,
      name: `LED Display ${i + 1}`,
      type: "4K Display",
      status: "online" as const,
      uptime: "98.2%",
      location: `Store ${Math.floor(i / 4) + 1}`,
      specs: "1920×1080"
    })),
    "Signage": Array.from({ length: 24 }, (_, i) => ({
      id: `retail-sign-${i + 1}`,
      name: `Digital Sign ${i + 1}`,
      type: "Info Display",
      status: "online" as const,
      uptime: "99.5%",
      location: `Store ${Math.floor(i / 3) + 1}`
    })),
    "Audio": Array.from({ length: 16 }, (_, i) => ({
      id: `retail-audio-${i + 1}`,
      name: `Speaker ${i + 1}`,
      type: "Background Audio",
      status: "online" as const,
      uptime: "99.3%",
      location: `Store ${Math.floor(i / 2) + 1}`
    })),
    "Show Playback": Array.from({ length: 8 }, (_, i) => ({
      id: `retail-playback-${i + 1}`,
      name: `Pixera ${i + 1}`,
      type: "Media Server",
      status: "online" as const,
      uptime: "99.8%",
      location: `Store ${i + 1}`
    })),
  },
  "lounge-a": {
    "Lighting": Array.from({ length: 18 }, (_, i) => ({
      id: `lounge-light-${i + 1}`,
      name: `Light Fixture ${i + 1}`,
      type: "LED Panel",
      status: "online" as const,
      uptime: "99.9%",
      location: "Lounge A"
    })),
    "Audio": Array.from({ length: 8 }, (_, i) => ({
      id: `lounge-audio-${i + 1}`,
      name: `Speaker ${i + 1}`,
      type: "Background Audio",
      status: "online" as const,
      uptime: "99.7%",
      location: "Lounge A"
    })),
    "Environmental": Array.from({ length: 6 }, (_, i) => ({
      id: `lounge-env-${i + 1}`,
      name: `Sensor ${i + 1}`,
      type: "Temp/Humidity",
      status: "online" as const,
      uptime: "100%",
      location: "Lounge A"
    })),
  },
};

function getStatusColor(status: string) {
  switch (status) {
    case "online":
      return "bg-green-500";
    case "warning":
      return "bg-yellow-500";
    case "offline":
      return "bg-red-500";
    default:
      return "bg-slate-400";
  }
}

function getSystemIcon(systemName: string) {
  const iconMap: Record<string, any> = {
    "Lighting": Lightbulb,
    "Audio": Volume2,
    "LED Displays": Monitor,
    "Show Playback": SignpostBig,
    "Paging": Volume2,
    "CCTV": Video,
    "Queue Sensors": Activity,
    "Environmental": Thermometer,
    "HVAC": Thermometer,
    "Digital Menus": Monitor,
    "Conveyor Status": Activity,
  };
  return iconMap[systemName] || Activity;
}

export function ZoneDetailView({ zoneId, onBack, onNavigateToMain, onNavigateToDevices, onNavigateToWorkflows, onNavigateToTimeline }: ZoneDetailViewProps) {
  const { t } = useTranslation(['zones', 'common', 'devices']);
  const zone = zones.find(z => z.id === zoneId);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [currentSystemName, setCurrentSystemName] = useState<string>("");
  const [modalType, setModalType] = useState<'edit' | 'restart' | 'logs' | 'health' | null>(null);

  if (!zone) {
    return <div>{t('common:noData.noResults')}</div>;
  }

  const devices = devicesByZone[zoneId] || {};

  const openModal = (device: Device, systemName: string, type: 'edit' | 'restart' | 'logs' | 'health') => {
    setSelectedDevice(device);
    setCurrentSystemName(systemName);
    setModalType(type);
  };

  const closeModal = () => {
    setSelectedDevice(null);
    setCurrentSystemName("");
    setModalType(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopBar onNavigateToMain={onNavigateToMain} />
      <NavigationToolbar 
        currentView="zone" 
        onNavigate={(view) => {
          if (view === "main") onNavigateToMain();
          if (view === "devices") onNavigateToDevices();
          if (view === "workflows") onNavigateToWorkflows?.();
          if (view === "timeline") onNavigateToTimeline?.();
        }} 
      />
      
      <main className="px-6 py-6 pb-24">
        <div className="max-w-[1400px] mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
            <Button
              variant="ghost"
              onClick={onBack}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 me-2" />
              {t('zones:detail.backToZones')}
            </Button>
            
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-slate-900 dark:text-slate-100">{zone.name}</h1>
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                    {zone.type}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-slate-600 dark:text-slate-400">{t('zones:detail.operational')}</span>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-400">{zone.description}</p>
                <p className="text-slate-500 dark:text-slate-500">{t('zones:location')}: {zone.location}</p>
              </div>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex gap-6">
            <div className="flex-1 space-y-6">
              {/* Systems & Devices */}
              {zone.systems.map((system) => {
                const SystemIcon = getSystemIcon(system.name);
                const systemDevices = devices[system.name] || [];
                
                return (
                  <div
                    key={system.name}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
                  >
                    <div className="border-b border-slate-200 dark:border-slate-800 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <SystemIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                          <h2 className="text-slate-900 dark:text-slate-100">{system.name}</h2>
                          <span className="text-slate-600 dark:text-slate-400">
                            {system.devices} {t('zones:details.devices')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(system.status)}`}></div>
                          <span className="text-slate-600 dark:text-slate-400 capitalize">{t(`common:status.${system.status}`)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                        {systemDevices.map((device) => (
                          <div
                            key={device.id}
                            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(device.status)}`}></div>
                              <div>
                                <div className="text-slate-900 dark:text-slate-100">{device.name}</div>
                                <div className="text-slate-600 dark:text-slate-400 text-xs">
                                  {device.type} • {device.location}
                                  {device.specs && ` • ${device.specs}`}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-slate-600 dark:text-slate-400 text-xs">
                                {t('zones:systemStrip.labels.uptime')}: {device.uptime}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-7 px-2" title={t('devices:actions.edit')} onClick={() => openModal(device, system.name, 'edit')}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2" title={t('devices:actions.restart')} onClick={() => openModal(device, system.name, 'restart')}>
                                  <RotateCw className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2" title={t('devices:actions.logs')} onClick={() => openModal(device, system.name, 'logs')}>
                                  <FileText className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2" title={t('devices:actions.health')} onClick={() => openModal(device, system.name, 'health')}>
                                  <Gauge className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* AI Summary */}
            <div className="w-80">
              <ZoneAISummary />
            </div>
          </div>
        </div>
      </main>

      {modalType && selectedDevice && (
        <DeviceModals 
          device={selectedDevice} 
          systemName={currentSystemName}
          modalType={modalType}
          onClose={closeModal} 
        />
      )}
    </div>
  );
}
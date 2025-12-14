import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, ArrowUpDown, LayoutGrid, Table as TableIcon, Edit, RotateCw, FileText, Gauge, CheckCircle, AlertCircle, XCircle, ChevronDown, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
import { DeviceModals } from './DeviceModals';
import { TopBar } from './TopBar';
import { NavigationToolbar } from './NavigationToolbar';
import { DeviceCard } from './DeviceCard';

interface Device {
  id: string;
  name: string;
  type: string;
  status: "online" | "warning" | "offline";
  uptime: string;
  location: string;
  specs?: string;
  zone: string;
  systemName: string;
  lastSeen?: string;
  ipAddress?: string;
}

interface DevicesPageProps {
  onNavigateToMain?: () => void;
  onNavigateToZone?: () => void;
  onNavigateToWorkflows?: () => void;
  onNavigateToTimeline?: () => void;
  onNavigateToLogsAlerts?: () => void;
  initialSystemFilter?: string;
}

// Generate comprehensive device list from all zones
function generateAllDevices(): Device[] {
  const devices: Device[] = [];

  // Gates A10-A18 Zone
  const gatesZone = "Gate A10 – A18";
  
  // Lighting devices (48 devices)
  Array.from({ length: 48 }, (_, i) => {
    devices.push({
      id: `gates-light-${i + 1}`,
      name: `LED Panel ${i + 1}`,
      type: "LED Panel",
      status: i === 12 ? "warning" : i === 28 ? "offline" : "online",
      uptime: i === 28 ? "0h" : `${Math.floor(Math.random() * 200) + 50}h`,
      location: `Gate A${10 + Math.floor(i / 5)}`,
      zone: gatesZone,
      systemName: "Lighting",
      specs: "3000-6500K",
      lastSeen: i === 28 ? "2h ago" : "now",
      ipAddress: `10.20.1.${i + 10}`
    });
  });

  // Audio devices (18 devices - warning status)
  Array.from({ length: 18 }, (_, i) => {
    devices.push({
      id: `gates-audio-${i + 1}`,
      name: `Speaker ${i + 1}`,
      type: "Ceiling Speaker",
      status: i === 7 ? "warning" : "online",
      uptime: `${Math.floor(Math.random() * 300) + 100}h`,
      location: `Gate A${10 + Math.floor(i / 2)}`,
      zone: gatesZone,
      systemName: "Audio",
      specs: "70V Line",
      lastSeen: "now",
      ipAddress: `10.20.2.${i + 10}`
    });
  });

  // LED Displays (27 devices - warning status)
  Array.from({ length: 27 }, (_, i) => {
    devices.push({
      id: `gates-led-${i + 1}`,
      name: `LED Display ${i + 1}`,
      type: "LED Display",
      status: i % 5 === 0 ? "warning" : "online",
      uptime: `${Math.floor(Math.random() * 250) + 100}h`,
      location: `Gate A${10 + Math.floor(i / 3)}`,
      zone: gatesZone,
      systemName: "LED Displays",
      specs: "55\" 4K",
      lastSeen: "now",
      ipAddress: `10.20.3.${i + 10}`
    });
  });

  // Signage (34 devices)
  Array.from({ length: 34 }, (_, i) => {
    devices.push({
      id: `gates-signage-${i + 1}`,
      name: `Signage ${i + 1}`,
      type: "Digital Signage",
      status: "online",
      uptime: `${Math.floor(Math.random() * 280) + 120}h`,
      location: `Gate A${10 + Math.floor(i / 4)}`,
      zone: gatesZone,
      systemName: "Signage",
      specs: "32\" HD",
      lastSeen: "now",
      ipAddress: `10.20.4.${i + 10}`
    });
  });

  // Show Playback (9 devices)
  Array.from({ length: 9 }, (_, i) => {
    devices.push({
      id: `gates-playback-${i + 1}`,
      name: `Pixera ${i + 1}`,
      type: "Media Server",
      status: "online",
      uptime: `${Math.floor(Math.random() * 400) + 200}h`,
      location: `Gate A${10 + i}`,
      zone: gatesZone,
      systemName: "Show Playback",
      specs: "4K Output",
      lastSeen: "now",
      ipAddress: `10.20.5.${i + 10}`
    });
  });

  // Graphics (8 devices)
  Array.from({ length: 8 }, (_, i) => {
    devices.push({
      id: `gates-graphics-${i + 1}`,
      name: `Pixera Graphics ${i + 1}`,
      type: "Unreal Engine",
      status: "online",
      uptime: `${Math.floor(Math.random() * 350) + 180}h`,
      location: `Gate A${10 + Math.floor(i / 2)}`,
      zone: gatesZone,
      systemName: "Graphics",
      specs: "RTX 4090",
      lastSeen: "now",
      ipAddress: `10.20.6.${i + 10}`
    });
  });

  // Security Checkpoint A Zone
  const securityZone = "Security Checkpoint A";
  
  // Lighting (32 devices)
  Array.from({ length: 32 }, (_, i) => {
    devices.push({
      id: `security-light-${i + 1}`,
      name: `Security Light ${i + 1}`,
      type: "LED Panel",
      status: "online",
      uptime: `${Math.floor(Math.random() * 300) + 150}h`,
      location: "Gate A11 area",
      zone: securityZone,
      systemName: "Lighting",
      specs: "5000K",
      lastSeen: "now",
      ipAddress: `10.21.1.${i + 10}`
    });
  });

  // Paging (12 devices)
  Array.from({ length: 12 }, (_, i) => {
    devices.push({
      id: `security-paging-${i + 1}`,
      name: `Paging Station ${i + 1}`,
      type: "PA System",
      status: "online",
      uptime: `${Math.floor(Math.random() * 450) + 250}h`,
      location: "Gate A11 area",
      zone: securityZone,
      systemName: "Paging",
      specs: "IP-Based",
      lastSeen: "now",
      ipAddress: `10.21.2.${i + 10}`
    });
  });

  // CCTV (24 devices)
  Array.from({ length: 24 }, (_, i) => {
    devices.push({
      id: `security-cctv-${i + 1}`,
      name: `Camera ${i + 1}`,
      type: i % 3 === 0 ? "PTZ Camera" : "Fixed Camera",
      status: "online",
      uptime: `${Math.floor(Math.random() * 500) + 300}h`,
      location: "Gate A11 area",
      zone: securityZone,
      systemName: "CCTV",
      specs: "4K UHD",
      lastSeen: "now",
      ipAddress: `10.21.3.${i + 10}`
    });
  });

  // Queue Sensors (8 devices)
  Array.from({ length: 8 }, (_, i) => {
    devices.push({
      id: `security-queue-${i + 1}`,
      name: `Queue Sensor ${i + 1}`,
      type: "People Counter",
      status: "online",
      uptime: `${Math.floor(Math.random() * 600) + 400}h`,
      location: "Gate A11 area",
      zone: securityZone,
      systemName: "Queue Sensors",
      specs: "Wireless",
      lastSeen: "now",
      ipAddress: `10.21.4.${i + 10}`
    });
  });

  // Immigration Hall A Zone
  const immigrationZone = "Immigration Hall A";
  
  // Lighting (28 devices)
  Array.from({ length: 28 }, (_, i) => {
    devices.push({
      id: `immigration-light-${i + 1}`,
      name: `Immigration Light ${i + 1}`,
      type: "LED Panel",
      status: "online",
      uptime: `${Math.floor(Math.random() * 280) + 140}h`,
      location: "Terminal A Central",
      zone: immigrationZone,
      systemName: "Lighting",
      specs: "4000K",
      lastSeen: "now",
      ipAddress: `10.22.1.${i + 10}`
    });
  });

  // Signage (16 devices)
  Array.from({ length: 16 }, (_, i) => {
    devices.push({
      id: `immigration-signage-${i + 1}`,
      name: `Signage ${i + 1}`,
      type: "Digital Signage",
      status: "online",
      uptime: `${Math.floor(Math.random() * 320) + 160}h`,
      location: "Terminal A Central",
      zone: immigrationZone,
      systemName: "Signage",
      specs: "42\" 4K",
      lastSeen: "now",
      ipAddress: `10.22.2.${i + 10}`
    });
  });

  // Environmental (12 devices)
  Array.from({ length: 12 }, (_, i) => {
    devices.push({
      id: `immigration-env-${i + 1}`,
      name: `Environmental Sensor ${i + 1}`,
      type: "HVAC Sensor",
      status: "online",
      uptime: `${Math.floor(Math.random() * 500) + 300}h`,
      location: "Terminal A Central",
      zone: immigrationZone,
      systemName: "Environmental",
      specs: "Temp/Humidity",
      lastSeen: "now",
      ipAddress: `10.22.3.${i + 10}`
    });
  });

  // LED Displays (8 devices)
  Array.from({ length: 8 }, (_, i) => {
    devices.push({
      id: `immigration-led-${i + 1}`,
      name: `LED Display ${i + 1}`,
      type: "LED Display",
      status: "online",
      uptime: `${Math.floor(Math.random() * 260) + 130}h`,
      location: "Terminal A Central",
      zone: immigrationZone,
      systemName: "LED Displays",
      specs: "65\" 4K",
      lastSeen: "now",
      ipAddress: `10.22.4.${i + 10}`
    });
  });

  // Baggage Claim A Zone
  const baggageZone = "Baggage Claim A";
  
  // Audio (24 devices)
  Array.from({ length: 24 }, (_, i) => {
    devices.push({
      id: `bag-audio-${i + 1}`,
      name: `Zone Speaker ${i + 1}`,
      type: "Zone Speaker",
      status: "online",
      uptime: `${Math.floor(Math.random() * 320) + 120}h`,
      location: "Lower Level A",
      zone: baggageZone,
      systemName: "Audio",
      specs: "100V Line",
      lastSeen: "now",
      ipAddress: `10.23.1.${i + 10}`
    });
  });

  // LED Displays (12 devices)
  Array.from({ length: 12 }, (_, i) => {
    devices.push({
      id: `bag-led-${i + 1}`,
      name: `LED Display ${i + 1}`,
      type: "LED Display",
      status: "online",
      uptime: `${Math.floor(Math.random() * 290) + 140}h`,
      location: "Lower Level A",
      zone: baggageZone,
      systemName: "LED Displays",
      specs: "55\" 4K",
      lastSeen: "now",
      ipAddress: `10.23.2.${i + 10}`
    });
  });

  // Conveyor Status (6 devices)
  Array.from({ length: 6 }, (_, i) => {
    devices.push({
      id: `bag-conveyor-${i + 1}`,
      name: `Conveyor Monitor ${i + 1}`,
      type: "Status Display",
      status: "online",
      uptime: `${Math.floor(Math.random() * 340) + 170}h`,
      location: "Lower Level A",
      zone: baggageZone,
      systemName: "Conveyor Status",
      specs: "32\" HD",
      lastSeen: "now",
      ipAddress: `10.23.3.${i + 10}`
    });
  });

  // Show Playback (4 devices)
  Array.from({ length: 4 }, (_, i) => {
    devices.push({
      id: `bag-playback-${i + 1}`,
      name: `Pixera ${i + 1}`,
      type: "Media Server",
      status: "online",
      uptime: `${Math.floor(Math.random() * 380) + 180}h`,
      location: "Lower Level A",
      zone: baggageZone,
      systemName: "Show Playback",
      specs: "4K Output",
      lastSeen: "now",
      ipAddress: `10.23.4.${i + 10}`
    });
  });

  // Food Court A Zone
  const foodCourtZone = "Food Court A";
  
  // Lighting (36 devices)
  Array.from({ length: 36 }, (_, i) => {
    devices.push({
      id: `food-light-${i + 1}`,
      name: `Food Court Light ${i + 1}`,
      type: "LED Panel",
      status: "online",
      uptime: `${Math.floor(Math.random() * 310) + 150}h`,
      location: "Terminal A Mid",
      zone: foodCourtZone,
      systemName: "Lighting",
      specs: "3500K",
      lastSeen: "now",
      ipAddress: `10.24.1.${i + 10}`
    });
  });

  // HVAC (8 devices)
  Array.from({ length: 8 }, (_, i) => {
    devices.push({
      id: `food-hvac-${i + 1}`,
      name: `HVAC Unit ${i + 1}`,
      type: "Climate Control",
      status: "online",
      uptime: `${Math.floor(Math.random() * 450) + 250}h`,
      location: "Terminal A Mid",
      zone: foodCourtZone,
      systemName: "HVAC",
      specs: "Zone Control",
      lastSeen: "now",
      ipAddress: `10.24.2.${i + 10}`
    });
  });

  // Digital Menus (18 devices)
  Array.from({ length: 18 }, (_, i) => {
    devices.push({
      id: `food-menu-${i + 1}`,
      name: `Digital Menu ${i + 1}`,
      type: "Menu Display",
      status: "online",
      uptime: `${Math.floor(Math.random() * 270) + 130}h`,
      location: "Terminal A Mid",
      zone: foodCourtZone,
      systemName: "Digital Menus",
      specs: "43\" 4K",
      lastSeen: "now",
      ipAddress: `10.24.3.${i + 10}`
    });
  });

  // Audio (12 devices)
  Array.from({ length: 12 }, (_, i) => {
    devices.push({
      id: `food-audio-${i + 1}`,
      name: `Ambient Speaker ${i + 1}`,
      type: "Background Music",
      status: "online",
      uptime: `${Math.floor(Math.random() * 340) + 140}h`,
      location: "Terminal A Mid",
      zone: foodCourtZone,
      systemName: "Audio",
      specs: "Stereo",
      lastSeen: "now",
      ipAddress: `10.24.4.${i + 10}`
    });
  });

  // Retail A Zone
  const retailZone = "Retail A";
  
  // LED Displays (32 devices)
  Array.from({ length: 32 }, (_, i) => {
    devices.push({
      id: `retail-led-${i + 1}`,
      name: `LED Display ${i + 1}`,
      type: "LED Display",
      status: "online",
      uptime: `${Math.floor(Math.random() * 280) + 90}h`,
      location: "Terminal A North",
      zone: retailZone,
      systemName: "LED Displays",
      specs: "55\" 4K",
      lastSeen: "now",
      ipAddress: `10.25.1.${i + 10}`
    });
  });

  // Signage (24 devices)
  Array.from({ length: 24 }, (_, i) => {
    devices.push({
      id: `retail-signage-${i + 1}`,
      name: `Signage ${i + 1}`,
      type: "Digital Signage",
      status: "online",
      uptime: `${Math.floor(Math.random() * 290) + 100}h`,
      location: "Terminal A North",
      zone: retailZone,
      systemName: "Signage",
      specs: "32\" HD",
      lastSeen: "now",
      ipAddress: `10.25.2.${i + 10}`
    });
  });

  // Audio (16 devices)
  Array.from({ length: 16 }, (_, i) => {
    devices.push({
      id: `retail-audio-${i + 1}`,
      name: `Ambient Speaker ${i + 1}`,
      type: "Background Music",
      status: "online",
      uptime: `${Math.floor(Math.random() * 340) + 140}h`,
      location: "Terminal A North",
      zone: retailZone,
      systemName: "Audio",
      specs: "Stereo",
      lastSeen: "now",
      ipAddress: `10.25.3.${i + 10}`
    });
  });

  // Show Playback (8 devices)
  Array.from({ length: 8 }, (_, i) => {
    devices.push({
      id: `retail-playback-${i + 1}`,
      name: `Pixera ${i + 1}`,
      type: "Media Server",
      status: "online",
      uptime: `${Math.floor(Math.random() * 360) + 160}h`,
      location: "Terminal A North",
      zone: retailZone,
      systemName: "Show Playback",
      specs: "4K Output",
      lastSeen: "now",
      ipAddress: `10.25.4.${i + 10}`
    });
  });

  // Lounge A Zone
  const loungeZone = "Lounge A";
  
  // Lighting (18 devices)
  Array.from({ length: 18 }, (_, i) => {
    devices.push({
      id: `lounge-light-${i + 1}`,
      name: `Lounge Light ${i + 1}`,
      type: "LED Panel",
      status: "online",
      uptime: `${Math.floor(Math.random() * 330) + 165}h`,
      location: "Gate A15 area",
      zone: loungeZone,
      systemName: "Lighting",
      specs: "2700K Warm",
      lastSeen: "now",
      ipAddress: `10.26.1.${i + 10}`
    });
  });

  // Audio (8 devices)
  Array.from({ length: 8 }, (_, i) => {
    devices.push({
      id: `lounge-audio-${i + 1}`,
      name: `Lounge Speaker ${i + 1}`,
      type: "Ceiling Speaker",
      status: "online",
      uptime: `${Math.floor(Math.random() * 350) + 175}h`,
      location: "Gate A15 area",
      zone: loungeZone,
      systemName: "Audio",
      specs: "70V Line",
      lastSeen: "now",
      ipAddress: `10.26.2.${i + 10}`
    });
  });

  // Environmental (6 devices)
  Array.from({ length: 6 }, (_, i) => {
    devices.push({
      id: `lounge-env-${i + 1}`,
      name: `Environmental Sensor ${i + 1}`,
      type: "HVAC Sensor",
      status: "online",
      uptime: `${Math.floor(Math.random() * 480) + 240}h`,
      location: "Gate A15 area",
      zone: loungeZone,
      systemName: "Environmental",
      specs: "Temp/Humidity",
      lastSeen: "now",
      ipAddress: `10.26.3.${i + 10}`
    });
  });

  return devices;
}

type ViewType = 'table' | 'cards';
type SortField = 'name' | 'status' | 'zone' | 'type' | 'uptime';
type SortOrder = 'asc' | 'desc';

export function DevicesPage({ onNavigateToMain, onNavigateToZone, onNavigateToWorkflows, onNavigateToTimeline, onNavigateToLogsAlerts, initialSystemFilter }: DevicesPageProps) {
  const { t } = useTranslation(['devices', 'common']);
  const [viewType, setViewType] = useState<ViewType>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedSystems, setSelectedSystems] = useState<string[]>(initialSystemFilter ? [initialSystemFilter] : []);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [modalType, setModalType] = useState<'edit' | 'restart' | 'logs' | 'health' | null>(null);
  
  // Add Device Dialog state
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: '',
    type: '',
    zone: '',
    systemName: '',
    location: '',
    ipAddress: '',
    specs: '',
    status: 'online' as 'online' | 'warning' | 'offline'
  });

  const allDevices = useMemo(() => generateAllDevices(), []);

  // Get unique values for filters
  const uniqueZones = useMemo(() => 
    Array.from(new Set(allDevices.map(d => d.zone))).sort(),
    [allDevices]
  );

  const uniqueTypes = useMemo(() => 
    Array.from(new Set(allDevices.map(d => d.type))).sort(),
    [allDevices]
  );

  const uniqueSystems = useMemo(() => 
    Array.from(new Set(allDevices.map(d => d.systemName))).sort(),
    [allDevices]
  );

  // Filter and sort devices
  const filteredDevices = useMemo(() => {
    let filtered = allDevices;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.name.toLowerCase().includes(query) ||
        d.type.toLowerCase().includes(query) ||
        d.zone.toLowerCase().includes(query) ||
        d.location.toLowerCase().includes(query) ||
        d.ipAddress?.toLowerCase().includes(query)
      );
    }

    // Zone filter
    if (selectedZones.length > 0) {
      filtered = filtered.filter(d => selectedZones.includes(d.zone));
    }

    // Type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(d => selectedTypes.includes(d.type));
    }

    // Status filter
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(d => selectedStatuses.includes(d.status));
    }

    // System filter
    if (selectedSystems.length > 0) {
      filtered = filtered.filter(d => selectedSystems.includes(d.systemName));
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'uptime') {
        // Convert uptime to hours for proper sorting
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allDevices, searchQuery, selectedZones, selectedTypes, selectedStatuses, selectedSystems, sortField, sortOrder]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedZones, selectedTypes, selectedStatuses, selectedSystems]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDevices = filteredDevices.slice(startIndex, endIndex);

  const handleDeviceAction = (device: Device, action: 'edit' | 'restart' | 'logs' | 'health') => {
    setSelectedDevice(device);
    setModalType(action);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "offline":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs";
    switch (status) {
      case "online":
        return <span className={`${baseClasses} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400`}>{t('status.online')}</span>;
      case "warning":
        return <span className={`${baseClasses} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400`}>{t('status.warning')}</span>;
      case "offline":
        return <span className={`${baseClasses} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400`}>{t('status.offline')}</span>;
      default:
        return null;
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const activeFiltersCount = selectedZones.length + selectedTypes.length + selectedStatuses.length + selectedSystems.length;

  // Helper function to generate health score based on device status
  const getHealthScore = (status: string, uptime: string) => {
    const uptimeHours = parseInt(uptime) || 0;
    let baseScore = status === 'online' ? 95 : status === 'warning' ? 65 : 20;
    
    // Add uptime bonus (max 5 points)
    const uptimeBonus = Math.min(5, uptimeHours / 100);
    return Math.min(100, baseScore + uptimeBonus);
  };

  // Generate trend data for sparkline
  const generateTrendData = (deviceId: string) => {
    // Use device ID to seed consistent random data
    const seed = deviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return Array.from({ length: 24 }, (_, i) => {
      const variance = Math.sin(seed + i) * 10;
      return { value: 85 + variance };
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopBar onNavigateToMain={onNavigateToMain} />
      <NavigationToolbar 
        currentView="devices" 
        onNavigate={(view) => {
          if (view === "main") onNavigateToMain?.();
          else if (view === "zone") onNavigateToZone?.();
          else if (view === "workflows") onNavigateToWorkflows?.();
          else if (view === "timeline") onNavigateToTimeline?.();
          else if (view === "logs-alerts") onNavigateToLogsAlerts?.();
        }}
      />
      
      <main className="px-6 py-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-slate-900 dark:text-slate-100 text-2xl">{t('page.title')}</h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                {t('page.deviceCount', { filtered: filteredDevices.length, total: allDevices.length })}
              </p>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <Button
                  variant={viewType === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewType('table')}
                  className={viewType === 'table' 
                    ? "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900" 
                    : "hover:bg-slate-200 dark:hover:bg-slate-700"}
                >
                  <TableIcon className="w-4 h-4 mr-2" />
                  {t('page.viewTable')}
                </Button>
                <Button
                  variant={viewType === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewType('cards')}
                  className={viewType === 'cards'
                    ? "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
                    : "hover:bg-slate-200 dark:hover:bg-slate-700"}
                >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  {t('page.viewCards')}
                </Button>
              </div>
              
              <Button
                onClick={() => setIsAddDeviceOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('page.addDevice')}
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={t('page.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            {/* Zone Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  {t('common:labels.zone')}
                  {selectedZones.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                      {selectedZones.length}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {uniqueZones.map(zone => (
                  <DropdownMenuCheckboxItem
                    key={zone}
                    checked={selectedZones.includes(zone)}
                    onCheckedChange={(checked) => {
                      setSelectedZones(checked 
                        ? [...selectedZones, zone]
                        : selectedZones.filter(z => z !== zone)
                      );
                    }}
                  >
                    {zone}
                  </DropdownMenuCheckboxItem>
                ))}
                {selectedZones.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSelectedZones([])}>
                      {t('page.clearFilters')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* System Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  {t('common:labels.system')}
                  {selectedSystems.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                      {selectedSystems.length}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {uniqueSystems.map(system => (
                  <DropdownMenuCheckboxItem
                    key={system}
                    checked={selectedSystems.includes(system)}
                    onCheckedChange={(checked) => {
                      setSelectedSystems(checked 
                        ? [...selectedSystems, system]
                        : selectedSystems.filter(s => s !== system)
                      );
                    }}
                  >
                    {system}
                  </DropdownMenuCheckboxItem>
                ))}
                {selectedSystems.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSelectedSystems([])}>
                      {t('page.clearFilters')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Type Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  {t('common:labels.type')}
                  {selectedTypes.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                      {selectedTypes.length}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 max-h-96 overflow-y-auto">
                {uniqueTypes.map(type => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={(checked) => {
                      setSelectedTypes(checked 
                        ? [...selectedTypes, type]
                        : selectedTypes.filter(t => t !== type)
                      );
                    }}
                  >
                    {type}
                  </DropdownMenuCheckboxItem>
                ))}
                {selectedTypes.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSelectedTypes([])}>
                      {t('page.clearFilters')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  {t('common:labels.status')}
                  {selectedStatuses.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                      {selectedStatuses.length}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuCheckboxItem
                  checked={selectedStatuses.includes('online')}
                  onCheckedChange={(checked) => {
                    setSelectedStatuses(checked
                      ? [...selectedStatuses, 'online']
                      : selectedStatuses.filter(s => s !== 'online')
                    );
                  }}
                >
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  {t('status.online')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedStatuses.includes('warning')}
                  onCheckedChange={(checked) => {
                    setSelectedStatuses(checked
                      ? [...selectedStatuses, 'warning']
                      : selectedStatuses.filter(s => s !== 'warning')
                    );
                  }}
                >
                  <AlertCircle className="w-4 h-4 text-yellow-500 mr-2" />
                  {t('status.warning')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedStatuses.includes('offline')}
                  onCheckedChange={(checked) => {
                    setSelectedStatuses(checked
                      ? [...selectedStatuses, 'offline']
                      : selectedStatuses.filter(s => s !== 'offline')
                    );
                  }}
                >
                  <XCircle className="w-4 h-4 text-red-500 mr-2" />
                  {t('status.offline')}
                </DropdownMenuCheckboxItem>
                {selectedStatuses.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSelectedStatuses([])}>
                      {t('page.clearFilters')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear All Filters */}
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedZones([]);
                  setSelectedTypes([]);
                  setSelectedStatuses([]);
                  setSelectedSystems([]);
                }}
                className="text-slate-600 dark:text-slate-400"
              >
                {t('page.clearAll', { count: activeFiltersCount })}
              </Button>
            )}
          </div>

          {/* Pagination Controls */}
          {filteredDevices.length > 0 && (
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3">
              <div className="flex items-center gap-4">
                {/* Items per page */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{t('common:pagination.showing')}</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[70px] h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-slate-600 dark:text-slate-400">{t('page.perPage')}</span>
                </div>

                {/* Current range */}
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t('page.showingRange', { start: startIndex + 1, end: Math.min(endIndex, filteredDevices.length), total: filteredDevices.length })}
                </div>
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-9 gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t('common:pagination.previous')}
                </Button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {totalPages > 0 && Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={currentPage === pageNum 
                          ? "h-9 w-9 p-0 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
                          : "h-9 w-9 p-0"
                        }
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-9 gap-1"
                >
                  {t('common:pagination.next')}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Table View */}
          {viewType === 'table' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => toggleSort('name')}
                          className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          {t('common:labels.device')}
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => toggleSort('type')}
                          className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          {t('common:labels.type')}
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => toggleSort('zone')}
                          className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          {t('common:labels.zone')}
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <span className="text-slate-700 dark:text-slate-300">{t('columns.location')}</span>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => toggleSort('status')}
                          className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          {t('common:labels.status')}
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => toggleSort('uptime')}
                          className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          {t('columns.uptime')}
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <span className="text-slate-700 dark:text-slate-300">{t('columns.ipAddress')}</span>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <span className="text-slate-700 dark:text-slate-300">{t('columns.actions')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {paginatedDevices.map((device) => (
                      <tr key={device.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-slate-900 dark:text-slate-100">{device.name}</div>
                            <div className="text-slate-600 dark:text-slate-400 text-xs">{device.systemName}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{device.type}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{device.zone}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{device.location}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(device.status)}
                            {getStatusBadge(device.status)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{device.uptime}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-sm">
                          {device.ipAddress}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeviceAction(device, 'edit')}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeviceAction(device, 'restart')}
                              className="h-8 w-8 p-0"
                            >
                              <RotateCw className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeviceAction(device, 'logs')}
                              className="h-8 w-8 p-0"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeviceAction(device, 'health')}
                              className="h-8 w-8 p-0"
                            >
                              <Gauge className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredDevices.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-600 dark:text-slate-400">{t('page.noDevicesFound')}</p>
                </div>
              )}
            </div>
          )}

          {/* Card View */}
          {viewType === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedDevices.map((device, index) => {
                const healthScore = getHealthScore(device.status, device.uptime);
                const trendData = generateTrendData(device.id);
                
                return (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    healthScore={healthScore}
                    trendData={trendData}
                    onAction={handleDeviceAction}
                  />
                );
              })}
            </div>
          )}

          {viewType === 'cards' && filteredDevices.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
              <p className="text-slate-600 dark:text-slate-400">{t('page.noDevicesFound')}</p>
            </div>
          )}

          {/* Device Modals */}
          {selectedDevice && (
            <DeviceModals
              device={selectedDevice}
              systemName={selectedDevice.systemName}
              modalType={modalType}
              onClose={() => {
                setSelectedDevice(null);
                setModalType(null);
              }}
            />
          )}
          
          {/* Add Device Dialog */}
          <Dialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen}>
            <DialogContent className="max-w-2xl bg-white dark:bg-slate-900">
              <DialogHeader>
                <DialogTitle>{t('addDevice.title')}</DialogTitle>
                <DialogDescription>
                  {t('addDevice.description')}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-4 py-4">
                {/* Device Name */}
                <div className="space-y-2">
                  <Label htmlFor="device-name">{t('addDevice.deviceName')} *</Label>
                  <Input
                    id="device-name"
                    placeholder={t('addDevice.deviceNamePlaceholder')}
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                    className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>

                {/* Device Type */}
                <div className="space-y-2">
                  <Label htmlFor="device-type">{t('addDevice.deviceType')} *</Label>
                  <Select value={newDevice.type} onValueChange={(value) => setNewDevice({ ...newDevice, type: value })}>
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder={t('addDevice.selectType')} />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Zone */}
                <div className="space-y-2">
                  <Label htmlFor="device-zone">{t('common:labels.zone')} *</Label>
                  <Select value={newDevice.zone} onValueChange={(value) => setNewDevice({ ...newDevice, zone: value })}>
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder={t('addDevice.selectZone')} />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueZones.map(zone => (
                        <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* System */}
                <div className="space-y-2">
                  <Label htmlFor="device-system">{t('common:labels.system')} *</Label>
                  <Select value={newDevice.systemName} onValueChange={(value) => setNewDevice({ ...newDevice, systemName: value })}>
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder={t('addDevice.selectSystem')} />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueSystems.map(system => (
                        <SelectItem key={system} value={system}>{system}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="device-location">{t('columns.location')} *</Label>
                  <Input
                    id="device-location"
                    placeholder={t('addDevice.locationPlaceholder')}
                    value={newDevice.location}
                    onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
                    className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>

                {/* IP Address */}
                <div className="space-y-2">
                  <Label htmlFor="device-ip">{t('columns.ipAddress')} *</Label>
                  <Input
                    id="device-ip"
                    placeholder={t('addDevice.ipPlaceholder')}
                    value={newDevice.ipAddress}
                    onChange={(e) => setNewDevice({ ...newDevice, ipAddress: e.target.value })}
                    className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>

                {/* Specs */}
                <div className="space-y-2">
                  <Label htmlFor="device-specs">{t('addDevice.specs')}</Label>
                  <Input
                    id="device-specs"
                    placeholder={t('addDevice.specsPlaceholder')}
                    value={newDevice.specs}
                    onChange={(e) => setNewDevice({ ...newDevice, specs: e.target.value })}
                    className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="device-status">{t('addDevice.initialStatus')} *</Label>
                  <Select value={newDevice.status} onValueChange={(value: 'online' | 'warning' | 'offline') => setNewDevice({ ...newDevice, status: value })}>
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder={t('addDevice.selectStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          {t('status.online')}
                        </div>
                      </SelectItem>
                      <SelectItem value="warning">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          {t('status.warning')}
                        </div>
                      </SelectItem>
                      <SelectItem value="offline">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500" />
                          {t('status.offline')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDeviceOpen(false);
                    setNewDevice({
                      name: '',
                      type: '',
                      zone: '',
                      systemName: '',
                      location: '',
                      ipAddress: '',
                      specs: '',
                      status: 'online'
                    });
                  }}
                >
                  {t('common:buttons.cancel')}
                </Button>
                <Button
                  onClick={() => {
                    // In a real app, this would add the device to the database
                    console.log('Adding device:', newDevice);
                    setIsAddDeviceOpen(false);
                    setNewDevice({
                      name: '',
                      type: '',
                      zone: '',
                      systemName: '',
                      location: '',
                      ipAddress: '',
                      specs: '',
                      status: 'online'
                    });
                  }}
                  disabled={!newDevice.name || !newDevice.type || !newDevice.zone || !newDevice.systemName || !newDevice.location || !newDevice.ipAddress}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {t('page.addDevice')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
import { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  School,
  Search,
  RefreshCw,
  Plus,
  MapPin,
  Clock,
  AlertCircle,
  Grid3x3,
  List,
  Calendar,
  Filter,
  XCircle,
  Database,
  Bot,
  Wind,
  Brain,
  Trash2,
  Edit,
  Image,
  Video,
  Music,
  Loader2,
  ChevronDown,
  Check,
  Rss,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { motion, AnimatePresence } from "framer-motion";
import { getEdgeFunctionUrl, getAccessToken } from "../utils/supabase/config";
import { SchoolClosingsAIInsights } from "./SchoolClosingsAIInsights";
import { useAuth } from "../contexts/AuthContext";

// Backend data structure from school_closings table
interface SchoolClosing {
  id?: number;
  provider_id: string;
  region_id: string;
  zone_id?: string;
  state: string | null;
  city: string | null;
  county_name: string | null;
  organization_name: string | null;
  type: string;
  status_day: string | null;
  status_description: string | null;
  notes: string | null;
  source_format: string;
  fetched_at: string;
  raw_data?: any;
}

interface SchoolClosingsDashboardProps {
  onNavigateToProviders?: () => void;
}

export default function SchoolClosingsDashboard({ onNavigateToProviders }: SchoolClosingsDashboardProps = {}) {
  // Get effective organization for impersonation support
  const { effectiveOrganization } = useAuth();

  const [schools, setSchools] = useState<SchoolClosing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countyFilter, setCountyFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<SchoolClosing | null>(null);
  const [schoolToEdit, setSchoolToEdit] = useState<SchoolClosing | null>(null);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [newSchool, setNewSchool] = useState({
    state: "NJ",
    city: "",
    county_name: "",
    organization_name: "",
    type: "School",
    status_day: "Today",
    status_description: "Closed",
    notes: "",
    delay_minutes: "",
    dismissal_time: "",
    zip: "",
  });

  // Fetch all closings from backend
  const fetchSchoolClosings = async () => {
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };
      // Add effective org header for superuser impersonation support
      if (effectiveOrganization?.id) {
        headers['X-Effective-Org-Id'] = effectiveOrganization.id;
      }
      const response = await fetch(
        getEdgeFunctionUrl('school_closing'),
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data = await response.json();
      console.log("📚 Fetched school closings:", data);
      setSchools(data);
    } catch (error) {
      console.error("❌ Error fetching school closings:", error);
      toast.error("Failed to load school closings");
    } finally {
      setLoading(false);
    }
  };

  // Initial load (refetch when impersonation changes)
  useEffect(() => {
    fetchSchoolClosings();
  }, [effectiveOrganization?.id]);

  // Refresh: fetch from XML source and update database
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };
      // Add effective org header for superuser impersonation support
      if (effectiveOrganization?.id) {
        headers['X-Effective-Org-Id'] = effectiveOrganization.id;
      }
      const response = await fetch(
        getEdgeFunctionUrl('school_closing/fetch'),
        {
          method: "POST",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Refresh result:", result);
      toast.success(result.message || "Data refreshed successfully");
      
      // Reload the data
      await fetchSchoolClosings();
    } catch (error) {
      console.error("❌ Error refreshing:", error);
      toast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  // Add manual entry
  const handleAddSchool = async () => {
    if (!newSchool.organization_name || !newSchool.status_description) {
      toast.error("Please fill in required fields");
      return;
    }

    // Format status_description based on type
    let formattedStatus = newSchool.status_description;
    
    if (newSchool.status_description === "Delayed" && newSchool.delay_minutes) {
      formattedStatus = `Delayed ${newSchool.delay_minutes} Minutes`;
    } else if (newSchool.status_description === "Early Dismissal" && newSchool.dismissal_time) {
      formattedStatus = `Early Dismissal ${newSchool.dismissal_time}`;
    }

    const dataToSend = {
      ...newSchool,
      status_description: formattedStatus,
    };

    console.log("📤 [SchoolClosings] Sending manual entry:", dataToSend);

    try {
      const token = await getAccessToken();
      const url = getEdgeFunctionUrl('school_closing/manual');
      console.log("📡 [SchoolClosings] POST to:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      console.log("📥 [SchoolClosings] Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [SchoolClosings] Error response:", errorText);
        throw new Error(`Failed to add: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ [SchoolClosings] Add result:", result);
      toast.success("School closing added successfully");
      
      // Reload the data
      await fetchSchoolClosings();
      
      // Reset form and close dialog
      setNewSchool({
        state: "NJ",
        city: "",
        county_name: "",
        organization_name: "",
        type: "School",
        status_day: "Today",
        status_description: "Closed",
        notes: "",
        delay_minutes: "",
        dismissal_time: "",
      });
      setAddDialogOpen(false);
    } catch (error) {
      console.error("❌ [SchoolClosings] Error adding school:", error);
      toast.error(`Failed to add school closing: ${error.message}`);
    }
  };

  // Delete manual entry
  const handleDeleteSchool = (school: SchoolClosing) => {
    if (!school.id) {
      toast.error("Cannot delete: No ID found");
      return;
    }

    // Open confirmation dialog
    setSchoolToDelete(school);
    setDeleteDialogOpen(true);
  };

  // Confirm and execute deletion
  const confirmDeleteSchool = async () => {
    if (!schoolToDelete) return;

    console.log("🗑️ [SchoolClosings] Deleting school:", schoolToDelete.id);

    try {
      const token = await getAccessToken();
      const url = getEdgeFunctionUrl(`school_closing/manual/${schoolToDelete.id}`);
      console.log("📡 [SchoolClosings] DELETE to:", url);

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("📥 [SchoolClosings] Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [SchoolClosings] Error response:", errorText);
        throw new Error(`Failed to delete: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ [SchoolClosings] Delete result:", result);
      toast.success("School closing deleted successfully");
      
      // Reload the data
      await fetchSchoolClosings();
      
      // Close dialog and reset
      setDeleteDialogOpen(false);
      setSchoolToDelete(null);
    } catch (error) {
      console.error("❌ [SchoolClosings] Error deleting school:", error);
      toast.error(`Failed to delete school closing: ${error.message}`);
    }
  };

  // Edit manual entry
  const handleEditSchool = (school: SchoolClosing) => {
    if (!school.id) {
      toast.error("Cannot edit: No ID found");
      return;
    }

    console.log("🔍 [SchoolClosings] Editing school:", school);
    console.log("🔍 [SchoolClosings] Raw data:", school.raw_data);
    console.log("🔍 [SchoolClosings] Status description:", school.status_description);

    // Parse status from backend format
    // Backend can have: "Delayed 90 Minutes", "Closed", "Early Dismissal 12:00 PM", etc.
    let baseStatus = "Closed";
    let delayMinutes = "";
    let dismissalTime = "";
    
    const statusDesc = school.status_description || "";
    
    if (statusDesc.includes("Delayed") || statusDesc.toUpperCase().includes("DELAYED")) {
      baseStatus = "Delayed";
      // Extract delay minutes from status like "Delayed 90 Minutes"
      const delayMatch = statusDesc.match(/(\d+)\s*Minutes?/i);
      if (delayMatch) {
        delayMinutes = delayMatch[1];
      }
      // Also check raw_data
      if (!delayMinutes && school.raw_data?.DELAY) {
        delayMinutes = school.raw_data.DELAY.toString();
      }
    } else if (statusDesc.includes("Early Dismissal") || statusDesc.toUpperCase().includes("EARLY DISMISSAL")) {
      baseStatus = "Early Dismissal";
      // Extract dismissal time from status like "Early Dismissal 12:00 PM"
      const timeMatch = statusDesc.match(/Early Dismissal\s+(.+)/i);
      if (timeMatch) {
        dismissalTime = timeMatch[1].trim();
      }
      // Also check raw_data
      if (!dismissalTime && school.raw_data?.DISMISSAL) {
        dismissalTime = school.raw_data.DISMISSAL;
      }
    } else {
      baseStatus = "Closed";
    }

    console.log("📝 [SchoolClosings] Parsed status:", baseStatus);
    console.log("📝 [SchoolClosings] Delay minutes:", delayMinutes);
    console.log("📝 [SchoolClosings] Dismissal time:", dismissalTime);

    // Populate edit form with school data
    setSchoolToEdit(school);
    setNewSchool({
      state: school.state || "NJ",
      city: school.city || "",
      county_name: school.county_name || "",
      organization_name: school.organization_name || "",
      type: school.type || "School",
      status_day: school.status_day || "Today",
      status_description: baseStatus,
      notes: school.raw_data?.NOTES || "",
      delay_minutes: delayMinutes,
      dismissal_time: dismissalTime,
      zip: school.raw_data?.ZIP || school.raw_data?.zip || "",
    });
    setEditDialogOpen(true);
  };

  // Confirm and execute edit
  const confirmEditSchool = async () => {
    if (!schoolToEdit || !schoolToEdit.id) return;

    // Validate required fields
    if (!newSchool.organization_name || !newSchool.status_description) {
      toast.error("Please fill in required fields");
      return;
    }

    // Format status_description based on type (same as Add function)
    let formattedStatus = newSchool.status_description;
    
    if (newSchool.status_description === "Delayed" && newSchool.delay_minutes) {
      formattedStatus = `Delayed ${newSchool.delay_minutes} Minutes`;
    } else if (newSchool.status_description === "Early Dismissal" && newSchool.dismissal_time) {
      formattedStatus = `Early Dismissal ${newSchool.dismissal_time}`;
    }

    const dataToSend = {
      ...newSchool,
      status_description: formattedStatus,
    };

    console.log("📤 [SchoolClosings] Updating manual entry:", dataToSend);

    try {
      const token = await getAccessToken();
      const url = getEdgeFunctionUrl(`school_closing/manual/${schoolToEdit.id}`);
      console.log("📡 [SchoolClosings] PUT to:", url);

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      console.log("📥 [SchoolClosings] Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [SchoolClosings] Error response:", errorText);
        throw new Error(`Failed to update: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ [SchoolClosings] Update result:", result);
      toast.success("School closing updated successfully");
      
      // Reload the data
      await fetchSchoolClosings();
      
      // Reset form and close dialog
      setNewSchool({
        state: "NJ",
        city: "",
        county_name: "",
        organization_name: "",
        type: "School",
        status_day: "Today",
        status_description: "Closed",
        notes: "",
        delay_minutes: "",
        dismissal_time: "",
      });
      setEditDialogOpen(false);
      setSchoolToEdit(null);
    } catch (error) {
      console.error("❌ [SchoolClosings] Error updating school:", error);
      toast.error(`Failed to update school closing: ${error.message}`);
    }
  };

  // Get unique values for filters
  const uniqueCounties = useMemo(
    () => Array.from(new Set(schools.map((s) => s.county_name))).sort(),
    [schools]
  );
  const uniqueStates = useMemo(
    () => Array.from(new Set(schools.map((s) => s.state))).sort(),
    [schools]
  );
  const uniqueDays = useMemo(
    () => Array.from(new Set(schools.map((s) => s.status_day))).sort(),
    [schools]
  );
  const uniqueProviders = useMemo(
    () => Array.from(new Set(schools.map((s) => s.provider_id))).sort(),
    [schools]
  );
  const uniqueRegions = useMemo(
    () => Array.from(new Set(schools.map((s) => s.region_id).filter(Boolean))).sort(),
    [schools]
  );

  // Calculate unique regions count
  const uniqueRegionsCount = useMemo(
    () => new Set(schools.map((s) => s.region_id).filter(Boolean)).size,
    [schools]
  );

  // Filter and search logic
  const filteredSchools = useMemo(() => {
    return schools.filter((school) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        school.organization_name?.toLowerCase().includes(searchLower) ||
        school.city?.toLowerCase().includes(searchLower) ||
        school.county_name?.toLowerCase().includes(searchLower) ||
        school.state?.toLowerCase().includes(searchLower) ||
        (school.raw_data?.zip && String(school.raw_data.zip).includes(searchQuery)) ||
        (school.raw_data?.ZIP && String(school.raw_data.ZIP).includes(searchQuery));

      // Status filter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "closed" && school.status_description === "Closed") ||
        (statusFilter === "delayed" && school.status_description?.includes("Delayed")) ||
        (statusFilter === "early_dismissal" && school.status_description?.includes("Early Dismissal"));

      // County filter
      const matchesCounty =
        countyFilter === "all" || school.county_name === countyFilter;

      // State filter
      const matchesState =
        stateFilter === "all" || school.state === stateFilter;

      // Day filter
      const matchesDay =
        dayFilter === "all" || school.status_day === dayFilter;

      // Provider filter
      const matchesProvider =
        providerFilter === "all" || school.provider_id === providerFilter;

      // Region filter (multi-select)
      const matchesRegion =
        regionFilter.length === 0 || 
        regionFilter.includes(school.region_id) ||
        school.region_id === "manual"; // Always show manual entries

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCounty &&
        matchesState &&
        matchesDay &&
        matchesProvider &&
        matchesRegion
      );
    });
  }, [schools, statusFilter, countyFilter, stateFilter, dayFilter, providerFilter, regionFilter, searchQuery]);

  // Get status badge styling
  const getStatusBadge = (statusDescription: string) => {
    if (statusDescription === "Closed") {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="w-3 h-3" />
          {statusDescription}
        </Badge>
      );
    } else if (statusDescription?.includes("Delayed")) {
      return (
        <Badge variant="default" className="gap-1 bg-amber-500 hover:bg-amber-600">
          <Clock className="w-3 h-3" />
          {statusDescription}
        </Badge>
      );
    } else if (statusDescription?.includes("Early Dismissal")) {
      return (
        <Badge variant="default" className="gap-1 bg-blue-500 hover:bg-blue-600">
          <AlertCircle className="w-3 h-3" />
          {statusDescription}
        </Badge>
      );
    }
    return <Badge variant="outline">{statusDescription}</Badge>;
  };

  // Get day badge styling
  const getDayBadge = (day: string) => {
    if (day === "Today") {
      return <Badge variant="default">{day}</Badge>;
    }
    return <Badge variant="outline">{day}</Badge>;
  };

  // Format delay in minutes to readable string
  const formatDelay = (minutes: number) => {
    if (minutes === 0) return "N/A";
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  // Format ZIP code to ensure 5 digits with leading zeros
  const formatZipCode = (zip: string | number | undefined | null): string => {
    if (!zip) return "";
    const zipStr = String(zip);
    // Pad with leading zeros if less than 5 digits
    return zipStr.padStart(5, '0');
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
    setCountyFilter("all");
    setStateFilter("all");
    setDayFilter("all");
    setProviderFilter("all");
    setRegionFilter([]);
    setSearchQuery("");
    toast.success("Filters cleared");
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "all") count++;
    if (countyFilter !== "all") count++;
    if (stateFilter !== "all") count++;
    if (dayFilter !== "all") count++;
    if (regionFilter.length > 0) count++;
    if (providerFilter !== "all") count++;
    if (searchQuery) count++;
    return count;
  }, [statusFilter, countyFilter, stateFilter, dayFilter, providerFilter, regionFilter, searchQuery]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading school closings...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Matching Weather Dashboard */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 mb-1 text-[24px]">
            <School className="w-6 h-6 text-red-600" />
            School Closings
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor school closings, delays, and early dismissals across {schools.length} schools with real-time status updates
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <motion.p 
            className="text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Last updated {new Date().toLocaleTimeString()}
          </motion.p>
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-2"
              >
                <motion.div
                  animate={{ rotate: refreshing ? 360 : 0 }}
                  transition={{ 
                    duration: refreshing ? 1 : 0,
                    repeat: refreshing ? Infinity : 0,
                    ease: "linear"
                  }}
                >
                  <RefreshCw className="w-4 h-4" />
                </motion.div>
                {refreshing ? "Loading..." : "Refresh"}
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Button onClick={() => setAddDialogOpen(true)} size="sm">
                <motion.div
                  whileHover={{ rotate: 90 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                </motion.div>
                Add Location
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Matching Weather Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0, type: "spring", stiffness: 100 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/10 group">
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              initial={false}
            />
            <CardContent className="p-6 relative">
              <div className="flex items-center gap-4">
                <motion.div
                  className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <School className="w-6 h-6 text-red-600 dark:text-red-400" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Locations</p>
                  <motion.p
                    className="text-2xl font-semibold"
                    key={schools.length}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.3 }}
                  >
                    {schools.length}
                  </motion.p>
                  <p className="text-xs text-muted-foreground">Monitoring sites</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1, type: "spring", stiffness: 100 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-gray-500/10 group">
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-gray-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              initial={false}
            />
            <CardContent className="p-6 relative">
              <div className="flex items-center gap-4">
                <motion.div
                  className="p-3 bg-gray-100 dark:bg-gray-900/20 rounded-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <MapPin className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground">Regions</p>
                  <motion.p
                    className="text-2xl font-semibold"
                    key={uniqueRegionsCount}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.3 }}
                  >
                    {uniqueRegionsCount}
                  </motion.p>
                  <p className="text-xs text-muted-foreground">Coverage areas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2, type: "spring", stiffness: 100 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.98 }}
        >
          <SchoolClosingsAIInsights
            closings={filteredSchools}
            compact={true}
            onClick={() => setShowAIInsights(!showAIInsights)}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3, type: "spring", stiffness: 100 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.98 }}
        >
          <Card 
            className="h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 group cursor-pointer"
            onClick={() => onNavigateToProviders?.()}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              initial={false}
            />
            <CardContent className="p-6 relative">
              <div className="flex items-center gap-4">
                <motion.div
                  className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Rss className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Providers</p>
                  <motion.p
                    className="text-2xl font-semibold"
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.3 }}
                  >
                    1
                  </motion.p>
                  <p className="text-xs text-muted-foreground">News12 Local</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* AI Insights Section - Expanded View */}
      {showAIInsights && (
        <SchoolClosingsAIInsights 
          closings={filteredSchools}
          listView={true}
        />
      )}

      {/* Search and Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search and View Toggle Row */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by school name, city, county, state, or zip..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-2 px-1.5 py-0 min-w-[20px] h-5"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === "card" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("card")}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Filters Section */}
            {showFilters && (
              <div className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                          <SelectItem value="delayed">Delayed</SelectItem>
                          <SelectItem value="early_dismissal">
                            Early Dismissal
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>County</Label>
                      <Select value={countyFilter} onValueChange={setCountyFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Counties</SelectItem>
                          {uniqueCounties.map((county) => (
                            <SelectItem key={county} value={county}>
                              {county}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>State</Label>
                      <Select value={stateFilter} onValueChange={setStateFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All States</SelectItem>
                          {uniqueStates.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Day</Label>
                      <Select value={dayFilter} onValueChange={setDayFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Days</SelectItem>
                          {uniqueDays.map((day) => (
                            <SelectItem key={day} value={day}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Region ID</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between"
                          >
                            <span className="truncate">
                              {regionFilter.length === 0
                                ? "Select region identifiers for school closings data"
                                : `${regionFilter.length} region${regionFilter.length !== 1 ? 's' : ''} selected`}
                            </span>
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="start">
                          <ScrollArea className="h-[200px]">
                            <div className="p-2 space-y-1">
                              {uniqueRegions.map((region) => (
                                <div
                                  key={region}
                                  className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                                  onClick={() => {
                                    if (regionFilter.includes(region)) {
                                      setRegionFilter(regionFilter.filter((r) => r !== region));
                                    } else {
                                      setRegionFilter([...regionFilter, region]);
                                    }
                                  }}
                                >
                                  <Checkbox
                                    id={`region-${region}`}
                                    checked={regionFilter.includes(region)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setRegionFilter([...regionFilter, region]);
                                      } else {
                                        setRegionFilter(regionFilter.filter((r) => r !== region));
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={`region-${region}`}
                                    className="text-sm cursor-pointer flex-1"
                                  >
                                    {region}
                                  </label>
                                </div>
                              ))}
                              {uniqueRegions.length === 0 && (
                                <p className="text-sm text-muted-foreground p-2">No regions available</p>
                              )}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <Select value={providerFilter} onValueChange={setProviderFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Providers</SelectItem>
                          {uniqueProviders.map((provider) => (
                            <SelectItem key={provider} value={provider}>
                              {provider}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                </div>

                {activeFilterCount > 0 && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearFilters}
                    >
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <motion.div 
        className="flex items-center justify-between px-1"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <motion.span
            key={filteredSchools.length}
            initial={{ scale: 1.3, color: "#3b82f6" }}
            animate={{ scale: 1, color: "inherit" }}
            transition={{ type: "spring", stiffness: 300 }}
            className="font-semibold"
          >
            {filteredSchools.length}
          </motion.span>
          {" "}of{" "}
          <span className="font-semibold">{schools.length}</span>
          {" "}school closings
        </p>
      </motion.div>

      {/* Card View */}
      {viewMode === "card" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredSchools.map((school, index) => (
              <motion.div
                key={school.id || index}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 200,
                }}
                whileHover={{ 
                  y: -8,
                  transition: { type: "spring", stiffness: 400, damping: 15 }
                }}
                layout
              >
                <Card className="group relative overflow-hidden cursor-pointer border transition-all duration-300 hover:shadow-xl hover:border-primary/20">
                  {/* Gradient overlay on hover */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 pointer-events-none"
                    initial={false}
                    transition={{ duration: 0.3 }}
                  />
                  
                  <CardHeader className="relative">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <motion.div
                          whileHover={{ x: 4 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <CardTitle className="text-base truncate">
                            {school.organization_name}
                          </CardTitle>
                        </motion.div>
                        <motion.div
                          className="flex items-center gap-2 mt-2 flex-wrap"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 + 0.2 }}
                        >
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          >
                            <Badge variant="outline" className="text-xs">
                              {school.type}
                            </Badge>
                          </motion.div>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          >
                            {getStatusBadge(school.status_description)}
                          </motion.div>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          >
                            {getDayBadge(school.status_day)}
                          </motion.div>
                          {school.provider_id === "manual_entry" && (
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 400 }}
                            >
                              <Badge variant="secondary" className="text-xs">
                                Manual
                              </Badge>
                            </motion.div>
                          )}
                        </motion.div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {school.provider_id === "manual_entry" && (
                          <>
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ type: "spring", stiffness: 300, delay: 0.15 }}
                              whileHover={{ 
                                scale: 1.15,
                                transition: { duration: 0.3 }
                              }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditSchool(school);
                                }}
                                className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </motion.div>
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
                              whileHover={{ 
                                scale: 1.15,
                                rotate: [0, -10, 10, -10, 0],
                                transition: { duration: 0.5 }
                              }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSchool(school);
                                }}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </motion.div>
                          </>
                        )}
                        <motion.div
                          animate={{ 
                            rotate: [0, -5, 5, -5, 0],
                            transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                          }}
                          whileHover={{ 
                            scale: 1.2, 
                            rotate: 360,
                            transition: { duration: 0.6 }
                          }}
                        >
                          <School className="w-5 h-5 text-muted-foreground" />
                        </motion.div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 relative">
                    <motion.div 
                      className="flex items-center gap-2 text-sm"
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <motion.div
                        animate={{ y: [0, -2, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      </motion.div>
                      <span className="text-muted-foreground truncate">
                        {school.city}, {school.state} {formatZipCode(school.raw_data?.ZIP || school.raw_data?.zip)}
                      </span>
                    </motion.div>
                    <motion.div 
                      className="flex items-center gap-2 text-sm"
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">
                        {school.county_name} County
                      </span>
                    </motion.div>
                    {Number(school.raw_data?.DELAY) > 0 && (
                      <motion.div
                        className="flex items-center gap-2 text-sm"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ x: 4 }}
                      >
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        >
                          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                        </motion.div>
                        <span className="text-muted-foreground">
                          Delay: {formatDelay(Number(school.raw_data?.DELAY))}
                        </span>
                      </motion.div>
                    )}
                    <div className="text-xs text-muted-foreground mt-4 pt-2 border-t space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Last updated: {new Date(school.fetched_at).toLocaleString()}</span>
                        <span className="text-muted-foreground/70">
                          Provider: {school.provider_id.replace('school_provider:', '')}
                        </span>
                      </div>
                      {school.region_id && school.region_id !== "manual" && (
                        <div className="flex items-center justify-end gap-2 text-muted-foreground/70">
                          <span>Region: {school.region_id}</span>
                          {school.zone_id && <span>| Zone: {school.zone_id}</span>}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardContent className="p-0">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>County</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Delay</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {filteredSchools.map((school, index) => (
                        <motion.tr
                          key={school.id || index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{
                            duration: 0.2,
                            delay: index * 0.03,
                            layout: { duration: 0.2 },
                          }}
                          layout
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <School className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="max-w-[300px] truncate">
                                {school.organization_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span>
                                {school.city}, {school.state}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{school.county_name}</TableCell>
                          <TableCell>
                            {getStatusBadge(school.status_description)}
                          </TableCell>
                          <TableCell>{getDayBadge(school.status_day)}</TableCell>
                          <TableCell>
                            {Number(school.raw_data?.DELAY) > 0 ? (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                {formatDelay(Number(school.raw_data?.DELAY))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {school.type}
                              </Badge>
                              {school.provider_id === "manual_entry" && (
                                <Badge variant="secondary" className="text-xs">
                                  Manual
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground text-xs">
                              {new Date(school.fetched_at).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground text-xs">
                              {school.provider_id.replace('school_provider:', '')}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground text-xs">
                              {school.region_id !== "manual" ? school.region_id : "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground text-xs">
                              {school.zone_id || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {school.provider_id === "manual_entry" && (
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSchool(school)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </motion.div>
                            )}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty State */}
      {filteredSchools.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <Card>
            <CardContent className="py-16 text-center">
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3
                }}
              >
                <School className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              </motion.div>
              <motion.h3 
                className="mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                No school closings found
              </motion.h3>
              <motion.p 
                className="text-sm text-muted-foreground mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Try adjusting your search or filters
              </motion.p>
              {activeFilterCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button variant="outline" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Add School Closing Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add School Closing
            </DialogTitle>
            <DialogDescription>
              Add a new school closing or delay announcement
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>School Name *</Label>
              <Input
                placeholder="Enter school or district name"
                value={newSchool.organization_name}
                onChange={(e) =>
                  setNewSchool({ ...newSchool, organization_name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  placeholder="City"
                  value={newSchool.city}
                  onChange={(e) => setNewSchool({ ...newSchool, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>State *</Label>
                <Input
                  placeholder="State"
                  value={newSchool.state}
                  onChange={(e) => setNewSchool({ ...newSchool, state: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>County *</Label>
                <Input
                  placeholder="County name"
                  value={newSchool.county_name}
                  onChange={(e) =>
                    setNewSchool({ ...newSchool, county_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>ZIP Code</Label>
                <Input
                  placeholder="ZIP"
                  value={newSchool.zip}
                  onChange={(e) =>
                    setNewSchool({ ...newSchool, zip: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select
                  value={newSchool.status_description}
                  onValueChange={(value) =>
                    setNewSchool({ ...newSchool, status_description: value, delay_minutes: "", dismissal_time: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Closed">Closed</SelectItem>
                    <SelectItem value="Delayed">Delayed</SelectItem>
                    <SelectItem value="Early Dismissal">Early Dismissal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {newSchool.status_description === "Delayed" && (
                <div className="space-y-2">
                  <Label>Delay Minutes *</Label>
                  <Input
                    type="number"
                    placeholder="90"
                    value={newSchool.delay_minutes}
                    onChange={(e) =>
                      setNewSchool({
                        ...newSchool,
                        delay_minutes: e.target.value,
                      })
                    }
                  />
                </div>
              )}
              
              {newSchool.status_description === "Early Dismissal" && (
                <div className="space-y-2">
                  <Label>Dismissal Time *</Label>
                  <Input
                    type="text"
                    placeholder="12:00 PM"
                    value={newSchool.dismissal_time}
                    onChange={(e) =>
                      setNewSchool({
                        ...newSchool,
                        dismissal_time: e.target.value,
                      })
                    }
                  />
                </div>
              )}
              
              {newSchool.status_description === "Closed" && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">No additional info needed</Label>
                  <div className="h-10 flex items-center text-sm text-muted-foreground">
                    School is fully closed
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Day *</Label>
              <Select
                value={newSchool.status_day}
                onValueChange={(value) => setNewSchool({ ...newSchool, status_day: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Today">Today</SelectItem>
                  <SelectItem value="Tomorrow">Tomorrow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSchool}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Closing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit School Closing Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit School Closing
            </DialogTitle>
            <DialogDescription>
              Update the school closing or delay announcement
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>School Name *</Label>
              <Input
                placeholder="Enter school or district name"
                value={newSchool.organization_name}
                onChange={(e) =>
                  setNewSchool({ ...newSchool, organization_name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  placeholder="City"
                  value={newSchool.city}
                  onChange={(e) => setNewSchool({ ...newSchool, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>State *</Label>
                <Input
                  placeholder="State"
                  value={newSchool.state}
                  onChange={(e) => setNewSchool({ ...newSchool, state: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>County *</Label>
                <Input
                  placeholder="County name"
                  value={newSchool.county_name}
                  onChange={(e) =>
                    setNewSchool({ ...newSchool, county_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>ZIP Code</Label>
                <Input
                  placeholder="ZIP"
                  value={newSchool.zip}
                  onChange={(e) =>
                    setNewSchool({ ...newSchool, zip: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select
                  value={newSchool.status_description}
                  onValueChange={(value) =>
                    setNewSchool({ ...newSchool, status_description: value, delay_minutes: "", dismissal_time: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Closed">Closed</SelectItem>
                    <SelectItem value="Delayed">Delayed</SelectItem>
                    <SelectItem value="Early Dismissal">Early Dismissal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {newSchool.status_description === "Delayed" && (
                <div className="space-y-2">
                  <Label>Delay Minutes *</Label>
                  <Input
                    type="number"
                    placeholder="90"
                    value={newSchool.delay_minutes}
                    onChange={(e) =>
                      setNewSchool({
                        ...newSchool,
                        delay_minutes: e.target.value,
                      })
                    }
                  />
                </div>
              )}
              
              {newSchool.status_description === "Early Dismissal" && (
                <div className="space-y-2">
                  <Label>Dismissal Time *</Label>
                  <Input
                    type="text"
                    placeholder="12:00 PM"
                    value={newSchool.dismissal_time}
                    onChange={(e) =>
                      setNewSchool({
                        ...newSchool,
                        dismissal_time: e.target.value,
                      })
                    }
                  />
                </div>
              )}
              
              {newSchool.status_description === "Closed" && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">No additional info needed</Label>
                  <div className="h-10 flex items-center text-sm text-muted-foreground">
                    School is fully closed
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Day *</Label>
              <Select
                value={newSchool.status_day}
                onValueChange={(value) => setNewSchool({ ...newSchool, status_day: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Today">Today</SelectItem>
                  <SelectItem value="Tomorrow">Tomorrow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditDialogOpen(false);
              setSchoolToEdit(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={confirmEditSchool}
            >
              <Edit className="w-4 h-4 mr-2" />
              Update Closing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete School Closing Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the school closing entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSchool}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
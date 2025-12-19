import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
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
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import {
  Brain,
  Image as ImageIcon,
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Loader2,
  RefreshCw,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Zap,
  Video,
  LayoutDashboard,
  Globe,
  Sparkles,
  Cpu,
  Gem,
  Wind,
  Wand2,
  Palette,
  Settings,
  Box,
  Clapperboard,
  Film,
} from "lucide-react";
import { toast } from "sonner";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { copyToClipboard } from "../utils/clipboard";
import {
  AIProvider,
  AIProviderWithMaskedKey,
  AIProviderType,
  AIProviderName,
  AI_PROVIDER_METADATA,
  DashboardAssignment,
  DashboardType,
  AssignableDashboardType,
  DASHBOARD_LABELS,
  ASSIGNABLE_DASHBOARD_LABELS,
  AIModel,
  DALLE_MODELS,
  STABILITY_MODELS,
  getProvidersWithDynamicModels,
} from "../types/ai";
import { motion } from "framer-motion";
import { DashboardNavigation, type DashboardView } from "./DashboardNavigation";

interface AIConnectionsDashboardProps {
  onNavigate?: (view: DashboardView) => void;
  dashboardConfig?: Array<{
    dashboard_id: string;
    visible: boolean;
    order_index: number;
  }>;
}

export function AIConnectionsDashboard({ onNavigate, dashboardConfig }: AIConnectionsDashboardProps = {}) {
  const [providers, setProviders] = useState<AIProviderWithMaskedKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProviderWithMaskedKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [revealedApiKey, setRevealedApiKey] = useState("");
  const [revealedApiSecret, setRevealedApiSecret] = useState("");
  const [loadingReveal, setLoadingReveal] = useState(false);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  
  // Test results dialog state
  const [testResultsDialogOpen, setTestResultsDialogOpen] = useState(false);
  const [testResults, setTestResults] = useState<{
    success: boolean;
    provider: AIProviderWithMaskedKey;
    modelCount?: number;
    models?: AIModel[];
    error?: string;
    errorDetails?: string;
    responseTime?: number;
    timestamp: string;
    endpoint?: string;
  } | null>(null);
  
  // Debug dialog state
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [loadingDebug, setLoadingDebug] = useState(false);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<AIProviderWithMaskedKey | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    providerName: "claude" as AIProviderName,
    type: "text" as AIProviderType,
    description: "",
    apiKey: "",
    apiSecret: "",
    endpoint: "",
    model: "",
    enabled: true,
    rateLimitPerMinute: 60,
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1,
    dashboardAssignments: [] as DashboardAssignment[],
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  // Auto-fetch models when API key is revealed in edit dialog
  useEffect(() => {
    if (editDialogOpen && revealedApiKey && selectedProvider && 
        ['openai', 'claude', 'gemini', 'mistral'].includes(formData.providerName) &&
        availableModels.length === 0) {
      console.log('🔄 Auto-fetching models after API key reveal');
      fetchAvailableModels(formData.providerName, revealedApiKey);
    }
  }, [revealedApiKey, editDialogOpen]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        getEdgeFunctionUrl('ai_provider/providers'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Fetched AI providers:", data.providers?.length || 0, "providers");
      
      // If no providers found, initialize Claude
      if (!data.providers || data.providers.length === 0) {
        console.log("No providers found, initializing Claude...");
        await initializeClaude();
        // Re-fetch after initialization
        const retryResponse = await fetch(
          getEdgeFunctionUrl('ai_provider/providers'),
          {
            headers: {
              Authorization: `Bearer ${getSupabaseAnonKey()}`,
            },
          }
        );
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          setProviders(retryData.providers || []);
        }
      } else {
        setProviders(data.providers || []);
      }
    } catch (error) {
      console.error("Error fetching AI providers:", error);
      toast.error("Failed to load AI providers");
    } finally {
      setLoading(false);
    }
  };

  const initializeClaude = async () => {
    try {
      const response = await fetch(
        getEdgeFunctionUrl('ai_provider/initialize'),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log("Claude provider initialized successfully");
    } catch (error) {
      console.error("Error initializing Claude:", error);
    }
  };

  const handleAddProvider = () => {
    setFormData({
      name: "",
      providerName: "claude",
      type: "text",
      description: "",
      apiKey: "",
      apiSecret: "",
      endpoint: "",
      model: "",
      enabled: true,
      rateLimitPerMinute: 60,
      maxTokens: 4096,
      temperature: 0.7,
      topP: 1,
      dashboardAssignments: [],
    });
    
    // Clear available models when opening add dialog
    setAvailableModels([]);
    
    setAddDialogOpen(true);
  };

  const handleEditProvider = async (provider: AIProviderWithMaskedKey) => {
    console.log('Opening edit dialog for provider:', {
      name: provider.name,
      providerName: provider.providerName,
      hasModels: !!provider.availableModels,
      modelCount: provider.availableModels?.length || 0,
      models: provider.availableModels?.map(m => m.id) || []
    });
    
    setSelectedProvider(provider);
    setFormData({
      name: provider.name,
      providerName: provider.providerName,
      type: provider.type,
      description: provider.description,
      apiKey: "",
      apiSecret: "",
      endpoint: provider.endpoint || "",
      model: provider.model || "",
      enabled: provider.enabled,
      rateLimitPerMinute: provider.rateLimitPerMinute || 60,
      maxTokens: provider.maxTokens || 4096,
      temperature: provider.temperature || 0.7,
      topP: provider.topP || 1,
      dashboardAssignments: provider.dashboardAssignments || [],
    });
    setShowApiKey(false);
    setShowApiSecret(false);
    setRevealedApiKey("");
    setRevealedApiSecret("");
    
    // Load available models for this provider from stored data
    if (provider.availableModels && provider.availableModels.length > 0) {
      console.log('Loading stored models:', provider.availableModels.length);
      setAvailableModels(provider.availableModels);
    } else {
      console.log('No stored models found, checking hardcoded...');
      // If no stored models, try to fetch them if it's an API-based provider
      const hardcodedModels = getHardcodedModels(provider.providerName);
      if (hardcodedModels.length > 0) {
        console.log('Using hardcoded models:', hardcodedModels.length);
        setAvailableModels(hardcodedModels);
      } else if (provider.apiKeyConfigured && ['openai', 'claude', 'gemini', 'mistral'].includes(provider.providerName)) {
        console.log('Will fetch models when user clicks Refresh');
        // Will fetch models when user clicks "Refresh" or reveals API key
        setAvailableModels([]);
      } else {
        console.log('No models available');
        setAvailableModels([]);
      }
    }
    
    setEditDialogOpen(true);
  };

  const handleSaveProvider = async () => {
    if (!formData.name || !formData.apiKey) {
      toast.error("Name and API Key are required");
      return;
    }

    if (!formData.model || formData.model.trim() === "") {
      toast.error("Please select or enter a model");
      return;
    }

    console.log('💾 Saving provider with models:', {
      name: formData.name,
      providerName: formData.providerName,
      modelCount: availableModels.length,
      models: availableModels.map(m => m.id),
      selectedModel: formData.model,
      dashboardAssignments: formData.dashboardAssignments
    });

    setSaving(true);
    try {
      const payload = {
        ...formData,
        availableModels,
      };
      
      console.log('📤 Sending POST payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(
        getEdgeFunctionUrl('ai_provider/providers'),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      console.log('📥 POST response status:', response.status);

      const result = await response.json();
      console.log('✅ Full API Response:', result);

      // Check if the backend returned an error
      if (!result.ok) {
        throw new Error(result.detail || result.error || 'Failed to add provider');
      }

      console.log('✅ Provider saved:', result);

      toast.success("AI provider added successfully");
      setAddDialogOpen(false);
      fetchProviders();
    } catch (error) {
      console.error("❌ Error adding AI provider:", error);
      toast.error(`Failed to add AI provider: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProvider = async () => {
    if (!selectedProvider || !formData.name) {
      toast.error("Name is required");
      return;
    }

    if (!formData.model || formData.model.trim() === "") {
      toast.error("Please select or enter a model");
      return;
    }

    console.log('🔄 Updating AI provider:', {
      id: selectedProvider.id,
      name: formData.name,
      providerName: formData.providerName,
      modelCount: availableModels.length,
      models: availableModels.map(m => m.id),
      selectedModel: formData.model,
      dashboardAssignments: formData.dashboardAssignments,
      assignmentCount: formData.dashboardAssignments.length
    });

    setSaving(true);
    try {
      // Build update payload, only including API key/secret if they were changed
      const updatePayload: any = {
        name: formData.name,
        providerName: formData.providerName,
        type: formData.type,
        description: formData.description,
        endpoint: formData.endpoint,
        model: formData.model,
        enabled: formData.enabled,
        rateLimitPerMinute: formData.rateLimitPerMinute,
        maxTokens: formData.maxTokens,
        temperature: formData.temperature,
        topP: formData.topP,
        dashboardAssignments: formData.dashboardAssignments,
        availableModels,
      };
      
      // Only include apiKey if it was changed (not empty)
      if (formData.apiKey && formData.apiKey.trim() !== "") {
        updatePayload.apiKey = formData.apiKey;
      }
      
      // Only include apiSecret if it was changed (not empty)
      if (formData.apiSecret && formData.apiSecret.trim() !== "") {
        updatePayload.apiSecret = formData.apiSecret;
      }
      
      console.log('📤 Sending update payload:', {
        dashboardAssignments: updatePayload.dashboardAssignments,
        hasDashboardAssignments: !!updatePayload.dashboardAssignments,
        assignmentCount: updatePayload.dashboardAssignments?.length || 0,
        hasApiKey: !!updatePayload.apiKey,
        hasApiSecret: !!updatePayload.apiSecret
      });
      
      const response = await fetch(
        getEdgeFunctionUrl(`ai_provider/providers/${selectedProvider.id}`),
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        }
      );

      const result = await response.json();
      console.log('✅ Full API Response:', result);

      // Check if the backend returned an error
      if (!result.ok) {
        throw new Error(result.detail || result.error || 'Failed to update provider');
      }

      console.log('✅ Provider updated:', result);

      toast.success("AI provider updated successfully");
      setEditDialogOpen(false);
      setSelectedProvider(null);
      fetchProviders();
    } catch (error) {
      console.error("Error updating AI provider:", error);
      toast.error("Failed to update AI provider");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProvider = async () => {
    if (!providerToDelete) return;

    console.log('🗑️ Deleting AI provider:', providerToDelete.id);

    try {
      const response = await fetch(
        getEdgeFunctionUrl('ai_provider/providers/${providerToDelete.id}'),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      console.log('📤 Delete response status:', response.status);

      const result = await response.json();
      console.log('✅ Full API Response:', result);

      // Check if the backend returned an error
      if (!result.ok) {
        throw new Error(result.detail || result.error || 'Failed to delete provider');
      }

      console.log('✅ Delete successful:', result);

      toast.success("AI provider deleted successfully");
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
      fetchProviders();
    } catch (error) {
      console.error("❌ Error deleting AI provider:", error);
      toast.error(`Failed to delete AI provider: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleTestConnection = async (provider: AIProviderWithMaskedKey) => {
    setTestingConnection(provider.id);
    const startTime = Date.now();
    
    try {
      console.log(`Testing connection for provider: ${provider.name}`);
      
      // First, reveal the API key to test with
      const revealResponse = await fetch(
        getEdgeFunctionUrl('ai_provider/providers/${provider.id}/reveal'),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!revealResponse.ok) {
        throw new Error("Failed to retrieve API credentials");
      }

      const { apiKey, apiSecret } = await revealResponse.json();

      // Test the connection by fetching models
      const testResponse = await fetch(
        getEdgeFunctionUrl('ai_provider/fetch-models'),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            providerName: provider.providerName,
            apiKey: apiKey,
            apiSecret: apiSecret,
            endpoint: provider.endpoint,
          }),
        }
      );

      const testData = await testResponse.json();
      const responseTime = Date.now() - startTime;

      if (!testResponse.ok) {
        throw new Error(testData.details || testData.error || "Connection test failed");
      }

      const modelCount = testData.models?.length || 0;
      
      // Store successful test results
      setTestResults({
        success: true,
        provider,
        modelCount,
        models: testData.models || [],
        responseTime,
        timestamp: new Date().toISOString(),
        endpoint: provider.endpoint || 'Default endpoint',
      });
      
      setTestResultsDialogOpen(true);
      
      // Also show toast for quick feedback
      toast.success(`✅ Connection test completed`);
    } catch (error) {
      console.error(`Error testing connection for ${provider.name}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const responseTime = Date.now() - startTime;
      
      // Store failed test results
      setTestResults({
        success: false,
        provider,
        error: errorMessage,
        errorDetails: error instanceof Error ? error.stack : undefined,
        responseTime,
        timestamp: new Date().toISOString(),
        endpoint: provider.endpoint || 'Default endpoint',
      });
      
      setTestResultsDialogOpen(true);
      
      // Also show toast for quick feedback
      toast.error(`❌ Connection test failed`);
    } finally {
      setTestingConnection(null);
    }
  };

  const handleToggleEnabled = async (provider: AIProviderWithMaskedKey) => {
    try {
      const response = await fetch(
        getEdgeFunctionUrl('ai_provider/providers/${provider.id}'),
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enabled: !provider.enabled,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      toast.success(`Provider ${!provider.enabled ? 'enabled' : 'disabled'} successfully`);
      fetchProviders();
    } catch (error) {
      console.error("Error toggling provider status:", error);
      toast.error("Failed to update provider status");
    }
  };

  const handleRevealApiKey = async () => {
    if (!selectedProvider) {
      return;
    }

    if (showApiKey) {
      setShowApiKey(false);
      // Keep any changes the user made to the revealed key in formData
      return;
    }

    setLoadingReveal(true);
    try {
      const response = await fetch(
        getEdgeFunctionUrl(`ai_provider/providers/${selectedProvider.id}/reveal`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setRevealedApiKey(data.apiKey || "Not configured");
      setRevealedApiSecret(data.apiSecret || "");
      setShowApiKey(true);
    } catch (error) {
      console.error("Error revealing credentials:", error);
      toast.error("Failed to reveal credentials");
    } finally {
      setLoadingReveal(false);
    }
  };

  const handleRevealApiSecret = async () => {
    if (!selectedProvider) {
      return;
    }

    if (showApiSecret) {
      setShowApiSecret(false);
      // Keep any changes the user made to the revealed secret in formData
      return;
    }

    if (revealedApiSecret) {
      setShowApiSecret(true);
      return;
    }

    setLoadingReveal(true);
    try {
      const response = await fetch(
        getEdgeFunctionUrl(`ai_provider/providers/${selectedProvider.id}/reveal`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setRevealedApiKey(data.apiKey || "Not configured");
      setRevealedApiSecret(data.apiSecret || "");
      setShowApiSecret(true);
    } catch (error) {
      console.error("Error revealing credentials:", error);
      toast.error("Failed to reveal credentials");
    } finally {
      setLoadingReveal(false);
    }
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      toast.success(`${label} copied to clipboard`);
    } else {
      toast.error(`Failed to copy ${label} to clipboard`);
    }
  };

  const handleProviderNameChange = (value: AIProviderName) => {
    const metadata = AI_PROVIDER_METADATA[value];
    let type: AIProviderType = "text";
    
    if (metadata.supportsText && metadata.supportsImage && metadata.supportsVideo) {
      type = "multimodal";
    } else if (metadata.supportsText && metadata.supportsImage) {
      type = "multimodal";
    } else if (metadata.supportsVideo) {
      type = "video";
    } else if (metadata.supportsImage) {
      type = "image";
    } else if (metadata.supportsText) {
      type = "text";
    }
    
    setFormData({
      ...formData,
      providerName: value,
      endpoint: metadata.defaultEndpoint || formData.endpoint,
      model: metadata.defaultModel || formData.model,
      type,
    });

    // Fetch available models for this provider
    fetchAvailableModels(value, formData.apiKey);
  };

  const handleApiKeyChange = (apiKey: string) => {
    setFormData({ ...formData, apiKey });
    
    // Re-fetch models if we have a provider and a valid API key
    if (formData.providerName && apiKey.length > 10) {
      fetchAvailableModels(formData.providerName, apiKey);
    }
  };

  const handleDashboardAssignmentToggle = (dashboard: AssignableDashboardType, role: 'textProvider' | 'imageProvider' | 'videoProvider' | 'imageEditProvider') => {
    const existingAssignment = formData.dashboardAssignments.find(a => a.dashboard === dashboard);

    if (existingAssignment) {
      // Toggle the role
      const updatedAssignment = {
        ...existingAssignment,
        [role]: !existingAssignment[role],
      };

      // Remove assignment if all roles are false
      if (!updatedAssignment.textProvider && !updatedAssignment.imageProvider && !updatedAssignment.videoProvider && !updatedAssignment.imageEditProvider) {
        setFormData({
          ...formData,
          dashboardAssignments: formData.dashboardAssignments.filter(a => a.dashboard !== dashboard),
        });
      } else {
        setFormData({
          ...formData,
          dashboardAssignments: formData.dashboardAssignments.map(a =>
            a.dashboard === dashboard ? updatedAssignment : a
          ),
        });
      }
    } else {
      // Add new assignment
      setFormData({
        ...formData,
        dashboardAssignments: [
          ...formData.dashboardAssignments,
          { dashboard, [role]: true },
        ],
      });
    }
  };

  const getDashboardAssignment = (dashboard: AssignableDashboardType) => {
    return formData.dashboardAssignments.find(a => a.dashboard === dashboard);
  };

  const fetchAvailableModels = async (providerName: AIProviderName, apiKey?: string) => {
    console.log('🔍 fetchAvailableModels called:', { providerName, hasApiKey: !!apiKey });
    
    // For providers with API endpoints, fetch models
    if (!apiKey && !['dalle', 'stability'].includes(providerName)) {
      const hardcodedModels = getHardcodedModels(providerName);
      console.log('📦 Using hardcoded models:', hardcodedModels.length);
      setAvailableModels(hardcodedModels);
      
      // Auto-select first model if no model is currently selected
      if (hardcodedModels.length > 0 && !formData.model) {
        console.log('🎯 Auto-selecting first hardcoded model:', hardcodedModels[0].id);
        setFormData(prev => ({ ...prev, model: hardcodedModels[0].id }));
      }
      return;
    }

    setLoadingModels(true);
    try {
      console.log('🌐 Fetching models from API...');
      const response = await fetch(
        getEdgeFunctionUrl('ai_provider/fetch-models'),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
          body: JSON.stringify({
            providerName,
            apiKey,
            endpoint: formData.endpoint,
          }),
        }
      );

      const data = await response.json();
      console.log('✅ Full API Response:', data);
      
      // Check if the backend returned an error
      if (!data.ok) {
        const errorMsg = data.detail || data.error || 'Failed to fetch models';
        throw new Error(errorMsg);
      }
      
      console.log('✅ Models fetched successfully:', {
        count: data.models?.length || 0,
        firstFiveModels: data.models?.slice(0, 5).map((m: any) => ({ id: m.id, name: m.name })) || [],
        allModelIds: data.models?.map((m: any) => m.id) || []
      });
      const fetchedModels = data.models || [];
      setAvailableModels(fetchedModels);
      
      // Auto-select first model if no model is currently selected
      if (fetchedModels.length > 0 && !formData.model) {
        console.log('🎯 Auto-selecting first model:', fetchedModels[0].id);
        setFormData(prev => ({ ...prev, model: fetchedModels[0].id }));
        toast.success(`Loaded ${fetchedModels.length} models, auto-selected: ${fetchedModels[0].name}`);
      } else if (fetchedModels.length > 0) {
        toast.success(`Successfully loaded ${fetchedModels.length} models`);
      }
    } catch (error) {
      console.error("❌ Error fetching models:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : String(error),
        providerName,
        hasApiKey: !!apiKey
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide helpful message for authentication errors
      if (errorMessage.includes('authentication_error') || errorMessage.includes('invalid x-api-key') || errorMessage.includes('401')) {
        toast.error(`Invalid API key for ${providerName}. Please enter a valid API key from the provider's website.`);
      } else {
        toast.error(`Failed to fetch models: ${errorMessage}`);
      }
      
      // Fall back to hardcoded models if available
      const hardcodedModels = getHardcodedModels(providerName);
      console.log('📦 Falling back to hardcoded models:', hardcodedModels.length);
      setAvailableModels(hardcodedModels);
      
      // Auto-select first hardcoded model if available and no model selected
      if (hardcodedModels.length > 0 && !formData.model) {
        console.log('🎯 Auto-selecting first hardcoded model:', hardcodedModels[0].id);
        setFormData(prev => ({ ...prev, model: hardcodedModels[0].id }));
      }
    } finally {
      setLoadingModels(false);
    }
  };

  const getHardcodedModels = (providerName: AIProviderName): AIModel[] => {
    switch (providerName) {
      case 'dalle':
        return DALLE_MODELS;
      case 'stability':
        return STABILITY_MODELS;
      default:
        return [];
    }
  };

  const handleDebugBackendData = async () => {
    setLoadingDebug(true);
    setDebugDialogOpen(true);
    setDebugData(null);
    
    try {
      const response = await fetch(
        getEdgeFunctionUrl('ai_provider/providers'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Format the debug data
      const formattedData = {
        totalProviders: data.providers?.length || 0,
        providers: data.providers?.map((p: any) => ({
          id: p.id,
          name: p.name,
          providerName: p.providerName,
          type: p.type,
          enabled: p.enabled,
          model: p.model,
          dashboardAssignments: p.dashboardAssignments || [],
          assignmentCount: p.dashboardAssignments?.length || 0,
        })) || [],
      };
      
      setDebugData(formattedData);
      console.log("🔍 Backend AI Provider Debug Data:", formattedData);
    } catch (error) {
      console.error("Error fetching debug data:", error);
      setDebugData({ error: String(error) });
      toast.error("Failed to fetch debug data");
    } finally {
      setLoadingDebug(false);
    }
  };

  const getProviderIcon = (type: AIProviderType) => {
    switch (type) {
      case "text":
        return <MessageSquare className="w-4 h-4" />;
      case "image":
        return <ImageIcon className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      case "multimodal":
        return <Brain className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getProviderBrandIcon = (providerName: AIProviderName) => {
    switch (providerName) {
      case "claude":
        return <Globe className="w-4 h-4" />;
      case "openai":
        return <Sparkles className="w-4 h-4" />;
      case "gemini":
        return <Gem className="w-4 h-4" />;
      case "mistral":
        return <Wind className="w-4 h-4" />;
      case "cohere":
        return <Cpu className="w-4 h-4" />;
      case "stability":
        return <Wand2 className="w-4 h-4" />;
      case "dalle":
        return <Palette className="w-4 h-4" />;
      case "midjourney":
        return <ImageIcon className="w-4 h-4" />;
      case "runway":
        return <Clapperboard className="w-4 h-4" />;
      case "pika":
        return <Film className="w-4 h-4" />;
      case "custom":
        return <Settings className="w-4 h-4" />;
      default:
        return <Box className="w-4 h-4" />;
    }
  };

  const getTypeBadgeVariant = (type: AIProviderType) => {
    switch (type) {
      case "text":
        return "default";
      case "image":
        return "secondary";
      case "multimodal":
        return "outline";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Navigation */}
      {onNavigate && (
        <DashboardNavigation
          onNavigate={onNavigate}
          dashboardConfig={dashboardConfig}
        />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 mb-1 text-[24px]">
            <Zap className="w-6 h-6 text-purple-600" />
            AI Connections
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage AI API providers for text and image generation
          </p>
        </div>
        <div className="flex gap-2">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => fetchProviders()}
              variant="outline"
              className="gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleDebugBackendData}
              variant="outline"
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Debug
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={handleAddProvider} className="gap-2">
              <Plus className="w-4 h-4" />
              Add AI Provider
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="h-full overflow-hidden relative group hover:shadow-lg transition-all duration-300">
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              initial={false}
            />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-4">
                <motion.div 
                  className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Providers</p>
                  <motion.p 
                    className="text-2xl font-semibold"
                    key={providers.length}
                    initial={{ scale: 1.2, color: "#a855f7" }}
                    animate={{ scale: 1, color: "currentColor" }}
                    transition={{ duration: 0.5 }}
                  >
                    {providers.length}
                  </motion.p>
                  <p className="text-xs text-muted-foreground">AI Connections</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="h-full overflow-hidden relative group hover:shadow-lg transition-all duration-300">
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              initial={false}
            />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-4">
                <motion.div 
                  className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg"
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <motion.p 
                    className="text-2xl font-semibold"
                    key={providers.filter(p => p.enabled).length}
                    initial={{ scale: 1.2, color: "#16a34a" }}
                    animate={{ scale: 1, color: "currentColor" }}
                    transition={{ duration: 0.5 }}
                  >
                    {providers.filter(p => p.enabled).length}
                  </motion.p>
                  <p className="text-xs text-muted-foreground">Enabled Providers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="h-full overflow-hidden relative group hover:shadow-lg transition-all duration-300">
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              initial={false}
            />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-4">
                <motion.div 
                  className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground">Text Models</p>
                  <motion.p 
                    className="text-2xl font-semibold"
                    key={providers.filter(p => p.type === "text" || p.type === "multimodal").length}
                    initial={{ scale: 1.2, color: "#3b82f6" }}
                    animate={{ scale: 1, color: "currentColor" }}
                    transition={{ duration: 0.5 }}
                  >
                    {providers.filter(p => p.type === "text" || p.type === "multimodal").length}
                  </motion.p>
                  <p className="text-xs text-muted-foreground">Text & Multimodal</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="h-full overflow-hidden relative group hover:shadow-lg transition-all duration-300">
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              initial={false}
            />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-4">
                <motion.div 
                  className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg"
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <ImageIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground">Image Models</p>
                  <motion.p 
                    className="text-2xl font-semibold"
                    key={providers.filter(p => p.type === "image" || p.type === "multimodal").length}
                    initial={{ scale: 1.2, color: "#6366f1" }}
                    animate={{ scale: 1, color: "currentColor" }}
                    transition={{ duration: 0.5 }}
                  >
                    {providers.filter(p => p.type === "image" || p.type === "multimodal").length}
                  </motion.p>
                  <p className="text-xs text-muted-foreground">Image & Multimodal</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Providers Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>AI Providers</CardTitle>
            <CardDescription>
              Configure and manage AI API providers for various use cases
            </CardDescription>
          </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No AI providers configured yet.</p>
              <p className="text-sm mt-2">Add your first provider to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Dashboards</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider, index) => (
                  <motion.tr
                    key={provider.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.6 + index * 0.05 }}
                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getProviderBrandIcon(provider.providerName)}
                        <span>{provider.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {AI_PROVIDER_METADATA[provider.providerName]?.displayName || provider.providerName}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTypeBadgeVariant(provider.type)}>
                        {provider.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {provider.model || "—"}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {!provider.dashboardAssignments || provider.dashboardAssignments.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        ) : (
                          provider.dashboardAssignments.map((assignment) => (
                            <div key={assignment.dashboard} className="flex flex-col gap-0.5">
                              <Badge variant="outline" className="text-xs">
                                {DASHBOARD_LABELS[assignment.dashboard]}
                              </Badge>
                              {/* Show sub-function badges */}
                              <div className="flex gap-0.5">
                                {assignment.textProvider && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                    Text
                                  </Badge>
                                )}
                                {assignment.imageProvider && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                    Image
                                  </Badge>
                                )}
                                {assignment.videoProvider && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                    Video
                                  </Badge>
                                )}
                                {assignment.imageEditProvider && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-purple-500/20 text-purple-400">
                                    Image Edit
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={provider.enabled}
                          onCheckedChange={() => handleToggleEnabled(provider)}
                        />
                        {provider.enabled ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {provider.apiKeyMasked}
                      </code>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTestConnection(provider)}
                            disabled={testingConnection === provider.id}
                            title="Test API connection"
                          >
                            {testingConnection === provider.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            ) : (
                              <Zap className="w-4 h-4 text-blue-600" />
                            )}
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProvider(provider)}
                            title="Edit provider"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setProviderToDelete(provider);
                              setDeleteDialogOpen(true);
                            }}
                            title="Delete provider"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </motion.div>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        </Card>
      </motion.div>

      {/* Add Provider Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add AI Provider</DialogTitle>
            <DialogDescription>
              Configure a new AI API provider for text or image generation
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="provider-select">Provider</Label>
              <Select
                value={formData.providerName}
                onValueChange={handleProviderNameChange}
              >
                <SelectTrigger id="provider-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AI_PROVIDER_METADATA).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      {meta.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Claude Production"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                value={formData.apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="Enter API key"
              />
            </div>

            {AI_PROVIDER_METADATA[formData.providerName]?.requiresSecret && (
              <div className="grid gap-2">
                <Label htmlFor="api-secret">API Secret</Label>
                <Input
                  id="api-secret"
                  type="password"
                  value={formData.apiSecret}
                  onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                  placeholder="Enter API secret"
                />
              </div>
            )}

            <div className="grid gap-2">
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="model">Model *</Label>
                {AI_PROVIDER_METADATA[formData.providerName]?.supportsDynamicModels && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!formData.apiKey) {
                        toast.error("Please enter an API key first");
                        return;
                      }
                      fetchAvailableModels(formData.providerName, formData.apiKey);
                    }}
                    disabled={loadingModels || !formData.apiKey}
                    className="h-7 text-xs gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingModels ? 'animate-spin' : ''}`} />
                    Fetch Latest Models
                  </Button>
                )}
              </div>
              {loadingModels ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 px-3 border rounded-md bg-muted/50">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading models...
                </div>
              ) : availableModels.length > 0 ? (
                <>
                  <Select
                    value={formData.model}
                    onValueChange={(value) => setFormData({ ...formData, model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                      {availableModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex flex-col py-1">
                            <span className="font-medium">{model.name}</span>
                            {model.description && (
                              <span className="text-xs text-muted-foreground mt-0.5">
                                {model.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {availableModels.length} model{availableModels.length !== 1 ? 's' : ''} available {formData.model && '• Selected: ' + (availableModels.find(m => m.id === formData.model)?.name || formData.model)}
                  </p>
                </>
              ) : (
                <>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder={AI_PROVIDER_METADATA[formData.providerName]?.defaultModel || "e.g., gpt-4"}
                  />
                  {AI_PROVIDER_METADATA[formData.providerName]?.supportsDynamicModels && (
                    <p className="text-xs text-muted-foreground">
                      Click "Fetch Latest Models" to load available models
                    </p>
                  )}
                </>
              )}
              {availableModels.length > 0 && formData.model && (
                <p className="text-xs text-muted-foreground mt-1">
                  {availableModels.find(m => m.id === formData.model)?.description}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="endpoint">API Endpoint (Optional)</Label>
              <Input
                id="endpoint"
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                placeholder={AI_PROVIDER_METADATA[formData.providerName]?.defaultEndpoint || "https://api.example.com/v1"}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="max-tokens">Max Tokens</Label>
                <Input
                  id="max-tokens"
                  type="number"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rate-limit">Rate Limit/Min</Label>
                <Input
                  id="rate-limit"
                  type="number"
                  value={formData.rateLimitPerMinute}
                  onChange={(e) => setFormData({ ...formData, rateLimitPerMinute: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="top-p">Top P</Label>
                <Input
                  id="top-p"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={formData.topP}
                  onChange={(e) => setFormData({ ...formData, topP: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <Label>Enable this provider</Label>
            </div>

            {/* Dashboard Assignments */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                <Label>Dashboard Assignments</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Assign this provider to dashboards for text, image, and video generation
              </p>
              {(() => {
                const metadata = AI_PROVIDER_METADATA[formData.providerName];
                if (!metadata) {
                  return <p className="text-xs text-muted-foreground">No provider metadata available</p>;
                }
                
                return (
                  <div className="space-y-2">
                    {Object.entries(ASSIGNABLE_DASHBOARD_LABELS).map(([dashboard, label]) => {
                      const assignment = getDashboardAssignment(dashboard as AssignableDashboardType);
                      
                      return (
                        <div key={dashboard} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm w-24">{label}</span>
                          <div className="flex gap-2 flex-1">
                            {metadata.supportsText && (
                              <div className="flex items-center gap-1.5">
                                <Switch
                                  checked={assignment?.textProvider || false}
                                  onCheckedChange={() => handleDashboardAssignmentToggle(dashboard as AssignableDashboardType, 'textProvider')}
                                />
                                <Label className="text-xs cursor-pointer flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  Text
                                </Label>
                              </div>
                            )}
                            {metadata.supportsImage && (
                              <div className="flex items-center gap-1.5">
                                <Switch
                                  checked={assignment?.imageProvider || false}
                                  onCheckedChange={() => handleDashboardAssignmentToggle(dashboard as AssignableDashboardType, 'imageProvider')}
                                />
                                <Label className="text-xs cursor-pointer flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" />
                                  Image
                                </Label>
                              </div>
                            )}
                            {metadata.supportsVideo && (
                              <div className="flex items-center gap-1.5">
                                <Switch
                                  checked={assignment?.videoProvider || false}
                                  onCheckedChange={() => handleDashboardAssignmentToggle(dashboard as AssignableDashboardType, 'videoProvider')}
                                />
                                <Label className="text-xs cursor-pointer flex items-center gap-1">
                                  <Video className="w-3 h-3" />
                                  Video
                                </Label>
                              </div>
                            )}
                            {/* Image Edit toggle - show for Pulsar VS and image-edit type providers */}
                            {dashboard === 'pulsar-vs' && (formData.type === 'image-edit' || metadata.supportsImage) && (
                              <div className="flex items-center gap-1.5">
                                <Switch
                                  checked={assignment?.imageEditProvider || false}
                                  onCheckedChange={() => handleDashboardAssignmentToggle(dashboard as AssignableDashboardType, 'imageEditProvider')}
                                />
                                <Label className="text-xs cursor-pointer flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" />
                                  Image Edit
                                </Label>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProvider} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Provider"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Provider Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="!max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit AI Provider</DialogTitle>
            <DialogDescription>
              Update provider configuration and credentials
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-api-key">API Key</Label>
              <div className="relative">
                <Input
                  id="edit-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={showApiKey ? revealedApiKey : (formData.apiKey || "")}
                  onChange={(e) => {
                    if (showApiKey) {
                      // When revealed, allow editing the revealed key
                      setRevealedApiKey(e.target.value);
                      setFormData({ ...formData, apiKey: e.target.value });
                    } else {
                      // When hidden, edit the form data
                      setFormData({ ...formData, apiKey: e.target.value });
                    }
                  }}
                  placeholder={selectedProvider?.apiKeyConfigured ? (showApiKey ? "" : selectedProvider.apiKeyMasked) : "Enter API key"}
                  className="pr-20"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                  {selectedProvider?.apiKeyConfigured && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={handleRevealApiKey}
                      disabled={loadingReveal}
                    >
                      {loadingReveal ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : showApiKey ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                  {showApiKey && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleCopyToClipboard(revealedApiKey, "API Key")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedProvider?.apiKeyConfigured
                  ? "Leave empty to keep existing key, or enter a new one to update."
                  : "No API key configured."}
              </p>
            </div>

            {selectedProvider?.apiSecretConfigured && (
              <div className="grid gap-2">
                <Label htmlFor="edit-api-secret">API Secret</Label>
                <div className="relative">
                  <Input
                    id="edit-api-secret"
                    type={showApiSecret ? "text" : "password"}
                    value={showApiSecret ? revealedApiSecret : (formData.apiSecret || "")}
                    onChange={(e) => {
                      if (showApiSecret) {
                        // When revealed, allow editing the revealed secret
                        setRevealedApiSecret(e.target.value);
                        setFormData({ ...formData, apiSecret: e.target.value });
                      } else {
                        // When hidden, edit the form data
                        setFormData({ ...formData, apiSecret: e.target.value });
                      }
                    }}
                    placeholder={showApiSecret ? "" : "****...****"}
                    className="pr-20"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={handleRevealApiSecret}
                      disabled={loadingReveal}
                    >
                      {loadingReveal ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : showApiSecret ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                    {showApiSecret && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleCopyToClipboard(revealedApiSecret, "API Secret")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty to keep existing secret, or enter a new one to update.
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="edit-model">Model</Label>
                {AI_PROVIDER_METADATA[formData.providerName]?.supportsDynamicModels && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (formData.apiKey) {
                        // User has entered a new API key
                        await fetchAvailableModels(formData.providerName, formData.apiKey);
                      } else if (selectedProvider?.apiKeyConfigured) {
                        // Need to reveal existing API key first
                        if (revealedApiKey) {
                          // API key already revealed, use it
                          await fetchAvailableModels(formData.providerName, revealedApiKey);
                        } else {
                          // Automatically reveal the API key and fetch models
                          toast.info("Revealing API key to fetch models...");
                          await handleRevealApiKey();
                          // Note: After reveal, user needs to click Refresh again
                          // Or we could set up a useEffect to auto-fetch when revealedApiKey changes
                        }
                      } else {
                        toast.error("Please enter an API key to fetch models");
                      }
                    }}
                    disabled={loadingModels || loadingReveal}
                    className="h-7 text-xs gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingModels ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                )}
              </div>
              {loadingModels ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 px-3 border rounded-md bg-muted/50">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading models...
                </div>
              ) : availableModels.length > 0 ? (
                <>
                  <Select
                    value={formData.model}
                    onValueChange={(value) => setFormData({ ...formData, model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                      {availableModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex flex-col py-1">
                            <span className="font-medium">{model.name}</span>
                            {model.description && (
                              <span className="text-xs text-muted-foreground mt-0.5">
                                {model.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {availableModels.length} model{availableModels.length !== 1 ? 's' : ''} available
                  </p>
                </>
              ) : (
                <Input
                  id="edit-model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder={AI_PROVIDER_METADATA[formData.providerName]?.defaultModel || "e.g., gpt-4"}
                />
              )}
              {availableModels.length > 0 && formData.model && (
                <p className="text-xs text-muted-foreground mt-1">
                  {availableModels.find(m => m.id === formData.model)?.description}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-endpoint">API Endpoint</Label>
              <Input
                id="edit-endpoint"
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-max-tokens">Max Tokens</Label>
                <Input
                  id="edit-max-tokens"
                  type="number"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-rate-limit">Rate Limit/Min</Label>
                <Input
                  id="edit-rate-limit"
                  type="number"
                  value={formData.rateLimitPerMinute}
                  onChange={(e) => setFormData({ ...formData, rateLimitPerMinute: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <Label>Enable this provider</Label>
            </div>

            {/* Dashboard Assignments */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                <Label>Dashboard Assignments</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Assign this provider to dashboards for text, image, and video generation
              </p>
              {(() => {
                const metadata = AI_PROVIDER_METADATA[formData.providerName];
                if (!metadata) {
                  return <p className="text-xs text-muted-foreground">No provider metadata available</p>;
                }
                
                return (
                  <div className="space-y-2">
                    {Object.entries(ASSIGNABLE_DASHBOARD_LABELS).map(([dashboard, label]) => {
                      const assignment = getDashboardAssignment(dashboard as AssignableDashboardType);
                      
                      return (
                        <div key={dashboard} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm w-24">{label}</span>
                          <div className="flex gap-2 flex-1">
                            {metadata.supportsText && (
                              <div className="flex items-center gap-1.5">
                                <Switch
                                  checked={assignment?.textProvider || false}
                                  onCheckedChange={() => handleDashboardAssignmentToggle(dashboard as AssignableDashboardType, 'textProvider')}
                                />
                                <Label className="text-xs cursor-pointer flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  Text
                                </Label>
                              </div>
                            )}
                            {metadata.supportsImage && (
                              <div className="flex items-center gap-1.5">
                                <Switch
                                  checked={assignment?.imageProvider || false}
                                  onCheckedChange={() => handleDashboardAssignmentToggle(dashboard as AssignableDashboardType, 'imageProvider')}
                                />
                                <Label className="text-xs cursor-pointer flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" />
                                  Image
                                </Label>
                              </div>
                            )}
                            {metadata.supportsVideo && (
                              <div className="flex items-center gap-1.5">
                                <Switch
                                  checked={assignment?.videoProvider || false}
                                  onCheckedChange={() => handleDashboardAssignmentToggle(dashboard as AssignableDashboardType, 'videoProvider')}
                                />
                                <Label className="text-xs cursor-pointer flex items-center gap-1">
                                  <Video className="w-3 h-3" />
                                  Video
                                </Label>
                              </div>
                            )}
                            {/* Image Edit toggle - show for Pulsar VS and image-edit type providers */}
                            {dashboard === 'pulsar-vs' && (formData.type === 'image-edit' || metadata.supportsImage) && (
                              <div className="flex items-center gap-1.5">
                                <Switch
                                  checked={assignment?.imageEditProvider || false}
                                  onCheckedChange={() => handleDashboardAssignmentToggle(dashboard as AssignableDashboardType, 'imageEditProvider')}
                                />
                                <Label className="text-xs cursor-pointer flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" />
                                  Image Edit
                                </Label>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProvider} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Connection Results Dialog */}
      <Dialog open={testResultsDialogOpen} onOpenChange={setTestResultsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {testResults?.success ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Connection Test Successful
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  Connection Test Failed
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Test results for {testResults?.provider.name}
            </DialogDescription>
          </DialogHeader>

          {testResults && (
            <div className="space-y-4 py-4">
              {/* Status Banner */}
              <div className={`p-4 rounded-lg border ${
                testResults.success 
                  ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {testResults.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                  <span className={testResults.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                    {testResults.success ? 'Successfully connected to AI API' : 'Failed to connect to AI API'}
                  </span>
                </div>
                {testResults.success && testResults.modelCount !== undefined && (
                  <p className="text-sm text-green-600 dark:text-green-400 ml-7">
                    Found {testResults.modelCount} available model{testResults.modelCount !== 1 ? 's' : ''}
                  </p>
                )}
                {!testResults.success && testResults.error && (
                  <p className="text-sm text-red-600 dark:text-red-400 ml-7">
                    {testResults.error}
                  </p>
                )}
              </div>

              {/* Provider Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Provider Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{testResults.provider.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provider:</span>
                    <Badge variant="outline">{testResults.provider.providerName}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant="secondary">{testResults.provider.type}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model:</span>
                    <code className="bg-muted px-2 py-0.5 rounded text-xs">
                      {testResults.provider.model || 'Not specified'}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Endpoint:</span>
                    <code className="bg-muted px-2 py-0.5 rounded text-xs max-w-xs truncate">
                      {testResults.endpoint}
                    </code>
                  </div>
                </CardContent>
              </Card>

              {/* Test Metrics */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Test Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Response Time:</span>
                    <span>{testResults.responseTime}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Timestamp:</span>
                    <span className="text-xs">
                      {new Date(testResults.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {testResults.success && testResults.modelCount !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Models Found:</span>
                      <span>{testResults.modelCount}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Available Models (on success) */}
              {testResults.success && testResults.models && testResults.models.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Available Models</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-48 overflow-y-auto">
                      <div className="flex flex-wrap gap-2">
                        {testResults.models.map((model) => (
                          <Badge key={model.id} variant="outline" className="text-xs">
                            {model.name || model.id}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error Details (on failure) */}
              {!testResults.success && testResults.errorDetails && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-red-600 dark:text-red-400">
                      Error Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {testResults.errorDetails}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setTestResultsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Debug Backend Data Dialog */}
      <Dialog open={debugDialogOpen} onOpenChange={setDebugDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🔍 Backend AI Provider Debug</DialogTitle>
            <DialogDescription>
              Raw backend data showing AI providers, types, and dashboard assignments
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingDebug ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : debugData?.error ? (
              <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400">
                  <strong>Error:</strong> {debugData.error}
                </p>
              </div>
            ) : debugData ? (
              <div className="space-y-4">
                {/* Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl">{debugData.totalProviders} Total Provider{debugData.totalProviders !== 1 ? 's' : ''}</div>
                  </CardContent>
                </Card>

                {/* Provider Details */}
                {debugData.providers && debugData.providers.length > 0 ? (
                  <div className="space-y-3">
                    {debugData.providers.map((provider: any, idx: number) => (
                      <Card key={provider.id || idx}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{provider.name}</CardTitle>
                            <Badge variant={provider.enabled ? "default" : "secondary"}>
                              {provider.enabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Provider:</span>{" "}
                              <code className="bg-muted px-2 py-0.5 rounded">{provider.providerName}</code>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Type:</span>{" "}
                              <Badge variant="outline">{provider.type}</Badge>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Model:</span>{" "}
                              <code className="bg-muted px-2 py-0.5 rounded">{provider.model || "—"}</code>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Dashboard Assignments:</span>{" "}
                              <strong>{provider.assignmentCount}</strong>
                            </div>
                          </div>

                          {/* Dashboard Assignments Detail */}
                          {provider.dashboardAssignments && provider.dashboardAssignments.length > 0 ? (
                            <div className="mt-4 space-y-2">
                              <div className="text-sm text-muted-foreground mb-2">📊 Assigned Dashboards:</div>
                              <div className="space-y-2">
                                {provider.dashboardAssignments.map((assignment: any, aIdx: number) => (
                                  <div 
                                    key={`${provider.id}-${assignment.dashboard}-${aIdx}`} 
                                    className="flex items-center gap-2 p-2 bg-muted/50 rounded"
                                  >
                                    <LayoutDashboard className="w-4 h-4 text-blue-600" />
                                    <strong className="text-sm">{DASHBOARD_LABELS[assignment.dashboard as DashboardType] || assignment.dashboard}</strong>
                                    <div className="flex gap-1 ml-auto">
                                      {assignment.textProvider && (
                                        <Badge variant="outline" className="text-xs gap-1">
                                          <MessageSquare className="w-3 h-3" />
                                          Text
                                        </Badge>
                                      )}
                                      {assignment.imageProvider && (
                                        <Badge variant="outline" className="text-xs gap-1">
                                          <ImageIcon className="w-3 h-3" />
                                          Image
                                        </Badge>
                                      )}
                                      {assignment.videoProvider && (
                                        <Badge variant="outline" className="text-xs gap-1">
                                          <Video className="w-3 h-3" />
                                          Video
                                        </Badge>
                                      )}
                                      {assignment.imageEditProvider && (
                                        <Badge variant="outline" className="text-xs gap-1">
                                          <ImageIcon className="w-3 h-3" />
                                          Image Edit
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground italic">No dashboard assignments</div>
                          )}

                          {/* Raw JSON */}
                          <details className="mt-3">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              View Raw JSON
                            </summary>
                            <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(provider, null, 2)}
                            </pre>
                          </details>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No providers found in backend
                  </div>
                )}

                {/* Full Raw Data */}
                <details>
                  <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                    View Complete Raw Response
                  </summary>
                  <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-x-auto">
                    {JSON.stringify(debugData, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Click the Debug button to fetch backend data
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDebugDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleDebugBackendData} disabled={loadingDebug} className="gap-2">
              {loadingDebug ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Refresh Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AI Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{providerToDelete?.name}</strong>?
              <br />
              <br />
              This action cannot be undone. All dashboard assignments and configurations for this provider will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProvider}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

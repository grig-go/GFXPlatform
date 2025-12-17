import { useState, useMemo, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
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
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Channel, ChannelType } from "../types/channels";
import { Plus, Search, Filter, Edit, X, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";

const CHANNEL_TYPES: ChannelType[] = ["Pixera", "Vizrt", "Unreal", "Web"];

const TYPE_COLORS: Record<ChannelType, string> = {
  Pixera: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Vizrt: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Unreal: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  Web: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

export function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [deletingChannel, setDeletingChannel] = useState<Channel | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "Pixera" as ChannelType,
    description: "",
  });

  // Fetch channels on mount
  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        getEdgeFunctionUrl('channels'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      const data = await response.json();
      console.log("Full channels response:", JSON.stringify(data, null, 2));

      if (data.ok && data.channels) {
        setChannels(data.channels);
      } else {
        const errorMessage = typeof data.error === 'string' 
          ? data.error 
          : JSON.stringify(data, null, 2);
        toast.error("Failed to load channels");
        console.error("Error loading channels:", errorMessage);
      }
    } catch (error) {
      toast.error("Failed to connect to server");
      console.error("Error fetching channels - full error:", error);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  // Filtered channels
  const filteredChannels = useMemo(() => {
    return channels.filter((channel) => {
      const matchesSearch =
        searchQuery === "" ||
        channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (channel.description?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (channel.type?.toLowerCase() || "").includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === "all" || channel.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [channels, searchQuery, typeFilter]);

  const handleAddChannel = async () => {
    if (!formData.name.trim()) {
      toast.error("Channel name is required");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(
        getEdgeFunctionUrl('channels'),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            type: formData.type,
            description: formData.description,
            status: "active",
          }),
        }
      );

      const data = await response.json();

      if (data.ok && data.channel) {
        setChannels((prev) => [data.channel, ...prev]);
        toast.success(`Channel "${formData.name}" added successfully`);
        setShowAddDialog(false);
        resetForm();
      } else {
        const errorMessage = data.error || "Failed to create channel";
        const errorDetails = data.code ? ` (${data.code})` : "";
        const fullError = errorMessage + errorDetails;
        
        toast.error(fullError);
        console.error("Error creating channel:", {
          error: data.error,
          code: data.code,
          hint: data.hint,
          details: data.details
        });
        
        // Log hint if available
        if (data.hint) {
          console.log("Hint:", data.hint);
        }
      }
    } catch (error) {
      toast.error("Failed to connect to server");
      console.error("Error adding channel:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditChannel = async () => {
    if (!editingChannel) return;

    if (!formData.name.trim()) {
      toast.error("Channel name is required");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(
        getEdgeFunctionUrl('channels/${editingChannel.id}'),
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            type: formData.type,
            description: formData.description,
          }),
        }
      );

      const data = await response.json();

      if (data.ok && data.channel) {
        setChannels((prev) =>
          prev.map((ch) => (ch.id === editingChannel.id ? data.channel : ch))
        );
        toast.success(`Channel "${formData.name}" updated successfully`);
        setEditingChannel(null);
        resetForm();
      } else {
        toast.error("Failed to update channel");
        console.error("Error updating channel:", data.error);
      }
    } catch (error) {
      toast.error("Failed to connect to server");
      console.error("Error editing channel:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!deletingChannel) return;

    try {
      const response = await fetch(
        getEdgeFunctionUrl('channels/${deletingChannel.id}'),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      const data = await response.json();

      if (data.ok) {
        setChannels((prev) => prev.filter((ch) => ch.id !== deletingChannel.id));
        toast.success(`Channel "${deletingChannel.name}" deleted successfully`);
        setDeletingChannel(null);
      } else {
        toast.error("Failed to delete channel");
        console.error("Error deleting channel:", data.error);
      }
    } catch (error) {
      toast.error("Failed to connect to server");
      console.error("Error deleting channel:", error);
    }
  };

  const openEditDialog = (channel: Channel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      type: channel.type,
      description: channel.description || "",
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "Pixera",
      description: "",
    });
  };

  const closeDialogs = () => {
    setShowAddDialog(false);
    setEditingChannel(null);
    resetForm();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 mb-1 text-[24px]">
            Channels
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage broadcast and output channels across different systems
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Channel
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search channels by name, type, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Channel Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {CHANNEL_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters */}
            {(searchQuery || typeFilter !== "all") && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  Active filters:
                </span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Search: {searchQuery}
                    <button
                      onClick={() => setSearchQuery("")}
                      className="ml-1 hover:bg-muted rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {typeFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Type: {typeFilter}
                    <button
                      onClick={() => setTypeFilter("all")}
                      className="ml-1 hover:bg-muted rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setTypeFilter("all");
                  }}
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredChannels.length} of {channels.length} channels
      </div>

      {/* Channels Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredChannels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No channels found
                </TableCell>
              </TableRow>
            ) : (
              filteredChannels.map((channel) => (
                <TableRow key={channel.id}>
                  <TableCell>{channel.name}</TableCell>
                  <TableCell>
                    <Badge className={TYPE_COLORS[channel.type]}>
                      {channel.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="truncate">{channel.description}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {channel.created_by || 'Unknown'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(channel)}
                      className="gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingChannel(channel)}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add/Edit Channel Dialog */}
      <Dialog
        open={showAddDialog || editingChannel !== null}
        onOpenChange={(open) => {
          if (!open) closeDialogs();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingChannel ? "Edit Channel" : "Add New Channel"}
            </DialogTitle>
            <DialogDescription>
              {editingChannel
                ? "Update the channel details below."
                : "Create a new broadcast or output channel."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Channel Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Main Output A"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Channel Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type: value as ChannelType }))
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter channel description..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>
              Cancel
            </Button>
            <Button
              onClick={editingChannel ? handleEditChannel : handleAddChannel}
              disabled={submitting}
            >
              {editingChannel ? "Save Changes" : "Add Channel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Channel Dialog */}
      <AlertDialog
        open={deletingChannel !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingChannel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this channel?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              channel and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChannel}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  User as UserIcon,
  Mail,
  Shield,
  Calendar,
  Clock,
  Globe,
  Smartphone,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Crown,
  Loader2,
  Building2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { supabase } from "../utils/supabase";
import { OrganizationPanel } from "./settings/OrganizationPanel";

interface AccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserPreferences {
  theme: "light" | "dark" | "system";
  timezone: string;
  date_format: string;
  language: string;
  email_notifications: boolean;
  push_notifications: boolean;
}

export function AccountSettingsDialog({
  open,
  onOpenChange,
}: AccountSettingsDialogProps) {
  const { user, refreshUser } = useAuth();
  const { isSuperuser, permissions: userPermissionKeys } = usePermissions();

  // Profile state
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preferences state
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [timezone, setTimezone] = useState("America/New_York");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [language, setLanguage] = useState("en");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Session state
  const [isSigningOutSessions, setIsSigningOutSessions] = useState(false);

  // General state
  const [isSaving, setIsSaving] = useState(false);

  // Load user data when dialog opens
  useEffect(() => {
    if (user && open) {
      setFullName(user.full_name || "");
      setAvatarUrl(user.avatar_url || null);

      // Load preferences from user.preferences
      const prefs = (user as any).preferences as UserPreferences | null;
      if (prefs) {
        setTheme(prefs.theme || "system");
        setTimezone(prefs.timezone || "America/New_York");
        setDateFormat(prefs.date_format || "MM/DD/YYYY");
        setLanguage(prefs.language || "en");
        setEmailNotifications(prefs.email_notifications ?? true);
        setPushNotifications(prefs.push_notifications ?? true);
      }
    }
  }, [user, open]);

  // Apply theme when it changes
  const applyTheme = (newTheme: "light" | "dark" | "system") => {
    const root = document.documentElement;
    if (newTheme === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", systemDark);
    } else {
      root.classList.toggle("dark", newTheme === "dark");
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("public")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("public")
        .getPublicUrl(filePath);

      // Update user record
      const { error: updateError } = await supabase
        .from("u_users")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success("Profile photo updated");

      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      console.error("Error uploading avatar:", err);
      toast.error("Failed to upload photo");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Error changing password:", err);
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle sign out all sessions
  const handleSignOutAllSessions = async () => {
    setIsSigningOutSessions(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;
      toast.success("All other sessions have been signed out");
    } catch (err: any) {
      console.error("Error signing out sessions:", err);
      toast.error(err.message || "Failed to sign out sessions");
    } finally {
      setIsSigningOutSessions(false);
    }
  };

  // Handle save (profile + preferences)
  const handleSave = async () => {
    console.log('[AccountSettings] handleSave called');
    if (!user) {
      console.log('[AccountSettings] No user, returning');
      return;
    }

    setIsSaving(true);
    try {
      const preferences: UserPreferences = {
        theme,
        timezone,
        date_format: dateFormat,
        language,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
      };

      console.log('[AccountSettings] Saving preferences:', preferences);
      console.log('[AccountSettings] Saving full_name:', fullName);
      console.log('[AccountSettings] User ID:', user.id);

      // Use RPC function to bypass RLS issues - pass user_id for auth verification
      const { data, error } = await supabase.rpc('update_user_profile', {
        p_user_id: user.id,
        p_full_name: fullName,
        p_preferences: preferences,
        p_avatar_url: avatarUrl,
      });

      console.log('[AccountSettings] Update result:', { data, error });

      if (error) throw error;

      // Apply theme
      applyTheme(theme);

      toast.success("Settings saved successfully");

      // Refresh user data
      if (refreshUser) {
        console.log('[AccountSettings] Refreshing user...');
        await refreshUser();
      }

      onOpenChange(false);
    } catch (err) {
      console.error("[AccountSettings] Error updating settings:", err);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
          <DialogDescription>
            Manage your account settings, preferences, and security options.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="organization">
              <Building2 className="w-4 h-4 mr-1" />
              Org
            </TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4">
            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and profile picture
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage
                        src={
                          avatarUrl ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`
                        }
                        alt={user.full_name || user.email}
                      />
                      <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                      >
                        {isUploadingAvatar ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Change Photo
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG or GIF. Max size 2MB.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  {/* Email (Read-only) */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={user.email}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Contact an administrator to change your email address.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Organization Tab */}
            <TabsContent value="organization" className="space-y-4">
              <OrganizationPanel />
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Customize how Nova looks on your device
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Select
                      value={theme}
                      onValueChange={(value: "light" | "dark" | "system") => setTheme(value)}
                    >
                      <SelectTrigger id="theme">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Regional Settings</CardTitle>
                  <CardDescription>
                    Configure timezone, language, and formatting preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Timezone */}
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                        <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                        <SelectItem value="Europe/London">London (GMT)</SelectItem>
                        <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Format */}
                  <div className="space-y-2">
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select value={dateFormat} onValueChange={setDateFormat}>
                      <SelectTrigger id="dateFormat">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Language */}
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger id="language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>
                    Choose what notifications you want to receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email updates about your account activity
                      </p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="pushNotifications">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Get push notifications for important updates
                      </p>
                    </div>
                    <Switch
                      id="pushNotifications"
                      checked={pushNotifications}
                      onCheckedChange={setPushNotifications}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={handlePasswordChange}
                    disabled={isChangingPassword || !newPassword || !confirmPassword}
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Two-Factor Authentication - Grayed Out */}
              <Card className="opacity-60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Two-Factor Authentication
                    <Badge variant="secondary">Coming Soon</Badge>
                  </CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="twoFactor">Two-Factor Authentication</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Secure your account with 2FA
                      </p>
                    </div>
                    <Switch id="twoFactor" checked={false} disabled />
                  </div>

                  <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex items-start gap-2">
                      <Smartphone className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Authenticator App</p>
                        <p className="text-xs text-muted-foreground">
                          Use your authenticator app to generate codes
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-2" disabled>
                      View Recovery Codes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active Sessions</CardTitle>
                  <CardDescription>
                    Manage your active sessions across devices
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Current Session</p>
                          <p className="text-xs text-muted-foreground">Active now</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      >
                        Active
                      </Badge>
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleSignOutAllSessions}
                    disabled={isSigningOutSessions}
                  >
                    {isSigningOutSessions ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing out...
                      </>
                    ) : (
                      "Sign Out All Other Sessions"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Role & Permissions</CardTitle>
                  <CardDescription>
                    View your current role and associated permissions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Account Type */}
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      {isSuperuser ? (
                        <Crown className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <Shield className="w-5 h-5 text-primary" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">
                          {isSuperuser ? "Superuser" : "Standard User"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isSuperuser
                            ? "Full access to all features"
                            : `${userPermissionKeys.length} permissions assigned`}
                        </p>
                      </div>
                      <Badge variant="secondary">Read-only</Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Groups */}
                  <div className="space-y-2">
                    <Label>Groups</Label>
                    <div className="flex flex-wrap gap-2">
                      {user.groups && user.groups.length > 0 ? (
                        user.groups.map((group) => (
                          <Badge
                            key={group.id}
                            variant="secondary"
                            style={{
                              backgroundColor: group.color ? `${group.color}20` : undefined,
                              borderColor: group.color || undefined,
                            }}
                          >
                            {group.name}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No groups assigned</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Permissions */}
                  <div className="space-y-2">
                    <Label>Your Permissions</Label>
                    <ScrollArea className="h-[200px] rounded-lg border p-4">
                      <div className="space-y-2">
                        {isSuperuser ? (
                          <div className="flex items-start gap-2 p-2 rounded bg-yellow-50 dark:bg-yellow-900/20">
                            <Crown className="w-4 h-4 text-yellow-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Superuser Access</p>
                              <p className="text-xs text-muted-foreground">
                                You have full access to all features and settings
                              </p>
                            </div>
                          </div>
                        ) : userPermissionKeys.length > 0 ? (
                          userPermissionKeys.map((perm) => (
                            <div
                              key={perm}
                              className="flex items-start gap-2 p-2 rounded hover:bg-muted/50"
                            >
                              <Check className="w-4 h-4 text-green-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium font-mono">{perm}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No permissions assigned
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                    <p className="text-xs text-muted-foreground mt-2">
                      Contact your administrator to request permission changes.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>View your account details and status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Account Created
                      </p>
                      <p className="text-sm font-medium">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Last Updated
                      </p>
                      <p className="text-sm font-medium">
                        {new Date(user.updated_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Account Status</p>
                      <Badge
                        variant={
                          user.status === "active"
                            ? "default"
                            : user.status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Groups</p>
                      <p className="text-sm font-medium">{user.groups?.length || 0} group(s)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible actions that affect your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Delete Account</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Once you delete your account, there is no going back. Please be
                        certain.
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" disabled>
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </ScrollArea>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              console.log('[AccountSettings] Save button clicked');
              handleSave();
            }}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

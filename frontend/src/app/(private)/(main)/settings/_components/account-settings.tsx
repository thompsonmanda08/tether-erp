"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UserAvatarUpload } from "@/components/ui/user-avatar-upload";
import { ChangePasswordModal } from "./change-password";
import { updateAccountSettings } from "@/app/_actions/settings";
import { User } from "@/types/auth";
import { AlertCircle, CheckCircle, Lock, Activity, Clock, LogIn, Key, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useUserActivityLogs } from "@/hooks/use-user-activity-logs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AccountSettingsProps {
  user: User | null;
  onProfileUpdate?: (updatedUser: User) => void;
}

export function AccountSettings({
  user,
  onProfileUpdate,
}: AccountSettingsProps) {
  const prefs = user?.preferences;
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Profile
    name: user?.name || "",
    email: user?.email || "",
    position: user?.position || "",
    manNumber: user?.manNumber || "",
    nrcNumber: user?.nrcNumber || "",
    contact: user?.contact || "",
    // Preferences
    avatar: prefs?.avatar || "",
    department: prefs?.department || "",
    language: prefs?.language || "en",
    theme: prefs?.theme || "system",
    timezone: prefs?.timezone || "Africa/Lusaka",
    emailNotifications: prefs?.emailNotifications ?? true,
    pushNotifications: prefs?.pushNotifications ?? false,
    activityNotifications: prefs?.activityNotifications ?? true,
  });

  useEffect(() => {
    if (user) {
      const p = user.preferences;
      setFormData({
        name: user.name || "",
        email: user.email || "",
        position: user.position || "",
        manNumber: user.manNumber || "",
        nrcNumber: user.nrcNumber || "",
        contact: user.contact || "",
        avatar: p?.avatar || "",
        department: p?.department || "",
        language: p?.language || "en",
        theme: p?.theme || "system",
        timezone: p?.timezone || "Africa/Lusaka",
        emailNotifications: p?.emailNotifications ?? true,
        pushNotifications: p?.pushNotifications ?? false,
        activityNotifications: p?.activityNotifications ?? true,
      });
    }
  }, [user]);

  const set = (field: string, value: string | boolean) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await updateAccountSettings({
        name: formData.name,
        email: formData.email,
        position: formData.position,
        manNumber: formData.manNumber,
        nrcNumber: formData.nrcNumber,
        contact: formData.contact,
        preferences: {
          avatar: formData.avatar,
          department: formData.department,
          language: formData.language,
          theme: formData.theme,
          timezone: formData.timezone,
          emailNotifications: formData.emailNotifications,
          pushNotifications: formData.pushNotifications,
          activityNotifications: formData.activityNotifications,
        },
      });

      if (result.success) {
        toast.success("Settings saved successfully");
        if (result.data && onProfileUpdate) {
          onProfileUpdate(result.data as User);
        }
        // Invalidate the React Query session cache so the header/nav user
        // menu and sidebar re-render immediately with the updated name/avatar.
        queryClient.invalidateQueries({ queryKey: ["session"] });
      } else {
        toast.error(result.message || "Failed to save settings");
      }
    } catch {
      toast.error("An error occurred while saving settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
        <CardDescription>
          Manage your profile, preferences, and notification settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <UserAvatarUpload
              currentAvatarUrl={formData.avatar}
              userName={formData.name || "User"}
              onAvatarChange={(url) => set("avatar", url)}
              disabled={isLoading}
              size="lg"
            />
          </div>

          {/* Profile fields */}
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Full Name"
              id="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) => set("name", e.target.value)}
              disabled={isLoading}
            />
            <Input
              label="Email Address"
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={(e) => set("email", e.target.value)}
              disabled={isLoading}
              descriptionText="Used for account notifications and password recovery"
            />
            <Input
              label="Position"
              id="position"
              placeholder="e.g., Procurement Officer"
              value={formData.position}
              onChange={(e) => set("position", e.target.value)}
              disabled={isLoading}
            />
            <Input
              label="Man Number"
              id="manNumber"
              placeholder="e.g., MAN12345"
              value={formData.manNumber}
              onChange={(e) => set("manNumber", e.target.value)}
              disabled={isLoading}
            />
            <Input
              label="NRC Number"
              id="nrcNumber"
              placeholder="e.g., 123456/78/9"
              value={formData.nrcNumber}
              onChange={(e) => set("nrcNumber", e.target.value)}
              disabled={isLoading}
            />
            <Input
              label="Contact"
              id="contact"
              type="tel"
              placeholder="e.g., +260 XXX XXX XXX"
              value={formData.contact}
              onChange={(e) => set("contact", e.target.value)}
              disabled={isLoading}
            />
            <Input
              label="Department"
              id="department"
              placeholder="Your department"
              value={formData.department}
              onChange={(e) => set("department", e.target.value)}
              disabled={isLoading}
            />
            <Input
              label="Role"
              id="role"
              value={user?.role || "N/A"}
              disabled
              className="cursor-not-allowed"
              descriptionText="Your role is managed by administrators"
            />
          </div>

          {/* Password row */}
          <div className="flex items-center justify-between py-3 border-t border-b">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Password</p>
                <p className="text-xs text-muted-foreground">
                  Update your account password
                </p>
              </div>
            </div>
            <ChangePasswordModal />
          </div>

          {/* Preferences */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Preferences
            </p>

            {/* Display selects */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={formData.language}
                  onValueChange={(v) => set("language", v)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={formData.theme}
                  onValueChange={(v) => set("theme", v)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System Default</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(v) => set("timezone", v)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Lusaka">
                      Africa/Lusaka (CAT)
                    </SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="Europe/London">
                      Europe/London (GMT)
                    </SelectItem>
                    <SelectItem value="America/New_York">
                      America/New_York (EST)
                    </SelectItem>
                    <SelectItem value="America/Los_Angeles">
                      America/Los_Angeles (PST)
                    </SelectItem>
                    <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notifications */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Receive important updates via email
                  </p>
                </div>
                <Switch
                  checked={formData.emailNotifications}
                  onCheckedChange={(v) => set("emailNotifications", v)}
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Receive instant notifications on your device
                  </p>
                </div>
                <Switch
                  checked={formData.pushNotifications}
                  onCheckedChange={(v) => set("pushNotifications", v)}
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">Activity Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Get notified about workflow activities and approvals
                  </p>
                </div>
                <Switch
                  checked={formData.activityNotifications}
                  onCheckedChange={(v) => set("activityNotifications", v)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              loadingText="Saving..."
            >
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    <RecentActivitySection />
    </>
  );
}

function getActionIcon(actionType: string) {
  if (actionType.includes("login")) return <LogIn className="h-4 w-4 text-blue-500" />;
  if (actionType.includes("password") || actionType.includes("security")) return <Key className="h-4 w-4 text-amber-500" />;
  if (actionType.includes("session")) return <Shield className="h-4 w-4 text-purple-500" />;
  if (actionType.includes("profile") || actionType.includes("preferences")) return <CheckCircle className="h-4 w-4 text-green-500" />;
  return <Activity className="h-4 w-4 text-muted-foreground" />;
}

function formatActionLabel(actionType: string): string {
  return actionType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function RecentActivitySection() {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading, isError } = useUserActivityLogs({ limit: 10, page: 1 });

  const activities: any[] = data?.activities ?? [];

  return (
    <Card className="mt-6">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>Your last 10 account actions</CardDescription>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {isError && (
            <p className="text-sm text-muted-foreground">
              Unable to load activity. Activity logging will be available after first use.
            </p>
          )}
          {!isLoading && !isError && activities.length === 0 && (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          )}
          {!isLoading && !isError && activities.length > 0 && (
            <div className="space-y-3">
              {activities.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-0.5 shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    {getActionIcon(entry.action_type || entry.actionType || "")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {formatActionLabel(entry.action_type || entry.actionType || "Unknown")}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{formatRelative(entry.created_at || entry.createdAt)}</span>
                      {(entry.ip_address || entry.ipAddress) && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{entry.ip_address || entry.ipAddress}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

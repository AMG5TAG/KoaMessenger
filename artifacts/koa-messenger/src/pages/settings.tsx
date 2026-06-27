import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import {
  useGetMe,
  useUpdateMe,
  useGetNotificationPreferences,
  useUpdateNotificationPreferences,
  useListUserPlatforms,
  getGetMeQueryKey,
  getGetNotificationPreferencesQueryKey,
} from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bell, User, Moon, Sun, Monitor, Shield, Smartphone, Laptop } from "lucide-react";
import { useUser } from "@clerk/react";
import { PlatformIcon } from "@/components/platform-icon";
import { useTheme } from "@/lib/theme-context";
import { isPlatformAvailable } from "@/lib/desktop";

export default function Settings() {
  const { user } = useUser();
  const { toast } = useToast();

  const { data: me, isLoading: meLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey() },
  });
  const { data: notifPrefs, isLoading: notifLoading } = useGetNotificationPreferences({
    query: { queryKey: getGetNotificationPreferencesQueryKey() },
  });
  const { data: allUserPlatforms } = useListUserPlatforms();
  // Hide platforms that can't be embedded in the browser — they're desktop-only
  // (see isPlatformAvailable), so they shouldn't show in the web build's
  // notification list either.
  const userPlatforms = allUserPlatforms?.filter((up) =>
    isPlatformAvailable(up.platform),
  );

  const updateMe = useUpdateMe();
  const updateNotif = useUpdateNotificationPreferences();

  const [displayName, setDisplayName] = useState("");
  const [globalNotifs, setGlobalNotifs] = useState(true);
  const [syncAccounts, setSyncAccounts] = useState(true);

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (me) {
      setDisplayName(me.displayName ?? "");
      setSyncAccounts(me.syncAccounts ?? true);
    }
  }, [me]);

  useEffect(() => {
    if (notifPrefs) {
      setGlobalNotifs(notifPrefs.globalEnabled);
    }
  }, [notifPrefs]);

  const saveProfile = () => {
    updateMe.mutate(
      { data: { displayName, theme, syncAccounts } },
      {
        onSuccess: () => {
          toast({ title: "Saved", description: "Profile updated." });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
        onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
      }
    );
  };

  const onThemeChange = (value: "light" | "dark" | "system") => {
    setTheme(value);
    updateMe.mutate(
      { data: { theme: value } },
      {
        onSuccess: () => {
          toast({ title: "Saved", description: `Appearance set to ${value}.` });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
        onError: () => toast({ title: "Error", description: "Failed to save appearance.", variant: "destructive" }),
      }
    );
  };

  const saveNotifications = (newGlobal: boolean) => {
    setGlobalNotifs(newGlobal);
    updateNotif.mutate(
      { data: { globalEnabled: newGlobal } },
      {
        onSuccess: () => {
          toast({ title: "Saved", description: "Notification preferences updated." });
          queryClient.invalidateQueries({ queryKey: getGetNotificationPreferencesQueryKey() });
        },
      }
    );
  };

  const isLoading = meLoading || notifLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 text-[#dc2350] animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto bg-background p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences.</p>
          </div>

          {/* Profile */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <User className="w-5 h-5 text-[#dc2350]" />
              <h2 className="text-lg font-semibold text-foreground">Profile</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Display Name</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="bg-card border-border text-foreground"
                  data-testid="input-display-name"
                />
                <p className="text-xs text-muted-foreground mt-1">This name is shown within KoaMessenger. Your email is never visible to others.</p>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">Email</label>
                <div className="bg-card border border-border rounded-md px-3 py-2 text-muted-foreground text-sm">
                  {user?.primaryEmailAddress?.emailAddress ?? "Not available"}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Your email is private and never shared with other users.
                </p>
              </div>

              <Button
                onClick={saveProfile}
                disabled={updateMe.isPending}
                className="bg-[#dc2350] hover:bg-[#e34f73] text-white"
                data-testid="button-save-profile"
              >
                {updateMe.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Profile"}
              </Button>
            </div>
          </section>

          {/* Account Sync */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <Smartphone className="w-5 h-5 text-[#dc2350]" />
              <h2 className="text-lg font-semibold text-foreground">Account Sync</h2>
            </div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-foreground text-sm font-medium">Sync across web and desktop</p>
                <p className="text-muted-foreground text-xs">When enabled, your platform logins are shared between the browser and the macOS app.</p>
              </div>
              <button
                onClick={() => {
                  setSyncAccounts(!syncAccounts);
                  updateMe.mutate(
                    { data: { syncAccounts: !syncAccounts } },
                    {
                      onSuccess: () => {
                        toast({ title: "Saved", description: !syncAccounts ? "Account sync enabled." : "Account sync disabled." });
                        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
                      },
                      onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
                    }
                  );
                }}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  syncAccounts ? "bg-[#dc2350]" : "bg-input"
                }`}
                data-testid="toggle-sync-accounts"
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    syncAccounts ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Turning this off isolates your desktop sessions so they never overlap with your browser sessions.
            </p>
          </section>

          {/* Theme */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <Monitor className="w-5 h-5 text-[#dc2350]" />
              <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
            </div>
            <div className="flex gap-3">
              {([
                { value: "light" as const, icon: Sun, label: "Light" },
                { value: "dark" as const, icon: Moon, label: "Dark" },
                { value: "system" as const, icon: Monitor, label: "System" },
              ] as const).map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => onThemeChange(value)}
                  className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-lg border transition-all ${
                    theme === value
                      ? "bg-[#dc2350]/10 border-[#dc2350] text-[#dc2350]"
                      : "border-border text-muted-foreground hover:border-[#dc2350]"
                  }`}
                  data-testid={`button-theme-${value}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Notifications */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <Bell className="w-5 h-5 text-[#dc2350]" />
              <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
            </div>

            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
              <div>
                <p className="text-foreground text-sm font-medium">Global Notifications</p>
                <p className="text-muted-foreground text-xs">Enable or disable all notifications</p>
              </div>
              <button
                onClick={() => saveNotifications(!globalNotifs)}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  globalNotifs ? "bg-[#dc2350]" : "bg-input"
                }`}
                data-testid="toggle-global-notifications"
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    globalNotifs ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {userPlatforms && userPlatforms.length > 0 ? (
              <div className="space-y-3">
                {userPlatforms.map((up) => (
                  <div key={up.id} className="flex items-center justify-between" data-testid={`row-platform-notif-${up.id}`}>
                    <div className="flex items-center gap-3">
                      <PlatformIcon platform={up.platform} size="sm" />
                      <span className="text-sm text-muted-foreground">{up.platform.name}</span>
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded-full ${up.isActive ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {up.isActive ? "Active" : "Inactive"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No platforms added yet.</p>
            )}
          </section>

          {/* Privacy */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <Shield className="w-5 h-5 text-[#dc2350]" />
              <h2 className="text-lg font-semibold text-foreground">Privacy</h2>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                <div className="w-2 h-2 rounded-full bg-[#dc2350] mt-1.5 shrink-0" />
                <p>Your messages are never stored or processed by KoaMessenger. We only display platform web apps.</p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                <div className="w-2 h-2 rounded-full bg-[#dc2350] mt-1.5 shrink-0" />
                <p>Your email address is encrypted and never visible to other users.</p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                <div className="w-2 h-2 rounded-full bg-[#dc2350] mt-1.5 shrink-0" />
                <p>Platforms run directly in your browser — no message content passes through our servers.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

import { useSearch } from "wouter";
import { AppLayout } from "@/components/layout";
import { useListUserPlatforms } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import newAppIconPng from "@assets/Logo_-_Icon_-_KoaMessenger_1779635100578.png";

/**
 * The platform iframes/webviews do NOT live here — they're rendered by
 * <PlatformPanesLayer /> (components/platform-panes.tsx), which is mounted
 * once at the app level so panes survive navigation to Settings, Feedback,
 * Add Platforms, etc. The layer overlays this page's content area whenever a
 * platform is selected; this page only provides the loading state and the
 * welcome screen shown when nothing is selected.
 */
export default function Dashboard() {
  const search = useSearch();
  const activeUpId = Number(new URLSearchParams(search).get("up") ?? "0") || null;

  const { isLoading: userPlatformsLoading } = useListUserPlatforms({
    query: { queryKey: ["/api/user-platforms"] },
  });

  return (
    <AppLayout>
      <div className="h-full w-full flex flex-col bg-background relative">
        {userPlatformsLoading && !activeUpId ? (
          <div className="h-full w-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#dc2350] animate-spin" />
          </div>
        ) : !activeUpId ? (
          <WelcomeScreen />
        ) : null}
      </div>
    </AppLayout>
  );
}

function WelcomeScreen() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-center px-4">
      <img src={newAppIconPng} alt="KoaMessenger" className="w-40 h-40 mb-6 opacity-90 rounded-3xl" />
      <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to KoaMessenger</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Your privacy-first communication hub. Select a platform from the sidebar or add a new one to get started.
      </p>
    </div>
  );
}

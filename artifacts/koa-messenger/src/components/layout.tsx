import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { Plus, Settings, Menu, FileText, ExternalLink, Pencil, LogOut, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import newAppIconPng from "@assets/Logo_-_Icon_-_KoaMessenger_1779635100578.png";
import logoWordsPng from "@assets/Logo_-_Words_-_KoaMessenger_-_Slogan_-_White_1779504664892.png";
import { PlatformIcon } from "./platform-icon";
import {
  useListUserPlatforms,
  useRemoveUserPlatform,
  useUpdateUserPlatform,
  useReorderUserPlatforms,
} from "@workspace/api-client-react";
import { useNotifications } from "@/lib/notifications-context";
import { queryClient } from "@/lib/queryClient";
import { isDesktop } from "@/lib/desktop";
import { useToast } from "@/hooks/use-toast";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [location, setLocation] = useLocation();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const { counts, clearCount } = useNotifications();
  const { toast } = useToast();
  const desktop = isDesktop();

  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const dragIdRef = useRef<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  const { data: userPlatforms, isLoading } = useListUserPlatforms({
    query: { queryKey: ["/api/user-platforms"] },
  });

  const removeMutation = useRemoveUserPlatform();
  const updateMutation = useUpdateUserPlatform();
  const reorderMutation = useReorderUserPlatforms();

  const activePlatforms = (userPlatforms?.filter((p) => p.isActive) || []).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const handleSignOut = () => {
    // Clear all cached query data before signing out so the sidebar
    // platform icons are immediately unmounted rather than lingering
    // from the stale cache after the Clerk session is destroyed.
    queryClient.clear();
    signOut({ redirectUrl: basePath || "/" });
  };

  const handleRemovePlatform = async (upId: number, displayName: string) => {
    const confirmed = window.confirm(`Remove "${displayName}" from your sidebar?`);
    if (!confirmed) return;
    try {
      await removeMutation.mutateAsync({ id: upId });
      queryClient.invalidateQueries({ queryKey: ["/api/user-platforms"] });
      if (location.includes(`up=${upId}`)) {
        setLocation("/dashboard");
      }
    } catch {
      toast({ title: "Couldn't remove platform", variant: "destructive" });
    }
  };

  const handleStartRename = (upId: number, currentName: string) => {
    setRenamingId(upId);
    setRenameValue(currentName);
  };

  const handleSaveRename = async (upId: number) => {
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name) return;
    try {
      await updateMutation.mutateAsync({ id: upId, data: { displayName: name } });
      queryClient.invalidateQueries({ queryKey: ["/api/user-platforms"] });
    } catch {
      toast({ title: "Couldn't rename", variant: "destructive" });
    }
  };

  const isActiveUp = (upId: number) => location.includes(`up=${upId}`);

  const handleDragStart = (upId: number) => {
    dragIdRef.current = upId;
  };

  const handleDragOver = (e: React.DragEvent, upId: number) => {
    e.preventDefault();
    if (dragIdRef.current !== upId) setDragOverId(upId);
  };

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    const sourceId = dragIdRef.current;
    dragIdRef.current = null;
    setDragOverId(null);
    if (!sourceId || sourceId === targetId) return;

    const sourceIdx = activePlatforms.findIndex((p) => p.id === sourceId);
    const targetIdx = activePlatforms.findIndex((p) => p.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const newOrder = [...activePlatforms];
    const [removed] = newOrder.splice(sourceIdx, 1);
    newOrder.splice(targetIdx, 0, removed);

    try {
      await reorderMutation.mutateAsync({ data: { orderedIds: newOrder.map((p) => p.id) } });
      queryClient.invalidateQueries({ queryKey: ["/api/user-platforms"] });
    } catch {
      toast({ title: "Couldn't reorder", variant: "destructive" });
    }
  };

  const handleDragEnd = () => {
    dragIdRef.current = null;
    setDragOverId(null);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Logo — on macOS the traffic-light buttons sit at y≈16–28px
          (trafficLightPosition x:16 y:16 in the desktop main process).
          The title-bar zone is 76px tall with 26px top padding so the 40px logo
          renders at y≈31, clear of the buttons, with a few px of clearance above
          the bottom border. The full zone stays draggable. */}
      <div
        className={`flex items-center justify-center border-b border-sidebar-border shrink-0 ${
          desktop ? "h-[76px] pt-[26px]" : "h-16"
        }`}
        style={desktop ? { WebkitAppRegion: "drag" } as React.CSSProperties : undefined}
      >
        <div style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <Link href="/dashboard">
            <img
              src={newAppIconPng}
              alt="KoaMessenger"
              className="h-10 w-10 cursor-pointer rounded-xl"
            />
          </Link>
        </div>
      </div>

      {/* Platform icons */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col items-center gap-3 hide-scrollbar">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : activePlatforms.length === 0 ? (
          <div className="px-2 text-center text-xs text-muted-foreground">No platforms yet</div>
        ) : (
          activePlatforms.map((up) => {
            const unread = counts[up.id] ?? 0;
            const active = isActiveUp(up.id);
            const displayName = up.displayName ?? up.platform.name;
            const isDragTarget = dragOverId === up.id;

            if (renamingId === up.id) {
              return (
                <div key={up.id} className="w-14 flex flex-col items-center gap-1.5 px-1">
                  <input
                    autoFocus
                    className="w-full bg-card border border-[#dc2350] rounded-lg px-1 py-0.5 text-foreground text-xs text-center outline-none"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveRename(up.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    maxLength={30}
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleSaveRename(up.id)}
                      className="w-5 h-5 rounded flex items-center justify-center bg-[#dc2350] text-white hover:bg-[#e34f73]"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setRenamingId(null)}
                      className="w-5 h-5 rounded flex items-center justify-center bg-muted text-foreground hover:bg-muted-foreground/30"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <ContextMenu key={up.id}>
                <ContextMenuTrigger asChild>
                  <div
                    draggable
                    onDragStart={() => handleDragStart(up.id)}
                    onDragOver={(e) => handleDragOver(e, up.id)}
                    onDrop={(e) => handleDrop(e, up.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      setLocation(`/dashboard?up=${up.id}`);
                      if (active) clearCount(up.id);
                    }}
                    className={`relative group cursor-pointer w-12 h-12 rounded-xl transition-all duration-200 select-none ${
                      isDragTarget
                        ? "scale-110 ring-2 ring-[#dc2350]/60 opacity-100"
                        : active
                          ? "shadow-[0_0_15px_rgba(220,35,80,0.4)] scale-110"
                          : "hover:scale-105 opacity-70 hover:opacity-100"
                    }`}
                    title={displayName}
                  >
                    {active && (
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[#dc2350] rounded-r-md" />
                    )}
                    <PlatformIcon
                      name={up.platform.name}
                      color={up.platform.color}
                      iconUrl={up.platform.iconUrl}
                      className="w-full h-full"
                    />
                    {unread > 0 && !active && (
                      <span className="absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center">
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#dc2350] text-white text-[11px] font-bold flex items-center justify-center leading-none shadow-lg ring-2 ring-sidebar">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      </span>
                    )}
                    {up.displayName && (
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-card border border-border text-foreground text-xs px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        {up.displayName}
                      </div>
                    )}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="bg-card border-border text-foreground min-w-[170px]">
                  <ContextMenuItem
                    onClick={() => handleStartRename(up.id, displayName)}
                    className="hover:bg-input focus:bg-input cursor-pointer flex items-center gap-2"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    Rename
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      window.open(up.platform.url, "_blank", "noopener,noreferrer")
                    }
                    className="hover:bg-input focus:bg-input cursor-pointer flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    Open in browser
                  </ContextMenuItem>
                  <ContextMenuSeparator className="bg-input" />
                  <ContextMenuItem
                    onClick={() => handleRemovePlatform(up.id, displayName)}
                    className="hover:bg-input focus:bg-input cursor-pointer text-red-400 hover:text-red-300 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Remove from sidebar
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })
        )}

        <div className="w-8 h-px bg-muted my-2" />

        <Link href="/add-platforms">
          <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-[#dc2350] hover:bg-[#fff0f3] dark:hover:bg-[#1a0a10] transition-colors cursor-pointer">
            <Plus className="w-6 h-6" />
          </div>
        </Link>
      </div>

      {/* Bottom nav */}
      <div className="p-3 border-t border-sidebar-border flex flex-col items-center gap-3">
        <Link href="/feedback">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer ${location === "/feedback" ? "text-foreground bg-muted" : ""}`}
          >
            <FileText className="w-5 h-5" />
          </div>
        </Link>
        <Link href="/settings">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer ${location === "/settings" ? "text-foreground bg-muted" : ""}`}
          >
            <Settings className="w-5 h-5" />
          </div>
        </Link>

        <Popover>
          <PopoverTrigger asChild>
            <Avatar className="w-10 h-10 cursor-pointer border border-transparent hover:border-[#dc2350] transition-colors">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="text-foreground bg-muted">
                {user?.firstName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="end"
            className="w-52 bg-card border-border text-foreground p-2"
          >
            <div className="flex items-center gap-2 p-2 mb-1">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback className="text-sm text-foreground bg-muted">
                  {user?.firstName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.fullName ?? user?.firstName ?? "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
            <div className="h-px bg-input my-1" />
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-red-400 hover:text-red-300 hover:bg-input transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden selection:bg-[#dc2350] selection:text-white">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-20 flex-col h-full z-20">
        {SidebarContent()}
      </div>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="md:hidden h-16 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-20 p-0 bg-sidebar border-sidebar-border">
                {SidebarContent()}
              </SheetContent>
            </Sheet>
            <img src={logoWordsPng} alt="KoaMessenger" className="h-7 w-auto" />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Avatar className="w-8 h-8 cursor-pointer border border-transparent hover:border-[#dc2350] transition-colors">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback className="text-xs text-foreground bg-muted">
                  {user?.firstName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="end"
              className="w-52 bg-card border-border text-foreground p-2"
            >
              <div className="flex items-center gap-2 p-2 mb-1">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback className="text-sm text-foreground bg-muted">
                    {user?.firstName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.fullName ?? user?.firstName ?? "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              </div>
              <div className="h-px bg-input my-1" />
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-red-400 hover:text-red-300 hover:bg-input transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </PopoverContent>
          </Popover>
        </header>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}

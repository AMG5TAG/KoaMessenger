import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { Plus, Settings, Menu, LogOut, FileText, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logoRoundPng from "@assets/Logo_-_KoaMessenger_1779504607995.png";
import logoWordsPng from "@assets/Logo_-_Words_-_KoaMessenger_-_Slogan_-_White_1779504664892.png";
import { PlatformIcon } from "./platform-icon";
import { useListUserPlatforms } from "@workspace/api-client-react";
import { useDemo } from "@/lib/demo-context";
import { useNotifications } from "@/lib/notifications-context";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isDemo, deactivate } = useDemo();
  const [location, setLocation] = useLocation();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const { counts, clearCount } = useNotifications();

  const { data: userPlatforms, isLoading } = useListUserPlatforms({
    query: { queryKey: ["/api/user-platforms"] }
  });

  const activePlatforms = userPlatforms?.filter(p => p.isActive) || [];

  const handleSignOut = () => {
    if (isDemo) {
      deactivate();
      setLocation("/");
      return;
    }
    signOut({ redirectUrl: basePath || "/" });
  };

  const isActiveUp = (upId: number) => location.includes(`up=${upId}`);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0d0d0d] border-r border-[#1f1f1f]">
      <div className="h-16 flex items-center justify-center border-b border-[#1f1f1f]">
        <Link href="/dashboard">
          <img src={logoRoundPng} alt="KoaMessenger" className="h-10 w-10 cursor-pointer" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4 flex flex-col items-center gap-3 hide-scrollbar">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-12 h-12 rounded-xl bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : activePlatforms.length === 0 ? (
          <div className="px-2 text-center text-xs text-gray-500">
            No platforms yet
          </div>
        ) : (
          activePlatforms.sort((a, b) => a.sortOrder - b.sortOrder).map(up => {
            const unread = counts[up.id] ?? 0;
            const active = isActiveUp(up.id);
            return (
              <Link key={up.id} href={`/dashboard?up=${up.id}`}>
                <div
                  className={`relative group cursor-pointer w-12 h-12 rounded-xl transition-all duration-200 ${
                    active ? 'shadow-[0_0_15px_rgba(220,35,80,0.4)] scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'
                  }`}
                  onClick={() => { if (active) clearCount(up.id); }}
                  title={up.displayName ?? up.platform.name}
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
                  {/* Notification badge */}
                  {unread > 0 && !active && (
                    <span className="absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center">
                      {unread <= 9 ? (
                        /* Small pill for 1–9 — dot with number */
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#dc2350] text-white text-[11px] font-bold flex items-center justify-center leading-none shadow-lg ring-2 ring-[#0d0d0d]">
                          {unread}
                        </span>
                      ) : (
                        /* Larger pill for 10+ */
                        <span className="min-w-[22px] h-5 px-1.5 rounded-full bg-[#dc2350] text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-lg ring-2 ring-[#0d0d0d]">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </span>
                  )}
                  {/* Pulsing dot when platform is loaded but unread count isn't parseable yet */}
                  {unread === 0 && !active && false /* reserved for future heuristic */ && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#dc2350] ring-2 ring-[#0d0d0d] z-10" />
                  )}
                  {/* Display name label on hover for multi-account */}
                  {up.displayName && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {up.displayName}
                    </div>
                  )}
                </div>
              </Link>
            );
          })
        )}

        <div className="w-8 h-px bg-gray-800 my-2" />

        <Link href="/add-platforms">
          <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-gray-400 hover:text-white hover:border-[#dc2350] hover:bg-[#1a0a10] transition-colors cursor-pointer">
            <Plus className="w-6 h-6" />
          </div>
        </Link>
      </div>

      <div className="p-3 border-t border-[#1f1f1f] flex flex-col items-center gap-3">
        {isDemo && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-[#dc2350] uppercase tracking-wider">Demo</span>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-gray-800 w-10 h-10 rounded-xl"
              onClick={handleSignOut}
              title="Exit Demo"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
        <Link href="/feedback">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer ${location === '/feedback' ? 'text-white bg-gray-800' : ''}`}>
            <FileText className="w-5 h-5" />
          </div>
        </Link>
        <Link href="/settings">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer ${location === '/settings' ? 'text-white bg-gray-800' : ''}`}>
            <Settings className="w-5 h-5" />
          </div>
        </Link>
        <Avatar className="w-10 h-10 cursor-pointer border border-transparent hover:border-gray-700 transition-colors">
          <AvatarImage src={isDemo ? undefined : user?.imageUrl} />
          <AvatarFallback className={`text-white ${isDemo ? 'bg-[#dc2350]' : 'bg-gray-800'}`}>
            {isDemo ? 'D' : (user?.firstName?.charAt(0) || 'U')}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden selection:bg-[#dc2350] selection:text-white">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-20 flex-col h-full z-20">
        <SidebarContent />
      </div>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="md:hidden h-16 bg-[#0d0d0d] border-b border-[#1f1f1f] flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-20 p-0 bg-[#0d0d0d] border-[#1f1f1f]">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <img src={logoWordsPng} alt="KoaMessenger" className="h-7 w-auto" />
            {isDemo && (
              <span className="text-[10px] font-bold text-[#dc2350] uppercase tracking-wider">Demo</span>
            )}
          </div>
          <Avatar className="w-8 h-8">
            <AvatarImage src={isDemo ? undefined : user?.imageUrl} />
            <AvatarFallback className={`text-xs text-white ${isDemo ? 'bg-[#dc2350]' : 'bg-gray-800'}`}>
              {isDemo ? 'D' : (user?.firstName?.charAt(0) || 'U')}
            </AvatarFallback>
          </Avatar>
        </header>
        {isDemo && (
          <div className="md:hidden flex items-center justify-center h-7 bg-[#dc2350]/10 border-b border-[#dc2350]/30 text-[#dc2350] text-xs font-medium px-4">
            <PlayCircle className="w-3 h-3 mr-1.5" />
            Demo mode — data will not be saved
          </div>
        )}

        <main className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}

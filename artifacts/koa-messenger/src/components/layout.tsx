import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { LayoutDashboard, Plus, Settings, MessageSquare, Menu, LogOut, Bell, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logoRoundPng from "@assets/Logo_-_KoaMessenger_1779504607995.png";
import logoWordsPng from "@assets/Logo_-_Words_-_KoaMessenger_-_Slogan_-_White_1779504664892.png";
import { PlatformIcon } from "./platform-icon";
import { useListUserPlatforms } from "@workspace/api-client-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [location] = useLocation();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  
  const { data: userPlatforms, isLoading } = useListUserPlatforms({
    query: { queryKey: ["/api/user-platforms"] }
  });

  const activePlatforms = userPlatforms?.filter(p => p.isActive) || [];

  const handleSignOut = () => {
    signOut({ redirectUrl: basePath || "/" });
  };

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
          activePlatforms.sort((a, b) => a.sortOrder - b.sortOrder).map(up => (
            <Link key={up.id} href={`/dashboard?platform=${up.platformId}`}>
              <div className={`relative group cursor-pointer w-12 h-12 rounded-xl transition-all duration-200 ${
                location.includes(`platform=${up.platformId}`) ? 'shadow-[0_0_15px_rgba(220,35,80,0.4)] scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'
              }`}>
                {location.includes(`platform=${up.platformId}`) && (
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[#dc2350] rounded-r-md" />
                )}
                <PlatformIcon 
                  name={up.platform.name} 
                  color={up.platform.color} 
                  iconUrl={up.platform.iconUrl}
                  className="w-full h-full"
                />
              </div>
            </Link>
          ))
        )}

        <div className="w-8 h-px bg-gray-800 my-2" />

        <Link href="/add-platforms">
          <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-gray-400 hover:text-white hover:border-[#dc2350] hover:bg-[#1a0a10] transition-colors cursor-pointer">
            <Plus className="w-6 h-6" />
          </div>
        </Link>
      </div>

      <div className="p-3 border-t border-[#1f1f1f] flex flex-col items-center gap-3">
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
          <AvatarImage src={user?.imageUrl} />
          <AvatarFallback className="bg-gray-800 text-white">
            {user?.firstName?.charAt(0) || 'U'}
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
          </div>
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback className="bg-gray-800">{user?.firstName?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
        </header>

        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}
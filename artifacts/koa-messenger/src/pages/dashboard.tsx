import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout";
import { useListUserPlatforms, useGetPlatform } from "@workspace/api-client-react";
import { Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoRoundPng from "@assets/Logo_-_KoaMessenger_1779504607995.png";

export default function Dashboard() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const platformId = searchParams.get('platform');
  const [iframeLoading, setIframeLoading] = useState(true);

  const { data: userPlatforms, isLoading: userPlatformsLoading } = useListUserPlatforms({
    query: { queryKey: ["/api/user-platforms"] }
  });

  const { data: platform, isLoading: platformLoading } = useGetPlatform(
    Number(platformId),
    { query: { enabled: !!platformId, queryKey: [`/api/platforms/${platformId}`] } }
  );

  useEffect(() => {
    if (platformId) {
      setIframeLoading(true);
    }
  }, [platformId]);

  if (!platformId) {
    return (
      <AppLayout>
        <div className="h-full w-full flex flex-col items-center justify-center bg-[#0a0a0a] text-center px-4">
          <img src={logoRoundPng} alt="KoaMessenger" className="w-40 h-40 mb-6 opacity-90" />
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to KoaMessenger</h2>
          <p className="text-gray-400 max-w-md mb-8">
            Your privacy-first communication hub. Select a platform from the sidebar or add a new one to get started.
          </p>
        </div>
      </AppLayout>
    );
  }

  const isLoading = platformLoading || userPlatformsLoading;

  return (
    <AppLayout>
      <div className="h-full w-full flex flex-col bg-[#0a0a0a]">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#dc2350] animate-spin" />
          </div>
        ) : platform ? (
          <div className="flex-1 relative">
            {iframeLoading && (
              <div className="absolute inset-0 z-10 bg-[#0a0a0a] flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#dc2350] animate-spin mb-4" />
                <p className="text-gray-400">Loading {platform.name} securely...</p>
              </div>
            )}
            
            {/* Top Bar for current platform */}
            <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/80 to-transparent z-20 flex items-center justify-end px-4 pointer-events-none">
              <Button 
                variant="outline" 
                size="sm" 
                className="pointer-events-auto bg-black/50 border-gray-700 text-gray-300 hover:text-white hover:bg-black/80 backdrop-blur-sm"
                onClick={() => window.open(platform.url, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in new tab
              </Button>
            </div>

            <iframe
              src={platform.url}
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
              onLoad={() => setIframeLoading(false)}
            />
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <p className="text-gray-400">Platform not found</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
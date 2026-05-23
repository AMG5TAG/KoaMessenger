import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useListPlatforms, useListUserPlatforms, useAddUserPlatform, useRemoveUserPlatform } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Search, Plus, Check, Loader2, Info, ExternalLink } from "lucide-react";
import { PlatformIcon } from "@/components/platform-icon";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function AddPlatforms() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data: platforms, isLoading: platformsLoading } = useListPlatforms({
    query: { queryKey: ["/api/platforms"] }
  });

  const { data: userPlatforms, isLoading: userPlatformsLoading } = useListUserPlatforms({
    query: { queryKey: ["/api/user-platforms"] }
  });

  const addPlatform = useAddUserPlatform();
  const removePlatform = useRemoveUserPlatform();

  const isLoading = platformsLoading || userPlatformsLoading;

  const filteredPlatforms = platforms?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const isAdded = (platformId: number) => {
    return userPlatforms?.some(up => up.platformId === platformId && up.isActive);
  };

  const handleTogglePlatform = (platformId: number) => {
    const existing = userPlatforms?.find(up => up.platformId === platformId);
    
    if (existing && existing.isActive) {
      removePlatform.mutate({ id: existing.id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/user-platforms"] });
          toast({ title: "Platform removed", description: "Removed from your sidebar." });
        }
      });
    } else {
      addPlatform.mutate({ data: { platformId } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/user-platforms"] });
          toast({ title: "Platform added", description: "Added to your sidebar." });
        }
      });
    }
  };

  // Group by category
  const categories = Array.from(new Set(filteredPlatforms?.map(p => p.category) || []));

  return (
    <AppLayout>
      <div className="h-full flex flex-col bg-[#0a0a0a] overflow-y-auto hide-scrollbar p-6 lg:p-10">
        <div className="max-w-5xl mx-auto w-full">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-3">Add Platforms</h1>
            <p className="text-gray-400 text-lg">Connect your favorite messaging apps to your unified workspace.</p>
          </div>

          <div className="mb-8 bg-[#1a0f14] border border-[#dc2350]/30 rounded-xl p-4 flex gap-3" data-testid="iframe-disclaimer">
            <Info className="w-5 h-5 text-[#dc2350] shrink-0 mt-0.5" />
            <div className="text-sm text-gray-300 leading-relaxed">
              <strong className="text-white">Heads up:</strong> Some platforms (WhatsApp, Slack, Discord, Gmail, Facebook, and others) block embedding inside other websites for security. Those will open in a new browser tab instead — look for the <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 text-[10px] font-medium align-middle"><ExternalLink className="w-2.5 h-2.5" />New tab</span> badge. Your login always stays with the platform, never with us.
            </div>
          </div>

          <div className="relative mb-12 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <Input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for WhatsApp, Discord, Slack..." 
              className="w-full bg-[#141414] border-gray-800 text-white pl-12 h-14 rounded-xl text-lg focus-visible:ring-[#dc2350]"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#dc2350] animate-spin" />
            </div>
          ) : filteredPlatforms?.length === 0 ? (
            <div className="text-center py-20 bg-[#141414] rounded-2xl border border-gray-800">
              <p className="text-gray-400 text-lg">No platforms found matching "{search}"</p>
              <Button variant="link" className="text-[#dc2350] mt-2" onClick={() => setSearch('')}>Clear search</Button>
            </div>
          ) : (
            <div className="space-y-12">
              {categories.map(category => {
                const categoryPlatforms = filteredPlatforms?.filter(p => p.category === category) || [];
                if (categoryPlatforms.length === 0) return null;

                return (
                  <div key={category}>
                    <h2 className="text-xl font-semibold text-white mb-6 capitalize">{category}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {categoryPlatforms.map(platform => {
                        const added = isAdded(platform.id);
                        const isMutating = addPlatform.isPending || removePlatform.isPending;

                        return (
                          <div 
                            key={platform.id} 
                            className="bg-[#141414] border border-gray-800 hover:border-gray-600 rounded-2xl p-5 flex items-start gap-4 transition-all hover:-translate-y-1 hover:shadow-lg group"
                          >
                            <PlatformIcon 
                              name={platform.name} 
                              color={platform.color} 
                              iconUrl={platform.iconUrl} 
                              className="w-14 h-14 shrink-0" 
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-white text-lg truncate">{platform.name}</h3>
                                {platform.embedsInIframe === false && (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 text-[10px] font-medium shrink-0"
                                    title="This platform blocks embedding — it will open in a new browser tab."
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    New tab
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 line-clamp-2 mt-1">{platform.description}</p>
                            </div>
                            <Button
                              size="icon"
                              variant={added ? "secondary" : "default"}
                              className={`shrink-0 rounded-xl transition-all ${
                                added 
                                  ? 'bg-[#1a2e1e] text-[#4ade80] hover:bg-red-950 hover:text-red-400' 
                                  : 'bg-[#1f1f1f] text-white hover:bg-[#dc2350]'
                              }`}
                              onClick={() => handleTogglePlatform(platform.id)}
                              disabled={isMutating}
                            >
                              {added ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
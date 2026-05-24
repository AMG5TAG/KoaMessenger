import { useState } from "react";
import { AppLayout } from "@/components/layout";
import {
  useListFeedback,
  useCreateFeedback,
  useVoteFeedback,
  getListFeedbackQueryKey,
} from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ThumbsUp, Plus, MessageSquare, Lightbulb, Loader2, ChevronUp } from "lucide-react";
import { useUser } from "@clerk/react";

type FeedbackType = "feature_request" | "platform_suggestion";

export default function Feedback() {
  const { user } = useUser();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<FeedbackType>("feature_request");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platformName, setPlatformName] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "feature_request" | "platform_suggestion">("all");

  const { data: feedbackItems, isLoading } = useListFeedback({
    query: { queryKey: getListFeedbackQueryKey() },
  });

  const createFeedback = useCreateFeedback();
  const voteFeedback = useVoteFeedback();

  const filtered = feedbackItems?.filter((f) =>
    activeTab === "all" ? true : f.type === activeTab
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    createFeedback.mutate(
      {
        data: {
          type,
          title: title.trim(),
          description: description.trim(),
          platformName: platformName.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Submitted", description: "Thank you for your feedback!" });
          setShowForm(false);
          setTitle("");
          setDescription("");
          setPlatformName("");
          queryClient.invalidateQueries({ queryKey: getListFeedbackQueryKey() });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to submit feedback.", variant: "destructive" });
        },
      }
    );
  };

  const handleVote = (id: number) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to vote.", variant: "destructive" });
      return;
    }
    voteFeedback.mutate(
      { id },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListFeedbackQueryKey() }),
      }
    );
  };

  const statusColors: Record<string, string> = {
    open: "bg-blue-500/20 text-blue-400",
    under_review: "bg-yellow-500/20 text-yellow-400",
    planned: "bg-purple-500/20 text-purple-400",
    completed: "bg-green-500/20 text-green-400",
    declined: "bg-red-500/20 text-red-400",
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Feedback</h1>
              <p className="text-gray-400 text-sm mt-1">
                Help shape KoaMessenger — request features or suggest new platforms.
              </p>
            </div>
            {user && (
              <Button
                onClick={() => setShowForm(!showForm)}
                className="bg-[#dc2350] hover:bg-[#e34f73] text-white gap-2"
                data-testid="button-new-feedback"
              >
                <Plus className="w-4 h-4" />
                Submit Feedback
              </Button>
            )}
          </div>

          {/* Form */}
          {showForm && user && (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">New Feedback</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type selector */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setType("feature_request")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      type === "feature_request"
                        ? "bg-[#dc2350] border-[#dc2350] text-white"
                        : "bg-transparent border-[#2a2a2a] text-gray-400 hover:border-[#dc2350]"
                    }`}
                    data-testid="button-type-feature"
                  >
                    <Lightbulb className="w-4 h-4" />
                    Feature Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("platform_suggestion")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      type === "platform_suggestion"
                        ? "bg-[#dc2350] border-[#dc2350] text-white"
                        : "bg-transparent border-[#2a2a2a] text-gray-400 hover:border-[#dc2350]"
                    }`}
                    data-testid="button-type-platform"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Platform Suggestion
                  </button>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief title for your feedback"
                    className="bg-[#1a1a1a] border-[#2a2a2a] text-foreground"
                    data-testid="input-feedback-title"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your idea in detail..."
                    className="bg-[#1a1a1a] border-[#2a2a2a] text-foreground resize-none"
                    rows={4}
                    data-testid="input-feedback-description"
                  />
                </div>

                {type === "platform_suggestion" && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Platform Name</label>
                    <Input
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                      placeholder="e.g. BeReal, Clubhouse"
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-foreground"
                      data-testid="input-platform-name"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={createFeedback.isPending || !title.trim() || !description.trim()}
                    className="bg-[#dc2350] hover:bg-[#e34f73] text-white"
                    data-testid="button-submit-feedback"
                  >
                    {createFeedback.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="border-[#2a2a2a] text-gray-400"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-[#111] rounded-lg p-1 mb-6 border border-[#2a2a2a]">
            {(["all", "feature_request", "platform_suggestion"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === tab
                    ? "bg-[#dc2350] text-white"
                    : "text-gray-400 hover:text-foreground"
                }`}
                data-testid={`tab-feedback-${tab}`}
              >
                {tab === "all" ? "All" : tab === "feature_request" ? "Features" : "Platforms"}
              </button>
            ))}
          </div>

          {/* Items */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-[#dc2350] animate-spin" />
            </div>
          ) : filtered?.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No feedback yet. Be the first to submit!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered?.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 flex gap-4 hover:border-[#3a3a3a] transition-all"
                  data-testid={`card-feedback-${item.id}`}
                >
                  {/* Vote */}
                  <button
                    onClick={() => handleVote(item.id)}
                    disabled={voteFeedback.isPending}
                    className={`flex flex-col items-center gap-1 min-w-[48px] rounded-lg p-2 border transition-all ${
                      item.hasVoted
                        ? "bg-[#dc2350]/20 border-[#dc2350] text-[#dc2350]"
                        : "border-[#2a2a2a] text-gray-400 hover:border-[#dc2350] hover:text-[#dc2350]"
                    }`}
                    data-testid={`button-vote-${item.id}`}
                  >
                    <ChevronUp className="w-4 h-4" />
                    <span className="text-xs font-bold">{item.votes}</span>
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-foreground text-sm leading-snug">{item.title}</h3>
                      <div className="flex gap-2 shrink-0">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            item.type === "feature_request"
                              ? "bg-purple-500/20 text-purple-400"
                              : "bg-[#dc2350]/20 text-[#dc2350]"
                          }`}
                        >
                          {item.type === "feature_request" ? "Feature" : "Platform"}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[item.status] ?? "bg-gray-500/20 text-gray-400"}`}>
                          {item.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-2">{item.description}</p>
                    {item.platformName && (
                      <p className="text-[#dc2350] text-xs mt-1">Platform: {item.platformName}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

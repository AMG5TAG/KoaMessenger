import { useEffect, useRef } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { DemoProvider, useDemo } from "@/lib/demo-context";
import { NotificationProvider } from "@/lib/notifications-context";
import { ArrowLeft, Play } from "lucide-react";

import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import AddPlatforms from "@/pages/add-platforms";
import Feedback from "@/pages/feedback";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo-round.png`,
  },
  variables: {
    colorPrimary: "hsl(344, 76%, 50%)",
    colorForeground: "hsl(0, 0%, 98%)",
    colorMutedForeground: "hsl(0, 0%, 63%)",
    colorDanger: "hsl(0, 84%, 60%)",
    colorBackground: "hsl(0, 0%, 9%)",
    colorInput: "hsl(0, 0%, 15%)",
    colorInputForeground: "hsl(0, 0%, 98%)",
    colorNeutral: "hsl(0, 0%, 20%)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#171717] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#2a2a2a]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    logoBox: "!w-24 !h-24 !mb-2",
    logoImage: "!w-24 !h-24 object-contain",
    headerTitle: "text-white font-bold",
    headerSubtitle: "text-gray-400",
    socialButtonsBlockButtonText: "text-white",
    formFieldLabel: "text-gray-300",
    footerActionLink: "text-[#dc2350] hover:text-[#e34f73]",
    footerActionText: "text-gray-400",
    dividerText: "text-gray-500",
    identityPreviewEditButton: "text-[#dc2350]",
    formFieldSuccessText: "text-green-400",
    alertText: "text-red-400",
  },
};

function SignInPage() {
  const [, setLocation] = useLocation();
  const { activate } = useDemo();

  const handleTryDemo = async () => {
    await activate();
    setLocation("/dashboard");
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#1a0a10] px-4">
      <Button
        variant="ghost"
        className="mb-4 text-gray-400 hover:text-white hover:bg-transparent"
        onClick={() => setLocation("/")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to site
      </Button>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      <Button
        variant="outline"
        className="mt-4 rounded-full px-6 h-11 border-[#dc2350]/40 text-[#dc2350] hover:bg-[#1a0a10] hover:text-[#e34f73] hover:border-[#dc2350]"
        onClick={handleTryDemo}
      >
        <Play className="mr-2 w-4 h-4" /> Try Demo
      </Button>
    </div>
  );
}

function SignUpPage() {
  const [, setLocation] = useLocation();
  const { activate } = useDemo();

  const handleTryDemo = async () => {
    await activate();
    setLocation("/dashboard");
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#1a0a10] px-4">
      <Button
        variant="ghost"
        className="mb-4 text-gray-400 hover:text-white hover:bg-transparent"
        onClick={() => setLocation("/")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to site
      </Button>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      <Button
        variant="outline"
        className="mt-4 rounded-full px-6 h-11 border-[#dc2350]/40 text-[#dc2350] hover:bg-[#1a0a10] hover:text-[#e34f73] hover:border-[#dc2350]"
        onClick={handleTryDemo}
      >
        <Play className="mr-2 w-4 h-4" /> Try Demo
      </Button>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  const { isDemo } = useDemo();
  if (isDemo) {
    return <Redirect to="/dashboard" />;
  }
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useUser();
  const { isDemo } = useDemo();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isSignedIn && !isDemo) {
      setLocation("/");
    }
  }, [isSignedIn, isDemo, setLocation]);

  if (!isSignedIn && !isDemo) return null;
  return <>{children}</>;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />

      {/* Protected Routes */}
      <Route path="/dashboard">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/add-platforms">
        <ProtectedRoute><AddPlatforms /></ProtectedRoute>
      </Route>
      <Route path="/feedback">
        <ProtectedRoute><Feedback /></ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute><Settings /></ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to access your account",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Get started today",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryClientCacheInvalidator />
      <AppRouter />
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <NotificationProvider>
            <DemoProvider>
              <ClerkProviderWithRoutes />
            </DemoProvider>
            <Toaster />
          </NotificationProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
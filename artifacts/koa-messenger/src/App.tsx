import { useEffect, useRef } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";

import { Toaster } from "@/components/ui/toaster";
import { PlatformPanesLayer } from "@/components/platform-panes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { NotificationProvider } from "@/lib/notifications-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ArrowLeft } from "lucide-react";

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
    logoImageUrl: `${window.location.origin}${basePath}/logo-badge.png`,
  },
  // This app defines theme tokens as raw HSL components ("0 0% 7%"), so the
  // shadcn preset's bare var(--card) references don't resolve to colors here.
  // Wrap them in hsl() — they then follow light/dark mode automatically.
  variables: {
    colorPrimary: "hsl(var(--primary))",
    colorForeground: "hsl(var(--card-foreground))",
    colorMutedForeground: "hsl(var(--muted-foreground))",
    colorDanger: "hsl(var(--destructive))",
    colorBackground: "hsl(var(--card))",
    colorInput: "hsl(var(--input))",
    colorInputForeground: "hsl(var(--card-foreground))",
    colorNeutral: "hsl(var(--foreground))",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card rounded-2xl w-[440px] max-w-full overflow-hidden border border-card-border",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    logoBox: "!w-40 !h-40 !mb-4 mx-auto",
    logoImage: "!w-40 !h-40 object-contain",
    headerTitle: "text-foreground font-bold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground",
    formFieldLabel: "text-muted-foreground",
    footerActionLink: "text-[#dc2350] hover:text-[#e34f73]",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-[#dc2350]",
    formFieldSuccessText: "text-green-400",
    alertText: "text-red-400",
  },
};

function SignInPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#fff0f3] dark:bg-[#1a0a10] px-4">
      <Button
        variant="ghost"
        className="mb-4 text-muted-foreground hover:text-foreground hover:bg-transparent"
        onClick={() => setLocation("/")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to site
      </Button>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#fff0f3] dark:bg-[#1a0a10] px-4">
      <Button
        variant="ghost"
        className="mb-4 text-muted-foreground hover:text-foreground hover:bg-transparent"
        onClick={() => setLocation("/")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to site
      </Button>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
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
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isSignedIn) {
      setLocation("/");
    }
  }, [isSignedIn, setLocation]);

  if (!isSignedIn) return null;
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
      {/* Persistent platform iframes/webviews — mounted outside the router so
          they survive page navigation instead of reloading on every visit. */}
      <PlatformPanesLayer />
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <NotificationProvider>
            <ThemeProvider>
              <ClerkProviderWithRoutes />
              <Toaster />
            </ThemeProvider>
          </NotificationProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
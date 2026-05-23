import { Link } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { Shield, Lock, Layers, Zap, MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoWordsPng from "@assets/Logo_-_Words_-_KoaMessenger_-_Slogan_-_White_1779504664892.png";

export default function Home() {
  const { user } = useUser();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden selection:bg-[#dc2350] selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2">
          <img src={logoWordsPng} alt="KoaMessenger" className="h-10 w-auto" />
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link href="/sign-up">
            <Button className="bg-[#dc2350] hover:bg-[#e34f73] text-white rounded-full px-6 transition-all duration-300 shadow-[0_0_15px_rgba(220,35,80,0.3)] hover:shadow-[0_0_25px_rgba(220,35,80,0.5)]">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a0a10] border border-[#dc2350]/30 text-[#dc2350] text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Shield className="w-4 h-4" />
          <span>Privacy-first messaging hub</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl leading-tight animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
          All your chats.<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#dc2350] to-[#ff4d79]">One beautiful place.</span>
        </h1>
        
        <p className="text-xl text-gray-400 mb-10 max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
          KoaMessenger brings WhatsApp, Discord, Telegram, and more into a single, secure command center. Your data never leaves your browser.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">
          <Link href="/sign-up">
            <Button size="lg" className="bg-[#dc2350] hover:bg-[#e34f73] text-white rounded-full px-8 h-14 text-lg w-full sm:w-auto">
              Start Messaging <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="rounded-full px-8 h-14 text-lg border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white w-full sm:w-auto">
            See how it works
          </Button>
        </div>

        {/* Abstract App Preview */}
        <div className="mt-20 w-full max-w-5xl h-[60vh] md:h-[70vh] rounded-2xl border border-gray-800 bg-[#111] overflow-hidden shadow-2xl relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-700 fill-mode-both">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent z-10" />
          <div className="flex h-full">
            <div className="w-20 border-r border-gray-800 bg-[#0d0d0d] flex flex-col items-center py-4 gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#dc2350] flex items-center justify-center shadow-[0_0_15px_rgba(220,35,80,0.5)]">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#25D366] opacity-50" />
              <div className="w-10 h-10 rounded-xl bg-[#5865F2] opacity-50" />
              <div className="w-10 h-10 rounded-xl bg-[#0088cc] opacity-50" />
            </div>
            <div className="flex-1 p-8 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#dc2350] rounded-full blur-[100px] opacity-20" />
              <div className="flex flex-col gap-4 max-w-2xl mx-auto mt-10">
                <div className="h-16 w-3/4 bg-gray-800 rounded-xl animate-pulse" />
                <div className="h-24 w-full bg-gray-800 rounded-xl animate-pulse delay-75" />
                <div className="h-16 w-5/6 bg-gray-800 rounded-xl animate-pulse delay-150" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-[#0f0f0f] border-t border-[#1a1a1a]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Built for privacy purists</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">We designed KoaMessenger from the ground up to respect your data. No tracking, no reading messages.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-[#141414] border border-[#1f1f1f] hover:border-[#dc2350]/50 transition-colors">
              <Lock className="w-10 h-10 text-[#dc2350] mb-6" />
              <h3 className="text-xl font-bold mb-3">End-to-end Encrypted</h3>
              <p className="text-gray-400">We simply proxy the web apps in secure iframes. Your connections to platforms remain end-to-end encrypted exactly as they normally would.</p>
            </div>
            <div className="p-8 rounded-2xl bg-[#141414] border border-[#1f1f1f] hover:border-[#dc2350]/50 transition-colors">
              <Shield className="w-10 h-10 text-[#dc2350] mb-6" />
              <h3 className="text-xl font-bold mb-3">Zero Message Storage</h3>
              <p className="text-gray-400">We never see your messages. Your data never leaves your browser. KoaMessenger is just a beautifully crafted window to your existing accounts.</p>
            </div>
            <div className="p-8 rounded-2xl bg-[#141414] border border-[#1f1f1f] hover:border-[#dc2350]/50 transition-colors">
              <Layers className="w-10 h-10 text-[#dc2350] mb-6" />
              <h3 className="text-xl font-bold mb-3">All in One Place</h3>
              <p className="text-gray-400">Stop tab-switching. Organize WhatsApp, Discord, Slack, and dozens of other platforms in a single, focused workspace.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[#1a1a1a] text-center text-gray-500">
        <p>© {new Date().getFullYear()} KoaMessenger. All rights reserved.</p>
      </footer>
    </div>
  );
}
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { Shield, Lock, Layers, Zap, MessageSquare, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/lib/demo-context";
import logoWordsPng from "@assets/Logo_-_Words_-_KoaMessenger_-_Slogan_-_White_1779504664892.png";

export default function Home() {
  const { user } = useUser();
  const { activate } = useDemo();
  const [, setLocation] = useLocation();
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
          <Button
            size="lg"
            variant="outline"
            className="rounded-full px-8 h-14 text-lg border-[#dc2350]/40 text-[#dc2350] hover:bg-[#1a0a10] hover:text-[#e34f73] hover:border-[#dc2350] w-full sm:w-auto"
            onClick={async () => {
              await activate();
              setLocation("/dashboard");
            }}
          >
            <Play className="mr-2 w-5 h-5" /> Try Demo
          </Button>
        </div>

        {/* App Preview Mockup */}
        <div className="mt-20 w-full max-w-5xl rounded-2xl border border-gray-800 bg-[#111] overflow-hidden shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent z-10 pointer-events-none" />
          {/* Window chrome */}
          <div className="h-9 bg-[#0d0d0d] border-b border-gray-800 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            <div className="mx-auto text-xs text-gray-600 font-mono">KoaMessenger — Dashboard</div>
          </div>
          <div className="flex" style={{ height: '420px' }}>
            {/* Sidebar */}
            <div className="w-16 border-r border-gray-800 bg-[#0d0d0d] flex flex-col items-center py-3 gap-3 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-[#dc2350] flex items-center justify-center shadow-[0_0_12px_rgba(220,35,80,0.5)]">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div className="w-1 h-0 opacity-0" />
              {/* Platform dots */}
              {[
                { bg: '#25D366' }, // WhatsApp
                { bg: '#0088cc' }, // Telegram
                { bg: '#0866FF' }, // Messenger
                { bg: '#5865F2' }, // Discord
                { bg: '#4A154B' }, // Slack
              ].map((p, i) => (
                <div key={i} className={`w-9 h-9 rounded-xl flex items-center justify-center ${i === 0 ? 'ring-2 ring-[#dc2350] ring-offset-1 ring-offset-[#0d0d0d]' : 'opacity-60'}`} style={{ backgroundColor: p.bg }}>
                  <div className="w-4 h-4 rounded bg-white/20" />
                </div>
              ))}
              <div className="mt-auto w-7 h-7 rounded-lg bg-gray-800 opacity-60" />
              <div className="w-7 h-7 rounded-lg bg-gray-800 opacity-60" />
              <div className="w-7 h-7 rounded-full bg-[#dc2350]/80" />
            </div>

            {/* Main content — mock chat window */}
            <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
              {/* Top bar */}
              <div className="h-10 bg-[#0d0d0d] border-b border-gray-800 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#25D366]" />
                  <div className="h-3 w-24 bg-gray-700 rounded-full" />
                </div>
                <div className="h-3 w-20 bg-gray-800 rounded-full" />
              </div>

              {/* Chat messages mock */}
              <div className="flex-1 p-4 space-y-4 overflow-hidden">
                {/* Received message */}
                <div className="flex items-end gap-2 max-w-xs">
                  <div className="w-6 h-6 rounded-full bg-[#25D366] shrink-0" />
                  <div className="space-y-1">
                    <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl rounded-bl-sm px-3 py-2">
                      <div className="h-2.5 w-40 bg-gray-600 rounded-full mb-1.5" />
                      <div className="h-2.5 w-28 bg-gray-700 rounded-full" />
                    </div>
                    <div className="h-2 w-12 bg-gray-800 rounded-full ml-1" />
                  </div>
                </div>

                {/* Sent message */}
                <div className="flex items-end gap-2 max-w-xs ml-auto flex-row-reverse">
                  <div className="w-6 h-6 rounded-full bg-[#dc2350] shrink-0" />
                  <div className="space-y-1 items-end flex flex-col">
                    <div className="bg-[#dc2350]/20 border border-[#dc2350]/30 rounded-2xl rounded-br-sm px-3 py-2">
                      <div className="h-2.5 w-32 bg-[#dc2350]/40 rounded-full mb-1.5" />
                      <div className="h-2.5 w-20 bg-[#dc2350]/30 rounded-full" />
                    </div>
                    <div className="h-2 w-10 bg-gray-800 rounded-full mr-1" />
                  </div>
                </div>

                {/* Received message 2 */}
                <div className="flex items-end gap-2 max-w-sm">
                  <div className="w-6 h-6 rounded-full bg-[#25D366] shrink-0" />
                  <div className="space-y-1">
                    <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl rounded-bl-sm px-3 py-2">
                      <div className="h-2.5 w-52 bg-gray-600 rounded-full mb-1.5" />
                      <div className="h-2.5 w-36 bg-gray-700 rounded-full mb-1.5" />
                      <div className="h-2.5 w-44 bg-gray-700 rounded-full" />
                    </div>
                    <div className="h-2 w-12 bg-gray-800 rounded-full ml-1" />
                  </div>
                </div>

                {/* Sent message 2 */}
                <div className="flex items-end gap-2 max-w-xs ml-auto flex-row-reverse">
                  <div className="w-6 h-6 rounded-full bg-[#dc2350] shrink-0" />
                  <div className="space-y-1 items-end flex flex-col">
                    <div className="bg-[#dc2350]/20 border border-[#dc2350]/30 rounded-2xl rounded-br-sm px-3 py-2">
                      <div className="h-2.5 w-48 bg-[#dc2350]/40 rounded-full" />
                    </div>
                    <div className="flex items-center gap-1 mr-1">
                      <div className="h-2 w-8 bg-gray-800 rounded-full" />
                      <div className="w-2 h-2 rounded-full bg-[#dc2350]/50" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div className="h-12 border-t border-gray-800 bg-[#0d0d0d] flex items-center gap-3 px-4">
                <div className="flex-1 h-7 bg-[#1a1a1a] rounded-full border border-gray-800" />
                <div className="w-7 h-7 rounded-full bg-[#dc2350] flex items-center justify-center shadow-[0_0_10px_rgba(220,35,80,0.4)]">
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </div>
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
        <p className="mb-2">© {new Date().getFullYear()} KoaMessenger. All rights reserved.</p>
        <p className="text-sm">
          Proudly Australian. <span aria-label="Australian flag">🇦🇺</span> Designed and Hosted by{' '}
          <a href="https://koapos.com.au" target="_blank" rel="noopener noreferrer" className="text-[#dc2350] hover:text-[#e34f73] underline underline-offset-2 transition-colors">
            KoaSOFT – Web Design, Software and App Development
          </a>
        </p>
      </footer>
    </div>
  );
}
import { useState } from "react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { Shield, Lock, Layers, Zap, ArrowRight, ChevronLeft, ChevronRight, X, Monitor, Smartphone, AppWindow } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoWordsPng from "@assets/Logo_-_Words_-_KoaMessenger_-_Slogan_-_White_1779504664892.png";

const SCREENSHOTS = [
  {
    src: `${import.meta.env.BASE_URL}screenshots/dashboard-whatsapp.png`,
    title: "Dashboard — WhatsApp",
    desc: "Your favorite messaging apps, all in one sidebar. Switch instantly between platforms without losing your place.",
  },
  {
    src: `${import.meta.env.BASE_URL}screenshots/dashboard-telegram.png`,
    title: "Dashboard — Telegram",
    desc: "Multi-tab support lets you run multiple accounts or conversations per platform, each with isolated sessions.",
  },
  {
    src: `${import.meta.env.BASE_URL}screenshots/add-platforms.png`,
    title: "Browse 65+ Platforms",
    desc: "Search and add any messaging service you use — from WhatsApp to Mastodon to Jitsi — all in a few clicks.",
  },
];

function ScreenshotGallery() {
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <div className="mt-16 w-full max-w-6xl mx-auto">
      {/* Desktop: 3-up grid */}
      <div className="hidden md:grid grid-cols-3 gap-5">
        {SCREENSHOTS.map((s, i) => (
          <button
            key={i}
            onClick={() => setLightbox(i)}
            className="group relative rounded-xl border border-[#1f1f1f] bg-[#111] overflow-hidden hover:border-[#dc2350]/40 transition-all text-left"
          >
            <div className="aspect-video overflow-hidden">
              <img
                src={s.src}
                alt={s.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
            <div className="p-4">
              <h4 className="text-sm font-semibold text-white mb-1">{s.title}</h4>
              <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="w-12 h-12 rounded-full bg-[#dc2350]/90 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-white" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Mobile: swipeable carousel */}
      <div className="md:hidden">
        <MobileCarousel screenshots={SCREENSHOTS} onOpen={(i) => setLightbox(i)} />
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="w-5 h-5" />
          </button>
          {lightbox > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1); }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {lightbox < SCREENSHOTS.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1); }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
          <div
            className="max-w-5xl w-full rounded-xl overflow-hidden border border-gray-800 bg-[#111]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={SCREENSHOTS[lightbox].src}
              alt={SCREENSHOTS[lightbox].title}
              className="w-full h-auto"
            />
            <div className="p-4 border-t border-gray-800">
              <h4 className="text-sm font-semibold text-white">{SCREENSHOTS[lightbox].title}</h4>
              <p className="text-xs text-gray-400 mt-1">{SCREENSHOTS[lightbox].desc}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileCarousel({ screenshots, onOpen }: {
  screenshots: typeof SCREENSHOTS;
  onOpen: (i: number) => void;
}) {
  const [idx, setIdx] = useState(0);

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#111]">
        <div
          className="flex transition-transform duration-300"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {screenshots.map((s, i) => (
            <button key={i} className="min-w-full text-left" onClick={() => onOpen(i)}>
              <div className="aspect-video overflow-hidden">
                <img src={s.src} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-4">
                <h4 className="text-sm font-semibold text-white mb-1">{s.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      {/* Dots */}
      <div className="flex justify-center gap-2 mt-3">
        {screenshots.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-[#dc2350]' : 'bg-gray-700'}`}
          />
        ))}
      </div>
    </div>
  );
}

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
          <Link href="/sign-up">
            <Button className="bg-[#dc2350] hover:bg-[#e34f73] text-white rounded-full px-6 transition-all duration-300 shadow-[0_0_15px_rgba(220,35,80,0.3)] hover:shadow-[0_0_25px_rgba(220,35,80,0.5)]">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl leading-tight animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
          All your chats.<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#dc2350] to-[#ff4d79]">One beautiful place.</span>
        </h1>

        <p className="text-xl text-gray-400 mb-10 max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
          KoaMessenger brings WhatsApp, Discord, Telegram, and 65+ more into a single, secure command center. Your data never leaves your browser.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">
          <Link href={user ? "/dashboard" : "/sign-up"}>
            <Button size="lg" className="bg-[#dc2350] hover:bg-[#e34f73] text-white rounded-full px-8 h-14 text-lg w-full sm:w-auto">
              {user ? "Open Dashboard" : "Start Messaging"} <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          {user && (
            <Link href="/add-platforms">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 h-14 text-lg border-[#dc2350]/40 text-[#dc2350] hover:bg-[#1a0a10] hover:text-[#e34f73] hover:border-[#dc2350] w-full sm:w-auto"
              >
                Add Platforms
              </Button>
            </Link>
          )}
        </div>

        {/* Screenshot Gallery */}
        <ScreenshotGallery />
      </section>

      {/* Supported Platforms Marquee */}
      <section className="py-12 border-y border-[#1a1a1a] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-8 text-center">
          <p className="text-sm text-gray-500 uppercase tracking-wider">Supports 65+ platforms</p>
        </div>
        <div className="flex animate-marquee whitespace-nowrap">
          {[
            "WhatsApp", "Telegram", "Discord", "Slack", "Messenger", "Signal",
            "Instagram", "X / Twitter", "LinkedIn", "Zoom", "Teams", "Skype",
            "WeChat", "LINE", "Viber", "Snapchat", "TikTok", "Mastodon",
            "Element", "Jitsi", "Gmail", "Outlook", "Zoom", "Telegram",
          ].map((name, i) => (
            <span key={i} className="mx-6 text-gray-600 text-sm font-medium">{name}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-[#dc2350]">Built for privacy purists</h2>
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

      {/* Cross-Platform */}
      <section className="py-20 px-6 bg-[#0a0a0a] border-t border-[#1a1a1a]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">Use it everywhere</h2>
            <p className="text-gray-400 text-lg">
              KoaMessenger works in your browser as a progressive web app, and as a native desktop app on macOS with full notification support and per-tab session isolation.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#141414] border border-[#1f1f1f]">
                <Monitor className="w-5 h-5 text-[#dc2350]" />
                <span className="text-sm text-gray-300">Web + PWA</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#141414] border border-[#1f1f1f]">
                <Smartphone className="w-5 h-5 text-[#dc2350]" />
                <span className="text-sm text-gray-300">Mobile Optimized</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#141414] border border-[#1f1f1f]">
                <AppWindow className="w-5 h-5 text-[#dc2350]" />
                <span className="text-sm text-gray-300">macOS Desktop</span>
              </div>
            </div>
          </div>
          <div className="flex-1 max-w-md w-full">
            <div className="rounded-xl border border-[#1f1f1f] bg-[#111] overflow-hidden">
              <img
                src={`${basePath}screenshots/dashboard-telegram.png`}
                alt="KoaMessenger on desktop"
                className="w-full h-auto"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-b from-[#0a0a0a] to-[#1a0a10]">
        <div className="max-w-3xl mx-auto text-center">
          <Zap className="w-10 h-10 text-[#dc2350] mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#dc2350]">Ready to unify your messaging?</h2>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
            Join thousands of users who stopped tab-switching and started actually focusing on their conversations.
          </p>
          <Link href={user ? "/dashboard" : "/sign-up"}>
            <Button size="lg" className="bg-[#dc2350] hover:bg-[#e34f73] text-white rounded-full px-8 h-14 text-lg">
              {user ? "Open Dashboard" : "Get Started Free"} <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[#1a1a1a] text-center text-gray-500">
        <p className="mb-2">© {new Date().getFullYear()} KoaMessenger. All rights reserved.</p>
        <p className="text-sm">
          Proudly Australian. <span aria-label="Australian flag">&#127462;&#127482;</span> Designed and Hosted by{' '}
          <a href="https://koastal.com.au" target="_blank" rel="noopener noreferrer" className="text-[#dc2350] hover:text-[#e34f73] underline underline-offset-2 transition-colors">
            KoaSOFT – Web Design, Software and App Development
          </a>
        </p>
      </footer>
    </div>
  );
}

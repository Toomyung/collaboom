import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  Sparkles,
  ArrowRight,
  Star,
  Gift,
  Users,
  CheckCircle,
  LayoutDashboard,
  LogIn,
  Crown,
  Play,
  Zap,
  Heart,
  DollarSign,
  Package,
  Camera,
  Verified,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { motion, AnimatePresence } from "framer-motion";

const liveActivities = [
  { name: "Sarah K.", action: "just received", item: "K-Beauty Serum", time: "2m ago" },
  { name: "Mike T.", action: "earned", item: "$50 reward", time: "5m ago" },
  { name: "Jessica L.", action: "joined", item: "VIP tier", time: "12m ago" },
  { name: "Alex R.", action: "completed", item: "3rd campaign", time: "18m ago" },
];

export default function LandingPage() {
  const { user } = useAuth();
  const [currentActivity, setCurrentActivity] = useState(0);
  const [showActivity, setShowActivity] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowActivity(false);
      setTimeout(() => {
        setCurrentActivity((prev) => (prev + 1) % liveActivities.length);
        setShowActivity(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background" data-testid="landing-page-container">
      {/* Floating Live Activity - Social Proof */}
      <AnimatePresence>
        {showActivity && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-6 left-6 z-50 hidden md:block"
          >
            <div className="bg-card/80 backdrop-blur-xl border rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                {liveActivities[currentActivity].name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium">
                  <span className="text-foreground">{liveActivities[currentActivity].name}</span>{" "}
                  <span className="text-muted-foreground">{liveActivities[currentActivity].action}</span>{" "}
                  <span className="text-primary font-semibold">{liveActivities[currentActivity].item}</span>
                </p>
                <p className="text-xs text-muted-foreground">{liveActivities[currentActivity].time}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2" data-testid="link-logo">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Collaboom
              </span>
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                <NotificationBell />
                <Link href="/dashboard" data-testid="link-dashboard">
                  <Button size="sm" data-testid="button-dashboard">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" data-testid="link-login">
                  <Button variant="ghost" size="sm" data-testid="button-login">
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
                <Link href="/signup" data-testid="link-signup">
                  <Button size="sm" data-testid="button-signup">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero - Bento Style */}
      <section className="py-12 lg:py-20" data-testid="section-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Hero Grid */}
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            {/* Left - Text Content */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="px-4 py-1.5 text-sm bg-primary/10 text-primary border-primary/20">
                <Zap className="h-3 w-3 mr-1" />
                Free Products + Cash Rewards
              </Badge>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1]">
                Get Paid to{" "}
                <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Create
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-lg">
                Join 500+ TikTok creators earning free products and up to $50 per campaign from top brands.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/signup" data-testid="link-hero-signup">
                  <Button size="lg" className="h-14 px-8 text-lg w-full sm:w-auto" data-testid="button-hero-cta">
                    Start Earning Today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/campaigns" data-testid="link-browse-campaigns">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg w-full sm:w-auto" data-testid="button-browse-campaigns">
                    Browse Campaigns
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-2">
                  {["A", "B", "C", "D"].map((letter, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/70 to-purple-500/70 border-2 border-background flex items-center justify-center text-xs font-bold text-white"
                    >
                      {letter}
                    </div>
                  ))}
                </div>
                <div className="text-sm">
                  <span className="font-bold text-foreground">500+</span>
                  <span className="text-muted-foreground"> creators earning</span>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Right - Bento Stats Grid */}
            <motion.div 
              className="grid grid-cols-2 gap-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* Free Products Card */}
              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40 transition-all">
                <CardContent className="p-5">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                    <Gift className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-3xl font-black">100%</p>
                  <p className="text-sm text-muted-foreground">Free Products</p>
                </CardContent>
              </Card>

              {/* Cash Rewards Card */}
              <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20 hover:border-emerald-500/40 transition-all row-span-2">
                <CardContent className="p-5 h-full flex flex-col justify-between">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-4xl font-black text-emerald-600">$50</p>
                    <p className="text-sm text-muted-foreground">Max per campaign</p>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        <span>Link in Bio: $30</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        <span>Amazon Video: $50</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* VIP Card */}
              <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 hover:border-amber-500/40 transition-all">
                <CardContent className="p-5">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-3xl font-black">VIP</p>
                  <p className="text-sm text-muted-foreground">Auto-Approved</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works - Compact Horizontal */}
      <section className="py-12 bg-muted/30" data-testid="section-how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">How It Works</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { step: 1, icon: Users, title: "Apply", desc: "Choose campaigns you love" },
              { step: 2, icon: Package, title: "Receive", desc: "Get free products shipped" },
              { step: 3, icon: Camera, title: "Create", desc: "Make TikTok content" },
              { step: 4, icon: DollarSign, title: "Earn", desc: "Get paid + build score" },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <Card className="text-center h-full hover:shadow-lg transition-all">
                  <CardContent className="p-5">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {item.step}
                      </div>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mt-3 mb-3">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-bold">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </CardContent>
                </Card>
                {i < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Campaign Types - Modern Bento Grid */}
      <section className="py-16" data-testid="section-campaign-types">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">
              3 Ways to Earn
            </Badge>
            <h2 className="text-4xl font-bold">Choose Your Path</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Gifting */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
            >
              <Card className="h-full overflow-hidden group hover:shadow-xl transition-all border-purple-500/20 hover:border-purple-500/50" data-testid="card-campaign-gifting">
                <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500" />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Gift className="h-7 w-7 text-white" />
                    </div>
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-0">
                      Free Product
                    </Badge>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Gifting</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Receive free products and create authentic TikTok content
                  </p>
                  <div className="space-y-2">
                    {["Apply & get approved", "Receive product at home", "Create TikTok video", "Build your score"].map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-purple-500" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Link in Bio */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full overflow-hidden group hover:shadow-xl transition-all border-emerald-500/20 hover:border-emerald-500/50" data-testid="card-campaign-bio">
                <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                      <Verified className="h-7 w-7 text-white" />
                    </div>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-0">
                      $30 + Gift
                    </Badge>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Link in Bio</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Add product links to your Linktree and earn cash
                  </p>
                  <div className="space-y-2">
                    {["Apply & get approved", "Add link to your bio", "Create TikTok video", "Get verified & earn $30"].map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Amazon Video */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full overflow-hidden group hover:shadow-xl transition-all border-amber-500/20 hover:border-amber-500/50 ring-2 ring-amber-500/30" data-testid="card-campaign-amazon">
                <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500" />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                      <Play className="h-7 w-7 text-white" />
                    </div>
                    <Badge className="bg-amber-500 text-white border-0">
                      $50 + Gift
                    </Badge>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Amazon Video</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Upload to Amazon Storefront for maximum rewards
                  </p>
                  <div className="space-y-2">
                    {["Apply & get approved", "Upload to Storefront", "Create TikTok video", "Get verified & earn $50"].map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-amber-500" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* VIP Tier System - Horizontal */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5" data-testid="section-tiers">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <Badge className="mb-4 bg-amber-500/10 text-amber-600 border-amber-500/20">
                <Crown className="h-3 w-3 mr-1" />
                Level Up System
              </Badge>
              <h2 className="text-4xl font-bold mb-4">
                Build Your Reputation
              </h2>
              <p className="text-muted-foreground mb-6">
                Complete campaigns to increase your score. Higher scores unlock VIP status with auto-approval and exclusive campaigns.
              </p>
              
              <div className="space-y-4">
                {[
                  { tier: "Starter", score: "0-49", desc: "1 active campaign", color: "bg-slate-500" },
                  { tier: "Standard", score: "50-84", desc: "Multiple campaigns", color: "bg-blue-500" },
                  { tier: "VIP", score: "85-100", desc: "Auto-approved", color: "bg-amber-500" },
                ].map((item, i) => (
                  <motion.div
                    key={item.tier}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card border"
                    data-testid={`tier-${item.tier.toLowerCase()}`}
                  >
                    <div className={cn("h-3 w-3 rounded-full", item.color)} />
                    <div className="flex-1">
                      <p className="font-bold">{item.tier}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Badge variant="secondary">{item.score}</Badge>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Score Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-3xl blur-3xl" />
              <Card className="relative overflow-hidden">
                <CardContent className="p-8 text-center">
                  <div className="relative inline-flex items-center justify-center mb-6">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 animate-pulse" />
                    <div className="h-32 w-32 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                      <div className="h-28 w-28 rounded-full bg-card flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-4xl font-black">85</p>
                          <p className="text-xs text-muted-foreground">Score</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-4 py-1.5">
                    <Crown className="h-4 w-4 mr-1" />
                    VIP Creator
                  </Badge>
                  <p className="mt-4 text-sm text-muted-foreground">
                    VIP creators get auto-approved for all campaigns
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 border-y bg-muted/30" data-testid="section-stats">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "500+", label: "Creators", icon: Users },
              { value: "50+", label: "Brands", icon: Sparkles },
              { value: "$50K+", label: "Gifted", icon: Gift },
              { value: "98%", label: "Success", icon: Heart },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
                data-testid={`stat-${stat.label.toLowerCase()}`}
              >
                <div className="flex justify-center mb-2">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-3xl font-black">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20" data-testid="section-cta">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl sm:text-5xl font-black mb-6">
              Ready to{" "}
              <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Start Earning?
              </span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join 500+ TikTok creators already getting free products and cash rewards from top brands.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" data-testid="link-final-cta">
                <Button size="lg" className="h-16 px-12 text-xl" data-testid="button-final-cta">
                  Get Started Free
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No fees, no commitments. Start earning today.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold">Collaboom</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Collaboom. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

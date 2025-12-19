import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  Sparkles,
  ArrowRight,
  Search,
  Star,
  Gift,
  Users,
  CheckCircle,
  LayoutDashboard,
  User,
  LogOut,
  LogIn,
  Menu,
  Trophy,
  Layers,
  ChevronDown,
  Link2,
  ShoppingBag,
  Crown,
  TrendingUp,
  Play,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { getInfluencerDisplayName } from "@/lib/influencer-utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { motion, useInView } from "framer-motion";

const faqs = [
  {
    question: "How does Collaboom work?",
    answer:
      "Collaboom connects influencers with brands looking for authentic content creators. Browse available campaigns, apply for products you love, receive them for free, and create content according to brand guidelines.",
  },
  {
    question: "What are the requirements to join?",
    answer:
      "You need to be a US-based TikTok creator with at least 1,000 followers. Our team reviews each application to ensure quality content creation.",
  },
  {
    question: "How does the Score system work?",
    answer:
      "Your Score (0-100) reflects your reliability as a creator. Complete campaigns successfully to increase your score, which unlocks better opportunities and higher-reward campaigns.",
  },
  {
    question: "What happens if I miss a deadline?",
    answer:
      "Missing deadlines affects your reliability score. We send reminders before deadlines and understand that life happens - reach out if you're facing issues.",
  },
  {
    question: "Are the products really free?",
    answer:
      "Yes! All products are gifted to you at no cost. Some campaigns also offer additional cash rewards ($30-$50) on top of the free products.",
  },
];

const campaignTypes = [
  {
    type: "Gifting",
    icon: Gift,
    reward: "Free Product",
    description: "Receive free products from brands and create authentic TikTok content",
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-500/10",
    steps: ["Apply to campaign", "Receive product", "Create TikTok video", "Submit & earn score"],
  },
  {
    type: "Link in Bio",
    icon: Link2,
    reward: "$30 + Free Product",
    description: "Add product links to your Linktree/Beacons and earn cash rewards",
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-500/10",
    steps: ["Apply to campaign", "Add link to bio", "Create TikTok video", "Get verified & earn $30"],
  },
  {
    type: "Amazon Video",
    icon: ShoppingBag,
    reward: "$50 + Free Product",
    description: "Upload product videos to your Amazon Storefront for highest rewards",
    color: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-500/10",
    steps: ["Apply to campaign", "Upload to Storefront", "Create TikTok video", "Get verified & earn $50"],
  },
];

const tiers = [
  {
    name: "Starter",
    score: "0-49",
    icon: Star,
    color: "text-slate-500",
    bgColor: "bg-slate-500/10",
    benefits: ["1 active campaign at a time", "Build your reputation", "Learn the platform"],
  },
  {
    name: "Standard",
    score: "50-84",
    icon: TrendingUp,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    benefits: ["Multiple active campaigns", "Priority application review", "Access to premium campaigns"],
  },
  {
    name: "VIP",
    score: "85-100",
    icon: Crown,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    benefits: ["Auto-approved applications", "Exclusive VIP campaigns", "Highest earning potential"],
  },
];

function AnimatedSection({ 
  children, 
  className,
  delay = 0,
}: { 
  children: React.ReactNode; 
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FeatureCard({ 
  campaign, 
  index 
}: { 
  campaign: typeof campaignTypes[0]; 
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
      transition={{ duration: 0.7, delay: index * 0.15, ease: "easeOut" }}
    >
      <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 group" data-testid={`card-campaign-type-${campaign.type.toLowerCase().replace(/\s+/g, '-')}`}>
        <div className={cn("absolute inset-0 opacity-5 bg-gradient-to-br", campaign.color)} />
        <CardContent className="p-8">
          <div className="flex items-start gap-6">
            <div className={cn(
              "h-16 w-16 rounded-2xl flex items-center justify-center flex-shrink-0",
              campaign.bgColor
            )}>
              <campaign.icon className={cn("h-8 w-8 bg-gradient-to-br bg-clip-text", campaign.color.replace("from-", "text-").split(" ")[0])} />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold" data-testid={`text-campaign-type-${campaign.type.toLowerCase().replace(/\s+/g, '-')}`}>{campaign.type}</h3>
                  <Badge className={cn("bg-gradient-to-r text-white border-0", campaign.color)}>
                    {campaign.reward}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-lg">{campaign.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {campaign.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br",
                      campaign.color
                    )}>
                      {i + 1}
                    </div>
                    <span className="text-sm text-muted-foreground">{step}</span>
                    {i < campaign.steps.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground/50 mx-1" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function LandingPage() {
  const { user, isAuthenticated, isAdmin, influencer, logout, isLoading } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const isInfluencer = isAuthenticated && !isAdmin;
  
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    
    sectionRefs.current.forEach((section, index) => {
      if (section) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setActiveSection(index);
              }
            });
          },
          { threshold: 0.3 }
        );
        observer.observe(section);
        observers.push(observer);
      }
    });
    
    return () => observers.forEach(obs => obs.disconnect());
  }, []);
  
  const backgroundColors = [
    "from-background via-background to-primary/5",
    "from-slate-50 via-purple-50/30 to-pink-50/20 dark:from-slate-950 dark:via-purple-950/30 dark:to-pink-950/20",
    "from-emerald-50/30 via-teal-50/20 to-background dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-background",
    "from-amber-50/20 via-orange-50/10 to-background dark:from-amber-950/20 dark:via-orange-950/10 dark:to-background",
    "from-background via-muted/30 to-background",
    "from-primary to-purple-600",
  ];

  return (
    <div 
      className={cn(
        "min-h-screen transition-all duration-700 ease-in-out bg-gradient-to-br",
        backgroundColors[Math.min(activeSection, backgroundColors.length - 1)]
      )}
      data-testid="landing-page-container"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl" data-testid="link-landing-home">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                Collaboom
              </span>
            </Link>

            <div className="flex items-center gap-2">
              {isInfluencer && <NotificationBell />}
              
              {isLoading ? (
                <div className="h-11 w-11 bg-muted animate-pulse rounded-full" />
              ) : (
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  {isAuthenticated && influencer?.profileImageUrl ? (
                    <button
                      className="h-11 w-11 rounded-full overflow-hidden border-2 border-transparent hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      data-testid="button-profile-menu"
                      aria-label="Open menu"
                    >
                      <Avatar className="h-full w-full">
                        <AvatarImage src={influencer.profileImageUrl} alt="Profile" />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {(influencer.firstName?.[0] || influencer.name?.[0] || user?.email?.[0] || "U").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  ) : isAuthenticated ? (
                    <button
                      className="h-11 w-11 rounded-full overflow-hidden border-2 border-transparent hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      data-testid="button-profile-menu"
                      aria-label="Open menu"
                    >
                      <Avatar className="h-full w-full">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {(influencer?.firstName?.[0] || influencer?.name?.[0] || user?.email?.[0] || "U").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11"
                      data-testid="button-hamburger-menu"
                      aria-label="Open menu"
                    >
                      <Menu className="h-7 w-7" />
                    </Button>
                  )}
                </SheetTrigger>
                <SheetContent side="right" className="w-80 sm:w-96">
                  <SheetHeader className="text-left pb-6 border-b">
                    <SheetTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                        Collaboom
                      </span>
                    </SheetTitle>
                    {isAuthenticated && (
                      <div className="pt-2">
                        <p className="text-sm font-medium text-foreground">
                          {isInfluencer 
                            ? getInfluencerDisplayName(influencer, user?.name || "Influencer")
                            : user?.name || "Admin"
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                        {isInfluencer && influencer && !influencer.profileCompleted && (
                          <p className="text-xs text-amber-500 font-medium">Profile incomplete</p>
                        )}
                      </div>
                    )}
                  </SheetHeader>

                  <nav className="flex flex-col py-6 gap-1">
                    <Link href="/score-tier">
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-12 text-base"
                        onClick={() => setSheetOpen(false)}
                        data-testid="menu-score-tier"
                      >
                        <Trophy className="h-5 w-5 mr-3" />
                        Score & Tier
                      </Button>
                    </Link>
                    <Link href="/campaign-types">
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-12 text-base"
                        onClick={() => setSheetOpen(false)}
                        data-testid="menu-campaign-types"
                      >
                        <Layers className="h-5 w-5 mr-3" />
                        Campaign Types
                      </Button>
                    </Link>

                    <div className="border-b my-4" />

                    {isAuthenticated ? (
                      <>
                        {isInfluencer && (
                          <>
                            <Link href="/dashboard">
                              <Button
                                variant="ghost"
                                className="w-full justify-start h-12 text-base"
                                onClick={() => setSheetOpen(false)}
                                data-testid="menu-dashboard"
                              >
                                <LayoutDashboard className="h-5 w-5 mr-3" />
                                Dashboard
                              </Button>
                            </Link>
                            <Link href="/profile">
                              <Button
                                variant="ghost"
                                className="w-full justify-start h-12 text-base"
                                onClick={() => setSheetOpen(false)}
                                data-testid="menu-profile"
                              >
                                <User className="h-5 w-5 mr-3" />
                                Profile
                              </Button>
                            </Link>
                          </>
                        )}
                        {isAdmin && (
                          <Link href="/admin">
                            <Button
                              variant="ghost"
                              className="w-full justify-start h-12 text-base"
                              onClick={() => setSheetOpen(false)}
                              data-testid="menu-admin-dashboard"
                            >
                              <LayoutDashboard className="h-5 w-5 mr-3" />
                              Admin Dashboard
                            </Button>
                          </Link>
                        )}

                        <div className="border-b my-4" />

                        <Button
                          variant="ghost"
                          className="w-full justify-start h-12 text-base text-destructive hover:text-destructive"
                          onClick={() => {
                            logout();
                            setSheetOpen(false);
                          }}
                          data-testid="menu-logout"
                        >
                          <LogOut className="h-5 w-5 mr-3" />
                          Sign Out
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-3 pt-2">
                        <Link href="/login">
                          <Button
                            variant="outline"
                            className="w-full h-12 text-base border-2 border-primary/30 hover:border-primary hover:bg-primary/5"
                            onClick={() => setSheetOpen(false)}
                            data-testid="menu-signin"
                          >
                            <LogIn className="h-5 w-5 mr-2" />
                            Sign In
                          </Button>
                        </Link>
                        <Link href="/register">
                          <Button
                            className="w-full h-12 text-base"
                            onClick={() => setSheetOpen(false)}
                            data-testid="menu-getstarted"
                          >
                            <Sparkles className="h-5 w-5 mr-2" />
                            Get Started Free
                          </Button>
                        </Link>
                      </div>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        ref={(el) => { sectionRefs.current[0] = el; }}
        className="relative overflow-hidden min-h-[90vh] flex items-center"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent" />
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div 
              className="space-y-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.div 
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Sparkles className="h-4 w-4" />
                <span>Join 500+ creators earning free products</span>
              </motion.div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
                Get{" "}
                <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Free Products
                </span>
                <br />
                <span className="text-muted-foreground/80">& Cash Rewards</span>
              </h1>
              
              <p className="text-xl sm:text-2xl text-muted-foreground max-w-xl leading-relaxed">
                Apply for gifting campaigns from top K-Beauty, Food, and Lifestyle brands. 
                Create content you love. <span className="text-foreground font-medium">Earn up to $50 per campaign.</span>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                {isAuthenticated ? (
                  isAdmin ? (
                    <Link href="/admin">
                      <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg" data-testid="button-go-admin">
                        Go to Admin Dashboard
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  ) : (
                    <>
                      {influencer?.profileCompleted ? (
                        <Link href="/campaigns">
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg shadow-lg shadow-primary/25" data-testid="button-browse-campaigns">
                              Explore Campaigns
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                          </motion.div>
                        </Link>
                      ) : (
                        <Link href="/profile">
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg shadow-lg shadow-primary/25" data-testid="button-complete-profile">
                              Complete Your Profile
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                          </motion.div>
                        </Link>
                      )}
                      <Link href="/dashboard">
                        <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg" data-testid="button-go-dashboard">
                          Go to Dashboard
                        </Button>
                      </Link>
                    </>
                  )
                ) : (
                  <>
                    <Link href="/register">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button size="lg" className="w-full sm:w-auto h-14 px-10 text-lg shadow-xl shadow-primary/30" data-testid="button-get-started">
                          Get Started Free
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </motion.div>
                    </Link>
                    <Link href="/campaigns">
                      <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg border-2" data-testid="button-view-campaigns">
                        <Play className="mr-2 h-5 w-5" />
                        View Campaigns
                      </Button>
                    </Link>
                  </>
                )}
              </div>
              
              {/* Trust indicators */}
              <motion.div 
                className="flex items-center gap-6 pt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/60 to-purple-500/60 border-3 border-background flex items-center justify-center text-xs font-bold text-white shadow-lg"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="text-lg font-bold text-foreground">500+</span>
                  <br />
                  creators already earning
                </div>
              </motion.div>
            </motion.div>
            
            {/* Dashboard Preview */}
            <motion.div 
              className="relative lg:h-[550px]"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-purple-500/30 rounded-3xl blur-3xl opacity-50" />
              <Card className="relative overflow-hidden shadow-2xl border-0 bg-card/90 backdrop-blur-sm">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg">
                        <Star className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Your Score</p>
                        <p className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">85</p>
                      </div>
                    </div>
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-3 py-1.5 text-sm">
                      <Crown className="h-3.5 w-3.5 mr-1" />
                      VIP Creator
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold">12</p>
                      <p className="text-xs text-muted-foreground">Campaigns</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-emerald-600">$360</p>
                      <p className="text-xs text-muted-foreground">Cash Earned</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-amber-600">100%</p>
                      <p className="text-xs text-muted-foreground">Success</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Active Campaigns</p>
                    {[
                      { name: "K-Beauty Serum", brand: "GlowLab", status: "Shipped", type: "amazon", reward: "$50" },
                      { name: "Organic Snacks", brand: "NatureBite", status: "Creating", type: "gifting", reward: "Gift" },
                      { name: "Home Decor Set", brand: "CozyLife", status: "Completed", type: "bio", reward: "$30" },
                    ].map((campaign, i) => (
                      <motion.div 
                        key={i} 
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.8 + i * 0.1 }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center",
                            campaign.type === "amazon" ? "bg-amber-500/10" :
                            campaign.type === "bio" ? "bg-emerald-500/10" : "bg-purple-500/10"
                          )}>
                            {campaign.type === "amazon" ? <ShoppingBag className="h-5 w-5 text-amber-600" /> :
                             campaign.type === "bio" ? <Link2 className="h-5 w-5 text-emerald-600" /> :
                             <Gift className="h-5 w-5 text-purple-600" />}
                          </div>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-xs text-muted-foreground">{campaign.brand}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="text-xs mb-1">
                            {campaign.status}
                          </Badge>
                          <p className={cn(
                            "text-sm font-semibold",
                            campaign.reward !== "Gift" && "text-emerald-600"
                          )}>{campaign.reward}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-8 w-8 text-muted-foreground/50" />
        </motion.div>
      </section>

      {/* Campaign Types Feature Section */}
      <section 
        ref={(el) => { sectionRefs.current[1] = el; }}
        className="py-24 lg:py-32 relative"
        data-testid="section-campaign-types"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <Badge className="mb-4 px-4 py-1.5 text-sm bg-primary/10 text-primary border-primary/20">
              Three Ways to Earn
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Choose Your Campaign Type
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From free products to cash rewards, pick the campaigns that match your style
            </p>
          </AnimatedSection>
          
          <div className="space-y-6">
            {campaignTypes.map((campaign, i) => (
              <FeatureCard key={campaign.type} campaign={campaign} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* VIP Tier Section */}
      <section 
        ref={(el) => { sectionRefs.current[2] = el; }}
        className="py-24 lg:py-32 relative"
        data-testid="section-vip-tiers"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <Badge className="mb-4 px-4 py-1.5 text-sm bg-amber-500/10 text-amber-600 border-amber-500/20">
              <Crown className="h-3.5 w-3.5 mr-1" />
              Reputation System
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Level Up to VIP Status
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Complete campaigns to build your score and unlock exclusive benefits
            </p>
          </AnimatedSection>
          
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier, i) => (
              <AnimatedSection key={tier.name} delay={i * 0.15}>
                <Card className={cn(
                  "relative overflow-hidden h-full transition-all duration-300 hover:shadow-xl",
                  tier.name === "VIP" && "ring-2 ring-amber-500/50"
                )} data-testid={`card-tier-${tier.name.toLowerCase()}`}>
                  {tier.name === "VIP" && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                  )}
                  <CardContent className="p-8">
                    <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center mb-6", tier.bgColor)}>
                      <tier.icon className={cn("h-7 w-7", tier.color)} />
                    </div>
                    <div className="mb-4">
                      <h3 className="text-2xl font-bold mb-1" data-testid={`text-tier-name-${tier.name.toLowerCase()}`}>{tier.name}</h3>
                      <p className="text-muted-foreground">Score: {tier.score}</p>
                    </div>
                    <ul className="space-y-3">
                      {tier.benefits.map((benefit, j) => (
                        <li key={j} className="flex items-center gap-3">
                          <CheckCircle className={cn("h-5 w-5 flex-shrink-0", tier.color)} />
                          <span className="text-sm">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section 
        ref={(el) => { sectionRefs.current[3] = el; }}
        className="py-20 relative"
        data-testid="section-stats"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
              {[
                { value: "500+", label: "Active Creators", icon: Users, color: "text-primary", id: "creators" },
                { value: "50+", label: "Brand Partners", icon: Sparkles, color: "text-purple-500", id: "brands" },
                { value: "$50K+", label: "Products Gifted", icon: Gift, color: "text-pink-500", id: "products" },
                { value: "98%", label: "Success Rate", icon: CheckCircle, color: "text-emerald-500", id: "success" },
              ].map((stat, i) => (
                <motion.div 
                  key={i} 
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  data-testid={`stat-${stat.id}`}
                >
                  <div className={cn("h-12 w-12 rounded-xl mx-auto mb-4 flex items-center justify-center bg-muted")}>
                    <stat.icon className={cn("h-6 w-6", stat.color)} />
                  </div>
                  <p className="text-4xl lg:text-5xl font-bold mb-2" data-testid={`text-stat-${stat.id}`}>{stat.value}</p>
                  <p className="text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Campaign Categories with Large CTA */}
      <section 
        ref={(el) => { sectionRefs.current[4] = el; }}
        className="py-24 bg-muted/30"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">Campaign Categories</h2>
            <p className="text-xl text-muted-foreground">
              Discover opportunities across different niches
            </p>
          </AnimatedSection>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              {
                category: "Beauty",
                description: "K-Beauty skincare, makeup, and beauty tools from trending brands",
                image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop",
                count: "15+ active",
                gradient: "from-pink-500/20 to-purple-500/20",
              },
              {
                category: "Food",
                description: "Organic snacks, specialty foods, and trending food products",
                image: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400&h=300&fit=crop",
                count: "8+ active",
                gradient: "from-orange-500/20 to-red-500/20",
              },
              {
                category: "Lifestyle",
                description: "Home decor, wellness products, and everyday essentials",
                image: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&h=300&fit=crop",
                count: "12+ active",
                gradient: "from-teal-500/20 to-emerald-500/20",
              },
            ].map((cat, i) => (
              <AnimatedSection key={cat.category} delay={i * 0.1}>
                <Card className="overflow-hidden group cursor-pointer hover:shadow-xl transition-all duration-300 h-full">
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 z-10", cat.gradient)} />
                    <img
                      src={cat.image}
                      alt={cat.category}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-2xl font-bold">{cat.category}</h3>
                      <Badge variant="secondary" className="text-xs">{cat.count}</Badge>
                    </div>
                    <p className="text-muted-foreground">{cat.description}</p>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
          
          <AnimatedSection className="text-center">
            <Link href="/campaigns">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button size="lg" className="h-16 px-12 text-xl shadow-xl shadow-primary/30" data-testid="button-explore-campaigns">
                  <Search className="mr-3 h-6 w-6" />
                  Explore All Campaigns
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </motion.div>
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 lg:py-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">Frequently Asked Questions</h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about Collaboom
            </p>
          </AnimatedSection>
          
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <AnimatedSection key={i} delay={i * 0.05}>
                <Card
                  className={cn(
                    "overflow-hidden transition-all cursor-pointer hover:shadow-md",
                    openFaq === i && "ring-2 ring-primary/30 shadow-md"
                  )}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  data-testid={`faq-${i}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-semibold text-lg">{faq.question}</h3>
                      <motion.div
                        animate={{ rotate: openFaq === i ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </motion.div>
                    </div>
                    <motion.div
                      initial={false}
                      animate={{ 
                        height: openFaq === i ? "auto" : 0,
                        opacity: openFaq === i ? 1 : 0
                      }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="mt-4 text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </motion.div>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        ref={(el) => { sectionRefs.current[5] = el; }}
        className="py-24 lg:py-32 bg-gradient-to-br from-primary via-purple-600 to-pink-600 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-black/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Ready to Start Earning?
            </h2>
            <p className="text-xl sm:text-2xl text-white/80 mb-10 max-w-2xl mx-auto">
              Join hundreds of creators receiving free products and cash rewards from top brands.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link href="/campaigns">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button size="lg" variant="secondary" className="h-16 px-10 text-xl shadow-xl" data-testid="button-cta-campaigns">
                      Browse Campaigns
                      <ArrowRight className="ml-3 h-6 w-6" />
                    </Button>
                  </motion.div>
                </Link>
              ) : (
                <>
                  <Link href="/register">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button size="lg" variant="secondary" className="h-16 px-10 text-xl shadow-xl" data-testid="button-cta-register">
                        <Sparkles className="mr-3 h-6 w-6" />
                        Create Free Account
                      </Button>
                    </motion.div>
                  </Link>
                  <Link href="/login">
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-16 px-10 text-xl border-white/30 text-white hover:bg-white/10"
                      data-testid="button-cta-login"
                    >
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-background border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-bold">Collaboom</span>
              <span className="text-muted-foreground">by TooMyung</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="mailto:support@collaboom.com" className="hover:text-foreground transition-colors">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

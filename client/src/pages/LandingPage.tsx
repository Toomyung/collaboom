import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  Sparkles,
  ArrowRight,
  Search,
  Package,
  Upload,
  Star,
  Gift,
  Users,
  Clock,
  CheckCircle,
  LayoutDashboard,
  User,
  LogOut,
  LogIn,
  Menu,
  Trophy,
  Layers,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
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

const steps = [
  {
    number: "01",
    title: "Browse Campaigns",
    description: "Discover free product campaigns from K-Beauty, Food, and Lifestyle brands.",
    icon: Search,
  },
  {
    number: "02",
    title: "Apply & Receive",
    description: "Submit your application and receive products shipped directly to you.",
    icon: Package,
  },
  {
    number: "03",
    title: "Create Content",
    description: "Create authentic TikTok content following simple brand guidelines.",
    icon: Upload,
  },
  {
    number: "04",
    title: "Build Your Score",
    description: "Complete campaigns to build your reputation and unlock exclusive opportunities.",
    icon: Star,
  },
];

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
      "Yes! All products are gifted to you at no cost. Some campaigns also offer additional cash rewards ($30) on top of the free products.",
  },
];

export default function LandingPage() {
  const { user, isAuthenticated, isAdmin, influencer, logout, isLoading } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isInfluencer = isAuthenticated && !isAdmin;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl" data-testid="link-landing-home">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                Collaboom
              </span>
            </Link>

            {/* Unified menu for all screen sizes - Profile picture or hamburger */}
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
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Join 500+ creators earning free products
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                Get{" "}
                <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  Free Products
                </span>
                <br />
                Build Your Portfolio
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground max-w-lg">
                Apply for gifting campaigns from top K-Beauty, Food, and Lifestyle brands. 
                Create content you love and grow your influence.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                {isAuthenticated ? (
                  isAdmin ? (
                    <Link href="/admin">
                      <Button size="lg" className="w-full sm:w-auto" data-testid="button-go-admin">
                        Go to Admin Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <>
                      {influencer?.profileCompleted ? (
                        <Link href="/campaigns">
                          <Button size="lg" className="w-full sm:w-auto" data-testid="button-browse-campaigns">
                            Browse Campaigns
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      ) : (
                        <Link href="/profile">
                          <Button size="lg" className="w-full sm:w-auto" data-testid="button-complete-profile">
                            Complete Your Profile
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      <Link href="/dashboard">
                        <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-go-dashboard">
                          Go to Dashboard
                        </Button>
                      </Link>
                    </>
                  )
                ) : (
                  <>
                    <Link href="/register">
                      <Button size="lg" className="w-full sm:w-auto" data-testid="button-get-started">
                        Get Started Free
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/campaigns">
                      <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-view-campaigns">
                        View Campaigns
                      </Button>
                    </Link>
                  </>
                )}
              </div>
              
              {/* Trust indicators */}
              <div className="flex items-center gap-4 pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-purple-500/40 border-2 border-background flex items-center justify-center text-xs font-medium"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">500+</span> creators already earning
                </div>
              </div>
            </div>
            
            {/* Dashboard Preview */}
            <div className="relative lg:h-[500px]">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-3xl blur-2xl opacity-50" />
              <Card className="relative overflow-hidden shadow-2xl border-0 bg-card/80 backdrop-blur">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Star className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Your Score</p>
                        <p className="text-2xl font-bold text-primary">85</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      Top Creator
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold">12</p>
                      <p className="text-xs text-muted-foreground">Campaigns</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold">$240</p>
                      <p className="text-xs text-muted-foreground">Earned</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold">100%</p>
                      <p className="text-xs text-muted-foreground">Success</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Recent Campaigns</p>
                    {[
                      { name: "K-Beauty Serum", brand: "GlowLab", status: "Completed", reward: "Gift + $30" },
                      { name: "Organic Snacks", brand: "NatureBite", status: "Shipped", reward: "Gift" },
                      { name: "Home Decor Set", brand: "CozyLife", status: "Approved", reward: "Gift + $30" },
                    ].map((campaign, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground">{campaign.brand}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="text-xs">
                            {campaign.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">{campaign.reward}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/30 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "500+", label: "Active Creators", icon: Users },
              { value: "50+", label: "Brand Partners", icon: Sparkles },
              { value: "$50K+", label: "Products Gifted", icon: Gift },
              { value: "98%", label: "Success Rate", icon: CheckCircle },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <stat.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How Collaboom Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes and begin receiving free products from brands you love.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <Card key={i} className="relative overflow-hidden group hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-4xl font-bold text-muted-foreground/60">{step.number}</span>
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <step.icon className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Campaign Categories */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Campaign Categories</h2>
            <p className="text-lg text-muted-foreground">
              Discover opportunities across different niches
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                category: "Beauty",
                description: "K-Beauty skincare, makeup, and beauty tools from trending brands",
                image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop",
                count: "15+ active campaigns",
              },
              {
                category: "Food",
                description: "Organic snacks, specialty foods, and trending food products",
                image: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400&h=300&fit=crop",
                count: "8+ active campaigns",
              },
              {
                category: "Lifestyle",
                description: "Home decor, wellness products, and everyday essentials",
                image: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&h=300&fit=crop",
                count: "12+ active campaigns",
              },
            ].map((cat, i) => (
              <Card key={i} className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={cat.image}
                    alt={cat.category}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold">{cat.category}</h3>
                    <Badge variant="secondary">{cat.count}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <Link href="/campaigns">
              <Button size="lg" data-testid="button-explore-campaigns">
                Explore All Campaigns
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about Collaboom
            </p>
          </div>
          
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <Card
                key={i}
                className={cn(
                  "overflow-hidden transition-all cursor-pointer",
                  openFaq === i && "ring-2 ring-primary/20"
                )}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                data-testid={`faq-${i}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-medium">{faq.question}</h3>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform flex-shrink-0",
                        openFaq === i && "rotate-180"
                      )}
                    />
                  </div>
                  {openFaq === i && (
                    <p className="mt-3 text-muted-foreground text-sm">{faq.answer}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Start Earning Free Products?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join hundreds of creators who are already receiving products from top brands. 
            It takes less than 2 minutes to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <Link href="/campaigns">
                <Button size="lg" variant="secondary" data-testid="button-cta-campaigns">
                  Browse Campaigns
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/register">
                  <Button size="lg" variant="secondary" data-testid="button-cta-register">
                    Create Free Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                    data-testid="button-cta-login"
                  >
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-muted/30 border-t">
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

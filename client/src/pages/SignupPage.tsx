import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import {
  Sparkles,
  Gift,
  DollarSign,
  CheckCircle,
  ArrowRight,
  Star,
  Users,
  TrendingUp,
  Shield,
  Zap,
  Clock,
  Package,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { SiGoogle, SiTiktok } from "react-icons/si";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { signInWithGoogle, isLoading: authLoading } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Could not connect to Google. Please try again.",
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  const benefits = [
    {
      icon: Gift,
      title: "Free Products",
      description: "Get K-Beauty, Food & Lifestyle products shipped to you",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      icon: DollarSign,
      title: "Cash Rewards",
      description: "Earn $10-$30 per campaign, paid via PayPal",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      icon: TrendingUp,
      title: "Build Your Portfolio",
      description: "Work with top brands and grow your creator career",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: Clock,
      title: "Flexible Timeline",
      description: "Create content on your schedule within campaign deadlines",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  const campaignTypes = [
    {
      type: "Basic",
      reward: "$10",
      description: "Free product + TikTok video",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      type: "Link in Bio",
      reward: "$30",
      description: "Bio link + TikTok video",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      type: "Amazon Video",
      reward: "$30",
      description: "Amazon storefront + TikTok video",
      gradient: "from-amber-500 to-orange-500",
    },
  ];

  const steps = [
    { step: 1, title: "Sign Up", description: "Create your free account in seconds" },
    { step: 2, title: "Apply", description: "Browse campaigns and apply to ones you love" },
    { step: 3, title: "Create", description: "Receive products and create content" },
    { step: 4, title: "Earn", description: "Get paid cash rewards via PayPal" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2" data-testid="link-logo">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Collaboom
              </span>
            </Link>
            <Link href="/login" data-testid="link-login">
              <Button variant="ghost" size="sm" data-testid="button-login">
                Already have an account? <span className="ml-1 text-primary font-semibold">Log in</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="space-y-4">
              <Badge className="px-4 py-1.5 text-sm bg-primary/10 text-primary border-primary/20">
                <Zap className="h-3 w-3 mr-1" />
                100% Free to Join
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                Turn Your TikTok Into{" "}
                <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Income
                </span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Join 500+ creators earning free products and up to <span className="font-bold text-foreground">$30 per campaign</span> from top K-Beauty, Food & Lifestyle brands.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="border-0 shadow-none bg-muted/30">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${benefit.bg}`}>
                        <benefit.icon className={`h-5 w-5 ${benefit.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{benefit.title}</h3>
                        <p className="text-xs text-muted-foreground">{benefit.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-lg">Campaign Types & Rewards</h3>
              <div className="flex flex-wrap gap-3">
                {campaignTypes.map((campaign) => (
                  <div
                    key={campaign.type}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted/50 border"
                  >
                    <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${campaign.gradient}`} />
                    <span className="text-sm font-medium">{campaign.type}</span>
                    <Badge variant="secondary" className="text-xs">
                      {campaign.reward}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden lg:block space-y-4 pt-4">
              <h3 className="font-bold text-lg">How It Works</h3>
              <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={step.step} className="flex items-center">
                    <div className="text-center">
                      <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-2 mx-auto">
                        {step.step}
                      </div>
                      <p className="text-sm font-semibold">{step.title}</p>
                      <p className="text-xs text-muted-foreground max-w-[100px]">{step.description}</p>
                    </div>
                    {index < steps.length - 1 && (
                      <ChevronRight className="h-5 w-5 text-muted-foreground mx-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:sticky lg:top-24"
          >
            <Card className="border-2 shadow-xl">
              <CardContent className="p-6 sm:p-8 space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">Start Earning Today</h2>
                  <p className="text-muted-foreground text-sm">
                    Create your free account and apply to campaigns
                  </p>
                </div>

                <Button
                  size="lg"
                  className="w-full h-14 text-base font-semibold gap-3"
                  onClick={handleGoogleSignup}
                  disabled={isGoogleLoading || authLoading}
                  data-testid="button-google-signup"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <SiGoogle className="h-5 w-5" />
                      Continue with Google
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or sign up with email</span>
                  </div>
                </div>

                <Link href="/register" data-testid="link-email-signup">
                  <Button variant="outline" size="lg" className="w-full h-12" data-testid="button-email-signup">
                    Sign up with Email
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>100% free to join - no fees ever</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>Get free products shipped to your door</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>Earn cash rewards via PayPal</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span>Your data is secure and never shared</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 pt-4 border-t">
                  <div className="flex -space-x-2">
                    {["A", "B", "C"].map((letter, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/70 to-purple-500/70 border-2 border-background flex items-center justify-center text-xs font-bold text-white"
                      >
                        {letter}
                      </div>
                    ))}
                  </div>
                  <div className="text-sm">
                    <span className="font-bold">500+</span>
                    <span className="text-muted-foreground"> creators earning</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-3 w-3 fill-current" />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 space-y-4">
              <Card className="bg-muted/30 border-0">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex -space-x-2 flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 border-2 border-background flex items-center justify-center text-xs font-bold text-white">
                        S
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">Sarah K.</span>
                        <SiTiktok className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">12K followers</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        "I've earned over $200 in my first month! The products are amazing and the process is super easy."
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-amber-500">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className="h-3 w-3 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>

        <div className="lg:hidden mt-12 space-y-4">
          <h3 className="font-bold text-lg text-center">How It Works</h3>
          <div className="grid grid-cols-2 gap-4">
            {steps.map((step) => (
              <Card key={step.step} className="border-0 bg-muted/30">
                <CardContent className="p-4 text-center">
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-2 mx-auto">
                    {step.step}
                  </div>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>Collaboom</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/campaign-types" className="hover:text-foreground transition-colors">
                Campaign Types
              </Link>
              <Link href="/score-tier" className="hover:text-foreground transition-colors">
                Score & Tiers
              </Link>
              <Link href="/campaigns" className="hover:text-foreground transition-colors">
                Browse Campaigns
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
